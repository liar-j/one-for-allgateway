-- 允许匿名客户端只读访问 ai_access_keys 表（仅用于公开代理认证场景）
CREATE POLICY "anon_read_access_keys"
ON public.ai_access_keys_s_7b4a6688_3
FOR SELECT
TO anon
USING (true);
