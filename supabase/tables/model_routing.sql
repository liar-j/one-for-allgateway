-- 模型路由规则表
CREATE TABLE public.model_routing_rules_s_7b4a6688_3 (
  id SERIAL PRIMARY KEY,
  corp_id VARCHAR(128),
  emp_id VARCHAR(128),
  rule_name VARCHAR(128) NOT NULL,
  description TEXT,
  task_type VARCHAR(64) NOT NULL DEFAULT 'default',
  priority INTEGER DEFAULT 0,
  token_budget INTEGER,
  max_latency_ms INTEGER,
  fallback_config_id INTEGER,
  load_balance_strategy VARCHAR(32) DEFAULT 'round_robin',
  is_enabled CHAR(1) DEFAULT 'y',
  is_deleted CHAR(1) DEFAULT 'n',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 路由规则关联的模型配置表（多对多）
CREATE TABLE public.model_rule_configs_s_7b4a6688_3 (
  id SERIAL PRIMARY KEY,
  corp_id VARCHAR(128),
  emp_id VARCHAR(128),
  rule_id INTEGER NOT NULL,
  config_id INTEGER NOT NULL,
  weight INTEGER DEFAULT 1,
  is_primary CHAR(1) DEFAULT 'n',
  is_deleted CHAR(1) DEFAULT 'n',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 代理调用日志表（记录通过代理API的调用）
CREATE TABLE public.proxy_call_logs_s_7b4a6688_3 (
  id SERIAL PRIMARY KEY,
  corp_id VARCHAR(128),
  emp_id VARCHAR(128),
  rule_id INTEGER,
  config_id INTEGER NOT NULL,
  key_id INTEGER,
  request_tokens INTEGER,
  response_tokens INTEGER,
  status VARCHAR(32) NOT NULL,
  error_message TEXT,
  latency_ms INTEGER,
  task_type VARCHAR(64),
  original_model VARCHAR(128),
  routed_model VARCHAR(128),
  request_body TEXT,
  response_body TEXT,
  is_deleted CHAR(1) DEFAULT 'n',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
