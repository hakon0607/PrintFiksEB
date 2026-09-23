# PrintFiksEB

Nettsiden til **PrintFiksEB** – elevbedrift ved Skranevatnet skole som driver med
3D-printing, reparasjon og design.

👉 **Skal du sette opp siden for første gang? Les [OPPSETT.md](OPPSETT.md).**

## Hva siden kan

| Side | Innhold |
|---|---|
| `/` | Forside med animert hero, tjenester, priser og «slik bestiller du» |
| `/kalkulator` | Priskalkulator for 3D-print og reparasjon, med handleliste |
| `/galleri` | Ferdige modeller med bilde, ID-nummer og fast pris |
| `/bestill` | Handleliste → ferdig utfylt SMS til bedriften |
| `/om-oss` | Om elevbedriften, teamet, betaling, levering og FAQ |
| `/admin` | Adminpanel der alt på nettsiden kan endres uten å kode |

## Hvordan bestilling fungerer

Kunden legger ting i handlelisten, fyller inn navn og levering, og trykker
**«Send bestilling på SMS»**. Da åpnes meldingsappen med en ferdig melding til
bedriftens telefonnummer. På PC kan kunden trykke **«Kopier meldingen»** i stedet.

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
