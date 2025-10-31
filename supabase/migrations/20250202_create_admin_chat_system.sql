-- Admin Chat System Migration
-- Creates tables, RPC functions, and indexes for admin chat persistence

-- =============================================================================
-- SCHEMA: admin
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS admin;

-- =============================================================================
-- ENUM: message_type_enum
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE admin.message_type_enum AS ENUM ('user', 'assistant', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- TABLE: admin.admin_sessions
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin.admin_sessions (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    session_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMPTZ DEFAULT now(),
    context_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now()  -- ADDED: Missing field
);

-- =============================================================================
-- TABLE: admin.admin_conversations
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin.admin_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id TEXT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    admin_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    message_type admin.message_type_enum NOT NULL,
    message_content TEXT NOT NULL,
    message_metadata JSONB,  -- ADDED: Missing field
    embeddings TEXT NOT NULL DEFAULT '[]',
    context_leads TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin.admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_last_activity ON admin.admin_sessions(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_is_active ON admin.admin_sessions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_admin_conversations_session_id ON admin.admin_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_admin_id ON admin.admin_conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_created_at ON admin.admin_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_conversation_id ON admin.admin_conversations(conversation_id);

-- =============================================================================
-- RPC FUNCTION: search_admin_conversations
-- Semantic search using text embeddings (vector similarity)
-- =============================================================================

-- Drop existing function if it exists (in case signature changed)
DROP FUNCTION IF EXISTS admin.search_admin_conversations(TEXT, TEXT, INT, FLOAT);
DROP FUNCTION IF EXISTS admin.search_admin_conversations(TEXT, TEXT, INT);
DROP FUNCTION IF EXISTS admin.search_admin_conversations(TEXT, TEXT);
DROP FUNCTION IF EXISTS admin.search_admin_conversations(TEXT);

CREATE OR REPLACE FUNCTION admin.search_admin_conversations(
    p_query TEXT,
    p_session_id TEXT DEFAULT '',
    p_limit INT DEFAULT 10,
    p_thresh FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    conversation_id TEXT,
    admin_id TEXT,
    session_id TEXT,
    message_type admin.message_type_enum,
    message_content TEXT,
    embeddings TEXT,
    context_leads TEXT[],
    created_at TIMESTAMPTZ,
    distance FLOAT
) AS $$
BEGIN
    -- Note: This is a placeholder for semantic search
    -- In production, you would use pgvector extension with cosine similarity
    -- For now, return text-based matches with basic scoring
    
    RETURN QUERY
    SELECT 
        ac.id,
        ac.conversation_id,
        ac.admin_id,
        ac.session_id,
        ac.message_type,
        ac.message_content,
        ac.embeddings,
        ac.context_leads,
        ac.created_at,
        0.5::FLOAT as distance  -- Placeholder distance
    FROM admin.admin_conversations ac
    WHERE 
        (p_session_id = '' OR ac.session_id = p_session_id)
        AND ac.message_content ILIKE '%' || p_query || '%'
    ORDER BY ac.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE admin.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.admin_conversations ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$ BEGIN
    CREATE POLICY "Service role full access admin_sessions" ON admin.admin_sessions
        FOR ALL TO service_role
        USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Service role full access admin_conversations" ON admin.admin_conversations
        FOR ALL TO service_role
        USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Admin read-only access (authenticated users)
DO $$ BEGIN
    CREATE POLICY "Admin read admin_sessions" ON admin.admin_sessions
        FOR SELECT TO authenticated
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Admin read admin_conversations" ON admin.admin_conversations
        FOR SELECT TO authenticated
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON SCHEMA admin IS 'Admin-specific tables for internal analytics and chat';
COMMENT ON TABLE admin.admin_sessions IS 'Admin chat sessions with persistence';
COMMENT ON TABLE admin.admin_conversations IS 'Admin chat messages with embeddings for semantic search';
COMMENT ON FUNCTION admin.search_admin_conversations IS 'Semantic search across admin conversations using text embeddings';

