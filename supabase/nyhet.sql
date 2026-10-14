-- ============================================================
--  NYHET: ett produkt eller tema høyt oppe på forsiden
--  Kjør i Supabase → SQL Editor. Trygg å kjøre flere ganger.
--  Velges under Admin → Galleri → Nyhet.
-- ============================================================
insert into public.settings (key, value, label, help, type, gruppe, sort) values
  ('nyhet_type',    'av', 'Nyhet: hva som vises',        'av, produkt eller tema', 'text', 'Nyhet', 90),
  ('nyhet_verdi',   '',   'Nyhet: produkt-ID eller tema', 'Produktets ID, eller halloween / jul', 'text', 'Nyhet', 91),
  ('nyhet_tittel',  '',   'Nyhet: overskrift',            'Tom = produktnavnet / temanavnet', 'text', 'Nyhet', 92),
  ('nyhet_tekst',   '',   'Nyhet: kort tekst',            'Tom = undertittelen / temaets tekst', 'text', 'Nyhet', 93),
  ('nyhet_etikett', 'Nyhet', 'Nyhet: merkelapp',          'F.eks. «Nyhet» eller «Kun nå»', 'text', 'Nyhet', 94)
on conflict (key) do nothing;
