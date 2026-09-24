import type { SiteData } from './types';

/**
 * Disse verdiene brukes hvis Supabase ikke er koblet til ennå,
 * eller hvis databasen ikke svarer. Da fungerer nettsiden uansett.
 * Så snart Supabase er satt opp hentes alt derfra i stedet.
 */
export const DEFAULT_SETTINGS: Record<string, string> = {
  bedrift_navn: 'PrintFiksEB',
  bedrift_slagord: 'Ideer blir virkelighet',
  bedrift_skole: 'Skranevatnet skole',
  bedrift_sted: 'Sandsli, Bergen',
  kontakt_telefon: '41381608',
  kontakt_epost: '',
  vipps_nummer: '41381608',
  vipps_navn: 'PrintFiksEB',
  kontakt_meldingstid: 'Bestillinger på nettsiden tar vi imot hele døgnet, alle dager.',
  kontakt_ringetid: 'Ring mellom 15 og 21, mandag til lørdag.',
  kontakt_ringer_tilbake: 'Rekker vi ikke å ta telefonen, ringer vi tilbake så fort vi har tid.',
  sosial_instagram: '',
  sosial_snapchat: '',
  pris_startpris: '100',
  pris_startpris_pa: 'ja',
  pris_valuta: 'kr',
  pris_reparasjon: 'Pris etter avtale',
  levering_radius_km: '3',
  levering_dager_min: '2',
  levering_dager_maks: '4',
  betaling_tekst:
    'Vi tar helst Vipps. Kontant går også fint, men si fra på forhånd så vi har veksel klart.',
  tekst_hero_tittel: 'Vi printer, fikser og designer det du trenger i 3D',
  tekst_hero_ingress:
    'PrintFiksEB er en elevbedrift på Skranevatnet skole. Bestill på nettsiden, så tar vi kontakt og gir deg en pris du må godkjenne før vi starter.',
  tekst_om_oss:
    'PrintFiksEB er en elevbedrift drevet av 10. klassinger på Skranevatnet skole. Vi startet fordi vi syntes det var rart at så mye kastes når en liten plastdel ryker – og fordi 3D-printing rett og slett er gøy. I dag printer vi reservedeler, holdere, figurer, gaver og egne design for folk i nærmiljøet.',
  tekst_reparasjon:
    'Har du noe som har knekt? Beskriv det i bestillingen, så tar vi kontakt og finner ut om vi kan printe en ny del eller lage en løsning. Vi gir alltid pris før vi begynner.',
  tekst_fikse_tittel: 'Du vet ikke hva en 3D-printer kan fikse',
  tekst_fikse_ingress:
    'De fleste tenker på 3D-printing som leker og figurer. Sannheten er at vi lager små plastdeler folk ellers kaster hele produktet for. Her er noen eksempler.',
  tekst_fikse_ikke:
    'Vi printer i plast, så vi kan ikke lage noe som skal tåle høy varme, bære tung vekt eller brukes i mat over tid. Metall, glass og elektronikk fikser vi heller ikke. Er du usikker? Spør oss – vi sier fra hvis det ikke går.',
  video_url: '',
  ai_modell: 'gpt-4o-mini',
  tekst_vilkar:
    'Når du sender inn en bestilling, er den bindende, og du plikter å betale for det du har bestilt.\n\nFerdige modeller fra galleriet har fast pris. Da trenger vi ingen godkjenning, og vi starter produksjonen med en gang.\n\nTing vi lager spesielt til deg – egne design, reparasjoner og alt som lages etter dine mål – får du en endelig pris på fra oss, som du må godkjenne før vi starter.\n\nVil du avbestille, må du ringe eller sende melding til oss før vi har startet produksjonen. Har vi begynt å printe, må bestillingen betales.\n\nAngrerett: Ferdige modeller fra galleriet kan du angre på i 14 dager etter at du har fått dem, så lenge de ikke er tilpasset deg. Ting som er laget etter dine mål eller ønsker er unntatt angreretten, fordi de er laget spesielt til deg.\n\nBetaling skjer med Vipps eller kontant ved henting eller levering.',
  tekst_godkjenning:
    'Priser på ting vi lager spesielt til deg er estimat – du får en endelig pris fra oss som du må godkjenne før vi starter. Ferdige modeller fra galleriet har fast pris, og dem setter vi i gang med med en gang.',
};

export const DEFAULT_SITE: SiteData = {
  settings: DEFAULT_SETTINGS,
  connected: false,
  materials: [
    {
      id: 'pla',
      name: 'PLA',
      price_per_gram: 0.8,
      description:
        'Standard og rimeligst. Fint til figurer, holdere, pynt og det meste innendørs.',
      color: '#2559C7',
      active: true,
      sort: 10,
    },
    {
      id: 'petg',
      name: 'PETG',
      price_per_gram: 1.0,
      description:
        'Tåler mer varme og slag. Best til deler som skal brukes ute eller belastes.',
      color: '#14171C',
      active: true,
      sort: 20,
    },
  ],
  weightRanges: [
    { id: 'w1', label: '0–10 g (nøkkelring, liten figur)', min_g: 0, max_g: 10, active: true, sort: 10 },
    { id: 'w2', label: '10–50 g (holder, klips, liten del)', min_g: 10, max_g: 50, active: true, sort: 20 },
    { id: 'w3', label: '50–100 g (boks, stativ)', min_g: 50, max_g: 100, active: true, sort: 30 },
    { id: 'w4', label: '100–250 g (større del, figur)', min_g: 100, max_g: 250, active: true, sort: 40 },
    { id: 'w5', label: '250–500 g (stort objekt)', min_g: 250, max_g: 500, active: true, sort: 50 },
    { id: 'w6', label: 'Over 500 g', min_g: 500, max_g: 900, active: true, sort: 60 },
  ],
  extras: [
    {
      id: 'design',
      name: 'Vi designer 3D-filen for deg',
      description: 'Du slipper å lage modellen selv – vi tegner den etter det du beskriver.',
      price: 100,
      scope: 'item',
      active: true,
      sort: 10,
    },
    {
      id: 'besok',
      name: 'Hjemmebesøk for oppmåling',
      description: 'En av oss kommer hjem til deg og tar målene, så slipper du å tegne.',
      price: 50,
      scope: 'order',
      active: true,
      sort: 20,
    },
  ],
  deliveryOptions: [
    {
      id: 'henting',
      name: 'Henting',
      description: 'Du henter hos oss på Sandsli. Helt gratis.',
      price: 0,
      active: true,
      sort: 10,
    },
    {
      id: 'hjemlevering',
      name: 'Hjemlevering',
      description: 'Vi kommer hjem til deg innenfor 3 km fra Skranevatnet skole.',
      price: 50,
      active: true,
      sort: 20,
    },
  ],
  products: [],
  team: [],
  colors: [
    { id: 'svart', name: 'Svart', hex: '#14171C', active: true, sort: 10 },
    { id: 'hvit', name: 'Hvit', hex: '#F5F5F5', active: true, sort: 20 },
  ],
  examples: [
    { id: 'e1', title: 'Knekte klips og fester', description: 'Klipset som holder panelet i bilen, kurven i oppvaskmaskinen eller dekselet på fjernkontrollen. Små plastdeler som gjør at hele tingen blir ubrukelig når de ryker.', image_url: '', category: 'Reparasjon', active: true, sort: 10 },
    { id: 'e2', title: 'Knotter og håndtak', description: 'Knotten på komfyren, håndtaket på skuffen, hjulet på trillekofferten. Vi måler opp og printer en ny.', image_url: '', category: 'Reparasjon', active: true, sort: 20 },
    { id: 'e3', title: 'Deler som ikke selges lenger', description: 'Produsenten har sluttet med modellen, eller vil selge deg en helt ny. Vi lager delen i stedet.', image_url: '', category: 'Reparasjon', active: true, sort: 30 },
    { id: 'e4', title: 'Holdere til akkurat din ting', description: 'Telefonholder til pulten, veggfeste til høyttaleren, stativ til nettbrettet på kjøkkenet. Tilpasset det du faktisk har.', image_url: '', category: 'Egne design', active: true, sort: 40 },
    { id: 'e5', title: 'Organisering', description: 'Skuffeinnsatser, kabelholdere, bokser som passer nøyaktig i hyllen din.', image_url: '', category: 'Egne design', active: true, sort: 50 },
    { id: 'e6', title: 'Gaver og pynt', description: 'Nøkkelringer med navn, figurer, skilt til døra, julepynt. Fint å gi bort, og billig å lage.', image_url: '', category: 'Gaver', active: true, sort: 60 },
  ],
  faq: [
    {
      id: 'f1',
      question: 'Hvordan bestiller jeg?',
      answer:
        'Bruk bestillingssiden eller galleriet, legg det du vil ha i handlelisten, fyll inn fullt navn, mobilnummer og e-post, og trykk «Send bestilling». Bestillingen kommer rett inn til oss, du får kvittering på melding med bestillingsnummer, og vi tar kontakt så fort vi kan.',
      active: true,
      sort: 10,
    },
    {
      id: 'f2',
      question: 'Må jeg vite hvor mange gram modellen er?',
      answer:
        'Nei. Du velger bare omtrent hvor stor den er, så gir vi deg en nøyaktig pris når vi tar kontakt.',
      active: true,
      sort: 20,
    },
    {
      id: 'f3',
      question: 'Hva hvis jeg ikke har en 3D-fil?',
      answer:
        'Da kan du sende oss en detaljert tegning med alle mål, så printer vi etter den. Eller så designer vi filen for deg for 100 kr. Vi kan også komme hjem til deg og ta målene for 50 kr ekstra.',
      active: true,
      sort: 30,
    },
    {
      id: 'f4',
      question: 'Hvor lang tid tar det?',
      answer:
        'Vanligvis 2–4 virkedager fra du har godkjent prisen. Store eller kompliserte jobber kan ta litt lenger – da sier vi fra.',
      active: true,
      sort: 40,
    },
    {
      id: 'f6',
      question: 'Kan jeg ringe i stedet for å bestille på nettsiden?',
      answer:
        'Ja! Bestillinger på nettsiden tar vi imot hele døgnet. Telefonen tar vi mellom 15 og 21, mandag til lørdag. Rekker vi ikke å svare, ringer vi tilbake så fort vi har tid, og fører bestillingen inn for deg.',
      active: true,
      sort: 45,
    },
    {
      id: 'f5',
      question: 'Hvordan betaler jeg?',
      answer:
        'Helst med Vipps. Kontant går også helt fint, men gi beskjed på forhånd så vi har veksel klart.',
      active: true,
      sort: 50,
    },
  ],
};
