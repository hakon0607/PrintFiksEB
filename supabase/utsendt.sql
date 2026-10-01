-- ============================================================
--  HISTORIKK: hva har vi sendt til kunden?
--  Kjør denne én gang i Supabase → SQL Editor → Run.
--  Den er trygg å kjøre flere ganger.
-- ============================================================

create table if not exists public.order_messages (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  slag        text not null,                   -- bekreftelse | ferdig | henting | varsel
  kanal       text not null default 'epost',   -- epost | sms
  til         text default '',
  ok          boolean not null default true,
  detalj      text default '',
  created_at  timestamptz not null default now()
);

create index if not exists order_messages_order_idx
  on public.order_messages (order_id, created_at desc);

alter table public.order_messages enable row level security;

-- Bare innloggede ansatte ser historikken. Kunder skal ikke lese denne.
drop policy if exists "utsendt_ansatte" on public.order_messages;
create policy "utsendt_ansatte" on public.order_messages
  for all to authenticated using (true) with check (true);

-- Sanntid, så en som sender ser det hos den andre med en gang
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.order_messages';
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;


-- ------------------------------------------------------------
--  Innstillinger for «klar til henting»
-- ------------------------------------------------------------
insert into public.settings (key, value, label, help, type, gruppe, sort) values
  ('henting_adresse',
   'Vestre Sandslimarka 44',
   'Hentested',
   'Adressen kunden henter bestillingen på. Brukes i SMS-en «klar til henting».',
   'text', 'Levering', 70),
  ('sms_henting',
   'Hei {kunde}! Bestillingen din fra {bedrift} er klar til henting i {adresse}. Prisen er {pris}. Gi gjerne beskjed før du kommer, så står den klar.',
   'SMS: klar til henting',
   'Teksten knappen «Klar til henting» i Bestillinger lager. Disse byttes ut automatisk: {kunde} {bedrift} {adresse} {pris} {ordrenr} {telefon}',
   'longtext', 'Levering', 72)
on conflict (key) do nothing;


-- ------------------------------------------------------------
--  Fyll inn det vi vet om bestillingene vi allerede har.
--  Den gamle epost_status-teksten husket bare den siste sendingen,
--  så tidspunktet settes til bestillingsdatoen. Det står i detaljen.
-- ------------------------------------------------------------
insert into public.order_messages (order_id, slag, kanal, til, ok, detalj, created_at)
select o.id, 'ferdig', 'epost', coalesce(o.epost, ''), true,
       'Hentet fra den gamle e-poststatusen – tidspunktet er bestillingsdatoen',
       o.created_at
from public.orders o
where coalesce(o.epost_status, '') ilike '%ferdig kvittering sendt til kunden%'
  and not exists (
    select 1 from public.order_messages m
    where m.order_id = o.id and m.slag = 'ferdig'
  );

insert into public.order_messages (order_id, slag, kanal, til, ok, detalj, created_at)
select o.id, 'bekreftelse', 'epost', coalesce(o.epost, ''), true,
       'Hentet fra den gamle e-poststatusen – tidspunktet er bestillingsdatoen',
       o.created_at
from public.orders o
where (
    coalesce(o.epost_status, '') ilike '%bekreftelse sendt til kunden%'
    or (
      coalesce(o.epost_status, '') ilike '%kvittering sendt til kunden%'
      and coalesce(o.epost_status, '') not ilike '%ferdig kvittering sendt%'
    )
  )
  and not exists (
    select 1 from public.order_messages m
    where m.order_id = o.id and m.slag = 'bekreftelse'
  );

insert into public.order_messages (order_id, slag, kanal, til, ok, detalj, created_at)
select o.id, 'varsel', 'epost', '', true,
       'Hentet fra den gamle e-poststatusen – tidspunktet er bestillingsdatoen',
       o.created_at
from public.orders o
where coalesce(o.epost_status, '') ilike '%varsel sendt til%'
  and not exists (
    select 1 from public.order_messages m
    where m.order_id = o.id and m.slag = 'varsel'
  );
