# PrintFiksEB

Nettsiden til **PrintFiksEB** – elevbedrift ved Skranevatnet skole som driver med
3D-printing, reparasjon og design.

👉 **Skal du sette opp siden for første gang? Les [OPPSETT.md](OPPSETT.md).**

## Hva siden kan

| Side | Innhold |
|---|---|
| `/` | Forside med animert hero, tjenester, priser og «slik bestiller du» |
| `/kalkulator` | Rask «hva koster det»-kalkulator – materiale og størrelse, ingen bestilling |
| `/galleri` | Ferdige modeller med bilde, ID-nummer og fast pris |
| `/bestill` | Full konfigurator + handleliste → ferdig utfylt SMS, eller ring oss |
| `/om-oss` | Om elevbedriften, teamet, betaling, levering og FAQ |
| `/admin` | Adminpanel der alt på nettsiden kan endres uten å kode |

## Kalkulator og bestilling er to forskjellige ting

**`/kalkulator`** er en rask prissjekk: velg materiale og omtrent hvor stor
modellen er, så vises et estimat. Ingen handleliste, ingen skjema. Knappen
«Bestill dette» tar valget med videre til bestillingssiden.

**`/bestill`** er den detaljerte delen: her beskriver kunden hva de vil ha,
velger materiale, størrelse (eller eksakt vekt), antall og tillegg, legger til
flere ting, og fyller inn levering og kontaktinfo.

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
