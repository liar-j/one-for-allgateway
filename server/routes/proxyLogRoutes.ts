import { Router } from 'express';

const router: Router = Router();

const PROXY_LOG_TABLE = 'proxy_call_logs_s_7b4a6688_3';
const MODEL_TABLE = 'ai_model_configs_s_7b4a6688_3';
const RULE_TABLE = 'model_routing_rules_s_7b4a6688_3';

// GET /api/proxy-logs
router.get('/', async (req: any, res) => {
  try {
    const { page = 1, pageSize = 20, configId, taskType, status, startDate, endDate } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let query = req.supabase
      .from(PROXY_LOG_TABLE)
      .select('*', { count: 'exact' })
      .eq('corp_id', req.user.corp_id)
      .eq('is_deleted', 'n');

    if (configId && configId !== 'all') {
      query = query.eq('config_id', Number(configId));
    }
    if (taskType && taskType !== 'all') {
      query = query.eq('task_type', taskType);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(pageSize) - 1);

    if (error) throw error;

    // 获取模型名称和路由规则名称
    const logsWithDetails = await Promise.all(
      (data || []).map(async (log: any) => {
        // 获取模型名称
        const { data: model } = await req.supabase
          .from(MODEL_TABLE)
          .select('model_name')
          .eq('id', log.config_id)
          .single();

        // 获取路由规则名称和策略
        let ruleName: string | null = null;
        let loadBalanceStrategy: string | null = null;
        if (log.rule_id) {
          const { data: rule } = await req.supabase
            .from(RULE_TABLE)
            .select('rule_name, load_balance_strategy')
            .eq('id', log.rule_id)
            .single();
          ruleName = rule?.rule_name || null;
          loadBalanceStrategy = rule?.load_balance_strategy || null;
        }

        return {
          ...log,
          model_name: model?.model_name || null,
          rule_name: ruleName,
          load_balance_strategy: loadBalanceStrategy,
        };
      })
    );

    res.json({ success: true, data: { list: logsWithDetails, total: count || 0 } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch proxy logs' });
  }
});

// GET /api/proxy-logs/:id
router.get('/:id', async (req: any, res) => {
  try {
    const { data: log, error } = await req.supabase
      .from(PROXY_LOG_TABLE)
      .select('*')
      .eq('id', req.params.id)
      .eq('corp_id', req.user.corp_id)
      .eq('is_deleted', 'n')
      .single();

    if (error) throw error;
    if (!log) {
      return res.status(404).json({ success: false, error: 'Log not found' });
    }

    // 获取模型名称
    const { data: model } = await req.supabase
      .from(MODEL_TABLE)
      .select('model_name')
      .eq('id', log.config_id)
      .single();

    // 获取路由规则名称和策略
    let ruleName: string | null = null;
    let loadBalanceStrategy: string | null = null;
    if (log.rule_id) {
      const { data: rule } = await req.supabase
        .from(RULE_TABLE)
        .select('rule_name, load_balance_strategy')
        .eq('id', log.rule_id)
        .single();
      ruleName = rule?.rule_name || null;
      loadBalanceStrategy = rule?.load_balance_strategy || null;
    }

    res.json({
      success: true,
      data: {
        ...log,
        model_name: model?.model_name || null,
        rule_name: ruleName,
        load_balance_strategy: loadBalanceStrategy,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch proxy log' });
  }
});

export default router;
