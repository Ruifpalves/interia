"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireSession } from "@/server/queries/workspace";
import { generateTechnicalViews } from "@/lib/ai/technical";
import type { PlanState } from "@/types/project";

export async function generateTechnicalAction(projectId: string) {
  const session = await requireSession();
  const supabase = await getServerSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("plan_json, subtype")
    .eq("id", projectId)
    .single();
  if (!project?.plan_json) return { error: "Configure a planta primeiro." };

  const views = generateTechnicalViews(project.plan_json as PlanState, project.subtype as string | null);
  if (views.length === 0) return { error: "Adicione módulos à planta para gerar vistas." };

  await supabase.from("technical_views").delete().eq("project_id", projectId);

  const rows = views.map((v) => ({
    project_id: projectId,
    workspace_id: session.workspaceId,
    view_type: v.type,
    svg: v.svg,
    dimensions_json: {},
    annotations_json: {},
  }));
  await supabase.from("technical_views").insert(rows);
  return { ok: true, generated: views.length };
}
