import { getSupabaseService } from '@/src/lib/supabase';

// Cache validation result to avoid repeated checks
let setupValidated: boolean | null = null
let setupValidationAttempted = false

/**
 * Validates that Supabase embeddings setup is complete
 * Checks: env vars, client availability, table existence, RPC function existence
 * Caches result to avoid repeated validation checks
 */
export async function validateSupabaseEmbeddingsSetup(): Promise<boolean> {
  if (setupValidationAttempted) {
    return setupValidated === true
  }
  
  setupValidationAttempted = true
  
  // Check env vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ [Embeddings] Supabase env vars not configured. Vector search disabled.')
    setupValidated = false
    return false
  }
  
  const supabase = getSupabaseService()
  if (!supabase) {
    console.warn('⚠️ [Embeddings] Supabase client unavailable. Vector search disabled.')
    setupValidated = false
    return false
  }
  
  // Test table exists
  try {
    const { error: tableError } = await supabase
      .from('documents_embeddings')
      .select('id')
      .limit(1)
    
    if (tableError && tableError.code === '42P01') {
      console.error('❌ [Embeddings] documents_embeddings table does not exist. Run migration first.')
      setupValidated = false
      return false
    }
    
    if (tableError && tableError.code !== 'PGRST116') {
      // PGRST116 is just "no rows" which is fine, other errors are concerning
      console.warn('⚠️ [Embeddings] Could not validate documents_embeddings table:', tableError.message)
    }
  } catch (err) {
    console.warn('⚠️ [Embeddings] Could not validate documents_embeddings table:', err)
  }
  
  // Test RPC function exists
  try {
    const dummyVector = Array(1536).fill(0)
    const { error: rpcError } = await supabase.rpc('match_documents', {
      p_session_id: 'validation-test',
      p_query: dummyVector,
      p_match_count: 1
    })
    
    if (rpcError && rpcError.code === '42883') {
      console.error('❌ [Embeddings] match_documents RPC function does not exist. Run migration first.')
      console.error('   Migration file: supabase/migrations/20250117_create_match_documents_function.sql')
      setupValidated = false
      return false
    }
    
    // Other RPC errors (like no rows) are fine - function exists
    if (rpcError && rpcError.code !== 'PGRST116' && !rpcError.message.includes('validation-test')) {
      console.warn('⚠️ [Embeddings] match_documents RPC error (non-fatal):', rpcError.message)
    }
  } catch (err) {
    console.warn('⚠️ [Embeddings] Could not validate match_documents RPC:', err)
  }
  
  setupValidated = true
  return true
}

export async function upsertEmbeddings(sessionId: string, kind: string, texts: string[], vectors: number[][]) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ [Embeddings] Supabase env vars not configured. Skipping embedding storage.')
    return
  }
  
  // Validate setup before attempting insert
  const isValid = await validateSupabaseEmbeddingsSetup()
  if (!isValid) {
    console.warn('⚠️ [Embeddings] Supabase setup incomplete. Skipping embedding storage.')
    return
  }
  
  const supabase = getSupabaseService()
  if (!supabase) {
    console.warn('⚠️ [Embeddings] Supabase client unavailable. Skipping embedding storage.')
    return
  }
  
  try {
    const rows = texts.map((t, i) => ({ session_id: sessionId, kind, text: t, embedding: vectors[i] }))
    const { error } = await supabase.from('documents_embeddings').insert(rows)
    
    if (error) {
      console.error('❌ [Embeddings] Failed to store embeddings:', error.message)
      throw error
    }
  } catch (error) {
    console.error('❌ [Embeddings] Error storing embeddings:', error)
    throw error
  }
}

export async function queryTopK(sessionId: string, queryVector: number[], k = 5) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ [Embeddings] Supabase env vars not configured. Vector search disabled.')
    return []
  }
  
  // Validate setup before attempting query
  const isValid = await validateSupabaseEmbeddingsSetup()
  if (!isValid) {
    console.warn('⚠️ [Embeddings] Supabase setup incomplete. Vector search disabled.')
    return []
  }
  
  const supabase = getSupabaseService()
  if (!supabase) {
    console.warn('⚠️ [Embeddings] Supabase client unavailable. Vector search disabled.')
    return []
  }
  
  try {
    // Note: pgvector cosine distance; requires proper index in prod
    const { data, error } = await supabase.rpc('match_documents', { 
      p_session_id: sessionId, 
      p_query: queryVector, 
      p_match_count: k 
    })
    
    if (error) {
      console.error('❌ [Embeddings] match_documents RPC error:', error.message)
      console.error('   Check that the RPC function exists and returns correct columns.')
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('❌ [Embeddings] Query failed:', error)
    return []
  }
}


