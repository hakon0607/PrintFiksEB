/**
 * Lager 3D-modellen i nettleseren – i en egen tråd når det går, ellers direkte.
 * Brukes både i tegnestudioet (3D-visning) og i admin (last ned STL).
 */
import { lastManifold } from '@/lib/deksel/manifold-nettleser';
import { lagPepperkakeform, type Nett } from './modell';
import type { Form } from './sti';

type Svar = { id: number; nett?: Nett; volum?: number; feil?: string };

let arbeider: Worker | null = null;
let teller = 0;
const venter = new Map<number, { ok: (r: { nett: Nett; volum: number }) => void; feil: (e: Error) => void }>();

function hentArbeider(): Worker | null {
  if (arbeider) return arbeider;
  try {
    const w = new Worker(new URL('./modell.worker.ts', import.meta.url));
    w.onmessage = (e: MessageEvent<Svar>) => {
      const j = venter.get(e.data.id);
      if (!j) return;
      venter.delete(e.data.id);
      if (e.data.nett) j.ok({ nett: e.data.nett, volum: e.data.volum ?? 0 });
      else j.feil(new Error(e.data.feil || 'Klarte ikke å lage modellen.'));
    };
    w.onerror = () => {
      // tråden døde – prøv resten direkte
      const igjen = [...venter.values()];
      venter.clear();
      arbeider = null;
      w.terminate();
      for (const j of igjen) j.feil(new Error('arbeider'));
    };
    arbeider = w;
    return w;
  } catch {
    return null;
  }
}

async function direkte(form: Form) {
  const wasm = await lastManifold();
  return lagPepperkakeform(wasm, form);
}

/** Lager modellen av formen (punkter i mm). */
export async function byggPepperkakeform(form: Form): Promise<{ nett: Nett; volum: number }> {
  const w = hentArbeider();
  if (!w) return direkte(form);
  const id = ++teller;
  try {
    return await new Promise((ok, feil) => {
      venter.set(id, { ok, feil });
      w.postMessage({ id, form });
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'arbeider') return direkte(form);
    throw e;
  }
}
