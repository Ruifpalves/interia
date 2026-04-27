"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetAction } from "@/server/actions/auth";

export function ResetForm() {
  const [state, setState] = useState<{ error?: string; ok?: boolean }>({});
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setState({});
          const result = await resetAction(fd);
          if (result?.error) setState({ error: result.error });
          else setState({ ok: true });
        })
      }
      className="flex flex-col gap-4"
    >
      <Input name="email" type="email" placeholder="ana@estudio.pt" label="Email" required />
      {state.error && <p className="text-xs text-[var(--color-danger)]">{state.error}</p>}
      {state.ok && <p className="text-xs text-[var(--color-success)]">Email enviado. Verifica a tua caixa.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "A enviar..." : "Enviar link"}
      </Button>
    </form>
  );
}
