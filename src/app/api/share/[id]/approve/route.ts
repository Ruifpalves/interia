import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({ authorName: z.string().min(1), authorEmail: z.string().email().optional().or(z.literal("")) });

export async function POST(req: Request, ctx: RouteContext<"/api/share/[id]/approve">) {
  const { id } = await ctx.params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const admin = getAdminSupabase();
  const { data: project } = await admin.from("projects").select("designer_id, workspace_id").eq("id", id).single();

  await admin
    .from("projects")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by_email: body.data.authorEmail || body.data.authorName,
    })
    .eq("id", id);

  if (project?.designer_id) {
    await admin.from("notifications").insert({
      user_id: project.designer_id,
      workspace_id: project.workspace_id,
      type: "approval",
      payload_json: { project_id: id, approved_by: body.data.authorName },
    });
  }

  return NextResponse.json({ ok: true });
}
