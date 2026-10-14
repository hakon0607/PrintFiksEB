-- «Design din egen!»-merket på produkter kunden kan designe selv.
-- Kjør én gang i Supabase → SQL Editor. Trygg å kjøre flere ganger.

alter table public.products add column if not exists design_din_egen boolean not null default false;

-- Slå det på for dekselet og pepperkakeformen med en gang
update public.products set design_din_egen = true where code in ('deksel', 'pepperkake');
