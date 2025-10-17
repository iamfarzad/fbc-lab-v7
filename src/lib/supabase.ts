import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/src/core/database.types';

// 🔧 MASTER FLOW: Soft-gated env checking for build compatibility
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required env var: ${name}. Add it to .env.production`);
    } else {
      console.warn(`⚠️ Missing env: ${name} (using placeholder for development)`);
      console.warn(`   Add ${name} to .env.local for full functionality`);
      return name === 'NEXT_PUBLIC_SUPABASE_URL' ? 'https://placeholder.supabase.co' : 'placeholder-key';
    }
  }
  return v;
}

export function getSupabaseServer() {
  try {
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    
    if (url === 'https://placeholder.supabase.co') {
      console.warn('⚠️ Supabase not configured - using placeholder. Data persistence disabled.');
      return null as any;
    }
    
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
    
    if (url === 'https://placeholder.supabase.co') {
      console.warn('⚠️ Supabase not configured - using placeholder. WAL logging disabled.');
      return null as any;
    }
    
    return createClient<Database>(url, svc);
  } catch (error) {
    console.warn('Supabase service client unavailable:', error);
    return null as any; // Return null for graceful degradation
  }
}
