/**
 * Lager 3D-modellen av pepperkakeformen i en egen tråd, så siden ikke fryser
 * mens en stor eller kronglete tegning regnes ut.
 */
import type { ManifoldToplevel } from 'manifold-3d';
import { lagPepperkakeform } from './modell';
import type { Form } from './sti';

type Jobb = { id: number; form: Form };

const arbeider = self as unknown as {
  location: { origin: string };
  onmessage: ((e: MessageEvent<Jobb>) => void) | null;
  postMessage: (data: unknown, overfor?: Transferable[]) => void;
};

let motor: Promise<ManifoldToplevel> | null = null;
function lastMotor() {
  if (!motor) {
    motor = (async () => {
      const base = arbeider.location.origin;
      const mod = await import(/* webpackIgnore: true */ `${base}/deksel/manifold.js`);
      const wasm = (await mod.default({ locateFile: () => `${base}/deksel/manifold.wasm` })) as ManifoldToplevel;
      wasm.setup();
      return wasm;
    })().catch((e) => {
      motor = null;
      throw e;
    });
  }
  return motor;
}

arbeider.onmessage = async (e) => {
  const { id, form } = e.data;
  try {
    const wasm = await lastMotor();
    const { nett, volum } = lagPepperkakeform(wasm, form);
    arbeider.postMessage({ id, nett, volum }, [nett.punkter.buffer, nett.trekanter.buffer]);
  } catch (err) {
    arbeider.postMessage({ id, feil: err instanceof Error ? err.message : String(err) });
  }
};
