CREATE TABLE public.ai_vendor_api_keys_s_7b4a6688_3 (
  id SERIAL PRIMARY KEY,
  corp_id VARCHAR(128),
  emp_id VARCHAR(128),
  vendor VARCHAR(64) NOT NULL,
  key_name VARCHAR(128) NOT NULL,
  api_key TEXT NOT NULL,
  is_enabled CHAR(1) DEFAULT 'y',
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  description TEXT,
  is_deleted CHAR(1) DEFAULT 'n',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
