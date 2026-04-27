import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: RouteContext<"/api/share/[slug]/unlock">) {
  const { slug } = await ctx.params;
  const { password } = (await req.json()) as { password: string };
  const admin = getAdminSupabase();
  const { data: project } = await admin
    .from("projects")
    .select("share_password_hash")
    .eq("share_slug", slug)
    .single();
  if (!project?.share_password_hash) return NextResponse.json({ error: "no password" }, { status: 400 });
  const ok = await bcrypt.compare(password, project.share_password_hash as string);
  if (!ok) return NextResponse.json({ error: "wrong password" }, { status: 401 });

  const cookieStore = await cookies();
  cookieStore.set(`share_${slug}`, "1", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: `/p/${slug}`,
  });
  return NextResponse.json({ ok: true });
}
