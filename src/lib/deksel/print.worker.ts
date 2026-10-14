/**
 * Fargeberegningen for printbildet (posterisering + opprydding) i en egen tråd,
 * så skjermen ikke fryser et halvt sekund på mobil hver gang du slipper et lag.
 */
import { posteriser } from './farger';

type Jobb = { id: number; rgba: Uint8ClampedArray; W: number; H: number; hex: string[]; maske: Uint8Array; skala: number };

const arbeider = self as unknown as {
  onmessage: ((e: MessageEvent<Jobb>) => void) | null;
  postMessage: (data: unknown, overfor?: Transferable[]) => void;
};

arbeider.onmessage = (e) => {
  const { id, rgba, W, H, hex, maske, skala } = e.data;
  const kart = posteriser(rgba, W, H, hex, maske, skala);
  arbeider.postMessage({ id, kart }, [kart.buffer]);
};
