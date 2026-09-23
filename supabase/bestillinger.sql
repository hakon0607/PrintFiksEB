-- ------------------------------------------------------------
-- Bestillinger rett inn i adminpanelet (PrintFiksEB)
-- Kjør denne i Supabase -> SQL Editor. Trygg å kjøre flere ganger.
-- ------------------------------------------------------------

-- 1. Nye felter på bestillingene
alter table public.orders add column if not exists epost text default '';
alter table public.orders add column if not exists ordrenr text;
alter table public.orders add column if not exists kilde text not null default 'admin';
alter table public.orders add column if not exists kostnad numeric(10,2) not null default 0;

create unique index if not exists orders_ordrenr_idx on public.orders (ordrenr) where ordrenr is not null;

-- 2. Kort bestillingsnummer kunden kan oppgi
create or replace function public.set_order_number()
returns trigger
language plpgsql
as $$
declare
  forsok int := 0;
  kandidat text;
begin
  if new.ordrenr is null or btrim(new.ordrenr) = '' then
    loop
      kandidat := lpad((1000 + floor(random() * 8999))::int::text, 4, '0');
      exit when not exists (select 1 from public.orders where ordrenr = kandidat);
      forsok := forsok + 1;
      exit when forsok > 40;
    end loop;
    new.ordrenr := kandidat;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_number on public.orders;
create trigger orders_set_number
  before insert on public.orders
  for each row execute function public.set_order_number();

-- Gamle bestillinger får også et nummer
update public.orders set ordrenr = lpad((1000 + floor(random() * 8999))::int::text, 4, '0')
where ordrenr is null;

-- 3. Hvem av de ansatte som skal få e-post om nye bestillinger
alter table public.team_members add column if not exists varsel_bestilling boolean not null default false;

-- 4. Avsenderadresse og varsel-adresse
insert into public.settings (key, value, label, help, type, gruppe, sort) values
  ('epost_avsender', 'PrintFiksEB <onboarding@resend.dev>', 'Avsender på e-post', 'Slik ser avsenderen ut i kvitteringene.', 'text', 'Kontakt', 46),
  ('epost_bedrift',  '', 'E-post til bedriften', 'Hit sendes varsel om nye bestillinger.', 'text', 'Kontakt', 48)
on conflict (key) do nothing;

update public.settings
set value = 'Bestillinger på nettsiden tar vi imot hele døgnet, alle dager.',
    label = 'Når kan folk bestille?',
    help  = 'Vises ved bestillingsknappen'
where key = 'kontakt_meldingstid';

-- 5. Tekster som nevnte SMS-bestilling
update public.settings set value = 'Har du noe som har knekt? Beskriv det i bestillingen, så tar vi kontakt og finner ut om vi kan printe en ny del eller lage en løsning. Vi gir alltid pris før vi begynner.'
where key = 'tekst_reparasjon';

update public.settings set value = 'Alle priser på nettsiden er estimat. Du får en endelig pris fra oss som du må godkjenne før vi starter å printe.'
where key = 'tekst_godkjenning';

update public.settings set label = 'Telefon', help = 'Nummeret folk kan ringe eller sende melding til'
where key = 'kontakt_telefon';

update public.faq set answer = 'Bruk bestillingssiden eller galleriet, legg det du vil ha i handlelisten, fyll inn fullt navn, mobilnummer og e-post, og trykk «Send bestilling». Bestillingen kommer rett inn til oss, du får kvittering på e-post med bestillingsnummer, og vi tar kontakt så fort vi kan.'
where question ilike 'Hvordan bestiller jeg%';

update public.faq set answer = 'Nei. Du velger bare omtrent hvor stor den er, så gir vi deg en nøyaktig pris når vi tar kontakt.'
where question ilike 'Må jeg vite hvor mange gram%';

update public.faq
set question = 'Kan jeg ringe i stedet for å bestille på nettsiden?',
    answer = 'Ja! Bestillinger på nettsiden tar vi imot hele døgnet. Telefonen tar vi mellom 15 og 21, mandag til lørdag. Rekker vi ikke å svare, ringer vi tilbake så fort vi har tid, og fører bestillingen inn for deg.'
where question ilike 'Kan jeg ringe%';
