// ---------------------------------------------------------------------------
// driver.mjs -- one scenario run, the way the acceptance test runs it.
//
// This file is the only place the page decides how to drive the engine, and it
// is deliberately the same sequence web/test/run_tier3.mjs uses, so the run the
// page shows is the run the acceptance test covers:
//
//     scenarioPreRun({ bundle, shock })            the selector + the sheet edit
//     runHorizon({ state, A0, B0, params, index, opts })
//
// The two live controls the design's s5 sketch asks for (rho and t.shock) are
// applied by patching what the PRE-RUN READS, never by editing its output:
//
//   rho      is what production_scenarios uses to write the sheet -- R sets
//            B[from,] <- 1 - rho and B[to,] <- 1 + rho * ratio
//            (production_scenarios_2026.R:22-24). So the override replaces the
//            scenario row's own rho in the table, which both the row lookup and
//            opts.scenarios read. Editing the finished B0 instead would leave
//            the sheet and the parameter vector disagreeing about the same
//            shock, which is a state no R run ever passes through.
//   t.shock  is read by the model out of the parameter vector, so it is set
//            before the pre-run and travels in through Params.
//
// Both defaults are "do nothing": with no override the run is bit-for-bit the
// one tools/check_port.R generates fixtures for.
// ---------------------------------------------------------------------------

import { scenarioPreRun } from '../engine/bundle-core.mjs';
import { runHorizon } from '../engine/solver.mjs';

export function runScenario({ bundle, shock, rho = null, tShock = null, onPeriod = null }) {
  const scenarios = rho == null
    ? bundle.scenarios
    : bundle.scenarios.map((r) => (Number(r.shock) === shock ? { ...r, rho } : r));

  // rho has TWO homes and both are patched. For a production scenario (> 6) the
  // pre-run sets params.rho from the ROW and writes the sheet with it; for the
  // demand scenarios (1-6) the row sets params.rho and the shift itself is
  // applied inside the model, which reads rho from the parameter vector; the
  // baseline (0) has no row at all, so the parameter vector is the only route.
  let params = bundle.params;
  if (tShock != null || (rho != null && shock === 0)) {
    params = { ...params };
    if (tShock != null) params['t.shock'] = tShock;
    if (rho != null && shock === 0) params.rho = rho;
  }

  const b = (scenarios === bundle.scenarios && params === bundle.params)
    ? bundle
    : { ...bundle, scenarios, params };

  const pre = scenarioPreRun({ bundle: b, shock });
  const t0 = Date.now();
  const run = runHorizon({
    state: b.state,
    A0: pre.A0,
    B0: pre.B0,
    params: pre.params,
    index: pre.index,
    opts: pre.opts,
    onPeriod,
  });

  return { pre, run, millis: Date.now() - t0 };
}

// ---------------------------------------------------------------------------
// The label -> column mapping, for the page's variable picker.
// ---------------------------------------------------------------------------
// The 6,713 labels have two shapes (design s3.2): an indexed, region-prefixed
// one -- `Z1_va_g-11` -- and a global one with neither prefix nor index --
// `temp`. A "family" here is the label with its index stripped, keeping the
// region prefix, so `Z1_va_g` is one entry spanning 54 sector instances. The
// page plots a single label, chosen as family + instance; it does not aggregate,
// because any aggregation would be a measure this project has not defined
// anywhere else.
export function families(bundle) {
  const out = new Map();
  for (let v = 0; v < bundle.labels.length; v++) {
    const lab = bundle.labels[v];
    const m = /^(?:Z(\d+)_)?(.*?)(?:-(\d+))?$/.exec(lab);
    const key = (m[1] ? `Z${m[1]}_` : '') + m[2];
    if (!out.has(key)) {
      out.set(key, { key, region: m[1] ? Number(m[1]) : null, name: m[2], instances: [] });
    }
    out.get(key).instances.push({ label: lab, i: m[3] ? Number(m[3]) : null, v });
  }
  return out;
}

// Column i of the run occupies sim[i*n .. i*n+n), local[:] = the initial state
// (run_model_2026.R:110-115), so a variable's path is strided, not contiguous.
//
// ⚠️ TWO DIFFERENT `n`s LIVE HERE AND CONFLATING THEM COSTS A SILENT NaN.
// `stride` is the number of variables in one period -- bundle.index.n, 6,713 --
// and is what separates consecutive periods. The RETURNED ARRAY IS ONE VALUE PER
// PERIOD, so its length is run.nPeriods (100), not `stride`. Callers iterating
// to `stride` read past the end, get `undefined`, and produce NaN; a `Math.max`
// accumulates that NaN, while a `NaN > x` comparison silently drops it. The
// parameter is named `stride` for that reason.
export function series(run, stride, v) {
  const out = new Float64Array(run.nPeriods);
  for (let i = 0; i < run.nPeriods; i++) out[i] = run.sim[i * stride + v];
  return out;
}

export function csvOf({ labelsIn, base, shock }) {
  const nP = base[0].length;
  const head = ['t', ...labelsIn.map((l) => `${l} (baseline)`), ...labelsIn.map((l) => `${l} (scenario)`)];
  const rows = [head.join(',')];
  for (let i = 0; i < nP; i++) {
    const r = [String(i + 1)];
    for (const s of base) r.push(String(s[i]));
    for (const s of shock) r.push(String(s[i]));
    rows.push(r.join(','));
  }
  return rows.join('\n');
}
