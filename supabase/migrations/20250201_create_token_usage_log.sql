-- Token usage logging table for cost tracking and analytics
CREATE TABLE IF NOT EXISTS token_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id TEXT,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
  operation TEXT,
  is_tool BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_token_usage_session ON token_usage_log(session_id);
CREATE INDEX idx_token_usage_model ON token_usage_log(model);
CREATE INDEX idx_token_usage_timestamp ON token_usage_log(timestamp DESC);
CREATE INDEX idx_token_usage_user ON token_usage_log(user_id) WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE token_usage_log ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON token_usage_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admin read-only access
CREATE POLICY "Admin read" ON token_usage_log
  FOR SELECT TO authenticated
  USING (true);

