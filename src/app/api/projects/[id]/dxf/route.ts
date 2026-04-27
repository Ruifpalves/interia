import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { buildDxfFromPlan } from "@/lib/dxf/build";
import type { PlanState } from "@/types/project";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]/dxf">) {
  const { id } = await ctx.params;
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("name, plan_json")
    .eq("id", id)
    .single();
  if (!project?.plan_json) return NextResponse.json({ error: "no plan" }, { status: 400 });

  const dxf = buildDxfFromPlan(project.plan_json as PlanState);
  const filename = `${project.name.toString().replace(/[^a-zA-Z0-9]+/g, "_")}.dxf`;
  return new NextResponse(dxf, {
    status: 200,
    headers: {
      "Content-Type": "application/dxf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
