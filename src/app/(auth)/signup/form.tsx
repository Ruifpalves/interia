"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signupAction } from "@/server/actions/auth";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          const result = await signupAction(fd);
          if (result?.error) setError(result.error);
        })
      }
      className="flex flex-col gap-4"
    >
      <Input name="studioName" placeholder="Ana Leite Interior Design" label="Nome do estúdio" required />
      <Input name="email" type="email" placeholder="ana@estudio.pt" label="Email" required autoComplete="email" />
      <Input
        name="password"
        type="password"
        placeholder="••••••••"
        label="Password"
        hint="Mínimo 8 caracteres."
        required
        autoComplete="new-password"
        minLength={8}
      />
      <label className="text-xs text-muted flex items-start gap-2">
        <input type="checkbox" required className="mt-0.5" />
        <span>Aceito os termos de utilização e política de privacidade.</span>
      </label>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "A criar..." : "Criar estúdio"}
      </Button>
    </form>
  );
}
