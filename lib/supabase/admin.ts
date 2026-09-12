import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin Client using SUPABASE_SERVICE_ROLE_KEY
 * Used strictly for privileged backend operations (creating users, setting auth passwords)
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !serviceKey) {
    throw new Error('Supabase configuration missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
