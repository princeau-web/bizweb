-- Correctif 2026-11-27 : la table webhook_events du projet « tikcast »
-- existait déjà (migration antérieure) avec les colonnes
-- (id, event_type, payload, processed_at) — différentes du schéma initial
-- du code (event_id, type, received_at), ce qui faisait échouer chaque
-- insertion du webhook (HTTP 500 « Could not record event »).
-- On ajoute la colonne de déduplication attendue par le code.
alter table public.webhook_events add column if not exists event_id text;
create unique index if not exists webhook_events_event_id_key
  on public.webhook_events (event_id);
