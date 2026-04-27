import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { StyleClient } from "./client";
import type { StyleState } from "@/types/project";

export default async function StylePage(props: PageProps<"/projects/[id]/style">) {
  const { id } = await props.params;
  const supabase = await getServerSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("style_json")
    .eq("id", id)
    .single();
  if (!project) notFound();
  const initial: StyleState = (project.style_json as StyleState | null) ?? defaultStyle();
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-lg font-medium">Direção criativa</h2>
      <p className="text-sm text-muted mb-6">Escolhe estilo, paleta, materiais. Sem prompts — só cliques.</p>
      <StyleClient projectId={id} initial={initial} />
    </div>
  );
}

function defaultStyle(): StyleState {
  return {
    version: 1,
    style: "contemporaneo_escuro",
    palette: ["#2A2A2A", "#404040", "#888888", "#F5F5F0", "#6B5340", "#3A4A3F"],
    materials: { portas: ["Lacado mate preto"], interior: ["Melamina preta"], acabamentos: [] },
    elements: { led: false, portasRecolhiveis: false, varao: false, lamelas: false, bancada: false, softClose: false },
    scene: { mesa: false, cadeiras: false, deck: false, plantas: false, iluminacaoSuspensa: false },
  };
}
