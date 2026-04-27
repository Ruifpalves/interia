"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction } from "@/server/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          fd.set("next", next);
          const result = await loginAction(fd);
          if (result?.error) setError(result.error);
        })
      }
      className="flex flex-col gap-4"
    >
      <Input name="email" type="email" placeholder="ana@estudio.pt" label="Email" required autoComplete="email" />
      <Input name="password" type="password" placeholder="••••••••" label="Password" required autoComplete="current-password" />
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "A entrar..." : "Entrar"}
      </Button>
    </form>
  );
}
