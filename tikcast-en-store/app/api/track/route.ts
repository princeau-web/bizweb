import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Lightweight first-party analytics beacon. Stores ONLY: event kind,
// path, referrer, an anonymous per-tab session id and the user agent.
// No IPs stored, no fingerprinting, no third-party service.
const KINDS = new Set(["pageview", "watch_view", "buy_view", "checkout_start"]);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const kind = typeof body.kind === "string" ? body.kind : "";
    const path = typeof body.path === "string" ? body.path.slice(0, 200) : null;
    if (!KINDS.has(kind) || (path && path.startsWith("/admin"))) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const supabase = supabaseAdmin();
    await supabase.from("events").insert({
      kind,
      path,
      referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 300) : null,
      session_id: typeof body.session_id === "string" ? body.session_id.slice(0, 64) : null,
      user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Analytics must never break the storefront.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
