"use client";

import { useState } from "react";
import { track } from "./Tracker";

// Buy form: collects the buyer's email and asks the SERVER to create the
// order + SasPay checkout session. The browser never sees any secret key.
export default function BuyForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    track("checkout_start");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { checkout_url?: string; error?: string };
      if (!res.ok || !json.checkout_url) {
        setError(json.error || "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      window.location.href = json.checkout_url;
    } catch {
      setError("Network error. Please check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="buyer-email">Your email — your download link is tied to it</label>
      <input
        id="buyer-email"
        type="email"
        required
        maxLength={254}
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
        {busy ? "Starting secure checkout…" : "Get instant access — $20"}
      </button>
      {error ? <div className="err">{error}</div> : null}
      <div className="fine">
        Secure payment by SasPay. After payment you land back here with your private download
        link. Keep that link — it is your personal key to the ebook.
      </div>
    </form>
  );
}
