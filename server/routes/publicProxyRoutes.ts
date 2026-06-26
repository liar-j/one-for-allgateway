import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { ENV } from '../_core/env.js';

const router: Router = Router();

const ACCESS_KEY_TABLE = 'ai_access_keys_s_7b4a6688_3';
const MODEL_TABLE = 'ai_model_configs_s_7b4a6688_3';
const RULE_TABLE = 'model_routing_rules_s_7b4a6688_3';
const CONFIG_TABLE = 'model_rule_configs_s_7b4a6688_3';

/**
 * 获取 Supabase 客户端（公开代理路由自行创建，不依赖 gateway middleware）
 */
function getSupabase() {
  return createClient(ENV.supabaseUrl!, ENV.supabaseAnonKey!);
}

/**
 * 提取并验证平台访问密钥（Access Key）
 * 支持两种格式：
 *   Authorization: Bearer <access_key>
 *   X-API-Key: <access_key>
 * 安全检查：
 *   1. 密钥是否存在、启用、未过期
 *   2. IP 白名单校验（如果配置了 allowed_ips）
 *   3. 频率限制（如果配置了 rate_limit_per_minute）
 */
async function authenticateAccessKey(
  supabase: any,
  authHeader: string | undefined,
  xApiKey: string | undefined,
  clientIp: string | undefined
): Promise<{ success: true; key: any } | { success: false; error: string; status: number }> {
  const accessKey = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : xApiKey?.trim();

  if (!accessKey) {
    return { success: false, error: 'Missing access key. Provide via Authorization: Bearer <key> or X-API-Key header.', status: 401 };
  }

  const { data, error } = await supabase
    .from(ACCESS_KEY_TABLE)
    .select('id, access_key, is_enabled, expires_at, allowed_ips, rate_limit_per_minute, usage_count')
    .eq('access_key', accessKey)
    .eq('is_deleted', 'n')
    .single();

  if (error || !data) {
    return { success: false, error: 'Invalid access key.', status: 401 };
  }

  if (data.is_enabled !== 'y') {
    return { success: false, error: 'Access key is disabled.', status: 403 };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { success: false, error: 'Access key has expired.', status: 403 };
  }

  // IP 白名单检查
  if (data.allowed_ips) {
    const allowedIps = data.allowed_ips.split(',').map((ip: string) => ip.trim()).filter(Boolean);
    if (allowedIps.length > 0 && clientIp && !allowedIps.includes(clientIp)) {
      return { success: false, error: 'IP not in whitelist.', status: 403 };
    }
  }

  // 频率限制检查
  if (data.rate_limit_per_minute && data.rate_limit_per_minute > 0) {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count } = await supabase
      .from('proxy_call_logs_s_7b4a6688_3')
      .select('id', { count: 'exact', head: true })
      .eq('access_key_id', data.id)
      .gte('created_at', oneMinuteAgo);

    if (count && count >= data.rate_limit_per_minute) {
      return { success: false, error: `Rate limit exceeded (${data.rate_limit_per_minute}/min).`, status: 429 };
    }
  }

  return { success: true, key: data };
}

/**
 * 智能构建 API URL
 */
function buildApiUrl(apiEndpoint: string, path: string): string {
  const endpoint = apiEndpoint.trim().replace(/\/+$/, '');
  if (endpoint.endsWith(path)) return endpoint;
  if (endpoint.endsWith('/v1')) return `${endpoint}${path}`;
  if (!endpoint.includes('/v1')) return `${endpoint}/v1${path}`;
  return `${endpoint}${path}`;
}

/**
 * 根据负载均衡策略从候选模型中选择一个
 */
async function selectModelByStrategy(
  _supabase: any,
  models: any[],
  _configs: any[],
  strategy: string
): Promise<any | null> {
  if (!models || models.length === 0) return null;
  if (models.length === 1) return models[0];

  switch (strategy) {
    case 'random':
      return models[Math.floor(Math.random() * models.length)];

    case 'least_used': {
      // 简化为随机选择（原逻辑依赖厂商密钥使用次数）
      return models[Math.floor(Math.random() * models.length)];
    }

    case 'round_robin':
    default: {
      const index = Date.now() % models.length;
      return models[index];
    }
  }
}

/**
 * 解析上游响应，兼容 JSON 和 SSE 格式
 * 对非流式请求，优先返回包含完整 choices 的最终响应
 */
async function parseUpstreamResponse(response: Response, modelName?: string): Promise<any> {
  const text = await response.text();
  const trimmedText = text.trim();

  // Try plain JSON first
  try {
    const parsed = JSON.parse(text);
    return normalizeChatCompletion(parsed, modelName);
  } catch {
    // Not valid JSON — try SSE parsing
  }

  // SSE parsing: collect all data: lines, find the final completion
  const lines = trimmedText.split(/\r?\n/);
  let lastValidData: any = null;
  let finalCompletion: any = null;
  let accumulatedContent = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || !line.startsWith('data:')) continue;
    const dataStr = line.slice(5).trim();
    if (!dataStr || dataStr === '[DONE]') continue;
    try {
      const parsed = JSON.parse(dataStr);
      lastValidData = parsed;

      // Check if this is a complete response (has finish_reason or message)
      if (parsed.choices && parsed.choices.length > 0) {
        const firstChoice = parsed.choices[0];
        // Streaming chunk: has delta
        if (firstChoice.delta?.content) {
          accumulatedContent += firstChoice.delta.content;
        }
        // Final completion: has finish_reason
        if (firstChoice.finish_reason !== undefined || firstChoice.message) {
          finalCompletion = parsed;
        }
      }
    } catch {
      continue;
    }
  }

  // If we found a final completion, use it
  if (finalCompletion) {
    return normalizeChatCompletion(finalCompletion, modelName);
  }

  // If we accumulated streaming content, construct a complete response
  if (accumulatedContent && lastValidData) {
    return normalizeChatCompletion({
      id: lastValidData.id || `chatcmpl-${Date.now()}`,
      model: lastValidData.model || modelName || 'unknown',
      object: 'chat.completion',
      created: lastValidData.created || Math.floor(Date.now() / 1000),
      choices: [{
        index: 0,
        message: { role: 'assistant', content: accumulatedContent },
        finish_reason: 'stop',
      }],
      usage: lastValidData.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    }, modelName);
  }

  // Last resort: return whatever we got, normalized
  if (lastValidData) {
    return normalizeChatCompletion(lastValidData, modelName);
  }

  throw new Error('No valid data found in response');
}

/**
 * Ensure response has all required OpenAI ChatCompletion fields
 * Guarantees non-null content for OpenAI SDK compatibility
 */
function normalizeChatCompletion(data: any, modelName?: string): any {
  // If it already looks like a valid ChatCompletion, validate and return
  if (data.id && data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
    // Still ensure content is never null
    return {
      ...data,
      choices: data.choices.map((c: any, i: number) => ({
        ...c,
        index: c.index ?? i,
        message: {
          role: c.message?.role || 'assistant',
          content: c.message?.content ?? c.message?.text ?? c.delta?.content ?? '',
        },
        finish_reason: c.finish_reason || 'stop',
      })),
    };
  }

  // Try to normalize
  const firstChoice = data.choices?.[0];
  const content = firstChoice?.message?.content
    ?? firstChoice?.message?.text
    ?? firstChoice?.delta?.content
    ?? data.content
    ?? data.text
    ?? data.output
    ?? '';

  return {
    id: data.id || `chatcmpl-${Date.now()}`,
    object: data.object || 'chat.completion',
    created: data.created || Math.floor(Date.now() / 1000),
    model: data.model || modelName || 'unknown',
    choices: [{
      index: firstChoice?.index ?? 0,
      message: {
        role: firstChoice?.message?.role || 'assistant',
        content,
      },
      finish_reason: firstChoice?.finish_reason || 'stop',
    }],
    usage: data.usage || {
      prompt_tokens: data.prompt_tokens || 0,
      completion_tokens: data.completion_tokens || 0,
      total_tokens: (data.prompt_tokens || 0) + (data.completion_tokens || 0),
    },
  };
}

/**
 * 执行实际的模型调用（支持 OpenAI 兼容和 Anthropic 原生格式）
 * 直接使用模型配置中的 api_key
 */
async function callModel(
  _supabase: any,
  modelConfig: any,
  messages: any[],
  temperature: number | undefined,
  maxTokens: number | undefined,
  stream: boolean
): Promise<{ response: Response; responseData: any; requestTokens: number; responseTokens: number; latencyMs: number }> {
  const provider = modelConfig.provider.toLowerCase();
  const apiEndpoint = modelConfig.api_endpoint.trim().replace(/\/+$/, '');
  const apiKey = modelConfig.api_key;
  const authType = modelConfig.auth_type || 'bearer';
  const startTime = Date.now();

  let response: Response;
  let responseData: any;
  let requestTokens = 0;
  let responseTokens = 0;

  if (provider === 'anthropic') {
    const anthropicVersion = '2023-06-01';
    const isOpenAICompatible = apiEndpoint.includes('/openai/');

    if (isOpenAICompatible) {
      const url = buildApiUrl(apiEndpoint, '/chat/completions');
      console.log(`[PublicProxy] Anthropic OpenAI-compatible URL: ${url}`);
      console.log(`[PublicProxy] Auth header: Bearer ${apiKey.substring(0, 12)}...`);
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelConfig.model_name,
          messages,
          temperature: temperature ?? modelConfig.default_temperature ?? 0.7,
          max_tokens: maxTokens ?? modelConfig.default_max_tokens ?? 4096,
          stream,
        }),
      });
      responseData = await parseUpstreamResponse(response);
      requestTokens = responseData.usage?.prompt_tokens || 0;
      responseTokens = responseData.usage?.completion_tokens || 0;
    } else {
      const url = buildApiUrl(apiEndpoint, '/messages');
      console.log(`[PublicProxy] Anthropic native URL: ${url}`);
      console.log(`[PublicProxy] Auth header: x-api-key ${apiKey.substring(0, 12)}...`);
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': anthropicVersion,
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          model: modelConfig.model_name,
          messages: messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          temperature: temperature ?? modelConfig.default_temperature ?? 0.7,
          max_tokens: maxTokens ?? modelConfig.default_max_tokens ?? 4096,
          stream,
        }),
      });
      responseData = await parseUpstreamResponse(response);

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
    const url = buildApiUrl(apiEndpoint, '/chat/completions');
    const requestBody: any = {
      model: modelConfig.model_name,
      messages,
      temperature: temperature ?? modelConfig.default_temperature ?? 0.7,
      max_tokens: maxTokens ?? modelConfig.default_max_tokens,
      stream,
    };
    
    // 根据 auth_type 构建认证头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authType === 'bearer') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (authType === 'x-api-key') {
      headers['x-api-key'] = apiKey;
    }
    
    console.log(`[PublicProxy] OpenAI-compatible request => URL: ${url}`);
    console.log(`[PublicProxy] OpenAI-compatible request => Auth: ${authType} ${apiKey.substring(0, 12)}...`);
    console.log(`[PublicProxy] OpenAI-compatible request => model: ${requestBody.model}, messages_count: ${messages.length}, stream: ${stream}`);
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
    console.log(`[PublicProxy] OpenAI-compatible response => status: ${response.status}, statusText: ${response.statusText}`);
    responseData = await parseUpstreamResponse(response);
    requestTokens = responseData.usage?.prompt_tokens || 0;
    responseTokens = responseData.usage?.completion_tokens || 0;
  }

  // Log response content status for debugging
  const contentPreview = responseData?.choices?.[0]?.message?.content
    ? responseData.choices[0].message.content.substring(0, 100)
    : '(empty)';
  console.log(`[PublicProxy] Model: ${modelConfig.model_name}, Status: ${response.status}, Content preview: ${contentPreview}`);

  const latencyMs = Date.now() - startTime;
  return { response, responseData, requestTokens, responseTokens, latencyMs };
}

/**
 * 路由引擎：根据 task_type 和 preferred_model 选择目标模型
 */
async function resolveTargetModel(
  supabase: any,
  taskType: string,
  preferredModel: string | undefined
): Promise<{ targetConfigId: number | null; ruleId: number | null; ruleName: string | null; routedModelName: string | null; loadBalanceStrategy: string }> {
  let targetConfigId: number | null = null;
  let ruleId: number | null = null;
  let ruleName: string | null = null;
  let routedModelName: string | null = null;
  let loadBalanceStrategy = 'round_robin';

  const { data: rules } = await supabase
    .from(RULE_TABLE)
    .select('id, rule_name, task_type, load_balance_strategy, fallback_config_id')
    .eq('is_deleted', 'n')
    .eq('is_enabled', 'y')
    .in('task_type', [taskType, 'default'])
    .order('priority', { ascending: false });

  if (rules && rules.length > 0) {
    for (const rule of rules) {
      const { data: configs } = await supabase
        .from(CONFIG_TABLE)
        .select('config_id, weight, is_primary')
        .eq('rule_id', rule.id)
        .eq('is_deleted', 'n')
        .order('is_primary', { ascending: false })
        .order('weight', { ascending: false });

      if (configs && configs.length > 0) {
        const configIds = configs.map((c: any) => c.config_id);
        const { data: models } = await supabase
          .from(MODEL_TABLE)
          .select('id, model_name, provider, api_endpoint, is_enabled')
          .in('id', configIds)
          .eq('is_enabled', 'y');

        if (models && models.length > 0) {
          if (preferredModel) {
            const preferred = models.find((m: any) => m.model_name === preferredModel);
            if (preferred) {
              targetConfigId = preferred.id;
              ruleId = rule.id;
              ruleName = rule.rule_name;
              routedModelName = preferred.model_name;
              loadBalanceStrategy = rule.load_balance_strategy;
              break;
            }
          }

          const selectedModel = await selectModelByStrategy(supabase, models, configs, rule.load_balance_strategy);
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

  if (!targetConfigId && rules && rules.length > 0) {
    for (const rule of rules) {
      if (rule.fallback_config_id) {
        const { data: fallbackModel } = await supabase
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

  if (!targetConfigId && preferredModel) {
    const { data: directModel } = await supabase
      .from(MODEL_TABLE)
      .select('id, model_name')
      .eq('model_name', preferredModel)
      .eq('is_deleted', 'n')
      .eq('is_enabled', 'y')
      .single();

    if (directModel) {
      targetConfigId = directModel.id;
      routedModelName = directModel.model_name;
      ruleName = 'direct_match';
    }
  }

  return { targetConfigId, ruleId, ruleName, routedModelName, loadBalanceStrategy };
}

// ========== 路由定义 ==========

/**
 * 智能路由处理器：POST /api/public/proxy/v1/chat 和 /v1/chat/completions
 * 支持 OpenAI 兼容格式，供 OpenClaw 等第三方客户端使用
 */
async function handleSmartRouteChat(req: any, res: any) {
  try {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.ip;

    // 1. 认证（使用平台访问密钥）
    const supabase = getSupabase();
    const auth = await authenticateAccessKey(supabase, req.headers.authorization, req.headers['x-api-key'], clientIp);
    if (!auth.success) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }
    const accessKey = auth.key;

    const { task_type = 'chat', messages, temperature, max_tokens, stream = false, model: preferred_model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'messages (array) is required' });
    }

    // 2. 路由解析
    const { targetConfigId, ruleId, ruleName, routedModelName, loadBalanceStrategy } = await resolveTargetModel(
      supabase, task_type, preferred_model
    );

    if (!targetConfigId) {
      return res.status(404).json({
        success: false,
        error: `No available model for task_type '${task_type}'. Please configure routing rules in the gateway.`,
      });
    }

    // 3. 获取完整模型配置（包含 api_key）
    const { data: modelConfig } = await supabase
      .from(MODEL_TABLE)
      .select('*')
      .eq('id', targetConfigId)
      .single();

    if (!modelConfig) {
      return res.status(500).json({ success: false, error: 'Model configuration not found' });
    }

    // 4. 检查模型是否配置了 API Key
    if (!modelConfig.api_key) {
      return res.status(503).json({ success: false, error: `Model '${modelConfig.model_name}' has no API key configured` });
    }

    // 5. 调用模型（带空内容重试）
    const maxRetries = 2;
    let callResult: Awaited<ReturnType<typeof callModel>> | null = null;
    let attempt = 0;
    let lastError: string | null = null;
    let upstreamStatus = 200;
    let isServerError = false;

    while (attempt <= maxRetries) {
      try {
        callResult = await callModel(
          supabase, modelConfig, messages, temperature, max_tokens, stream
        );
        upstreamStatus = callResult.response?.status || 200;
        isServerError = upstreamStatus >= 500;

        const content = callResult.responseData?.choices?.[0]?.message?.content;
        const hasContent = content && content.trim().length > 0;

        // Success: got content, stop retrying
        if (hasContent) {
          console.log(`[PublicProxy] Got content on attempt ${attempt + 1}, status=${upstreamStatus}`);
          break;
        }

        // Empty content — record error and retry
        lastError = `Model '${modelConfig.model_name}' returned empty content (upstream status: ${upstreamStatus})`;
        console.log(`[PublicProxy] ${lastError}, attempt ${attempt + 1}/${maxRetries + 1}`);

        // Don't retry on server errors (5xx) or auth errors (401/403) — fail fast
        const isAuthError = upstreamStatus === 401 || upstreamStatus === 403;
        if (isServerError || isAuthError) {
          console.log(`[PublicProxy] ${isServerError ? 'Server' : 'Auth'} error ${upstreamStatus}, not retrying`);
          break;
        }
      } catch (err: any) {
        lastError = err.message || 'Unexpected error calling model';
        upstreamStatus = 500;
        isServerError = true;
        console.log(`[PublicProxy] ${lastError}, attempt ${attempt + 1}/${maxRetries + 1}`);
        break;
      }

      attempt++;
    }

    if (!callResult) {
      return res.status(502).json({ success: false, error: lastError || 'Failed to call model' });
    }

    const { response, responseData, requestTokens, responseTokens, latencyMs } = callResult!;

    // Check if final result still has empty content
    const finalContent = responseData?.choices?.[0]?.message?.content;
    const hasFinalContent = finalContent && finalContent.trim().length > 0;

    // Treat empty content as failure if upstream returned 200 but no content
    const status = response.ok && hasFinalContent ? 'success' : 'failed';
    const errorMessage = !hasFinalContent
      ? (responseData.error?.message || responseData.message || responseData.error || `Model '${modelConfig.model_name}' returned empty response after ${attempt + 1} attempts`)
      : null;

    // 6. 更新平台访问密钥使用统计
    await supabase
      .from(ACCESS_KEY_TABLE)
      .update({ usage_count: (accessKey.usage_count || 0) + 1, last_used_at: new Date().toISOString() })
      .eq('id', accessKey.id);

    // 7. 记录代理调用日志
    await supabase
      .from('proxy_call_logs_s_7b4a6688_3')
      .insert([{
        rule_id: ruleId,
        config_id: targetConfigId,
        access_key_id: accessKey.id,
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
        corp_id: null,
        emp_id: null,
      }]);

    // 8. 返回响应
    // 对 /v1/chat/completions 端点，直接返回标准 OpenAI 格式（不带包络），兼容 OpenAI SDK
    const isCompletionsEndpoint = req.path.endsWith('/v1/chat/completions');

    // If content is still empty after retries, return error status so client triggers fallback
    if (!hasFinalContent) {
      const errMsg = errorMessage || `Model '${modelConfig.model_name}' returned empty response after ${attempt + 1} attempts`;
      // Propagate upstream status if it was an error, otherwise use 502
      const errorStatus = isServerError ? upstreamStatus : 502;
      if (isCompletionsEndpoint) {
        // OpenAI SDK compatible error format — standard {error: {}} envelope
        return res.status(errorStatus).json({
          error: {
            message: errMsg,
            type: isServerError ? 'upstream_error' : 'server_error',
            code: isServerError ? 'upstream_empty_response' : 'empty_response',
            param: null,
          },
        });
      }
      return res.status(errorStatus).json({ success: false, error: errMsg });
    }

    // If upstream returned a server error (5xx) but we have content, still warn
    if (isServerError && hasFinalContent) {
      console.log(`[PublicProxy] WARNING: Upstream returned ${upstreamStatus} but we have content — proceeding anyway`);
    }

    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write(`data: ${JSON.stringify(responseData)}\n\n`);
      res.end();
    } else if (isCompletionsEndpoint) {
      // 直接返回上游原始格式，OpenAI SDK 可直接解析
      res.json(responseData);
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
}

// POST /api/public/proxy/ - Hermes Agent 兼容端点（base_url 直接作为请求地址）
// POST /api/public/proxy/v1/chat - 公开代理接口（平台访问密钥认证，智能路由）
// POST /api/public/proxy/v1/chat/completions - OpenAI 兼容端点（同上，供 OpenClaw 等客户端使用）
router.post('/proxy/', handleSmartRouteChat);
router.post('/proxy/v1/chat', handleSmartRouteChat);
router.post('/proxy/v1/chat/completions', handleSmartRouteChat);

// POST /api/public/proxy/chat - 公开代理接口（指定模型）
router.post('/proxy/chat', async (req: any, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.ip;

    // 1. 认证（使用平台访问密钥）
    const supabase = getSupabase();
    const auth = await authenticateAccessKey(supabase, req.headers.authorization, req.headers['x-api-key'], clientIp);
    if (!auth.success) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }

    const { model, messages, temperature, max_tokens, stream = false } = req.body;

    if (!model || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'model and messages (array) are required' });
    }

    // 2. 直接查找模型配置
    const { data: modelConfig } = await supabase
      .from(MODEL_TABLE)
      .select('*')
      .eq('model_name', model)
      .eq('is_deleted', 'n')
      .eq('is_enabled', 'y')
      .single();

    if (!modelConfig) {
      return res.status(404).json({ success: false, error: `Model '${model}' not found or not enabled` });
    }

    // 3. 检查模型是否配置了 API Key
    if (!modelConfig.api_key) {
      return res.status(503).json({ success: false, error: `Model '${model}' has no API key configured` });
    }

    // 4. 调用模型
    const { response, responseData, requestTokens, responseTokens, latencyMs } = await callModel(
      supabase, modelConfig, messages, temperature, max_tokens, stream
    );

    // 5. 记录代理调用日志
    const status = response.ok ? 'success' : 'failed';
    const errorMessage = status === 'failed'
      ? (responseData.error?.message || responseData.message || responseData.error || 'Unknown error')
      : null;

    await supabase
      .from('proxy_call_logs_s_7b4a6688_3')
      .insert([{
        rule_id: null,
        config_id: modelConfig.id,
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
        corp_id: null,
        emp_id: null,
      }]);

    // 6. 返回响应
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

// GET /api/public/proxy/models - 获取可用模型列表（公开，可选认证）
router.get('/proxy/models', async (req: any, res) => {
  try {
    const authHeader = req.headers.authorization;
    const xApiKey = req.headers['x-api-key'];
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.ip;

    const supabase = getSupabase();
    if (authHeader || xApiKey) {
      const auth = await authenticateAccessKey(supabase, authHeader, xApiKey, clientIp);
      if (!auth.success) {
        return res.status(auth.status).json({ success: false, error: auth.error });
      }
    }

    const { data: models, error } = await supabase
      .from(MODEL_TABLE)
      .select('id, model_name, provider, description')
      .eq('is_deleted', 'n')
      .eq('is_enabled', 'y')
      .order('model_name');

    if (error) throw error;

    res.json({ success: true, data: models || [] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch available models' });
  }
});

export default router;
