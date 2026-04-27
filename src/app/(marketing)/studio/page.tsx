import Link from "next/link";
import { Button } from "@/components/ui/button";

const comparisonRows: Array<[string, string, string, string]> = [
  ["Levantamento físico", "1-2 h", "1-2 h", "—"],
  ["Planta atual digital", "2-3 h", "15 min", "90%"],
  ["Moodboard / referências", "1-2 h", "2 min", "98%"],
  ["Planta layout proposta", "2-4 h", "10 min", "95%"],
  ["Modelação 3D SketchUp", "6-10 h", "—", "100%"],
  ["Renders fotorrealistas", "4-8 h", "5 min", "98%"],
  ["Vistas técnicas cotadas", "3-5 h", "10 s", "99%"],
  ["Dossiê PowerPoint", "4-6 h", "5 min", "97%"],
  ["TOTAL", "22-38 h", "~ 40 min", "~ 98%"],
];

export default function StudioLanding() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between p-6 max-w-6xl mx-auto w-full">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Interia<span className="text-[var(--color-accent)]">.</span>
        </Link>
        <Link href="/signup">
          <Button>Criar estúdio</Button>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-20">
        <section>
          <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-playfair)] tracking-tight leading-tight">
            De 30 horas em AutoCAD + SketchUp + V-Ray + InDesign para 30 minutos numa só plataforma.
          </h1>
          <p className="mt-6 text-muted">
            Interia é o substituto do fluxo manual usado por estúdios de design de interiores em Portugal.
            Carrega fotos, medidas e briefing — recebes plantas, renders, vistas técnicas e dossiê PDF
            no estilo do teu estúdio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Comparativo manual vs Interia</h2>
          <div className="panel overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left p-3 text-xs uppercase tracking-wide text-muted">Etapa</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wide text-muted">Manual</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wide text-muted">Interia</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wide text-muted">Redução</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(([etapa, manual, ai, red], i) => (
                  <tr
                    key={etapa}
                    className={
                      i === comparisonRows.length - 1
                        ? "border-t border-[var(--color-border)] bg-[var(--color-surface-2)] font-medium"
                        : "border-t border-[var(--color-border)]"
                    }
                  >
                    <td className="p-3">{etapa}</td>
                    <td className="p-3">{manual}</td>
                    <td className="p-3">{ai}</td>
                    <td className="p-3 text-[var(--color-accent)]">{red}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Planos</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              ["Solo", "49 €", "1 designer · 10 projetos/mês · 50 renders", "Designer freelance"],
              ["Studio", "79 €/seat", "Mín. 2 seats · projetos ilimitados · 200 renders/seat · sem watermark", "Estúdio pequeno-médio"],
              ["Pro", "99 €/seat", "Mín. 5 seats · renders ilimitados · API · DXF/DWG · suporte prioritário", "Estúdio grande, agência"],
            ].map(([name, price, includes, target], i) => (
              <div key={name} className={`panel p-5 ${i === 1 ? "border-[var(--color-accent)]" : ""}`}>
                {i === 1 && (
                  <span className="text-[10px] uppercase tracking-wider text-[var(--color-accent)]">
                    Recomendado
                  </span>
                )}
                <h3 className="text-lg font-medium mt-1">{name}</h3>
                <p className="text-2xl font-semibold mt-2">{price}</p>
                <p className="text-xs text-muted mt-3 leading-relaxed">{includes}</p>
                <p className="text-[11px] text-muted mt-3 italic">{target}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">Trial gratuito de 14 dias com 5 projetos e 30 renders. Sem cartão à entrada.</p>
        </section>

        <section className="text-center py-12">
          <h2 className="text-2xl font-[family-name:var(--font-playfair)]">Pronto para o primeiro projeto?</h2>
          <Link href="/signup" className="inline-block mt-6">
            <Button size="lg">Criar estúdio grátis</Button>
          </Link>
        </section>
      </main>
    </div>
  );
}
