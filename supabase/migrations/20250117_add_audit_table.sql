-- Audit log table for compliance (GDPR, SOC2)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  event TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_session ON audit_log(session_id);
CREATE INDEX idx_audit_event ON audit_log(event);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);

-- Auto-cleanup: Keep audit logs for 90 days (compliance requirement)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_log WHERE timestamp < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON audit_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admin read-only access
CREATE POLICY "Admin read" ON audit_log
  FOR SELECT TO authenticated
  USING (true);

