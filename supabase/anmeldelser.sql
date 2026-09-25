-- ============================================================
--  ANMELDELSER – det kundene sier om dere
--  Kjøres i Supabase → SQL Editor. Trygg å kjøre flere ganger.
-- ============================================================

create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '',           -- hvem som har sagt det
  place      text not null default '',           -- f.eks. «Sandsli» eller «kjøpte nøkkelholder»
  quote      text not null default '',           -- selve anmeldelsen
  stars      int  not null default 5,            -- 1–5
  active     boolean not null default true,      -- vises på nettsiden
  sort       int  not null default 100,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "les_offentlig" on public.reviews;
create policy "les_offentlig" on public.reviews for select using (true);

drop policy if exists "skriv_ansatte" on public.reviews;
create policy "skriv_ansatte" on public.reviews
  for all to authenticated using (true) with check (true);

-- Endringer her skal telle som «ikke publisert ennå»
drop trigger if exists marker_endring_trigger on public.reviews;
create trigger marker_endring_trigger
  after insert or update or delete on public.reviews
  for each statement execute function public.marker_endring();

-- Sanntid, så listen i admin oppdaterer seg selv
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.reviews';
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

-- Innstillinger for seksjonen på forsiden
insert into public.settings (key, value, label, help, type, "group", sort) values
  ('anmeldelser_pa', 'true', 'Vis anmeldelser på forsiden',
   'Skru av hvis dere ikke har noen ennå, eller ikke vil vise dem.', 'bool', 'Forsiden', 60),
  ('anmeldelser_tittel', 'Hva kundene sier', 'Overskrift over anmeldelsene',
   '', 'text', 'Forsiden', 62),
  ('anmeldelser_undertittel', 'Ekte tilbakemeldinger fra folk som har handlet hos oss.',
   'Linjen under overskriften', '', 'text', 'Forsiden', 64),
  ('anmeldelser_rotasjon', '6', 'Sekunder per anmeldelse',
   'Hvor lenge hver anmeldelse står før den neste kommer. Sett 0 for å slå av automatisk bytte.',
   'number', 'Forsiden', 66)
on conflict (key) do nothing;
