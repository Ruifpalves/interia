import { getServerSupabase } from "@/lib/supabase/server";

export default async function ClientsPage() {
  const supabase = await getServerSupabase();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, phone, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-[family-name:var(--font-playfair)] tracking-tight mb-6">Clientes</h1>
      {!clients || clients.length === 0 ? (
        <div className="panel p-12 text-center text-muted">
          Sem clientes ainda. Cria o primeiro a partir de um projeto novo.
        </div>
      ) : (
        <div className="panel divide-y divide-[var(--color-border)]">
          {clients.map((c) => (
            <div key={c.id as string} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{c.name as string}</p>
                <p className="text-xs text-muted">
                  {(c.email as string) || "sem email"} · {(c.phone as string) || "sem telefone"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
