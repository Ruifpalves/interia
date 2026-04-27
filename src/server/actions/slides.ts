"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireSession } from "@/server/queries/workspace";
import { renderPlanSvg } from "@/lib/pdf/plan-svg";
import type { PlanState } from "@/types/project";

const slideTypes = ["cover", "separator", "plan", "photo_grid", "reference_grid", "render", "technical", "contact", "custom"] as const;

export async function generateInitialSlides(projectId: string) {
  const session = await requireSession();
  const supabase = await getServerSupabase();
  const [{ data: project }, { data: photos }, { data: refs }, { data: renders }, { data: views }] = await Promise.all([
    supabase.from("projects").select("name, type, subtype, location, plan_json, clients(name), workspaces(name, address, phone)").eq("id", projectId).returns<Array<{ name: string; type: string; subtype: string | null; location: string | null; plan_json: PlanState | null; clients: { name: string } | { name: string }[] | null; workspaces: { name: string; address: string | null; phone: string | null } | null }>>().single(),
    supabase.from("assets").select("id, url").eq("project_id", projectId).eq("kind", "photo"),
    supabase.from("assets").select("id, url").eq("project_id", projectId).eq("kind", "reference"),
    supabase.from("renders").select("id, image_url").eq("project_id", projectId).eq("is_favorite", true).limit(8),
    supabase.from("technical_views").select("id, view_type, svg").eq("project_id", projectId),
  ]);
  if (!project) return { error: "Projeto não encontrado." };

  const clientName = Array.isArray(project.clients) ? project.clients[0]?.name : (project.clients as { name?: string } | null)?.name;
  const ws = Array.isArray(project.workspaces) ? project.workspaces[0] : (project.workspaces as { name?: string; address?: string; phone?: string } | null);

  const planSvgNoDims = project.plan_json
    ? renderPlanSvg(project.plan_json, { theme: "light", withDimensions: false, title: "PLANTA ATUAL" })
    : "";
  const planSvgDims = project.plan_json
    ? renderPlanSvg(project.plan_json, { theme: "light", withDimensions: true, title: "PLANTA ATUAL — MEDIDAS" })
    : "";
  const planSvgProposal = project.plan_json
    ? renderPlanSvg(project.plan_json, { theme: "light", withDimensions: true, title: "PLANTA PROPOSTA" })
    : "";

  const initial: Array<{ position: number; type: typeof slideTypes[number]; content_json: Record<string, unknown> }> = [
    { position: 1, type: "cover", content_json: { title: project.name, client: clientName ?? "", date: new Date().toISOString().slice(0, 10), studio: ws?.name } },
    { position: 2, type: "separator", content_json: { text: "PLANTA ATUAL" } },
    { position: 3, type: "plan", content_json: { variant: "current_no_dims", svg: planSvgNoDims } },
    { position: 4, type: "separator", content_json: { text: "PLANTA ATUAL COM MEDIDAS" } },
    { position: 5, type: "plan", content_json: { variant: "current_with_dims", svg: planSvgDims } },
    { position: 6, type: "separator", content_json: { text: "LEVANTAMENTO FOTOGRÁFICO" } },
    { position: 7, type: "photo_grid", content_json: { ids: (photos ?? []).slice(0, 8).map((p) => p.id), urls: (photos ?? []).slice(0, 8).map((p) => p.url) } },
    { position: 8, type: "separator", content_json: { text: "PROPOSTA" } },
    { position: 9, type: "separator", content_json: { text: "IMAGENS DE REFERÊNCIA" } },
    { position: 10, type: "reference_grid", content_json: { ids: (refs ?? []).map((r) => r.id), urls: (refs ?? []).map((r) => r.url) } },
    { position: 11, type: "plan", content_json: { variant: "proposal", svg: planSvgProposal } },
    { position: 12, type: "render", content_json: { ids: (renders ?? []).map((r) => r.id), urls: (renders ?? []).map((r) => r.image_url) } },
    { position: 13, type: "technical", content_json: { ids: (views ?? []).map((v) => v.id), svgs: (views ?? []).map((v) => v.svg) } },
    { position: 14, type: "contact", content_json: { studio: ws?.name, address: ws?.address, phone: ws?.phone } },
  ];

  await supabase.from("slides").delete().eq("project_id", projectId);
  await supabase.from("slides").insert(
    initial.map((s) => ({ ...s, project_id: projectId, workspace_id: session.workspaceId })),
  );
  return { ok: true, generated: initial.length };
}

export async function reorderSlides(projectId: string, order: string[]) {
  await requireSession();
  const supabase = await getServerSupabase();
  for (const [i, id] of order.entries()) {
    await supabase.from("slides").update({ position: i + 1 }).eq("id", id).eq("project_id", projectId);
  }
  return { ok: true };
}

export async function updateSlideContent(slideId: string, content: Record<string, unknown>) {
  await requireSession();
  const supabase = await getServerSupabase();
  await supabase.from("slides").update({ content_json: content }).eq("id", slideId);
  return { ok: true };
}

export async function deleteSlide(slideId: string) {
  await requireSession();
  const supabase = await getServerSupabase();
  await supabase.from("slides").delete().eq("id", slideId);
  return { ok: true };
}
