import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export type SessionContext = {
  userId: string;
  email: string;
  fullName: string | null;
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "designer" | "viewer";
  plan: "trial" | "solo" | "studio" | "pro";
  trialEndsAt: string | null;
  accentColor: string;
  logoUrl: string | null;
};

export async function getSession(): Promise<SessionContext | null> {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id, role, full_name, email")
    .eq("id", auth.user.id)
    .single();
  if (!profile?.workspace_id) return null;

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, name, plan, trial_ends_at, accent_color, logo_url")
    .eq("id", profile.workspace_id)
    .single();
  if (!ws) return null;

  return {
    userId: auth.user.id,
    email: profile.email ?? auth.user.email ?? "",
    fullName: profile.full_name,
    workspaceId: ws.id as string,
    workspaceName: ws.name as string,
    role: (profile.role as SessionContext["role"]) ?? "designer",
    plan: (ws.plan as SessionContext["plan"]) ?? "trial",
    trialEndsAt: (ws.trial_ends_at as string | null) ?? null,
    accentColor: (ws.accent_color as string) ?? "#d4a373",
    logoUrl: (ws.logo_url as string | null) ?? null,
  };
}

export async function requireSession(): Promise<SessionContext> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function requireOnboarded(): Promise<SessionContext> {
  const s = await requireSession();
  // workspaces with the seed default name still might count as onboarded.
  // We treat onboarding as done once accent_color or logo_url is set; otherwise redirect.
  if (!s.logoUrl && !s.accentColor) redirect("/onboarding");
  return s;
}

// Admin (service role) helper for actions that need to bypass RLS,
// e.g. sharing endpoints, webhooks.
export function adminClient() {
  return getAdminSupabase();
}
