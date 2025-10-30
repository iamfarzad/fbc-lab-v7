-- Add version column for optimistic locking (no default to avoid table rewrite)
ALTER TABLE conversation_contexts 
  ADD COLUMN IF NOT EXISTS version INTEGER;

-- Set initial version for existing rows (backfill separately in a follow-up migration if needed)
-- For now, NULL is acceptable - will default to 0 in code

-- Add agent tracking fields (no defaults to avoid table rewrite)
ALTER TABLE conversation_contexts 
  ADD COLUMN IF NOT EXISTS last_agent TEXT,
  ADD COLUMN IF NOT EXISTS last_stage TEXT,
  ADD COLUMN IF NOT EXISTS event_id TEXT,
  ADD COLUMN IF NOT EXISTS analytics_pending BOOLEAN,
  ADD COLUMN IF NOT EXISTS conversation_flow JSONB,
  ADD COLUMN IF NOT EXISTS intelligence_context JSONB;

-- Create indexes CONCURRENTLY (no table lock)
-- Note: CONCURRENTLY requires separate statements
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_contexts_version 
  ON conversation_contexts(session_id, version);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_contexts_agent 
  ON conversation_contexts(last_agent, last_stage) 
  WHERE last_agent IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_contexts_events 
  ON conversation_contexts(event_id) 
  WHERE event_id IS NOT NULL;

-- Add unique constraint on event_id for idempotency
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_contexts_event_unique 
  ON conversation_contexts(event_id) 
  WHERE event_id IS NOT NULL;

-- Add index for analytics_pending queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_contexts_analytics_pending 
  ON conversation_contexts(analytics_pending) 
  WHERE analytics_pending = true;

