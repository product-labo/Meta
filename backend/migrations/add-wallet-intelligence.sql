-- Add Wallet Intelligence metrics to project_metrics
ALTER TABLE public.project_metrics
ADD COLUMN IF NOT EXISTS competitor_data jsonb DEFAULT '{}', -- Store "App Comparison" data
ADD COLUMN IF NOT EXISTS bridge_metrics jsonb DEFAULT '{}', -- Store "Funds Coming In/Leaving"
ADD COLUMN IF NOT EXISTS activity_metrics jsonb DEFAULT '{}'; -- Store "Activity Inside/Outside App"
