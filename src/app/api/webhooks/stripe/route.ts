import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 });
  const secret = env.serverOnly.stripeWebhookSecret;
  if (!secret) return NextResponse.json({ error: "no webhook secret" }, { status: 500 });

  const body = await req.text();
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const admin = getAdminSupabase();

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = sub.metadata?.workspace_id;
      if (workspaceId) {
        const planFromMeta = sub.metadata?.plan as "solo" | "studio" | "pro" | undefined;
        const seats = sub.items.data[0]?.quantity ?? 1;
        await admin
          .from("workspaces")
          .update({
            plan: planFromMeta ?? "studio",
            seats_paid: seats,
            stripe_subscription_id: sub.id,
            trial_ends_at: null,
          })
          .eq("id", workspaceId);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = sub.metadata?.workspace_id;
      if (workspaceId) {
        await admin.from("workspaces").update({ plan: "trial", seats_paid: 1 }).eq("id", workspaceId);
      }
      break;
    }
    default:
      // Ignore other events for now.
      break;
  }

  return NextResponse.json({ received: true });
}
