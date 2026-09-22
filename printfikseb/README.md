# PrintFiksEB

Nettsiden til **PrintFiksEB** – elevbedrift ved Skranevatnet skole som driver med
3D-printing, reparasjon og design.

👉 **Skal du sette opp siden for første gang? Les [OPPSETT.md](OPPSETT.md).**

## Hva siden kan

| Side | Innhold |
|---|---|
| `/` | Forside med animert hero, tjenester, priser og «slik bestiller du» |
| `/galleri` | Ferdige modeller med bilde, ID-nummer og fast pris |
| `/galleri/[id]` | Egen side per modell: flere bilder, full beskrivelse og spesifikasjoner |
| `/3d-printing` | Hva 3D-printing faktisk kan fikse, med video av en print underveis |
| `/bestill` | Hele bestillingen: valg til venstre, live priskalkulator og bestillingen til høyre |
| `/om-oss` | Om elevbedriften, teamet, betaling, levering og FAQ |
| `/admin` | Adminpanel der alt på nettsiden kan endres uten å kode |
| `/admin/oppgaver` | Intern oppgaveliste for planlegging (vises aldri på nettsiden) |
| `/admin/eksempler` | Eksemplene som vises på «Hva vi kan fikse» |
| `/admin/profil` | Egen profil: navn, bilde, rolle og passord |

| `/admin/printbot` | Chat med PrintBot i full størrelse |

PrintBot ligger dessuten som en boble nede til høyre på alle admin-sidene.

## Bestillingssiden

Alt skjer på `/bestill`. Siden er delt i to: til venstre tre steg man klikker
opp og ned (1 Hva skal vi lage, 2 Levering, 3 Om deg), til høyre priskalkulatoren
som viser hva det man holder på å velge koster – og under den selve bestillingen
med totalsum og send-knappene.

Steg 1 er sammenslått når man kommer inn, så siden er lett å få oversikt over.
Den åpner seg automatisk hvis man kom fra hurtigstarten på forsiden, og lukker
seg igjen når man har lagt noe til.

`/kalkulator` finnes ikke lenger som egen side – gamle lenker sendes til `/bestill`.

**Startprisen legges bare på når vi skal lage noe.** Ferdige modeller fra
galleriet har fast pris, uten startpris.

## To måter å bestille på

- **Melding – hele døgnet.** Nettsiden setter sammen en ferdig melding, og
  «Send bestilling på SMS» åpner meldingsappen med alt utfylt. På PC brukes
  «Kopier meldingen» i stedet.
- **Telefon – 15–21, mandag til lørdag.** Ring-knapp i menyen, på forsiden, i
  kalkulatoren, på bestillingssiden og i bunnteksten. Rekker de ikke å svare,
  ringer de tilbake.

Tidene og teksten rundt dem endres i `/admin` under **Kontakt og levering**.

Prisen som vises er alltid et **estimat**. Bedriften svarer med endelig pris,
og kunden må godkjenne før produksjonen starter.

## Priser (kan endres i `/admin`)

- PLA: 0,80 kr per gram
- PETG: 1,00 kr per gram
- Startpris: 100 kr, én gang per bestilling
- Vi designer 3D-filen: +100 kr
- Hjemmebesøk for oppmåling: +50 kr
- Henting: gratis · Hjemlevering innen 3 km: 50 kr
- Leveringstid: 2–4 virkedager
- Reparasjon: pris etter avtale

## Publisering

Nettsiden viser den **publiserte** versjonen av innholdet. Endringer i `/admin`
lagres med en gang i databasen, men blir først synlige for besøkende når noen
trykker **«Publiser endringene»** i publiseringsstripen øverst i adminpanelet.

Teknisk: innholdet hentes gjennom `unstable_cache` med taggen `printfikseb-innhold`.
`POST /api/publiser` kaller `revalidateTag()` og setter `site_status.sist_publisert`.
Databasetriggere oppdaterer `site_status.sist_endret` ved enhver endring, så
adminpanelet kan si fra om det finnes upubliserte endringer.

`?forhandsvis=1` på hvilken som helst side hopper over hurtigbufferen og viser
innholdet slik det er akkurat nå, med en gul stripe øverst.

## Sanntid

Adminpanelet bruker Supabase Realtime. Endringer i `settings`, `products`,
`tasks` og de andre tabellene sendes til alle som er inne, så flere kan jobbe
samtidig uten å laste på nytt. Et broadcast-kanal per tabell viser «X redigerer»
på raden noen står i, og et presence-kanal viser hvem i gruppa som er pålogget.
Offentlige sider melder seg på et eget presence-kanal, så adminpanelet kan vise
antall besøkende akkurat nå.

Tabellene må ligge i publikasjonen `supabase_realtime` – det gjør `schema.sql`.

## PrintBot

`POST /api/printbot` sender samtalen til AI-en sammen med et øyeblikksbilde av
innstillinger, materialer, modeller, ansatte og åpne oppgaver. Svaret er JSON med
`svar`, en eventuell `naviger`-sti og en liste `forslag`.

Serveren finner selv «før»-verdien for hvert forslag og kaster forslag som peker
på noe som ikke finnes. **Serveren skriver aldri til databasen** – godkjenner
brukeren et forslag, utføres skrivingen i nettleseren med brukerens egen
innlogging, så RLS gjelder som vanlig.

Forslagstyper: `innstilling`, `materiale`, `oppgave`, `faq` og `produkt`
(`price`, `active`, `featured`).

## AI-nøkkel og finpussing

Eieren limer inn en OpenAI-nøkkel under **AI og import** i adminpanelet. Nøkkelen
lagres i tabellen `secrets`, som med vilje ikke har noen RLS-policy – da kommer
ingen til den fra nettleseren. Bare serveren (service role) leser verdien, så
alle ansatte kan bruke funksjonene uten å se eller ha nøkkelen selv.

Automatisk henting fra MakerWorld er fjernet – de blokkerer servere med
Cloudflare. I stedet skriver man selv og trykker **Finpuss med AI**.

`POST /api/finpuss` tar feltene slik de står, lar AI rydde dem og fylle ut det
som mangler, og returnerer forslaget uten å lagre noe. Adminpanelet tar vare på
de gamle verdiene, så «Angre finpuss» setter alt tilbake.

Prisen snappes til en pen butikkpris (49, 69, 99, 149 …) ut fra materialkostnad,
vekt og AI-ens vurdering.

`products.source_url` velges bort i spørringen som bygger nettsiden, og feltet
vises bare for brukere med rollen `eier` i adminpanelet.

## Video

Videoen på `/3d-printing` ligger i `public/video/` som MP4 og WebM, med et
poster-bilde. Den starter av seg selv når man scroller ned til den, og stopper
når man scroller forbi. Vil dere bytte den ut uten å røre koden, legg inn en
lenke under **Tekster → Video** i adminpanelet.

## Teknisk

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** for design, **Framer Motion** for animasjoner
- **Supabase** for database, innlogging og bildelagring
- Ment for hosting på **Vercel**

```
src/
  app/
    (site)/          offentlige sider
    admin/           adminpanel
    api/ansatte/     server-endepunkt for å opprette/fjerne innlogginger
  components/        delte komponenter
  lib/               priser, handleliste, meldingstekst, datahenting
supabase/schema.sql  hele databaseoppsettet
```

Nettsiden fungerer også **uten** Supabase – da brukes standardverdiene i
`src/lib/defaults.ts`, slik at dere kan se hvordan alt ser ut før databasen er satt opp.

### Kommandoer

```bash
npm install     # installer
npm run dev     # kjør lokalt på http://localhost:3000
npm run build   # bygg for produksjon
```
