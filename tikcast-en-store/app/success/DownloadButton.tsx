"use client";

import { useState } from "react";

// Asks the server for a fresh signed download URL.
// The page URL (order + token) is the buyer's personal key — the token is
// only ever checked server-side against its stored hash.
export default function DownloadButton({ order, token }: { order: string; token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order, token }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error || "Something went wrong. Please try again in a moment.");
        setBusy(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn" onClick={onClick} disabled={busy}>
        {busy ? "Preparing your download…" : "Download the ebook (PDF)"}
      </button>
      {error ? (
        <p style={{ color: "#ff8a8a", marginTop: 12 }}>{error}</p>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>
          Your download link is generated fresh each time and stays valid for 10 minutes.
          Bookmark this page to come back any time.
        </p>
      )}
    </div>
  );
}
