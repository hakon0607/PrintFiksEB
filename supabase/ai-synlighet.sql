-- Facebook-lenke i admin (Innstillinger → Kontakt). Vises i bunnen av nettsiden
-- og forteller Google, ChatGPT og Gemini at Facebook-siden er deres.
-- Kjør én gang i Supabase → SQL Editor. Trygg å kjøre flere ganger.

insert into public.settings (key, value, label, help, type, gruppe, sort) values
  ('sosial_facebook', '', 'Facebook (lenke)', 'Hele lenken til Facebook-siden, f.eks. https://www.facebook.com/printfikseb', 'text', 'Kontakt', 49)
on conflict (key) do nothing;
