-- ============================================================
--  IMPORT FRA LENKE – husker hvor modellen kommer fra
--  Kjøres i Supabase → SQL Editor. Trygg å kjøre flere ganger.
-- ============================================================

alter table public.products add column if not exists source_url text default '';
alter table public.products add column if not exists kilde_designer text default '';
alter table public.products add column if not exists kilde_lisens text default '';
