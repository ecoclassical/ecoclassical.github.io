// ---------------------------------------------------------------------------
// main.mjs -- the page: controls, one run, one chart, CSV.
//
// The computation lives in driver.mjs, which is also what
// web/test/run_page_smoke.mjs drives under Node. Nothing arithmetic is done
// here: this file reads the controls, calls the driver, and draws.
//
// DEFAULT ARM IS `revised` (design s5, decided 2026-09-16). The page therefore
// opens on the corrected indices while the manuscript under review reports the
// `submitted` arm -- which is why index.html carries the note above the
// controls, and why the two arms are both shipped. Switching between them IS
// the finding; the page's job is to make that visible rather than to hide it.
//
// Deep link: everything is settable from the hash, so a scenario can be linked:
//   index.html#arm=revised&scenario=13&var=Z1_va_g&inst=32
// `&autorun=1` runs it on load. This is also how the headless check drives the
// page, since a headless browser cannot click.
// ---------------------------------------------------------------------------

import { loadBundleBrowser } from './loader-browser.mjs';
import { runScenario, families, series, csvOf } from './driver.mjs';

const $ = (id) => document.getElementById(id);
const DEFAULT_ARM = 'revised';
const ENGINE = new URL('../engine/', import.meta.url).href.replace(/\/$/, '');

const state = {
  arms: [], arm: null, bundle: null, rev: null,
  families: [], family: null, instance: null,
  base: null, scen: null, baseMs: 0, scenMs: 0, vLabel: null,
};

const params = new URLSearchParams(location.hash.replace(/^#/, ''));

function setStatus(text) { $('status').textContent = text; }

function hashOf() {
  const p = new URLSearchParams();
  p.set('arm', state.arm);
  p.set('scenario', $('scenario').value);
  if (state.family) p.set('var', state.family.key);
  if (state.instance != null) p.set('inst', String(state.instance));
  p.set('rho', $('rho').value);
  p.set('tshock', $('tshock').value);
  return `#${p.toString()}`;
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
async function loadArms() {
  const r = await fetch(`${ENGINE}/../arms.json`);
  if (!r.ok) throw new Error(`arms.json: HTTP ${r.status}`);
  state.arms = await r.json();
  const sel = $('arm');
  sel.innerHTML = '';
  for (const a of state.arms) {
    const o = document.createElement('option');
    o.value = a.arm;
    o.textContent = a.label;
    sel.appendChild(o);
  }
  const want = params.get('arm') || DEFAULT_ARM;
  sel.value = state.arms.some((a) => a.arm === want) ? want : state.arms[0].arm;
}

async function loadArm(arm) {
  setStatus(`Loading the ${arm} arm…`);
  state.arm = arm;
  state.bundle = await loadBundleBrowser(`${ENGINE}/state/${arm}`);
  state.rev = families(state.bundle);
  state.families = [...state.rev.values()].filter((f) => f.instances.length);

  const meta = state.arms.find((a) => a.arm === arm);
  $('armdetail').textContent = meta && meta.note ? ` — ${meta.note}` : '';

  // Scenarios: the baseline plus every row of the table, by display name.
  const sc = $('scenario');
  sc.innerHTML = '';
  for (const s of [{ shock: 0, display_name: 'Baseline (no scenario)' }, ...state.bundle.scenarios]) {
    const o = document.createElement('option');
    o.value = String(s.shock);
    o.textContent = `Scenario ${s.shock} — ${String(s.display_name).replace(/^Scenario \d+ \| /, '')}`
      .replace('Scenario 0 — Baseline (no scenario)', 'Baseline (no scenario)');
    sc.appendChild(o);
  }
  const wantS = params.get('scenario');
  if (wantS && [...sc.options].some((o) => o.value === wantS)) sc.value = wantS;

  // Variable picker: the family list, filtered by the search box.
  const filt = $('famfilter');
  filt.value = '';
  const fillFams = () => {
    const q = filt.value.trim().toLowerCase();
    const sel = $('fam');
    sel.innerHTML = '';
    for (const f of state.families) {
      if (q && !f.key.toLowerCase().includes(q)) continue;
      const o = document.createElement('option');
      o.value = f.key;
      o.textContent = `${f.key} (${f.instances.length})`;
      sel.appendChild(o);
    }
    if (!sel.options.length) { const o = document.createElement('option'); o.textContent = 'no match'; o.value = ''; sel.appendChild(o); }
    const wantV = params.get('var');
    if (wantV && [...sel.options].some((o) => o.value === wantV)) sel.value = wantV;
    pickFamily();
  };
  filt.oninput = fillFams;
  $('fam').onchange = () => pickFamily();
  $('inst').onchange = () => { state.instance = Number($('inst').value); };

  // rho and t.shock defaults: the model's own, then the selected scenario's row.
  $('rho').max = '0.5';
  $('rho').step = '0.05';
  $('tshock').value = String(state.bundle.params['t.shock']);
  $('rho').oninput = () => { $('rhoval').textContent = `= ${$('rho').value}`; };
  $('scenario').onchange = () => { syncRho(); draw(); };

  fillFams();
  syncRho();
  $('csv').disabled = true;
  $('chart').innerHTML = '';
  setStatus(`Loaded ${arm}: ${state.bundle.labels.length.toLocaleString()} variables, `
    + `${state.bundle.scenarios.length} scenarios, ${state.bundle.params.nPeriods} periods. `
    + `Choose a variable and press Run.`);
}

function syncRho() {
  const shock = Number($('scenario').value);
  const row = state.bundle.scenarios.find((r) => Number(r.shock) === shock);
  const rho = row ? Number(row.rho) : Number(state.bundle.params.rho);
  $('rho').value = String(rho);
  $('rhoval').textContent = `= ${rho}`;
}

function pickFamily() {
  const sel = $('fam');
  const f = sel.value ? state.rev.get(sel.value) : null;
  state.family = f;
  const inst = $('inst');
  inst.innerHTML = '';
  if (!f) { state.instance = null; return; }
  for (const it of f.instances) {
    const o = document.createElement('option');
    o.value = String(it.i == null ? 0 : it.i);
    o.textContent = it.i == null ? `—` : `sector ${it.i}`;
    inst.appendChild(o);
  }
  const wantI = params.get('inst');
  if (wantI && [...inst.options].some((o) => o.value === wantI)) inst.value = wantI;
  state.instance = inst.options.length ? Number(inst.value) : null;
}

function chosenLabel() {
  if (!state.family) return null;
  const f = state.family;
  const it = f.instances.find((x) => x.i === state.instance) || f.instances[0];
  return it.label;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------
async function run() {
  const shock = Number($('scenario').value);
  const rho = Number($('rho').value);
  const tShock = Number($('tshock').value);
  const label = chosenLabel();
  if (!label) { setStatus('Choose a variable first.'); return; }

  const v = state.bundle.labels.indexOf(label);
  const n = state.bundle.index.n;
  $('run').disabled = true;
  $('csv').disabled = true;

  try {
    setStatus(`Running the baseline…`);
    let t0 = Date.now();
    state.base = runScenario({ bundle: state.bundle, shock: 0, rho: shock === 0 ? rho : null, tShock });
    state.baseMs = Date.now() - t0;

    setStatus(`Running scenario ${shock}…`);
    t0 = Date.now();
    state.scen = runScenario({ bundle: state.bundle, shock, rho, tShock });
    state.scenMs = Date.now() - t0;
    state.vLabel = label;
  } catch (err) {
    setStatus(`ERROR: ${err.message}`);
    $('run').disabled = false;
    return;
  }

  const a = series(state.base.run, n, v);
  const b = series(state.scen.run, n, v);
  const finite = (s) => { for (const x of s) if (!Number.isFinite(x)) return false; return true; };

  draw(state.base, state.scen, a, b, label, tShock);
  $('csv').disabled = !(finite(a) && finite(b));
  $('run').disabled = false;

  const iters = (r) => { let s = 0, c = 0; for (const i of r.iters) { if (i > 0) { s += i; } if (i >= state.bundle.meta.solver.max_iterations) c++; } return `${s} (${c} at the cap)`; };
  const sel = state.scen.pre.selection;
  const lines = [
    `${label}  ·  arm ${state.arm}  ·  scenario ${shock}  ·  rho ${sel.rho}  ·  t.shock ${state.scen.pre.params.get('t.shock')}`,
    `baseline ${(state.baseMs / 1000).toFixed(1)} s (${state.base.run.columnsSolved} columns, ${iters(state.base.run)} iterations)`,
    `scenario ${(state.scenMs / 1000).toFixed(1)} s (${state.scen.run.columnsSolved} columns, ${iters(state.scen.run)} iterations)` +
      (sel.production_edit ? `  ·  sheet rows ${sel.from}->${sel.to}` : '') +
      `  ·  ce pair (${sel.Z1_ce}, ${sel.Z2_ce})`,
    finite(a) && finite(b)
      ? `final t=100: baseline ${a[a.length - 1].toPrecision(8)}, scenario ${b[b.length - 1].toPrecision(8)}`
      : `NON-FINITE values present: this configuration does not converge`,
  ];
  setStatus(lines.join('\n'));
}

// ---------------------------------------------------------------------------
// The chart
// ---------------------------------------------------------------------------
function draw(base, scen, a, b, label, tShock) {
  const W = 940, H = 340, m = { t: 14, r: 14, b: 34, l: 74 };
  const nP = a.length;
  let lo = Infinity, hi = -Infinity;
  for (const s of [a, b]) for (const x of s) if (Number.isFinite(x)) { if (x < lo) lo = x; if (x > hi) hi = x; }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) { lo = 0; hi = 1; }
  const pad = (hi - lo) * 0.06;
  lo -= pad; hi += pad;
  const X = (i) => m.l + (i / (nP - 1)) * (W - m.l - m.r);
  const Y = (v) => H - m.b - ((v - lo) / (hi - lo)) * (H - m.t - m.b);
  const path = (s) => s.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const ticks = 5;
  let g = '';
  for (let k = 0; k <= ticks; k++) {
    const v = lo + (k / ticks) * (hi - lo), y = Y(v);
    g += `<line x1="${m.l}" y1="${y.toFixed(1)}" x2="${W - m.r}" y2="${y.toFixed(1)}" stroke="#eef1f4"/>`
      + `<text x="${m.l - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#5b6470">${fmtNum(v)}</text>`;
  }
  const t0 = Math.max(1, Math.min(nP, tShock));
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">
    ${g}
    <line x1="${m.l}" y1="${H - m.b}" x2="${W - m.r}" y2="${H - m.b}" stroke="#c9ced5"/>
    <line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${H - m.b}" stroke="#c9ced5"/>
    <line x1="${X(t0 - 1).toFixed(1)}" y1="${m.t}" x2="${X(t0 - 1).toFixed(1)}" y2="${H - m.b}"
          stroke="#c9ced5" stroke-dasharray="4 4"/>
    <text x="${(X(t0 - 1) + 5).toFixed(1)}" y="${m.t + 12}" font-size="11" fill="#5b6470">t.shock = ${t0}</text>
    <path d="${path(a)}" fill="none" stroke="#9aa3ad" stroke-width="1.6"/>
    <path d="${path(b)}" fill="none" stroke="#1f5f8b" stroke-width="1.9"/>
    <text x="${(W - m.r)}" y="${H - 8}" text-anchor="end" font-size="11" fill="#5b6470">period t</text>
  </svg>`;
  $('chart').innerHTML = svg;
  $('legbase').textContent = `Baseline (${fmtNum(a[a.length - 1])} at t=100)`;
  $('legscen').textContent = `Scenario ${$('scenario').value} (${fmtNum(b[b.length - 1])} at t=100)`;
}

const fmtNum = (v) => {
  const a = Math.abs(v);
  if (!Number.isFinite(v)) return 'n/a';
  if (a >= 1e5 || (a > 0 && a < 1e-3)) return v.toExponential(2);
  return v.toFixed(a >= 100 ? 0 : a >= 10 ? 1 : 3);
};

function downloadCsv() {
  if (!state.base || !state.scen) return;
  const n = state.bundle.index.n;
  const label = state.vLabel;
  const a = series(state.base.run, n, state.bundle.labels.indexOf(label));
  const b = series(state.scen.run, n, state.bundle.labels.indexOf(label));
  const csv = csvOf({ labelsIn: [label], base: [a], shock: [b] });
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const el = document.createElement('a');
  el.href = url;
  el.download = `leeds_${state.arm}_scenario${$('scenario').value}_${label.replace(/[^\w.-]/g, '_')}.csv`;
  el.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
$('run').onclick = run;
$('csv').onclick = downloadCsv;
$('arm').onchange = async (e) => {
  try { await loadArm(e.target.value); } catch (err) { setStatus(`ERROR: ${err.message}`); }
  history.replaceState(null, '', hashOf());
};

(async () => {
  try {
    await loadArms();
    await loadArm($('arm').value);
    if (params.get('autorun')) await run();
  } catch (err) {
    setStatus(`ERROR ON LOAD: ${err.message}`);
  }
})();
