import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { PublicViewer } from "./viewer";
import { PasswordGate } from "./password-gate";

export default async function PublicSharePage(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;
  const admin = getAdminSupabase();

  const { data: project } = await admin
    .from("projects")
    .select("id, name, share_password_hash, share_allow_comments, share_require_approval, status, workspace_id, clients(name), workspaces(name, accent_color, logo_url)")
    .eq("share_slug", slug)
    .returns<Array<{
      id: string;
      name: string;
      share_password_hash: string | null;
      share_allow_comments: boolean;
      share_require_approval: boolean;
      status: string;
      workspace_id: string;
      clients: { name: string } | { name: string }[] | null;
      workspaces: { name: string; accent_color: string; logo_url: string | null } | null;
    }>>()
    .single();
  if (!project || project.status === "archived") notFound();

  if (project.share_password_hash) {
    const cookieStore = await cookies();
    const passOk = cookieStore.get(`share_${slug}`)?.value === "1";
    if (!passOk) return <PasswordGate slug={slug} />;
  }

  const [{ data: slides }, { data: comments }] = await Promise.all([
    admin.from("slides").select("id, type, content_json, position").eq("project_id", project.id).order("position", { ascending: true }),
    admin.from("comments").select("id, slide_id, author_name, text, created_at").eq("project_id", project.id).order("created_at", { ascending: true }),
  ]);

  // Mark first open
  await admin
    .from("projects")
    .update({ share_opened_at: new Date().toISOString() })
    .eq("id", project.id)
    .is("share_opened_at", null);

  const ws = Array.isArray(project.workspaces) ? project.workspaces[0] : (project.workspaces as { name?: string; accent_color?: string; logo_url?: string } | null);

  return (
    <PublicViewer
      projectId={project.id as string}
      projectName={project.name as string}
      clientName={(Array.isArray(project.clients) ? project.clients[0]?.name : (project.clients as { name?: string } | null)?.name) ?? ""}
      studioName={ws?.name ?? "Estúdio"}
      accentColor={ws?.accent_color ?? "#d4a373"}
      logoUrl={ws?.logo_url ?? null}
      allowComments={!!project.share_allow_comments}
      requireApproval={!!project.share_require_approval}
      slides={(slides ?? []) as { id: string; type: string; content_json: Record<string, unknown>; position: number }[]}
      initialComments={(comments ?? []) as { id: string; slide_id: string | null; author_name: string; text: string; created_at: string }[]}
    />
  );
}
