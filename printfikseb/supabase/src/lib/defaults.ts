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
    'PrintFiksEB er en elevbedrift på Skranevatnet skole. Send oss en idé, et mål eller en ødelagt plastdel – så lager vi det. Du får alltid en pris du må godkjenne før vi starter.',
  tekst_om_oss:
    'PrintFiksEB er en elevbedrift drevet av 10. klassinger på Skranevatnet skole. Vi startet fordi vi syntes det var rart at så mye kastes når en liten plastdel ryker – og fordi 3D-printing rett og slett er gøy. I dag printer vi reservedeler, holdere, figurer, gaver og egne design for folk i nærmiljøet.',
  tekst_reparasjon:
    'Har du noe som har knekt? Send oss bilde og mål på SMS, så finner vi ut om vi kan printe en ny del eller lage en løsning. Vi gir alltid pris før vi begynner.',
  tekst_godkjenning:
    'Alle priser på nettsiden er estimat. Du får en endelig pris på melding som du må godkjenne før vi starter å printe.',
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
  faq: [
    {
      id: 'f1',
      question: 'Hvordan bestiller jeg?',
      answer:
        'Bruk priskalkulatoren eller galleriet, legg det du vil ha i handlelisten, og trykk «Send bestilling». Da får du en ferdig melding du bare sender til oss på SMS. Så svarer vi og avtaler resten.',
      active: true,
      sort: 10,
    },
    {
      id: 'f2',
      question: 'Må jeg vite hvor mange gram modellen er?',
      answer:
        'Nei. Du velger bare omtrent hvor stor den er i kalkulatoren, så gir vi deg en nøyaktig pris på melding etterpå.',
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
      id: 'f5',
      question: 'Hvordan betaler jeg?',
      answer:
        'Helst med Vipps. Kontant går også helt fint, men gi beskjed på forhånd så vi har veksel klart.',
      active: true,
      sort: 50,
    },
  ],
};
