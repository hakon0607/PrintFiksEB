-- ============================================================
--  E-POST – varsel til oss og kvittering til kunden
--  Kjøres i Supabase → SQL Editor. Trygg å kjøre flere ganger.
-- ============================================================

-- 1. Vi lagrer hva som skjedde med e-posten på selve bestillingen.
alter table public.orders add column if not exists epost_status text not null default '';

-- 2. Kolonnen som styrer hvem av de ansatte som får varsel.
alter table public.team_members add column if not exists varsel_bestilling boolean not null default false;

-- 3. Innstillingene for e-post.
insert into public.settings (key, value, label, help, type, "group", sort) values
  ('epost_avsender', 'PrintFiksEB', 'Navn på avsenderen',
   'Navnet kunden ser som avsender. Adressen styres av e-postkontoen som er satt opp på serveren.',
   'text', 'Kontakt', 46),
  ('epost_bedrift', 'trym.simmenes@bergensskolen.com', 'E-post til bedriften',
   'Hit sendes varsel om nye bestillinger. Skriv flere adresser med komma mellom.',
   'text', 'Kontakt', 48)
on conflict (key) do nothing;

-- 4. Sørg for at varseladressen er med, også om innstillingen fantes fra før.
update public.settings
   set value = case
     when coalesce(value, '') = '' then 'trym.simmenes@bergensskolen.com'
     when value ilike '%trym.simmenes@bergensskolen.com%' then value
     else value || ', trym.simmenes@bergensskolen.com'
   end
 where key = 'epost_bedrift';

-- 5. Har ingen huket av for varsel, skrur vi det på for alle med e-postadresse.
update public.team_members
   set varsel_bestilling = true
 where coalesce(email, '') <> ''
   and not exists (
     select 1 from public.team_members t
      where t.varsel_bestilling = true and coalesce(t.email, '') <> ''
   );
