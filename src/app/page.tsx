import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-6 max-w-6xl mx-auto w-full">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Interia<span className="text-[var(--color-accent)]">.</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn btn-ghost text-sm">
            Entrar
          </Link>
          <Link href="/signup">
            <Button>Criar estúdio</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center text-center px-6 pt-16 pb-24 max-w-3xl mx-auto w-full">
        <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-accent)] mb-4">
          Beta privado · Abril 2026
        </span>
        <h1 className="text-5xl md:text-6xl font-[family-name:var(--font-playfair)] leading-[1.05] tracking-tight">
          Projetos completos de design de interiores em <em className="text-[var(--color-accent)]">30 minutos</em>.
        </h1>
        <p className="mt-6 text-lg text-muted max-w-xl">
          Plantas, vistas técnicas cotadas, renders fotorrealistas e dossiê PDF profissional —
          gerados por IA, com a marca do teu estúdio.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link href="/signup">
            <Button size="lg">Começar grátis 14 dias</Button>
          </Link>
          <Link href="/studio">
            <Button size="lg" variant="secondary">
              Ver demonstração
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted">Sem cartão à entrada.</p>

        <section className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {[
            ["Editor 2D", "Plantas com cotagem automática, snap a grelha, camadas. Importa fundo de planta a mão."],
            ["Renders IA", "Imagens fotorrealistas geradas em segundos a partir da planta + estilo escolhido."],
            ["Dossiê pronto", "PDF profissional no template do teu estúdio. Link partilhável para o cliente."],
          ].map(([t, d]) => (
            <div key={t} className="panel p-5">
              <h3 className="text-sm font-medium mb-1">{t}</h3>
              <p className="text-xs text-muted leading-relaxed">{d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] py-6 text-xs text-muted text-center">
        © 2026 Interia · Data Script Swiss GmbH
      </footer>
    </div>
  );
}
