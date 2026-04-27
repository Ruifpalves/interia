import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { InputsClient } from "./client";

export default async function InputsPage(props: PageProps<"/projects/[id]/inputs">) {
  const { id } = await props.params;
  const supabase = await getServerSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id, type, briefing_text, measurements_json")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const { data: assets } = await supabase
    .from("assets")
    .select("id, url, thumbnail_url, kind, is_cover, tag")
    .eq("project_id", id);

  const photos = (assets ?? []).filter((a) => a.kind === "photo");
  const references = (assets ?? []).filter((a) => a.kind === "reference");
  const floorplanInputs = (assets ?? []).filter((a) => a.kind === "floorplan_input");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium">Inputs</h2>
          <p className="text-sm text-muted">Carrega tudo o que tens sobre o projeto. A IA estrutura o resto.</p>
        </div>
        <Link href={`/projects/${id}/plan`}>
          <Button>Continuar para Planta →</Button>
        </Link>
      </div>

      <InputsClient
        projectId={id}
        projectType={project.type as "furniture" | "space"}
        initialBriefing={(project.briefing_text as string | null) ?? ""}
        initialMeasurements={(project.measurements_json as Record<string, unknown> | null) ?? null}
        initialPhotos={photos as { id: string; url: string; thumbnail_url: string; is_cover: boolean }[]}
        initialReferences={references as { id: string; url: string; thumbnail_url: string; tag: string | null }[]}
        initialFloorplans={floorplanInputs as { id: string; url: string; thumbnail_url: string }[]}
      />
    </div>
  );
}
