import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for Oscar Dog Hotel V2.
 *
 * There are deliberately NO hardcoded fallbacks here. The URL and key must come
 * from the .env file (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). If they are
 * missing the app refuses to start, so this build can never silently talk to
 * the legacy (V1) database that existing users depend on.
 */
const env = (import.meta as any).env ?? {};

export const SUPABASE_URL: string = env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[Oscar V2] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in the NEW Supabase project values.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
