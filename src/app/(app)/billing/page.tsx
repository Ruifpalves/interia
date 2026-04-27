import { requireSession } from "@/server/queries/workspace";
import { Badge } from "@/components/ui/badge";

const planLabel = {
  trial: "Trial",
  solo: "Solo",
  studio: "Studio",
  pro: "Pro",
} as const;

const planPrice = {
  trial: "Grátis · 14 dias",
  solo: "49 €/mês",
  studio: "79 €/seat/mês",
  pro: "99 €/seat/mês",
} as const;

export default async function BillingPage() {
  const session = await requireSession();
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-[family-name:var(--font-playfair)] tracking-tight mb-6">Faturação</h1>
      <div className="panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Plano atual</p>
            <p className="text-2xl mt-1">{planLabel[session.plan]}</p>
            <p className="text-sm text-muted">{planPrice[session.plan]}</p>
          </div>
          <Badge tone={session.plan === "trial" ? "warning" : "success"}>
            {session.plan === "trial" ? "Trial" : "Ativo"}
          </Badge>
        </div>
        {session.plan === "trial" && session.trialEndsAt && (
          <p className="text-xs text-muted mt-4">
            Trial termina a {new Intl.DateTimeFormat("pt-PT").format(new Date(session.trialEndsAt))}.
          </p>
        )}
        <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
          <form action="/api/stripe/portal" method="post">
            <button type="submit" className="btn btn-secondary">
              Abrir portal de pagamento
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
