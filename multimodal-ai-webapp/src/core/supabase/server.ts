import { getSupabaseServer } from '@/src/lib/supabase';

// Server-side client factory
export const getSupabase = () => {
  return getSupabaseServer();
}

// Export default instance for backward compatibility
export const supabase = getSupabase();

