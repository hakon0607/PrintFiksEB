'use client';

/**
 * 3D-visning av dekselet med kundens motiv. Laster den ekte dekselmodellen
 * (samme fil som printes), og legger motivet på baksiden som en tekstur –
 * akkurat der det blir printet inn. three.js lastes bare når 3D åpnes.
 */
import { useEffect, useRef, useState } from 'react';
import type { Analyse } from '@/lib/deksel/analyse';

type Ramme = { u0: number; v0: number; bredde: number; hoyde: number; skala: number };

type Scene3D = {
  settTekstur: (bilde: string, hex: string) => void;
  settAuto: (pa: boolean) => void;
  nullstill: () => void;
  fjern: () => void;
};

/** Modellfiler hentes én gang per side. */
const modellCache = new Map<string, Promise<Uint8Array>>();
function hentModell(url: string) {
  let p = modellCache.get(url);
  if (!p) {
    p = fetch(url).then(async (r) => {
      if (!r.ok) throw new Error(`Fant ikke modellfila (${r.status}).`);
      return new Uint8Array(await r.arrayBuffer());
    });
    p.catch(() => modellCache.delete(url));
    modellCache.set(url, p);
  }
  return p;
}

export function Visning3D({
  modellUrl,
  modellFilnavn,
  analyse,
  dekselHex,
  printBilde,
  ramme,
}: {
  modellUrl: string;
  modellFilnavn: string;
  analyse: Analyse;
  dekselHex: string;
  printBilde: string;
  ramme: Ramme;
}) {
  const boks = useRef<HTMLDivElement>(null);
  const scene = useRef<Scene3D | null>(null);
  const [status, setStatus] = useState<'laster' | 'klar' | 'feil'>('laster');
  const [feil, setFeil] = useState('');
  const [auto, setAuto] = useState(true);
  const siste = useRef({ printBilde, dekselHex });
  siste.current = { printBilde, dekselHex };

  useEffect(() => {
    let avbrutt = false;
    setStatus('laster');
    (async () => {
      try {
        const [THREE, { OrbitControls }, { RoomEnvironment }, { toCreasedNormals }, { lesModell }, data] = await Promise.all([
          import('three'),
          import('three/examples/jsm/controls/OrbitControls.js'),
          import('three/examples/jsm/environments/RoomEnvironment.js'),
          import('three/examples/jsm/utils/BufferGeometryUtils.js'),
          import('@/lib/deksel/mesh'),
          hentModell(modellUrl),
        ]);
        if (avbrutt || !boks.current) return;
        const nett = lesModell(data, modellFilnavn).deler[analyse.kasseDel]?.nett;
        if (!nett) throw new Error('Fant ikke dekselet i modellfila.');

        /* ---- geometri: plate (x,y,z) → visning (u, v, -z) ---- */
        const [a, b, c, d, e, f] = analyse.tilVisning;
        const snu = a * e - b * d > 0; // speiling må motvirkes med snudd vinding
        const P = nett.punkter, T = nett.trekanter;
        const nTri = T.length / 3;
        const bak: number[] = [], rest: number[] = [];
        for (let t = 0; t < nTri; t++) {
          const i0 = T[t * 3] * 3, i1 = T[t * 3 + 1] * 3, i2 = T[t * 3 + 2] * 3;
          const ux = P[i1] - P[i0], uy = P[i1 + 1] - P[i0 + 1], uz = P[i1 + 2] - P[i0 + 2];
          const vx = P[i2] - P[i0], vy = P[i2 + 1] - P[i0 + 1], vz = P[i2 + 2] - P[i0 + 2];
          const nz = ux * vy - uy * vx;
          const len = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, nz) || 1;
          const nede = Math.max(P[i0 + 2], P[i1 + 2], P[i2 + 2]) < 0.05;
          (nede && nz / len < -0.9 ? bak : rest).push(t);
        }
        const rekkefolge = [...bak, ...rest];
        const pos = new Float32Array(rekkefolge.length * 9);
        const uv = new Float32Array(rekkefolge.length * 6);
        const tb = ramme.bredde * ramme.skala, th = ramme.hoyde * ramme.skala;
        let k = 0;
        for (const t of rekkefolge) {
          const hj = snu ? [0, 2, 1] : [0, 1, 2];
          for (const h of hj) {
            const i = T[t * 3 + h] * 3;
            const x = P[i], y = P[i + 1], z = P[i + 2];
            const u = a * x + b * y + c, v = d * x + e * y + f;
            pos[k * 3] = u; pos[k * 3 + 1] = v; pos[k * 3 + 2] = -z;
            uv[k * 2] = (u - ramme.u0) / tb;
            uv[k * 2 + 1] = (v - (ramme.v0 - th)) / th;
            k++;
          }
        }
        let geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo = toCreasedNormals(geo, (35 * Math.PI) / 180);
        geo.addGroup(0, bak.length * 3, 0);
        geo.addGroup(bak.length * 3, rest.length * 3, 1);
        geo.computeBoundingBox();
        const midt = geo.boundingBox!.getCenter(new THREE.Vector3());
        geo.translate(-midt.x, -midt.y, -midt.z);
        const str = geo.boundingBox!.getSize(new THREE.Vector3());

        /* ---- renderer og scene ---- */
        const el = boks.current;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.setSize(el.clientWidth, el.clientHeight);
        renderer.toneMapping = THREE.NeutralToneMapping;
        renderer.toneMappingExposure = 0.95;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        el.appendChild(renderer.domElement);
        renderer.domElement.style.touchAction = 'none';

        const sc = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        sc.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        const kam = new THREE.PerspectiveCamera(28, el.clientWidth / el.clientHeight, 1, 2000);
        const avstand = (Math.max(str.x, str.y) / 2 / Math.tan((28 * Math.PI) / 360)) * 1.25;
        const start = new THREE.Vector3(avstand * 0.32, avstand * 0.12, avstand * 0.95);
        kam.position.copy(start);

        const lys = new THREE.DirectionalLight(0xffffff, 1.4);
        lys.position.set(60, 120, 160);
        sc.add(lys);
        const kant = new THREE.DirectionalLight(0x67e8f9, 1.1);
        kant.position.set(-140, 40, -120);
        sc.add(kant);
        sc.add(new THREE.AmbientLight(0xffffff, 0.25));

        // tekstur: dekselfarge med motivet oppå
        const lerret = document.createElement('canvas');
        lerret.width = Math.max(2, ramme.bredde);
        lerret.height = Math.max(2, ramme.hoyde);
        const tekstur = new THREE.CanvasTexture(lerret);
        tekstur.colorSpace = THREE.SRGBColorSpace;
        tekstur.anisotropy = renderer.capabilities.getMaxAnisotropy();
        tekstur.generateMipmaps = true;
        tekstur.minFilter = THREE.LinearMipmapLinearFilter;

        const matBak = new THREE.MeshPhysicalMaterial({ map: tekstur, roughness: 0.55, sheen: 0.2, sheenRoughness: 0.8 });
        const matRest = new THREE.MeshPhysicalMaterial({ color: dekselHex, roughness: 0.55, sheen: 0.2, sheenRoughness: 0.8 });
        const mesh = new THREE.Mesh(geo, [matBak, matRest]);
        sc.add(mesh);

        // «hologram»-gulv: lys ring under dekselet
        const ringGeo = new THREE.RingGeometry(str.y * 0.42, str.y * 0.44, 96);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -str.y / 2 - 6;
        sc.add(ring);

        const kontroll = new OrbitControls(kam, renderer.domElement);
        kontroll.enableDamping = true;
        kontroll.dampingFactor = 0.08;
        kontroll.enablePan = false;
        kontroll.minDistance = avstand * 0.35;
        kontroll.maxDistance = avstand * 2.2;
        kontroll.autoRotate = true;
        kontroll.autoRotateSpeed = 1.6;
        kontroll.addEventListener('start', () => { kontroll.autoRotate = false; setAuto(false); });

        function settTekstur(bilde: string, hex: string) {
          matRest.color.set(hex);
          const ctx = lerret.getContext('2d')!;
          ctx.fillStyle = hex;
          ctx.fillRect(0, 0, lerret.width, lerret.height);
          tekstur.needsUpdate = true;
          if (!bilde) return;
          const img = new Image();
          img.onload = () => {
            ctx.fillStyle = hex;
            ctx.fillRect(0, 0, lerret.width, lerret.height);
            ctx.drawImage(img, 0, 0, lerret.width, lerret.height);
            tekstur.needsUpdate = true;
          };
          img.src = bilde;
        }
        settTekstur(siste.current.printBilde, siste.current.dekselHex);

        let ramme_ = 0;
        const t0 = performance.now();
        function tegn() {
          ramme_ = requestAnimationFrame(tegn);
          kontroll.update();
          ringMat.opacity = 0.22 + 0.13 * Math.sin((performance.now() - t0) / 700);
          renderer.render(sc, kam);
        }
        tegn();

        const ro = new ResizeObserver(() => {
          const w = el.clientWidth, h = el.clientHeight;
          if (!w || !h) return;
          renderer.setSize(w, h);
          kam.aspect = w / h;
          kam.updateProjectionMatrix();
        });
        ro.observe(el);

        scene.current = {
          settTekstur,
          settAuto: (pa) => { kontroll.autoRotate = pa; },
          nullstill: () => { kam.position.copy(start); kontroll.target.set(0, 0, 0); kontroll.update(); },
          fjern: () => {
            cancelAnimationFrame(ramme_);
            ro.disconnect();
            kontroll.dispose();
            geo.dispose(); ringGeo.dispose();
            matBak.dispose(); matRest.dispose(); ringMat.dispose();
            tekstur.dispose();
            sc.environment?.dispose();
            pmrem.dispose();
            renderer.dispose();
            renderer.domElement.remove();
          },
        };
        setStatus('klar');
      } catch (err) {
        if (avbrutt) return;
        setFeil(err instanceof Error ? err.message : 'Ukjent feil');
        setStatus('feil');
      }
    })();
    return () => {
      avbrutt = true;
      scene.current?.fjern();
      scene.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modellUrl, modellFilnavn, analyse]);

  useEffect(() => {
    scene.current?.settTekstur(printBilde, dekselHex);
  }, [printBilde, dekselHex, status]);

  return (
    <div className="relative mx-auto h-[60vh] max-h-[620px] min-h-[380px] w-full">
      <div ref={boks} className="absolute inset-0 cursor-grab active:cursor-grabbing" aria-label="3D-visning av dekselet" role="img" />
      {status === 'laster' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="studio-hud flex items-center gap-2"><span className="studio-prikk opptatt" /> Bygger 3D-modell …</div>
        </div>
      )}
      {status === 'feil' && (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <p className="text-sm text-red-300">Klarte ikke å vise 3D: {feil}</p>
        </div>
      )}
      {status === 'klar' && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap">
          <button type="button" className="studio-knapp !py-1.5 !text-xs" onClick={() => { const ny = !auto; setAuto(ny); scene.current?.settAuto(ny); }}>
            {auto ? 'Stopp rotasjon' : 'Roter automatisk'}
          </button>
          <button type="button" className="studio-knapp !py-1.5 !text-xs" onClick={() => scene.current?.nullstill()}>
            Se baksiden
          </button>
        </div>
      )}
    </div>
  );
}
