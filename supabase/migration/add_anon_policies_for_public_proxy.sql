-- 允许匿名客户端只读访问公开代理路由所需的表（仅用于公开代理认证场景）

-- 模型配置表（路由引擎需要查询模型信息）
CREATE POLICY "anon_read_model_configs"
ON public.ai_model_configs_s_7b4a6688_3
FOR SELECT
TO anon
USING (true);

-- 模型 API 密钥表（路由引擎需要查询模型密钥用于调用外部大模型）
CREATE POLICY "anon_read_model_api_keys"
ON public.ai_api_keys_s_7b4a6688_3
FOR SELECT
TO anon
USING (true);

-- 路由规则表（路由引擎需要查询路由规则）
CREATE POLICY "anon_read_routing_rules"
ON public.model_routing_rules_s_7b4a6688_3
FOR SELECT
TO anon
USING (true);

-- 规则-模型关联表（路由引擎需要查询规则与模型的关联关系）
CREATE POLICY "anon_read_rule_configs"
ON public.model_rule_configs_s_7b4a6688_3
FOR SELECT
TO anon
USING (true);

-- 代理调用日志表（公开代理路由需要写入日志，anon 需要 INSERT 权限）
CREATE POLICY "anon_insert_proxy_logs"
ON public.proxy_call_logs_s_7b4a6688_3
FOR INSERT
TO anon
WITH CHECK (true);

-- 平台访问密钥表（允许 anon 读取用于认证）
CREATE POLICY "anon_update_access_keys"
ON public.ai_access_keys_s_7b4a6688_3
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- 模型 API 密钥表（允许 anon 更新使用次数）
CREATE POLICY "anon_update_model_api_keys"
ON public.ai_api_keys_s_7b4a6688_3
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
