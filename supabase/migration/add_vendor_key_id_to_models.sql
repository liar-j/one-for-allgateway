-- Add vendor_key_id to ai_model_configs to link models to vendor-level API keys
ALTER TABLE public.ai_model_configs_s_7b4a6688_3
ADD COLUMN IF NOT EXISTS vendor_key_id INTEGER;

-- Drop the old ai_api_keys table since we're merging into vendor-level keys
-- First, migrate existing data: if a model has keys, we'll handle them in the UI
-- For now, just add the column and keep the old table for backward compatibility
