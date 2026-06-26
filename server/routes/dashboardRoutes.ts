import { Router } from 'express';

const router: Router = Router();

const LOGS_TABLE = 'ai_call_logs_s_7b4a6688_3';
const MODELS_TABLE = 'ai_model_configs_s_7b4a6688_3';

// Model pricing (per 1M tokens) for cost estimation
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 30, output: 60 },
  'gpt-4o': { input: 5, output: 15 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'gemini-pro': { input: 0.5, output: 1.5 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
};

function estimateCost(modelName: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[modelName.toLowerCase()] || { input: 1, output: 3 };
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

// GET /api/usage
router.get('/', async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = req.supabase
      .from(LOGS_TABLE)
      .select('*')
      .or(`corp_id.eq.${req.user.corp_id},corp_id.is.null`)
      .eq('is_deleted', 'n');

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data: logs, error } = await query;
    if (error) throw error;

    // Get model names
    const configIds = [...new Set((logs || []).map((l: any) => l.config_id))];
    let modelMap: Record<number, string> = {};
    if (configIds.length > 0) {
      const { data: models } = await req.supabase
        .from(MODELS_TABLE)
        .select('id, model_name')
        .in('id', configIds);
      modelMap = Object.fromEntries((models || []).map((m: any) => [m.id, m.model_name]));
    }

    // By model stats
    const byModelMap: Record<string, any> = {};
    (logs || []).forEach((log: any) => {
      const modelName = modelMap[log.config_id] || 'Unknown';
      if (!byModelMap[modelName]) {
        byModelMap[modelName] = {
          model_name: modelName,
          total_calls: 0,
          total_request_tokens: 0,
          total_response_tokens: 0,
          total_latency_ms: 0,
          estimated_cost: 0,
        };
      }
      byModelMap[modelName].total_calls += 1;
      byModelMap[modelName].total_request_tokens += log.request_tokens || 0;
      byModelMap[modelName].total_response_tokens += log.response_tokens || 0;
      byModelMap[modelName].total_latency_ms += log.latency_ms || 0;
      byModelMap[modelName].estimated_cost += estimateCost(
        modelName,
        log.request_tokens || 0,
        log.response_tokens || 0
      );
    });

    const by_model = Object.values(byModelMap).map((m: any) => ({
      ...m,
      avg_latency_ms: m.total_calls > 0 ? Math.round(m.total_latency_ms / m.total_calls) : 0,
      estimated_cost: Math.round(m.estimated_cost * 10000) / 10000,
    }));

    // By date stats
    const byDateMap: Record<string, any> = {};
    (logs || []).forEach((log: any) => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!byDateMap[date]) {
        byDateMap[date] = { date, total_calls: 0, total_tokens: 0, estimated_cost: 0 };
      }
      byDateMap[date].total_calls += 1;
      byDateMap[date].total_tokens += (log.request_tokens || 0) + (log.response_tokens || 0);
      const modelName = modelMap[log.config_id] || 'Unknown';
      byDateMap[date].estimated_cost += estimateCost(
        modelName,
        log.request_tokens || 0,
        log.response_tokens || 0
      );
    });

    const by_date = Object.values(byDateMap).sort((a: any, b: any) => a.date.localeCompare(b.date));

    // Summary
    const total_calls = logs?.length || 0;
    const total_request_tokens = (logs || []).reduce(
      (sum: number, l: any) => sum + (l.request_tokens || 0),
      0
    );
    const total_response_tokens = (logs || []).reduce(
      (sum: number, l: any) => sum + (l.response_tokens || 0),
      0
    );
    const total_tokens = total_request_tokens + total_response_tokens;
    const total_latency = (logs || []).reduce((sum: number, l: any) => sum + (l.latency_ms || 0), 0);
    const success_count = (logs || []).filter((l: any) => l.status === 'success').length;

    // Total estimated cost
    let total_estimated_cost = 0;
    (logs || []).forEach((l: any) => {
      const modelName = modelMap[l.config_id] || 'Unknown';
      total_estimated_cost += estimateCost(
        modelName,
        l.request_tokens || 0,
        l.response_tokens || 0
      );
    });

    res.json({
      success: true,
      data: {
        by_model,
        by_date,
        summary: {
          total_calls,
          total_tokens,
          total_request_tokens,
          total_response_tokens,
          avg_latency_ms: total_calls > 0 ? Math.round(total_latency / total_calls) : 0,
          success_rate: total_calls > 0 ? Math.round((success_count / total_calls) * 100) : 0,
          estimated_cost: Math.round(total_estimated_cost * 10000) / 10000,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch usage stats' });
  }
});

// GET /api/dashboard/stats
router.get('/stats', async (req: any, res) => {
  try {
    // Get all logs
    const { data: logs } = await req.supabase
      .from(LOGS_TABLE)
      .select('*')
      .or(`corp_id.eq.${req.user.corp_id},corp_id.is.null`)
      .eq('is_deleted', 'n');

    // Get all models
    const { data: models } = await req.supabase
      .from(MODELS_TABLE)
      .select('id, model_name, is_enabled')
      .or(`corp_id.eq.${req.user.corp_id},corp_id.is.null`)
      .eq('is_deleted', 'n');

    const modelMap: Record<number, string> = {};
    (models || []).forEach((m: any) => {
      modelMap[m.id] = m.model_name;
    });

    // Today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    // Total stats
    const total_calls = logs?.length || 0;
    const total_tokens = (logs || []).reduce(
      (sum: number, l: any) => sum + (l.request_tokens || 0) + (l.response_tokens || 0),
      0
    );
    const today_calls = (logs || []).filter((l: any) => l.created_at >= todayStr).length;
    const success_count = (logs || []).filter((l: any) => l.status === 'success').length;
    const success_rate = total_calls > 0 ? Math.round((success_count / total_calls) * 100) : 0;

    // Model distribution
    const modelCountMap: Record<string, number> = {};
    (logs || []).forEach((l: any) => {
      const name = modelMap[l.config_id] || 'Unknown';
      modelCountMap[name] = (modelCountMap[name] || 0) + 1;
    });

    const model_distribution = Object.entries(modelCountMap).map(([name, count]) => ({
      model_name: name,
      count,
      percentage: total_calls > 0 ? Math.round((count / total_calls) * 100) : 0,
    }));

    // Recent logs (last 10)
    const recent_logs = (logs || [])
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((l: any) => ({
        id: l.id,
        model_name: modelMap[l.config_id] || 'Unknown',
        status: l.status,
        latency_ms: l.latency_ms,
        created_at: l.created_at,
      }));

    // Health status
    const health_status = (models || []).map((m: any) => {
      const modelLogs = (logs || []).filter((l: any) => l.config_id === m.id);
      const lastCall = modelLogs.sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      let status = 'offline';
      if (m.is_enabled === 'y') {
        if (lastCall) {
          const hoursSinceLastCall =
            (Date.now() - new Date(lastCall.created_at).getTime()) / (1000 * 60 * 60);
          status = hoursSinceLastCall > 24 ? 'warning' : 'online';
        } else {
          status = 'warning';
        }
      }
      return {
        model_name: m.model_name,
        status,
        last_call_at: lastCall?.created_at || null,
      };
    });

    res.json({
      success: true,
      data: {
        total_calls,
        total_tokens,
        success_rate,
        today_calls,
        model_distribution,
        recent_logs,
        health_status,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch dashboard stats' });
  }
});

export default router;
