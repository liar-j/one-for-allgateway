-- 删除厂商密钥表
DROP TABLE IF EXISTS ai_vendor_api_keys_s_7b4a6688_3;

-- 给模型配置表新增 api_key 和 auth_type 字段
ALTER TABLE ai_model_configs_s_7b4a6688_3
ADD COLUMN IF NOT EXISTS api_key TEXT,
ADD COLUMN IF NOT EXISTS auth_type VARCHAR(20) DEFAULT 'bearer';

-- 删除 vendor_key_id 字段
ALTER TABLE ai_model_configs_s_7b4a6688_3
DROP COLUMN IF EXISTS vendor_key_id;
