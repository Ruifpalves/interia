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
} from "react-konva";
import type Konva from "konva";
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
} from "lucide-react";
import { toast } from "sonner";
import type { PlanState, Shape, ModuleShape, CircleShape, DimensionShape, AnnotationShape, WallShape } from "@/types/project";
import { saveProjectField } from "@/server/actions/projects";
import { formatM } from "@/lib/utils/format";

// 1 metre = 100 px at zoom 1.
const M_TO_PX = 100;
const GRID_M = 0.05;

type Tool = "select" | "wall" | "module" | "circle" | "dimension" | "annotation";

export function PlanEditor({ projectId, initial }: { projectId: string; initial: PlanState }) {
  const [tool, setTool] = useState<Tool>("select");
  const [plan, setPlan] = useState<PlanState>(initial);
  const [history, setHistory] = useState<PlanState[]>([initial]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 60, y: 60 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawingFrom, setDrawingFrom] = useState<{ x: number; y: number } | null>(null);
  const [cursorM, setCursorM] = useState({ x: 0, y: 0 });
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });

  // Track viewport size
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

  // Snap helper
  const snap = (v: number) => Math.round(v / GRID_M) * GRID_M;

  const stageToM = (clientX: number, clientY: number) => {
    return {
      x: (clientX - stagePos.x) / (M_TO_PX * zoom),
      y: (clientY - stagePos.y) / (M_TO_PX * zoom),
    };
  };

  // Mouse handlers
  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) return; // clicked an existing shape
    const stage = e.target.getStage()!;
    const ptr = stage.getPointerPosition()!;
    const m = stageToM(ptr.x, ptr.y);

    if (tool === "select") {
      setSelectedId(null);
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
      setSelectedId(id);
      setTool("select");
      return;
    }
    if (tool === "circle") {
      const id = crypto.randomUUID();
      const newShape: CircleShape = { id, kind: "circle", x: snap(m.x), y: snap(m.y), radius: 0.275, label: "Termoacumulador" };
      update({ ...plan, shapes: [...plan.shapes, newShape] });
      setSelectedId(id);
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
    if (ptr) {
      const m = stageToM(ptr.x, ptr.y);
      setCursorM({ x: snap(m.x), y: snap(m.y) });
    }
  };

  const onMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
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

  // Zoom with scroll
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

  const removeShape = (id: string) => {
    update({ ...plan, shapes: plan.shapes.filter((s) => s.id !== id) });
    setSelectedId(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
        else if (e.key === "s") { e.preventDefault(); save(); }
      } else {
        if (e.key === "v") setTool("select");
        else if (e.key === "w") setTool("wall");
        else if (e.key === "m") setTool("module");
        else if (e.key === "c") setTool("dimension");
        else if (e.key === "Delete" || e.key === "Backspace") {
          if (selectedId) removeShape(selectedId);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, historyIdx, history]);

  const selectedShape = plan.shapes.find((s) => s.id === selectedId);

  // Render grid lines
  const gridLines = useMemo(() => {
    const lines: { points: number[]; major: boolean }[] = [];
    const step = GRID_M * M_TO_PX;
    const w = plan.widthM * M_TO_PX;
    const h = plan.heightM * M_TO_PX;
    for (let x = 0; x <= w; x += step) {
      lines.push({ points: [x, 0, x, h], major: Math.abs(x % (M_TO_PX)) < 0.01 });
    }
    for (let y = 0; y <= h; y += step) {
      lines.push({ points: [0, y, w, y], major: Math.abs(y % (M_TO_PX)) < 0.01 });
    }
    return lines;
  }, [plan.widthM, plan.heightM]);

  return (
    <div className="flex h-[calc(100vh-7rem)]">
      {/* Toolbar left */}
      <div className="w-14 border-r border-[var(--color-border)] flex flex-col items-center py-3 gap-1 bg-[var(--color-surface)]">
        <ToolBtn icon={<MousePointer2 size={16} />} active={tool === "select"} onClick={() => setTool("select")} title="Selecionar (V)" />
        <ToolBtn icon={<Square size={16} />} active={tool === "wall"} onClick={() => setTool("wall")} title="Parede (W)" />
        <ToolBtn icon={<RectangleHorizontal size={16} />} active={tool === "module"} onClick={() => setTool("module")} title="Módulo (M)" />
        <ToolBtn icon={<CircleIcon size={16} />} active={tool === "circle"} onClick={() => setTool("circle")} title="Círculo" />
        <ToolBtn icon={<RulerIcon size={16} />} active={tool === "dimension"} onClick={() => setTool("dimension")} title="Cota (C)" />
        <ToolBtn icon={<TypeIcon size={16} />} active={tool === "annotation"} onClick={() => setTool("annotation")} title="Anotação" />
        <div className="my-2 h-px w-8 bg-[var(--color-border)]" />
        <ToolBtn icon={<Undo2 size={16} />} onClick={undo} title="Desfazer (⌘Z)" />
        <ToolBtn icon={<Redo2 size={16} />} onClick={redo} title="Refazer" />
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
          draggable={tool === "select"}
          onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
        >
          {/* Grid */}
          <Layer listening={false}>
            <Rect x={0} y={0} width={plan.widthM * M_TO_PX} height={plan.heightM * M_TO_PX} fill="#1c1c20" />
            {gridLines.map((g, i) => (
              <Line
                key={i}
                points={g.points}
                stroke={g.major ? "#3a3a44" : "#252530"}
                strokeWidth={g.major ? 1 : 0.5}
              />
            ))}
          </Layer>

          {/* Shapes */}
          <Layer>
            {plan.shapes.map((s) => {
              if (s.kind === "wall") {
                return (
                  <Line
                    key={s.id}
                    points={[s.x1 * M_TO_PX, s.y1 * M_TO_PX, s.x2 * M_TO_PX, s.y2 * M_TO_PX]}
                    stroke={selectedId === s.id ? "#d4a373" : "#f4f4f5"}
                    strokeWidth={s.thickness * M_TO_PX}
                    lineCap="round"
                    onMouseDown={(e) => {
                      e.cancelBubble = true;
                      setSelectedId(s.id);
                    }}
                  />
                );
              }
              if (s.kind === "module") {
                return (
                  <Group
                    key={s.id}
                    x={s.x * M_TO_PX}
                    y={s.y * M_TO_PX}
                    rotation={s.rotation ?? 0}
                    draggable
                    onMouseDown={(e) => {
                      e.cancelBubble = true;
                      setSelectedId(s.id);
                    }}
                    onDragEnd={(e) => onShapeUpdate(s.id, { x: snap(e.target.x() / M_TO_PX), y: snap(e.target.y() / M_TO_PX) })}
                  >
                    <Rect
                      width={s.width * M_TO_PX}
                      height={s.height * M_TO_PX}
                      fill={s.fill ?? "#2A2A2A"}
                      stroke={selectedId === s.id ? "#d4a373" : "#9b9ba3"}
                      strokeWidth={1}
                    />
                    {s.label && (
                      <Text
                        text={s.label}
                        x={4}
                        y={4}
                        fill="#f4f4f5"
                        fontSize={12}
                        width={s.width * M_TO_PX - 8}
                      />
                    )}
                  </Group>
                );
              }
              if (s.kind === "circle") {
                return (
                  <Group
                    key={s.id}
                    x={s.x * M_TO_PX}
                    y={s.y * M_TO_PX}
                    draggable
                    onMouseDown={(e) => {
                      e.cancelBubble = true;
                      setSelectedId(s.id);
                    }}
                    onDragEnd={(e) => onShapeUpdate(s.id, { x: snap(e.target.x() / M_TO_PX), y: snap(e.target.y() / M_TO_PX) })}
                  >
                    <Circle
                      radius={s.radius * M_TO_PX}
                      stroke={selectedId === s.id ? "#d4a373" : "#9b9ba3"}
                      strokeWidth={1}
                      dash={[6, 4]}
                    />
                    {s.label && (
                      <Text text={s.label} x={s.radius * M_TO_PX + 4} y={-6} fill="#9b9ba3" fontSize={11} />
                    )}
                  </Group>
                );
              }
              if (s.kind === "dimension") {
                const dx = s.x2 - s.x1;
                const dy = s.y2 - s.y1;
                const len = Math.hypot(dx, dy);
                const value = formatM(s.override ?? len);
                const midX = ((s.x1 + s.x2) / 2) * M_TO_PX;
                const midY = ((s.y1 + s.y2) / 2) * M_TO_PX;
                return (
                  <Group
                    key={s.id}
                    onMouseDown={(e) => {
                      e.cancelBubble = true;
                      setSelectedId(s.id);
                    }}
                  >
                    <Line
                      points={[s.x1 * M_TO_PX, s.y1 * M_TO_PX, s.x2 * M_TO_PX, s.y2 * M_TO_PX]}
                      stroke={selectedId === s.id ? "#d4a373" : "#d4a37388"}
                      strokeWidth={1}
                    />
                    {/* End ticks */}
                    <Circle x={s.x1 * M_TO_PX} y={s.y1 * M_TO_PX} radius={3} fill="#d4a373" />
                    <Circle x={s.x2 * M_TO_PX} y={s.y2 * M_TO_PX} radius={3} fill="#d4a373" />
                    <Text
                      x={midX}
                      y={midY - 14}
                      text={value}
                      fill="#d4a373"
                      fontSize={12}
                      fontStyle="bold"
                    />
                  </Group>
                );
              }
              if (s.kind === "annotation") {
                return (
                  <Group
                    key={s.id}
                    x={s.x * M_TO_PX}
                    y={s.y * M_TO_PX}
                    draggable
                    onMouseDown={(e) => {
                      e.cancelBubble = true;
                      setSelectedId(s.id);
                    }}
                    onDragEnd={(e) => onShapeUpdate(s.id, { x: e.target.x() / M_TO_PX, y: e.target.y() / M_TO_PX })}
                  >
                    <Text text={s.text} fill={selectedId === s.id ? "#d4a373" : "#f4f4f5"} fontSize={13} />
                  </Group>
                );
              }
              return null;
            })}

            {/* Drawing preview */}
            {drawingFrom && (
              <Line
                points={[drawingFrom.x * M_TO_PX, drawingFrom.y * M_TO_PX, cursorM.x * M_TO_PX, cursorM.y * M_TO_PX]}
                stroke="#d4a373"
                strokeWidth={2}
                dash={[4, 4]}
              />
            )}
          </Layer>
        </Stage>

        {/* Status bar */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs text-muted bg-[var(--color-surface)]/80 backdrop-blur px-3 py-1.5 rounded">
          <span>
            X: {formatM(cursorM.x)} m · Y: {formatM(cursorM.y)} m · zoom {Math.round(zoom * 100)}%
          </span>
          <span>{plan.shapes.length} elementos</span>
        </div>
      </div>

      {/* Right panel: properties */}
      <div className="w-80 border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 overflow-y-auto">
        {!selectedShape ? (
          <p className="text-sm text-muted">Sem seleção. Usa as ferramentas à esquerda para desenhar.</p>
        ) : (
          <PropertyPanel shape={selectedShape} onUpdate={(p) => onShapeUpdate(selectedShape.id, p)} onDelete={() => removeShape(selectedShape.id)} />
        )}
      </div>
    </div>
  );
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
  if (shape.kind === "dimension") {
    return (
      <div className="space-y-3">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Cota</h3>
          <button onClick={onDelete} className="text-[var(--color-danger)] hover:opacity-80">
            <Trash2 size={14} />
          </button>
        </header>
        <Field label="Override (m)" value={shape.override ?? Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1)} onChange={(v) => onUpdate({ override: v } as Partial<DimensionShape>)} />
        <p className="text-xs text-muted">A cota mostra o valor real entre os pontos. Use override se quiser arredondar.</p>
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
