-- ============================================================
--  DEKSELGENERATOR
--  Kjør én gang i Supabase → SQL Editor → Run. Trygg å kjøre flere ganger.
-- ============================================================

-- Dekselmodellene dere laster opp (iPhone 11–18 osv.)
create table if not exists public.deksel_modeller (
  id          uuid primary key default gen_random_uuid(),
  navn        text not null,
  aktiv       boolean not null default true,
  sort        int not null default 100,
  fil_url     text not null default '',
  fil_navn    text default '',
  bakside     jsonb,           -- baksiden, kamerahull og trygg sone – regnes ut automatisk
                               -- («analyse» er et reservert ord i Postgres)
  created_at  timestamptz not null default now()
);

alter table public.deksel_modeller enable row level security;

drop policy if exists "deksel_les" on public.deksel_modeller;
create policy "deksel_les" on public.deksel_modeller
  for select using (aktiv = true);

drop policy if exists "deksel_ansatte" on public.deksel_modeller;
create policy "deksel_ansatte" on public.deksel_modeller
  for all to authenticated using (true) with check (true);

-- Selve 3D-filene
insert into storage.buckets (id, name, public)
values ('dekselmodeller', 'dekselmodeller', true)
on conflict (id) do nothing;

drop policy if exists "dekselmodeller_les" on storage.objects;
create policy "dekselmodeller_les" on storage.objects
  for select using (bucket_id = 'dekselmodeller');
drop policy if exists "dekselmodeller_skriv" on storage.objects;
create policy "dekselmodeller_skriv" on storage.objects
  for insert to authenticated with check (bucket_id = 'dekselmodeller');
drop policy if exists "dekselmodeller_oppdater" on storage.objects;
create policy "dekselmodeller_oppdater" on storage.objects
  for update to authenticated using (bucket_id = 'dekselmodeller');
drop policy if exists "dekselmodeller_slett" on storage.objects;
create policy "dekselmodeller_slett" on storage.objects
  for delete to authenticated using (bucket_id = 'dekselmodeller');

-- Kundens design lagres på varelinja i bestillingen
alter table public.order_items add column if not exists design jsonb;

-- Priser og farger (vises under Priser i admin)
insert into public.settings (key, value, label, help, type, gruppe, sort) values
  ('deksel_grunnpris',      '59', 'Deksel: grunnpris', 'Prisen for et deksel med motiv, før fargene legges til.', 'number', 'Priser', 80),
  ('deksel_pris_per_farge', '10', 'Deksel: pris per farge i motivet', 'Legges til for hver farge kunden bruker i motivet.', 'number', 'Priser', 81),
  ('deksel_maks_farger',    '3',  'Deksel: maks farger i motivet', 'Én AMS har 4 plasser: dekselfargen + 3 i motivet.', 'number', 'Priser', 82),
  ('deksel_farger',
   E'Hvit #F4F4F1\nSvart #1B1B1D\nGrå #8E9089\nBlå #1E4DB7\nRød #C62A2F\nGrønn #1E9E4A\nGul #F2D21B',
   'Deksel: filamentfarger', 'Én farge per linje: navn og fargekode. Legg til eller fjern når dere får nye spoler.', 'longtext', 'Priser', 83)
on conflict (key) do nothing;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.deksel_modeller';
  exception when duplicate_object then null; when undefined_object then null;
  end;
end $$;
