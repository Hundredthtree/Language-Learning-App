import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Server-side Supabase client for use in:
 * - API routes (app/api/*)
 * - Server Components
 * - Server Actions
 * 
 * Uses the secret key which bypasses RLS and has full access.
 * NEVER use this in client-side code!
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.warn(
    "Server-side Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
  );
}

export const supabaseServer =
  supabaseUrl && supabaseSecretKey
    ? createClient<Database>(supabaseUrl, supabaseSecretKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

