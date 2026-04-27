"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateInitialSlides, reorderSlides, deleteSlide } from "@/server/actions/slides";
import { SlidePreview } from "@/components/project/SlidePreview";
import { Trash2 } from "lucide-react";

type Slide = {
  id: string;
  position: number;
  type: string;
  content_json: Record<string, unknown>;
};

export function PresentationClient({ projectId, initial }: { projectId: string; initial: Slide[] }) {
  const [slides, setSlides] = useState(initial);
  const [active, setActive] = useState(initial[0]?.id ?? null);
  const [pendingGen, startGen] = useTransition();
  const router = useRouter();

  const generate = () =>
    startGen(async () => {
      const r = await generateInitialSlides(projectId);
      if ("error" in r && r.error) toast.error(r.error);
      else toast.success(`${r.generated} slides criados.`);
      router.refresh();
    });

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    const next = arrayMove(slides, oldIndex, newIndex);
    setSlides(next);
    await reorderSlides(projectId, next.map((s) => s.id));
  };

  const onDelete = async (id: string) => {
    setSlides((s) => s.filter((x) => x.id !== id));
    await deleteSlide(id);
  };

  if (slides.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="panel p-12 text-center max-w-md">
          <h3 className="text-lg font-medium">Sem slides</h3>
          <p className="text-sm text-muted mt-2">
            Compõe o dossiê com 14 slides padrão a partir das fotos, referências, renders e vistas técnicas existentes.
          </p>
          <Button onClick={generate} disabled={pendingGen} className="mt-6">
            {pendingGen ? "A compor..." : "Compor dossiê"}
          </Button>
        </div>
      </div>
    );
  }

  const activeSlide = slides.find((s) => s.id === active) ?? slides[0];

  return (
    <div className="grid grid-cols-[200px_1fr_280px] h-full">
      <aside className="border-r border-[var(--color-border)] overflow-y-auto p-2 bg-[var(--color-surface)]">
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {slides.map((s, i) => (
              <SlideThumb
                key={s.id}
                slide={s}
                idx={i + 1}
                active={s.id === active}
                onClick={() => setActive(s.id)}
                onDelete={() => onDelete(s.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </aside>

      <main className="p-6 overflow-y-auto bg-[var(--color-bg)]">
        <SlidePreview type={activeSlide.type} content={activeSlide.content_json} />
      </main>

      <aside className="border-l border-[var(--color-border)] p-4 bg-[var(--color-surface)]">
        <h3 className="text-sm font-medium mb-3">Detalhes</h3>
        <p className="text-xs text-muted">Tipo: <code>{activeSlide.type}</code></p>
        <p className="text-xs text-muted mt-1">Posição: {slides.findIndex((s) => s.id === active) + 1}</p>
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <a href={`/api/projects/${projectId}/pdf`} className="btn btn-primary w-full">
            Gerar PDF final
          </a>
        </div>
      </aside>
    </div>
  );
}

function SlideThumb({
  slide,
  idx,
  active,
  onClick,
  onDelete,
}: {
  slide: Slide;
  idx: number;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: slide.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`mb-2 p-1 rounded cursor-pointer group relative ${active ? "ring-2 ring-[var(--color-accent)]" : ""}`}
    >
      <SlidePreview type={slide.type} content={slide.content_json} small />
      <p className="text-[10px] text-muted mt-1">{idx}. {labelFor(slide.type)}</p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
}

function labelFor(type: string) {
  return (
    {
      cover: "Capa",
      separator: "Separador",
      plan: "Planta",
      photo_grid: "Fotos",
      reference_grid: "Referências",
      render: "Renders",
      technical: "Técnico",
      contact: "Contactos",
      custom: "Custom",
    } as Record<string, string>
  )[type] ?? type;
}
