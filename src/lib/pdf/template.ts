// Server-side PDF template — renders the same 14-slide structure as the editor,
// but as printable HTML+CSS (CSS Paged Media). Consumed by Puppeteer.

export type PdfPayload = {
  studio: { name: string; address?: string | null; phone?: string | null; logoUrl?: string | null; accentColor: string };
  project: { name: string; client?: string | null; date: string; type: string; subtype?: string | null; location?: string | null };
  slides: Array<{ id: string; type: string; content: Record<string, unknown> }>;
};

export function renderPdfHtml(p: PdfPayload): string {
  const accent = p.studio.accentColor;
  const slidesHtml = p.slides.map((s) => slideHtml(s, p, accent)).join("\n");
  return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(p.project.name)} · ${escapeHtml(p.studio.name)}</title>
<style>
  @page { size: 297mm 167mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: ${'"Inter", -apple-system, sans-serif'}; color: #1c1c20; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .slide { width: 297mm; height: 167mm; page-break-after: always; position: relative; overflow: hidden; }
  .slide.cover { display: flex; align-items: center; justify-content: center; text-align: center; padding: 40mm; border-top: 6mm solid ${accent}; }
  .slide.cover h1 { font-family: "Playfair Display", serif; font-size: 32pt; margin: 8mm 0 4mm; }
  .slide.cover .meta { color: #666; font-size: 11pt; letter-spacing: 0.05em; text-transform: uppercase; }
  .slide.separator { background: ${accent}; color: #1a1208; display: flex; align-items: center; justify-content: center; }
  .slide.separator h2 { font-family: "Playfair Display", serif; font-size: 36pt; margin: 0; letter-spacing: 0.04em; }
  .slide.grid { padding: 20mm; }
  .slide.grid .photos { display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(2, 1fr); gap: 4mm; height: 100%; }
  .slide.grid .photos img { width: 100%; height: 100%; object-fit: cover; }
  .slide.refs .photos { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); }
  .slide.render { padding: 20mm; }
  .slide.render .images { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; height: 100%; }
  .slide.render .images img { width: 100%; height: 100%; object-fit: cover; }
  .slide.render.single .images { grid-template-columns: 1fr; }
  .slide.render.single .images img { object-fit: contain; }
  .slide.technical { padding: 20mm; display: flex; flex-direction: column; gap: 4mm; align-items: center; justify-content: center; }
  .slide.technical .svgwrap { width: 100%; flex: 1; display: flex; align-items: center; justify-content: center; }
  .slide.technical svg { max-width: 100%; max-height: 100%; }
  .slide.contact { padding: 30mm; display: flex; align-items: flex-end; }
  .slide.contact h3 { font-family: "Playfair Display", serif; font-size: 22pt; margin: 0 0 4mm; }
  .slide.contact p { color: #555; font-size: 11pt; margin: 1mm 0; }
  .slide .footer { position: absolute; bottom: 6mm; right: 6mm; font-size: 7pt; color: #999; letter-spacing: 0.05em; text-transform: uppercase; }
  .slide .header { position: absolute; top: 6mm; left: 6mm; font-size: 7pt; color: #999; letter-spacing: 0.05em; text-transform: uppercase; }
</style>
</head>
<body>
${slidesHtml}
</body>
</html>`;
}

function slideHtml(slide: PdfPayload["slides"][number], p: PdfPayload, accent: string): string {
  const studioFooter = `<div class="footer">${escapeHtml(p.studio.name)}</div>`;
  const projectHeader = `<div class="header">${escapeHtml(p.project.name)}</div>`;

  switch (slide.type) {
    case "cover":
      return `<section class="slide cover">
        <div>
          <p class="meta">${escapeHtml(p.studio.name)}</p>
          <h1>${escapeHtml(p.project.name)}</h1>
          <p class="meta">${escapeHtml(p.project.client ?? "")} · ${escapeHtml(p.project.date)}</p>
        </div>
      </section>`;

    case "separator":
      return `<section class="slide separator"><h2>${escapeHtml(String(slide.content.text ?? ""))}</h2></section>`;

    case "photo_grid":
    case "reference_grid": {
      const urls = (slide.content.urls as string[] | undefined) ?? [];
      const variantClass = slide.type === "reference_grid" ? "grid refs" : "grid";
      const imgs = urls.slice(0, 8).map((u) => `<img src="${escapeAttr(u)}" />`).join("");
      return `<section class="slide ${variantClass}">${projectHeader}<div class="photos">${imgs}</div>${studioFooter}</section>`;
    }

    case "render": {
      const urls = (slide.content.urls as string[] | undefined) ?? [];
      const cls = urls.length === 1 ? "render single" : "render";
      const imgs = urls.slice(0, 4).map((u) => `<img src="${escapeAttr(u)}" />`).join("");
      return `<section class="slide ${cls}">${projectHeader}<div class="images">${imgs}</div>${studioFooter}</section>`;
    }

    case "technical": {
      const svgs = (slide.content.svgs as string[] | undefined) ?? [];
      const block = svgs.slice(0, 1).map((s) => `<div class="svgwrap">${invertSvgColors(s)}</div>`).join("");
      return `<section class="slide technical" style="background:${accent}10">${projectHeader}${block}${studioFooter}</section>`;
    }

    case "contact":
      return `<section class="slide contact">
        <div>
          <h3>${escapeHtml(p.studio.name)}</h3>
          <p>${escapeHtml(p.studio.address ?? "")}</p>
          <p>${escapeHtml(p.studio.phone ?? "")}</p>
        </div>
      </section>`;

    case "plan":
    default:
      return `<section class="slide" style="display:flex;align-items:center;justify-content:center;color:#999;font-size:11pt">${projectHeader}— Planta —${studioFooter}</section>`;
  }
}

function invertSvgColors(svg: string): string {
  // The technical SVG is dark-themed for the editor; re-paint for the printed page.
  return svg
    .replace(/fill="#131316"/g, 'fill="white"')
    .replace(/fill="#9b9ba3"/g, 'fill="#444"')
    .replace(/fill="#f4f4f5"/g, 'fill="#222"')
    .replace(/stroke="#9b9ba3"/g, 'stroke="#777"')
    .replace(/stroke="#f4f4f5"/g, 'stroke="#222"');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
