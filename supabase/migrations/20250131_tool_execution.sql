-- Add tool_executed event type and index
-- This migration extends the audit_log table to support tool execution tracking

-- Add comment documenting tool_executed event type
COMMENT ON TABLE audit_log IS 'Audit log for compliance and monitoring. Event types: pii_detected, context_archived, pdf_generated, data_deleted, wal_recovery, redis_failure, agent_routed, agent_stage_transition, agent_execution, tool_executed';

-- Create index for tool execution events
CREATE INDEX IF NOT EXISTS idx_audit_tool_events ON audit_log(event) WHERE event = 'tool_executed';

-- Create index for tool execution performance queries (queries by tool name and success)
CREATE INDEX IF NOT EXISTS idx_audit_tool_details ON audit_log USING GIN ((details->'toolName')) WHERE event = 'tool_executed';

