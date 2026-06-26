-- 为 ai_access_keys 表添加 RLS 策略

-- 启用 RLS
ALTER TABLE IF EXISTS public.ai_access_keys_s_7b4a6688_3 ENABLE ROW LEVEL SECURITY;

-- 使用 DO 块创建策略（避免重复创建报错）
DO $$
BEGIN
  -- SELECT 策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_access_keys_s_7b4a6688_3' 
    AND policyname = 'Users can view their corp''s access keys'
  ) THEN
    CREATE POLICY "Users can view their corp's access keys"
      ON public.ai_access_keys_s_7b4a6688_3
      FOR SELECT
      USING (corp_id = current_setting('request.jwt.claims', true)::json->>'corp_id' OR corp_id IS NULL);
  END IF;

  -- INSERT 策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_access_keys_s_7b4a6688_3' 
    AND policyname = 'Backend can insert access keys'
  ) THEN
    CREATE POLICY "Backend can insert access keys"
      ON public.ai_access_keys_s_7b4a6688_3
      FOR INSERT
      WITH CHECK (true);
  END IF;

  -- UPDATE 策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_access_keys_s_7b4a6688_3' 
    AND policyname = 'Users can update their corp''s access keys'
  ) THEN
    CREATE POLICY "Users can update their corp's access keys"
      ON public.ai_access_keys_s_7b4a6688_3
      FOR UPDATE
      USING (corp_id = current_setting('request.jwt.claims', true)::json->>'corp_id' OR corp_id IS NULL);
  END IF;

  -- DELETE 策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_access_keys_s_7b4a6688_3' 
    AND policyname = 'Users can delete their corp''s access keys'
  ) THEN
    CREATE POLICY "Users can delete their corp's access keys"
      ON public.ai_access_keys_s_7b4a6688_3
      FOR DELETE
      USING (corp_id = current_setting('request.jwt.claims', true)::json->>'corp_id' OR corp_id IS NULL);
  END IF;
END $$;
