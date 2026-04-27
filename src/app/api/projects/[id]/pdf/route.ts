import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { renderDossierPdf } from "@/lib/pdf/render";
import { renderPlanSvg } from "@/lib/pdf/plan-svg";
import type { PdfPayload } from "@/lib/pdf/template";
import type { PlanState } from "@/types/project";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]/pdf">) {
  const { id } = await ctx.params;
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, type, subtype, location, plan_json, clients(name), workspaces(name, address, phone, accent_color, logo_url)")
    .eq("id", id)
    .returns<Array<{
      id: string;
      name: string;
      type: string;
      subtype: string | null;
      location: string | null;
      plan_json: PlanState | null;
      clients: { name: string } | { name: string }[] | null;
      workspaces: { id?: string; name: string; address: string | null; phone: string | null; accent_color: string; logo_url: string | null } | null;
    }>>()
    .single();
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: slides } = await supabase
    .from("slides")
    .select("id, type, content_json, position")
    .eq("project_id", id)
    .order("position", { ascending: true });

  const ws = Array.isArray(project.workspaces) ? project.workspaces[0] : (project.workspaces as Record<string, unknown> | null);
  const client = Array.isArray(project.clients) ? project.clients[0] : (project.clients as Record<string, unknown> | null);

  const payload: PdfPayload = {
    studio: {
      name: (ws?.name as string) ?? "Studio",
      address: (ws?.address as string | null) ?? null,
      phone: (ws?.phone as string | null) ?? null,
      logoUrl: (ws?.logo_url as string | null) ?? null,
      accentColor: (ws?.accent_color as string) ?? "#d4a373",
    },
    project: {
      name: project.name as string,
      client: (client?.name as string | null) ?? null,
      date: new Date().toLocaleDateString("pt-PT"),
      type: project.type as string,
      subtype: (project.subtype as string | null) ?? null,
      location: (project.location as string | null) ?? null,
    },
    slides: (slides ?? []).map((s) => {
      const content = (s.content_json as Record<string, unknown>) ?? {};
      // Inject server-rendered plan SVGs for the "plan" slides so the PDF shows the real planta.
      if (s.type === "plan" && project.plan_json) {
        const variant = (content.variant as string) ?? "current_no_dims";
        const withDims = variant !== "current_no_dims";
        content.svg = renderPlanSvg(project.plan_json, {
          theme: "light",
          withDimensions: withDims,
          title: variant === "proposal" ? "PLANTA PROPOSTA" : variant === "current_with_dims" ? "PLANTA ATUAL — MEDIDAS" : "PLANTA ATUAL",
        });
      }
      return {
        id: s.id as string,
        type: s.type as string,
        content,
      };
    }),
  };

  try {
    const pdfBuffer = await renderDossierPdf(payload);
    const filename = `${project.name.toString().replace(/[^a-zA-Z0-9]+/g, "_")}.pdf`;

    // Persist to storage so subsequent fetches can be cached
    const path = `${(project.workspaces as { id?: string } | null)?.id ?? "ws"}/${id}/dossier.pdf`;
    await supabase.storage.from("pdfs").upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true }).catch(() => {});
    const { data: signed } = await supabase.storage.from("pdfs").createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signed?.signedUrl) {
      await supabase.from("projects").update({ pdf_url: signed.signedUrl, pdf_generated_at: new Date().toISOString() }).eq("id", id);
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
