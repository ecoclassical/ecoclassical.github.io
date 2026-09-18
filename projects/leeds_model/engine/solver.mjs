// ---------------------------------------------------------------------------
// solver.mjs -- the iterated driver: R's Gauss-Seidel loop (tier 2) and the
// whole-horizon period driver (tier 3).
//
// Design: qmd/plans/2026-09-15-browser-engine-and-arm-registry-design.md, s3.5
// tiers 2 and 3.
//
// ---------------------------------------------------------------------------
// WHAT THIS FILE IS, AND WHAT IT DELIBERATELY IS NOT
//
// NOTHING here re-derives a model equation. The driver calls mvpModel() and
// applies R's stopping rule to what it returns. That separation is the whole
// reason tiers 2 and 3 are separable from tier 1: a disagreement is either
// leeds.mjs's arithmetic (tier 1 catches it) or this file's control flow.
// A driver that recomputed a model quantity would make tier 2 test itself.
//
// ---------------------------------------------------------------------------
// THE STOPPING RULE, TRANSCRIBED FROM model/run_model_2026.R:213-232
//
// The design (s3.5 item 2) describes it as "tolerance = 1e-06 on mean relative
// change". That is WRONG and the error is load-bearing. The R source is:
//
//     score <- 1
//     if (iter > 4) {
//       score <- abs((x.iter[, iter] - x.iter[, iter - 1]) / x.iter[, iter - 1])
//       score[is.na(score)] <- 0
//     }
//     score.iter[i, iter] <- ifelse(iter > 4, mean(score, na.rm = TRUE), NA_real_)
//     if (sum(score < para["tolerance"], na.rm = TRUE) == n &&
//         error < para["consistency.threshold"]) break
//
// `score` is a length-n VECTOR of per-variable relative changes. `mean(score)`
// goes only into the log. The break needs EVERY one of the n = 6713 variables
// below tolerance, CONJOINED with the bank-consistency residual.
//
// Measured 2026-09-17 (submitted / scenario 1, re-solved against the current
// model sources): at t = 50 the mean relative change at iteration 76 is
// 4.2e-10 -- six orders below the 1e-06 tolerance -- while TWO variables are
// still moving more than 1e-06 relative, so the criterion does not fire until
// iteration 77. A mean-based rule would have stopped around iteration 5 and
// land ~5e-07 away from R's answer. See log/session_20260917.md s10.1.
//
// The loop also cannot break before iteration 5, because `score <- 1` until
// `iter > 4` and sum(1 < 1e-06) == 0 != n.
//
// ---------------------------------------------------------------------------
// THE ITERATE AT THE TOP OF A PERIOD IS THE INITIAL STATE, NOT COLUMN i-1
//
// Also from the R source (run_model_2026.R:110-115): `sim` is allocated as
// `array(rep(initial$vars$value, times = nPeriods), ...)`, so EVERY column
// starts as the initial state. Nothing writes a column except the solve of that
// same period. So R's first iterate of period i is a COLD START.
//
// Measured 2026-09-17, and this is not a detail. Starting period 50 from
// column 49 instead -- which is what s3.5 item 2's wording ("give the JS engine
// the R run's column i-1") implies -- converges in 5 iterations (the earliest
// legal), lands 8.4e-07 away from R's column 50, and would be reported by a
// tier-2 harness as a port defect of ~1e-06 when it is the harness's own. The
// cold start reproduces R's column bit for bit: 0.000e+00 at t = 2, 50, 70 and
// 100. See log/session_20260917.md s10.2.
//
// ---------------------------------------------------------------------------
// Usage:  imported by web/test/run_tier2.mjs and web/test/run_tier3.mjs only.
// ---------------------------------------------------------------------------

import { mvpModel, Index, Params } from './leeds.mjs';
import * as K_ from './kernel.mjs';

const isFiniteArr = (a) => {
  const out = Float64Array.from(a);
  for (let i = 0; i < out.length; i++) if (!Number.isFinite(out[i])) out[i] = NaN;
  return out;
};

// ---------------------------------------------------------------------------
// The t = 1 markup calibration (run_model_2026.R:117-126)
// ---------------------------------------------------------------------------
//     foo <- (1 - sim["w", 1] / sim["pr", 1]) /
//            (1 + sim["kappa", 1] * rep(sim["delta", 1], each = K))
//     sim[zk.lab("mu"), ] <- foo / colSums(A.t[, , 1]) - 1
//
// Written to EVERY column, before the time loop, which is why the cold start
// carries it. `A0` must be the POST-production-scenario A sheet -- for the A
// sheet that is the raw workbook one, since production_scenarios edits only the
// B sheet.
export function calibrateMarkup({ stateValues, A0, index }) {
  const ix = index;
  const iw = ix.zk('w'), ipr = ix.zk('pr'), ikap = ix.zk('kappa');
  // delta is REGION-level (Z1_delta, not Z1_delta-1); R broadcasts it across
  // each region's industries with rep(..., each = K).
  const deltaRows = ix.z('delta');
  const K = ix.K, N = ix.N, nS = K * N;

  const deltaRep = K_.repEach(
    Float64Array.from(deltaRows, (r) => stateValues[r]), K
  );

  const foo = new Float64Array(nS);
  for (let j = 0; j < nS; j++) {
    foo[j] = (1 - stateValues[iw[j]] / stateValues[ipr[j]]) /
             (1 + stateValues[ikap[j]] * deltaRep[j]);
  }

  const colSums = A0.colSums();
  const mu = new Float64Array(nS);
  for (let j = 0; j < nS; j++) mu[j] = foo[j] / colSums[j] - 1;
  return { mu, rows: ix.zk('mu') };
}

// The cold-start column for period i >= 2: the initial state with the
// calibrated markup in place, and WITHOUT the five column-1 exogenous
// assignments (g, rb, rm, rl, rh), which run_model_2026.R writes to column 1
// only. Verified against the cached run's column 1 in tools/check_port.R.
export function coldStartColumn({ stateValues, mu, index, params }) {
  const ix = index;
  const P = params instanceof Params ? params : new Params(params);
  const col = Float64Array.from(stateValues);
  const rows = ix.zk('mu');
  for (let j = 0; j < rows.length; j++) col[rows[j]] = mu[j];
  return col;
}

// The five column-1 exogenous settings (run_model_2026.R:129-133). Note the
// asymmetry that makes this worth writing out rather than looping over a name
// list: `g` is set from the PARAMETER gg0, while the four rates are the
// column's `r_star` ADDED TO the column's `mu_*` -- all four of which are STATE
// variables, and none of which is a parameter.
//
// ⚠️ `mu_b` IS NOT `mu`. This read `P.z(muName, ...)` until 2026-09-17, when
// tier 3 found it by throwing "parameter not found: Z1_mu_b": the only
// parameters whose names contain "mu" are Z1_mu0/Z1_mu1/Z1_mu2, the markup
// curve, a different object entirely. Tiers 1 and 2 never called this function
// -- tier 2 builds its own start without the exogenous settings -- so the defect
// could not have been found before tier 3.
//
// R reads `sim[z.lab(...), i]`, i.e. the COLUMN. Neither `r_star` nor `mu_b` is
// written before this block, so reading the column and reading the initial state
// agree today; the column is read because that is what R reads, and it is what
// would stay correct if a future model change wrote either of them first.
export function applyColumn1Exogenous({ col, stateValues, index, params }) {
  const ix = index;
  const P = params instanceof Params ? params : new Params(params);

  const gRows = ix.z('g');
  const gg0 = P.z('gg0', ix.zlabs);
  for (let r = 0; r < gRows.length; r++) col[gRows[r]] = gg0[r];

  const rstarRows = ix.z('r_star');
  for (const [name, muName] of [['rb', 'mu_b'], ['rm', 'mu_m'], ['rl', 'mu_l'], ['rh', 'mu_h']]) {
    const rows = ix.z(name);
    const muRows = ix.z(muName);
    for (let r = 0; r < rows.length; r++) col[rows[r]] = col[rstarRows[r]] + col[muRows[r]];
  }
  return col;
}

// ---------------------------------------------------------------------------
// solvePeriod -- R's inner loop, for ONE period.
// ---------------------------------------------------------------------------
// Signature mirrors what R has at the top of the time loop: the converged
// lagged column, a starting column for the current one, the A matrix block
// (periods i-1 and i), B, and the parameters.
//
// Returns:
//   column     the column the loop stopped at (R's sim[, i])
//   A          the A slice R wrote to A.t[,,i] (== slice 1 of output$A.matrix)
//   iterations how many times mvpModel was called
//   broke      did the criterion fire, or did the loop hit max.iterations
//   error      the bank-consistency residual at the last iteration
//   scores     mean per-variable relative change per iteration, NaN where R
//              records NA (iterations 1-4, and anything after the break)
//   laggards   how many variables were still above tolerance at each iteration
export function solvePeriod({
  t, colPrev, colStart, Amat, Bmat, params, index, opts = {},
  maxIterations = null, tolerance = null, consistency = null,
}) {
  const ix = index;
  const n = ix.n;
  const nA = ix.K * ix.N * ix.K * ix.N;
  const P = params instanceof Params ? params : new Params(params);

  const tol = tolerance !== null ? tolerance : P.get('tolerance');
  const consT = consistency !== null ? consistency : P.get('consistency.threshold');
  const maxIter = maxIterations !== null ? maxIterations : (P.get('max.iterations') | 0);

  // The consistency residual's row set (run_model_2026.R:215-221). `or` has no
  // ported assignment -- both of its R assignments are commented out -- so its
  // second term is identically zero; it is computed anyway rather than dropped,
  // so that a future model change that reinstates `or` cannot pass unnoticed.
  const iCb = ix.at('Z1_b_cb'), iBs = ix.at('Z1_b_s'), iBb = ix.at('Z1_b_b');
  const iBsZ1 = ix.z('b_s_Z1'), iOr = ix.z('or');

  const Ain = Float64Array.from(Amat);
  const y = new Float64Array(2 * n);
  y.set(colPrev, 0);

  let cur = Float64Array.from(colStart);
  let stored = isFiniteArr(cur);
  let error = NaN;
  let broke = false;
  const scores = new Float64Array(maxIter).fill(NaN);
  const laggards = new Int32Array(maxIter).fill(-1);

  let iter = 0;
  for (iter = 1; iter <= maxIter; iter++) {
    y.set(cur, n);
    const res = mvpModel({ t, y, params: P, Amat: Ain, Bmat, index: ix, opts });

    // R: A.t[,, (i-1):i] <- output$A.matrix. Slice 1 comes back UNCHANGED
    // (mvpModel passes A_prev through), so the next iteration sees the same
    // lagged A -- the A recursion is a fixed point inside a period.
    Ain.set(res.A.subarray(nA, 2 * nA), nA);

    cur = Float64Array.from(res.y.subarray(n, 2 * n));

    // Consistency residual, from the RAW output (before the Inf -> NA mapping).
    const resid = cur[iCb] - (cur[iBs] - K_.sum(Float64Array.from(iBsZ1, (r) => cur[r])) - cur[iBb]);
    let orDiff = 0;
    for (let k = 0; k < iOr.length; k++) orDiff += cur[iOr[k]] - colPrev[iOr[k]];
    error = 0.5 * (resid * resid + orDiff * orDiff);

    // R: x.iter[is.infinite(x.iter[, iter]), iter] <- NA_real_
    const prevStored = stored;
    stored = isFiniteArr(cur);

    let above = 0;
    if (iter > 4) {
      let s = 0, cnt = 0;
      for (let k = 0; k < n; k++) {
        const a = stored[k], b = prevStored[k];
        let v = (a - b) / b;
        if (!Number.isFinite(v)) v = 0; else v = Math.abs(v);
        if (!(v < tol)) above++;
        s += v; cnt++;
      }
      scores[iter - 1] = s / cnt;
      laggards[iter - 1] = above;
      if (above === 0 && error < consT) { broke = true; break; }
    } else {
      scores[iter - 1] = NaN;
      laggards[iter - 1] = n;      // score == 1 everywhere: nothing is below tol
    }
  }

  return {
    column: cur,
    A: Ain.slice(nA),
    // `iter` has already been incremented past the last executed pass when the
    // loop runs to the cap, so a truncated period would otherwise report
    // maxIterations + 1 and inflate the count by one against R's.
    iterations: broke ? iter : maxIter,
    broke,
    error,
    scores,
    laggards,
  };
}

// ---------------------------------------------------------------------------
// runHorizon -- tier 3: the whole run, period by period, from the initial state.
// ---------------------------------------------------------------------------
// This is run_model_2026.R:99-247, and it carries the two things the per-period
// driver does not:
//
//   * A.t threads ACROSS periods. At period i the lagged A slice is the A that
//     period i-1's solve left in A.t[,,i-1], not A0.
//   * Every column starts at the cold start, so the per-period solve is exactly
//     the one R performed.
//
// `scenarioEdits` is a hook for the production-scenario B mutation, which is
// pre-run and lives in production_scenarios_2026.R; passing null runs the
// unshocked baseline. It is a hook rather than an implementation because the
// B mutation needs `sc` and the raw B SHEET, and getting either wrong would
// silently pin one scenario -- the failure export_model_state.R's B0 guard
// exists to prevent.
//
// The hook is NO LONGER the primary route: web/engine/bundle.mjs implements the
// pre-run (selector + B-sheet rewrite + product) and hands this function a
// finished A0/B0. The hook is kept for a caller that holds the raw sheets and
// wants the mutation expressed here instead.
//
// `A0` must be a Mat: `calibrateMarkup` calls `A0.colSums()`. The A that threads
// across periods is a RAW Float64Array (solvePeriod returns `r.A` in that form),
// so the two are held separately -- `A_sheet` for the calibration and `Acur`
// for the recursion. Writing `Apath.set(A, 0)` with a Mat would be a silent
// no-op: Float64Array.prototype.set reads `source.length`, and a Mat has none,
// so it copies nothing and throws nothing. That would leave the first period's
// A all zeros.
export function runHorizon({
  state, A0, B0, params, index, opts = {}, scenarioEdits = null, onPeriod = null,
}) {
  const ix = index;
  const n = ix.n;
  const nA = ix.K * ix.N * ix.K * ix.N;
  const P = params instanceof Params ? params : new Params(params);
  const nPeriods = P.get('nPeriods') | 0;

  let Bt = B0;
  let A_sheet = A0;
  if (scenarioEdits) {
    const out = scenarioEdits({ A: A0, B: B0, params: P, index: ix });
    if (out) { if (out.A) A_sheet = out.A; if (out.B) Bt = out.B; }
  }

  // sim: every column starts as the initial state (run_model_2026.R:110-115).
  const sim = new Float64Array(n * nPeriods);
  for (let i = 0; i < nPeriods; i++) sim.set(state, i * n);

  // Markup calibration, written to EVERY column. It reads the A SHEET, and on
  // a production shock that sheet is the POST-scenario one -- which is the
  // raw workbook sheet there, because production_scenarios edits only B.
  const { mu } = calibrateMarkup({ stateValues: state, A0: A_sheet, index: ix });
  const muRows = ix.zk('mu');
  for (let i = 0; i < nPeriods; i++) {
    const off = i * n;
    for (let j = 0; j < muRows.length; j++) sim[off + muRows[j]] = mu[j];
  }

  // Column 1's five exogenous settings. These go to COLUMN 1 ONLY and they are
  // NOT part of the starting iterate -- see below.
  const col1 = sim.subarray(0, n);
  applyColumn1Exogenous({ col: col1, stateValues: state, index: ix, params: P });

  // THE COLD START IS THE INITIAL STATE WITH mu, AND WITHOUT THE FIVE EXOG
  // SETTINGS. R's inner loop is `y = c(sim[, i-1], sim[, i])` with `sim[, i]`
  // still holding what the allocation put there -- the initial state with mu,
  // because `sim[z.lab("g"), i]` and its four siblings were written with i = 1
  // (run_model_2026.R:129-133). Taking the start from column 1 would carry the
  // exog values into every period. Measured by run_tier2.mjs, which reconstructs
  // this start and lands on R's converged column bit for bit.
  const cold = coldStartColumn({ stateValues: state, mu, index: ix, params: P });

  // A is threaded as a raw Float64Array across periods; `A_sheet` above is the
  // Mat the calibration needs. Slice 0 of `Amat` IS the lagged A; slice 1 is
  // unread (mvpModel passes A_prev through), so both are set to the same value.
  let Acur = A_sheet.d.slice();
  const iters = new Int32Array(nPeriods).fill(-1);
  const Apath = new Float64Array(nA * nPeriods);
  Apath.set(Acur, 0);

  const Bmat = Bt.d;
  const t0 = Date.now();
  for (let i = 2; i <= nPeriods; i++) {
    const lag = sim.subarray((i - 2) * n, (i - 1) * n);
    const Amat = new Float64Array(2 * nA);
    Amat.set(Acur, 0);
    Amat.set(Acur, nA);    // R passes A.t[,,(i-1):i]; slice 1 is unread (see note)

    const r = solvePeriod({
      t: i, colPrev: lag, colStart: cold, Amat, Bmat, params: P, index: ix, opts,
    });

    sim.set(r.column, (i - 1) * n);
    Acur = r.A;
    Apath.set(Acur, (i - 1) * nA);
    iters[i - 1] = r.iterations;
    if (onPeriod) onPeriod(i, r, i === nPeriods);
  }

  return { sim, A: Apath, iters, nPeriods, millis: Date.now() - t0, B: Bt, columnsSolved: nPeriods - 1 };
}

export { isFiniteArr };
