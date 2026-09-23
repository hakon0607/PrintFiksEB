-- ------------------------------------------------------------
-- Økonomi: inntekter, utgifter og margin per modell (PrintFiksEB)
-- Kjør denne i Supabase -> SQL Editor hvis databasen er laget fra før.
-- Trygg å kjøre flere ganger.
-- ------------------------------------------------------------

-- 1. Ekstra kostnad per modell (ring, tape, emballasje o.l.)
alter table public.products add column if not exists cost_extra numeric(10,2) not null default 0;
alter table public.products add column if not exists cost_price numeric(10,2) not null default 0;

-- 2. Regnskapstabell
create table if not exists public.finances (
  id           uuid primary key default gen_random_uuid(),
  dato         date not null default current_date,
  type         text not null default 'utgift',   -- inntekt | utgift
  kategori     text default '',
  beskrivelse  text not null default '',
  belop        numeric(10,2) not null default 0,
  betalt       boolean not null default true,
  notat        text default '',
  opprettet_av text,
  created_at   timestamptz not null default now()
);

create index if not exists finances_dato_idx on public.finances (dato desc);

alter table public.finances enable row level security;

drop policy if exists "regnskap_ansatte" on public.finances;
create policy "regnskap_ansatte" on public.finances
  for all to authenticated using (true) with check (true);

-- 3. Sanntid, så alle ser nye føringer med en gang
do $$ begin
  begin alter publication supabase_realtime add table public.finances;
  exception when duplicate_object then null; when undefined_object then null; end;
end $$;
