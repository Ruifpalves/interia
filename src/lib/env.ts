// Centralised env access with light validation.
// Only validates server-side; the public ones are inlined by Next.

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string): string | undefined {
  return process.env[name];
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  serverOnly: {
    get supabaseServiceKey() { return required("SUPABASE_SERVICE_ROLE_KEY"); },
    get anthropicKey() { return optional("ANTHROPIC_API_KEY"); },
    get googleAiKey() { return optional("GOOGLE_GENERATIVE_AI_API_KEY"); },
    get aiGatewayKey() { return optional("AI_GATEWAY_API_KEY"); },
    get stripeSecret() { return optional("STRIPE_SECRET_KEY"); },
    get stripeWebhookSecret() { return optional("STRIPE_WEBHOOK_SECRET"); },
    get resendKey() { return optional("RESEND_API_KEY"); },
    get uazapiUrl() { return optional("UAZAPI_URL"); },
    get uazapiToken() { return optional("UAZAPI_TOKEN"); },
  },
};

export const isProd = process.env.NODE_ENV === "production";
