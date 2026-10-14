'use client';

import Link from 'next/link';
import { grupperEtterMerke, merkeFor, type Merke } from '@/lib/deksel/modellnavn';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '@/lib/cart';
import type { Analyse, Ring } from '@/lib/deksel/analyse';
import {
  dekselPris,
  hexTilRgb,
  posteriser,
  tilLab,
  utvalg,
  velgFarger,
  type Filament,
} from '@/lib/deksel/farger';
import { rammer, sti } from '@/lib/deksel/svg';
import { FONTER, lastFont } from '@/lib/deksel/fonter';
import { SYMBOLER } from '@/lib/deksel/symboler';
import {
  fargerI,
  flyttet,
  lagNavn,
  nyId,
  tegnLag,
  type BildeLag,
  type Lag,
  type TegningLag,
} from '@/lib/deksel/lag';
import { Lerret, type Modus } from '@/components/deksel/Lerret';
import { LagPanel } from '@/components/deksel/LagPanel';
import { Ikon } from '@/components/deksel/Ikon';
import { Fargeknapp } from '@/components/deksel/Fargeknapp';
import dynamic from 'next/dynamic';

const Visning3D = dynamic(() => import('@/components/deksel/Visning3D').then((m) => m.Visning3D), { ssr: false });

export type DekselModell = {
  id: string;
  navn: string;
  /** null for mobiler fra GitHub-filene – da hentes analysen fra analyse_url når mobilen velges */
  analyse: Analyse | null;
  analyse_url?: string;
  fil_url?: string;
  fil_navn?: string;
};

/** mm per piksel i fargekartet. 0,1 mm gir glatte kanter (dysen er 0,4 mm). */
const SKALA = 0.1;
const MAKS_BILDER = 4;
const PENNER = [1, 2, 3.5, 6];

function tryggBoks(a: Analyse) {
  const pts = a.trygg.flatMap((p) => p[0]);
  const us = pts.map((p) => p[0]);
  const vs = pts.map((p) => p[1]);
  const minU = Math.min(...us), maxU = Math.max(...us), minV = Math.min(...vs), maxV = Math.max(...vs);
  return { b: maxU - minU, h: maxV - minV, cu: (minU + maxU) / 2, cv: (minV + maxV) / 2 };
}

const unik = (xs: string[]) => [...new Set(xs)];
const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');

export function DekselGenerator({
  produktNavn = 'Mobildeksel med eget motiv',
  modeller,
  filamenter,
  dekselFarger,
  grunnpris,
  perFarge,
  maksFarger,
}: {
  produktNavn?: string;
  modeller: DekselModell[];
  filamenter: Filament[];
  /** Hvilke farger selve dekselet kan ha (id-er). Tom = alle. */
  dekselFarger?: string[];
  grunnpris: number;
  perFarge: number;
  maksFarger: number;
}) {
  const { add } = useCart();
  const grupper = useMemo(() => grupperEtterMerke(modeller), [modeller]);
  const [valgtMerke, setValgtMerke] = useState<Merke>(grupper[0]?.merke ?? 'iPhone');
  const iMerket = grupper.find((g) => g.merke === valgtMerke)?.modeller ?? modeller;
  const [modellId, setModellId] = useState(iMerket[0]?.id ?? modeller[0]?.id ?? '');
  const modell = modeller.find((m) => m.id === modellId) ?? null;

  // Mobiler fra GitHub-filene har analysen i en egen fil – hent den når mobilen velges
  const [hentet, setHentet] = useState<Record<string, Analyse>>({});
  const [hentFeil, setHentFeil] = useState('');
  const a = modell?.analyse ?? (modell ? hentet[modell.id] : null) ?? null;
  useEffect(() => {
    if (!modell || modell.analyse || hentet[modell.id] || !modell.analyse_url) return;
    let avbrutt = false;
    setHentFeil('');
    fetch(modell.analyse_url)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((data: Analyse) => { if (!avbrutt) setHentet((h) => ({ ...h, [modell.id]: data })); })
      .catch(() => { if (!avbrutt) setHentFeil(`Klarte ikke å hente ${modell.navn}. Last siden på nytt, eller velg en annen mobil.`); });
    return () => { avbrutt = true; };
  }, [modell, hentet]);

  function velgMerke(m: Merke) {
    setValgtMerke(m);
    const forste = grupper.find((g) => g.merke === m)?.modeller[0];
    if (forste) { setModellId(forste.id); setLagtTil(false); }
  }

  const dekselValg = useMemo(() => {
    const ok = filamenter.filter((f) => !dekselFarger?.length || dekselFarger.includes(f.id));
    return ok.length ? ok : filamenter.slice(0, 1);
  }, [filamenter, dekselFarger]);
  const [dekselId, setDekselId] = useState(dekselValg[0]?.id ?? '');
  useEffect(() => {
    if (!dekselValg.some((f) => f.id === dekselId)) setDekselId(dekselValg[0]?.id ?? '');
  }, [dekselValg, dekselId]);

  const fil = useCallback((id: string) => filamenter.find((f) => f.id === id) ?? filamenter[0], [filamenter]);
  const hex = useCallback((id: string) => fil(id).hex, [fil]);
  const dekselFil = fil(dekselId);

  /* ---------- lag + angre ---------- */
  const [lag, setLag] = useState<Lag[]>([]);
  const lagRef = useRef(lag);
  lagRef.current = lag;
  const fortid = useRef<Lag[][]>([]);
  const fremtid = useRef<Lag[][]>([]);
  const sistMerke = useRef(0);
  const [, setHist] = useState(0);

  const merke = useCallback((tvang = true) => {
    const n = Date.now();
    if (!tvang && n - sistMerke.current < 800) return;
    sistMerke.current = n;
    fortid.current.push(lagRef.current);
    if (fortid.current.length > 80) fortid.current.shift();
    fremtid.current = [];
    setHist((h) => h + 1);
  }, []);
  const angre = useCallback(() => {
    const forrige = fortid.current.pop();
    if (!forrige) return;
    fremtid.current.push(lagRef.current);
    setLag(forrige);
    setHist((h) => h + 1);
  }, []);
  const gjenta = useCallback(() => {
    const neste = fremtid.current.pop();
    if (!neste) return;
    fortid.current.push(lagRef.current);
    setLag(neste);
    setHist((h) => h + 1);
  }, []);

  const [valgt, setValgt] = useState<string | null>(null);
  const [modus, setModus] = useState<Modus>('flytt');
  const [visning, setVisning] = useState<'print' | 'original'>('print');
  const [tre, setTre] = useState(false);
  const [feil, setFeil] = useState('');
  const [lagtTil, setLagtTil] = useState(false);
  const [visSymboler, setVisSymboler] = useState(false);
  const tekstFelt = useRef<HTMLTextAreaElement>(null);

  const endreLag = useCallback((ny: Lag) => {
    setLag((ls) => ls.map((l) => (l.id === ny.id ? ny : l)));
    setLagtTil(false);
  }, []);
  /** For glidebrytere: maks én oppdatering per skjermbilde, så mobilen henger med. */
  const venterLag = useRef<Lag | null>(null);
  const venterRamme = useRef(0);
  const endreLagRolig = useCallback((ny: Lag) => {
    venterLag.current = ny;
    if (venterRamme.current) return;
    venterRamme.current = requestAnimationFrame(() => {
      venterRamme.current = 0;
      if (venterLag.current) endreLag(venterLag.current);
      venterLag.current = null;
    });
  }, [endreLag]);
  /** true mens en finger/mus drar på lerretet – da venter den tunge printberegningen */
  const aktivRef = useRef(false);

  /* ---------- farger ---------- */
  const [antall, setAntall] = useState(Math.min(2, maksFarger));
  const [motivIder, setMotivIder] = useState<string[]>([]);
  const [manuelt, setManuelt] = useState(false);
  const harBilde = lag.some((l) => l.type === 'bilde');
  const faste = useMemo(() => unik(lag.flatMap(fargerI)).filter((id) => id !== dekselId), [lag, dekselId]);

  /** Kan dette laget (eller pennen) få denne fargen uten å gå over maks? */
  const tillatt = useCallback(
    (farge: string, lagId?: string) => {
      if (farge === dekselId) return false;
      const andre = unik(lag.filter((l) => l.id !== lagId).flatMap(fargerI)).filter((id) => id !== dekselId);
      return andre.includes(farge) || andre.length < maksFarger;
    },
    [lag, dekselId, maksFarger]
  );

  /** En god startfarge: en som allerede er i bruk, ellers den som synes best på dekselet. */
  const startFarge = useCallback(() => {
    if (faste.length) return faste[0];
    if (motivIder.length) return motivIder[0];
    const d = tilLab(...hexTilRgb(dekselFil.hex));
    let best = filamenter.find((f) => f.id !== dekselId) ?? filamenter[0], bestD = -1;
    for (const f of filamenter) {
      if (f.id === dekselId) continue;
      const l = tilLab(...hexTilRgb(f.hex));
      const dist = Math.hypot(l[0] - d[0], l[1] - d[1], l[2] - d[2]);
      if (dist > bestD) { bestD = dist; best = f; }
    }
    return best.id;
  }, [faste, motivIder, dekselFil, filamenter, dekselId]);

  const [penn, setPenn] = useState<{ farge: string; bredde: number }>({ farge: '', bredde: 2 });
  const pennFarge = penn.farge && penn.farge !== dekselId ? penn.farge : startFarge();

  /* ---------- geometri ---------- */
  const r = a ? rammer(a.silhuett) : null;
  const boks = useMemo(() => (a ? tryggBoks(a) : null), [a]);
  const W = r ? Math.ceil(r.bredde / SKALA) : 0;
  const H = r ? Math.ceil(r.hoyde / SKALA) : 0;

  /* ---------- legg til ---------- */
  const studioRef = useRef<HTMLDivElement>(null);
  /** På mobil ligger knappene under studioet – vis dekselet rolig når noe legges til, i stedet for at siden hopper. */
  function visStudio() {
    const el = studioRef.current;
    if (!el || window.matchMedia('(min-width: 1024px)').matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < -40 || r.top > window.innerHeight * 0.4) {
      window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    }
  }
  function leggTilLag(l: Lag) {
    setTre(false);
    merke();
    setLag((ls) => [...ls, l]);
    setValgt(l.id);
    setModus('flytt');
    setLagtTil(false);
  }

  function lastBilde(filer: FileList | File[] | null | undefined) {
    const liste = [...(filer ?? [])];
    if (!liste.length || !boks) return;
    for (const f of liste) {
      if (lagRef.current.filter((l) => l.type === 'bilde').length >= MAKS_BILDER) {
        setFeil(`Maks ${MAKS_BILDER} bilder på ett deksel.`);
        return;
      }
      if (!f.type.startsWith('image/')) { setFeil('Det der er ikke et bilde.'); continue; }
      if (f.size > 25 * 1024 * 1024) { setFeil('Bildet er for stort (maks 25 MB).'); continue; }
      const url = URL.createObjectURL(f);
      const el = new window.Image();
      el.onload = () => {
        setFeil('');
        visStudio();
        const forhold = el.naturalHeight / el.naturalWidth;
        leggTilLag({
          id: nyId(), type: 'bilde', el, url, navn: f.name,
          u: boks.cu, v: boks.cv, bredde: Math.min(boks.b, boks.h / forhold), rot: 0,
        });
        setManuelt(false);
      };
      el.onerror = () => setFeil('Klarte ikke å åpne bildet. Prøv JPG eller PNG.');
      el.src = url;
    }
  }

  function leggTilTekst() {
    if (!boks) return;
    FONTER.forEach((f) => lastFont(f.id));
    visStudio();
    leggTilLag({
      id: nyId(), type: 'tekst', tekst: 'Din tekst', font: 'inter', farge: startFarge(),
      u: boks.cu, v: boks.cv, hoyde: Math.round(Math.min(14, boks.b / 6)), rot: 0,
    });
    // på mobil: ikke åpne tastaturet automatisk (det flytter siden) – trykk i feltet når du vil skrive
    if (!erBeroring()) window.setTimeout(() => { tekstFelt.current?.focus({ preventScroll: true }); tekstFelt.current?.select(); }, 60);
  }

  function leggTilSymbol(id: string) {
    if (!boks) return;
    visStudio();
    leggTilLag({
      id: nyId(), type: 'symbol', symbol: id, farge: startFarge(),
      u: boks.cu, v: boks.cv, bredde: Math.round(Math.min(30, boks.b * 0.45)), rot: 0,
    });
    setVisSymboler(false);
  }

  /* ---------- tegning ---------- */
  const tegneLag = useRef<string | null>(null);
  const visk = modus === 'visk';
  const pennVis = { hex: visk ? dekselFil.hex : hex(pennFarge), bredde: visk ? Math.max(3, penn.bredde * 1.5) : penn.bredde };
  /** En hel strek kommer fra lerretet når fingeren løftes – ett angre-punkt per strek. */
  function leggTilStrek(punkter: [number, number][]) {
    if (!punkter.length) return;
    merke();
    const strek = { farge: visk ? dekselId : pennFarge, bredde: pennVis.bredde, visk };
    const eksisterende = tegneLag.current ? lagRef.current.find((l) => l.id === tegneLag.current && l.type === 'tegning') as TegningLag | undefined : undefined;
    if (eksisterende) {
      const pts = punkter.map(([u, v]) => [u - eksisterende.du, v - eksisterende.dv] as [number, number]);
      endreLag({ ...eksisterende, streker: [...eksisterende.streker, { ...strek, punkter: pts }] });
    } else {
      const ny: TegningLag = { id: nyId(), type: 'tegning', du: 0, dv: 0, streker: [{ ...strek, punkter }] };
      tegneLag.current = ny.id;
      setLag((ls) => [...ls, ny]);
    }
    setLagtTil(false);
  }
  function velgModus(m: Modus) {
    setModus(m);
    if (m !== 'flytt') setTre(false);
    if (m === 'flytt') tegneLag.current = null;
    else setValgt(null);
  }

  /* ---------- lagliste ---------- */
  const slett = useCallback((id: string) => {
    merke();
    setLag((ls) => ls.filter((l) => l.id !== id));
    setValgt((v) => (v === id ? null : v));
    if (tegneLag.current === id) tegneLag.current = null;
    setLagtTil(false);
  }, [merke]);
  function dupliser(id: string) {
    const l = lag.find((x) => x.id === id);
    if (!l) return;
    leggTilLag({ ...flyttet(l, 4, -4), id: nyId() } as Lag);
  }
  function flyttIStabel(id: string, retning: 1 | -1) {
    const i = lag.findIndex((l) => l.id === id);
    const j = i + retning;
    if (i < 0 || j < 0 || j >= lag.length) return;
    merke();
    const ny = [...lag];
    [ny[i], ny[j]] = [ny[j], ny[i]];
    setLag(ny);
  }
  /** Bytt en farge overalt (fra fargelisten). */
  function byttFarge(fra: string, til: string) {
    merke();
    setLag((ls) =>
      ls.map((l) => {
        if (l.type === 'tekst' || l.type === 'symbol') return l.farge === fra ? { ...l, farge: til } : l;
        if (l.type === 'tegning') return { ...l, streker: l.streker.map((s) => (!s.visk && s.farge === fra ? { ...s, farge: til } : s)) };
        return l;
      })
    );
    if (penn.farge === fra) setPenn({ ...penn, farge: til });
  }

  /* ---------- tastatur ---------- */
  useEffect(() => {
    function tast(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      const skriver = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !skriver) {
        e.preventDefault();
        if (e.shiftKey) gjenta(); else angre();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !skriver) {
        e.preventDefault();
        gjenta();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && valgt && !skriver) {
        e.preventDefault();
        slett(valgt);
      }
    }
    window.addEventListener('keydown', tast);
    return () => window.removeEventListener('keydown', tast);
  }, [valgt, angre, gjenta, slett]);

  /* ---------- fonter ---------- */
  const [fontTick, setFontTick] = useState(0);
  const brukteFonter = unik(lag.flatMap((l) => (l.type === 'tekst' ? [l.font] : []))).join();
  useEffect(() => {
    if (!brukteFonter) return;
    let aktiv = true;
    Promise.all(brukteFonter.split(',').map(lastFont)).then(() => aktiv && setFontTick((t) => t + 1));
    return () => { aktiv = false; };
  }, [brukteFonter]);

  /* ---------- rasterisering + farger ---------- */
  const nokkel = useMemo(
    () =>
      JSON.stringify({ lag, dekselId, antall, manuelt, m: manuelt ? motivIder : 0, fontTick, modellId },
        (k, v) => (k === 'el' ? undefined : v)),
    [lag, dekselId, antall, manuelt, motivIder, fontTick, modellId]
  );
  const [print, setPrint] = useState<{ bilde: string; nokkel: string; pal: Filament[]; brukt: number[] }>({ bilde: '', nokkel: '', pal: [], brukt: [] });
  const [regner, setRegner] = useState(false);

  // fargeberegningen kjører i en egen tråd (Web Worker) så siden ikke hakker
  const arbeider = useRef<{ w: Worker | null; opptatt: boolean; jobb: number }>({ w: null, opptatt: false, jobb: 0 });
  useEffect(() => () => arbeider.current.w?.terminate(), []);
  function posteriserIBakgrunnen(rgba: Uint8ClampedArray, maske: Uint8Array, hexer: string[]): Promise<Uint8Array> {
    const s = arbeider.current;
    const id = ++s.jobb;
    try {
      if (s.w && s.opptatt) { s.w.terminate(); s.w = null; } // gammel jobb er utdatert – start på nytt
      if (!s.w) s.w = new Worker(new URL('../lib/deksel/print.worker.ts', import.meta.url));
    } catch {
      return Promise.resolve(posteriser(rgba, W, H, hexer, maske, SKALA)); // nettleseren støtter ikke worker
    }
    const w = s.w;
    s.opptatt = true;
    return new Promise((ok, feil) => {
      w.onmessage = (e: MessageEvent<{ id: number; kart: Uint8Array }>) => {
        if (e.data.id !== s.jobb) return;
        s.opptatt = false;
        ok(e.data.kart);
      };
      w.onerror = () => { s.opptatt = false; s.w = null; feil(new Error('worker')); };
      w.postMessage({ id, rgba, W, H, hex: hexer, maske, skala: SKALA }, [rgba.buffer, maske.buffer]);
    });
  }

  useEffect(() => {
    if (!a || !r || !lag.length) { setPrint({ bilde: '', nokkel, pal: [], brukt: [] }); return; }
    setRegner(true);
    let t = 0;
    let avbrutt = false;
    const beregn = async () => {
      // ikke frys skjermen midt i et dra – prøv igjen litt senere
      if (aktivRef.current) { t = window.setTimeout(beregn, 200); return; }
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.setTransform(1 / SKALA, 0, 0, -1 / SKALA, -r.u0 / SKALA, r.v0 / SKALA);
      tegnLag(ctx, lag, hex);
      const rgba = ctx.getImageData(0, 0, W, H).data;

      // maske: trygg sone
      const m = document.createElement('canvas');
      m.width = W; m.height = H;
      const mc = m.getContext('2d', { willReadFrequently: true })!;
      mc.setTransform(1 / SKALA, 0, 0, -1 / SKALA, -r.u0 / SKALA, r.v0 / SKALA);
      const p = new Path2D();
      for (const poly of a.trygg) for (const ring of poly) {
        ring.forEach(([u, v], i) => (i ? p.lineTo(u, v) : p.moveTo(u, v)));
        p.closePath();
      }
      mc.fill(p, 'evenodd');
      const ma = mc.getImageData(0, 0, W, H).data;
      const maske = new Uint8Array(W * H);
      for (let i = 0; i < maske.length; i++) maske[i] = ma[i * 4 + 3] > 127 ? 1 : 0;

      // farger: tekst/symboler/tegning bestemmer sine egne; bilder får resten
      let ider: string[];
      if (!harBilde) ider = faste;
      else {
        const n = Math.min(maksFarger, Math.max(antall, faste.length));
        if (!manuelt) ider = velgFarger(utvalg(rgba, maske), filamenter, dekselId, n, faste);
        else ider = unik([...faste, ...motivIder.filter((x) => x !== dekselId)]).slice(0, Math.max(n, faste.length));
      }
      if (ider.join() !== motivIder.join()) setMotivIder(ider);
      const pal = [dekselFil, ...ider.map(fil)];
      let kart: Uint8Array;
      try {
        kart = await posteriserIBakgrunnen(new Uint8ClampedArray(rgba), maske.slice(), pal.map((f) => f.hex));
      } catch {
        kart = posteriser(rgba, W, H, pal.map((f) => f.hex), maske, SKALA);
      }
      if (avbrutt) return;
      const brukt = new Set<number>();
      for (let i = 0; i < kart.length; i++) brukt.add(kart[i]);

      const ut = document.createElement('canvas');
      ut.width = W; ut.height = H;
      const oc = ut.getContext('2d')!;
      const img = oc.createImageData(W, H);
      const rgb = pal.map((f) => hexTilRgb(f.hex));
      for (let i = 0; i < kart.length; i++) {
        if (!kart[i]) continue;
        const [rr, gg, bb] = rgb[kart[i]];
        img.data[i * 4] = rr; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = bb; img.data[i * 4 + 3] = 255;
      }
      oc.putImageData(img, 0, 0);
      setPrint({ bilde: ut.toDataURL('image/png'), nokkel, pal, brukt: [...brukt].sort((x, y) => x - y) });
      setRegner(false);
    };
    t = window.setTimeout(beregn, erBeroring() ? 300 : 160);
    return () => { avbrutt = true; window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nokkel, W, H]);

  const printOppdatert = print.nokkel === nokkel && !!print.bilde;
  const antallBrukt = print.brukt.filter((i) => i > 0).length;
  const pris = dekselPris(grunnpris, perFarge, Math.max(1, antallBrukt));

  /* ---------- bestilling ---------- */
  function leggIBestilling() {
    if (!modell || !a || !r || !printOppdatert || !antallBrukt) return;
    add({
      kind: 'deksel',
      qty: 1,
      title: `${produktNavn} – ${modell.navn}`,
      price: pris,
      modellId: modell.id,
      modellNavn: modell.navn,
      farger: print.pal.map((f) => ({ navn: f.navn, hex: f.hex })),
      design: print.bilde,
      ramme: { u0: r.u0, v0: r.v0, skala: SKALA, bredde: W, hoyde: H },
      silhuett: sti([a.silhuett, ...a.hull]),
    });
    setLagtTil(true);
  }

  /* ---------- visning ---------- */
  if (!modeller.length) {
    return (
      <div className="rounded-3xl border border-dashed border-ink-200 bg-white/70 px-6 py-14 text-center">
        <p className="text-lg font-semibold text-ink-800">Dekselgeneratoren åpner snart</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
          Vi legger inn mobilmodellene nå. Vil du ha et deksel allerede? Send oss en melding.
        </p>
        <Link href={sporOssLenke('')} className="btn-primary mt-6">Spør oss</Link>
      </div>
    );
  }

  const valgtLag = lag.find((l) => l.id === valgt) ?? null;
  const motivFil = motivIder.map(fil);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start [touch-action:manipulation]">
      {/* ================= Studioet ================= */}
      <div className="lg:sticky lg:top-24" ref={studioRef} style={{ scrollMarginTop: 72 }}>
        <div className="studio px-3 pb-4 pt-12 sm:px-6">
          <div className="studio-rutenett" />
          <span className="studio-hjorne left-3 top-3 border-l border-t" />
          <span className="studio-hjorne right-3 top-3 border-r border-t" />
          <span className="studio-hjorne bottom-3 left-3 border-b border-l" />
          <span className="studio-hjorne bottom-3 right-3 border-b border-r" />

          {/* HUD */}
          <div className="studio-hud pointer-events-none absolute inset-x-5 top-4 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className={`studio-prikk ${regner ? 'opptatt' : ''}`} />
              {regner ? 'Beregner print' : 'Dekselstudio'} · <b>{modell?.navn}</b>
            </span>
            {r && <span className="hidden sm:inline">{fmt(r.bredde)} × {fmt(r.hoyde)} mm · oppløsning <b>{String(SKALA).replace('.', ',')} mm</b></span>}
          </div>

          <div className="relative">
            {!a && (
              <div className="grid h-[60vh] max-h-[620px] min-h-[380px] place-items-center text-center supports-[height:100svh]:h-[60svh]">
                <p className="studio-hud !normal-case !tracking-normal">
                  {hentFeil || <>Henter <b>{modell?.navn}</b> …</>}
                </p>
              </div>
            )}
            {tre && a && r && modell?.fil_url && (
              <Visning3D
                modellUrl={modell.fil_url}
                modellFilnavn={modell.fil_navn || modell.fil_url.split('/').pop() || 'modell.3mf'}
                analyse={a}
                dekselHex={dekselFil.hex}
                printBilde={print.bilde}
                ramme={{ u0: r.u0, v0: r.v0, bredde: W, hoyde: H, skala: SKALA }}
              />
            )}
            {!tre && a && r && modell && (
              <Lerret
                a={a}
                r={r}
                lag={lag}
                valgt={valgt}
                modus={modus}
                dekselHex={dekselFil.hex}
                hex={hex}
                printBilde={print.bilde}
                visPrint={visning === 'print' && printOppdatert}
                bildeW={W}
                bildeH={H}
                skala={SKALA}
                modellNavn={modell.navn}
                onVelg={setValgt}
                onStart={merke}
                onEndre={endreLag}
                onSlett={slett}
                onDobbel={(id) => {
                  const l = lag.find((x) => x.id === id);
                  if (l?.type === 'tekst') window.setTimeout(() => tekstFelt.current?.focus({ preventScroll: true }), 30);
                }}
                penn={pennVis}
                onStrek={leggTilStrek}
                onAktiv={(b) => { aktivRef.current = b; }}
              />
            )}
          </div>

          <p className="studio-hud pointer-events-none mt-2 h-4 text-center" aria-hidden={!(valgtLag && modus === 'flytt' && !tre)}>
            {!tre && valgtLag && modus === 'flytt' && (valgtLag.type !== 'tegning' ? (
                <>x <b>{fmt(valgtLag.u)}</b> · y <b>{fmt(valgtLag.v)}</b> · {valgtLag.type === 'tekst' ? 'h' : 'b'} <b>{fmt(valgtLag.type === 'tekst' ? valgtLag.hoyde : valgtLag.bredde)} mm</b> · rot <b>{valgtLag.rot}°</b></>
              ) : (
                <>tegning · <b>{valgtLag.streker.length}</b> {valgtLag.streker.length === 1 ? 'strek' : 'streker'}</>
              ))}
          </p>

          {/* verktøylinje */}
          <div className="relative mt-3 flex flex-wrap items-center justify-center gap-2">
            {modell?.fil_url && (
              <div className="studio-verktoy" role="group" aria-label="2D eller 3D">
                <button type="button" onClick={() => setTre(false)} aria-pressed={!tre}>2D</button>
                <button type="button" onClick={() => { setTre(true); setValgt(null); velgModus('flytt'); }} aria-pressed={tre}>3D</button>
              </div>
            )}
            {!tre && <div className="studio-verktoy" role="group" aria-label="Verktøy">
              {([
                ['flytt', 'Flytt', 'flytt'],
                ['tegn', 'Tegn', 'blyant'],
                ['visk', 'Visk', 'visk'],
              ] as const).map(([m, navn, ikon]) => (
                <button key={m} type="button" onClick={() => velgModus(m)} aria-pressed={modus === m}>
                  <Ikon navn={ikon} />{navn}
                </button>
              ))}
              <span className="studio-skille" />
              <button type="button" onClick={angre} disabled={!fortid.current.length} aria-label="Angre" title="Angre (Ctrl+Z)">
                <Ikon navn="angre" />
              </button>
              <button type="button" onClick={gjenta} disabled={!fremtid.current.length} aria-label="Gjør om" title="Gjør om (Ctrl+Y)">
                <Ikon navn="gjenta" />
              </button>
            </div>}
            {!tre && harBilde && (
              <div className="studio-verktoy" role="group" aria-label="Visning">
                {(['print', 'original'] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setVisning(v)} aria-pressed={visning === v}>
                    {v === 'print' ? 'Print' : 'Original'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* penn */}
          {!tre && modus !== 'flytt' && (
            <div className="studio-panel relative mx-auto mt-3 flex max-w-xl flex-wrap items-center justify-center gap-3 px-4 py-3">
              {modus === 'tegn' && (
                <div className="flex flex-wrap gap-1.5">
                  {filamenter.filter((f) => f.id !== dekselId).map((f) => (
                    <Fargeknapp key={f.id} f={f} liten valgt={pennFarge === f.id} deaktivert={!tillatt(f.id)}
                      onClick={() => setPenn({ ...penn, farge: f.id })} />
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5" role="group" aria-label="Tykkelse">
                {PENNER.map((b) => (
                  <button key={b} type="button" onClick={() => setPenn({ ...penn, bredde: b })} aria-pressed={penn.bredde === b}
                    className={`grid h-9 w-9 place-items-center rounded-full border transition-all ${penn.bredde === b ? 'border-cyan-400 shadow-[0_0_14px_-2px_rgba(34,211,238,.8)]' : 'border-white/15 hover:border-white/40'}`} title={`${String(b).replace('.', ',')} mm`}>
                    <span className="rounded-full bg-slate-100" style={{ width: 3 + b * 2.4, height: 3 + b * 2.4 }} />
                  </button>
                ))}
              </div>
              <p className="studio-hud w-full text-center !normal-case !tracking-normal text-xs">
                {modus === 'tegn' ? 'Tegn med fingeren eller musa. Trykk «Flytt» når du er ferdig.' : 'Visk ut det du ikke vil ha – også i bilder.'}
              </p>
            </div>
          )}

          {/* valgt lag */}
          {!tre && valgtLag && modus === 'flytt' && boks && (
            <div className="relative">
              <LagPanel
                lag={valgtLag}
                filamenter={filamenter}
                dekselId={dekselId}
                tillatt={(f) => tillatt(f, valgtLag.id)}
                maksFarger={maksFarger}
                tekstRef={tekstFelt}
                boks={boks}
                onEndre={(l, kontinuerlig) => { merke(!kontinuerlig); if (kontinuerlig) endreLagRolig(l); else endreLag(l); }}
                onSlett={() => slett(valgtLag.id)}
                onDupliser={() => dupliser(valgtLag.id)}
                onFrem={() => flyttIStabel(valgtLag.id, 1)}
                onBak={() => flyttIStabel(valgtLag.id, -1)}
                onLukk={() => setValgt(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ================= Valg ================= */}
      <div className="space-y-4">
        <Steg nr={1} tittel="Velg mobil">
          {grupper.length > 1 && (
            <div className="mb-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${grupper.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label="Merke">
              {grupper.map((g) => (
                <button key={g.merke} type="button" role="radio" aria-checked={valgtMerke === g.merke} onClick={() => velgMerke(g.merke)}
                  className={`rounded-2xl border px-3 py-2.5 text-sm font-bold transition-all ${
                    valgtMerke === g.merke ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-[0_0_0_3px_rgba(37,89,199,.12)]' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                  }`}>
                  {g.merke === 'Andre' ? 'Andre' : g.merke}
                  <span className="ml-1.5 text-xs font-semibold opacity-60">{g.modeller.length}</span>
                </button>
              ))}
            </div>
          )}
          <select value={modellId} onChange={(e) => { setModellId(e.target.value); setLagtTil(false); }} className="field" aria-label="Mobilmodell">
            {iMerket.map((m) => (<option key={m.id} value={m.id}>{merkeFor(m.navn) === 'Samsung' ? m.navn.replace(/^Samsung\s+/, '') : m.navn}</option>))}
          </select>
          <div className="mt-3 flex gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-900">
            <span className="mt-0.5 h-fit shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Demo</span>
            <p>
              Dekselstudioet er fortsatt i demo. Passer ikke dekselet, eller er det andre problemer, får du{' '}
              <b>100 % av pengene tilbake</b>.
            </p>
          </div>
          <p className="mt-2 text-[13px] text-ink-500">
            Finner du ikke mobilen din?{' '}
            <Link href={sporOssLenke('')} className="font-semibold text-brand-700 underline underline-offset-4">Spør oss</Link>
            {' '}– vi sjekker om vi kan lage den.
          </p>
        </Steg>

        <Steg nr={2} tittel="Lag motivet">
          <div className="grid grid-cols-2 gap-2">
            <label className="verktoy-knapp cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); lastBilde(e.dataTransfer.files); }}>
              <Ikon navn="bilde" stor /> Bilde
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { lastBilde(e.target.files); e.target.value = ''; }} />
            </label>
            <button type="button" className="verktoy-knapp" onClick={leggTilTekst}><Ikon navn="tekst" stor /> Tekst</button>
            <button type="button" className={`verktoy-knapp ${visSymboler ? 'aktiv' : ''}`} onClick={() => setVisSymboler((v) => !v)}>
              <Ikon navn="stjerne" stor /> Symbol
            </button>
            <button type="button" className={`verktoy-knapp ${modus === 'tegn' ? 'aktiv' : ''}`} onClick={() => { if (modus !== 'tegn') visStudio(); velgModus(modus === 'tegn' ? 'flytt' : 'tegn'); }}>
              <Ikon navn="blyant" stor /> Tegn
            </button>
          </div>
          {feil && <p className="mt-2 text-xs font-semibold text-red-600">{feil}</p>}

          {visSymboler && (
            <div className="mt-3 grid grid-cols-5 gap-1.5 rounded-2xl border border-ink-100 bg-ink-50 p-2">
              {SYMBOLER.map((s) => (
                <button key={s.id} type="button" onClick={() => leggTilSymbol(s.id)} title={s.navn} aria-label={s.navn}
                  className="grid aspect-square place-items-center rounded-xl bg-white text-ink-800 transition-colors hover:bg-brand-50 hover:text-brand-700">
                  <svg viewBox="0 0 24 24" className="h-7 w-7"><path d={s.d} fillRule={s.regel} fill="currentColor" /></svg>
                </button>
              ))}
            </div>
          )}

          {lag.length > 0 && (
            <ul className="mt-3 divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100">
              {[...lag].reverse().map((l) => (
                <li key={l.id}>
                  <div className={`flex items-center gap-2 px-3 py-2 text-sm ${l.id === valgt ? 'bg-brand-50' : 'bg-white'}`}>
                    <button type="button" onClick={() => { setValgt(l.id); velgModus('flytt'); }} className="flex min-w-0 flex-1 items-center gap-2 text-left font-semibold text-ink-800">
                      <LagMerke l={l} hex={hex} />
                      <span className="truncate">{lagNavn(l)}</span>
                    </button>
                    <button type="button" onClick={() => slett(l.id)} className="rounded-full p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label={`Slett ${lagNavn(l)}`}>
                      <Ikon navn="soppel" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 rounded-xl bg-brand-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-brand-900">
            <span className="font-semibold">Tips:</span> Trykk på noe på dekselet for å velge det. Dra for å flytte,
            bruk håndtakene for størrelse og rotasjon. Tekst, symboler og tegninger blir helt skarpe.
          </p>
        </Steg>

        <Steg nr={3} tittel="Farger">
          {dekselValg.length > 1 ? (
            <>
              <p className="label">Dekselfarge</p>
              <div className="flex flex-wrap gap-2">
                {dekselValg.map((f) => (
                  <Fargeknapp key={f.id} f={f} valgt={f.id === dekselId} onClick={() => { setDekselId(f.id); setLagtTil(false); }} />
                ))}
              </div>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-600">
              <span className="h-5 w-5 rounded-full border border-black/15" style={{ background: dekselFil.hex }} />
              Dekselet er <span className="font-semibold lowercase">{dekselFil.navn}</span>
            </p>
          )}

          {harBilde && (
            <>
              <p className="label mt-4">Antall farger i motivet</p>
              <div className="inline-flex rounded-full border border-ink-200 bg-ink-50 p-1" role="group">
                {Array.from({ length: maksFarger }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" disabled={n < faste.length} onClick={() => { setAntall(n); setManuelt(false); setLagtTil(false); }}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-30 ${Math.max(antall, faste.length) === n ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-white'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </>
          )}

          {motivFil.length > 0 && (
            <>
              <p className="label mt-4">Fargene i motivet</p>
              <FargeListe
                farger={motivFil}
                filamenter={filamenter}
                dekselId={dekselId}
                onBytt={(i, til) => {
                  const fra = motivIder[i];
                  const nye = [...motivIder];
                  nye[i] = til;
                  setMotivIder(nye);
                  if (harBilde) setManuelt(true);
                  byttFarge(fra, til);
                  setLagtTil(false);
                }}
              />
              {manuelt && harBilde && (
                <button type="button" onClick={() => setManuelt(false)} className="mt-2 text-[13px] font-semibold text-brand-700 hover:underline">
                  Velg automatisk fra bildet
                </button>
              )}
            </>
          )}
          <p className="hint">
            Maks {maksFarger} farger i motivet. Trykk på en farge for å bytte den overalt.
          </p>
        </Steg>

        <Steg nr={4} tittel="Pris og bestilling">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-600">Deksel med motiv</dt><dd className="font-semibold">{grunnpris} kr</dd></div>
            <div className="flex justify-between">
              <dt className="text-ink-600">{Math.max(1, antallBrukt)} {Math.max(1, antallBrukt) === 1 ? 'farge' : 'farger'} i motivet × {perFarge} kr</dt>
              <dd className="font-semibold">{perFarge * Math.max(1, antallBrukt)} kr</dd>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-2 text-base"><dt className="font-bold">Totalt</dt><dd className="font-bold text-brand-700">{pris} kr</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={leggIBestilling} disabled={!printOppdatert || !antallBrukt}
              className={`${lagtTil ? 'btn-dark' : 'btn-primary'} flex-1 disabled:opacity-50`}>
              {lagtTil ? 'Lagt til ✓' : !lag.length ? 'Lag et motiv først' : !printOppdatert ? 'Et øyeblikk …' : 'Legg i bestillingen'}
            </button>
            {lagtTil && <Link href="/bestill" className="btn-ghost">Gå til bestilling</Link>}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-500">
            Motivet printes inn i baksiden, så det kjennes helt glatt og ikke kan skrapes av. Fast pris – vi
            setter i gang med en gang.
          </p>
        </Steg>
      </div>
    </div>
  );
}

function sporOssLenke(modell: string) {
  const tekst = `Hei! Jeg vil gjerne ha et deksel med eget motiv til ${modell || '[skriv mobilmodellen din her]'}.`;
  return `/bestill?q=${encodeURIComponent(tekst)}`;
}

function Steg({ nr, tittel, children }: { nr: number; tittel: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
      <h2 className="mb-3 flex items-center gap-2.5 text-base font-bold text-ink-900">
        <span className="steg-nr grid h-7 w-9 place-items-center rounded-lg bg-slate-900 text-[11px] font-bold text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,.35)]">{String(nr).padStart(2, '0')}</span>
        {tittel}
      </h2>
      {children}
    </section>
  );
}

function LagMerke({ l, hex }: { l: Lag; hex: (id: string) => string }) {
  const boks = 'grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-ink-100 bg-ink-50';
  if (l.type === 'bilde') return <span className={boks}><img src={(l as BildeLag).url} alt="" className="h-full w-full object-cover" /></span>;
  if (l.type === 'symbol') {
    const s = SYMBOLER.find((x) => x.id === l.symbol)!;
    return <span className={boks}><svg viewBox="0 0 24 24" className="h-5 w-5"><path d={s.d} fillRule={s.regel} fill={hex(l.farge)} /></svg></span>;
  }
  if (l.type === 'tekst') return <span className={`${boks} text-sm font-black`} style={{ color: hex(l.farge) }}>Aa</span>;
  return <span className={boks} style={{ color: hex(l.streker.find((s) => !s.visk)?.farge ?? '') }}><Ikon navn="blyant" /></span>;
}

function FargeListe({
  farger, filamenter, dekselId, onBytt,
}: { farger: Filament[]; filamenter: Filament[]; dekselId: string; onBytt: (i: number, til: string) => void }) {
  const [apen, setApen] = useState<number | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {farger.map((f, i) => (
        <div key={i} className="relative">
          <button type="button" onClick={() => setApen(apen === i ? null : i)}
            className="flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 py-1 pl-1 pr-3 text-sm font-semibold text-ink-700 hover:border-brand-300">
            <span className="h-6 w-6 rounded-full border border-black/10" style={{ background: f.hex }} />
            {f.navn}
            <span className="text-ink-400">▾</span>
          </button>
          {apen === i && (
            <div className="solid-hvit absolute left-0 z-30 mt-2 flex w-56 flex-wrap gap-2 rounded-2xl border border-ink-200 bg-white p-3 shadow-lift">
              {filamenter.filter((x) => x.id !== dekselId && (x.id === f.id || !farger.some((y) => y.id === x.id))).map((x) => (
                <Fargeknapp key={x.id} f={x} valgt={x.id === f.id} liten onClick={() => { onBytt(i, x.id); setApen(null); }} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export type { Ring };

/** Telefon/nettbrett (finger i stedet for mus). */
function erBeroring() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}
