-- ============================================================
--  DEKSEL: SJEKK OG REPARER
--  Kjør i Supabase → SQL Editor. Den retter det vanligste som kan
--  gå galt, og viser til slutt en tabell over hvordan det står til.
--  Trygg å kjøre så mange ganger dere vil.
-- ============================================================

-- 1. Tabellen og kolonnene finnes
create table if not exists public.deksel_modeller (
  id          uuid primary key default gen_random_uuid(),
  navn        text not null,
  aktiv       boolean not null default true,
  sort        int not null default 100,
  fil_url     text not null default '',
  fil_navn    text default '',
  bakside     jsonb,
  created_at  timestamptz not null default now()
);
alter table public.deksel_modeller add column if not exists bakside jsonb;
alter table public.deksel_modeller add column if not exists aktiv boolean not null default true;

-- 2. Nettsiden (anon) får lese de synlige, admin (innlogget) får gjøre alt
alter table public.deksel_modeller enable row level security;
grant select on public.deksel_modeller to anon, authenticated;
grant insert, update, delete on public.deksel_modeller to authenticated;
drop policy if exists "deksel_les" on public.deksel_modeller;
create policy "deksel_les" on public.deksel_modeller for select using (aktiv = true);
drop policy if exists "deksel_ansatte" on public.deksel_modeller;
create policy "deksel_ansatte" on public.deksel_modeller
  for all to authenticated using (true) with check (true);

-- 3. Dekselproduktet i galleriet
insert into public.products
  (code, name, tagline, description, price, image_url, images, material, category, featured, active, sort)
select 'deksel', 'Mobildeksel med eget motiv', 'Ditt bilde eller din logo – printet rett inn i dekselet',
       'Last opp et bilde, flytt det dit du vil og velg farger. Du ser med en gang hvordan dekselet blir.',
       69, '/deksel/kort.jpg', '{}', 'PLA', 'Mobildeksel', true, true, 5
where not exists (select 1 from public.products where code = 'deksel');

-- 4. Be databasens API lese inn tabellene på nytt (nye kolonner blir ellers ikke sett)
notify pgrst, 'reload schema';

-- 5. Status
select 'Mobiler totalt' as hva, count(*)::text as svar from public.deksel_modeller
union all select 'Mobiler synlige for kunder', count(*)::text from public.deksel_modeller where aktiv
union all select 'Mobiler med ferdig analyse', count(*)::text from public.deksel_modeller where bakside ? 'trygg'
union all select 'Navn på mobilene', coalesce(string_agg(navn || case when aktiv then '' else ' (skjult)' end, ', '), '–') from public.deksel_modeller
union all select 'Dekselprodukt finnes', count(*)::text from public.products where code = 'deksel'
union all select 'Dekselprodukt synlig', count(*)::text from public.products where code = 'deksel' and active
union all select 'Nettsiden kan lese mobilene', has_table_privilege('anon', 'public.deksel_modeller', 'select')::text
union all select 'Nettsiden kan lese produkter', has_table_privilege('anon', 'public.products', 'select')::text;
