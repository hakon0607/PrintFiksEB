-- ============================================================
--  BILDER PÅ BESTILLINGER
--  Kunden kan legge ved opptil 2 bilder – mål, skisse eller
--  bilde av den ødelagte delen. Kjør denne én gang i
--  Supabase → SQL Editor → Run. Trygg å kjøre flere ganger.
-- ============================================================

alter table public.orders
  add column if not exists bilder text[] not null default '{}';


-- ------------------------------------------------------------
--  Egen bøtte, så bestillingsbilder ikke blandes med galleriet
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('bestillingsbilder', 'bestillingsbilder', true)
on conflict (id) do nothing;

-- Alle kan se bildet når de har adressen. Den er umulig å gjette.
drop policy if exists "bestillingsbilder_les" on storage.objects;
create policy "bestillingsbilder_les" on storage.objects
  for select using (bucket_id = 'bestillingsbilder');

-- Kunder laster IKKE opp hit selv. Det går via serveren, som bruker
-- service-nøkkelen og hopper over disse reglene. Dermed finnes det
-- ingen åpen opplastingsadresse noen kan fylle opp lagringen med.
drop policy if exists "bestillingsbilder_skriv" on storage.objects;
create policy "bestillingsbilder_skriv" on storage.objects
  for insert to authenticated with check (bucket_id = 'bestillingsbilder');

drop policy if exists "bestillingsbilder_oppdater" on storage.objects;
create policy "bestillingsbilder_oppdater" on storage.objects
  for update to authenticated using (bucket_id = 'bestillingsbilder');

drop policy if exists "bestillingsbilder_slett" on storage.objects;
create policy "bestillingsbilder_slett" on storage.objects
  for delete to authenticated using (bucket_id = 'bestillingsbilder');
