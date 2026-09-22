# Sett opp PrintFiksEB-nettsiden

Denne guiden tar deg gjennom alt, steg for steg. Du trenger ikke kunne kode.
Regn med **ca. 30 minutter** første gang. Alt vi bruker er gratis.

Du skal gjøre tre ting:

1. Lage en database (Supabase) – der lagres priser, galleri og ansatte
2. Legge koden på GitHub
3. Publisere nettsiden med Vercel

---

## Steg 1 – Lag databasen (Supabase)

1. Gå til **supabase.com** og lag en gratis konto.
2. Trykk **New project**.
   - Name: `printfikseb`
   - Database Password: lag et passord og **lagre det et trygt sted**
   - Region: velg `Central EU (Frankfurt)` eller `North EU (Ireland)`
3. Vent 1–2 minutter mens prosjektet lages.
4. Klikk **SQL Editor** i menyen til venstre, så **New query**.
5. Åpne filen `supabase/schema.sql` fra dette prosjektet, marker **alt**, kopier det,
   og lim det inn i SQL-editoren.
6. Trykk **Run** (eller Ctrl+Enter). Det skal stå `Success`.

   Dette lager alle tabellene, alle startprisene deres og sikkerhetsreglene.

7. Klikk **Project Settings** (tannhjulet) → **API**. Her finner du tre ting du trenger senere:
   - **Project URL** (ser ut som `https://abcdefgh.supabase.co`)
   - **anon public** – en lang tekst som starter med `eyJ...`
   - **service_role** – en annen lang tekst som starter med `eyJ...`

> ⚠️ **service_role** er som hovednøkkelen til databasen. Den skal **aldri**
> legges ut offentlig eller sendes i en melding. Den brukes kun i steg 3.

---

## Steg 2 – Legg koden på GitHub

1. Gå til **github.com** og logg inn.
2. Trykk **New repository**.
   - Repository name: `printfikseb`
   - Velg **Private** (da er koden bare deres)
   - Ikke huk av for noe annet
   - Trykk **Create repository**
3. Last opp koden. Enkleste måte uten å kunne kommandolinje:
   - Trykk **uploading an existing file** på siden som kom opp
   - Dra inn **alle filene og mappene** fra dette prosjektet
     (ikke mappene `node_modules` eller `.next` – de skal ikke være med)
   - Trykk **Commit changes**

   Kan dere kommandolinje, går dette raskere:

   ```bash
   git init
   git add .
   git commit -m "Første versjon av PrintFiksEB"
   git branch -M main
   git remote add origin https://github.com/DITTBRUKERNAVN/printfikseb.git
   git push -u origin main
   ```

---

## Steg 3 – Publiser med Vercel

1. Gå til **vercel.com** og logg inn **med GitHub-kontoen deres**.
2. Trykk **Add New → Project**, og velg `printfikseb`.
3. Før dere trykker Deploy: åpne **Environment Variables** og legg inn disse fire:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL fra steg 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public fra steg 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role fra steg 1 |
   | `NEXT_PUBLIC_SITE_URL` | adressen siden får, f.eks. `https://printfikseb.vercel.app` |

   > Vet dere ikke adressen ennå? Sett inn noe midlertidig, deploy, og rett den
   > etterpå under **Settings → Environment Variables**. Husk å trykke
   > **Redeploy** etter at dere endrer den.

4. Trykk **Deploy** og vent et par minutter.
5. Nettsiden er live! 🎉

---

## Steg 4 – Lag din egen innlogging

1. Gå til **nettsiden din** `/admin` (f.eks. `https://printfikseb.vercel.app/admin`).
2. Du har ingen bruker ennå, så gå til Supabase → **Authentication** → **Users**
   → **Add user** → **Create new user**.
   - E-post: din egen
   - Passord: velg selv
   - Huk av for **Auto Confirm User**
3. Gå tilbake til `/admin` og logg inn.

   **Den første brukeren blir automatisk «eier»** og kan legge til de andre i gruppa
   direkte fra `/admin/ansatte`. Da slipper de å gå innom Supabase.

---

## Slik bruker dere adminpanelet

Alt på nettsiden styres fra `/admin`. **Alt lagres automatisk** – dere ser
«Lagret ✓» når det er gjort.

| Side | Hva dere gjør der |
|---|---|
| **Oversikt** | Se hvor mye dere har lagt inn |
| **Priser** | Pris per gram, startpris, tillegg, levering og størrelsene i kalkulatoren |
| **Galleri** | Legg inn ferdige modeller med bilde og pris. ID-nummer lages automatisk |
| **Tekster** | Overskriften på forsiden, «om oss»-teksten og alt annet folk leser |
| **Spørsmål og svar** | Svar på det kundene spør om ofte |
| **Ansatte** | Hvem som vises på «Om oss», og hvem som får logge inn |
| **Kontakt og levering** | Telefonnummer, Vipps, når folk kan ringe og sende melding, leveringstid og leveringsområde |

### Publisering – viktig!

Alt dere skriver i adminpanelet **lagres automatisk**, men det blir ikke synlig
for kundene før dere trykker **«Publiser endringene»**.

Øverst i adminpanelet står det alltid hvordan det ligger an:

- **«Nettsiden er oppdatert»** – alt dere har gjort ligger ute.
- **«Du har endringer som ikke er publisert»** – trykk **Publiser endringene**,
  så er det ute med en gang.

Knappen **Forhåndsvis** åpner nettsiden med de nyeste endringene i en ny fane,
uten at kundene ser dem. Da kan dere sjekke at alt ser riktig ut før dere
publiserer. Forhåndsvisningen har en gul stripe øverst så dere ikke blander dem.

Noen triks:

- **Bryteren til høyre** for hver ting skjuler den fra nettsiden uten å slette den.
- **Pilene opp/ned** bestemmer rekkefølgen på nettsiden.
- Endrer dere telefonnummeret under «Kontakt og levering», endres SMS-knappen
  og alle ring-knappene på hele nettsiden automatisk.
- Ringetidene («Ring mellom 15 og 21, mandag til lørdag») ligger samme sted, og
  vises på forsiden, i kalkulatoren, på bestillingssiden og i bunnteksten.

---

## Eget domene (valgfritt)

Vil dere ha `printfikseb.no` i stedet for `...vercel.app`:

1. Kjøp domenet hos f.eks. **domeneshop.no** eller **one.com** (ca. 100–200 kr i året).
2. I Vercel: **Settings → Domains → Add** og skriv inn domenet.
3. Vercel viser hva dere skal legge inn hos domeneleverandøren. Kopier det inn der.
4. Husk å oppdatere `NEXT_PUBLIC_SITE_URL` i Vercel til den nye adressen, og
   trykk **Redeploy**.

---

## Hvis noe ikke virker

**«Databasen er ikke koblet til ennå» på /admin**
De tre nøklene i Vercel mangler eller er feil. Sjekk **Settings → Environment
Variables**, og trykk **Redeploy** etterpå.

**Bilder lastes ikke opp i galleriet**
Kjør `supabase/schema.sql` på nytt i Supabase. Den lager bildemappen («bilder»)
og gir de riktige tillatelsene.

**«Bare den som eier siden kan legge til ansatte»**
Du er logget inn som vanlig ansatt. Be eieren gjøre det, eller endre `role` til
`eier` for din bruker i Supabase → **Table Editor** → `profiles`.

**Invitasjons-e-post kommer ikke fram**
Supabase sender bare noen få e-poster i timen på gratisplanen. Bruk
**«Lag passord nå»** i stedet – da får du et passord du kan sende dem selv.

**Prisene på nettsiden oppdaterer seg ikke**
Last siden på nytt med Ctrl+F5 (eller dra ned på mobil).

---

## Kjøre siden på egen PC (valgfritt)

```bash
npm install
cp .env.example .env.local     # fyll inn nøklene fra Supabase
npm run dev
```

Åpne så `http://localhost:3000`.
