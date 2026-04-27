import { requireSession } from "@/server/queries/workspace";

export default async function SettingsPage() {
  const session = await requireSession();
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-[family-name:var(--font-playfair)] tracking-tight mb-6">Definições</h1>
      <div className="panel p-6 space-y-3">
        <Row label="Estúdio" value={session.workspaceName} />
        <Row label="Plano" value={session.plan} />
        <Row label="Cor de acento">
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 rounded" style={{ background: session.accentColor }} />
            <code className="text-xs">{session.accentColor}</code>
          </span>
        </Row>
      </div>
      <p className="text-xs text-muted mt-4">
        Edição completa de branding, equipa e templates: ver{" "}
        <a href="/team" className="text-[var(--color-accent)]">Equipa</a> ·{" "}
        <a href="/billing" className="text-[var(--color-accent)]">Faturação</a>.
      </p>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted text-xs uppercase tracking-wide">{label}</span>
      <span>{children ?? value}</span>
    </div>
  );
}
