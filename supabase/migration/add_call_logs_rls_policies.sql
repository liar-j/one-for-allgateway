-- 为 ai_call_logs 表添加 RLS 策略
-- 允许 corp_id 匹配的用户查询和插入

-- 启用 RLS（如果尚未启用）
ALTER TABLE public.ai_call_logs_s_7b4a6688_3 ENABLE ROW LEVEL SECURITY;

-- 允许用户查询自己企业的日志
CREATE POLICY "Users can view their corp's call logs"
  ON public.ai_call_logs_s_7b4a6688_3
  FOR SELECT
  USING (
    corp_id = current_setting('request.jwt.claims', true)::json->>'corp_id'
    OR corp_id IS NULL
  );

-- 允许后端插入日志记录
CREATE POLICY "Backend can insert call logs"
  ON public.ai_call_logs_s_7b4a6688_3
  FOR INSERT
  WITH CHECK (true);

-- 允许用户更新自己企业的日志（用于逻辑删除等）
CREATE POLICY "Users can update their corp's call logs"
  ON public.ai_call_logs_s_7b4a6688_3
  FOR UPDATE
  USING (
    corp_id = current_setting('request.jwt.claims', true)::json->>'corp_id'
    OR corp_id IS NULL
  );
