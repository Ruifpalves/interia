"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProjectAction } from "@/server/actions/projects";

const furnitureSubtypes = [
  "Armário",
  "Roupeiro",
  "Cozinha",
  "Móvel exterior",
  "Móvel TV",
  "Biblioteca",
  "Outro",
];

const spaceSubtypes = ["Sala", "Cozinha", "Quarto", "Casa de banho", "Escritório", "Outro"];

export function NewProjectForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [type, setType] = useState<"furniture" | "space">("furniture");
  const [newClient, setNewClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          fd.set("type", type);
          const result = await createProjectAction(fd);
          if (result?.error) setError(result.error);
        })
      }
      className="space-y-6"
    >
      <Input name="name" label="Nome" placeholder="Nº965_V2 — Móvel Exterior" required />

      <div>
        <label className="text-xs text-muted">Tipo</label>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          <button
            type="button"
            onClick={() => setType("furniture")}
            className={`panel-2 p-4 text-sm text-left ${type === "furniture" ? "border-[var(--color-accent)]" : ""}`}
          >
            <span className="block text-base">🪑 Mobiliário por medida</span>
            <span className="text-xs text-muted block mt-1">Armário, cozinha, roupeiro, móvel TV...</span>
          </button>
          <button
            type="button"
            onClick={() => setType("space")}
            className={`panel-2 p-4 text-sm text-left ${type === "space" ? "border-[var(--color-accent)]" : ""}`}
          >
            <span className="block text-base">🏠 Espaço completo</span>
            <span className="text-xs text-muted block mt-1">Sala, quarto, cozinha, escritório...</span>
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted" htmlFor="subtype">
          Subtipo
        </label>
        <select id="subtype" name="subtype" className="input-base mt-1.5">
          <option value="">— Escolher —</option>
          {(type === "furniture" ? furnitureSubtypes : spaceSubtypes).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <Input name="location" label="Localização" placeholder="Wangen SZ, Suíça" />

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted">Cliente</label>
          <button
            type="button"
            onClick={() => setNewClient(!newClient)}
            className="text-xs text-[var(--color-accent)]"
          >
            {newClient ? "Escolher existente" : "+ Novo cliente"}
          </button>
        </div>
        {!newClient ? (
          <select name="clientId" className="input-base mt-1.5">
            <option value="">— Sem cliente —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-2 mt-1.5">
            <Input name="newClientName" placeholder="Nome do cliente" required={newClient} />
            <Input name="newClientEmail" type="email" placeholder="email@cliente.pt" />
            <Input name="newClientPhone" placeholder="Telefone" />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      <div className="flex justify-end gap-2">
        <a href="/projects" className="btn btn-ghost">
          Cancelar
        </a>
        <Button type="submit" disabled={pending}>
          {pending ? "A criar..." : "Criar projeto"}
        </Button>
      </div>
    </form>
  );
}
