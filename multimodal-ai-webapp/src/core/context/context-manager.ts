import { ContextStorage } from '@/src/core/context/context-storage'

function pickLead(ctx: unknown): { email: string; name: string } | undefined {
  const obj = ctx as Record<string, unknown>;
  const lead = (obj && typeof obj === 'object' && 'lead' in obj) ? (obj as any).lead : undefined;
  const email = lead?.email;
  const name = lead?.name;
  if (typeof email === 'string' && typeof name === 'string') {
    return { email, name };
  }
  return undefined;
}

export async function getMergedContext(sessionId: string) {
  const storage = new ContextStorage()
  const raw = await storage.get(sessionId)
  if (!raw) return null
  const snapshot = {
    sessionId,
    lead: pickLead(raw),
    company: raw.company_context,
    person: raw.person_context,
    role: raw.role,
    roleConfidence: raw.role_confidence,
    intent: raw.intent_data,
    ai_capabilities_shown: raw.ai_capabilities_shown || []
  }
  return snapshot
}

import { getSupabase } from '@/src/core/supabase/server'
import { ContextSnapshotSchema, type ContextSnapshot } from './context-schema'

export async function getContextSnapshot(sessionId: string): Promise<ContextSnapshot | null> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('conversation_contexts')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (!data) return null

  const snapshot: ContextSnapshot = {
    lead: pickLead(data) || { email: '', name: '' },
    company: data.company_context || undefined,
    person: data.person_context || undefined,
    role: data.role || undefined,
    roleConfidence: data.role_confidence || undefined,
    intent: data.intent_data || undefined,
    capabilities: data.ai_capabilities_shown || [],
  }

  return ContextSnapshotSchema.parse(snapshot)
}

export async function updateContext(sessionId: string, patch: Partial<ContextSnapshot>) {
  const supabase = getSupabase()
  const { data: existing } = await supabase
    .from('conversation_contexts')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()

  const merged = {
    email: existing?.email,
    name: existing?.name,
    company_context: patch.company ?? existing?.company_context ?? null,
    person_context: patch.person ?? existing?.person_context ?? null,
    role: patch.role ?? existing?.role ?? null,
    role_confidence: patch.roleConfidence ?? existing?.role_confidence ?? null,
    intent_data: patch.intent ?? existing?.intent_data ?? null,
    ai_capabilities_shown: patch.capabilities ?? existing?.ai_capabilities_shown ?? [],
    updated_at: new Date().toISOString(),
  }

  await supabase.from('conversation_contexts').update(merged).eq('session_id', sessionId)
}


