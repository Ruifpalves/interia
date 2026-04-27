"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireSession } from "@/server/queries/workspace";

export async function updateShareSettings(
  projectId: string,
  patch: { allowComments?: boolean; requireApproval?: boolean; password?: string | null },
) {
  await requireSession();
  const supabase = await getServerSupabase();
  const update: Record<string, unknown> = {};
  if (patch.allowComments !== undefined) update.share_allow_comments = patch.allowComments;
  if (patch.requireApproval !== undefined) update.share_require_approval = patch.requireApproval;
  if (patch.password !== undefined) {
    update.share_password_hash = patch.password ? await bcrypt.hash(patch.password, 10) : null;
  }
  const { error } = await supabase.from("projects").update(update).eq("id", projectId);
  return error ? { error: error.message } : { ok: true };
}

const commentSchema = z.object({
  authorName: z.string().min(1).max(60),
  authorEmail: z.string().email().optional().or(z.literal("")),
  text: z.string().min(1).max(2000),
});

// Used by the public /p/[slug] page via API route. Service role.
export async function postPublicComment(projectId: string, slideId: string | null, input: unknown) {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };
  // Insert performed via API route with service role.
  return { ok: true, ...parsed.data, slideId };
}
