"use client";

import { useCallback, useState, useTransition } from "react";
import { Camera, Ruler, FileText, Image as ImgIcon, Star, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { createUploadUrl, registerAsset, deleteAsset, setCoverPhoto } from "@/server/actions/uploads";
import { saveProjectField } from "@/server/actions/projects";
import { runBriefingPipeline, runFloorplanVision } from "@/server/actions/ai";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Photo = { id: string; url: string; thumbnail_url: string; is_cover: boolean };
type Ref = { id: string; url: string; thumbnail_url: string; tag: string | null };
type FloorPlan = { id: string; url: string; thumbnail_url: string };

type Measurements = Record<string, unknown> | null;

const MAX_BYTES = 10 * 1024 * 1024;

export function InputsClient({
  projectId,
  projectType,
  initialBriefing,
  initialMeasurements,
  initialPhotos,
  initialReferences,
  initialFloorplans,
}: {
  projectId: string;
  projectType: "furniture" | "space";
  initialBriefing: string;
  initialMeasurements: Measurements;
  initialPhotos: Photo[];
  initialReferences: Ref[];
  initialFloorplans: FloorPlan[];
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [refs, setRefs] = useState(initialReferences);
  const [floorplans, setFloorplans] = useState(initialFloorplans);
  const [briefing, setBriefing] = useState(initialBriefing);
  const [measurements, setMeasurements] = useState<Measurements>(initialMeasurements);
  const [pendingAi, startAi] = useTransition();

  const onUpload = useCallback(
    async (file: File, kind: "photo" | "reference" | "floorplan_input") => {
      if (file.size > MAX_BYTES) {
        toast.error("Imagem demasiado grande. Máx. 10 MB.");
        return null;
      }
      if (!/^image\//.test(file.type)) {
        toast.error("Formato não suportado. Use JPG, PNG ou HEIC.");
        return null;
      }
      const sign = await createUploadUrl(projectId, kind, file.name);
      if ("error" in sign) {
        toast.error(sign.error);
        return null;
      }
      const supabase = getBrowserSupabase();
      const { error } = await supabase.storage
        .from(sign.bucket)
        .uploadToSignedUrl(sign.path, sign.token, file, { contentType: file.type });
      if (error) {
        toast.error(error.message);
        return null;
      }
      const reg = await registerAsset(projectId, kind, sign.path, { size: file.size });
      if ("error" in reg) {
        toast.error(reg.error);
        return null;
      }
      return reg.asset as { id: string; url: string };
    },
    [projectId],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Photos */}
      <Card icon={<Camera size={16} />} title="Fotos do espaço" hint="Até 20 imagens · JPG/PNG/HEIC · máx. 10 MB">
        <UploadGrid
          items={photos.map((p) => ({ id: p.id, url: p.thumbnail_url, badge: p.is_cover ? "Capa" : undefined }))}
          onPick={async (files) => {
            for (const f of files) {
              const a = await onUpload(f, "photo");
              if (a) setPhotos((s) => [...s, { id: a.id, url: a.url, thumbnail_url: a.url, is_cover: false }]);
            }
          }}
          onSetCover={async (assetId) => {
            await setCoverPhoto(assetId, projectId);
            setPhotos((s) => s.map((p) => ({ ...p, is_cover: p.id === assetId })));
          }}
          onDelete={async (assetId) => {
            await deleteAsset(assetId);
            setPhotos((s) => s.filter((p) => p.id !== assetId));
          }}
        />
      </Card>

      {/* Measurements */}
      <Card icon={<Ruler size={16} />} title="Medidas" hint={projectType === "furniture" ? "Largura, altura, profundidade, obstáculos" : "Compartimento e aberturas"}>
        <MeasurementsForm
          projectId={projectId}
          projectType={projectType}
          floorplans={floorplans}
          uploadFloorplan={async (f) => {
            const a = await onUpload(f, "floorplan_input");
            if (a) setFloorplans((s) => [...s, { id: a.id, url: a.url, thumbnail_url: a.url }]);
          }}
          deleteFloorplan={async (id) => {
            await deleteAsset(id);
            setFloorplans((s) => s.filter((p) => p.id !== id));
          }}
          measurements={measurements}
          setMeasurements={async (m) => {
            setMeasurements(m);
            await saveProjectField(projectId, "measurements_json", m);
          }}
        />
      </Card>

      {/* Briefing */}
      <Card icon={<FileText size={16} />} title="Briefing" hint="Até 2.000 caracteres. Linguagem natural.">
        <Textarea
          value={briefing}
          onChange={(e) => setBriefing(e.target.value.slice(0, 2000))}
          onBlur={() => saveProjectField(projectId, "briefing_text", briefing)}
          placeholder="Cliente quer esconder os 2 termoacumuladores e ter arrumação..."
          className="min-h-40"
        />
        <p className="text-xs text-muted mt-2 text-right">{briefing.length} / 2.000</p>
      </Card>

      {/* References */}
      <Card icon={<ImgIcon size={16} />} title="Referências visuais" hint="Até 12 imagens de inspiração">
        <UploadGrid
          items={refs.map((r) => ({ id: r.id, url: r.thumbnail_url, badge: r.tag ?? undefined }))}
          onPick={async (files) => {
            for (const f of files) {
              const a = await onUpload(f, "reference");
              if (a) setRefs((s) => [...s, { id: a.id, url: a.url, thumbnail_url: a.url, tag: null }]);
            }
          }}
          onDelete={async (assetId) => {
            await deleteAsset(assetId);
            setRefs((s) => s.filter((r) => r.id !== assetId));
          }}
        />
      </Card>

      <div className="lg:col-span-2 panel p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--color-accent)]" /> Estruturar briefing com IA
          </p>
          <p className="text-xs text-muted mt-1">
            A IA lê o briefing, fotos e referências e cria a direção criativa estruturada.
            Demora ~3 segundos.
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={pendingAi || briefing.trim().length < 30}
          onClick={() =>
            startAi(async () => {
              const r = await runBriefingPipeline(projectId);
              if (r?.error) toast.error(r.error);
              else toast.success("Briefing estruturado.");
            })
          }
        >
          {pendingAi ? "A processar..." : "Processar"}
        </Button>
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      {hint && <p className="text-xs text-muted mb-3">{hint}</p>}
      {children}
    </div>
  );
}

function UploadGrid({
  items,
  onPick,
  onSetCover,
  onDelete,
}: {
  items: Array<{ id: string; url: string; badge?: string }>;
  onPick: (files: File[]) => void;
  onSetCover?: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <label className="panel-2 border-dashed flex items-center justify-center cursor-pointer h-24 text-sm text-muted hover:text-[var(--color-fg)] hover:border-[var(--color-accent)] transition-colors">
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onPick(Array.from(e.target.files));
            e.currentTarget.value = "";
          }}
        />
        Arrasta ou clica para carregar
      </label>
      {items.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          {items.map((i) => (
            <div key={i.id} className="relative aspect-square panel-2 overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.url} alt="" className="object-cover w-full h-full" />
              {i.badge && (
                <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-accent)] text-[var(--color-accent-fg)] uppercase tracking-wide">
                  {i.badge}
                </span>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-end justify-end gap-1 p-1 opacity-0 group-hover:opacity-100">
                {onSetCover && (
                  <button
                    onClick={() => onSetCover(i.id)}
                    className="p-1 rounded bg-black/60 hover:bg-black/80"
                    title="Marcar como capa"
                  >
                    <Star size={12} />
                  </button>
                )}
                <button
                  onClick={() => onDelete(i.id)}
                  className="p-1 rounded bg-black/60 hover:bg-[var(--color-danger)]"
                  title="Apagar"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function MeasurementsForm({
  projectId,
  projectType,
  measurements,
  setMeasurements,
  floorplans,
  uploadFloorplan,
  deleteFloorplan,
}: {
  projectId: string;
  projectType: "furniture" | "space";
  measurements: Measurements;
  setMeasurements: (m: Measurements) => void;
  floorplans: FloorPlan[];
  uploadFloorplan: (f: File) => Promise<void>;
  deleteFloorplan: (id: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"auto" | "manual">("manual");
  const [interpreting, setInterpreting] = useState(false);
  const m = measurements ?? {};

  const update = (patch: Record<string, unknown>) => setMeasurements({ ...m, ...patch });

  const interpret = async (assetId: string) => {
    setInterpreting(true);
    const r = await runFloorplanVision(projectId, assetId);
    setInterpreting(false);
    if ("error" in r && r.error) toast.error(r.error);
    else toast.success("Planta interpretada. Vê e ajusta no editor 2D.");
  };

  return (
    <>
      <div className="flex gap-1 mb-3 panel-2 p-1 text-xs">
        <button
          type="button"
          onClick={() => setMode("auto")}
          className={`flex-1 py-1.5 rounded ${mode === "auto" ? "bg-[var(--color-surface)]" : "text-muted"}`}
        >
          Auto · IA lê foto da planta
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 py-1.5 rounded ${mode === "manual" ? "bg-[var(--color-surface)]" : "text-muted"}`}
        >
          Manual
        </button>
      </div>

      {mode === "auto" ? (
        <>
          <UploadGrid
            items={floorplans.map((f) => ({ id: f.id, url: f.thumbnail_url }))}
            onPick={async (files) => {
              for (const f of files) await uploadFloorplan(f);
            }}
            onDelete={deleteFloorplan}
          />
          {floorplans.length > 0 && (
            <Button
              variant="secondary"
              disabled={interpreting}
              onClick={() => interpret(floorplans[floorplans.length - 1].id)}
              className="mt-3 w-full"
            >
              <Sparkles size={14} /> {interpreting ? "A interpretar..." : "Interpretar última imagem com IA"}
            </Button>
          )}
        </>
      ) : projectType === "furniture" ? (
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Largura total (m)" value={m.largura_total_m as number | undefined} onChange={(v) => update({ largura_total_m: v })} />
          <NumField label="Altura disponível (m)" value={m.altura_disponivel_m as number | undefined} onChange={(v) => update({ altura_disponivel_m: v })} />
          <NumField label="Profundidade (m)" value={m.profundidade_m as number | undefined} onChange={(v) => update({ profundidade_m: v })} />
          <p className="text-xs text-muted col-span-2 mt-2">
            Obstáculos e aberturas: ajusta no editor 2D depois.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Largura (m)" value={m.largura_total_m as number | undefined} onChange={(v) => update({ largura_total_m: v })} />
          <NumField label="Comprimento (m)" value={m.profundidade_m as number | undefined} onChange={(v) => update({ profundidade_m: v })} />
          <NumField label="Pé direito (m)" value={m.altura_disponivel_m as number | undefined} onChange={(v) => update({ altura_disponivel_m: v })} />
        </div>
      )}
    </>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <input
        type="number"
        step="0.01"
        value={value ?? ""}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="input-base"
      />
    </label>
  );
}
