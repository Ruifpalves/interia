"use server";

import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireSession } from "@/server/queries/workspace";
import { genText, generateImage } from "@/lib/ai/clients";
import { briefingSystemPrompt, buildImagePrompts, editPromptSystemPrompt } from "@/lib/ai/prompts";
import type { BriefingState, PlanState, StyleState } from "@/types/project";

const briefingResultSchema = z.object({
  objetivo: z.string(),
  estilo: z.string(),
  paleta_principal: z.array(z.string()),
  materiais: z.array(z.string()),
  elementos_especiais: z.array(z.string()),
  restricoes: z.array(z.string()),
  palavras_chave_imagem: z.array(z.string()),
  descricao_pt: z.string(),
});

// PIPELINE 1 — Briefing → Direção Estruturada
export async function runBriefingPipeline(projectId: string) {
  await requireSession();
  const supabase = await getServerSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("briefing_text, type, subtype, location, measurements_json")
    .eq("id", projectId)
    .single();
  if (!project) return { error: "Projeto não encontrado." };

  const userPrompt = JSON.stringify({
    tipo: project.type,
    subtipo: project.subtype,
    localizacao: project.location,
    medidas: project.measurements_json,
    briefing_designer: project.briefing_text,
  });

  try {
    const { text } = await genText({
      system: briefingSystemPrompt,
      prompt: userPrompt,
      json: true,
    });
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = briefingResultSchema.safeParse(JSON.parse(cleaned));
    if (!parsed.success) return { error: "Resposta do modelo não validou contra o schema." };

    const briefing: BriefingState = { version: 1, ...parsed.data };
    await supabase.from("projects").update({ briefing_json: briefing }).eq("id", projectId);
    return { ok: true as const };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// PIPELINE 3 — 6 renders iniciais
export async function runInitialRenders(projectId: string) {
  const session = await requireSession();
  const supabase = await getServerSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("type, subtype, briefing_json, style_json, plan_json")
    .eq("id", projectId)
    .single();
  if (!project) return { error: "Projeto não encontrado." };
  if (!project.style_json) return { error: "Defina o estilo antes de gerar renders." };
  if (!project.plan_json) return { error: "Configure a planta antes de gerar renders." };

  const subjectHint = `${project.type === "furniture" ? "custom-built furniture" : "interior space"} (${project.subtype ?? "general"})`;
  const prompts = buildImagePrompts({
    briefing: (project.briefing_json as BriefingState | null) ?? null,
    style: project.style_json as StyleState,
    plan: project.plan_json as PlanState,
    subjectHint,
  });

  const results = await Promise.allSettled(
    prompts.map((p) => generateOneRender(projectId, session.workspaceId, p)),
  );

  const ok = results.filter((r) => r.status === "fulfilled").length;
  return { ok: true, generated: ok, total: prompts.length };
}

// PIPELINE 4 — Edição iterativa
export async function runIterativeEdit(renderId: string, instructionPt: string) {
  const session = await requireSession();
  const supabase = await getServerSupabase();
  const { data: render } = await supabase
    .from("renders")
    .select("project_id, prompt_en")
    .eq("id", renderId)
    .single();
  if (!render?.prompt_en) return { error: "Render original não encontrado." };

  try {
    const { text } = await genText({
      system: editPromptSystemPrompt,
      prompt: `ORIGINAL PROMPT:\n${render.prompt_en}\n\nINSTRUCTION (PT-PT):\n${instructionPt}\n\nReturn the rewritten English prompt.`,
    });
    const newPrompt = text.trim();
    const newRenderId = await generateOneRender(render.project_id as string, session.workspaceId, newPrompt, renderId);
    return { ok: true, renderId: newRenderId };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

async function generateOneRender(
  projectId: string,
  workspaceId: string,
  prompt: string,
  parentId?: string,
): Promise<string | null> {
  const supabase = await getServerSupabase();
  const started = Date.now();

  const { data: pending, error: insertErr } = await supabase
    .from("renders")
    .insert({
      project_id: projectId,
      workspace_id: workspaceId,
      prompt_en: prompt,
      status: "generating",
      parent_render_id: parentId ?? null,
    })
    .select("id")
    .single();
  if (insertErr || !pending) return null;
  const renderId = pending.id as string;

  try {
    const { imageBase64 } = await generateImage({ prompt });
    const buffer = Buffer.from(imageBase64, "base64");
    const path = `${workspaceId}/${projectId}/renders/${renderId}.png`;
    const { error: upErr } = await supabase.storage
      .from("renders")
      .upload(path, buffer, { contentType: "image/png", upsert: true });
    if (upErr) throw upErr;
    const { data: signed } = await supabase.storage.from("renders").createSignedUrl(path, 60 * 60 * 24 * 7);

    await supabase
      .from("renders")
      .update({
        status: "ready",
        storage_path: path,
        image_url: signed?.signedUrl ?? null,
        generation_time_ms: Date.now() - started,
        cost_eur: 0.04,
      })
      .eq("id", renderId);
    return renderId;
  } catch (e) {
    await supabase
      .from("renders")
      .update({ status: "failed", error_message: (e as Error).message, generation_time_ms: Date.now() - started })
      .eq("id", renderId);
    return null;
  }
}

export async function favoriteRender(renderId: string, value: boolean) {
  await requireSession();
  const supabase = await getServerSupabase();
  await supabase.from("renders").update({ is_favorite: value }).eq("id", renderId);
  return { ok: true };
}

export async function deleteRender(renderId: string) {
  await requireSession();
  const supabase = await getServerSupabase();
  const { data: r } = await supabase.from("renders").select("storage_path").eq("id", renderId).single();
  if (r?.storage_path) await supabase.storage.from("renders").remove([r.storage_path as string]);
  await supabase.from("renders").delete().eq("id", renderId);
  return { ok: true };
}
