"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Trash2, Sparkles, Pencil, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runInitialRenders, runIterativeEdit, favoriteRender, deleteRender } from "@/server/actions/ai";

type Render = {
  id: string;
  image_url: string;
  prompt_en: string;
  is_favorite: boolean;
  status: string;
};

export function RendersClient({ projectId, initial }: { projectId: string; initial: Render[] }) {
  const [renders, setRenders] = useState<Render[]>(initial);
  const [pending, startGen] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const router = useRouter();

  const generate = () =>
    startGen(async () => {
      const r = await runInitialRenders(projectId);
      if ("error" in r && r.error) toast.error(r.error);
      else toast.success(`${r.generated}/${r.total} imagens geradas.`);
      router.refresh();
    });

  const onFavorite = async (id: string, v: boolean) => {
    setRenders((s) => s.map((r) => (r.id === id ? { ...r, is_favorite: v } : r)));
    await favoriteRender(id, v);
  };

  const onDelete = async (id: string) => {
    setRenders((s) => s.filter((r) => r.id !== id));
    await deleteRender(id);
  };

  const onEdit = async (id: string) => {
    if (!editText.trim()) return;
    setEditing(null);
    const text = editText;
    setEditText("");
    toast.loading("A gerar variação...", { id: "edit" });
    const r = await runIterativeEdit(id, text);
    toast.dismiss("edit");
    if ("error" in r && r.error) toast.error(r.error);
    else {
      toast.success("Variação gerada.");
      router.refresh();
    }
  };

  return (
    <>
      {renders.length === 0 ? (
        <div className="panel p-16 text-center">
          <Sparkles size={32} className="text-[var(--color-accent)] mx-auto mb-4" />
          <h3 className="text-lg font-medium">Gerar 6 imagens iniciais</h3>
          <p className="text-sm text-muted mt-2 max-w-md mx-auto">
            A IA constrói prompts otimizados a partir da tua planta, estilo e referências. Demora ~5 segundos no total.
          </p>
          <Button onClick={generate} disabled={pending} size="lg" className="mt-6">
            {pending ? "A gerar..." : "✨ Gerar 6 imagens"}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted">{renders.length} imagens · {renders.filter((r) => r.is_favorite).length} favoritas</p>
            <Button variant="secondary" onClick={generate} disabled={pending}>
              {pending ? "A gerar..." : "Gerar mais 6"}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {renders.map((r) => (
              <div key={r.id} className="panel overflow-hidden group relative">
                {r.status === "generating" ? (
                  <div className="aspect-video bg-[var(--color-surface-2)] flex items-center justify-center text-muted text-sm animate-pulse">
                    A gerar...
                  </div>
                ) : r.status === "failed" ? (
                  <div className="aspect-video bg-[#3b1c1c] flex items-center justify-center text-[var(--color-danger)] text-sm">
                    Falhou. Tenta novamente.
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.image_url} alt="" className="w-full aspect-video object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconBtn onClick={() => setLightbox(r.image_url)} title="Ampliar"><Maximize2 size={12} /></IconBtn>
                      <IconBtn onClick={() => setEditing(r.id)} title="Editar"><Pencil size={12} /></IconBtn>
                      <IconBtn onClick={() => onDelete(r.id)} title="Apagar" danger><Trash2 size={12} /></IconBtn>
                    </div>
                    <button
                      onClick={() => onFavorite(r.id, !r.is_favorite)}
                      className={`absolute top-2 left-2 p-1.5 rounded ${r.is_favorite ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]" : "bg-black/50 text-white"}`}
                    >
                      <Heart size={12} fill={r.is_favorite ? "currentColor" : "none"} />
                    </button>
                  </>
                )}
                {editing === r.id && (
                  <div className="absolute inset-0 bg-black/80 p-4 flex flex-col gap-2 justify-center">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      placeholder="ex: mudar pavimento para deck madeira clara"
                      className="input-base text-sm"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(null)} className="btn btn-secondary flex-1 text-xs">
                        Cancelar
                      </button>
                      <button onClick={() => onEdit(r.id)} className="btn btn-primary flex-1 text-xs">
                        Gerar variação
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded bg-black/60 hover:${danger ? "bg-[var(--color-danger)]" : "bg-black/80"} text-white`}
    >
      {children}
    </button>
  );
}
