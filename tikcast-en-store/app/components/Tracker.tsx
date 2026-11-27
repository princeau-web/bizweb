"use client";
import { useEffect } from "react";

// Sends anonymous funnel events to /api/track:
// pageview → watch_view (videos section seen) → buy_view (buy section
// seen) → checkout_start (recorded in BuyForm on submit).
export function track(kind: string) {
  try {
    let sid = sessionStorage.getItem("tc_sid");
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("tc_sid", sid);
    }
    const payload = JSON.stringify({
      kind,
      path: window.location.pathname,
      referrer: document.referrer || null,
      session_id: sid,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
    } else {
      void fetch("/api/track", { method: "POST", body: payload, keepalive: true });
    }
  } catch {
    // never break the page for analytics
  }
}

export default function Tracker() {
  useEffect(() => {
    track("pageview");
    const seen = new Set<string>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const kind = e.target.id === "watch" ? "watch_view" : e.target.id === "buy" ? "buy_view" : null;
          if (kind && !seen.has(kind)) {
            seen.add(kind);
            track(kind);
          }
        }
      },
      { threshold: 0.35 }
    );
    for (const id of ["watch", "buy"]) {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, []);
  return null;
}
