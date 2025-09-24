import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/src/core/database.types';

// 🔧 MASTER FLOW: Soft-gated env checking for build compatibility
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing env: ${name}`);
    } else {
      console.warn(`⚠️ Missing env: ${name} (using fallback for development)`);
      return name === 'NEXT_PUBLIC_SUPABASE_URL' ? 'https://placeholder.supabase.co' : 'placeholder-key';
    }
  }
  return v;
}

export function getSupabaseServer() {
  try {
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return createClient<Database>(url, anon);
  } catch (error) {
    console.warn('Supabase server client unavailable:', error);
    return null as any; // Return null for graceful degradation
  }
}

export function getSupabaseService() {
  try {
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const svc = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    return createClient<Database>(url, svc);
  } catch (error) {
    console.warn('Supabase service client unavailable:', error);
    return null as any; // Return null for graceful degradation
  }
}