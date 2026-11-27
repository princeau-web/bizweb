-- Espace admin — table des événements visiteurs (analytics maison, sans
-- service externe). Alimentée par /api/track (service_role uniquement).
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,           -- pageview | watch_view | buy_view | checkout_start
  path       text,
  referrer   text,
  session_id text,                    -- id anonyme de session (sessionStorage)
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists events_created_idx on public.events (created_at);
create index if not exists events_kind_idx on public.events (kind);
alter table public.events enable row level security;
-- Aucune policy : accès service_role uniquement (serveur).
