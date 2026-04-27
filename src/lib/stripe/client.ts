import Stripe from "stripe";
import { env } from "@/lib/env";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const secret = env.serverOnly.stripeSecret;
  if (!secret) throw new Error("Missing STRIPE_SECRET_KEY");
  cached = new Stripe(secret);
  return cached;
}

export const PLANS = {
  solo: { priceId: process.env.STRIPE_PRICE_SOLO ?? "", seatBased: false },
  studio: { priceId: process.env.STRIPE_PRICE_STUDIO ?? "", seatBased: true },
  pro: { priceId: process.env.STRIPE_PRICE_PRO ?? "", seatBased: true },
} as const;
