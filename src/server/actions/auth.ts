"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

const signupSchema = z.object({
  studioName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    studioName: formData.get("studioName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Dados inválidos. Verifique nome do estúdio, email e password (mín. 8 caracteres)." };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.appUrl}/onboarding`,
      data: { studio_name: parsed.data.studioName },
    },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Não foi possível criar a conta." };

  // Bootstrap workspace via service role (RLS-protected table requires it)
  const admin = getAdminSupabase();
  const { data: ws, error: wsErr } = await admin
    .from("workspaces")
    .insert({ name: parsed.data.studioName })
    .select("id")
    .single();
  if (wsErr || !ws) return { error: "Não foi possível criar o workspace." };

  await admin
    .from("profiles")
    .update({ workspace_id: ws.id, role: "owner", joined_at: new Date().toISOString() })
    .eq("id", data.user.id);

  // Default template
  await admin.from("templates").insert({
    workspace_id: ws.id,
    name: "Padrão",
    is_default: true,
    structure_json: { variant: "ana_leite_14_slides" },
  });

  redirect("/onboarding");
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Email ou password inválidos." };

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  const next = (formData.get("next") as string | null) ?? "/dashboard";
  redirect(next);
}

export async function logoutAction() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  if (!z.string().email().safeParse(email).success) return { error: "Email inválido." };

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.appUrl}/reset/confirm`,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
