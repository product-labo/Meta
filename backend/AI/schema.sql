CREATE TABLE IF NOT EXISTS ai_analyses (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL,
  objective text,
  model text,
  summary text,
  tags jsonb,
  meta jsonb,
  source text
);
 
