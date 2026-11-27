-- TikCast_en Store — Schéma Supabase
-- À exécuter dans Supabase → SQL Editor (une seule fois, projet neuf).
--
-- Sécurité : la RLS est ACTIVÉE sur toutes les tables et AUCUNE policy
-- publique n'est créée. Seul le serveur (clé service_role, qui contourne
-- la RLS) peut lire/écrire. Le navigateur des visiteurs n'a AUCUN accès
-- direct à ces tables.

create extension if not exists "pgcrypto";

-- ── Commandes ────────────────────────────────────────────────────────────────
create type public.order_status as enum ('pending', 'paid', 'failed', 'cancelled');

create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null,
  amount                numeric(10, 2) not null,
  currency              text not null default 'USD',
  status                public.order_status not null default 'pending',
  saspay_session_id     text,
  saspay_transaction_id text,
  -- SHA-256 (hex) du token d'accès — le token brut n'est JAMAIS stocké.
  access_token_hash     text not null,
  created_at            timestamptz not null default now(),
  paid_at               timestamptz,
  delivered_at          timestamptz
);

create index orders_email_idx on public.orders (email);
create index orders_saspay_session_idx on public.orders (saspay_session_id);

alter table public.orders enable row level security;
-- Aucune policy : accès service_role uniquement (serveur).

-- ── Événements webhook (déduplication) ──────────────────────────────────────
create table public.webhook_events (
  event_id    text primary key, -- contrainte unique = déduplication
  type        text not null,
  received_at timestamptz not null default now(),
  payload     jsonb not null
);

alter table public.webhook_events enable row level security;
-- Aucune policy : accès service_role uniquement (serveur).

-- ── Stockage privé de l'ebook ────────────────────────────────────────────────
-- À faire dans le dashboard Supabase (Storage) — ne peut pas être fait en SQL
-- de façon fiable selon les projets :
--   1. Storage → New bucket → nom : "ebooks" → PUBLIC : DÉSACTIVÉ (privé).
--   2. Uploader le fichier PDF sous le nom exact : "ebook.pdf"
--   3. Aucune policy publique sur le bucket : les téléchargements passent
--      uniquement par les URL signées générées côté serveur (10 minutes).
-- Le fichier ne doit exister QUE dans ce bucket privé — jamais dans le
-- dépôt Git, jamais dans un dossier public du site.
