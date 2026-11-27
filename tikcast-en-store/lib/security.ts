import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// ── Access tokens ────────────────────────────────────────────────────────────
// The raw token is only ever shown once (in the buyer's return URL).
// The database stores ONLY its SHA-256 hash.

export function generateAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Timing-safe comparison of two hex strings (length-checked first). */
export function timingSafeHexEqual(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyAccessToken(token: string, storedHashHex: string): boolean {
  if (!token || token.length > 200) return false;
  return timingSafeHexEqual(hashAccessToken(token), storedHashHex);
}

// ── SasPay webhook signature ─────────────────────────────────────────────────
// Per SasPay docs (docs.saspay.me/api-reference/webhooks):
//  - the signature covers "{timestamp}.{rawBody}" (timestamp and body,
//    separated by a dot), HMAC with the webhook secret;
//  - reject when the timestamp is more than 5 minutes from server time;
//  - always recompute on the RAW body, never on re-serialized JSON.
//
// ⚠️ The docs' rendered text confirms the header `X-Webhook-Timestamp` but
// the exact signature header name was not extractible from the docs page.
// We therefore read the signature defensively from the documented-style
// candidate header names below. Confirm the real one in the SasPay
// dashboard delivery log after the first `webhook.test` and trim the list.

const SIGNATURE_HEADERS = [
  "x-webhook-signature",
  "x-saspay-signature",
  "x-signature",
  "webhook-signature",
];

const EVENT_ID_HEADERS = ["x-webhook-id", "x-webhook-event-id", "x-event-id", "x-delivery-id"];

export function getHeaderCI(headers: Headers, names: string[]): string | null {
  for (const name of names) {
    const v = headers.get(name);
    if (v) return v.trim();
  }
  return null;
}

export function getWebhookEventId(headers: Headers): string | null {
  return getHeaderCI(headers, EVENT_ID_HEADERS);
}

export const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

/** SasPay timestamps may be seconds or milliseconds — normalize to ms. */
export function normalizeTimestampMs(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1e12 ? n * 1000 : n;
}

export function isTimestampFresh(timestampMs: number, nowMs = Date.now()): boolean {
  return Math.abs(nowMs - timestampMs) <= MAX_TIMESTAMP_SKEW_MS;
}

/**
 * Verify the webhook signature against the RAW body.
 * Accepts hex digests, optionally prefixed with "sha256=".
 */
export function verifyWebhookSignature(params: {
  rawBody: string;
  timestamp: string;
  signatureHeader: string;
  secret: string;
}): boolean {
  const { rawBody, timestamp, signatureHeader, secret } = params;
  if (!signatureHeader || !secret) return false;

  const expectedHex = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const candidates = signatureHeader
    .split(",")
    .map((s) => s.trim())
    .map((s) => (s.startsWith("sha256=") ? s.slice("sha256=".length) : s))
    .filter((s) => /^[0-9a-fA-F]+$/.test(s));

  for (const candidate of candidates) {
    if (timingSafeHexEqual(expectedHex, candidate.toLowerCase())) return true;
  }
  return false;
}

export function getSignatureHeader(headers: Headers): string | null {
  return getHeaderCI(headers, SIGNATURE_HEADERS);
}
