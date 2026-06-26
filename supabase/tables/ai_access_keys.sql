-- 平台访问密钥表（用于外部系统如 OpenClaw 访问本平台代理 API）
-- 与模型 API Key（ai_api_keys）彻底分离，模型 Key 仅用于调用外部大模型

CREATE TABLE public.ai_access_keys_s_7b4a6688_3 (
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
