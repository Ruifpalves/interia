import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { ProjectSettingsClient } from "./client";

export default async function ProjectSettingsPage(props: PageProps<"/projects/[id]/settings">) {
  const { id } = await props.params;
  const supabase = await getServerSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, status, type, subtype, location")
    .eq("id", id)
    .single();
  if (!project) notFound();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-medium mb-1">Definições do projeto</h2>
      <p className="text-sm text-muted mb-6">Renomear, arquivar, apagar.</p>
      <ProjectSettingsClient
        projectId={id}
        initialName={project.name as string}
        initialStatus={project.status as string}
      />
    </div>
  );
}
