import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Admin auth: a single password (ADMIN_PASSWORD env var). The session
// cookie carries an expiry + an HMAC signature keyed by the password
// itself — the password never leaves the server, and changing it
// invalidates every existing session.
const COOKIE = "tikcast_admin";
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function password(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("hex");
}

export function checkPassword(candidate: string): boolean {
  const pw = password();
  if (!pw || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(pw);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSessionValue(): string | null {
  const pw = password();
  if (!pw) return null;
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${sign(exp, pw)}`;
}

export function isAdmin(): boolean {
  const pw = password();
  if (!pw) return false;
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = sign(exp, pw);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_TTL_SECONDS = TTL_MS / 1000;
