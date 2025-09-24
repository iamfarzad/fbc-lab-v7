import { getSupabaseServer, getSupabaseService } from '@/src/lib/supabase';
import { Database } from '../database.types'

// Improved Supabase Client Setup with TypeScript types and error handling
export const supabase = getSupabaseServer();

// Service Role Client for API operations (bypasses RLS) - only available server-side
export const supabaseService = getSupabaseService();

// Safe authentication utility for server-side API routes
export async function getSafeUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error: null }
  } catch (error) {
    // Handle AuthSessionMissingError gracefully - this is expected in server-side API routes
    if (error && typeof error === 'object' && 'name' in error && (error as any).name === 'AuthSessionMissingError') {
      // This is expected behavior in server-side API routes
      return { user: null, error: null }
    }
    return { user: null, error }
  }
}

// Type-safe Lead Creation Function
export async function createLeadSummary(
  leadData: Database['public']['Tables']['lead_summaries']['Insert']
) {
  // Get current authenticated user safely
  const { user, error: userError } = await getSafeUser()
  
  if (userError) {
    // Error: Auth error
  }

  if (!user) {
    // Action logged
  }

  // Automatically set user_id if not provided
  const finalLeadData = {
    ...leadData,
    user_id: leadData.user_id || user?.id || null
  }

  // Use service role client for API operations (bypasses RLS)
  const { data, error } = await supabaseService
    .from('lead_summaries')
    .insert(finalLeadData)
    .select()
    .single()
  
  if (error) {
    // Error: Lead creation error
    throw error
  }
  
  return data
}

// Comprehensive Error Handling
export function handleSupabaseError(error: any) {
  const errorMap: Record<string, string> = {
    'PGRST116': 'Permission denied. Check user authentication.',
    'PGRST000': 'Database operation failed',
    '23505': 'Unique constraint violation',
    '23503': 'Foreign key constraint violation',
    '42501': 'Row-level security policy violation',
    '42P01': 'Table does not exist'
  }

  const errorMessage = errorMap[error.code] || 'Unexpected database error'
  
  console.error({
    message: errorMessage,
    code: error.code,
    details: error.message,
    context: error
  })

  return {
    message: errorMessage,
    code: error.code,
    details: error.message
  }
}

// Type-safe search results creation
export async function createSearchResults(
  leadId: string,
  results: Array<{ url: string; title?: string; snippet?: string; source: string }>
) {
  if (results.length === 0) {
    // Action logged
    return []
  }

  const searchRecords = results.map(result => ({
    lead_id: leadId,
    source: result.source,
    url: result.url,
    title: result.title || '',
    snippet: result.snippet || '',
    raw: result
  }))

  const { data, error } = await supabaseService
    .from('lead_search_results')
    .insert(searchRecords)
    .select()

  if (error) {
    // Error: Failed to store search results
    throw error
  }

  // Action logged
  return data || []
}

// Get search results for a lead
export async function getSearchResults(leadId: string) {
  const { data, error } = await supabaseService
    .from('lead_search_results')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) {
    // Error: Failed to fetch search results
    throw error
  }

  return data || []
}

// Get leads for the current user
export async function getUserLeads() {
  const { data, error } = await supabase
    .from('lead_summaries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    // Error: Get user leads error
    throw error
  }

  return data || []
}

// Get a specific lead by ID
export async function getLeadById(id: string) {
  const { data, error } = await supabaseService
    .from('lead_summaries')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Lead not found
    }
    console.error('Get lead error', error)
    throw error
  }

  return data
}
