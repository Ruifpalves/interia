// Outbound WhatsApp via the existing UAZAPI infra (also used by Toula and Aero).
// Per PRD section 7.1: notify the designer when the client comments / approves.

import { env } from "@/lib/env";

function normalize(number: string): string {
  // Strip spaces, dashes, parens. Keep digits and leading '+'.
  return number.replace(/[^\d+]/g, "");
}

export async function sendWhatsapp({ to, message }: { to: string; message: string }) {
  const url = env.serverOnly.uazapiUrl;
  const token = env.serverOnly.uazapiToken;
  if (!url || !token) {
    console.warn("[whatsapp] UAZAPI_URL / UAZAPI_TOKEN not set; skipping send to", to);
    return { ok: false as const, skipped: true };
  }

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/send/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify({
        number: normalize(to),
        text: message,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[whatsapp] send failed", res.status, body);
      return { ok: false as const, error: `${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true as const };
  } catch (e) {
    console.error("[whatsapp] send error", e);
    return { ok: false as const, error: (e as Error).message };
  }
}

export const whatsappTemplates = {
  comment: ({ project, author }: { project: string; author: string }) =>
    `💬 *Interia* — Novo comentário em ${project}\n\n${author} comentou no link partilhado.\nAbra a app para ver o detalhe.`,
  approval: ({ project, author }: { project: string; author: string }) =>
    `✅ *Interia* — ${project} aprovado\n\n${author} aprovou o projeto. Já podes avançar para a fase seguinte.`,
};
