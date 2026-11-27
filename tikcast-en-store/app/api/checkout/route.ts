import { NextResponse } from "next/server";
import { PRODUCT, siteUrl } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase";
import { generateAccessToken, hashAccessToken } from "@/lib/security";
import { clientIp, isValidEmail, rateLimit } from "@/lib/ratelimit";
import { createCheckoutSession } from "@/lib/saspay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/checkout — body: { email }
// Creates a pending order in Supabase, then a SasPay checkout session.
// The SasPay secret key is used server-side only.
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`checkout:ip:${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const email = (body as { email?: unknown })?.email;
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();

    if (!rateLimit(`checkout:email:${normalizedEmail}`, 5, 60_000)) {
      return NextResponse.json({ error: "Too many checkout attempts for this email. Please wait a minute." }, { status: 429 });
    }

    const supabase = supabaseAdmin();

    // Duplicate-pending-order guard: one active checkout per email at a time.
    // (SasPay does NOT support Idempotency-Key on checkout sessions, and a
    // double click could otherwise create two sessions.)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60_000).toISOString();
    const { data: recentPending } = await supabase
      .from("orders")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .gte("created_at", twoMinutesAgo)
      .limit(1);
    if (recentPending && recentPending.length > 0) {
      return NextResponse.json(
        { error: "A checkout is already in progress for this email. Please complete it or wait 2 minutes." },
        { status: 409 },
      );
    }

    // 1) Create the order (pending). Only the token HASH is stored.
    const rawToken = generateAccessToken();
    const { data: order, error: insertError } = await supabase
      .from("orders")
      .insert({
        email: normalizedEmail,
        amount: PRODUCT.price,
        currency: PRODUCT.currency,
        status: "pending",
        access_token_hash: hashAccessToken(rawToken),
      })
      .select("id")
      .single();
    if (insertError || !order) {
      return NextResponse.json({ error: "Could not create your order. Please try again." }, { status: 500 });
    }

    // 2) Create the SasPay checkout session.
    // The raw access token travels ONLY in this buyer's return URL.
    const returnUrl = `${siteUrl()}/success?order=${order.id}&token=${encodeURIComponent(rawToken)}`;
    let session;
    try {
      session = await createCheckoutSession({ orderId: order.id, email: normalizedEmail, returnUrl });
    } catch {
      await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
      return NextResponse.json({ error: "Payment could not be started. Please try again." }, { status: 502 });
    }

    // 3) Store the SasPay session id on the order.
    await supabase.from("orders").update({ saspay_session_id: session.id }).eq("id", order.id);

    return NextResponse.json({ checkout_url: session.checkout_url, order_id: order.id });
  } catch {
    return NextResponse.json({ error: "Unexpected error. Please try again." }, { status: 500 });
  }
}
