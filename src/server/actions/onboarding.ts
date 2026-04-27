"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireSession } from "@/server/queries/workspace";
import { sendEmail, templates } from "@/lib/email/send";
import { env } from "@/lib/env";

const workspaceSchema = z.object({
  address: z.string().optional(),
  phone: z.string().optional(),
  vat: z.string().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  font: z.enum(["Inter", "Calibri", "Playfair"]),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export async function saveOnboardingAction(formData: FormData) {
  const session = await requireSession();
  const parsed = workspaceSchema.safeParse({
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
    vat: formData.get("vat") ?? "",
    accentColor: formData.get("accentColor") ?? "#d4a373",
    font: formData.get("font") ?? "Inter",
    logoUrl: formData.get("logoUrl") ?? "",
  });
  if (!parsed.success) return { error: "Verifica os campos do estúdio." };

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("workspaces")
    .update({
      address: parsed.data.address,
      phone: parsed.data.phone,
      vat: parsed.data.vat,
      accent_color: parsed.data.accentColor,
      font: parsed.data.font,
      logo_url: parsed.data.logoUrl || null,
    })
    .eq("id", session.workspaceId);

  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function inviteTeamAction(formData: FormData) {
  const session = await requireSession();
  const emailsRaw = String(formData.get("emails") ?? "");
  const emails = emailsRaw
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter((e) => z.string().email().safeParse(e).success);

  if (emails.length === 0) return { ok: true, count: 0 };

  const supabase = await getServerSupabase();
  const rows = emails.map((email) => ({
    workspace_id: session.workspaceId,
    email,
    role: "designer" as const,
    token: crypto.randomUUID(),
    invited_by: session.userId,
  }));
  const { error } = await supabase.from("invites").insert(rows);
  if (error) return { error: error.message };

  await Promise.all(
    rows.map((r) =>
      sendEmail({
        to: r.email,
        ...templates.invite({
          studio: session.workspaceName,
          inviter: session.fullName ?? session.email,
          link: `${env.appUrl}/signup?invite=${r.token}`,
        }),
      }),
    ),
  );

  return { ok: true, count: emails.length };
}
