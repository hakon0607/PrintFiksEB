-- «Tegn din pepperkakeform» – et vanlig produkt i galleriet (ID «pepperkake»).
-- Kjør én gang i Supabase → SQL Editor. Trygg å kjøre flere ganger.
--
-- Prisen regnes etter hvor lang streken er (se pepperkake-pris.sql og Admin → Priser).

insert into public.products
  (code, name, tagline, description, details, highlights, price, image_url, images, material, category, featured, active, sort)
select
  'pepperkake',
  'Tegn din pepperkakeform',
  'Tegn formen selv – vi printer den',
  'Tegn omrisset med fingeren eller musa, se formen i 3D og bestill. Prisen følger hvor lang streken er.',
  E'Du tegner omrisset av kaka på en flate på 20 × 20 cm. Streken blir kanten som skjærer, og formen blir like stor som du tegner den.\n\nFormen printes i hvit, er 15 mm høy og har en bred, tykk kant på toppen – så du kan trykke hardt uten at det gjør vondt. Veggen er forsterket nederst så den ikke knekker, og litt tynnere ytterst så den skjærer rent.',
  array['Tegn akkurat den formen du vil', 'Se den i 3D før du bestiller', 'Fra 15 kr – prisen følger hvor lang streken er'],
  15,
  '/pepperkake/kort.jpg',
  '{}',
  'PLA',
  'Jul',
  false,
  true,
  6
where not exists (select 1 from public.products where code = 'pepperkake');

-- Tegningen lagres på varelinja i bestillingen (finnes allerede hvis deksel.sql er kjørt)
alter table public.order_items add column if not exists design jsonb;
