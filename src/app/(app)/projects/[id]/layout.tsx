import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ProjectTabs } from "@/components/project/tabs";
import { getServerSupabase } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

const statusBadge = {
  draft: { tone: "neutral" as const, label: "Rascunho" },
  in_progress: { tone: "info" as const, label: "Em curso" },
  pending_approval: { tone: "warning" as const, label: "Aguarda aprovação" },
  approved: { tone: "success" as const, label: "Aprovado" },
  archived: { tone: "neutral" as const, label: "Arquivado" },
};

export default async function ProjectLayout(
  props: LayoutProps<"/projects/[id]">,
) {
  const { id } = await props.params;
  const supabase = await getServerSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, status, type, subtype, location, clients(name)")
    .eq("id", id)
    .returns<Array<{ id: string; name: string; status: string; type: string; subtype: string | null; location: string | null; clients: { name: string } | { name: string }[] | null }>>()
    .single();
  if (!project) notFound();

  const meta = statusBadge[project.status as keyof typeof statusBadge] ?? statusBadge.draft;
  const clientName = Array.isArray(project.clients)
    ? project.clients[0]?.name
    : (project.clients as { name?: string } | null)?.name;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 pt-4 pb-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-3 text-xs text-muted mb-1">
          <Link href="/projects" className="hover:text-[var(--color-fg)] inline-flex items-center gap-1">
            <ChevronLeft size={14} /> Projetos
          </Link>
          <span>/</span>
          <span>{clientName ?? "Sem cliente"}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium">{project.name as string}</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">
              {project.type === "furniture" ? "Mobiliário" : "Espaço"}
              {project.subtype ? ` · ${project.subtype}` : ""}
              {project.location ? ` · ${project.location}` : ""}
            </span>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
        </div>
      </header>
      <ProjectTabs projectId={id} />
      <div className="flex-1 min-h-0">{props.children}</div>
    </div>
  );
}
