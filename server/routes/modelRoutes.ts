import { Router } from 'express';

const router: Router = Router();

const TABLE_NAME = 'ai_model_configs_s_7b4a6688_3';

// GET /api/models
router.get('/', async (req: any, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let query = req.supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact' })
      .or(`corp_id.eq.${req.user.corp_id},corp_id.is.null`)
      .eq('is_deleted', 'n');

    if (keyword) {
      query = query.ilike('model_name', `%${keyword}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(pageSize) - 1);

    if (error) throw error;

    // 脱敏处理 api_key 字段
    const list = (data || []).map((model: any) => ({
      ...model,
      api_key_masked: model.api_key ? maskKey(model.api_key) : null,
    }));

    res.json({ success: true, data: { list, total: count || 0 } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch models' });
  }
});

// GET /api/models/all - get all models for dropdown
router.get('/all', async (req: any, res) => {
  try {
    const { data, error } = await req.supabase
      .from(TABLE_NAME)
      .select('id, model_name, provider')
      .or(`corp_id.eq.${req.user.corp_id},corp_id.is.null`)
      .eq('is_deleted', 'n')
      .eq('is_enabled', 'y')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch models' });
  }
});

// POST /api/models
router.post('/', async (req: any, res) => {
  try {
    const { data, error } = await req.supabase
      .from(TABLE_NAME)
      .insert([{
        ...req.body,
        corp_id: req.user.corp_id,
        emp_id: req.user.emp_id,
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create model' });
  }
});

// PUT /api/models/:id
router.put('/:id', async (req: any, res) => {
  try {
    const { data, error } = await req.supabase
      .from(TABLE_NAME)
      .update(req.body)
      .eq('id', req.params.id)
      .eq('corp_id', req.user.corp_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update model' });
  }
});

// DELETE /api/models/:id
router.delete('/:id', async (req: any, res) => {
  try {
    const { error } = await req.supabase
      .from(TABLE_NAME)
      .update({ is_deleted: 'y' })
      .eq('id', req.params.id)
      .eq('corp_id', req.user.corp_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete model' });
  }
});

// POST /api/models/batch - batch create models
router.post('/batch', async (req: any, res) => {
  try {
    const { models } = req.body; // Array of { model_name, provider, api_endpoint, default_max_tokens, default_temperature, api_key, auth_type }
    if (!Array.isArray(models) || models.length === 0) {
      return res.status(400).json({ success: false, error: 'models array is required' });
    }

    const created: any[] = [];

    for (const model of models) {
      const { data, error } = await req.supabase
        .from(TABLE_NAME)
        .insert([{
          ...model,
          corp_id: req.user.corp_id,
          emp_id: req.user.emp_id,
        }])
        .select()
        .single();

      if (error) throw error;
      created.push(data);
    }

    res.json({ success: true, data: { created_count: created.length, models: created } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to batch create models' });
  }
});

// POST /api/models/:id/test
router.post('/:id/test', async (req: any, res) => {
  try {
    const { data: model } = await req.supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', req.params.id)
      .eq('corp_id', req.user.corp_id)
      .single();

    if (!model) {
      return res.json({ success: false, error: 'Model not found' });
    }

    // 检查模型是否配置了 API Key
    if (!model.api_key) {
      return res.json({
        success: false,
        error: 'No API key configured for this model. Please configure the API key first.',
      });
    }

    const provider = model.provider.toLowerCase();
    const rawEndpoint = model.api_endpoint.trim().replace(/\/+$/, '');
    const apiKey = model.api_key;
    const authType = model.auth_type || 'bearer';

    const startTime = Date.now();
    let response: Response;
    let responseData: any;
    let testedUrl = '';

    // 智能构建测试 URL
    function buildTestUrl(path: string): string {
      // 如果端点已包含目标路径，直接使用端点
      if (rawEndpoint.endsWith(path)) return rawEndpoint;
      // 如果端点以 /v1 结尾，追加路径
      if (rawEndpoint.endsWith('/v1')) return `${rawEndpoint}${path}`;
      // 如果端点不包含 /v1，追加 /v1 + 路径
      if (!rawEndpoint.includes('/v1')) return `${rawEndpoint}/v1${path}`;
      // 否则直接拼接
      return `${rawEndpoint}${path}`;
    }

    // 根据 auth_type 构建认证头
    function buildAuthHeaders(): Record<string, string> {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authType === 'bearer') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (authType === 'x-api-key') {
        headers['x-api-key'] = apiKey;
      }
      
      return headers;
    }

    if (provider === 'anthropic') {
      const isOpenAICompatible = rawEndpoint.includes('/openai/');

      if (isOpenAICompatible) {
        const url = buildTestUrl('/chat/completions');
        console.log(`[Test] Anthropic OpenAI-compatible URL: ${url}`);
        response = await fetch(url, {
          method: 'POST',
          headers: buildAuthHeaders(),
          body: JSON.stringify({
            model: model.model_name,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1,
          }),
        });
        testedUrl = url;
      } else {
        const url = buildTestUrl('/messages');
        console.log(`[Test] Anthropic native URL: ${url}`);
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            model: model.model_name,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1,
          }),
        });
        testedUrl = url;
      }
      responseData = await response.json();
    } else {
      // OpenAI compatible format (OpenAI, Google Gemini, DeepSeek, etc.)
      const url = buildTestUrl('/chat/completions');
      console.log(`[Test] OpenAI-compatible URL: ${url}`);
      response = await fetch(url, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          model: model.model_name,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      });
      testedUrl = url;
      responseData = await response.json();
    }

    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      res.json({
        success: true,
        data: {
          connected: true,
          message: `Connection successful (${latencyMs}ms)`,
          latency_ms: latencyMs,
        },
      });
    } else {
      const errorMsg = responseData?.error?.message || responseData?.message || responseData?.error || `HTTP ${response.status}`;
      res.json({
        success: false,
        error: `Connection failed: ${errorMsg}`,
        debug_url: testedUrl,
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to test connection' });
  }
});

// POST /api/models/:id/copy-key - 复制模型的 API Key
router.post('/:id/copy-key', async (req: any, res) => {
  try {
    const { data, error } = await req.supabase
      .from(TABLE_NAME)
      .select('api_key')
      .eq('id', req.params.id)
      .eq('corp_id', req.user.corp_id)
      .single();

    if (error) throw error;
    res.json({ success: true, data: { api_key: data?.api_key || '' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to copy API key' });
  }
});

function maskKey(key: string): string {
  if (!key || key.length < 10) return '***';
  return key.slice(0, 6) + '••••••••' + key.slice(-4);
}

export default router;
