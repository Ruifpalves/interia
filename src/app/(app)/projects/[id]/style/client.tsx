"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveProjectField } from "@/server/actions/projects";
import type { StyleState } from "@/types/project";

const styleOptions: { value: StyleState["style"]; label: string; desc: string }[] = [
  { value: "minimalista", label: "Minimalista", desc: "Linhas limpas, branco/cinza, materiais naturais" },
  { value: "contemporaneo_escuro", label: "Contemporâneo Escuro", desc: "Preto antracite, metais, vidros" },
  { value: "industrial", label: "Industrial", desc: "Betão, ferro, madeira recuperada" },
  { value: "classico", label: "Clássico", desc: "Madeiras nobres, simetria, ornamentos" },
  { value: "mediterraneo", label: "Mediterrâneo", desc: "Branco, terracota, madeiras claras" },
];

const paletteSuggestions: Record<StyleState["style"], string[]> = {
  minimalista: ["#FFFFFF", "#E5E5E5", "#9C9C9C", "#3F3F3F", "#C7B198", "#86846A"],
  contemporaneo_escuro: ["#2A2A2A", "#404040", "#888888", "#F5F5F0", "#6B5340", "#3A4A3F"],
  industrial: ["#48433D", "#7C7268", "#BBA994", "#E1D7C9", "#3D3528", "#1A1611"],
  classico: ["#3B2B1B", "#7E5B3F", "#BFA77A", "#E8D9C0", "#1F1B16", "#A9221F"],
  mediterraneo: ["#F4ECDD", "#E5C9A4", "#C77F4A", "#5E5044", "#9CA98D", "#23272F"],
};

const materialOptions = {
  portas: ["MDF lacado preto", "Termolaminado", "Lacado mate preto", "Madeira natural", "Vidro fumado"],
  interior: ["Melamina preta", "Cinza grafite", "Madeira clara", "Branco"],
  acabamentos: ["Lamelas decorativas", "Vidros", "Espelhos", "Tecidos"],
};

export function StyleClient({ projectId, initial }: { projectId: string; initial: StyleState }) {
  const [style, setStyle] = useState<StyleState>(initial);
  const [pending, startSaving] = useTransition();

  const update = (patch: Partial<StyleState>) => setStyle((s) => ({ ...s, ...patch }));

  const save = () =>
    startSaving(async () => {
      const r = await saveProjectField(projectId, "style_json", style);
      if ("error" in r && r.error) toast.error(r.error);
      else toast.success("Estilo guardado.");
    });

  const toggleArr = (arr: string[] | undefined, value: string) => {
    const cur = arr ?? [];
    return cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
  };

  return (
    <div className="space-y-8">
      {/* Style cards */}
      <Section title="Estilo">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {styleOptions.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => update({ style: s.value, palette: paletteSuggestions[s.value] })}
              className={`panel-2 p-4 text-left ${style.style === s.value ? "border-[var(--color-accent)]" : ""}`}
            >
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted mt-1">{s.desc}</p>
            </button>
          ))}
        </div>
      </Section>

      {/* Palette */}
      <Section title="Paleta principal">
        <div className="flex flex-wrap gap-2">
          {style.palette.map((c, i) => (
            <div key={`${c}-${i}`} className="flex flex-col items-center">
              <input
                type="color"
                value={c}
                onChange={(e) => {
                  const next = [...style.palette];
                  next[i] = e.target.value;
                  update({ palette: next });
                }}
                className="h-12 w-12 rounded border border-[var(--color-border)] bg-transparent"
              />
              <code className="text-[10px] mt-1 text-muted">{c}</code>
            </div>
          ))}
          <button
            onClick={() => update({ palette: [...style.palette, "#888888"] })}
            className="h-12 w-12 panel-2 flex items-center justify-center text-muted hover:text-[var(--color-fg)]"
          >
            +
          </button>
        </div>
      </Section>

      {/* Materials */}
      {(["portas", "interior", "acabamentos"] as const).map((key) => (
        <Section key={key} title={`Materiais — ${key}`}>
          <div className="flex flex-wrap gap-2">
            {materialOptions[key].map((m) => {
              const active = (style.materials[key] ?? []).includes(m);
              return (
                <button
                  key={m}
                  onClick={() =>
                    update({
                      materials: { ...style.materials, [key]: toggleArr(style.materials[key], m) },
                    })
                  }
                  className={`px-3 py-1.5 text-xs rounded-full border ${
                    active
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                      : "border-[var(--color-border)] text-muted"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </Section>
      ))}

      {/* Elements */}
      <Section title="Elementos especiais">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            ["led", "Iluminação LED com sensor"],
            ["portasRecolhiveis", "Portas recolhíveis"],
            ["varao", "Varão de cabides"],
            ["lamelas", "Lamelas decorativas"],
            ["bancada", "Bancada de trabalho"],
            ["softClose", "Gavetas soft-close"],
          ].map(([key, label]) => {
            const active = !!(style.elements as Record<string, boolean>)[key];
            return (
              <label key={key} className={`panel-2 p-3 text-sm flex items-center gap-2 cursor-pointer ${active ? "border-[var(--color-accent)]" : ""}`}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => update({ elements: { ...style.elements, [key]: !active } })}
                />
                {label}
              </label>
            );
          })}
        </div>
      </Section>

      {/* Scene */}
      <Section title="Cena (para os renders)">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            ["mesa", "Mesa exterior 6 lugares"],
            ["cadeiras", "Cadeiras tecido cinza"],
            ["deck", "Pavimento em deck"],
            ["plantas", "Plantas em vasos"],
            ["iluminacaoSuspensa", "Iluminação suspensa"],
          ].map(([key, label]) => {
            const active = !!(style.scene as Record<string, boolean>)[key];
            return (
              <label key={key} className={`panel-2 p-3 text-sm flex items-center gap-2 cursor-pointer ${active ? "border-[var(--color-accent)]" : ""}`}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => update({ scene: { ...style.scene, [key]: !active } })}
                />
                {label}
              </label>
            );
          })}
        </div>
      </Section>

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-xs text-muted flex items-center gap-2">
          <Sparkles size={12} /> A IA usa estas escolhas para construir os prompts dos renders.
        </p>
        <Button onClick={save} disabled={pending}>
          {pending ? "A guardar..." : "Guardar estilo"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      {children}
    </section>
  );
}
