import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import type { PlanState } from "@/types/project";
import { PlanLoader } from "./PlanLoader";

export default async function PlanPage(props: PageProps<"/projects/[id]/plan">) {
  const { id } = await props.params;
  const supabase = await getServerSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id, plan_json, measurements_json, type")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const initial = (project.plan_json as PlanState | null) ?? defaultPlan(project.measurements_json as Record<string, number> | null);

  return <PlanLoader projectId={id} initial={initial} />;
}

function defaultPlan(measurements: Record<string, number> | null): PlanState {
  const w = (measurements?.largura_total_m as number) || 5.6;
  const h = (measurements?.profundidade_m as number) || 4.65;
  return {
    version: 1,
    widthM: w,
    heightM: h,
    shapes: [
      { id: "w-top", kind: "wall", x1: 0, y1: 0, x2: w, y2: 0, thickness: 0.15 },
      { id: "w-right", kind: "wall", x1: w, y1: 0, x2: w, y2: h, thickness: 0.15 },
      { id: "w-bottom", kind: "wall", x1: 0, y1: h, x2: w, y2: h, thickness: 0.15 },
      { id: "w-left", kind: "wall", x1: 0, y1: 0, x2: 0, y2: h, thickness: 0.15 },
    ],
  };
}
