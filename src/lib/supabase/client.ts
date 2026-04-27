"use client";
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/types/db";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getBrowserSupabase() {
  if (cached) return cached;
  cached = createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
  return cached;
}
