-- ============================================================
--  ANMELDELSER FRA KUNDER
--  Kunden får en lenke i «Takk for handelen»-e-posten. Anmeldelsen havner
--  under Anmeldelser i admin – skjult til dere slår den på og publiserer.
--  Kjør én gang i Supabase → SQL Editor. Trygg å kjøre flere ganger.
-- ============================================================

-- Hvor anmeldelsen kommer fra, og hvilken bestilling den gjelder
alter table public.reviews add column if not exists kilde text not null default 'admin';   -- admin | kunde
alter table public.reviews add column if not exists order_id uuid references public.orders(id) on delete set null;
create unique index if not exists reviews_order_idx on public.reviews (order_id) where order_id is not null;

-- Den hemmelige lenken per bestilling
alter table public.orders add column if not exists anmeldelse_token text;
create unique index if not exists orders_anmeldelse_token_idx
  on public.orders (anmeldelse_token) where anmeldelse_token is not null;

-- Viktig: nettsiden skal bare kunne lese anmeldelser som er publisert.
-- Før kunne hvem som helst lese også de skjulte via databasen.
drop policy if exists "les_offentlig" on public.reviews;
create policy "les_offentlig" on public.reviews for select using (active = true);
