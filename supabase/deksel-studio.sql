-- ============================================================
--  DEKSELSTUDIO: hvilke farger selve dekselet kan ha
--  Kjør i Supabase → SQL Editor. Trygg å kjøre flere ganger.
--  Endre senere under Admin → Deksler → Priser og farger.
-- ============================================================
insert into public.settings (key, value, label, help, type, gruppe, sort) values
  ('deksel_dekselfarger', 'Hvit', 'Deksel: farger selve dekselet kan ha',
   'Skriv navnene fra fargelisten, f.eks. «Hvit» eller «Hvit, Svart». Skriv «Alle» for å la kunden velge fritt.',
   'text', 'Deksel', 84)
on conflict (key) do nothing;
