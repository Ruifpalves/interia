"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Line,
  Rect,
  Circle,
  Text,
  Group,
  Image as KonvaImage,
} from "react-konva";
import type Konva from "konva";
import useImage from "use-image";
import {
  MousePointer2,
  Square,
  Circle as CircleIcon,
  RectangleHorizontal,
  Ruler as RulerIcon,
  Type as TypeIcon,
  Save,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Trash2,
  ImagePlus,
  DoorOpen,
  Eye,
  EyeOff,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import type {
  PlanState,
  Shape,
  ModuleShape,
  CircleShape,
  DimensionShape,
  AnnotationShape,
  WallShape,
  DoorShape,
} from "@/types/project";
import { saveProjectField } from "@/server/actions/projects";
import { createUploadUrl, registerAsset } from "@/server/actions/uploads";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { formatM } from "@/lib/utils/format";

const M_TO_PX = 100;
const GRID_M = 0.05;
const ALIGN_TOLERANCE_PX = 8;

type Tool = "select" | "wall" | "module" | "circle" | "door" | "dimension" | "annotation";

type LayerKey = "walls" | "modules" | "doors" | "dimensions" | "annotations" | "background";

const isOnLayer: Record<Shape["kind"], LayerKey> = {
  wall: "walls",
  module: "modules",
  circle: "modules",
  door: "doors",
  dimension: "dimensions",
  annotation: "annotations",
};

export function PlanEditor({ projectId, initial }: { projectId: string; initial: PlanState }) {
  const [tool, setTool] = useState<Tool>("select");
  const [plan, setPlan] = useState<PlanState>(initial);
  const [history, setHistory] = useState<PlanState[]>([initial]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 60, y: 60 });
  const [selected, setSelected] = useState<string[]>([]);
  const [drawingFrom, setDrawingFrom] = useState<{ x: number; y: number } | null>(null);
  const [cursorM, setCursorM] = useState({ x: 0, y: 0 });
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    walls: true,
    modules: true,
    doors: true,
    dimensions: true,
    annotations: true,
    background: true,
  });
  const [alignGuides, setAlignGuides] = useState<{ vertical?: number; horizontal?: number }>({});
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize({ w: Math.max(400, r.width), h: Math.max(400, r.height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const pushHistory = (next: PlanState) => {
    const trimmed = history.slice(0, historyIdx + 1);
    trimmed.push(next);
    setHistory(trimmed.slice(-100));
    setHistoryIdx(Math.min(trimmed.length - 1, 99));
  };

  const update = (next: PlanState) => {
    setPlan(next);
    pushHistory(next);
  };

  // Auto-save every 30s
  useEffect(() => {
    const t = setInterval(() => {
      saveProjectField(projectId, "plan_json", plan).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [plan, projectId]);

  const save = async () => {
    const r = await saveProjectField(projectId, "plan_json", plan);
    if ("error" in r && r.error) toast.error(r.error);
    else toast.success("Planta guardada.");
  };

  const undo = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      setPlan(history[historyIdx - 1]);
    }
  };
  const redo = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      setPlan(history[historyIdx + 1]);
    }
  };

  const snap = (v: number) => Math.round(v / GRID_M) * GRID_M;
  const stageToM = (clientX: number, clientY: number) => ({
    x: (clientX - stagePos.x) / (M_TO_PX * zoom),
    y: (clientY - stagePos.y) / (M_TO_PX * zoom),
  });

  // Snap-to-alignment: candidate values from existing shapes
  const alignCandidates = useMemo(() => {
    const xs = new Set<number>();
    const ys = new Set<number>();
    for (const s of plan.shapes) {
      if (s.kind === "module") {
        xs.add(s.x);
        xs.add(s.x + s.width);
        ys.add(s.y);
        ys.add(s.y + s.height);
      } else if (s.kind === "wall") {
        xs.add(s.x1);
        xs.add(s.x2);
        ys.add(s.y1);
        ys.add(s.y2);
      } else if (s.kind === "circle") {
        xs.add(s.x);
        ys.add(s.y);
      }
    }
    return { xs: Array.from(xs), ys: Array.from(ys) };
  }, [plan.shapes]);

  const snapAligned = (v: number, axis: "x" | "y") => {
    const candidates = axis === "x" ? alignCandidates.xs : alignCandidates.ys;
    const tol = ALIGN_TOLERANCE_PX / (M_TO_PX * zoom);
    const hit = candidates.find((c) => Math.abs(c - v) < tol);
    return hit !== undefined ? { v: hit, hit: true } : { v: snap(v), hit: false };
  };

  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) return;
    const stage = e.target.getStage()!;
    const ptr = stage.getPointerPosition()!;
    const m = stageToM(ptr.x, ptr.y);

    if (tool === "select") {
      // Marquee selection
      if (!e.evt.shiftKey) setSelected([]);
      setMarquee({ x1: m.x, y1: m.y, x2: m.x, y2: m.y });
      return;
    }
    if (tool === "wall" || tool === "dimension") {
      setDrawingFrom({ x: snap(m.x), y: snap(m.y) });
      return;
    }
    if (tool === "module") {
      const id = crypto.randomUUID();
      const newShape: ModuleShape = {
        id,
        kind: "module",
        x: snap(m.x),
        y: snap(m.y),
        width: 0.925,
        height: 0.85,
        label: "",
        fill: "#2A2A2A",
      };
      update({ ...plan, shapes: [...plan.shapes, newShape] });
      setSelected([id]);
      setTool("select");
      return;
    }
    if (tool === "door") {
      const id = crypto.randomUUID();
      const newShape: DoorShape = {
        id,
        kind: "door",
        x: snap(m.x),
        y: snap(m.y),
        width: 0.8,
      };
      update({ ...plan, shapes: [...plan.shapes, newShape] });
      setSelected([id]);
      setTool("select");
      return;
    }
    if (tool === "circle") {
      const id = crypto.randomUUID();
      const newShape: CircleShape = { id, kind: "circle", x: snap(m.x), y: snap(m.y), radius: 0.275, label: "Termoacumulador" };
      update({ ...plan, shapes: [...plan.shapes, newShape] });
      setSelected([id]);
      setTool("select");
      return;
    }
    if (tool === "annotation") {
      const text = window.prompt("Texto da anotação:");
      if (text) {
        const id = crypto.randomUUID();
        const newShape: AnnotationShape = { id, kind: "annotation", x: snap(m.x), y: snap(m.y), text };
        update({ ...plan, shapes: [...plan.shapes, newShape] });
      }
      setTool("select");
    }
  };

  const onMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const ptr = e.target.getStage()?.getPointerPosition();
    if (!ptr) return;
    const m = stageToM(ptr.x, ptr.y);
    setCursorM({ x: snap(m.x), y: snap(m.y) });
    if (marquee) setMarquee({ ...marquee, x2: m.x, y2: m.y });
  };

  const onMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (marquee) {
      const x1 = Math.min(marquee.x1, marquee.x2);
      const x2 = Math.max(marquee.x1, marquee.x2);
      const y1 = Math.min(marquee.y1, marquee.y2);
      const y2 = Math.max(marquee.y1, marquee.y2);
      // Only consider it a marquee if dragged more than ~5cm
      if (Math.hypot(x2 - x1, y2 - y1) > 0.05) {
        const inside = plan.shapes.filter((s) => isShapeInside(s, x1, y1, x2, y2)).map((s) => s.id);
        setSelected((cur) => (e.evt.shiftKey ? Array.from(new Set([...cur, ...inside])) : inside));
      }
      setMarquee(null);
      return;
    }
    if (!drawingFrom) return;
    const stage = e.target.getStage()!;
    const ptr = stage.getPointerPosition()!;
    const m = stageToM(ptr.x, ptr.y);
    const to = { x: snap(m.x), y: snap(m.y) };

    if (Math.hypot(to.x - drawingFrom.x, to.y - drawingFrom.y) < 0.05) {
      setDrawingFrom(null);
      return;
    }

    if (tool === "wall") {
      const id = crypto.randomUUID();
      const w: WallShape = { id, kind: "wall", x1: drawingFrom.x, y1: drawingFrom.y, x2: to.x, y2: to.y, thickness: 0.15 };
      update({ ...plan, shapes: [...plan.shapes, w] });
    } else if (tool === "dimension") {
      const id = crypto.randomUUID();
      const d: DimensionShape = { id, kind: "dimension", x1: drawingFrom.x, y1: drawingFrom.y, x2: to.x, y2: to.y };
      update({ ...plan, shapes: [...plan.shapes, d] });
    }

    setDrawingFrom(null);
    setTool("select");
  };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current!;
    const oldScale = zoom;
    const ptr = stage.getPointerPosition()!;
    const mPos = { x: (ptr.x - stagePos.x) / oldScale, y: (ptr.y - stagePos.y) / oldScale };
    const newScale = Math.max(0.2, Math.min(4, oldScale + (e.evt.deltaY < 0 ? 0.1 : -0.1)));
    setZoom(newScale);
    setStagePos({ x: ptr.x - mPos.x * newScale, y: ptr.y - mPos.y * newScale });
  };

  const onShapeUpdate = (id: string, patch: Partial<Shape>) => {
    update({
      ...plan,
      shapes: plan.shapes.map((s) => (s.id === id ? ({ ...s, ...patch } as Shape) : s)),
    });
  };

  const onShapeDrag = (s: Shape, x: number, y: number) => {
    const xs = snapAligned(x, "x");
    const ys = snapAligned(y, "y");
    setAlignGuides({
      vertical: xs.hit ? xs.v : undefined,
      horizontal: ys.hit ? ys.v : undefined,
    });
    return { x: xs.v, y: ys.v };
  };

  const removeSelected = () => {
    if (selected.length === 0) return;
    update({ ...plan, shapes: plan.shapes.filter((s) => !selected.includes(s.id)) });
    setSelected([]);
  };

  const onPickShape = (id: string, additive: boolean) => {
    setSelected((cur) =>
      additive
        ? cur.includes(id)
          ? cur.filter((x) => x !== id)
          : [...cur, id]
        : [id],
    );
  };

  // Background image upload
  const onBackgroundPick = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) return toast.error("Imagem demasiado grande. Máx. 10 MB.");
    const sign = await createUploadUrl(projectId, "floorplan_input", file.name);
    if ("error" in sign) return toast.error(sign.error);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.storage.from(sign.bucket).uploadToSignedUrl(sign.path, sign.token, file, { contentType: file.type });
    if (error) return toast.error(error.message);
    const reg = await registerAsset(projectId, "floorplan_input", sign.path, { size: file.size });
    if ("error" in reg) return toast.error(reg.error);
    if (!reg.asset.url) return toast.error("Não foi possível obter URL da imagem.");
    update({
      ...plan,
      background: { url: reg.asset.url, opacity: 0.5, scale: 1, x: 0, y: 0 },
    });
    toast.success("Imagem de fundo carregada. Ajusta opacidade e escala no painel direito.");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
        else if (e.key === "s") { e.preventDefault(); save(); }
        else if (e.key === "a") {
          e.preventDefault();
          setSelected(plan.shapes.map((s) => s.id));
        }
      } else {
        if (e.key === "v") setTool("select");
        else if (e.key === "w") setTool("wall");
        else if (e.key === "m") setTool("module");
        else if (e.key === "c") setTool("dimension");
        else if (e.key === "d") setTool("door");
        else if (e.key === "Delete" || e.key === "Backspace") removeSelected();
        else if (e.key === "Escape") {
          setSelected([]);
          setTool("select");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, historyIdx, history, plan]);

  const selectedShapes = plan.shapes.filter((s) => selected.includes(s.id));
  const visibleShapes = plan.shapes.filter((s) => layers[isOnLayer[s.kind]]);

  const gridLines = useMemo(() => {
    const lines: { points: number[]; major: boolean }[] = [];
    const step = GRID_M * M_TO_PX;
    const w = plan.widthM * M_TO_PX;
    const h = plan.heightM * M_TO_PX;
    for (let x = 0; x <= w; x += step) lines.push({ points: [x, 0, x, h], major: Math.abs(x % M_TO_PX) < 0.01 });
    for (let y = 0; y <= h; y += step) lines.push({ points: [0, y, w, y], major: Math.abs(y % M_TO_PX) < 0.01 });
    return lines;
  }, [plan.widthM, plan.heightM]);

  return (
    <div className="flex h-[calc(100vh-7rem)]">
      {/* Toolbar */}
      <div className="w-14 border-r border-[var(--color-border)] flex flex-col items-center py-3 gap-1 bg-[var(--color-surface)]">
        <ToolBtn icon={<MousePointer2 size={16} />} active={tool === "select"} onClick={() => setTool("select")} title="Selecionar (V)" />
        <ToolBtn icon={<Square size={16} />} active={tool === "wall"} onClick={() => setTool("wall")} title="Parede (W)" />
        <ToolBtn icon={<DoorOpen size={16} />} active={tool === "door"} onClick={() => setTool("door")} title="Porta (D)" />
        <ToolBtn icon={<RectangleHorizontal size={16} />} active={tool === "module"} onClick={() => setTool("module")} title="Módulo (M)" />
        <ToolBtn icon={<CircleIcon size={16} />} active={tool === "circle"} onClick={() => setTool("circle")} title="Círculo" />
        <ToolBtn icon={<RulerIcon size={16} />} active={tool === "dimension"} onClick={() => setTool("dimension")} title="Cota (C)" />
        <ToolBtn icon={<TypeIcon size={16} />} active={tool === "annotation"} onClick={() => setTool("annotation")} title="Anotação" />
        <div className="my-2 h-px w-8 bg-[var(--color-border)]" />
        <ToolBtn icon={<ImagePlus size={16} />} onClick={() => fileInputRef.current?.click()} title="Importar imagem de fundo" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) onBackgroundPick(e.target.files[0]);
            e.currentTarget.value = "";
          }}
        />
        <div className="my-2 h-px w-8 bg-[var(--color-border)]" />
        <ToolBtn icon={<Undo2 size={16} />} onClick={undo} title="Desfazer (⌘Z)" />
        <ToolBtn icon={<Redo2 size={16} />} onClick={redo} title="Refazer (⌘⇧Z)" />
        <ToolBtn icon={<Save size={16} />} onClick={save} title="Guardar (⌘S)" />
        <div className="my-2 h-px w-8 bg-[var(--color-border)]" />
        <ToolBtn icon={<ZoomIn size={16} />} onClick={() => setZoom((z) => Math.min(4, z + 0.2))} title="Zoom in" />
        <ToolBtn icon={<ZoomOut size={16} />} onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))} title="Zoom out" />
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[var(--color-bg)]">
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          x={stagePos.x}
          y={stagePos.y}
          scaleX={zoom}
          scaleY={zoom}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onWheel={onWheel}
          draggable={tool === "select" && !marquee}
          onDragEnd={(e) => {
            if (e.target === e.target.getStage()) setStagePos({ x: e.target.x(), y: e.target.y() });
          }}
        >
          <Layer listening={false}>
            <Rect x={0} y={0} width={plan.widthM * M_TO_PX} height={plan.heightM * M_TO_PX} fill="#1c1c20" />
            {gridLines.map((g, i) => (
              <Line key={i} points={g.points} stroke={g.major ? "#3a3a44" : "#252530"} strokeWidth={g.major ? 1 : 0.5} />
            ))}
          </Layer>

          {plan.background && layers.background && (
            <Layer listening={false} opacity={plan.background.opacity}>
              <BackgroundImage
                url={plan.background.url}
                x={plan.background.x * M_TO_PX}
                y={plan.background.y * M_TO_PX}
                scale={plan.background.scale}
              />
            </Layer>
          )}

          <Layer>
            {visibleShapes.map((s) => (
              <ShapeNode
                key={s.id}
                shape={s}
                selected={selected.includes(s.id)}
                onPick={onPickShape}
                onDrag={onShapeDrag}
                onDragEnd={(x, y) => {
                  const p = onShapeDrag(s, x, y);
                  setAlignGuides({});
                  if (s.kind === "module" || s.kind === "circle" || s.kind === "annotation" || s.kind === "door") {
                    onShapeUpdate(s.id, { x: p.x, y: p.y });
                  }
                }}
              />
            ))}

            {drawingFrom && (
              <Line
                points={[drawingFrom.x * M_TO_PX, drawingFrom.y * M_TO_PX, cursorM.x * M_TO_PX, cursorM.y * M_TO_PX]}
                stroke="#d4a373"
                strokeWidth={2}
                dash={[4, 4]}
              />
            )}

            {marquee && (
              <Rect
                x={Math.min(marquee.x1, marquee.x2) * M_TO_PX}
                y={Math.min(marquee.y1, marquee.y2) * M_TO_PX}
                width={Math.abs(marquee.x2 - marquee.x1) * M_TO_PX}
                height={Math.abs(marquee.y2 - marquee.y1) * M_TO_PX}
                fill="rgba(212,163,115,0.1)"
                stroke="#d4a373"
                strokeWidth={1}
                dash={[3, 3]}
              />
            )}

            {alignGuides.vertical !== undefined && (
              <Line
                points={[alignGuides.vertical * M_TO_PX, 0, alignGuides.vertical * M_TO_PX, plan.heightM * M_TO_PX]}
                stroke="#d4a373"
                strokeWidth={0.7}
                dash={[2, 4]}
              />
            )}
            {alignGuides.horizontal !== undefined && (
              <Line
                points={[0, alignGuides.horizontal * M_TO_PX, plan.widthM * M_TO_PX, alignGuides.horizontal * M_TO_PX]}
                stroke="#d4a373"
                strokeWidth={0.7}
                dash={[2, 4]}
              />
            )}
          </Layer>
        </Stage>

        {/* Status bar */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs text-muted bg-[var(--color-surface)]/80 backdrop-blur px-3 py-1.5 rounded">
          <span>
            X: {formatM(cursorM.x)} m · Y: {formatM(cursorM.y)} m · zoom {Math.round(zoom * 100)}%
            {selected.length > 1 && ` · ${selected.length} selecionados`}
          </span>
          <span>{plan.shapes.length} elementos</span>
        </div>

        {/* Layers toggle */}
        <div className="absolute top-3 right-3 panel p-2 text-xs">
          <p className="flex items-center gap-1 mb-2 text-muted uppercase tracking-wide text-[10px]">
            <Layers size={11} /> Camadas
          </p>
          {(["walls", "modules", "doors", "dimensions", "annotations", "background"] as LayerKey[]).map((k) => (
            <label key={k} className="flex items-center justify-between gap-3 py-0.5 cursor-pointer">
              <span className="capitalize">{layerLabel[k]}</span>
              <button
                type="button"
                onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}
                className="text-muted hover:text-[var(--color-fg)]"
              >
                {layers[k] ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-80 border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 overflow-y-auto">
        {selectedShapes.length === 0 ? (
          <div className="text-sm text-muted space-y-3">
            <p>Sem seleção. Atalhos:</p>
            <ul className="space-y-1 text-xs">
              <li>V — Selecionar · drag para marquee</li>
              <li>Shift+click — adicionar à seleção</li>
              <li>W — Parede · D — Porta · M — Módulo · C — Cota</li>
              <li>⌘A — Selecionar tudo</li>
              <li>Delete — Apagar seleção</li>
            </ul>
            {plan.background && (
              <BackgroundPanel
                background={plan.background}
                onChange={(bg) => update({ ...plan, background: bg })}
                onRemove={() => update({ ...plan, background: undefined })}
              />
            )}
          </div>
        ) : selectedShapes.length === 1 ? (
          <PropertyPanel
            shape={selectedShapes[0]}
            onUpdate={(p) => onShapeUpdate(selectedShapes[0].id, p)}
            onDelete={() => removeSelected()}
          />
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">{selectedShapes.length} elementos</h3>
            <button onClick={removeSelected} className="btn btn-secondary w-full">
              <Trash2 size={14} /> Apagar todos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const layerLabel: Record<LayerKey, string> = {
  walls: "Paredes",
  modules: "Mobiliário",
  doors: "Portas",
  dimensions: "Cotas",
  annotations: "Anotações",
  background: "Imagem fundo",
};

function isShapeInside(s: Shape, x1: number, y1: number, x2: number, y2: number): boolean {
  const inX = (x: number) => x >= x1 && x <= x2;
  const inY = (y: number) => y >= y1 && y <= y2;
  if (s.kind === "module") return inX(s.x) && inY(s.y) && inX(s.x + s.width) && inY(s.y + s.height);
  if (s.kind === "wall") return inX(s.x1) && inY(s.y1) && inX(s.x2) && inY(s.y2);
  if (s.kind === "circle") return inX(s.x) && inY(s.y);
  if (s.kind === "annotation" || s.kind === "door") return inX(s.x) && inY(s.y);
  if (s.kind === "dimension") return inX(s.x1) && inY(s.y1) && inX(s.x2) && inY(s.y2);
  return false;
}

function BackgroundImage({ url, x, y, scale }: { url: string; x: number; y: number; scale: number }) {
  const [img] = useImage(url, "anonymous");
  if (!img) return null;
  return <KonvaImage image={img} x={x} y={y} scaleX={scale} scaleY={scale} />;
}

function ShapeNode({
  shape,
  selected,
  onPick,
  onDragEnd,
}: {
  shape: Shape;
  selected: boolean;
  onPick: (id: string, additive: boolean) => void;
  onDrag: (s: Shape, x: number, y: number) => { x: number; y: number };
  onDragEnd: (x: number, y: number) => void;
}) {
  const accent = "#d4a373";
  if (shape.kind === "wall") {
    return (
      <Line
        points={[shape.x1 * M_TO_PX, shape.y1 * M_TO_PX, shape.x2 * M_TO_PX, shape.y2 * M_TO_PX]}
        stroke={selected ? accent : "#f4f4f5"}
        strokeWidth={shape.thickness * M_TO_PX}
        lineCap="round"
        onMouseDown={(e) => {
          e.cancelBubble = true;
          onPick(shape.id, e.evt.shiftKey);
        }}
      />
    );
  }
  if (shape.kind === "module") {
    return (
      <Group
        x={shape.x * M_TO_PX}
        y={shape.y * M_TO_PX}
        rotation={shape.rotation ?? 0}
        draggable
        onMouseDown={(e) => {
          e.cancelBubble = true;
          onPick(shape.id, e.evt.shiftKey);
        }}
        onDragEnd={(e) => onDragEnd(e.target.x() / M_TO_PX, e.target.y() / M_TO_PX)}
      >
        <Rect
          width={shape.width * M_TO_PX}
          height={shape.height * M_TO_PX}
          fill={shape.fill ?? "#2A2A2A"}
          stroke={selected ? accent : "#9b9ba3"}
          strokeWidth={1}
        />
        {shape.label && (
          <Text text={shape.label} x={4} y={4} fill="#f4f4f5" fontSize={12} width={shape.width * M_TO_PX - 8} />
        )}
      </Group>
    );
  }
  if (shape.kind === "circle") {
    return (
      <Group
        x={shape.x * M_TO_PX}
        y={shape.y * M_TO_PX}
        draggable
        onMouseDown={(e) => {
          e.cancelBubble = true;
          onPick(shape.id, e.evt.shiftKey);
        }}
        onDragEnd={(e) => onDragEnd(e.target.x() / M_TO_PX, e.target.y() / M_TO_PX)}
      >
        <Circle radius={shape.radius * M_TO_PX} stroke={selected ? accent : "#9b9ba3"} strokeWidth={1} dash={[6, 4]} />
        {shape.label && <Text text={shape.label} x={shape.radius * M_TO_PX + 4} y={-6} fill="#9b9ba3" fontSize={11} />}
      </Group>
    );
  }
  if (shape.kind === "door") {
    const w = shape.width * M_TO_PX;
    return (
      <Group
        x={shape.x * M_TO_PX}
        y={shape.y * M_TO_PX}
        rotation={shape.rotation ?? 0}
        draggable
        onMouseDown={(e) => {
          e.cancelBubble = true;
          onPick(shape.id, e.evt.shiftKey);
        }}
        onDragEnd={(e) => onDragEnd(e.target.x() / M_TO_PX, e.target.y() / M_TO_PX)}
      >
        <Line points={[0, 0, w, 0]} stroke={selected ? accent : "#d4a373"} strokeWidth={2} />
        <Line points={[0, 0, w * 0.71, w * 0.71]} stroke={selected ? accent : "#d4a37388"} strokeWidth={1} dash={[3, 2]} />
      </Group>
    );
  }
  if (shape.kind === "dimension") {
    const dx = shape.x2 - shape.x1;
    const dy = shape.y2 - shape.y1;
    const len = Math.hypot(dx, dy);
    const value = formatM(shape.override ?? len);
    const midX = ((shape.x1 + shape.x2) / 2) * M_TO_PX;
    const midY = ((shape.y1 + shape.y2) / 2) * M_TO_PX;
    return (
      <Group
        onMouseDown={(e) => {
          e.cancelBubble = true;
          onPick(shape.id, e.evt.shiftKey);
        }}
      >
        <Line
          points={[shape.x1 * M_TO_PX, shape.y1 * M_TO_PX, shape.x2 * M_TO_PX, shape.y2 * M_TO_PX]}
          stroke={selected ? accent : "#d4a37388"}
          strokeWidth={1}
        />
        <Circle x={shape.x1 * M_TO_PX} y={shape.y1 * M_TO_PX} radius={3} fill={accent} />
        <Circle x={shape.x2 * M_TO_PX} y={shape.y2 * M_TO_PX} radius={3} fill={accent} />
        <Text x={midX} y={midY - 14} text={value} fill={accent} fontSize={12} fontStyle="bold" />
      </Group>
    );
  }
  if (shape.kind === "annotation") {
    return (
      <Group
        x={shape.x * M_TO_PX}
        y={shape.y * M_TO_PX}
        draggable
        onMouseDown={(e) => {
          e.cancelBubble = true;
          onPick(shape.id, e.evt.shiftKey);
        }}
        onDragEnd={(e) => onDragEnd(e.target.x() / M_TO_PX, e.target.y() / M_TO_PX)}
      >
        <Text text={shape.text} fill={selected ? accent : "#f4f4f5"} fontSize={13} />
      </Group>
    );
  }
  return null;
}

function ToolBtn({ icon, active, onClick, title }: { icon: React.ReactNode; active?: boolean; onClick?: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${active ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]" : "text-muted hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"}`}
    >
      {icon}
    </button>
  );
}

function PropertyPanel({
  shape,
  onUpdate,
  onDelete,
}: {
  shape: Shape;
  onUpdate: (patch: Partial<Shape>) => void;
  onDelete: () => void;
}) {
  if (shape.kind === "module") {
    return (
      <div className="space-y-3">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Módulo</h3>
          <button onClick={onDelete} className="text-[var(--color-danger)] hover:opacity-80">
            <Trash2 size={14} />
          </button>
        </header>
        <Field label="X (m)" value={shape.x} onChange={(v) => onUpdate({ x: v } as Partial<ModuleShape>)} />
        <Field label="Y (m)" value={shape.y} onChange={(v) => onUpdate({ y: v } as Partial<ModuleShape>)} />
        <Field label="Largura (m)" value={shape.width} onChange={(v) => onUpdate({ width: v } as Partial<ModuleShape>)} />
        <Field label="Altura (m)" value={shape.height} onChange={(v) => onUpdate({ height: v } as Partial<ModuleShape>)} />
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Etiqueta</span>
          <input
            value={shape.label ?? ""}
            onChange={(e) => onUpdate({ label: e.target.value } as Partial<ModuleShape>)}
            className="input-base"
          />
        </label>
      </div>
    );
  }
  if (shape.kind === "wall") {
    return (
      <div className="space-y-3">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Parede</h3>
          <button onClick={onDelete} className="text-[var(--color-danger)] hover:opacity-80">
            <Trash2 size={14} />
          </button>
        </header>
        <Field label="X1" value={shape.x1} onChange={(v) => onUpdate({ x1: v } as Partial<WallShape>)} />
        <Field label="Y1" value={shape.y1} onChange={(v) => onUpdate({ y1: v } as Partial<WallShape>)} />
        <Field label="X2" value={shape.x2} onChange={(v) => onUpdate({ x2: v } as Partial<WallShape>)} />
        <Field label="Y2" value={shape.y2} onChange={(v) => onUpdate({ y2: v } as Partial<WallShape>)} />
        <Field label="Espessura (m)" value={shape.thickness} onChange={(v) => onUpdate({ thickness: v } as Partial<WallShape>)} />
      </div>
    );
  }
  if (shape.kind === "door") {
    return (
      <div className="space-y-3">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Porta</h3>
          <button onClick={onDelete} className="text-[var(--color-danger)] hover:opacity-80">
            <Trash2 size={14} />
          </button>
        </header>
        <Field label="X" value={shape.x} onChange={(v) => onUpdate({ x: v } as Partial<DoorShape>)} />
        <Field label="Y" value={shape.y} onChange={(v) => onUpdate({ y: v } as Partial<DoorShape>)} />
        <Field label="Largura (m)" value={shape.width} onChange={(v) => onUpdate({ width: v } as Partial<DoorShape>)} />
        <Field label="Rotação" value={shape.rotation ?? 0} onChange={(v) => onUpdate({ rotation: v } as Partial<DoorShape>)} />
      </div>
    );
  }
  if (shape.kind === "dimension") {
    return (
      <div className="space-y-3">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Cota</h3>
          <button onClick={onDelete} className="text-[var(--color-danger)] hover:opacity-80">
            <Trash2 size={14} />
          </button>
        </header>
        <Field
          label="Override (m)"
          value={shape.override ?? Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1)}
          onChange={(v) => onUpdate({ override: v } as Partial<DimensionShape>)}
        />
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium capitalize">{shape.kind}</h3>
      <button onClick={onDelete} className="btn btn-secondary w-full">
        <Trash2 size={14} /> Apagar
      </button>
    </div>
  );
}

function BackgroundPanel({
  background,
  onChange,
  onRemove,
}: {
  background: NonNullable<PlanState["background"]>;
  onChange: (bg: PlanState["background"]) => void;
  onRemove: () => void;
}) {
  return (
    <div className="panel-2 p-3 space-y-3 mt-4">
      <p className="text-xs uppercase tracking-wide text-muted">Imagem de fundo</p>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Opacidade ({Math.round(background.opacity * 100)}%)</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={background.opacity}
          onChange={(e) => onChange({ ...background, opacity: parseFloat(e.target.value) })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Escala ({background.scale.toFixed(2)}×)</span>
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.05}
          value={background.scale}
          onChange={(e) => onChange({ ...background, scale: parseFloat(e.target.value) })}
        />
      </label>
      <button onClick={onRemove} className="btn btn-secondary w-full text-xs">
        <Trash2 size={12} /> Remover imagem
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <input
        type="number"
        step="0.005"
        value={Number.isFinite(value) ? value.toFixed(3) : ""}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="input-base"
      />
    </label>
  );
}
