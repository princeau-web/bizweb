import { NextResponse } from "next/server";
import { PRODUCT } from "@/lib/config";
import { supabaseAdmin, type Order } from "@/lib/supabase";
import { verifyAccessToken } from "@/lib/security";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/download — body: { order, token }
// Verifies (server-side) that the order is PAID and that the token matches
// the stored SHA-256 hash (timing-safe), then returns a SHORT-LIVED signed
// URL to the PRIVATE Supabase Storage object. There is no public PDF URL.
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`download:ip:${ip}`, 20, 60_000)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const { order: orderId, token } = (body ?? {}) as { order?: unknown; token?: unknown };
    if (typeof orderId !== "string" || typeof token !== "string" || !orderId || !token) {
      return NextResponse.json({ error: "Missing order or token." }, { status: 400 });
    }
    // UUID shape check before hitting the database.
    if (!/^[0-9a-fA-F-]{36}$/.test(orderId)) {
      return NextResponse.json({ error: "Invalid order." }, { status: 400 });
    }
    if (!rateLimit(`download:order:${orderId}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many attempts for this order." }, { status: 429 });
    }

    const supabase = supabaseAdmin();
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle<Order>();
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (!verifyAccessToken(token, order.access_token_hash)) {
      return NextResponse.json({ error: "Invalid access link." }, { status: 403 });
    }
    if (order.status !== "paid") {
      return NextResponse.json(
        { error: "Payment not confirmed yet. If you just paid, wait a few seconds and try again." },
        { status: 402 },
      );
    }

    const { data: signed, error } = await supabase.storage
      .from(PRODUCT.supabaseBucket)
      .createSignedUrl(PRODUCT.supabaseObject, PRODUCT.signedUrlTtlSeconds, {
        download: "TikCast_en-Faceless-Shorts-Ebook.pdf",
      });
    if (error || !signed?.signedUrl) {
      return NextResponse.json({ error: "Could not generate the download link. Please try again." }, { status: 500 });
    }

    if (!order.delivered_at) {
      await supabase.from("orders").update({ delivered_at: new Date().toISOString() }).eq("id", order.id);
    }

    return NextResponse.json({ url: signed.signedUrl, expires_in: PRODUCT.signedUrlTtlSeconds });
  } catch {
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
