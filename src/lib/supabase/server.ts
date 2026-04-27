import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/types/db";

export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const c of toSet) cookieStore.set(c.name, c.value, c.options);
        } catch {
          // setAll called from a Server Component — Next forbids it. Safe to ignore;
          // session refresh runs in middleware.
        }
      },
    },
  });
}
