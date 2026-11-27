import "server-only";
import { PRODUCT, saspayApiBase } from "./config";

// SasPay API client — server-only. The secret key is never logged and never
// sent to the browser.
// Docs: docs.saspay.me/api-reference/payments/checkout-create
//       docs.saspay.me/api-reference/payments/checkout-get

function authHeaders(): HeadersInit {
  const key = process.env.SASPAY_SECRET_KEY;
  if (!key) throw new Error("SASPAY_SECRET_KEY is not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export interface CheckoutSession {
  id: string;
  checkout_url: string;
  status?: string;
  transaction_status?: string;
  amount?: string | number;
  currency?: string;
  transaction_id?: string | null;
  transaction?: { id?: string } | null;
  metadata?: Record<string, unknown> | null;
}

function unwrap(json: unknown): CheckoutSession {
  const root = (json ?? {}) as Record<string, unknown>;
  const data = (root.data ?? root) as Record<string, unknown>;
  return data as unknown as CheckoutSession;
}

export async function createCheckoutSession(params: {
  orderId: string;
  email: string;
  returnUrl: string;
}): Promise<CheckoutSession> {
  const res = await fetch(`${saspayApiBase()}/api/v1/checkout-sessions/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      amount: PRODUCT.priceDecimal,
      currency: PRODUCT.currency,
      customer_email: params.email,
      // SasPay requires customer_name — derive a display name from the email.
      customer_name: params.email.split("@")[0] || "Customer",
      description: PRODUCT.name,
      return_url: params.returnUrl,
      metadata: { order_id: params.orderId, product: "faceless-shorts-ebook" },
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    // Never log the Authorization header or the secret — status only.
    throw new Error(`SasPay create checkout session failed (HTTP ${res.status})`);
  }
  const session = unwrap(await res.json());
  if (!session.id || !session.checkout_url) {
    throw new Error("SasPay create checkout session: missing id/checkout_url in response");
  }
  return session;
}

/** Re-fetch a checkout session server-side — the ONLY trusted source of truth. */
export async function getCheckoutSession(sessionId: string): Promise<CheckoutSession> {
  const res = await fetch(
    `${saspayApiBase()}/api/v1/checkout-sessions/${encodeURIComponent(sessionId)}/`,
    { method: "GET", headers: authHeaders(), cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(`SasPay get checkout session failed (HTTP ${res.status})`);
  }
  return unwrap(await res.json());
}

/**
 * Decide, from a freshly re-fetched session, whether it is truly PAID.
 * Session statuses: PENDING | PAID | EXPIRED | CANCELLED
 * Transaction statuses: PENDING | SUCCESS | FAILED | CANCELLED
 */
export function isSessionPaid(session: CheckoutSession): boolean {
  const status = (session.status || "").toUpperCase();
  const txStatus = (session.transaction_status || "").toUpperCase();
  return status === "PAID" && (txStatus === "" || txStatus === "SUCCESS");
}

export function amountsMatch(session: CheckoutSession, amount: number, currency: string): boolean {
  if (session.currency && session.currency.toUpperCase() !== currency.toUpperCase()) return false;
  if (session.amount === undefined || session.amount === null) return false;
  const sessionAmount = Number(session.amount);
  return Number.isFinite(sessionAmount) && Math.abs(sessionAmount - amount) < 0.005;
}
