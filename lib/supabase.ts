import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUBMISSIONS_TABLE = "submissions";
export const SCREENSHOTS_BUCKET = "screenshots";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
// Server-side only. The service role key bypasses RLS so the API can insert
// rows and upload files. It must never be exposed to the browser.
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && serviceKey);
}

/**
 * Returns a singleton Supabase client backed by the service role key.
 * Throws a clear error if the required env vars are missing.
 */
export function getSupabase(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
