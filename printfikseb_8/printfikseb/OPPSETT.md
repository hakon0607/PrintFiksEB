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
   | `OPENAI_API_KEY` | *(valgfritt)* AI-nøkkel til «Finpuss med AI» og PrintBot. Kan i stedet legges inn i adminpanelet senere |

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
| **Bestillinger** | Bestillingene som er kommet inn: hva som skal lages, status, frist og betaling |
| **PrintBot** | Chat med hjelperen: spør om hjelp, finn fram, eller la den gjøre endringer |
| **Oppgaver** | Deres egen planlegging: hva skal gjøres, hvem gjør det, når er fristen |
| **Priser** | Pris per gram, startpris, tillegg, levering og størrelsene kundene velger mellom |
| **Galleri** | Modeller med bilder, undertittel, kulepunkter og full beskrivelse. Her ligger også «Hent modell med AI» |
| **Min profil** | Ditt eget navn, bilde, hva du gjør – og bytt passord |
| **Hva vi kan fikse** | Eksemplene som vises på siden om hva 3D-printing kan brukes til |
| **Tekster** | Overskriften på forsiden, «om oss»-teksten og alt annet folk leser |
| **Spørsmål og svar** | Svar på det kundene spør om ofte |
| **Ansatte** | Hvem som vises på «Om oss», og hvem som får logge inn |
| **Kontakt og levering** | Telefonnummer, Vipps, når folk kan ringe og sende melding, leveringstid og leveringsområde |

### Bestillinger

Når det kommer inn en bestilling på melding eller telefon, fører dere den opp
under **Bestillinger**. Da ser alle i gruppa hva som er på gang, hvem som gjør
hva, hva som er levert og hva som er betalt.

Hver bestilling går gjennom disse stegene, og dere trykker dere videre etter
hvert: **Ny → Pris sendt → Godkjent → Printes → Ferdig → Levert.**
(Blir det ingenting av, setter dere den til **Avlyst**.)

Øverst ser dere hvor mange som er på gang, hvor mange som venter på betaling, og
hvor mye som er betalt inn denne måneden – kjekt å ha til regnskapet og
sluttrapporten. Siden er bare intern; kundene ser den aldri.

PrintBot kan også føre opp en bestilling for dere hvis dere heller vil skrive
«før opp bestilling fra Emma på en saksholder til 149 kr».

### Oppgaver

Under **Oppgaver** planlegger dere arbeidet. Skriv inn hva som skal gjøres, velg
hvem i gruppa som tar det, sett en frist og hvor mye det haster. Huk av når det
er ferdig, så flytter oppgaven seg ned under «Ferdig».

Knappene øverst filtrerer: **Alle**, **Mine**, **Ufordelt** eller én person.
Denne siden ser bare dere – den vises aldri på nettsiden, og den trenger ikke
publiseres.

### Alle jobber samtidig

Adminpanelet er i sanntid. Skriver én av dere i en tekst, ser de andre det med
en gang – dere trenger ikke laste siden på nytt. Står noen i samme rad, står det
«Ola redigerer» ved siden av.

Øverst til høyre ser dere hvem i gruppa som er pålogget akkurat nå (hold musa
over for å se hvilken side de er på), og hvor mange besøkende som er inne på
nettsiden i øyeblikket.

### Endre profil og roller

Alle kan endre sitt eget navn, bilde og hva de gjør under **Min profil**, og
bytte passord der. Eieren kan i tillegg endre navn og rolle på alle andre under
**Ansatte** – også gjøre noen andre til eier. Det må alltid finnes minst én eier.

### AI-nøkkel og «Finpuss med AI»

Dere kan legge inn OpenAI-nøkkelen på **to måter**. Velg én:

**1. I Vercel (enklest hvis dere uansett er inne der)**
Settings → Environment Variables → legg til `OPENAI_API_KEY` med nøkkelen som
verdi, og trykk **Redeploy**. Ferdig. Adminpanelet oppdager den selv og skriver
«AI-nøkkel ligger i Vercel».

**2. I adminpanelet (enklest i hverdagen)**
Øverst på **Galleri**-siden limer eieren den inn. Da kan dere bytte nøkkel uten
å gå innom Vercel, og uten å publisere på nytt.

Legger dere inn en nøkkel i adminpanelet, er det den som gjelder – også hvis det
ligger én i Vercel fra før. Uansett hvilken dere velger: nøkkelen ligger bare på
serveren, alle i gruppa kan bruke AI-funksjonene, og ingen får se selve nøkkelen
igjen.

Slik legger dere inn en modell:

1. Trykk **«+ Legg til modell»**
2. Last opp bildene – dra dem inn, velg dem, eller lim inn med **Ctrl+V**.
   Det første bildet blir hovedbildet, men du kan trykke «Gjør til hovedbilde»
   på hvilket som helst av dem.
3. Skriv det du vet. Du trenger ikke fylle ut alt.
4. Trykk **«Finpuss med AI»**. Den rydder teksten, fyller ut feltene du lot
   stå tomme, lager kulepunkter og foreslår en pen pris (49, 99, 149 …).
5. Liker du det ikke? Trykk **«Angre finpuss»**, så er alt som før.
6. Skru på bryteren til høyre, og publiser.

Feltet **«Lenke til originalen»** er bare synlig for eiere, og vises aldri på
nettsiden. Husk å sjekke lisensen på modellen før dere selger den videre.

### PrintBot

**PrintBot** har sin egen side i menyen, og ligger dessuten som en liten boble
nede til høyre på alle sidene så dere alltid kan spørre der dere er. Den kan svare på hvordan
ting virker, vise vei til riktig side, og foreslå endringer – for eksempel «sett
startprisen til 79 kr» eller «lag en oppgave om å ta bilder av nye modeller».

PrintBot **gjør aldri noe selv, og spør alltid først**. Den viser nøyaktig hva
som vil skje – den gamle verdien overstreket ved siden av den nye – og venter på
at du trykker **«Ja, gjør det»**. Trykker du «Nei, la det være», skjer ingenting.

Det er du som sitter og chatter som bestemmer. Du trenger ikke spørre eieren
eller noen andre; alle som kan logge inn kan bruke PrintBot og si ja til det den
foreslår. Den trenger den samme AI-nøkkelen som «Finpuss med AI».

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
