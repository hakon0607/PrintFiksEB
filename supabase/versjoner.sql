-- ============================================================
--  VERSJONER AV MODELLER (størrelser o.l.)
--  Kjør én gang i Supabase → SQL Editor → Run. Trygg å kjøre flere ganger.
--
--  Hver modell kan få en liste med versjoner. Hver versjon har:
--    id, navn, pris, vekt_g (valgfri) og bilder (liste med adresser).
--  Står lista tom, selges modellen i én versjon som før.
-- ============================================================

alter table public.products
  add column if not exists variants jsonb not null default '[]'::jsonb;
