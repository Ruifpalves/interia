"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireSession } from "@/server/queries/workspace";
import { slugify } from "@/lib/utils/format";

const createProjectSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["furniture", "space"]),
  subtype: z.string().optional(),
  location: z.string().optional(),
  clientId: z.string().uuid().optional(),
  newClientName: z.string().optional(),
  newClientEmail: z.string().email().optional().or(z.literal("")),
  newClientPhone: z.string().optional(),
});

const slug6 = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

export async function createProjectAction(formData: FormData) {
  const session = await requireSession();
  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    subtype: formData.get("subtype") ?? undefined,
    location: formData.get("location") ?? undefined,
    clientId: formData.get("clientId") || undefined,
    newClientName: formData.get("newClientName") ?? undefined,
    newClientEmail: formData.get("newClientEmail") ?? undefined,
    newClientPhone: formData.get("newClientPhone") ?? undefined,
  });
  if (!parsed.success) return { error: "Verifica os campos do projeto." };

  const supabase = await getServerSupabase();

  let clientId = parsed.data.clientId;
  if (!clientId && parsed.data.newClientName) {
    const { data: c, error: cErr } = await supabase
      .from("clients")
      .insert({
        workspace_id: session.workspaceId,
        name: parsed.data.newClientName,
        email: parsed.data.newClientEmail || null,
        phone: parsed.data.newClientPhone || null,
      })
      .select("id")
      .single();
    if (cErr) return { error: cErr.message };
    clientId = c.id as string;
  }

  const baseSlug = `${slugify(parsed.data.name).slice(0, 32)}-${slug6()}`;

  const { data: p, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: session.workspaceId,
      client_id: clientId ?? null,
      designer_id: session.userId,
      name: parsed.data.name,
      type: parsed.data.type,
      subtype: parsed.data.subtype || null,
      location: parsed.data.location || null,
      status: "draft",
      share_slug: baseSlug,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  redirect(`/projects/${p.id}/inputs`);
}

export async function updateProjectStatus(projectId: string, status: "draft" | "in_progress" | "pending_approval" | "approved" | "archived") {
  await requireSession();
  const supabase = await getServerSupabase();
  await supabase.from("projects").update({ status }).eq("id", projectId);
}

export async function saveProjectField(projectId: string, field: string, value: unknown) {
  await requireSession();
  const allowed = new Set([
    "name",
    "subtype",
    "location",
    "briefing_text",
    "briefing_json",
    "style_json",
    "plan_json",
    "measurements_json",
    "share_allow_comments",
    "share_require_approval",
  ]);
  if (!allowed.has(field)) return { error: "Campo não suportado." };
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("projects")
    .update({ [field]: value } as Record<string, unknown>)
    .eq("id", projectId);
  return error ? { error: error.message } : { ok: true };
}
