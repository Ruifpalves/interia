import { NextResponse } from "next/server";
import { getStripe, PLANS } from "@/lib/stripe/client";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { plan, seats } = (await req.json()) as { plan: keyof typeof PLANS; seats?: number };
  const config = PLANS[plan];
  if (!config?.priceId) return NextResponse.json({ error: "plan not configured" }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("workspace_id, email").eq("id", auth.user.id).single();
  if (!profile?.workspace_id) return NextResponse.json({ error: "no workspace" }, { status: 400 });

  const admin = getAdminSupabase();
  const { data: ws } = await admin.from("workspaces").select("name, stripe_customer_id").eq("id", profile.workspace_id).single();
  const stripe = getStripe();

  let customerId = ws?.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email as string,
      name: ws?.name as string,
      metadata: { workspace_id: profile.workspace_id as string },
    });
    customerId = customer.id;
    await admin.from("workspaces").update({ stripe_customer_id: customerId }).eq("id", profile.workspace_id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: config.priceId, quantity: config.seatBased ? Math.max(1, seats ?? 1) : 1 }],
    success_url: `${env.appUrl}/billing?success=1`,
    cancel_url: `${env.appUrl}/billing?canceled=1`,
    subscription_data: {
      metadata: { workspace_id: profile.workspace_id as string, plan },
    },
  });

  return NextResponse.json({ url: session.url });
}
