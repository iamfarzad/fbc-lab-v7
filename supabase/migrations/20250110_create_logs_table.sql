-- Logs table for production monitoring
CREATE TABLE IF NOT EXISTS logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  level text NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_service ON logs(service);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_service_level ON logs(service, level);

-- Auto-cleanup: Delete logs older than 7 days
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM logs WHERE timestamp < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;

-- Note: Cron extension needs to be enabled manually in Supabase dashboard
-- Then run: SELECT cron.schedule('cleanup-logs', '0 0 * * *', 'SELECT cleanup_old_logs()');

-- Enable RLS
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert/select (backend)
CREATE POLICY "Service role full access" ON logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read (admin dashboard)
CREATE POLICY "Authenticated read" ON logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Comment with instructions
COMMENT ON TABLE logs IS 'Production log aggregation table. Auto-deletes entries older than 7 days.';

