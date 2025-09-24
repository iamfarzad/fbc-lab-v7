import { getSupabaseService } from '@/src/lib/supabase';

export async function upsertEmbeddings(sessionId: string, kind: string, texts: string[], vectors: number[][]) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return
  const supabase = getSupabaseService();
  const rows = texts.map((t, i) => ({ session_id: sessionId, kind, text: t, embedding: vectors[i] }))
  await supabase.from('documents_embeddings').insert(rows)
}

export async function queryTopK(sessionId: string, queryVector: number[], k = 5) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return []
  const supabase = getSupabaseService();
  // Note: pgvector cosine distance; requires proper index in prod
  const { data, error } = await supabase.rpc('match_documents', { p_session_id: sessionId, p_query: queryVector, p_match_count: k })
  if (error) return []
  return data || []
}


