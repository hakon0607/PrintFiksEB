/**
 * Laster 3D-motoren (manifold) i nettleseren. Fila ligger i /public/deksel,
 * så den lastes bare når noen faktisk lager eller analyserer et deksel.
 */
import type { ManifoldToplevel } from 'manifold-3d';

let lasting: Promise<ManifoldToplevel> | null = null;

export function lastManifold(): Promise<ManifoldToplevel> {
  if (!lasting) {
    lasting = (async () => {
      const sti = '/deksel/manifold.js';
      const mod = await import(/* webpackIgnore: true */ sti);
      const wasm = (await mod.default({ locateFile: () => '/deksel/manifold.wasm' })) as ManifoldToplevel;
      wasm.setup();
      return wasm;
    })().catch((e) => {
      lasting = null;
      throw e;
    });
  }
  return lasting;
}
