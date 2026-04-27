import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getServerSupabase } from "@/lib/supabase/server";
import { relTime } from "@/lib/utils/format";

const statusBadge = {
  draft: { tone: "neutral" as const, label: "Rascunho" },
  in_progress: { tone: "info" as const, label: "Em curso" },
  pending_approval: { tone: "warning" as const, label: "Aguarda aprovação" },
  approved: { tone: "success" as const, label: "Aprovado" },
  archived: { tone: "neutral" as const, label: "Arquivado" },
};

export default async function ProjectsPage(props: PageProps<"/projects">) {
  const sp = await props.searchParams;
  const filter = (typeof sp.status === "string" ? sp.status : "all") as
    | "all" | "draft" | "in_progress" | "pending_approval" | "approved" | "archived";

  const supabase = await getServerSupabase();
  let q = supabase
    .from("projects")
    .select("id, name, status, updated_at, type, subtype, location, clients(name)")
    .order("updated_at", { ascending: false });
  if (filter !== "all") q = q.eq("status", filter);
  const { data: projects } = await q.returns<Array<{ id: string; name: string; status: string; updated_at: string; type: string; subtype: string | null; location: string | null; clients: { name: string } | { name: string }[] | null }>>();

  const filters: { value: typeof filter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "in_progress", label: "Em curso" },
    { value: "pending_approval", label: "Aguarda aprovação" },
    { value: "approved", label: "Aprovados" },
    { value: "archived", label: "Arquivados" },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-[family-name:var(--font-playfair)] tracking-tight">Projetos</h1>
        <Link href="/projects/new">
          <Button><Plus size={16} /> Novo</Button>
        </Link>
      </header>

      <nav className="flex gap-1 mb-6 panel p-1 w-fit">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/projects" : `/projects?status=${f.value}`}
            className={`px-3 py-1.5 rounded text-xs ${filter === f.value ? "bg-[var(--color-surface-2)] text-[var(--color-fg)]" : "text-muted"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {!projects || projects.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="text-muted">Sem projetos neste filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects.map((p) => {
            const meta = statusBadge[p.status as keyof typeof statusBadge] ?? statusBadge.draft;
            const clientName = Array.isArray(p.clients) ? p.clients[0]?.name : (p.clients as { name?: string } | null)?.name;
            return (
              <Link key={p.id as string} href={`/projects/${p.id}/inputs`} className="panel p-4 hover:border-[var(--color-accent)] transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium">{p.name as string}</h3>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <p className="text-xs text-muted">
                  {clientName ?? "Sem cliente"} · {p.type === "furniture" ? "Mobiliário" : "Espaço"}
                  {p.subtype ? ` · ${p.subtype}` : ""}
                  {p.location ? ` · ${p.location}` : ""}
                </p>
                <p className="text-xs text-muted mt-2">Atualizado {relTime(p.updated_at as string)}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
