'use client';

/**
 * «Se i 3D» på produktsiden: viser 3D-fila (STL/3MF) som er lagt inn i admin.
 * three.js og fila lastes først når kunden trykker på knappen.
 */
import { useEffect, useRef, useState } from 'react';

type Scene3D = { settAuto: (pa: boolean) => void; nullstill: () => void; fjern: () => void };

/** Filene hentes én gang per side. */
const filer = new Map<string, Promise<Uint8Array>>();
function hentFil(url: string, fremdrift: (andel: number) => void) {
  let p = filer.get(url);
  if (!p) {
    p = (async () => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Fant ikke 3D-fila (${r.status}).`);
      const total = Number(r.headers.get('content-length')) || 0;
      if (!r.body || !total) return new Uint8Array(await r.arrayBuffer());
      const leser = r.body.getReader();
      const biter: Uint8Array[] = [];
      let lest = 0;
      for (;;) {
        const { done, value } = await leser.read();
        if (done) break;
        biter.push(value);
        lest += value.length;
        fremdrift(Math.min(1, lest / total));
      }
      const ut = new Uint8Array(lest);
      let o = 0;
      for (const b of biter) { ut.set(b, o); o += b.length; }
      return ut;
    })();
    p.catch(() => filer.delete(url));
    filer.set(url, p);
  }
  return p;
}

const cm = (mm: number) => (mm / 10).toFixed(1).replace('.', ',');

export function Produkt3D({ url, farge, navn }: { url: string; farge?: string | null; navn: string }) {
  const boks = useRef<HTMLDivElement>(null);
  const scene = useRef<Scene3D | null>(null);
  const [status, setStatus] = useState<'laster' | 'klar' | 'feil'>('laster');
  const [andel, setAndel] = useState(0);
  const [feil, setFeil] = useState('');
  const [auto, setAuto] = useState(true);
  const [str, setStr] = useState<[number, number, number] | null>(null);

  useEffect(() => {
    let avbrutt = false;
    setStatus('laster');
    setAndel(0);
    (async () => {
      try {
        const [THREE, { OrbitControls }, { RoomEnvironment }, { toCreasedNormals }, { les3dFil }, data] = await Promise.all([
          import('three'),
          import('three/examples/jsm/controls/OrbitControls.js'),
          import('three/examples/jsm/environments/RoomEnvironment.js'),
          import('three/examples/jsm/utils/BufferGeometryUtils.js'),
          import('@/lib/modell3d'),
          hentFil(url, (a) => { if (!avbrutt) setAndel(a); }),
        ]);
        if (avbrutt || !boks.current) return;
        const filnavn = decodeURIComponent(url.split('?')[0].split('/').pop() || 'modell.stl');
        const { posisjoner, storrelse } = les3dFil(data, filnavn);
        setStr(storrelse);

        let geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(posisjoner, 3));
        // myke kanter på vanlige modeller, flate trekanter på veldig store (raskere)
        if (posisjoner.length / 9 < 300_000) geo = toCreasedNormals(geo, (30 * Math.PI) / 180);
        else geo.computeVertexNormals();
        geo.computeBoundingSphere();
        const radius = geo.boundingSphere?.radius || 50;

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

        const fov = 32;
        const kam = new THREE.PerspectiveCamera(fov, el.clientWidth / el.clientHeight, radius / 50, radius * 40);
        const avstand = (radius / Math.sin((fov * Math.PI) / 360)) * 1.08;
        const start = new THREE.Vector3(0.55, 0.42, 0.72).normalize().multiplyScalar(avstand);
        kam.position.copy(start);

        const lys = new THREE.DirectionalLight(0xffffff, 1.5);
        lys.position.set(radius * 2, radius * 4, radius * 3);
        sc.add(lys);
        const motlys = new THREE.DirectionalLight(0xffffff, 0.5);
        motlys.position.set(-radius * 3, radius, -radius * 2);
        sc.add(motlys);
        sc.add(new THREE.AmbientLight(0xffffff, 0.25));

        const mat = new THREE.MeshStandardMaterial({ color: farge || '#2559C7', roughness: 0.55, metalness: 0 });
        const mesh = new THREE.Mesh(geo, mat);
        sc.add(mesh);

        // myk skygge under modellen
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const g = c.getContext('2d')!;
        const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, 'rgba(15,23,42,0.28)');
        grad.addColorStop(1, 'rgba(15,23,42,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 128, 128);
        const skyggeTekstur = new THREE.CanvasTexture(c);
        const skyggeGeo = new THREE.PlaneGeometry(1, 1);
        const skyggeMat = new THREE.MeshBasicMaterial({ map: skyggeTekstur, transparent: true, depthWrite: false });
        const skygge = new THREE.Mesh(skyggeGeo, skyggeMat);
        skygge.rotation.x = -Math.PI / 2;
        skygge.scale.set(Math.max(storrelse[0], storrelse[2]) * 1.5, Math.max(storrelse[0], storrelse[2]) * 1.5, 1);
        skygge.position.y = -storrelse[1] / 2 - 0.05;
        sc.add(skygge);

        const kontroll = new OrbitControls(kam, renderer.domElement);
        kontroll.enableDamping = true;
        kontroll.dampingFactor = 0.08;
        kontroll.enablePan = false;
        kontroll.minDistance = avstand * 0.3;
        kontroll.maxDistance = avstand * 2.5;
        kontroll.autoRotate = true;
        kontroll.autoRotateSpeed = 1.5;
        kontroll.addEventListener('start', () => { kontroll.autoRotate = false; setAuto(false); });

        let ramme = 0;
        const tegn = () => {
          ramme = requestAnimationFrame(tegn);
          kontroll.update();
          renderer.render(sc, kam);
        };
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
          settAuto: (pa) => { kontroll.autoRotate = pa; },
          nullstill: () => { kam.position.copy(start); kontroll.target.set(0, 0, 0); kontroll.update(); },
          fjern: () => {
            cancelAnimationFrame(ramme);
            ro.disconnect();
            kontroll.dispose();
            geo.dispose(); skyggeGeo.dispose();
            mat.dispose(); skyggeMat.dispose(); skyggeTekstur.dispose();
            sc.environment?.dispose();
            pmrem.dispose();
            renderer.dispose();
            renderer.domElement.remove();
          },
        };
        setStatus('klar');
      } catch (e) {
        if (avbrutt) return;
        setFeil(e instanceof Error ? e.message : 'Ukjent feil');
        setStatus('feil');
      }
    })();
    return () => {
      avbrutt = true;
      scene.current?.fjern();
      scene.current = null;
    };
  }, [url, farge]);

  return (
    <div className="absolute inset-0">
      <div ref={boks} className="absolute inset-0 cursor-grab active:cursor-grabbing" role="img" aria-label={`3D-modell av ${navn}`} />
      {status === 'laster' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="w-48 text-center">
            <p className="text-sm font-semibold text-ink-600">Laster 3D-modellen …</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
              <div className="h-full rounded-full bg-brand-600 transition-[width] duration-200" style={{ width: `${Math.max(6, andel * 100)}%` }} />
            </div>
          </div>
        </div>
      )}
      {status === 'feil' && (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <p className="text-sm font-medium text-red-600">Klarte ikke å vise 3D-modellen. {feil}</p>
        </div>
      )}
      {status === 'klar' && (
        <>
          {str && (
            <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-ink-700 shadow-sm backdrop-blur">
              {cm(str[0])} × {cm(str[2])} × {cm(str[1])} cm
            </span>
          )}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap">
            <button type="button" className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-ink-700 shadow-sm backdrop-blur hover:bg-white"
              onClick={() => { const ny = !auto; setAuto(ny); scene.current?.settAuto(ny); }}>
              {auto ? 'Stopp rotasjon' : 'Roter'}
            </button>
            <button type="button" className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-ink-700 shadow-sm backdrop-blur hover:bg-white"
              onClick={() => scene.current?.nullstill()}>
              Tilbakestill
            </button>
          </div>
          <p className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-ink-500">
            Dra for å snu · knip eller rull for å zoome
          </p>
        </>
      )}
    </div>
  );
}
