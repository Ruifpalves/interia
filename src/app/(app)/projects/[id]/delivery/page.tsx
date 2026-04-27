import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { DeliveryClient } from "./client";
import { env } from "@/lib/env";

export default async function DeliveryPage(props: PageProps<"/projects/[id]/delivery">) {
  const { id } = await props.params;
  const supabase = await getServerSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, share_slug, share_allow_comments, share_require_approval, share_password_hash, pdf_url")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const shareUrl = project.share_slug ? `${env.appUrl}/p/${project.share_slug}` : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-lg font-medium mb-1">Entrega ao cliente</h2>
      <p className="text-sm text-muted mb-6">PDF, link partilhável e ficheiro DXF para o marceneiro.</p>
      <DeliveryClient
        projectId={id}
        projectName={project.name as string}
        pdfUrl={project.pdf_url as string | null}
        shareUrl={shareUrl}
        shareSettings={{
          allowComments: !!project.share_allow_comments,
          requireApproval: !!project.share_require_approval,
          hasPassword: !!project.share_password_hash,
        }}
      />
    </div>
  );
}
