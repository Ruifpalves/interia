import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/types/db";

let cached: ReturnType<typeof createClient<Database>> | null = null;

// Service-role client. Bypasses RLS. Use only in trusted server code:
//   - webhooks
//   - public share endpoints (with explicit slug filtering)
//   - signup / workspace bootstrap
export function getAdminSupabase() {
  if (cached) return cached;
  cached = createClient<Database>(env.supabaseUrl, env.serverOnly.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
