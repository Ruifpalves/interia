"use client";

import { useState, useTransition } from "react";
import { Copy, FileText, Link2, FileImage } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateShareSettings } from "@/server/actions/share";

export function DeliveryClient({
  projectId,
  projectName,
  pdfUrl,
  shareUrl,
  shareSettings,
}: {
  projectId: string;
  projectName: string;
  pdfUrl: string | null;
  shareUrl: string | null;
  shareSettings: { allowComments: boolean; requireApproval: boolean; hasPassword: boolean };
}) {
  const [allowComments, setAllowComments] = useState(shareSettings.allowComments);
  const [requireApproval, setRequireApproval] = useState(shareSettings.requireApproval);
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  const update = (patch: { allowComments?: boolean; requireApproval?: boolean; password?: string | null }) =>
    startTransition(async () => {
      const r = await updateShareSettings(projectId, patch);
      if ("error" in r && r.error) toast.error(r.error);
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* PDF */}
      <Card icon={<FileText size={16} />} title="PDF do dossiê">
        <p className="text-xs text-muted mb-3">Versão final pronta para apresentação.</p>
        {pdfUrl ? (
          <a href={pdfUrl} download className="btn btn-primary w-full">⬇ Descarregar PDF</a>
        ) : (
          <a href={`/api/projects/${projectId}/pdf`} className="btn btn-primary w-full">Gerar PDF</a>
        )}
      </Card>

      {/* Share link */}
      <Card icon={<Link2 size={16} />} title="Link partilhável">
        {!shareUrl ? (
          <p className="text-xs text-muted">Configura um slug para gerar o link.</p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <input value={shareUrl} readOnly className="input-base text-xs" />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Link copiado.");
                }}
                className="btn btn-secondary"
                title="Copiar"
              >
                <Copy size={14} />
              </button>
            </div>
            <Toggle
              label="Permitir comentários"
              value={allowComments}
              onChange={(v) => {
                setAllowComments(v);
                update({ allowComments: v });
              }}
            />
            <Toggle
              label="Pedir aprovação"
              value={requireApproval}
              onChange={(v) => {
                setRequireApproval(v);
                update({ requireApproval: v });
              }}
            />
            <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
              <label className="text-xs text-muted">Password (opcional)</label>
              <div className="flex gap-2 mt-1">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={shareSettings.hasPassword ? "•••• definida" : ""}
                  className="input-base text-xs"
                  type="password"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => update({ password: password || null })}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* DXF */}
      <Card icon={<FileImage size={16} />} title="DXF (marceneiro)">
        <p className="text-xs text-muted mb-3">Vistas técnicas em CAD com camadas separadas.</p>
        <a href={`/api/projects/${projectId}/dxf`} download className="btn btn-secondary w-full">
          ⬇ Exportar DXF
        </a>
      </Card>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-xs py-2 cursor-pointer">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full p-0.5 transition-colors ${value ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`}
      >
        <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}
