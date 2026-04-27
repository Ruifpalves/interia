"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveProjectField, updateProjectStatus } from "@/server/actions/projects";

export function ProjectSettingsClient({
  projectId,
  initialName,
  initialStatus,
}: {
  projectId: string;
  initialName: string;
  initialStatus: string;
}) {
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="panel p-5 space-y-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} label="Nome" />
        <div>
          <label className="text-xs text-muted">Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-base mt-1.5"
          >
            <option value="draft">Rascunho</option>
            <option value="in_progress">Em curso</option>
            <option value="pending_approval">Aguarda aprovação</option>
            <option value="approved">Aprovado</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await saveProjectField(projectId, "name", name);
              await updateProjectStatus(projectId, status as "draft" | "in_progress" | "pending_approval" | "approved" | "archived");
              toast.success("Guardado.");
              router.refresh();
            })
          }
        >
          {pending ? "A guardar..." : "Guardar alterações"}
        </Button>
      </div>

      <div className="panel p-5 border-[var(--color-danger)]">
        <h3 className="text-sm font-medium mb-1">Zona perigosa</h3>
        <p className="text-xs text-muted mb-3">Arquivar esconde o projeto. Apagar é permanente.</p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await updateProjectStatus(projectId, "archived");
                router.push("/projects");
              })
            }
          >
            Arquivar
          </Button>
        </div>
      </div>
    </div>
  );
}
