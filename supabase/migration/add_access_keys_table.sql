-- 创建平台访问密钥表（与模型 API Key 彻底分离）
CREATE TABLE IF NOT EXISTS public.ai_access_keys_s_7b4a6688_3 (
  id SERIAL PRIMARY KEY,
  corp_id VARCHAR(128),
  emp_id VARCHAR(128),
  key_name VARCHAR(128) NOT NULL,
  access_key VARCHAR(128) NOT NULL UNIQUE,
  key_prefix VARCHAR(16),
  description TEXT,
  is_enabled CHAR(1) DEFAULT 'y',
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  allowed_ips TEXT,
  rate_limit_per_minute INTEGER,
  is_deleted CHAR(1) DEFAULT 'n',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 为代理调用日志表增加 access_key_id 字段（用于追踪是哪个平台访问密钥发起的调用）
ALTER TABLE public.proxy_call_logs_s_7b4a6688_3 ADD COLUMN IF NOT EXISTS access_key_id INTEGER;
