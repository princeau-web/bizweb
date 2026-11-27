import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using the SERVICE ROLE key.
// This bypasses RLS — it must NEVER be imported from client code and the
// key must NEVER be exposed with a NEXT_PUBLIC_ prefix.
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export type OrderStatus = "pending" | "paid" | "failed" | "cancelled";

export interface Order {
  id: string;
  email: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  saspay_session_id: string | null;
  saspay_transaction_id: string | null;
  access_token_hash: string;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
}
