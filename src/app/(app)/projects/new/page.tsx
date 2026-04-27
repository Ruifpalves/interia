import { getServerSupabase } from "@/lib/supabase/server";
import { NewProjectForm } from "./form";

export default async function NewProjectPage() {
  const supabase = await getServerSupabase();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-[family-name:var(--font-playfair)] tracking-tight mb-6">Novo projeto</h1>
      <NewProjectForm clients={(clients ?? []) as { id: string; name: string }[]} />
    </div>
  );
}
