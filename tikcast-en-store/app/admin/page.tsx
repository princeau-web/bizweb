import { isAdmin } from "@/lib/admin";
import { supabaseAdmin, type Order } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// ── Admin dashboard ─────────────────────────────────────────────────────────
// Protected by ADMIN_PASSWORD (see lib/admin.ts). Shows: revenue, orders,
// the visitor funnel (pageview → watch → buy section → checkout → paid)
// and the abandon list (checkouts started but never paid).

interface Ev {
  kind: string;
  session_id: string | null;
  created_at: string;
}

function sessions(events: Ev[], kind: string): number {
  return new Set(events.filter((e) => e.kind === kind).map((e) => e.session_id || "?")).size;
}
function count(events: Ev[], kind: string): number {
  return events.filter((e) => e.kind === kind).length;
}
function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
function money(n: number): string {
  return `$${n.toFixed(2)}`;
}
function age(fromIso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(fromIso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}
function pct(part: number, whole: number): string {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  if (!process.env.ADMIN_PASSWORD) {
    return (
      <div className="wrap" style={{ padding: "60px 0" }}>
        <h2>Admin not configured</h2>
        <p className="sub">The ADMIN_PASSWORD environment variable is not set on the server yet.</p>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="wrap" style={{ padding: "60px 0", maxWidth: 420 }}>
        <h2>TikCast_en — Admin</h2>
        <p className="sub">Private dashboard. Enter your admin password.</p>
        {searchParams.error ? (
          <p style={{ color: "#ff7b72" }}>Wrong password — try again.</p>
        ) : null}
        <form method="post" action="/api/admin/login">
          <label htmlFor="pw">Admin password</label>
          <input id="pw" name="password" type="password" required autoComplete="current-password" />
          <button className="btn" type="submit" style={{ width: "100%" }}>
            Open the dashboard
          </button>
        </form>
      </div>
    );
  }

  const supabase = supabaseAdmin();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [{ data: ordersData }, { data: eventsData }] = await Promise.all([
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("events").select("kind, session_id, created_at").gte("created_at", since).limit(20000),
  ]);
  const orders = (ordersData || []) as Order[];
  const events = (eventsData || []) as Ev[];

  const paid = orders.filter((o) => o.status === "paid");
  const revenue = paid.reduce((s, o) => s + Number(o.amount), 0);
  const revenueToday = paid
    .filter((o) => (o.paid_at || "") >= new Date().toISOString().slice(0, 10))
    .reduce((s, o) => s + Number(o.amount), 0);
  const byStatus = {
    paid: paid.length,
    pending: orders.filter((o) => o.status === "pending").length,
    failed: orders.filter((o) => o.status === "failed").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };
  // Abandons: checkout created but never paid (pending older than 30 min,
  // plus failed/cancelled). This is where money is leaking.
  const abandons = orders.filter(
    (o) =>
      o.status === "failed" ||
      o.status === "cancelled" ||
      (o.status === "pending" && Date.now() - new Date(o.created_at).getTime() > 30 * 60000)
  );

  const funnel: Array<[string, number]> = [
    ["Visitors (page views)", sessions(events, "pageview")],
    ["Saw the videos", sessions(events, "watch_view")],
    ["Reached the buy section", sessions(events, "buy_view")],
    ["Started checkout", Math.max(sessions(events, "checkout_start"), orders.length)],
    ["Paid", byStatus.paid],
  ];
  const top = Math.max(1, funnel[0][1]);

  const card: React.CSSProperties = {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20,
  };
  const bar: React.CSSProperties = { height: 10, borderRadius: 6, background: "var(--sky)" };

  return (
    <div className="wrap" style={{ padding: "36px 0 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>TikCast_en — Dashboard</h2>
        <form method="post" action="/api/admin/logout">
          <button className="btn small" type="submit">Log out</button>
        </form>
      </div>
      <p className="sub">Last 30 days for visitors · all time for orders. Refresh the page for fresh numbers.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, margin: "18px 0" }}>
        <div style={card}><b style={{ fontSize: 26 }}>{money(revenue)}</b><br /><span className="sub">Revenue (paid)</span></div>
        <div style={card}><b style={{ fontSize: 26 }}>{money(revenueToday)}</b><br /><span className="sub">Revenue today</span></div>
        <div style={card}><b style={{ fontSize: 26 }}>{fmt(byStatus.paid)}</b><br /><span className="sub">Sales</span></div>
        <div style={card}><b style={{ fontSize: 26 }}>{fmt(count(events, "pageview"))}</b><br /><span className="sub">Page views (30 d)</span></div>
        <div style={card}><b style={{ fontSize: 26 }}>{fmt(abandons.length)}</b><br /><span className="sub">Abandoned checkouts</span></div>
      </div>

      <h3>Where visitors drop off</h3>
      <div style={{ ...card, marginBottom: 22 }}>
        {funnel.map(([label, n], i) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}>
              <span>{label}</span>
              <b>{fmt(n)}{i > 0 ? ` · ${pct(n, funnel[i - 1][1])} of previous step` : ""}</b>
            </div>
            <div style={{ background: "var(--navy-2)", borderRadius: 6, marginTop: 4 }}>
              <div style={{ ...bar, width: `${Math.max(2, (n / top) * 100)}%` }} />
            </div>
          </div>
        ))}
        <p className="sub" style={{ margin: 0 }}>
          Conversion visitor → sale: <b>{pct(byStatus.paid, funnel[0][1])}</b> · checkout → paid:{" "}
          <b>{pct(byStatus.paid, Math.max(1, byStatus.paid + byStatus.pending + byStatus.failed + byStatus.cancelled))}</b>
        </p>
      </div>

      <h3>Abandoned checkouts ({abandons.length})</h3>
      <div style={{ ...card, marginBottom: 22, overflowX: "auto" }}>
        {abandons.length === 0 ? (
          <p className="sub" style={{ margin: 0 }}>None — every started checkout was paid. </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr><th align="left">Email</th><th align="left">Status</th><th align="left">When</th><th align="right">Amount</th></tr></thead>
            <tbody>
              {abandons.slice(0, 30).map((o) => (
                <tr key={o.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{o.email}</td><td>{o.status}</td><td>{age(o.created_at)}</td><td align="right">{money(Number(o.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h3>Latest orders</h3>
      <div style={{ ...card, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead><tr><th align="left">Email</th><th align="left">Status</th><th align="left">When</th><th align="right">Amount</th></tr></thead>
          <tbody>
            {orders.slice(0, 30).map((o) => (
              <tr key={o.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td>{o.email}</td><td>{o.status}</td><td>{age(o.created_at)}</td><td align="right">{money(Number(o.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
