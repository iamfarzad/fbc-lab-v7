-- Add comment documenting new event types
COMMENT ON TABLE audit_log IS 'Audit log for compliance and monitoring. Event types: pii_detected, context_archived, pdf_generated, data_deleted, wal_recovery, redis_failure, agent_routed, agent_stage_transition, agent_execution';

-- Create index for agent events
CREATE INDEX IF NOT EXISTS idx_audit_agent_events ON audit_log(event) WHERE event IN ('agent_routed', 'agent_stage_transition', 'agent_execution');

-- Create view for agent analytics
CREATE OR REPLACE VIEW agent_analytics AS
SELECT 
  session_id,
  details->>'agent' as agent,
  details->>'stage' as stage,
  details->>'trigger' as trigger,
  details->'performance'->>'duration' as duration_ms,
  details->'performance'->>'success' as success,
  timestamp,
  event
FROM audit_log
WHERE event IN ('agent_routed', 'agent_execution')
ORDER BY timestamp DESC;

-- Grant access to authenticated users
GRANT SELECT ON agent_analytics TO authenticated;

