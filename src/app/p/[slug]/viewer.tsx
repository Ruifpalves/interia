"use client";

import { useState } from "react";
import { MessageCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { SlidePreview } from "@/components/project/SlidePreview";
import { Button } from "@/components/ui/button";

type Slide = { id: string; type: string; content_json: Record<string, unknown>; position: number };
type Comment = { id: string; slide_id: string | null; author_name: string; text: string; created_at: string };

export function PublicViewer({
  projectId,
  projectName,
  clientName,
  studioName,
  accentColor,
  logoUrl,
  allowComments,
  requireApproval,
  slides,
  initialComments,
}: {
  projectId: string;
  projectName: string;
  clientName: string;
  studioName: string;
  accentColor: string;
  logoUrl: string | null;
  allowComments: boolean;
  requireApproval: boolean;
  slides: Slide[];
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [openComment, setOpenComment] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [text, setText] = useState("");
  const [approving, setApproving] = useState(false);

  const submitComment = async (slideId: string) => {
    if (!authorName.trim() || !text.trim()) return;
    const r = await fetch(`/api/share/${projectId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slideId, authorName, text }),
    });
    if (r.ok) {
      const c = (await r.json()) as Comment;
      setComments((s) => [...s, c]);
      setText("");
      setOpenComment(null);
      toast.success("Comentário enviado.");
    } else toast.error("Não foi possível enviar.");
  };

  const approve = async () => {
    if (!authorName.trim()) {
      toast.error("Indica o teu nome no painel de comentários primeiro.");
      return;
    }
    setApproving(true);
    const r = await fetch(`/api/share/${projectId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName }),
    });
    setApproving(false);
    if (r.ok) toast.success("Projeto aprovado.");
    else toast.error("Não foi possível aprovar.");
  };

  return (
    <div style={{ ["--color-accent" as string]: accentColor }}>
      <header className="flex items-center justify-between p-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={studioName} className="h-8" />
          ) : (
            <span className="text-lg font-semibold">{studioName}</span>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm">{projectName}</p>
          <p className="text-xs text-muted">{clientName}</p>
        </div>
      </header>

      <main>
        {slides.map((s) => {
          const slideComments = comments.filter((c) => c.slide_id === s.id);
          return (
            <section key={s.id} className="min-h-screen flex items-center justify-center p-6 relative">
              <div className="w-full max-w-5xl">
                <SlidePreview type={s.type} content={s.content_json} accent={accentColor} />
                {slideComments.length > 0 && (
                  <div className="mt-3 panel p-3 space-y-2">
                    {slideComments.map((c) => (
                      <div key={c.id} className="text-xs">
                        <span className="text-[var(--color-accent)]">{c.author_name}</span>
                        <span className="text-muted ml-2">· {new Date(c.created_at).toLocaleString("pt-PT")}</span>
                        <p className="mt-1">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {allowComments && (
                <button
                  onClick={() => setOpenComment(openComment === s.id ? null : s.id)}
                  className="fixed bottom-6 right-6 p-3 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-lg z-40"
                  title="Comentar"
                >
                  <MessageCircle size={18} />
                </button>
              )}
              {openComment === s.id && (
                <div className="fixed bottom-20 right-6 panel p-4 w-80 z-40">
                  <input
                    placeholder="O teu nome"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="input-base mb-2 text-sm"
                  />
                  <textarea
                    placeholder="Comentário..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="input-base text-sm min-h-20 mb-2"
                  />
                  <Button onClick={() => submitComment(s.id)} className="w-full">
                    Enviar
                  </Button>
                </div>
              )}
            </section>
          );
        })}

        {requireApproval && (
          <section className="min-h-[40vh] flex flex-col items-center justify-center text-center p-12 border-t border-[var(--color-border)]">
            <h2 className="text-xl font-[family-name:var(--font-playfair)] mb-2">Pronto para aprovar?</h2>
            <p className="text-sm text-muted mb-6 max-w-md">
              A aprovação confirma ao estúdio que o projeto pode avançar. O estúdio é notificado automaticamente.
            </p>
            <Button size="lg" disabled={approving} onClick={approve}>
              <Check size={16} /> {approving ? "A aprovar..." : "Aprovar projeto"}
            </Button>
          </section>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-muted">
        Apresentação powered by <a href="/" className="hover:text-[var(--color-fg)]">Interia</a>
      </footer>
    </div>
  );
}
