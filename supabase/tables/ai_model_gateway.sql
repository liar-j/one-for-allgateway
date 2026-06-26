CREATE TABLE public.ai_model_configs_s_7b4a6688_3 (
  id SERIAL PRIMARY KEY,
  corp_id VARCHAR(128),
  emp_id VARCHAR(128),
  model_name VARCHAR(128) NOT NULL,
  provider VARCHAR(64) NOT NULL,
  api_endpoint TEXT NOT NULL,
  default_max_tokens INTEGER,
  default_temperature DECIMAL(3,2),
  is_enabled CHAR(1) DEFAULT 'y',
  description TEXT,
  is_deleted CHAR(1) DEFAULT 'n',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.ai_api_keys_s_7b4a6688_3 (
  id SERIAL PRIMARY KEY,
  corp_id VARCHAR(128),
  emp_id VARCHAR(128),
  config_id INTEGER NOT NULL,
  key_name VARCHAR(128) NOT NULL,
  api_key TEXT NOT NULL,
  is_enabled CHAR(1) DEFAULT 'y',
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  is_deleted CHAR(1) DEFAULT 'n',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.ai_call_logs_s_7b4a6688_3 (
  id SERIAL PRIMARY KEY,
  corp_id VARCHAR(128),
  emp_id VARCHAR(128),
  config_id INTEGER NOT NULL,
  key_id INTEGER,
  request_tokens INTEGER,
  response_tokens INTEGER,
  status VARCHAR(32) NOT NULL,
  error_message TEXT,
  latency_ms INTEGER,
  request_body TEXT,
  response_body TEXT,
  is_deleted CHAR(1) DEFAULT 'n',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
