-- Pepperkakeform: pris etter hvor lang streken er.
-- Kjør én gang i Supabase → SQL Editor. Trygg å kjøre flere ganger.
-- Tallene endres etterpå i Admin → Priser → «Pepperkakeform».

insert into public.settings (key, value, label, help, type, gruppe, sort) values
  ('pepperkake_startpris',  '5',   'Startpris per form (kr)',   'Legges på hver pepperkakeform uansett størrelse.', 'price', 'Pepperkakeform', 90),
  ('pepperkake_pris_per_cm','0.4', 'Pris per cm strek (kr)',    'Hvor mye hver cm av streken kunden tegner koster. Lengre strek = mer plast og printetid.', 'price', 'Pepperkakeform', 91),
  ('pepperkake_minstepris', '15',  'Minstepris (kr)',           'Ingen form blir billigere enn dette. Vises som «fra»-prisen i galleriet.', 'price', 'Pepperkakeform', 92),
  ('pepperkake_avrunding',  '5',   'Rund av til nærmeste (kr)', 'F.eks. 5 gir priser som 15, 20, 25. Skriv 1 for å runde til hele kroner.', 'price', 'Pepperkakeform', 93)
on conflict (key) do nothing;

-- Teksten på produktet passer til den nye prisen
update public.products
set highlights = array['Tegn akkurat den formen du vil', 'Se den i 3D før du bestiller', 'Fra 15 kr – prisen følger hvor lang streken er'],
    description = 'Tegn omrisset med fingeren eller musa, se formen i 3D og bestill. Prisen følger hvor lang streken er.'
where code = 'pepperkake';
