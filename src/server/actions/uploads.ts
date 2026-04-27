"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireSession } from "@/server/queries/workspace";

const bucketByKind = {
  photo: "uploads",
  reference: "references",
  floorplan_input: "uploads",
} as const;

export async function createUploadUrl(
  projectId: string,
  kind: "photo" | "reference" | "floorplan_input",
  filename: string,
) {
  const session = await requireSession();
  const supabase = await getServerSupabase();
  const path = `${session.workspaceId}/${projectId}/${kind}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
  const bucket = bucketByKind[kind];
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? "upload error" } as const;
  return { ok: true as const, bucket, path: data.path, token: data.token };
}

export async function registerAsset(
  projectId: string,
  kind: "photo" | "reference" | "floorplan_input",
  storagePath: string,
  meta: { size?: number; width?: number; height?: number; tag?: string } = {},
) {
  const session = await requireSession();
  const supabase = await getServerSupabase();
  const bucket = bucketByKind[kind];
  const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  const { data, error } = await supabase
    .from("assets")
    .insert({
      workspace_id: session.workspaceId,
      project_id: projectId,
      kind,
      storage_path: storagePath,
      url: signed?.signedUrl ?? null,
      thumbnail_url: signed?.signedUrl ?? null,
      size_bytes: meta.size ?? null,
      width: meta.width ?? null,
      height: meta.height ?? null,
      tag: meta.tag ?? null,
    })
    .select("id, url, kind")
    .single();
  if (error) return { error: error.message };
  return { ok: true as const, asset: data };
}

export async function deleteAsset(assetId: string) {
  await requireSession();
  const supabase = await getServerSupabase();
  const { data: asset } = await supabase
    .from("assets")
    .select("storage_path, kind")
    .eq("id", assetId)
    .single();
  if (asset) {
    const bucket = bucketByKind[asset.kind as keyof typeof bucketByKind];
    await supabase.storage.from(bucket).remove([asset.storage_path as string]);
  }
  await supabase.from("assets").delete().eq("id", assetId);
  return { ok: true };
}

export async function setCoverPhoto(assetId: string, projectId: string) {
  await requireSession();
  const supabase = await getServerSupabase();
  await supabase.from("assets").update({ is_cover: false }).eq("project_id", projectId).eq("kind", "photo");
  await supabase.from("assets").update({ is_cover: true }).eq("id", assetId);
  return { ok: true };
}
