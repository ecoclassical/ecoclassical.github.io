// ---------------------------------------------------------------------------
// bundle.mjs -- loading an arm's exported bundle under Node.
//
// ⚠️ THIS MODULE IS NOT BROWSER-SAFE: it imports node:fs at the top level, which
// a page cannot resolve. The browser imports `bundle-core.mjs` (assembleBundle,
// scenarioPreRun) and fetches the same bytes through web/app/loader-browser.mjs.
// See that file's header and bundle-core.mjs's for the measurement that forced
// the split on 2026-09-17.
//
// The two exported functions are re-exported below so every Node caller -- the
// three tier runners and web/test/run_page_smoke.mjs -- keeps importing them from
// here, unchanged.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { assembleBundle } from './bundle-core.mjs';

export { assembleBundle, scenarioPreRun } from './bundle-core.mjs';

const f64 = (p) => {
  const b = readFileSync(p);
  return new Float64Array(b.buffer, b.byteOffset, b.byteLength / 8);
};
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

// ---------------------------------------------------------------------------
// loadBundle -- the Node half: read the arm's directory, then assemble.
// ---------------------------------------------------------------------------
// The assembly is split out (2026-09-17) so the BROWSER can load the same arm
// without a second copy of the checks. A page cannot read the filesystem, so it
// fetches the seven files and calls assembleBundle itself -- see
// web/app/loader-browser.mjs. Every validation below is unchanged and still
// reached on both paths; the only difference between them is how the bytes
// arrive.
export function loadBundle(dir) {
  return assembleBundle({
    dir,
    meta: json(`${dir}/index.json`),
    labels: json(`${dir}/labels.json`),
    params: json(`${dir}/params.json`),
    scenarios: json(`${dir}/scenarios.json`),
    state: f64(`${dir}/state.bin`),
    A: f64(`${dir}/A.bin`),
    B: f64(`${dir}/B.bin`),
  });
}

