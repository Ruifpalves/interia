import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/types/db";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const c of toSet) request.cookies.set(c.name, c.value);
        response = NextResponse.next({ request });
        for (const c of toSet) response.cookies.set(c.name, c.value, c.options);
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const protectedPrefixes = ["/dashboard", "/projects", "/clients", "/team", "/settings", "/billing"];
  const authPrefixes = ["/login", "/signup", "/reset"];

  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));
  const isAuth = authPrefixes.some((p) => path.startsWith(p));

  if (!data.user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (data.user && isAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
