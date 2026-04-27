// Compact slide preview component, shared by both the presentation editor
// and the print template (server-rendered for PDF).

export type SlideContent = Record<string, unknown>;

export function SlidePreview({
  type,
  content,
  small,
  accent = "#d4a373",
}: {
  type: string;
  content: SlideContent;
  small?: boolean;
  accent?: string;
}) {
  const cls = small
    ? "aspect-video bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-[8px] overflow-hidden"
    : "aspect-video bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-sm overflow-hidden flex flex-col";

  switch (type) {
    case "cover":
      return (
        <div className={cls + " flex items-center justify-center text-center"} style={{ borderColor: accent }}>
          <div>
            <p className="uppercase tracking-widest text-muted" style={{ fontSize: small ? 6 : 11 }}>
              {String(content.studio ?? "Estúdio")}
            </p>
            <h1 className="mt-2" style={{ fontSize: small ? 11 : 28, fontFamily: "var(--font-playfair)" }}>
              {String(content.title ?? "Projeto")}
            </h1>
            <p className="text-muted mt-2" style={{ fontSize: small ? 7 : 13 }}>
              {String(content.client ?? "")} · {String(content.date ?? "")}
            </p>
          </div>
        </div>
      );
    case "separator":
      return (
        <div className={cls + " flex items-center justify-center"} style={{ background: accent, color: "#1a1208" }}>
          <h2 style={{ fontSize: small ? 12 : 36, fontFamily: "var(--font-playfair)" }}>
            {String(content.text ?? "")}
          </h2>
        </div>
      );
    case "photo_grid":
    case "reference_grid":
      return (
        <div className={cls + " p-3 grid grid-cols-4 gap-1"}>
          {((content.urls as string[] | undefined) ?? []).slice(0, 8).map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={u} alt="" className="aspect-square object-cover rounded-sm" />
          ))}
        </div>
      );
    case "plan":
      return (
        <div className={cls + " flex items-center justify-center text-muted"} style={{ fontSize: small ? 7 : 11 }}>
          {String(content.variant ?? "plan")} · planta da projeto
        </div>
      );
    case "render":
      return (
        <div className={cls + " p-2 grid grid-cols-2 gap-1"}>
          {((content.urls as string[] | undefined) ?? []).slice(0, 4).map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={u} alt="" className="aspect-video object-cover rounded-sm" />
          ))}
        </div>
      );
    case "technical":
      return (
        <div className={cls + " p-2 grid grid-cols-2 gap-1"}>
          {((content.svgs as string[] | undefined) ?? []).slice(0, 2).map((svg, i) => (
            <div key={i} className="aspect-video overflow-hidden rounded-sm" dangerouslySetInnerHTML={{ __html: svg }} />
          ))}
        </div>
      );
    case "contact":
      return (
        <div className={cls + " flex items-end p-6"}>
          <div>
            <p className="font-medium" style={{ fontSize: small ? 9 : 16 }}>{String(content.studio ?? "")}</p>
            <p className="text-muted" style={{ fontSize: small ? 7 : 11 }}>{String(content.address ?? "")}</p>
            <p className="text-muted" style={{ fontSize: small ? 7 : 11 }}>{String(content.phone ?? "")}</p>
          </div>
        </div>
      );
    default:
      return <div className={cls + " flex items-center justify-center text-muted"}>—</div>;
  }
}
