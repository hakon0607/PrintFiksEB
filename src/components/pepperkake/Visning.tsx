'use client';

/**
 * 3D-visning av pepperkakeformen – hvit, med flensen opp og skjærekanten ned,
 * slik den ligger når man trykker den ned i deigen. three.js lastes bare her.
 */
import { useEffect, useRef, useState } from 'react';
import type { Nett } from '@/lib/pepperkake/modell';
import { PROFIL } from '@/lib/pepperkake/modell';

type Scene3D = { settAuto: (pa: boolean) => void; nullstill: () => void; fjern: () => void };

export function PepperkakeVisning({ nett }: { nett: Nett }) {
  const boks = useRef<HTMLDivElement>(null);
  const scene = useRef<Scene3D | null>(null);
  const [status, setStatus] = useState<'laster' | 'klar' | 'feil'>('laster');
  const [feil, setFeil] = useState('');
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    let avbrutt = false;
    setStatus('laster');
    (async () => {
      try {
        const [THREE, { OrbitControls }, { RoomEnvironment }, { toCreasedNormals }] = await Promise.all([
          import('three'),
          import('three/examples/jsm/controls/OrbitControls.js'),
          import('three/examples/jsm/environments/RoomEnvironment.js'),
          import('three/examples/jsm/utils/BufferGeometryUtils.js'),
        ]);
        if (avbrutt || !boks.current) return;

        /* print (x, y, z) → visning (x, H − z, y): flensen opp, tegningen sett ovenfra */
        const P = nett.punkter, T = nett.trekanter;
        const pos = new Float32Array(T.length * 3);
        for (let k = 0; k < T.length; k++) {
          const i = T[k] * 3;
          pos[k * 3] = P[i];
          pos[k * 3 + 1] = PROFIL.hoyde - P[i + 2];
          pos[k * 3 + 2] = P[i + 1];
        }
        let geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo = toCreasedNormals(geo, (40 * Math.PI) / 180);
        geo.computeBoundingBox();
        const midt = geo.boundingBox!.getCenter(new THREE.Vector3());
        geo.translate(-midt.x, -midt.y, -midt.z);
        const str = geo.boundingBox!.getSize(new THREE.Vector3());
        const storst = Math.max(str.x, str.z, 30);

        const el = boks.current;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.setSize(el.clientWidth, el.clientHeight);
        renderer.toneMapping = THREE.NeutralToneMapping;
        renderer.toneMappingExposure = 0.9;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        el.appendChild(renderer.domElement);
        renderer.domElement.style.touchAction = 'none';

        const sc = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        sc.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        const kam = new THREE.PerspectiveCamera(30, el.clientWidth / el.clientHeight, 1, 4000);
        const avstand = (storst / 2 / Math.tan((30 * Math.PI) / 360)) * 1.45;
        const start = new THREE.Vector3(0, avstand * 0.78, avstand * 0.62);
        kam.position.copy(start);

        const lys = new THREE.DirectionalLight(0xffffff, 1.3);
        lys.position.set(80, 200, 120);
        sc.add(lys);
        const kant = new THREE.DirectionalLight(0x67e8f9, 0.6);
        kant.position.set(-160, 60, -140);
        sc.add(kant);
        sc.add(new THREE.AmbientLight(0xffffff, 0.2));

        const mat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
        const mesh = new THREE.Mesh(geo, mat);
        sc.add(mesh);

        // lys ring på «bordet» under formen
        const ringGeo = new THREE.RingGeometry(storst * 0.58, storst * 0.6, 120);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -str.y / 2 - 0.5;
        sc.add(ring);

        const kontroll = new OrbitControls(kam, renderer.domElement);
        kontroll.enableDamping = true;
        kontroll.dampingFactor = 0.08;
        kontroll.enablePan = false;
        kontroll.minDistance = avstand * 0.3;
        kontroll.maxDistance = avstand * 2.2;
        kontroll.autoRotate = true;
        kontroll.autoRotateSpeed = 1.4;
        kontroll.addEventListener('start', () => { kontroll.autoRotate = false; setAuto(false); });

        let ramme = 0;
        const t0 = performance.now();
        function tegn() {
          ramme = requestAnimationFrame(tegn);
          kontroll.update();
          ringMat.opacity = 0.2 + 0.12 * Math.sin((performance.now() - t0) / 700);
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
          settAuto: (pa) => { kontroll.autoRotate = pa; },
          nullstill: () => { kam.position.copy(start); kontroll.target.set(0, 0, 0); kontroll.update(); },
          fjern: () => {
            cancelAnimationFrame(ramme);
            ro.disconnect();
            kontroll.dispose();
            geo.dispose(); ringGeo.dispose();
            mat.dispose(); ringMat.dispose();
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
  }, [nett]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[620px]">
      <div ref={boks} className="absolute inset-0 cursor-grab active:cursor-grabbing" aria-label="3D-visning av pepperkakeformen" role="img" />
      {status === 'laster' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="studio-hud flex items-center gap-2"><span className="studio-prikk opptatt" /> Viser 3D …</div>
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
            Tilbakestill
          </button>
        </div>
      )}
    </div>
  );
}
