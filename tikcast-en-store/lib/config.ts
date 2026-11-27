// Central product / store configuration. Server + client safe (no secrets).

export const PRODUCT = {
  name: "Faceless Shorts — The TikCast_en Ebook",
  price: 20, // USD, one-time
  priceDecimal: "20.00", // SasPay expects a decimal string
  currency: "USD",
  supabaseBucket: "ebooks",
  supabaseObject: "ebook.pdf",
  signedUrlTtlSeconds: 600, // 10 minutes
} as const;

export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SITE_URL is not set");
  return url.replace(/\/+$/, "");
}

export function saspayApiBase(): string {
  // Default to the SANDBOX host. Production must be set explicitly.
  // ⚠️ https://api.saspay.me treats even test keys as LIVE — never test there.
  return (process.env.SASPAY_API_BASE || "https://sandbox-api.saspay.me").replace(/\/+$/, "");
}
