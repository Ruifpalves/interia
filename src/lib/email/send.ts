import { Resend } from "resend";
import { env } from "@/lib/env";

let cached: Resend | null = null;

function getResend(): Resend | null {
  if (cached) return cached;
  const key = env.serverOnly.resendKey;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

const FROM = process.env.RESEND_FROM ?? "Interia <noreply@interia.app>";

export async function sendEmail(args: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing; skipping send to", args.to);
    return { ok: false as const, skipped: true };
  }
  try {
    await resend.emails.send({ from: FROM, ...args });
    return { ok: true as const };
  } catch (e) {
    console.error("[email] send failed", e);
    return { ok: false as const, error: (e as Error).message };
  }
}

export const templates = {
  invite: ({ studio, inviter, link }: { studio: string; inviter: string; link: string }) => ({
    subject: `${inviter} convidou-te para o estúdio ${studio}`,
    html: emailLayout(`
      <h1 style="font-family:Playfair Display,serif;font-size:24px;margin:0 0 12px">Bem-vindo a ${escape(studio)}</h1>
      <p>${escape(inviter)} convidou-te para colaborar no estúdio em <strong>Interia</strong>.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#d4a373;color:#1a1208;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:500">Aceitar convite</a></p>
      <p style="font-size:12px;color:#888">Se não esperavas este convite, ignora esta mensagem.</p>
    `),
  }),
  comment: ({ studio, project, author, text, link }: { studio: string; project: string; author: string; text: string; link: string }) => ({
    subject: `${author} comentou em ${project}`,
    html: emailLayout(`
      <p style="text-transform:uppercase;letter-spacing:.05em;font-size:11px;color:#888">${escape(studio)}</p>
      <h2 style="font-family:Playfair Display,serif;font-size:20px;margin:6px 0">${escape(project)}</h2>
      <p style="border-left:3px solid #d4a373;padding:8px 12px;background:#f7f5f2;font-style:italic">"${escape(text)}"</p>
      <p style="margin:16px 0;font-size:13px;color:#555">— ${escape(author)}</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#d4a373;color:#1a1208;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:500">Ver projeto</a></p>
    `),
  }),
  approval: ({ studio, project, author, link }: { studio: string; project: string; author: string; link: string }) => ({
    subject: `✓ ${author} aprovou ${project}`,
    html: emailLayout(`
      <p style="text-transform:uppercase;letter-spacing:.05em;font-size:11px;color:#888">${escape(studio)}</p>
      <h2 style="font-family:Playfair Display,serif;font-size:20px;margin:6px 0">${escape(project)} foi aprovado</h2>
      <p>${escape(author)} aprovou o projeto. Já podes avançar.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#d4a373;color:#1a1208;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:500">Abrir projeto</a></p>
    `),
  }),
  shareOpened: ({ studio, project, link }: { studio: string; project: string; link: string }) => ({
    subject: `O cliente abriu ${project} pela primeira vez`,
    html: emailLayout(`
      <p style="text-transform:uppercase;letter-spacing:.05em;font-size:11px;color:#888">${escape(studio)}</p>
      <h2 style="font-family:Playfair Display,serif;font-size:20px;margin:6px 0">${escape(project)}</h2>
      <p>O link partilhado foi aberto pela primeira vez.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#d4a373;color:#1a1208;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:500">Ver atividade</a></p>
    `),
  }),
};

function emailLayout(inner: string): string {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f5f2;margin:0;padding:32px">
    <div style="max-width:480px;margin:0 auto;background:white;border-radius:12px;padding:32px;border:1px solid #eee">
      ${inner}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="font-size:11px;color:#aaa">Interia · interia.app</p>
    </div>
  </body></html>`;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
