import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { RendersClient } from "./client";

export default async function RendersPage(props: PageProps<"/projects/[id]/renders">) {
  const { id } = await props.params;
  const supabase = await getServerSupabase();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).single();
  if (!project) notFound();

  const { data: renders } = await supabase
    .from("renders")
    .select("id, image_url, prompt_en, is_favorite, status, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-lg font-medium">Renders</h2>
      <p className="text-sm text-muted mb-6">
        A IA gera 6 imagens iniciais a partir da planta + estilo. Pede variações ou edita iterativamente.
      </p>
      <RendersClient
        projectId={id}
        initial={(renders ?? []) as { id: string; image_url: string; prompt_en: string; is_favorite: boolean; status: string }[]}
      />
    </div>
  );
}
