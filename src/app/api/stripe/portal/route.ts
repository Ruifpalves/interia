import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { getServerSupabase } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("workspace_id").eq("id", auth.user.id).single();
  if (!profile?.workspace_id) return NextResponse.json({ error: "no workspace" }, { status: 400 });
  const { data: ws } = await supabase.from("workspaces").select("stripe_customer_id").eq("id", profile.workspace_id).single();
  if (!ws?.stripe_customer_id) return NextResponse.json({ error: "no customer" }, { status: 400 });

  const session = await getStripe().billingPortal.sessions.create({
    customer: ws.stripe_customer_id as string,
    return_url: `${env.appUrl}/billing`,
  });
  return NextResponse.redirect(session.url, { status: 303 });
}
