import { Router } from 'express';
import crypto from 'crypto';

const router: Router = Router();

const ACCESS_KEY_TABLE = 'ai_access_keys_s_7b4a6688_3';

/**
 * 生成安全的平台访问密钥
 * 格式：amg_<timestamp>_<random_hex>
 */
function generateAccessKey(): { accessKey: string; prefix: string } {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(16).toString('hex');
  const accessKey = `amg_${timestamp}_${random}`;
  const prefix = `amg_${timestamp}`;
  return { accessKey, prefix };
}

// GET /api/access-keys
router.get('/', async (req: any, res) => {
  try {
    const { page = 1, pageSize = 20, keyword } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let query = req.supabase
      .from(ACCESS_KEY_TABLE)
      .select('*', { count: 'exact' })
      .or(`corp_id.eq.${req.user.corp_id},corp_id.is.null`)
      .eq('is_deleted', 'n');

    if (keyword) {
      query = query.ilike('key_name', `%${keyword}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(pageSize) - 1);

    if (error) throw error;

    const list = (data || []).map((key: any) => ({
      ...key,
      access_key_masked: maskKey(key.access_key),
    }));

    res.json({ success: true, data: { list, total: count || 0 } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch access keys' });
  }
});

// POST /api/access-keys
router.post('/', async (req: any, res) => {
  try {
    const { key_name, description, expires_at, allowed_ips, rate_limit_per_minute } = req.body;

    const { accessKey, prefix } = generateAccessKey();

    const { data, error } = await req.supabase
      .from(ACCESS_KEY_TABLE)
      .insert([{
        key_name,
        access_key: accessKey,
        key_prefix: prefix,
        description: description || null,
        expires_at: expires_at || null,
        allowed_ips: allowed_ips || null,
        rate_limit_per_minute: rate_limit_per_minute || null,
        corp_id: req.user.corp_id,
        emp_id: req.user.emp_id,
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create access key' });
  }
});

// PUT /api/access-keys/:id
router.put('/:id', async (req: any, res) => {
  try {
    const { key_name, description, is_enabled, expires_at, allowed_ips, rate_limit_per_minute } = req.body;

    const updateData: any = {};
    if (key_name !== undefined) updateData.key_name = key_name;
    if (description !== undefined) updateData.description = description;
    if (is_enabled !== undefined) updateData.is_enabled = is_enabled;
    if (expires_at !== undefined) updateData.expires_at = expires_at;
    if (allowed_ips !== undefined) updateData.allowed_ips = allowed_ips;
    if (rate_limit_per_minute !== undefined) updateData.rate_limit_per_minute = rate_limit_per_minute;

    const { data, error } = await req.supabase
      .from(ACCESS_KEY_TABLE)
      .update(updateData)
      .eq('id', req.params.id)
      .eq('corp_id', req.user.corp_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update access key' });
  }
});

// DELETE /api/access-keys/:id
router.delete('/:id', async (req: any, res) => {
  try {
    const { error } = await req.supabase
      .from(ACCESS_KEY_TABLE)
      .update({ is_deleted: 'y' })
      .eq('id', req.params.id)
      .eq('corp_id', req.user.corp_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete access key' });
  }
});

// POST /api/access-keys/:id/copy
router.post('/:id/copy', async (req: any, res) => {
  try {
    const { data, error } = await req.supabase
      .from(ACCESS_KEY_TABLE)
      .select('access_key')
      .eq('id', req.params.id)
      .eq('corp_id', req.user.corp_id)
      .single();

    if (error) throw error;
    res.json({ success: true, data: { access_key: data?.access_key || '' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to copy access key' });
  }
});

// POST /api/access-keys/:id/regenerate
router.post('/:id/regenerate', async (req: any, res) => {
  try {
    const { accessKey, prefix } = generateAccessKey();

    const { data, error } = await req.supabase
      .from(ACCESS_KEY_TABLE)
      .update({ access_key: accessKey, key_prefix: prefix })
      .eq('id', req.params.id)
      .eq('corp_id', req.user.corp_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to regenerate access key' });
  }
});

function maskKey(key: string): string {
  if (!key || key.length < 10) return '***';
  return key.slice(0, 10) + '••••••••••••••••' + key.slice(-4);
}

export default router;
