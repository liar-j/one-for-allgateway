import { Router, Request, Response } from 'express';

const router: Router = Router();

const TABLE_NAME = 'ai_vendor_api_keys_s_7b4a6688_3';

// GET /api/vendor-api-keys
router.get('/', async (req: any, res: Response) => {
  try {
    const { page = 1, pageSize = 20, vendor = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let query = req.supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact' })
      .or(`corp_id.eq.${req.user.corp_id},corp_id.is.null`)
      .eq('is_deleted', 'n');

    if (vendor) {
      query = query.eq('vendor', vendor);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(pageSize) - 1);

    if (error) throw error;

    // 脱敏处理 api_key 字段
    const list = (data || []).map((key: any) => ({
      ...key,
      api_key_masked: key.api_key ? maskKey(key.api_key) : null,
    }));

    res.json({ success: true, data: { list, total: count || 0 } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch vendor API keys' });
  }
});

// POST /api/vendor-api-keys
router.post('/', async (req: any, res: Response) => {
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
    res.status(500).json({ success: false, error: error.message || 'Failed to create vendor API key' });
  }
});

// PUT /api/vendor-api-keys/:id
router.put('/:id', async (req: any, res: Response) => {
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
    res.status(500).json({ success: false, error: error.message || 'Failed to update vendor API key' });
  }
});

// DELETE /api/vendor-api-keys/:id
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const { error } = await req.supabase
      .from(TABLE_NAME)
      .update({ is_deleted: 'y' })
      .eq('id', req.params.id)
      .eq('corp_id', req.user.corp_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete vendor API key' });
  }
});

// POST /api/vendor-api-keys/:id/copy - 复制厂商API密钥
router.post('/:id/copy', async (req: any, res) => {
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
