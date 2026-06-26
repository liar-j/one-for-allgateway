import { Router } from 'express';

const router: Router = Router();

const LOGS_TABLE = 'ai_call_logs_s_7b4a6688_3';
const MODELS_TABLE = 'ai_model_configs_s_7b4a6688_3';

// GET /api/logs
router.get('/', async (req: any, res) => {
  try {
    const { page = 1, pageSize = 20, configId, status, startDate, endDate } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let query = req.supabase
      .from(LOGS_TABLE)
      .select('*', { count: 'exact' })
      .or(`corp_id.eq.${req.user.corp_id},corp_id.is.null`)
      .eq('is_deleted', 'n');

    if (configId) query = query.eq('config_id', configId);
    if (status) query = query.eq('status', status);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(pageSize) - 1);

    if (error) throw error;

    // Get model names
    const configIds = [...new Set((data || []).map((l: any) => l.config_id))];
    let modelMap: Record<number, string> = {};
    if (configIds.length > 0) {
      const { data: models } = await req.supabase
        .from(MODELS_TABLE)
        .select('id, model_name')
        .in('id', configIds);
      modelMap = Object.fromEntries((models || []).map((m: any) => [m.id, m.model_name]));
    }

    const list = (data || []).map((log: any) => ({
      ...log,
      model_name: modelMap[log.config_id] || 'Unknown',
    }));

    res.json({ success: true, data: { list, total: count || 0 } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch logs' });
  }
});

// GET /api/logs/:id
router.get('/:id', async (req: any, res) => {
  try {
    const { data, error } = await req.supabase
      .from(LOGS_TABLE)
      .select('*')
      .eq('id', req.params.id)
      .eq('corp_id', req.user.corp_id)
      .single();

    if (error) throw error;

    // Get model name
    if (data) {
      const { data: model } = await req.supabase
        .from(MODELS_TABLE)
        .select('model_name')
        .eq('id', data.config_id)
        .single();
      (data as any).model_name = model?.model_name || 'Unknown';
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch log' });
  }
});

export default router;
