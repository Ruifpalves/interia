import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSession } from "@/server/queries/workspace";
import { getServerSupabase } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { relTime } from "@/lib/utils/format";

const statusBadge = {
  draft: { tone: "neutral" as const, label: "Rascunho" },
  in_progress: { tone: "info" as const, label: "Em curso" },
  pending_approval: { tone: "warning" as const, label: "Aguarda aprovação" },
  approved: { tone: "success" as const, label: "Aprovado" },
  archived: { tone: "neutral" as const, label: "Arquivado" },
};

export default async function DashboardPage() {
  const session = await requireSession();
  const supabase = await getServerSupabase();

  const [{ count: activeCount }, { count: monthCount }, { count: rendersCount }, { data: recent }] =
    await Promise.all([
      supabase.from("projects").select("*", { count: "exact", head: true }).neq("status", "archived"),
      supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase
        .from("renders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase
        .from("projects")
        .select("id, name, status, updated_at, type, subtype, location, clients(name)")
        .order("updated_at", { ascending: false })
        .limit(10)
        .returns<Array<{ id: string; name: string; status: string; updated_at: string; type: string; subtype: string | null; location: string | null; clients: { name: string } | { name: string }[] | null }>>(),
    ]);

  const greeting = session.fullName ? session.fullName.split(" ")[0] : "designer";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-playfair)] tracking-tight">Olá, {greeting}.</h1>
          <p className="text-sm text-muted mt-1">Bom trabalho hoje.</p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus size={16} /> Novo projeto
          </Button>
        </Link>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Stat label="Projetos ativos" value={activeCount ?? 0} />
        <Stat label="Projetos este mês" value={monthCount ?? 0} />
        <Stat label="Renders este mês" value={rendersCount ?? 0} />
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-muted mb-3">Recentes</h2>
        {!recent || recent.length === 0 ? (
          <div className="panel p-12 text-center">
            <p className="text-muted">Ainda sem projetos.</p>
            <Link href="/projects/new" className="inline-block mt-4">
              <Button>Criar primeiro projeto</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recent.map((p) => {
              const meta = statusBadge[p.status as keyof typeof statusBadge] ?? statusBadge.draft;
              const clientName = Array.isArray(p.clients)
                ? p.clients[0]?.name
                : (p.clients as { name?: string } | null)?.name;
              return (
                <Link key={p.id as string} href={`/projects/${p.id}/inputs`} className="panel p-4 hover:border-[var(--color-accent)] transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium">{p.name as string}</h3>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                  <p className="text-xs text-muted">
                    {clientName ?? "Sem cliente"} · {p.type === "furniture" ? "Mobiliário" : "Espaço"}
                    {p.subtype ? ` · ${p.subtype}` : ""}
                  </p>
                  <p className="text-xs text-muted mt-2">Atualizado {relTime(p.updated_at as string)}</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-5">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="text-3xl font-[family-name:var(--font-playfair)] mt-2">{value}</p>
    </div>
  );
}
