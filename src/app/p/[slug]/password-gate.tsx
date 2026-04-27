"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordGate({ slug }: { slug: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          const r = await fetch(`/api/share/${slug}/unlock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          if (r.ok) location.reload();
          else setError("Password incorreta.");
          setPending(false);
        }}
        className="panel p-8 w-full max-w-sm"
      >
        <h1 className="text-lg font-medium mb-1">Apresentação protegida</h1>
        <p className="text-sm text-muted mb-4">Introduz a password fornecida pelo estúdio.</p>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        {error && <p className="text-xs text-[var(--color-danger)] mt-2">{error}</p>}
        <Button disabled={pending} className="w-full mt-4">
          {pending ? "..." : "Aceder"}
        </Button>
      </form>
    </div>
  );
}
