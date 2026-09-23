-- ============================================================
--  E-POST – varsel til oss og kvittering til kunden
--  Kjøres i Supabase → SQL Editor. Trygg å kjøre flere ganger.
-- ============================================================

-- 1. Vi lagrer hva som skjedde med e-posten på selve bestillingen,
--    slik at dere ser i admin om den gikk ut eller ikke.
alter table public.orders add column if not exists epost_status text not null default '';

-- 2. Kolonnen som styrer hvem av de ansatte som får varsel.
alter table public.team_members add column if not exists varsel_bestilling boolean not null default false;

-- 3. Innstillingene for e-post.
insert into public.settings (key, value, label, help, type, "group", sort) values
  ('epost_avsender', 'PrintFiksEB <onboarding@resend.dev>', 'Avsender på e-post',
   'Slik ser avsenderen ut. Uten eget domene hos Resend må dette stå som onboarding@resend.dev.',
   'text', 'Kontakt', 46),
  ('epost_bedrift', '', 'E-post til bedriften',
   'Hit sendes varsel om nye bestillinger. Skriv flere adresser med komma mellom.',
   'text', 'Kontakt', 48)
on conflict (key) do nothing;

-- 4. Har dere allerede ansatte inne, men ingen har huket av for varsel,
--    skrur vi det på for alle med e-postadresse. Da er dere sikre på å få mail.
update public.team_members
   set varsel_bestilling = true
 where coalesce(email, '') <> ''
   and not exists (
     select 1 from public.team_members t
      where t.varsel_bestilling = true and coalesce(t.email, '') <> ''
   );
