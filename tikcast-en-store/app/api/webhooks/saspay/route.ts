import { NextResponse } from "next/server";
import { supabaseAdmin, type Order } from "@/lib/supabase";
import {
  getHeaderCI,
  getSignatureHeader,
  getWebhookEventId,
  isTimestampFresh,
  normalizeTimestampMs,
  verifyWebhookSignature,
} from "@/lib/security";
import { amountsMatch, getCheckoutSession, isSessionPaid } from "@/lib/saspay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/webhooks/saspay — THE security core of the store.
//
// Rules enforced here (per SasPay docs, docs.saspay.me/api-reference/webhooks):
//  1. Work on the RAW request body — never re-serialize parsed JSON.
//  2. Reject webhooks whose timestamp is >5 minutes from server time
//     (anti-replay).
//  3. Verify the HMAC signature over "{timestamp}.{rawBody}" with
//     SASPAY_WEBHOOK_SECRET, timing-safe comparison.
//  4. Deduplicate by event id (unique row in webhook_events).
//  5. On transaction.success ONLY: re-fetch the checkout session from the
//     SasPay API server-side, check status + amount + currency against the
//     Supabase order, and only then mark it paid.
//     The webhook payload alone is NEVER trusted. The return_url is NEVER
//     trusted either — it carries no proof of payment.
//  6. Respond 200 fast; SasPay retries 5 times (timeout 15s per attempt).

interface WebhookEnvelope {
  id?: string;
  event_id?: string;
  event?: string;
  type?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export async function POST(req: Request) {
  const secret = process.env.SASPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // 1) RAW body first — before any parsing.
  const rawBody = await req.text();

  // 2) Timestamp freshness (anti-replay).
  const timestampHeader = getHeaderCI(req.headers, ["x-webhook-timestamp"]);
  if (!timestampHeader) {
    return NextResponse.json({ error: "Missing timestamp" }, { status: 400 });
  }
  const timestampMs = normalizeTimestampMs(timestampHeader);
  if (timestampMs === null || !isTimestampFresh(timestampMs)) {
    return NextResponse.json({ error: "Stale or invalid timestamp" }, { status: 400 });
  }

  // 3) Signature verification on the raw body.
  const signatureHeader = getSignatureHeader(req.headers);
  if (
    !signatureHeader ||
    !verifyWebhookSignature({ rawBody, timestamp: timestampHeader, signatureHeader, secret })
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Signature is valid — now it is safe to parse.
  let envelope: WebhookEnvelope;
  try {
    envelope = JSON.parse(rawBody) as WebhookEnvelope;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = str(envelope.event) || str(envelope.type) || "unknown";
  const data = (envelope.data ?? envelope) as Record<string, unknown>;
  const eventId =
    getWebhookEventId(req.headers) || str(envelope.id) || str(envelope.event_id) ||
    // Last-resort dedupe key: stable per delivery content.
    `${eventType}:${str(data.id) || str(data.transaction_id) || "no-id"}:${timestampHeader}`;

  const supabase = supabaseAdmin();

  // 4) Deduplicate: one row per event id. Unique violation => duplicate.
  const { error: dedupeError } = await supabase
    .from("webhook_events")
    .insert({ event_id: eventId, type: eventType, payload: envelope });
  if (dedupeError) {
    if (dedupeError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: "Could not record event" }, { status: 500 });
  }

  // From here: if processing fails, delete the dedupe row and answer 500 so
  // SasPay retries the delivery instead of the event being lost forever.
  const fail = async (status = 500) => {
    await supabase.from("webhook_events").delete().eq("event_id", eventId);
    return NextResponse.json({ error: "Processing failed, please retry" }, { status });
  };

  try {
    if (eventType === "webhook.test") {
      return NextResponse.json({ received: true, test: true });
    }

    // Resolve the order: metadata.order_id first, then the SasPay session id.
    const metadata = (data.metadata ?? {}) as Record<string, unknown>;
    const orderId = str(metadata.order_id) || str(data.order_id);
    const sessionId =
      str(data.checkout_session_id) || str(data.session_id) || str(data.checkout_session) ||
      (eventType.startsWith("transaction.") ? null : str(data.id));

    let order: Order | null = null;
    if (orderId) {
      const { data: found } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
      order = (found as Order) ?? null;
    }
    if (!order && sessionId) {
      const { data: found } = await supabase
        .from("orders")
        .select("*")
        .eq("saspay_session_id", sessionId)
        .maybeSingle();
      order = (found as Order) ?? null;
    }
    if (!order && orderId === null && sessionId === null) {
      // Event not tied to a checkout order (e.g. settlement events) — recorded, ignored.
      return NextResponse.json({ received: true, ignored: true });
    }
    if (!order) return await fail(500);

    const transactionId = str(data.transaction_id) || str(data.id);

    switch (eventType) {
      case "transaction.created": {
        if (transactionId && !order.saspay_transaction_id) {
          await supabase
            .from("orders")
            .update({ saspay_transaction_id: transactionId })
            .eq("id", order.id);
        }
        return NextResponse.json({ received: true });
      }

      case "transaction.success": {
        if (order.status === "paid") return NextResponse.json({ received: true, already_paid: true });

        // 5) RE-VERIFY server-side — never trust the payload.
        const trustedSessionId = order.saspay_session_id || sessionId;
        if (!trustedSessionId) return await fail(500);
        const session = await getCheckoutSession(trustedSessionId);
        if (!isSessionPaid(session)) return await fail(409);
        if (!amountsMatch(session, Number(order.amount), order.currency)) return await fail(409);

        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: "paid",
            paid_at: now,
            delivered_at: now, // access is granted from this moment (signed URL on demand)
            saspay_transaction_id:
              transactionId || session.transaction_id || session.transaction?.id || order.saspay_transaction_id,
          })
          .eq("id", order.id)
          .eq("status", "pending"); // only a pending order can transition to paid
        if (updateError) return await fail(500);
        return NextResponse.json({ received: true, paid: true });
      }

      case "transaction.failed": {
        if (order.status === "pending") {
          await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
        }
        return NextResponse.json({ received: true });
      }

      case "transaction.cancelled": {
        if (order.status === "pending") {
          await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
        }
        return NextResponse.json({ received: true });
      }

      default:
        // Other signed events (settlement.*, wallet_transfer.*) are recorded
        // in webhook_events and need no order action.
        return NextResponse.json({ received: true, ignored: true });
    }
  } catch {
    return await fail(500);
  }
}
