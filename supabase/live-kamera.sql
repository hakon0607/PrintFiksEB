-- ============================================================
-- LIVE KAMERA – Bambu Lab P1S-kameraet på nettsiden
-- Kjør hele filen én gang i Supabase → SQL Editor → Run.
-- Trygg å kjøre flere ganger (endrer ikke innstillinger du har lagret).
--
-- Slik henger det sammen:
--   * Adminpanelet lagrer innstillingene i kamera_innstillinger.
--   * Raspberry Pi-en logger inn med en koblingsnøkkel (lages i admin) og
--     bruker funksjonene kamera_enhet_* til å hente innstillinger og melde status.
--   * Nettsiden henter bare det som er trygt å vise via kamera_offentlig().
-- ============================================================

-- ---------- tabeller ----------
create table if not exists public.kamera_innstillinger (
  id            int primary key default 1 check (id = 1),
  data          jsonb not null default '{}'::jsonb,
  oppdatert     timestamptz not null default now(),
  oppdatert_av  text
);
insert into public.kamera_innstillinger (id, data)
values (1, '{"modus":"kommer_snart"}'::jsonb)
on conflict (id) do nothing;

create table if not exists public.kamera_status (
  id               int primary key default 1 check (id = 1),
  sist_sett        timestamptz,
  kamera_aktivt    boolean not null default false,
  siste_bilde      text,
  siste_bilde_tid  timestamptz,
  printer          jsonb not null default '{}'::jsonb,
  pi               jsonb not null default '{}'::jsonb,
  feil             text,
  timelapse_pagar  boolean not null default false
);
insert into public.kamera_status (id) values (1) on conflict (id) do nothing;

create table if not exists public.kamera_kommandoer (
  id            bigint generated always as identity primary key,
  kommando      text not null check (kommando in
                  ('ta_bilde', 'lys_pa', 'lys_av', 'start_timelapse', 'stopp_timelapse', 'omstart', 'oppdater_status')),
  status        text not null default 'venter' check (status in ('venter', 'sendt', 'ferdig', 'feilet')),
  melding       text,
  opprettet     timestamptz not null default now(),
  utfort        timestamptz,
  opprettet_av  text
);
create index if not exists kamera_kommandoer_status_idx on public.kamera_kommandoer (status, opprettet);

create table if not exists public.kamera_timelapser (
  id         bigint generated always as identity primary key,
  sti        text not null unique,
  navn       text not null default '',
  sekunder   int not null default 0,
  bilder     int not null default 0,
  storrelse  bigint not null default 0,
  vis        boolean not null default false,
  opprettet  timestamptz not null default now()
);

-- Koblingsnøkkelen til Pi-en. Bare et fingeravtrykk (sha256) lagres – aldri selve nøkkelen.
create table if not exists public.kamera_enhet (
  id           int primary key default 1 check (id = 1),
  nokkel_hash  text,
  opprettet    timestamptz,
  sist_brukt   timestamptz
);

-- Teller hvor mange som ser på (bare hvis det er slått på i admin)
create table if not exists public.kamera_seere (
  id         text primary key,
  sist_sett  timestamptz not null default now()
);

-- ---------- tilgang (RLS) ----------
alter table public.kamera_innstillinger enable row level security;
alter table public.kamera_status        enable row level security;
alter table public.kamera_kommandoer    enable row level security;
alter table public.kamera_timelapser    enable row level security;
alter table public.kamera_enhet         enable row level security;   -- ingen regler = bare serveren
alter table public.kamera_seere         enable row level security;   -- ingen regler = bare funksjonene

drop policy if exists "kamera_innst_ansatte" on public.kamera_innstillinger;
create policy "kamera_innst_ansatte" on public.kamera_innstillinger
  for all to authenticated using (true) with check (true);

drop policy if exists "kamera_status_les" on public.kamera_status;
create policy "kamera_status_les" on public.kamera_status
  for select to authenticated using (true);

drop policy if exists "kamera_komm_les" on public.kamera_kommandoer;
create policy "kamera_komm_les" on public.kamera_kommandoer
  for select to authenticated using (true);
drop policy if exists "kamera_komm_ny" on public.kamera_kommandoer;
create policy "kamera_komm_ny" on public.kamera_kommandoer
  for insert to authenticated with check (status = 'venter');

drop policy if exists "kamera_tl_les" on public.kamera_timelapser;
create policy "kamera_tl_les" on public.kamera_timelapser
  for select to authenticated using (true);
drop policy if exists "kamera_tl_endre" on public.kamera_timelapser;
create policy "kamera_tl_endre" on public.kamera_timelapser
  for update to authenticated using (true) with check (true);

-- ---------- små hjelpere for trygg lesing av innstillingene ----------
create or replace function public.kamera_tall(d jsonb, k text, standard numeric)
returns numeric language sql immutable as $$
  select case when jsonb_typeof(d -> k) = 'number' then (d ->> k)::numeric else standard end
$$;

create or replace function public.kamera_bool(d jsonb, k text, standard boolean)
returns boolean language sql immutable as $$
  select case when jsonb_typeof(d -> k) = 'boolean' then (d ->> k)::boolean else standard end
$$;

-- Sjekker koblingsnøkkelen. Brukes bare inne i de andre funksjonene.
create or replace function public.kamera_sjekk_nokkel(p_nokkel text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  h text;
begin
  if p_nokkel is null or length(p_nokkel) < 20 or length(p_nokkel) > 200 then
    raise exception 'Ugyldig koblingsnøkkel' using errcode = '28000';
  end if;
  select nokkel_hash into h from public.kamera_enhet where id = 1;
  if h is null or h <> encode(sha256(convert_to(p_nokkel, 'UTF8')), 'hex') then
    raise exception 'Ugyldig koblingsnøkkel' using errcode = '28000';
  end if;
  update public.kamera_enhet set sist_brukt = now() where id = 1;
end;
$$;

-- ---------- for nettsiden: bare det som er trygt å vise ----------
create or replace function public.kamera_offentlig(p_seer text default null)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  d        jsonb;
  s        public.kamera_status;
  modus    text;
  aapen    boolean;
  oppd     numeric;
  live     boolean := false;
  aktiv    boolean := false;
  seere    int;
  printer  jsonb;
  tl       jsonb := '[]'::jsonb;
  bilde    text;
  vindu    int;
begin
  select data into d from public.kamera_innstillinger where id = 1;
  d := coalesce(d, '{}'::jsonb);
  modus := coalesce(d ->> 'modus', 'kommer_snart');
  if modus not in ('skjult', 'kommer_snart', 'demo', 'pa') then
    modus := 'kommer_snart';
  end if;
  aapen := modus in ('demo', 'pa');
  oppd := least(30, greatest(1, public.kamera_tall(d, 'oppdatering_sek', 3)));

  select * into s from public.kamera_status where id = 1;

  if aapen and s.id is not null then
    aktiv := s.sist_sett is not null and s.sist_sett > now() - interval '45 seconds';
    live := aktiv and s.kamera_aktivt and s.siste_bilde is not null
            and s.siste_bilde_tid > now() - make_interval(secs => greatest(30, oppd * 4));

    if s.siste_bilde is not null and (live or public.kamera_bool(d, 'vis_siste_bilde_nar_av', true)) then
      bilde := s.siste_bilde;
    end if;

    if aktiv then
      printer := jsonb_build_object(
        'tilstand',   s.printer ->> 'tilstand',
        'fremdrift',  case when public.kamera_bool(d, 'vis_fremdrift', true)    then s.printer -> 'fremdrift'  end,
        'min_igjen',  case when public.kamera_bool(d, 'vis_tid_igjen', true)    then s.printer -> 'min_igjen'  end,
        'lag',        case when public.kamera_bool(d, 'vis_lag', true)          then s.printer -> 'lag'        end,
        'lag_totalt', case when public.kamera_bool(d, 'vis_lag', true)          then s.printer -> 'lag_totalt' end,
        'dyse_temp',  case when public.kamera_bool(d, 'vis_temperaturer', false) then s.printer -> 'dyse_temp' end,
        'plate_temp', case when public.kamera_bool(d, 'vis_temperaturer', false) then s.printer -> 'plate_temp' end
      );
    end if;

    if public.kamera_bool(d, 'vis_seere', false) then
      vindu := greatest(40, (oppd * 3)::int);
      if p_seer is not null and length(p_seer) between 8 and 64 then
        insert into public.kamera_seere (id, sist_sett) values (p_seer, now())
        on conflict (id) do update set sist_sett = now();
        if random() < 0.05 then
          delete from public.kamera_seere where sist_sett < now() - interval '5 minutes';
        end if;
      end if;
      select count(*) into seere from public.kamera_seere where sist_sett > now() - make_interval(secs => vindu);
    end if;

    if public.kamera_bool(d, 'vis_timelapser', true) then
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', t.id, 'sti', t.sti, 'navn', t.navn, 'sekunder', t.sekunder, 'opprettet', t.opprettet)
               order by t.opprettet desc), '[]'::jsonb)
        into tl
        from (select * from public.kamera_timelapser where vis order by opprettet desc limit 12) t;
    end if;
  end if;

  return jsonb_build_object(
    'modus', modus,
    'live', live,
    'naa', now(),
    'innst', jsonb_strip_nulls(jsonb_build_object(
      'fanenavn', d -> 'fanenavn',
      'vis_i_meny', d -> 'vis_i_meny',
      'tittel', d -> 'tittel',
      'ingress', d -> 'ingress',
      'kommer_snart_tekst', d -> 'kommer_snart_tekst',
      'demo_tekst', d -> 'demo_tekst',
      'frakoblet_tekst', d -> 'frakoblet_tekst',
      'oppdatering_sek', d -> 'oppdatering_sek',
      'vis_klokke', d -> 'vis_klokke',
      'vis_siste_bilde_nar_av', d -> 'vis_siste_bilde_nar_av',
      'vis_forklaring', d -> 'vis_forklaring',
      'vis_bestill_knapp', d -> 'vis_bestill_knapp',
      'vis_fremdrift', d -> 'vis_fremdrift',
      'vis_tid_igjen', d -> 'vis_tid_igjen',
      'vis_lag', d -> 'vis_lag',
      'vis_temperaturer', d -> 'vis_temperaturer',
      'vis_seere', d -> 'vis_seere',
      'vis_timelapser', d -> 'vis_timelapser'
    )),
    'bilde_sti', bilde,
    'bilde_tid', case when bilde is not null then s.siste_bilde_tid end,
    'print_navn', case when aapen then nullif(trim(coalesce(d ->> 'print_navn', '')), '') end,
    'print_beskrivelse', case when aapen then nullif(trim(coalesce(d ->> 'print_beskrivelse', '')), '') end,
    'printer', printer,
    'seere', seere,
    'timelapser', tl
  );
end;
$$;

-- ---------- for Raspberry Pi-en ----------
-- Melder status (og eventuelt nytt bilde), og får innstillinger + nye kommandoer tilbake.
create or replace function public.kamera_enhet_synk(
  p_nokkel text,
  p_status jsonb default null,
  p_siste_bilde text default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  d     jsonb;
  komm  jsonb;
  st    jsonb := coalesce(p_status, '{}'::jsonb);
begin
  perform public.kamera_sjekk_nokkel(p_nokkel);

  if p_siste_bilde is not null and (p_siste_bilde !~ '^live/[A-Za-z0-9._-]+\.jpg$' or length(p_siste_bilde) > 160) then
    p_siste_bilde := null;
  end if;

  update public.kamera_status set
    sist_sett       = now(),
    kamera_aktivt   = case when jsonb_typeof(st -> 'kamera_aktivt') = 'boolean'
                           then (st ->> 'kamera_aktivt')::boolean else kamera_aktivt end,
    printer         = case when jsonb_typeof(st -> 'printer') = 'object' then st -> 'printer' else printer end,
    pi              = case when jsonb_typeof(st -> 'pi') = 'object' then st -> 'pi' else pi end,
    feil            = case when st ? 'feil' then left(nullif(st ->> 'feil', ''), 500) else feil end,
    timelapse_pagar = case when jsonb_typeof(st -> 'timelapse_pagar') = 'boolean'
                           then (st ->> 'timelapse_pagar')::boolean else timelapse_pagar end,
    siste_bilde     = coalesce(p_siste_bilde, siste_bilde),
    siste_bilde_tid = case when p_siste_bilde is not null then now() else siste_bilde_tid end
  where id = 1;

  -- printen er ferdig: tøm navnet på printen hvis det er valgt i admin
  if public.kamera_bool(st, 'print_ferdig', false) then
    update public.kamera_innstillinger
       set data = data || '{"print_navn":"","print_beskrivelse":""}'::jsonb, oppdatert = now()
     where id = 1 and public.kamera_bool(data, 'tom_navn_etter_print', true);
  end if;

  -- gamle kommandoer som aldri ble hentet
  update public.kamera_kommandoer
     set status = 'feilet', melding = 'Pi-en hentet ikke kommandoen i tide', utfort = now()
   where status = 'venter' and opprettet < now() - interval '10 minutes';

  with c as (
    update public.kamera_kommandoer set status = 'sendt'
     where status = 'venter'
    returning id, kommando
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'kommando', c.kommando) order by c.id), '[]'::jsonb)
    into komm from c;

  select data into d from public.kamera_innstillinger where id = 1;

  return jsonb_build_object('ok', true, 'tid', now(), 'innstillinger', coalesce(d, '{}'::jsonb), 'kommandoer', komm);
end;
$$;

-- Pi-en sier fra at en kommando er utført (eller feilet)
create or replace function public.kamera_enhet_kvitter(
  p_nokkel text, p_id bigint, p_ok boolean, p_melding text default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.kamera_sjekk_nokkel(p_nokkel);
  update public.kamera_kommandoer
     set status = case when p_ok then 'ferdig' else 'feilet' end,
         melding = left(p_melding, 300),
         utfort = now()
   where id = p_id;
end;
$$;

-- Pi-en melder inn en ferdig timelapse (fila er allerede lastet opp)
create or replace function public.kamera_enhet_timelapse(
  p_nokkel text, p_sti text, p_navn text, p_sekunder int, p_bilder int, p_storrelse bigint
)
returns bigint
language plpgsql security definer
set search_path = public
as $$
declare
  ny_id bigint;
begin
  perform public.kamera_sjekk_nokkel(p_nokkel);
  if p_sti !~ '^timelapse/[A-Za-z0-9._-]+\.mp4$' then
    raise exception 'Ugyldig filnavn';
  end if;
  insert into public.kamera_timelapser (sti, navn, sekunder, bilder, storrelse)
  values (p_sti, left(coalesce(p_navn, ''), 120), greatest(0, coalesce(p_sekunder, 0)),
          greatest(0, coalesce(p_bilder, 0)), greatest(0, coalesce(p_storrelse, 0)))
  on conflict (sti) do update set navn = excluded.navn
  returning id into ny_id;
  return ny_id;
end;
$$;

-- ---------- hvem kan kalle funksjonene ----------
revoke all on function public.kamera_sjekk_nokkel(text) from public, anon, authenticated;
revoke all on function public.kamera_offentlig(text) from public;
revoke all on function public.kamera_enhet_synk(text, jsonb, text) from public;
revoke all on function public.kamera_enhet_kvitter(text, bigint, boolean, text) from public;
revoke all on function public.kamera_enhet_timelapse(text, text, text, int, int, bigint) from public;

grant execute on function public.kamera_offentlig(text) to anon, authenticated;
grant execute on function public.kamera_enhet_synk(text, jsonb, text) to anon, authenticated;
grant execute on function public.kamera_enhet_kvitter(text, bigint, boolean, text) to anon, authenticated;
grant execute on function public.kamera_enhet_timelapse(text, text, text, int, int, bigint) to anon, authenticated;

-- ---------- lagring av bilder og timelapser ----------
-- Offentlig lesbar (bildene vises på nettsiden). Opplasting skjer bare med
-- engangslenker som serveren lager når Pi-en viser koblingsnøkkelen.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kamera', 'kamera', true, 52428800, array['image/jpeg', 'video/mp4'])
on conflict (id) do update
  set public = true, file_size_limit = 52428800, allowed_mime_types = array['image/jpeg', 'video/mp4'];
