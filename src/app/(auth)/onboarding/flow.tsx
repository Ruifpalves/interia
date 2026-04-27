"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveOnboardingAction, inviteTeamAction } from "@/server/actions/onboarding";

const fonts: Array<{ value: "Inter" | "Calibri" | "Playfair"; label: string }> = [
  { value: "Inter", label: "Inter (moderno)" },
  { value: "Calibri", label: "Calibri (sóbrio)" },
  { value: "Playfair", label: "Playfair (clássico)" },
];

export function OnboardingFlow({ studioName }: { studioName: string }) {
  const [step, setStep] = useState(1);
  const [accent, setAccent] = useState("#d4a373");
  const [font, setFont] = useState<"Inter" | "Calibri" | "Playfair">("Inter");
  const [pending, startTransition] = useTransition();
  const [emails, setEmails] = useState("");

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded ${step >= n ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Estúdio</h2>
            <p className="text-sm text-muted">Estes dados aparecem no rodapé dos teus dossiês.</p>
          </div>
          <Input name="studioName" defaultValue={studioName} label="Nome" disabled />
          <Input id="address" name="address" label="Morada" placeholder="Rua, Cidade, Código Postal" />
          <Input id="phone" name="phone" label="Telefone" placeholder="+351 ..." />
          <Input id="vat" name="vat" label="NIF / IVA" placeholder="PT500000000" />
          <Button onClick={() => setStep(2)} className="w-full">
            Continuar
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Branding</h2>
            <p className="text-sm text-muted">Aplicado ao dossiê e ao link partilhável.</p>
          </div>
          <div>
            <label className="text-xs text-muted">Cor de acento</label>
            <div className="flex items-center gap-3 mt-1.5">
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-10 w-14 rounded bg-transparent border border-[var(--color-border)]"
              />
              <span className="text-sm font-mono">{accent}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted">Fonte</label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {fonts.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFont(f.value)}
                  className={`panel-2 p-3 text-sm text-left ${font === f.value ? "border-[var(--color-accent)]" : ""}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <Input id="logoUrl" name="logoUrl" label="URL do logo (PNG transparente)" placeholder="https://..." />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
              Voltar
            </Button>
            <Button
              onClick={() =>
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set("address", (document.getElementById("address") as HTMLInputElement)?.value ?? "");
                  fd.set("phone", (document.getElementById("phone") as HTMLInputElement)?.value ?? "");
                  fd.set("vat", (document.getElementById("vat") as HTMLInputElement)?.value ?? "");
                  fd.set("accentColor", accent);
                  fd.set("font", font);
                  fd.set("logoUrl", (document.getElementById("logoUrl") as HTMLInputElement)?.value ?? "");
                  await saveOnboardingAction(fd);
                  setStep(3);
                })
              }
              disabled={pending}
              className="flex-1"
            >
              {pending ? "A guardar..." : "Continuar"}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Equipa</h2>
            <p className="text-sm text-muted">Convida designers (podes pular e adicionar depois).</p>
          </div>
          <Input
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            label="Emails (separa por vírgula)"
            placeholder="rita@estudio.pt, pedro@estudio.pt"
          />
          <div className="flex gap-2 pt-2">
            <a href="/dashboard" className="btn btn-secondary flex-1 text-center">
              Pular
            </a>
            <Button
              onClick={() =>
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set("emails", emails);
                  await inviteTeamAction(fd);
                  window.location.href = "/dashboard";
                })
              }
              disabled={pending}
              className="flex-1"
            >
              {pending ? "A enviar..." : "Convidar e entrar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
