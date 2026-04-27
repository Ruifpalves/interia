import { getServerSupabase } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export default async function TeamPage() {
  const supabase = await getServerSupabase();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, joined_at"),
    supabase.from("invites").select("id, email, role, created_at").is("accepted_at", null),
  ]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-[family-name:var(--font-playfair)] tracking-tight mb-6">Equipa</h1>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Membros</h2>
        <div className="panel divide-y divide-[var(--color-border)]">
          {members?.map((m) => (
            <div key={m.id as string} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{(m.full_name as string) || (m.email as string)}</p>
                <p className="text-xs text-muted">{m.email as string}</p>
              </div>
              <Badge tone={m.role === "owner" ? "accent" : "neutral"}>{m.role as string}</Badge>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Convites pendentes</h2>
        {!invites || invites.length === 0 ? (
          <p className="text-sm text-muted">Sem convites pendentes.</p>
        ) : (
          <div className="panel divide-y divide-[var(--color-border)]">
            {invites.map((i) => (
              <div key={i.id as string} className="p-4 flex items-center justify-between">
                <p className="text-sm">{i.email as string}</p>
                <Badge tone="warning">Pendente</Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
