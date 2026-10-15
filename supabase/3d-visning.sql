-- «Se i 3D» på produktsiden: 3D-fil (STL/3MF) per modell i galleriet.
-- Kjør én gang i Supabase → SQL Editor. Trygg å kjøre flere ganger.

alter table public.products add column if not exists modell_3d text not null default '';
alter table public.products add column if not exists vis_3d boolean not null default false;
alter table public.products add column if not exists modell_3d_farge text not null default '#2559C7';

-- Lagringsplass for 3D-filene (offentlig lesbar, bare innloggede i admin kan laste opp)
insert into storage.buckets (id, name, public, file_size_limit)
values ('produktmodeller', 'produktmodeller', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "produktmodeller_les" on storage.objects;
create policy "produktmodeller_les" on storage.objects
  for select using (bucket_id = 'produktmodeller');
drop policy if exists "produktmodeller_skriv" on storage.objects;
create policy "produktmodeller_skriv" on storage.objects
  for insert to authenticated with check (bucket_id = 'produktmodeller');
drop policy if exists "produktmodeller_oppdater" on storage.objects;
create policy "produktmodeller_oppdater" on storage.objects
  for update to authenticated using (bucket_id = 'produktmodeller');
drop policy if exists "produktmodeller_slett" on storage.objects;
create policy "produktmodeller_slett" on storage.objects
  for delete to authenticated using (bucket_id = 'produktmodeller');
