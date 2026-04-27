"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateTechnicalAction } from "@/server/actions/technical";

const labels: Record<string, string> = {
  front_closed: "Vista frontal — portas fechadas",
  front_open_lateral: "Vista frontal aberta + lateral",
  lateral: "Vista lateral",
};

export function TechnicalClient({
  projectId,
  initial,
}: {
  projectId: string;
  initial: { id: string; view_type: string; svg: string }[];
}) {
  const [views] = useState(initial);
  const [pending, startGen] = useTransition();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initial[0]?.view_type ?? "front_closed");

  const generate = () =>
    startGen(async () => {
      const r = await generateTechnicalAction(projectId);
      if ("error" in r && r.error) toast.error(r.error);
      else toast.success(`${r.generated} vistas geradas.`);
      router.refresh();
    });

  if (views.length === 0) {
    return (
      <div className="panel p-16 text-center">
        <h3 className="text-lg font-medium">Sem vistas geradas</h3>
        <p className="text-sm text-muted mt-2 max-w-md mx-auto">
          Configura a planta com módulos. Demora ~10 segundos a gerar 3 vistas com cotas e anotações.
        </p>
        <Button onClick={generate} disabled={pending} size="lg" className="mt-6">
          {pending ? "A gerar..." : "Gerar vistas técnicas"}
        </Button>
      </div>
    );
  }

  const active = views.find((v) => v.view_type === activeTab) ?? views[0];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 panel p-1">
          {views.map((v) => (
            <button
              key={v.view_type}
              onClick={() => setActiveTab(v.view_type)}
              className={`px-3 py-1.5 rounded text-xs ${activeTab === v.view_type ? "bg-[var(--color-surface-2)] text-[var(--color-fg)]" : "text-muted"}`}
            >
              {labels[v.view_type] ?? v.view_type}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={generate} disabled={pending}>
            {pending ? "A regenerar..." : "Regenerar"}
          </Button>
          <a
            href={`/api/projects/${projectId}/dxf`}
            className="btn btn-secondary"
            download
          >
            ⬇ DXF
          </a>
        </div>
      </div>
      <div className="panel p-6 overflow-x-auto" dangerouslySetInnerHTML={{ __html: active.svg }} />
    </>
  );
}
