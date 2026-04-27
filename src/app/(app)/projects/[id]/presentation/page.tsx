import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { PresentationClient } from "./client";

export default async function PresentationPage(props: PageProps<"/projects/[id]/presentation">) {
  const { id } = await props.params;
  const supabase = await getServerSupabase();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).single();
  if (!project) notFound();

  const { data: slides } = await supabase
    .from("slides")
    .select("id, position, type, content_json")
    .eq("project_id", id)
    .order("position", { ascending: true });

  return (
    <div className="h-[calc(100vh-7rem)]">
      <PresentationClient
        projectId={id}
        initial={(slides ?? []) as { id: string; position: number; type: string; content_json: Record<string, unknown> }[]}
      />
    </div>
  );
}
