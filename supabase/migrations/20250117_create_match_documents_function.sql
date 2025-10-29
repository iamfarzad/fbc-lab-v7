-- Create match_documents RPC function for vector similarity search
-- This function searches documents_embeddings table for semantically similar content
-- Returns: id, text, similarity (0-1 where 1 is most similar), kind, created_at

CREATE OR REPLACE FUNCTION match_documents(
  p_session_id TEXT,
  p_query vector(1536),
  p_match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  text TEXT,
  similarity FLOAT,
  kind TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    de.id,
    de.text,
    1 - (de.embedding <=> p_query) AS similarity,  -- Convert distance to similarity (1 - distance)
    de.kind,
    de.created_at
  FROM documents_embeddings de
  WHERE de.session_id = p_session_id
  ORDER BY de.embedding <=> p_query  -- Cosine distance (ascending = most similar)
  LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql;

-- Create vector index for cosine similarity search (if not exists)
-- This significantly improves query performance for vector searches
-- Using IVFFlat index which is optimized for approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS documents_embeddings_embedding_idx 
ON documents_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add comment to function for documentation
COMMENT ON FUNCTION match_documents IS 'Searches for semantically similar documents using cosine similarity. Returns top k matches with similarity scores.';

