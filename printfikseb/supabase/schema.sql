-- ============================================================
-- PrintFiksEB – databaseoppsett for Supabase
-- Kjør HELE denne filen i Supabase -> SQL Editor -> New query -> Run
-- Den kan kjøres på nytt uten å ødelegge data.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. Profiler (ansatte som kan logge inn på /admin)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  role        text not null default 'medlem',   -- 'eier' | 'medlem'
  created_at  timestamptz not null default now()
);

-- Første bruker som opprettes blir automatisk 'eier'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  antall int;
begin
  select count(*) into antall from public.profiles;
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''), '@', 1)),
    case when antall = 0 then 'eier' else coalesce(new.raw_user_meta_data->>'role', 'medlem') end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 2. Innstillinger og tekster (nøkkel/verdi – dere kan legge til nye selv)
-- ------------------------------------------------------------
create table if not exists public.settings (
  key         text primary key,
  value       text not null default '',
  label       text not null default '',
  help        text default '',
  type        text not null default 'text',     -- text | longtext | number | bool
  gruppe      text not null default 'Generelt',
  sort        int  not null default 100,
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. Materialer (PLA, PETG, ... – pris per gram)
-- ------------------------------------------------------------
create table if not exists public.materials (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  price_per_gram  numeric(10,2) not null default 0,
  description     text default '',
  color           text default '#2559C7',
  active          boolean not null default true,
  sort            int not null default 100,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. Vektintervaller (0–10 g, 10–50 g ...)
-- ------------------------------------------------------------
create table if not exists public.weight_ranges (
  id      uuid primary key default gen_random_uuid(),
  label   text not null,
  min_g   int not null default 0,
  max_g   int not null default 10,
  active  boolean not null default true,
  sort    int not null default 100
);

-- ------------------------------------------------------------
-- 5. Tillegg (design av 3D-fil, hjemmebesøk for oppmåling ...)
-- ------------------------------------------------------------
create table if not exists public.extras (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text default '',
  price       numeric(10,2) not null default 0,
  scope       text not null default 'item',    -- 'item' = per modell, 'order' = én gang
  active      boolean not null default true,
  sort        int not null default 100
);

-- ------------------------------------------------------------
-- 6. Leveringsvalg (henting / hjemlevering)
-- ------------------------------------------------------------
create table if not exists public.delivery_options (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text default '',
  price       numeric(10,2) not null default 0,
  active      boolean not null default true,
  sort        int not null default 100
);

-- ------------------------------------------------------------
-- 7. Galleri – ferdige modeller til salgs
-- ------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  code        text unique,                      -- ID-en kunden oppgir, f.eks. 53417
  name        text not null,
  description text default '',
  price       numeric(10,2) not null default 0,
  image_url   text default '',
  material    text default '',
  weight_g    int,
  category    text default '',
  featured    boolean not null default false,
  active      boolean not null default true,
  sort        int not null default 100,
  created_at  timestamptz not null default now()
);

-- Gir hver ny modell et tilfeldig 5-sifret ID-nummer hvis dere ikke fyller det ut
create or replace function public.set_product_code()
returns trigger
language plpgsql
as $$
declare
  forsok int := 0;
  kandidat text;
begin
  if new.code is null or btrim(new.code) = '' then
    loop
      kandidat := lpad((10000 + floor(random() * 89999))::int::text, 5, '0');
      exit when not exists (select 1 from public.products where code = kandidat);
      forsok := forsok + 1;
      exit when forsok > 40;
    end loop;
    new.code := kandidat;
  end if;
  return new;
end;
$$;

drop trigger if exists products_set_code on public.products;
create trigger products_set_code
  before insert on public.products
  for each row execute function public.set_product_code();

-- ------------------------------------------------------------
-- 8. Ansatte som vises på "Om oss"
-- ------------------------------------------------------------
create table if not exists public.team_members (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  name          text not null,
  role          text default '',
  bio           text default '',
  email         text default '',
  avatar_url    text default '',
  show_on_site  boolean not null default true,
  sort          int not null default 100,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 9. Invitasjoner til nye ansatte
-- ------------------------------------------------------------
create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text default '',
  role        text not null default 'medlem',
  status      text not null default 'sendt',    -- sendt | godtatt | avbrutt
  invited_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);

-- ------------------------------------------------------------
-- 10. Ofte stilte spørsmål
-- ------------------------------------------------------------
create table if not exists public.faq (
  id       uuid primary key default gen_random_uuid(),
  question text not null,
  answer   text not null default '',
  active   boolean not null default true,
  sort     int not null default 100
);

-- ============================================================
-- RLS – alle kan LESE nettsiden, bare innloggede ansatte kan ENDRE
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.settings         enable row level security;
alter table public.materials        enable row level security;
alter table public.weight_ranges    enable row level security;
alter table public.extras           enable row level security;
alter table public.delivery_options enable row level security;
alter table public.products         enable row level security;
alter table public.team_members     enable row level security;
alter table public.invites          enable row level security;
alter table public.faq              enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'settings','materials','weight_ranges','extras',
    'delivery_options','products','team_members','faq'
  ]
  loop
    execute format('drop policy if exists "les_offentlig" on public.%I', t);
    execute format('create policy "les_offentlig" on public.%I for select using (true)', t);

    execute format('drop policy if exists "skriv_ansatte" on public.%I', t);
    execute format(
      'create policy "skriv_ansatte" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Profiler: du kan se alle ansatte når du er logget inn, og endre din egen rad
drop policy if exists "profil_les" on public.profiles;
create policy "profil_les" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profil_endre_egen" on public.profiles;
create policy "profil_endre_egen" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Invitasjoner: kun innloggede
drop policy if exists "invites_ansatte" on public.invites;
create policy "invites_ansatte" on public.invites
  for all to authenticated using (true) with check (true);

-- ============================================================
-- STORAGE – bilder til galleriet
-- ============================================================
insert into storage.buckets (id, name, public)
values ('bilder', 'bilder', true)
on conflict (id) do update set public = true;

drop policy if exists "bilder_les" on storage.objects;
create policy "bilder_les" on storage.objects
  for select using (bucket_id = 'bilder');

drop policy if exists "bilder_skriv" on storage.objects;
create policy "bilder_skriv" on storage.objects
  for insert to authenticated with check (bucket_id = 'bilder');

drop policy if exists "bilder_oppdater" on storage.objects;
create policy "bilder_oppdater" on storage.objects
  for update to authenticated using (bucket_id = 'bilder');

drop policy if exists "bilder_slett" on storage.objects;
create policy "bilder_slett" on storage.objects
  for delete to authenticated using (bucket_id = 'bilder');

-- ============================================================
-- STARTVERDIER (kjøres bare hvis tabellen er tom)
-- ============================================================
insert into public.settings (key, value, label, help, type, gruppe, sort) values
  ('bedrift_navn',        'PrintFiksEB',                          'Bedriftsnavn',            '', 'text',     'Generelt', 10),
  ('bedrift_slagord',     'Ideer blir virkelighet',               'Slagord',                 'Vises under logoen', 'text', 'Generelt', 20),
  ('bedrift_skole',       'Skranevatnet skole',                   'Skole',                   '', 'text',     'Generelt', 30),
  ('bedrift_sted',        'Sandsli, Bergen',                      'Sted',                    '', 'text',     'Generelt', 40),
  ('kontakt_telefon',     '41381608',                             'Telefon / SMS',           'Hit sendes bestillingsmeldingen', 'text', 'Kontakt', 10),
  ('kontakt_epost',       '',                                     'E-post',                  'Valgfritt', 'text', 'Kontakt', 20),
  ('vipps_nummer',        '41381608',                             'Vipps-nummer',            '', 'text',     'Kontakt', 30),
  ('vipps_navn',          'PrintFiksEB',                          'Vipps-navn',              '', 'text',     'Kontakt', 40),
  ('kontakt_meldingstid', 'Meldinger kan du sende når som helst – hele døgnet, alle dager.', 'Når kan folk sende melding?', 'Vises ved SMS-knappen', 'text', 'Kontakt', 42),
  ('kontakt_ringetid',    'Ring mellom 15 og 21, mandag til lørdag.', 'Når kan folk ringe?',   'Vises ved ring-knappen', 'text', 'Kontakt', 44),
  ('kontakt_ringer_tilbake', 'Rekker vi ikke å ta telefonen, ringer vi tilbake så fort vi har tid.', 'Hvis dere ikke svarer', '', 'text', 'Kontakt', 46),
  ('sosial_instagram',    '',                                     'Instagram (lenke)',       'Valgfritt', 'text', 'Kontakt', 50),
  ('sosial_snapchat',     '',                                     'Snapchat (brukernavn)',   'Valgfritt', 'text', 'Kontakt', 60),
  ('pris_startpris',      '100',                                  'Startpris (kr)',          'Legges på én gang per bestilling', 'number', 'Priser', 10),
  ('pris_startpris_pa',   'ja',                                   'Bruk startpris',          'Skru av for å fjerne startprisen helt', 'bool', 'Priser', 20),
  ('pris_valuta',         'kr',                                   'Valuta',                  '', 'text',     'Priser', 30),
  ('pris_reparasjon',     'Pris etter avtale',                    'Reparasjon – pristekst',  'Vises på reparasjonskortet', 'text', 'Priser', 40),
  ('levering_radius_km',  '3',                                    'Radius hjemlevering (km)','Målt fra skolen', 'number', 'Levering', 10),
  ('levering_dager_min',  '2',                                    'Leveringstid fra (dager)','Virkedager', 'number', 'Levering', 20),
  ('levering_dager_maks', '4',                                    'Leveringstid til (dager)','Virkedager', 'number', 'Levering', 30),
  ('betaling_tekst',      'Vi tar helst Vipps. Kontant går også fint, men si fra på forhånd så vi har veksel klart.', 'Betalingstekst', '', 'longtext', 'Levering', 40),
  ('tekst_hero_tittel',   'Vi printer, fikser og designer det du trenger i 3D',      'Forside – overskrift', '', 'text',     'Tekster', 10),
  ('tekst_hero_ingress',  'PrintFiksEB er en elevbedrift på Skranevatnet skole. Send oss en idé, et mål eller et ødelagt plastdel – så lager vi det. Du får alltid en pris du må godkjenne før vi starter.', 'Forside – ingress', '', 'longtext', 'Tekster', 20),
  ('tekst_om_oss',        'PrintFiksEB er en elevbedrift drevet av 10. klassinger på Skranevatnet skole. Vi startet fordi vi syntes det var rart at så mye kastes når en liten plastdel ryker – og fordi 3D-printing rett og slett er gøy. I dag printer vi reservedeler, holdere, figurer, gaver og egne design for folk i nærmiljøet.', 'Om oss – tekst', '', 'longtext', 'Tekster', 30),
  ('tekst_reparasjon',    'Har du noe som har knekt? Send oss bilde og mål på SMS, så finner vi ut om vi kan printe en ny del eller lage en løsning. Vi gir alltid pris før vi begynner.', 'Reparasjon – tekst', '', 'longtext', 'Tekster', 40),
  ('tekst_godkjenning',   'Alle priser på nettsiden er estimat. Du får en endelig pris på melding som du må godkjenne før vi starter å printe.', 'Tekst om prisgodkjenning', '', 'longtext', 'Tekster', 50)
on conflict (key) do nothing;

insert into public.materials (name, price_per_gram, description, color, sort)
select * from (values
  ('PLA',  0.80::numeric, 'Standard og rimeligst. Fint til figurer, holdere, pynt og det meste innendørs.', '#2559C7', 10),
  ('PETG', 1.00::numeric, 'Tåler mer varme og slag. Best til deler som skal brukes ute eller belastes.',     '#14171C', 20)
) as v(name, price_per_gram, description, color, sort)
where not exists (select 1 from public.materials);

insert into public.weight_ranges (label, min_g, max_g, sort)
select * from (values
  ('0–10 g (nøkkelring, liten figur)',      0,   10,  10),
  ('10–50 g (holder, klips, liten del)',    10,  50,  20),
  ('50–100 g (boks, stativ)',               50,  100, 30),
  ('100–250 g (større del, figur)',         100, 250, 40),
  ('250–500 g (stort objekt)',              250, 500, 50),
  ('Over 500 g',                            500, 900, 60)
) as v(label, min_g, max_g, sort)
where not exists (select 1 from public.weight_ranges);

insert into public.extras (name, description, price, scope, sort)
select * from (values
  ('Vi designer 3D-filen for deg', 'Du slipper å lage modellen selv – vi tegner den etter det du beskriver.', 100::numeric, 'item',  10),
  ('Hjemmebesøk for oppmåling',    'En av oss kommer hjem til deg og tar målene, så slipper du å tegne.',      50::numeric, 'order', 20)
) as v(name, description, price, scope, sort)
where not exists (select 1 from public.extras);

insert into public.delivery_options (name, description, price, sort)
select * from (values
  ('Henting',      'Du henter hos oss på Sandsli. Helt gratis.',                        0::numeric,  10),
  ('Hjemlevering', 'Vi kommer hjem til deg innenfor 3 km fra Skranevatnet skole.',      50::numeric, 20)
) as v(name, description, price, sort)
where not exists (select 1 from public.delivery_options);

insert into public.faq (question, answer, sort)
select * from (values
  ('Hvordan bestiller jeg?', 'Bruk priskalkulatoren eller galleriet, legg det du vil ha i handlelisten, og trykk «Send bestilling». Da får du en ferdig melding du bare sender til oss på SMS. Så svarer vi og avtaler resten.', 10),
  ('Hva koster det?', 'Det koster 100 kr i startpris per bestilling, pluss 0,80 kr per gram for PLA eller 1,00 kr per gram for PETG. Skal vi designe 3D-filen for deg koster det 100 kr ekstra.', 20),
  ('Må jeg vite hvor mange gram modellen er?', 'Nei. Du velger bare omtrent hvor stor den er i kalkulatoren, så gir vi deg en nøyaktig pris på melding etterpå.', 30),
  ('Hva hvis jeg ikke har en 3D-fil?', 'Da kan du sende oss en detaljert tegning med alle mål, så printer vi etter den. Eller så designer vi filen for deg for 100 kr. Vi kan også komme hjem til deg og ta målene for 50 kr ekstra.', 40),
  ('Hvor lang tid tar det?', 'Vanligvis 2–4 virkedager fra du har godkjent prisen. Store eller kompliserte jobber kan ta litt lenger – da sier vi fra.', 50),
  ('Hvordan betaler jeg?', 'Helst med Vipps. Kontant går også helt fint, men gi beskjed på forhånd så vi har veksel klart.', 60),
  ('Kan dere reparere ting?', 'Ofte ja! Send oss bilde og mål av det som er ødelagt, så sier vi om vi får det til og hva det koster.', 70),
  ('Leverer dere hjem?', 'Ja, for 50 kr innenfor 3 km fra Skranevatnet skole. Henter du selv er det gratis.', 80),
  ('Kan jeg ringe i stedet for å sende melding?', 'Ja! Meldinger kan du sende når som helst, hele døgnet. Telefonen tar vi mellom 15 og 21, mandag til lørdag. Rekker vi ikke å svare, ringer vi tilbake så fort vi har tid.', 90)
) as v(question, answer, sort)
where not exists (select 1 from public.faq);

-- Ferdig!
