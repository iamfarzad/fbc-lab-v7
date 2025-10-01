import { supabase } from '@/core/supabase/server'

/**
 * Records first-time capability usage for a session by calling the DB RPC
 * append_capability_if_missing(session_id, capability). This dedupes and
 * updates conversation_contexts.ai_capabilities_shown, and logs to
 * capability_usage_log per your Supabase setup.
 * If the RPC is missing (older DB), falls back to legacy upsert pattern.
 */
export async function recordCapabilityUsed(sessionId: string, capabilityName: string, usageData?: unknown) {
  const supabaseClient = supabase
  try {
    // Preferred path: server-side RPC handles dedupe + logging
    const { error: rpcError } = await supabaseClient.rpc('append_capability_if_missing', {
      p_session_id: sessionId,
      p_capability: capabilityName as any, // Cast to any to handle enum/text type mismatch
    })
    if (!rpcError) {
      // Optionally attach context to first-use row if your function/table supports it
      // Skipped here since RPC already logs; keep network minimal.
      // Action logged`)
      return
    }
    // Warning log removed - could add proper error handling here
  } catch (error) {
    console.warn(`[capabilities] RPC append_capability_if_missing failed for ${capabilityName}`, error)
  }

  // Fallback (legacy): write to capability_usage (if exists) and update array locally
  try {
    await supabaseClient
      .from('capability_usage')
      .insert({ session_id: sessionId, capability_name: capabilityName, usage_data: usageData || {} })

    const { data: context } = await supabaseClient
      .from('conversation_contexts')
      .select('ai_capabilities_shown')
      .eq('session_id', sessionId)
      .single()
    if (context) {
      const current = Array.isArray(context.ai_capabilities_shown) ? context.ai_capabilities_shown : []
      const updated = [...new Set([...current, capabilityName])]
      await supabaseClient
        .from('conversation_contexts')
        .update({ ai_capabilities_shown: updated, updated_at: new Date().toISOString() })
        .eq('session_id', sessionId)
    }
    // Action logged`)
  } catch (error) {
    console.error(`❌ Failed to record capability usage (fallback): ${capabilityName}`, error)
  }
}

export async function getCapabilitiesUsed(sessionId: string): Promise<string[]> {
  const supabaseClient = supabase
  try {
    const { data: context } = await supabaseClient
      .from('conversation_contexts')
      .select('ai_capabilities_shown')
      .eq('session_id', sessionId)
      .single()
    return context?.ai_capabilities_shown || []
  } catch (error) {
    console.error(`❌ Failed to get capabilities for session: ${sessionId}`, error)
    return []
  }
}
