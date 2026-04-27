import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { TechnicalClient } from "./client";

export default async function TechnicalPage(props: PageProps<"/projects/[id]/technical">) {
  const { id } = await props.params;
  const supabase = await getServerSupabase();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).single();
  if (!project) notFound();

  const { data: views } = await supabase
    .from("technical_views")
    .select("id, view_type, svg")
    .eq("project_id", id)
    .order("view_type", { ascending: true });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-lg font-medium">Vistas técnicas</h2>
      <p className="text-sm text-muted mb-6">Geradas proceduralmente da planta. Exporta em PDF e DXF para o marceneiro.</p>
      <TechnicalClient projectId={id} initial={(views ?? []) as { id: string; view_type: string; svg: string }[]} />
    </div>
  );
}
