// ---------------------------------------------------------------------------
// bundle-core.mjs -- the two bundle functions that are BROWSER-SAFE.
//
// Split out of bundle.mjs on 2026-09-17, after measurement. bundle.mjs carried a
// top-level `import { readFileSync } from 'node:fs'`, and a page cannot resolve
// that specifier: the module graph fails to instantiate, main.mjs never runs, and
// the page renders its static HTML and nothing else. Measured with
// `Google Chrome --headless=new --dump-dom` against a local server, which showed
// every module fetched with HTTP 200 and an empty status div -- the fetch
// succeeded, the instantiation did not.
//
// What is here: `assembleBundle`, which validates the seven files of an arm's
// bundle and returns the object the engine consumes, and `scenarioPreRun`, the
// port of run_or_load_shock + production_scenarios. Both are pure -- no
// filesystem, no globals -- so the Node loader and a web page can share them and
// neither can drift from the other.
//
// What is NOT here: reading the files. bundle.mjs does that for Node; a page
// does it in web/app/loader-browser.mjs. Both call assembleBundle, so the
// checks run on both paths.
// ---------------------------------------------------------------------------

import { Index, Params } from './leeds.mjs';
import * as K_ from './kernel.mjs';

// ---------------------------------------------------------------------------
// loadBundle -- the arm's exported initial state, nothing scenario-dependent.
// ---------------------------------------------------------------------------
// The bundle is written by tools/export_model_state.R. Its index.json carries
// the dimensions NESTED under "dims" (unlike the fixture index files, which are
// flat), and the arm's four spec switches, which mvpModel reads out of `opts`.
export function assembleBundle({ dir, meta, labels, params, scenarios, state, A, B }) {
  const dims = meta.dims;
  if (!dims) throw new Error(`${dir}/index.json carries no "dims" block`);

  const { n_vars: nVars, n_sectors: nS, sectors_per_region: K, regions: N } = dims;
  if (labels.length !== nVars) {
    throw new Error(`labels.json is ${labels.length} labels, index.json says ${nVars}`);
  }
  if (nS !== K * N) {
    throw new Error(`n_sectors ${nS} != sectors_per_region ${K} x regions ${N}`);
  }

  const spec = meta.spec;
  if (!spec || !spec.tar_spec || !spec.rec_spec || !spec.waste_spec) {
    throw new Error(`${dir}/index.json carries no complete "spec" block; regenerate the bundle`);
  }
  if (!spec.price_spec) {
    throw new Error(`${dir}/index.json has no price_spec; mvpModel must not default it`);
  }

  if (state.length !== nVars) {
    throw new Error(`state.bin is ${state.length} values, expected ${nVars}`);
  }

  const index = new Index(labels, K, N);

  return {
    dir,
    meta,
    dims,
    spec,
    labels,
    params,
    // The scenario table is read by mvpModel as a global in R
    // (MVP_model_2026.R:25); the engine has no globals, so it travels with the
    // bundle and is handed to the model through `opts.scenarios`.
    scenarios,
    state,
    index,
    nS,
    K,
    N,
    A_sheet: new K_.Mat(A, nS, nS),
    B_sheet: new K_.Mat(B, nS, nS),
  };
}


// ---------------------------------------------------------------------------
// scenarioPreRun -- the port of run_or_load_shock + production_scenarios.
// ---------------------------------------------------------------------------
// SHOCK 0 IS NOT IN THE TABLE. The baseline is run by run_or_load_baseline()
// (utils/run_utils.R:1-25), which sets NO selector at all: it calls run.model
// with the arm's parameters as they are loaded. So "scenario 0" means the arm's
// own params.json and an unedited B sheet, and it is an error for a row with
// shock = 0 to appear in the table -- a row would mean this function and R
// disagree about what the baseline is.
//
// The returned B0 is a Mat, because that is what runHorizon threads and what
// mvpModel consumes. `B_sheet` is returned too, separately and under its own
// name, so that the harness can compare the pre-run stage's OUTPUT against R's
// own post-edit sheet (run$initial$B.matrix) independently of the product.
export function scenarioPreRun({ bundle, shock }) {
  const { A_sheet, B_sheet, index, nS } = bundle;
  const params = { ...bundle.params };

  const selection = {
    requested: shock,
    shock: 0,
    rho: Number(params.rho),
    Z1_ce: Number(params.Z1_ce),
    Z2_ce: Number(params.Z2_ce),
    from: null,
    to: null,
    production_edit: false,
    table_row: null,
  };

  const matches = bundle.scenarios.filter((r) => Number(r.shock) === shock);

  if (shock === 0) {
    if (matches.length) {
      throw new Error(
        `scenario table names shock 0 (${matches.length} row(s)); the baseline is not a table entry`
      );
    }
  } else {
    // R: `if (nrow(sc_row) != 1) stop("shock id not unique or not found")`.
    if (matches.length !== 1) {
      throw new Error(`scenario ${shock} matches ${matches.length} rows of scenarios.csv, expected 1`);
    }
    const row = matches[0];
    selection.table_row = row;
    selection.shock = shock;
    params.shock = shock;

    // R: `rho_val <- as.numeric(sc_row$rho); if (!is.na(rho_val)) initial$pars['rho'] <- rho_val`
    const rv = Number(row.rho);
    if (Number.isFinite(rv)) {
      params.rho = rv;
      selection.rho = rv;
    }
  }

  const B = B_sheet.clone();

  if (params.shock > 6) {
    const row = selection.table_row;
    const rho = Number(params.rho);
    const from = Number(row.primary) - 1;      // R is 1-based; Mat is 0-based
    const to = Number(row.secondary) - 1;

    // R (production_scenarios_2026.R:22-24): `para[c("Z1_ce","Z2_ce")] <- c(1,0)`
    // -- and mvpModel reads `parms[z.lab("ce")]`, i.e. para's values, so the
    // engine's params carry the (1, 0) pair. Note this OVERWRITES whatever the
    // arm's workbook held (0, 0): on a production shock the Z1 block's
    // transition toward the target is switched on and Z2's is switched off.
    params.Z1_ce = 1;
    params.Z2_ce = 0;

    // R: B[from, ] <- 1 - rho
    //    ratio <- ifelse(A[to, ] == 0, 0, A[from, ] / A[to, ])
    //    B[to, ]   <- 1 + rho * ratio
    //
    // Two whole ROWS of the raw sheet, computed from the SHEET of A and not
    // from B. The `ratio` guard against a zero denominator is R's own and is
    // transcribed rather than replaced by a NaN, because a NaN would propagate
    // silently into the product and past every check downstream.
    for (let c = 0; c < nS; c++) {
      B.set(from, c, 1 - rho);
      const aFrom = A_sheet.get(from, c);
      const aTo = A_sheet.get(to, c);
      const ratio = aTo === 0 ? 0 : aFrom / aTo;
      B.set(to, c, 1 + rho * ratio);
    }

    selection.from = from + 1;
    selection.to = to + 1;
    selection.production_edit = true;
  }

  selection.Z1_ce = Number(params.Z1_ce);
  selection.Z2_ce = Number(params.Z2_ce);

  // R (run_model_2026.R:101-105): B0 <- matrix(unlist(B.matrix) * unlist(A.matrix), ...)
  // -- elementwise, over the whole sheet, and only NOW is the product formed.
  // The order matters and is the reason the sheets are exported separately.
  const B0 = A_sheet.mulE(B);

  return {
    state: bundle.state,
    index,
    A0: A_sheet,
    B_sheet: B,
    B0,
    params: new Params(params),
    selection,
    opts: { ...bundle.spec, scenarios: bundle.scenarios },
  };
}
