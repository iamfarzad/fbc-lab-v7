-- Write-Ahead Log table for data reliability
CREATE TABLE IF NOT EXISTS wal_log (
  id UUID PRIMARY KEY,
  session_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('add_text', 'add_voice', 'add_visual', 'add_upload')),
  payload JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wal_session ON wal_log(session_id);
CREATE INDEX idx_wal_timestamp ON wal_log(timestamp DESC);

-- Auto-cleanup: Delete WAL entries older than 7 days
CREATE OR REPLACE FUNCTION cleanup_old_wal()
RETURNS void AS $$
BEGIN
  DELETE FROM wal_log WHERE timestamp < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE wal_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON wal_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

