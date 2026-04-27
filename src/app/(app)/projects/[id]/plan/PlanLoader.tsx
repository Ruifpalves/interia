"use client";

import dynamic from "next/dynamic";
import type { PlanState } from "@/types/project";

const PlanEditor = dynamic(() => import("@/components/editor/PlanEditor").then((m) => m.PlanEditor), {
  ssr: false,
  loading: () => <div className="p-8 text-[var(--color-fg-muted)]">A carregar editor...</div>,
});

export function PlanLoader({ projectId, initial }: { projectId: string; initial: PlanState }) {
  return <PlanEditor projectId={projectId} initial={initial} />;
}
