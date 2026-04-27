import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({
  slideId: z.string().uuid().optional(),
  authorName: z.string().min(1).max(60),
  authorEmail: z.string().email().optional().or(z.literal("")),
  text: z.string().min(1).max(2000),
});

export async function POST(req: Request, ctx: RouteContext<"/api/share/[id]/comments">) {
  const { id } = await ctx.params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from("comments")
    .insert({
      project_id: id,
      slide_id: body.data.slideId ?? null,
      author_name: body.data.authorName,
      author_email: body.data.authorEmail || null,
      text: body.data.text,
    })
    .select("id, slide_id, author_name, text, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the project owner
  const { data: project } = await admin
    .from("projects")
    .select("designer_id, workspace_id")
    .eq("id", id)
    .single();
  if (project?.designer_id) {
    await admin.from("notifications").insert({
      user_id: project.designer_id,
      workspace_id: project.workspace_id,
      type: "comment",
      payload_json: { project_id: id, comment_id: data.id, author: body.data.authorName },
    });
  }

  return NextResponse.json(data);
}
