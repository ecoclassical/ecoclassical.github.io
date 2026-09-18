// ---------------------------------------------------------------------------
// loader-browser.mjs -- load an arm's exported bundle over HTTP.
//
// The browser cannot read the filesystem, so the seven files the bundle is made
// of are fetched and handed to `assembleBundle`, the SAME function
// web/engine/bundle.mjs's Node loader calls. Nothing about the bundle is
// validated here: the dims block, the spec block, the label count and the state
// length are all checked in assembleBundle, on both paths, so a page and a test
// cannot disagree about what a valid bundle is.
//
// Layout: the bundle directory holds, exactly as tools/export_model_state.R
// writes it --
//
//   index.json  labels.json  params.json  scenarios.json   (text)
//   state.bin   A.bin       B.bin                          (float64, little-endian)
//
// The binaries are read as ArrayBuffer and viewed as Float64Array. That is
// correct only on a little-endian host, which every browser this page targets
// is; index.json declares the layout as "column-major float64 little-endian"
// and the files carry no byte-order mark.
// ---------------------------------------------------------------------------

import { assembleBundle } from '../engine/bundle-core.mjs';

const get = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r;
};

export async function loadBundleBrowser(dir) {
  const text = async (f) => (await get(`${dir}/${f}`)).json();
  const bin = async (f) => new Float64Array(await (await get(`${dir}/${f}`)).arrayBuffer());

  const [meta, labels, params, scenarios, state, A, B] = await Promise.all([
    text('index.json'), text('labels.json'), text('params.json'), text('scenarios.json'),
    bin('state.bin'), bin('A.bin'), bin('B.bin'),
  ]);

  return assembleBundle({ dir, meta, labels, params, scenarios, state, A, B });
}
