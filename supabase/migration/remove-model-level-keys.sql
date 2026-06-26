-- 1. 删除 ai_call_logs 表中的 key_id 字段
ALTER TABLE IF EXISTS ai_call_logs_s_7b4a6688_3 DROP COLUMN IF EXISTS key_id;

-- 2. 删除 proxy_call_logs 表中的 key_id 字段
ALTER TABLE IF EXISTS proxy_call_logs_s_7b4a6688_3 DROP COLUMN IF EXISTS key_id;

-- 3. 删除模型级密钥表
DROP TABLE IF EXISTS ai_api_keys_s_7b4a6688_3;
