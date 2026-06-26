import { Router } from 'express';

const router: Router = Router();

const RULE_TABLE = 'model_routing_rules_s_7b4a6688_3';
const CONFIG_TABLE = 'model_rule_configs_s_7b4a6688_3';
const MODEL_TABLE = 'ai_model_configs_s_7b4a6688_3';
const LOGS_TABLE = 'ai_call_logs_s_7b4a6688_3';
const PROXY_LOGS_TABLE = 'proxy_call_logs_s_7b4a6688_3';
const VENDOR_KEYS_TABLE = 'ai_vendor_api_keys_s_7b4a6688_3';

/**
 * 解析模型可用的 API Key（仅使用厂商级密钥）
 */
async function resolveApiKey(req: any, modelConfig: any): Promise<{ id: number; api_key: string; usage_count: number } | null> {
  if (!modelConfig.vendor_key_id) return null;

  const { data: vendorKey } = await req.supabase
    .from(VENDOR_KEYS_TABLE)
    .select('id, api_key, usage_count')
    .eq('id', modelConfig.vendor_key_id)
    .eq('is_deleted', 'n')
    .eq('is_enabled', 'y')
    .single();

  return vendorKey || null;
}

/**
 * 更新厂商密钥使用统计（last_used_at）
 */
async function updateKeyUsage(req: any, keyId: number) {
  await req.supabase
    .from(VENDOR_KEYS_TABLE)
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId);
}

/**
 * 增加厂商密钥使用计数
 */
async function incrementKeyUsage(req: any, keyId: number) {
  await req.supabase
    .from(VENDOR_KEYS_TABLE)
    .update({ usage_count: req.supabase.raw('usage_count + 1') })
    .eq('id', keyId)
    .catch(() => {});
}

// GET /api/routing-rules
router.get('/', async (req: any, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let query = req.supabase
      .from(RULE_TABLE)
      .select('*', { count: 'exact' })
      .eq('corp_id', req.user.corp_id)
      .eq('is_deleted', 'n');

    if (keyword) {
      query = query.ilike('rule_name', `%${keyword}%`);
    }

    const { data, error, count } = await query
      .order('priority', { ascending: false })
      .range(offset, offset + Number(pageSize) - 1);

    if (error) throw error;

    // 获取每个规则关联的模型名称和兜底模型名称
    const rulesWithModels = await Promise.all(
      (data || []).map(async (rule: any) => {
        const { data: configs } = await req.supabase
          .from(CONFIG_TABLE)
          .select('config_id, weight, is_primary')
          .eq('rule_id', rule.id)
          .eq('is_deleted', 'n');

        let modelNames: string[] = [];
        if (configs && configs.length > 0) {
          const configIds = configs.map((c: any) => c.config_id);
          const { data: models } = await req.supabase
            .from(MODEL_TABLE)
            .select('model_name')
            .in('id', configIds);
          modelNames = models ? models.map((m: any) => m.model_name) : [];
        }

        // 获取兜底模型名称
        let fallbackModelName: string | null = null;
        if (rule.fallback_config_id) {
          const { data: fallbackModel } = await req.supabase
            .from(MODEL_TABLE)
            .select('model_name')
            .eq('id', rule.fallback_config_id)
            .single();
          fallbackModelName = fallbackModel?.model_name || null;
        }

        return {
          ...rule,
          config_ids: configs?.map((c: any) => c.config_id) || [],
          model_names: modelNames,
          fallback_model_name: fallbackModelName,
        };
      })
    );

    res.json({ success: true, data: { list: rulesWithModels, total: count || 0 } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch routing rules' });
  }
});

// GET /api/routing-rules/all - get all rules for dropdown
router.get('/all', async (req: any, res) => {
  try {
    const { data, error } = await req.supabase
      .from(RULE_TABLE)
      .select('id, rule_name, task_type')
      .eq('corp_id', req.user.corp_id)
      .eq('is_deleted', 'n')
      .eq('is_enabled', 'y')
      .order('priority', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch routing rules' });
  }
});

// POST /api/routing-rules
router.post('/', async (req: any, res) => {
  try {
    const { model_configs, fallback_config_id, ...ruleData } = req.body;
    // 兼容旧格式 config_ids
    const config_ids = req.body.config_ids;

    const { data, error } = await req.supabase
      .from(RULE_TABLE)
      .insert([{
        ...ruleData,
        fallback_config_id: fallback_config_id || null,
        corp_id: req.user.corp_id,
        emp_id: req.user.emp_id,
      }])
      .select()
      .single();

    if (error) throw error;

    // 创建规则-模型关联
    if (model_configs && model_configs.length > 0) {
      // 新格式：model_configs 数组，包含 weight 和 is_primary
      const configInserts = model_configs.map((mc: any) => ({
        rule_id: data.id,
        config_id: mc.config_id,
        weight: mc.weight || 1,
        is_primary: mc.is_primary ? 'y' : 'n',
        corp_id: req.user.corp_id,
        emp_id: req.user.emp_id,
      }));
      await req.supabase.from(CONFIG_TABLE).insert(configInserts);
    } else if (config_ids && config_ids.length > 0) {
      // 旧格式兼容：config_ids 数组
      const configInserts = config_ids.map((configId: number, index: number) => ({
        rule_id: data.id,
        config_id: configId,
        weight: 1,
        is_primary: index === 0 ? 'y' : 'n',
        corp_id: req.user.corp_id,
        emp_id: req.user.emp_id,
      }));
      await req.supabase.from(CONFIG_TABLE).insert(configInserts);
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create routing rule' });
  }
});

// PUT /api/routing-rules/:id
router.put('/:id', async (req: any, res) => {
  try {
    const { model_configs, fallback_config_id, config_ids, ...ruleData } = req.body;

    const updatePayload = { ...ruleData };
    if (fallback_config_id !== undefined) {
      updatePayload.fallback_config_id = fallback_config_id;
    }

    const { data, error } = await req.supabase
      .from(RULE_TABLE)
      .update(updatePayload)
      .eq('id', req.params.id)
      .eq('corp_id', req.user.corp_id)
      .select()
      .single();

    if (error) throw error;

    // 更新规则-模型关联
    if (model_configs !== undefined || config_ids !== undefined) {
      // 删除旧关联
      await req.supabase
        .from(CONFIG_TABLE)
        .update({ is_deleted: 'y' })
        .eq('rule_id', req.params.id)
        .eq('corp_id', req.user.corp_id);

      // 新格式：model_configs 数组
      if (model_configs && model_configs.length > 0) {
        const configInserts = model_configs.map((mc: any) => ({
          rule_id: data.id,
          config_id: mc.config_id,
          weight: mc.weight || 1,
          is_primary: mc.is_primary ? 'y' : 'n',
          corp_id: req.user.corp_id,
          emp_id: req.user.emp_id,
        }));
        await req.supabase.from(CONFIG_TABLE).insert(configInserts);
      }
      // 旧格式兼容：config_ids 数组
      else if (config_ids && config_ids.length > 0) {
        const configInserts = config_ids.map((configId: number, index: number) => ({
          rule_id: data.id,
          config_id: configId,
          weight: 1,
          is_primary: index === 0 ? 'y' : 'n',
          corp_id: req.user.corp_id,
          emp_id: req.user.emp_id,
        }));
        await req.supabase.from(CONFIG_TABLE).insert(configInserts);
      }
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update routing rule' });
  }
});

// DELETE /api/routing-rules/:id
router.delete('/:id', async (req: any, res) => {
  try {
    const { error } = await req.supabase
      .from(RULE_TABLE)
      .update({ is_deleted: 'y' })
      .eq('id', req.params.id)
      .eq('corp_id', req.user.corp_id);

    if (error) throw error;

    // 同时删除关联记录
    await req.supabase
      .from(CONFIG_TABLE)
      .update({ is_deleted: 'y' })
      .eq('rule_id', req.params.id)
      .eq('corp_id', req.user.corp_id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete routing rule' });
  }
});

// GET /api/routing-rules/:id/configs - 获取规则关联的模型配置
router.get('/:id/configs', async (req: any, res) => {
  try {
    const { data: configs, error } = await req.supabase
      .from(CONFIG_TABLE)
      .select('id, config_id, weight, is_primary')
      .eq('rule_id', req.params.id)
      .eq('is_deleted', 'n')
      .eq('corp_id', req.user.corp_id);

    if (error) throw error;

    // 获取模型详情
    const configsWithDetails = await Promise.all(
      (configs || []).map(async (config: any) => {
        const { data: model } = await req.supabase
          .from(MODEL_TABLE)
          .select('id, model_name, provider, api_endpoint')
          .eq('id', config.config_id)
          .single();

        return {
          ...config,
          model: model || null,
        };
      })
    );

    res.json({ success: true, data: configsWithDetails });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch rule configs' });
  }
});

// POST /api/proxy/chat - 代理调用（支持多厂商格式）
router.post('/chat', async (req: any, res) => {
  try {
    const { model, messages, temperature, max_tokens, stream = false } = req.body;

    if (!model || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'model and messages (array) are required',
      });
    }

    // 1. 根据模型名称查找路由规则
    const { data: rules } = await req.supabase
      .from(RULE_TABLE)
      .select('id, task_type, load_balance_strategy, fallback_config_id')
      .eq('corp_id', req.user.corp_id)
      .eq('is_deleted', 'n')
      .eq('is_enabled', 'y')
      .order('priority', { ascending: false });

    let targetConfigId: number | null = null;
    let ruleId: number | null = null;

    // 2. 查找匹配的规则
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        const { data: configs } = await req.supabase
          .from(CONFIG_TABLE)
          .select('config_id')
          .eq('rule_id', rule.id)
          .eq('is_deleted', 'n');

        if (configs && configs.length > 0) {
          const configIds = configs.map((c: any) => c.config_id);
          const { data: models } = await req.supabase
            .from(MODEL_TABLE)
            .select('id, model_name')
            .in('id', configIds)
            .eq('is_enabled', 'y');

          if (models) {
            const matchedModel = models.find((m: any) => m.model_name === model);
            if (matchedModel) {
              targetConfigId = matchedModel.id;
              ruleId = rule.id;
              break;
            }
          }
        }
      }
    }

    // 3. 如果没有匹配的规则，直接查找该模型配置
    if (!targetConfigId) {
      const { data: directModel } = await req.supabase
        .from(MODEL_TABLE)
        .select('id')
        .eq('model_name', model)
        .eq('corp_id', req.user.corp_id)
        .eq('is_deleted', 'n')
        .eq('is_enabled', 'y')
        .single();

      if (directModel) {
        targetConfigId = directModel.id;
      }
    }

    if (!targetConfigId) {
      return res.status(404).json({
        success: false,
        error: `Model '${model}' not found or not enabled`,
      });
    }

    // 4. 获取模型配置（包含 vendor_key_id）
    const { data: modelConfigForLookup } = await req.supabase
      .from(MODEL_TABLE)
      .select('id, vendor_key_id')
      .eq('id', targetConfigId)
      .single();

    if (!modelConfigForLookup) {
      return res.status(500).json({
        success: false,
        error: 'Model configuration not found',
      });
    }

    // 5. 查找可用的 API Key（优先厂商密钥，回退模型级密钥）
    const selectedKey = await resolveApiKey(req, modelConfigForLookup);

    if (!selectedKey) {
      return res.status(503).json({
        success: false,
        error: 'No available API keys for this model',
      });
    }

    // 6. 获取完整模型配置
    const { data: modelConfig } = await req.supabase
      .from(MODEL_TABLE)
      .select('*')
      .eq('id', targetConfigId)
      .single();

    if (!modelConfig) {
      return res.status(500).json({
        success: false,
        error: 'Model configuration not found',
      });
    }

    const provider = modelConfig.provider.toLowerCase();
    const apiEndpoint = modelConfig.api_endpoint.trim().replace(/\/+$/, '');

    // 智能构建 API URL
    function buildApiUrl(path: string): string {
      if (apiEndpoint.endsWith(path)) return apiEndpoint;
      if (apiEndpoint.endsWith('/v1')) return `${apiEndpoint}${path}`;
      if (!apiEndpoint.includes('/v1')) return `${apiEndpoint}/v1${path}`;
      return `${apiEndpoint}${path}`;
    }

    // 7. 根据厂商类型构造不同的请求
    const startTime = Date.now();
    let response: Response;
    let requestTokens = 0;
    let responseTokens = 0;
    let responseData: any;

    if (provider === 'anthropic') {
      // Anthropic 原生 API 格式
      const anthropicVersion = '2023-06-01';

      // 检查端点是否是 OpenAI 兼容格式（如通过第三方代理）
      const isOpenAICompatible = apiEndpoint.includes('/openai/');

      if (isOpenAICompatible) {
        const url = buildApiUrl('/chat/completions');
        console.log(`[Proxy] Anthropic OpenAI-compatible URL: ${url}`);
        // 通过 OpenAI 兼容端点调用 Anthropic
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${selectedKey.api_key}`,
          },
          body: JSON.stringify({
            model: modelConfig.model_name,
            messages,
            temperature: temperature ?? modelConfig.default_temperature ?? 0.7,
            max_tokens: max_tokens ?? modelConfig.default_max_tokens ?? 4096,
            stream,
          }),
        });
        responseData = await response.json();
        requestTokens = responseData.usage?.prompt_tokens || 0;
        responseTokens = responseData.usage?.completion_tokens || 0;
      } else {
        // Anthropic 原生 API
        const url = buildApiUrl('/messages');
        console.log(`[Proxy] Anthropic native URL: ${url}`);
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': anthropicVersion,
            'x-api-key': selectedKey.api_key,
          },
          body: JSON.stringify({
            model: modelConfig.model_name,
            messages: messages.map((m: any) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
            temperature: temperature ?? modelConfig.default_temperature ?? 0.7,
            max_tokens: max_tokens ?? modelConfig.default_max_tokens ?? 4096,
            stream,
          }),
        });
        responseData = await response.json();

        // 解析 Anthropic 响应格式
        if (response.ok && responseData.content) {
          const textContent = responseData.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text)
            .join('\n');

          // 转换为 OpenAI 兼容格式返回
          responseData = {
            id: responseData.id || `anthropic-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: modelConfig.model_name,
            choices: [{
              index: 0,
              message: { role: 'assistant', content: textContent },
              finish_reason: responseData.stop_reason || 'stop',
            }],
            usage: {
              prompt_tokens: responseData.usage?.input_tokens || 0,
              completion_tokens: responseData.usage?.output_tokens || 0,
              total_tokens: (responseData.usage?.input_tokens || 0) + (responseData.usage?.output_tokens || 0),
            },
          };
        }
        requestTokens = responseData.usage?.prompt_tokens || 0;
        responseTokens = responseData.usage?.completion_tokens || 0;
      }
    } else {
      // OpenAI 兼容格式（OpenAI、Google Gemini OpenAI兼容端点、其他自定义）
      const url = buildApiUrl('/chat/completions');
      console.log(`[Proxy] OpenAI-compatible URL: ${url}`);
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${selectedKey.api_key}`,
        },
        body: JSON.stringify({
          model: modelConfig.model_name,
          messages,
          temperature: temperature ?? modelConfig.default_temperature ?? 0.7,
          max_tokens: max_tokens ?? modelConfig.default_max_tokens,
          stream,
        }),
      });
      responseData = await response.json();
      requestTokens = responseData.usage?.prompt_tokens || 0;
      responseTokens = responseData.usage?.completion_tokens || 0;
    }

    const latencyMs = Date.now() - startTime;

    // 8. 记录代理调用日志
    const status = response.ok ? 'success' : 'failed';
    const errorMessage = status === 'failed'
      ? (responseData.error?.message || responseData.message || responseData.error || 'Unknown error')
      : null;

    // 更新密钥使用次数
    await updateKeyUsage(req, selectedKey.id);

    await req.supabase
      .from(PROXY_LOGS_TABLE)
      .insert([{
        rule_id: ruleId,
        config_id: targetConfigId,
        access_key_id: null,
        request_tokens: requestTokens,
        response_tokens: responseTokens,
        status,
        error_message: errorMessage,
        latency_ms: latencyMs,
        task_type: 'chat',
        original_model: model,
        routed_model: modelConfig.model_name,
        request_body: JSON.stringify({ model, messages }).substring(0, 5000),
        response_body: JSON.stringify(responseData).substring(0, 5000),
        corp_id: req.user.corp_id,
        emp_id: req.user.emp_id,
      }]);

    // 同时记录到调用日志表（用于 /logs 和 /usage 页面统计）
    await req.supabase
      .from(LOGS_TABLE)
      .insert([{
        config_id: targetConfigId,
        request_tokens: requestTokens,
        response_tokens: responseTokens,
        status,
        error_message: errorMessage,
        latency_ms: latencyMs,
        request_body: JSON.stringify({ model, messages }).substring(0, 5000),
        response_body: JSON.stringify(responseData).substring(0, 5000),
        corp_id: req.user.corp_id,
        emp_id: req.user.emp_id,
      }]);

    // 9. 返回响应
    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write(`data: ${JSON.stringify(responseData)}\n\n`);
      res.end();
    } else {
      res.json({
        success: true,
        data: responseData,
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Proxy call failed' });
  }
});

// POST /api/proxy/v1/chat - 智能路由代理API（一个API对应多个模型，自动按任务类型路由）
router.post('/v1/chat', async (req: any, res) => {
  try {
    const { task_type = 'chat', messages, temperature, max_tokens, stream = false, model: preferred_model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'messages (array) is required',
      });
    }

    // ========== 路由引擎核心逻辑 ==========
    // 1. 按 task_type 匹配启用的路由规则，按优先级降序排列
    const { data: rules } = await req.supabase
      .from(RULE_TABLE)
      .select('id, rule_name, task_type, load_balance_strategy, fallback_config_id')
      .eq('corp_id', req.user.corp_id)
      .eq('is_deleted', 'n')
      .eq('is_enabled', 'y')
      .in('task_type', [task_type, 'default'])
      .order('priority', { ascending: false });

    let targetConfigId: number | null = null;
    let ruleId: number | null = null;
    let ruleName: string | null = null;
    let routedModelName: string | null = null;
    let loadBalanceStrategy = 'round_robin';

    if (rules && rules.length > 0) {
      for (const rule of rules) {
        // 2. 获取规则关联的所有模型配置
        const { data: configs } = await req.supabase
          .from(CONFIG_TABLE)
          .select('config_id, weight, is_primary')
          .eq('rule_id', rule.id)
          .eq('is_deleted', 'n')
          .order('is_primary', { ascending: false })
          .order('weight', { ascending: false });

        if (configs && configs.length > 0) {
          const configIds = configs.map((c: any) => c.config_id);

          // 3. 获取这些模型的详情（只取启用的）
          const { data: models } = await req.supabase
            .from(MODEL_TABLE)
            .select('id, model_name, provider, api_endpoint, is_enabled')
            .in('id', configIds)
            .eq('is_enabled', 'y');

          if (models && models.length > 0) {
            // 4. 如果用户指定了 preferred_model，优先匹配
            if (preferred_model) {
              const preferred = models.find((m: any) => m.model_name === preferred_model);
              if (preferred) {
                targetConfigId = preferred.id;
                ruleId = rule.id;
                ruleName = rule.rule_name;
                routedModelName = preferred.model_name;
                loadBalanceStrategy = rule.load_balance_strategy;
                break;
              }
            }

            // 5. 根据负载均衡策略选择模型
            const selectedModel = await selectModelByStrategy(
              req,
              models,
              configs,
              rule.load_balance_strategy
            );

            if (selectedModel) {
              targetConfigId = selectedModel.id;
              ruleId = rule.id;
              ruleName = rule.rule_name;
              routedModelName = selectedModel.model_name;
              loadBalanceStrategy = rule.load_balance_strategy;
              break;
            }
          }
        }
      }
    }

    // 6. 如果没匹配到规则，尝试 fallback
    if (!targetConfigId && rules && rules.length > 0) {
      for (const rule of rules) {
        if (rule.fallback_config_id) {
          const { data: fallbackModel } = await req.supabase
            .from(MODEL_TABLE)
            .select('id, model_name, is_enabled')
            .eq('id', rule.fallback_config_id)
            .eq('is_enabled', 'y')
            .single();

          if (fallbackModel) {
            targetConfigId = fallbackModel.id;
            ruleId = rule.id;
            ruleName = rule.rule_name;
            routedModelName = fallbackModel.model_name;
            break;
          }
        }
      }
    }

    // 7. 最后的兜底：如果用户指定了 model，直接查找
    if (!targetConfigId && preferred_model) {
      const { data: directModel } = await req.supabase
        .from(MODEL_TABLE)
        .select('id, model_name')
        .eq('model_name', preferred_model)
        .eq('corp_id', req.user.corp_id)
        .eq('is_deleted', 'n')
        .eq('is_enabled', 'y')
        .single();

      if (directModel) {
        targetConfigId = directModel.id;
        routedModelName = directModel.model_name;
        ruleName = 'direct_match';
      }
    }

    if (!targetConfigId) {
      return res.status(404).json({
        success: false,
        error: `No available model for task_type '${task_type}'. Please configure routing rules.`,
      });
    }

    // ========== 以下与原有 proxy/chat 逻辑一致 ==========
    // 8. 获取模型配置
    const { data: modelConfig } = await req.supabase
      .from(MODEL_TABLE)
      .select('*')
      .eq('id', targetConfigId)
      .single();

    if (!modelConfig) {
      return res.status(500).json({
        success: false,
        error: 'Model configuration not found',
      });
    }

    // 9. 查找可用的 API Key（优先厂商密钥，回退模型级密钥）
    const selectedKey = await resolveApiKey(req, modelConfig);

    if (!selectedKey) {
      return res.status(503).json({
        success: false,
        error: 'No available API keys for this model',
      });
    }

    const provider = modelConfig.provider.toLowerCase();
    const apiEndpoint = modelConfig.api_endpoint.trim().replace(/\/+$/, '');

    // 智能构建 API URL
    function buildApiUrl(path: string): string {
      if (apiEndpoint.endsWith(path)) return apiEndpoint;
      if (apiEndpoint.endsWith('/v1')) return `${apiEndpoint}${path}`;
      if (!apiEndpoint.includes('/v1')) return `${apiEndpoint}/v1${path}`;
      return `${apiEndpoint}${path}`;
    }

    const startTime = Date.now();
    let response: Response;
    let requestTokens = 0;
    let responseTokens = 0;
    let responseData: any;

    if (provider === 'anthropic') {
      const anthropicVersion = '2023-06-01';
      const isOpenAICompatible = apiEndpoint.includes('/openai/');

      if (isOpenAICompatible) {
        const url = buildApiUrl('/chat/completions');
        console.log(`[Proxy v1] Anthropic OpenAI-compatible URL: ${url}`);
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${selectedKey.api_key}`,
          },
          body: JSON.stringify({
            model: modelConfig.model_name,
            messages,
            temperature: temperature ?? modelConfig.default_temperature ?? 0.7,
            max_tokens: max_tokens ?? modelConfig.default_max_tokens ?? 4096,
            stream,
          }),
        });
        responseData = await response.json();
        requestTokens = responseData.usage?.prompt_tokens || 0;
        responseTokens = responseData.usage?.completion_tokens || 0;
      } else {
        const url = buildApiUrl('/messages');
        console.log(`[Proxy v1] Anthropic native URL: ${url}`);
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': anthropicVersion,
            'x-api-key': selectedKey.api_key,
          },
          body: JSON.stringify({
            model: modelConfig.model_name,
            messages: messages.map((m: any) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
            temperature: temperature ?? modelConfig.default_temperature ?? 0.7,
            max_tokens: max_tokens ?? modelConfig.default_max_tokens ?? 4096,
            stream,
          }),
        });
        responseData = await response.json();

        if (response.ok && responseData.content) {
          const textContent = responseData.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text)
            .join('\n');

          responseData = {
            id: responseData.id || `anthropic-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: modelConfig.model_name,
            choices: [{
              index: 0,
              message: { role: 'assistant', content: textContent },
              finish_reason: responseData.stop_reason || 'stop',
            }],
            usage: {
              prompt_tokens: responseData.usage?.input_tokens || 0,
              completion_tokens: responseData.usage?.output_tokens || 0,
              total_tokens: (responseData.usage?.input_tokens || 0) + (responseData.usage?.output_tokens || 0),
            },
          };
        }
        requestTokens = responseData.usage?.prompt_tokens || 0;
        responseTokens = responseData.usage?.completion_tokens || 0;
      }
    } else {
      const url = buildApiUrl('/chat/completions');
      console.log(`[Proxy v1] OpenAI-compatible URL: ${url}`);
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${selectedKey.api_key}`,
        },
        body: JSON.stringify({
          model: modelConfig.model_name,
          messages,
          temperature: temperature ?? modelConfig.default_temperature ?? 0.7,
          max_tokens: max_tokens ?? modelConfig.default_max_tokens,
          stream,
        }),
      });
      responseData = await response.json();
      requestTokens = responseData.usage?.prompt_tokens || 0;
      responseTokens = responseData.usage?.completion_tokens || 0;
    }

    const latencyMs = Date.now() - startTime;
    const status = response.ok ? 'success' : 'failed';
    const errorMessage = status === 'failed'
      ? (responseData.error?.message || responseData.message || responseData.error || 'Unknown error')
      : null;

    // 更新密钥使用次数
    await updateKeyUsage(req, selectedKey.id);

    // 记录代理调用日志（包含路由信息）
    await req.supabase
      .from('proxy_call_logs_s_7b4a6688_3')
      .insert([{
        rule_id: ruleId,
        config_id: targetConfigId,
        access_key_id: null,
        request_tokens: requestTokens,
        response_tokens: responseTokens,
        status,
        error_message: errorMessage,
        latency_ms: latencyMs,
        task_type,
        original_model: preferred_model || 'auto_routed',
        routed_model: routedModelName || modelConfig.model_name,
        request_body: JSON.stringify({ task_type, messages }).substring(0, 5000),
        response_body: JSON.stringify(responseData).substring(0, 5000),
        corp_id: req.user.corp_id,
        emp_id: req.user.emp_id,
      }]);

    // 同时记录到调用日志表（用于 /logs 和 /usage 页面统计）
    await req.supabase
      .from(LOGS_TABLE)
      .insert([{
        config_id: targetConfigId,
        request_tokens: requestTokens,
        response_tokens: responseTokens,
        status,
        error_message: errorMessage,
        latency_ms: latencyMs,
        request_body: JSON.stringify({ task_type, messages }).substring(0, 5000),
        response_body: JSON.stringify(responseData).substring(0, 5000),
        corp_id: req.user.corp_id,
        emp_id: req.user.emp_id,
      }]);

    // 返回响应（附带路由信息）
    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write(`data: ${JSON.stringify({ ...responseData, _routing: { rule_name: ruleName, model: routedModelName, task_type } })}\n\n`);
      res.end();
    } else {
      res.json({
        success: true,
        data: responseData,
        _routing: {
          rule_name: ruleName,
          task_type,
          original_model: preferred_model || 'auto',
          routed_model: routedModelName || modelConfig.model_name,
          strategy: loadBalanceStrategy,
        },
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Proxy call failed' });
  }
});

// GET /api/proxy/models - 获取可用的模型列表（通过代理）
router.get('/models', async (req: any, res) => {
  try {
    const { data: models, error } = await req.supabase
      .from(MODEL_TABLE)
      .select('id, model_name, provider, description')
      .eq('corp_id', req.user.corp_id)
      .eq('is_deleted', 'n')
      .eq('is_enabled', 'y')
      .order('model_name');

    if (error) throw error;

    res.json({ success: true, data: models || [] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch available models' });
  }
});

// ========== 路由引擎辅助函数 ==========

/**
 * 根据负载均衡策略从候选模型中选择一个
 */
async function selectModelByStrategy(
  req: any,
  models: any[],
  configs: any[],
  strategy: string
): Promise<any | null> {
  if (!models || models.length === 0) return null;

  if (models.length === 1) return models[0];

  switch (strategy) {
    case 'random': {
      // 随机选择
      return models[Math.floor(Math.random() * models.length)];
    }

    case 'least_used': {
      // 最少使用：查找厂商密钥 usage_count 最小的模型
      let minUsage = Infinity;
      let selectedModel = models[0];

      for (const model of models) {
        let totalUsage = 0;
        if (model.vendor_key_id) {
          const { data: vendorKeys } = await req.supabase
            .from(VENDOR_KEYS_TABLE)
            .select('usage_count')
            .eq('id', model.vendor_key_id)
            .eq('is_deleted', 'n')
            .eq('is_enabled', 'y');
          totalUsage = vendorKeys?.reduce((sum: number, k: any) => sum + (k.usage_count || 0), 0) || 0;
        }

        if (totalUsage < minUsage) {
          minUsage = totalUsage;
          selectedModel = model;
        }
      }

      return selectedModel;
    }

    case 'round_robin':
    default: {
      // 轮询：使用持久化计数器，避免并发冲突
      const { data: ruleData } = await req.supabase
        .from(RULE_TABLE)
        .select('last_round_index')
        .eq('id', configs[0].rule_id)
        .single();

      const currentIndex = (ruleData?.last_round_index || 0) % models.length;
      const selectedModel = models[currentIndex];

      // 更新计数器
      const nextIndex = (currentIndex + 1) % models.length;
      await req.supabase
        .from(RULE_TABLE)
        .update({ last_round_index: nextIndex })
        .eq('id', configs[0].rule_id);

      return selectedModel;
    }
  }
}

export default router;
