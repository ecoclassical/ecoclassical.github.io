// ---------------------------------------------------------------------------
// leeds.mjs -- the JavaScript port of model/MVP_model_2026.R.
//
// Design: qmd/plans/2026-09-15-browser-engine-and-arm-registry-design.md, s3.
// Acceptance: tools/check_port.R (fixtures) + web/test/run_tier1.mjs (compare).
//
// ---------------------------------------------------------------------------
// STATUS: TIER 1 COMPLETE (2026-09-17). TIERS 2 AND 3 NOT YET MEASURED.
//
// Every variable family the model moves is now ported. On arm `submitted`,
// scenario 7, across all 99 periods: 133 families claimed, 128 exact at 1e-12
// relative, 5 cancellation-limited within their declared absolute bounds, 0
// upstream-limited, 0 failing, and the A-matrix recursion bit-identical
// (deviation exactly 0) at every period. There are no pass-through families
// left that R moves.
//
// The port proceeded block by block against a working acceptance test rather
// than in one pass. Every variable started as a PASS-THROUGH of its input
// value; a ported block overwrote its own variables, and tier 1 localised each
// disagreement to the block that caused it. That scaffolding is kept because it
// is how any future model change will be re-ported.
//
// ⚠️ TIER 1 IS ONE EVALUATION, NOT A RUN. It feeds the engine the exact inputs R
// gave mvp.model and compares one returned vector. It does NOT establish that
// iterating the engine to convergence reaches R's fixed point (tier 2), nor
// that a whole 99-period run tracks R's (tier 3). DO NOT use this engine for
// results until those two bands are measured and written into the design's
// s3.5.
// ---------------------------------------------------------------------------
//
// THE ORDER OF STATEMENTS IS LOAD-BEARING (s3.3). The model is solved by
// Gauss-Seidel and several statements read a variable that a LATER statement in
// the same call assigns -- they are reading the previous iterate, which is the
// method. Confirmed sites in the R source:
//     id      reads da    assigned later
//     lf      reads e_s   assigned later
//     gdef    reads f_cb  assigned later
//     x_star  reads pop_j assigned later
// A port that tidies the sequence is wrong in a way no single-statement test
// catches. Port strictly in source order.
// ---------------------------------------------------------------------------

import * as K_ from './kernel.mjs';

export const PORTED_BLOCKS = [
  'technical-coefficients',   // MVP_model_2026.R, the A recursion + gamma_A
  'households',               // consumption, disposable income, distribution
  'production-firms',         // final demand, Leontief solve, value added
  'investment-equity',        // va_g, kt/id/da/k, af, lf, e_s and its cross rows
  'dividends',                // r_e, the SECOND div_h1 assignment, div
  'commercial-banks',         // ls, ms, b_b/a_d, f_b
  'government',               // g, id_g/da_g/k_g, income tax, t_j, int_j
  'fiscal-revenue',           // vat_rev, tar_rev (arm switch), gdef, b_s, debt_gdp
  'central-bank',             // bills to households, f_cb, policy rates
  'labour-market',            // n, n_j, nf_j, nf, wb_j, wb
  'portfolio',                // Tobin asset demands, cash, deposits, loans
  'prices',                   // p_t, x_star, p, the four deflators, pim
  'ecological',               // waste, emissions, matter, energy (2 arm switches)
  'global-stocks',            // matter/energy reserves, temperature
  'trade',                    // intermediate + final imports, exports, tb
  'external-accounts',        // cab, kabp, nafa, the fixed exchange-rate closure
  'labour-force',             // pop_j, un, imm, rho
];

// The variable families the ported blocks actually ASSIGN. This is the list the
// acceptance test holds to tolerance, and it must be maintained by hand as
// blocks land -- deliberately, because it is the porter's claim about what has
// been done, and the test's job is to falsify that claim.
//
// Anything not listed here is still passing its input through. Such a family
// may LOOK like it agrees: in a single evaluation many variables barely move,
// so a pass-through can sit under a 1e-12 relative tolerance without a line of
// it having been ported. run_tier1.mjs therefore reports pass-through families
// separately and never counts them as passing.
export const PORTED_FAMILIES = [
  // demand scenarios -- added 2026-09-17. These four were READ by the port and
  // never WRITTEN by it, so tier 1 reported each as INERT (a pass-through agreed
  // trivially) rather than as pending. They are the one place the claim "every
  // family R moves is ported" was false. See the block comment at the top of
  // mvpModel for the measurement that found them.
  'beta_Z1', 'sigma_Z1', 'iota_Z1', 'iota_g_Z1',
  'gamma_A',
  'dxr',
  // households
  'c', 'yd', 'div_h1', 'yd_j', 'ydw_j', 'ydc_j', 'ydw', 'ydc',
  'ineq', 'ineq_j', 'shp', 'shw', 'shp_j', 'shw_j', 'v',
  // production firms
  'd', 'x', 'go', 'fd', 'y', 'yn', 'f_f', 'f_f_u', 'va_j', 'va', 'rva_j', 'rva',
  // investment, amortisation, corporate borrowing, equity issue
  //
  // 'e_s_Z1' and 'e_s_Z2' are claimed on the rule stated at their statement:
  // the cross rows Z1_e_s_Z2 / Z2_e_s_Z1 are assigned by the port, and the own
  // rows Z1_e_s_Z1 / Z2_e_s_Z2 are assigned NOWHERE IN THE R MODEL, so
  // pass-through reproduces R exactly rather than standing in for missing work.
  'va_g', 'va_index', 'kt', 'id', 'da', 'k', 'af', 'lf',
  'e_s', 'e_s_Z1', 'e_s_Z2',
  // dividends
  'r_e', 'div',
  // commercial banks
  'ls', 'ms', 'b_b', 'a_d', 'f_b',
  // government and central bank
  'g', 'id_g', 'da_g', 'k_g', 't', 't_j', 'int_j',
  // VAT, tariffs, deficit and debt
  'vat_rev', 'tar_rev', 'gdef', 'b_s', 'debt_gdp', 'a_s', 'h_s',
  // central bank and policy rates
  //
  // NOT 'b_s_Z2': that family SPLITS ACROSS BLOCKS. Z2_b_s_Z2 is assigned at
  // MVP_model_2026.R:477 and is ported; Z1_b_s_Z2 is assigned at :912, in the
  // exchange-rate closure, and is not. Claiming the family here reported
  // Z1_b_s_Z2 as upstream-limited at 4.72e-9 when in truth nothing had been
  // written for it at all. Family granularity is coarser than the model's
  // assignment structure, so a family is only claimable once EVERY row in it
  // has a ported assignment.
  'b_s_Z1', 'f_cb', 'b_cb_d_Z2', 'rm', 'rb', 'rl', 'rh',
  // labour market
  'n', 'n_j', 'nf_j', 'nf', 'wb_j', 'wb',
  // household portfolio
  'b_h_Z1', 'b_h_Z2', 'e_h_Z1', 'e_h_Z2', 'h_h', 'mh', 'lh',
  // prices
  'p_t', 'x_star', 'p', 'pa', 'pid', 'pid_g', 'pg', 'pim',
  // ecological
  'was_j', 'was', 'wa_j', 'wa', 'emis_j', 'emis', 'land_j', 'land',
  'water_j', 'water', 'co2_cum', 'x_mat', 'mat', 'rec', 'dis', 'dc',
  'en', 'ren', 'nen',
  // global stocks and temperature
  'conv_mat', 'kmat', 'res_mat', 'conv_en', 'ken', 'res_en', 'temp',
  // trade
  'M_TOT_int', 'imp', 'tot_imp', 'nimp', 'rex', 'nex', 'tb',
  // external accounts and the exchange-rate closure
  //
  // 'b_s_Z2' is claimable ONLY NOW. Z2_b_s_Z2 is assigned at R:477 and was
  // ported with the government block; Z1_b_s_Z2 is assigned at R:912, in the
  // closure below. Claiming the family on the strength of the first alone --
  // which was done once -- reported Z1_b_s_Z2 as upstream-limited at 4.72e-9
  // when nothing had been written for it at all.
  //
  // 'b_cb_s_Z2' follows the e_s_Z1/e_s_Z2 rule: Z1_b_cb_s_Z2 is assigned in the
  // closure, and Z2_b_cb_s_Z2 is assigned nowhere in the R model.
  //
  // 'or' and 'p_or' are NOT claimed. Their assignments are commented out at
  // R:473-474 and R:887-888, so no row of either has a ported assignment; the
  // port passes them through because R does, and the test is right to say
  // nothing about them.
  'cab', 'kabp', 'nafa', 'b_cb', 'b_cb_s_Z2', 'b_s_Z2', 'xr',
  // labour force
  'pop_j', 'un', 'imm', 'rho',
];

// ---------------------------------------------------------------------------
// CANCELLATION-LIMITED FAMILIES -- held to an ABSOLUTE bound, not a relative one
// ---------------------------------------------------------------------------
// Five of the ported families are small quantities built as differences of
// near-equal large ones. Their RELATIVE deviation measures the cancellation in
// the R model's own arithmetic, not the fidelity of the port, and no amount of
// further work on the port can reduce it. Measured on arm `submitted`,
// scenario 7, all 99 periods (2026-09-17):
//
//   family  max |dev|   worst row   max rel dev   worst row    what it is
//   va_g     8.88e-16   Z1_va_g        7.58e-7    Z2_va_g      rva/va - 1
//   un       2.66e-15   Z1_un-1        1.47e-8    Z1_un-38     1 - n_j/pop_j
//   nafa     3.31e-12   Z1_nafa        6.64e-9    Z2_nafa      gdef + cab
//   cab      3.26e-12   Z1_cab         1.51e-10   Z2_cab       net external balance
//   kabp     7.11e-15   Z1_kabp        8.20e-12   Z1_kabp      d(stocks), two legs
//   gdef     3.69e-13   Z1_gdef        4.90e-13   Z1_gdef      net fiscal balance
//
// `gdef` is in the list because of arm `revised`, not arm `submitted`. On
// `submitted` its relative deviation is 4.90e-13 and it passes the 1e-12 test
// outright; on `revised` the same absolute error, 2.27e-13, falls on periods
// where the deficit is smaller and the relative figure is 3.40e-12. Nothing
// about the port differs between the two -- the tax and spending legs it is
// built from are of order 1e2 and agree to 4e-16 relative on both arms. A
// family whose relative pass depends on which arm it is measured on belongs
// under an absolute bound; leaving it out would have made the criterion
// arm-dependent.
//
// The two columns are maxima over different rows and periods, which is why the
// worst-row labels differ; the bounds below are set against the ABSOLUTE
// column. Taking the two worst RELATIVE cases apart, since they are what makes
// the relative measure useless here:
//
//   Z2_va_g at t = 97: R has -5.857491158778316e-10, the port
//   -5.857486717886218e-10. They differ by 4.44e-16 -- two units in the last
//   place of the ratio rva/va = 1 + 6e-10 -- while rva and va themselves are
//   4.58e+3 and agree to 7.4e-16 relative. Subtracting 1 from a number that
//   close to 1 discards twelve significant digits, a 7.8e12x loss, and turns a
//   last-bit agreement into a 7.58e-7 relative disagreement.
//
//   Z1_un-38 at t = 88 is the same shape: n_j = pop_j = 4.8307e+2, their ratio
//   is 1 + 1.5e-8, and the deviation is 2.22e-16 -- exactly one ULP at 1.0.
//
// `cab` and `nafa` are a different case and should not be filed under the same
// explanation. Their absolute deviations, ~3e-12, are genuine accumulation over
// a few dozen additions of terms of order 1e2 -- about 1e-14 relative to those
// terms, which is what a long sum costs. The cancellation then sits downstream:
// at t = 6, Z2_cab is 9.72e-3 formed from nex = 1.333e+2 and nimp = 1.492e+2,
// a 1.5e4x loss, and `nafa = gdef + cab` inherits cab's absolute error into a
// result of order 1e-4. `kabp` differences two stocks of order 1e2 and lands at
// 8.8e-17 of them, below machine epsilon.
//
// The bounds below are the measured maxima rounded up to the next round figure
// -- tight enough that a transcription error would break them, loose enough to
// survive a different platform's libm. They are the claim; the test's job is
// to falsify it, exactly as with PORTED_FAMILIES.
// Measured maxima are over BOTH arms tested (submitted and revised), scenario
// 7, all 99 periods; each bound is the maximum rounded up to the next round
// figure, a margin of 10x to 100x.
export const CANCELLATION_LIMITED = {
  va_g: 1e-14,   // measured 8.88e-16
  un:   1e-14,   // measured 2.66e-15
  nafa: 1e-10,   // measured 4.43e-12
  cab:  1e-10,   // measured 4.43e-12
  kabp: 1e-12,   // measured 7.11e-15
  gdef: 1e-11,   // measured 3.69e-13
};

// ---------------------------------------------------------------------------
// State accessor -- the whole point of the port
// ---------------------------------------------------------------------------
// R indexes `sim` by character label, and match() against the 6,713-element
// rownames is 85.95% of the model's run time (profiled 2026-09-09). Here every
// label resolves to an integer ONCE, at construction, and the model only ever
// sees integers. This is the cost the port exists to remove; it is not an
// optimisation applied afterwards.

export class Index {
  constructor(labels, K, N) {
    this.labels = labels;
    this.n = labels.length;
    this.K = K;          // industries per region (54)
    this.N = N;          // regions (2)
    this.zlabs = Array.from({ length: N }, (_, i) => `Z${i + 1}`);

    this.pos = new Map();
    for (let i = 0; i < labels.length; i++) {
      if (this.pos.has(labels[i])) {
        throw new Error(`duplicate label ${labels[i]} -- the index would be ambiguous`);
      }
      this.pos.set(labels[i], i);
    }
    this._z = new Map();
    this._zk = new Map();
  }

  // one label -> one integer
  at(label) {
    const p = this.pos.get(label);
    if (p === undefined) throw new Error(`label not found: ${label}`);
    return p;
  }

  // R's z.lab(v) -> c("Z1_v","Z2_v"), as an Int32Array of row indices
  z(v) {
    let idx = this._z.get(v);
    if (idx) return idx;
    idx = Int32Array.from(this.zlabs.map((z) => this.at(`${z}_${v}`)));
    this._z.set(v, idx);
    return idx;
  }

  // R's zk.lab(v) -> Z1_v-1..Z1_v-K, Z2_v-1..Z2_v-K
  zk(v) {
    let idx = this._zk.get(v);
    if (idx) return idx;
    const out = new Int32Array(this.K * this.N);
    let p = 0;
    for (const z of this.zlabs) {
      for (let k = 1; k <= this.K; k++) out[p++] = this.at(`${z}_${v}-${k}`);
    }
    this._zk.set(v, idx = out);
    return idx;
  }

  // arbitrary label list -> indices (for the cross-region forms like
  // paste0(z.lab('b_s_'), zlabs) and the e_h matrix of s3.4.2)
  many(labels) {
    return Int32Array.from(labels.map((l) => this.at(l)));
  }

  // R's rev.zk.lab(v) (utils/aux_utils.R:35-37): the industry rows with the
  // REGION order reversed -- Z2's 54 first, then Z1's. Used wherever a region
  // is charged against the other region's per-industry vector.
  revZk(v) {
    const key = `rev ${v}`;
    let idx = this._zk.get(key);
    if (idx) return idx;
    const out = new Int32Array(this.K * this.N);
    let p = 0;
    for (const z of [...this.zlabs].reverse()) {
      for (let k = 1; k <= this.K; k++) out[p++] = this.at(`${z}_${v}-${k}`);
    }
    this._zk.set(key, out);
    return out;
  }

  // one region's K industry rows: R's paste0(z, '_', v, '-', 1:K)
  zkOf(v, r) {
    const key = `${r} ${v}`;
    let idx = this._zk.get(key);
    if (idx) return idx;
    const z = this.zlabs[r];
    idx = Int32Array.from(
      Array.from({ length: this.K }, (_, k) => this.at(`${z}_${v}-${k + 1}`))
    );
    this._zk.set(key, idx);
    return idx;
  }
}

// A 2-column view of the state: column 0 is period i-1, column 1 is period i.
// R's `sim[rows, i]` becomes `st.get(rows, 1)`.
export class Sim {
  constructor(y, index) {
    if (y.length !== 2 * index.n) {
      throw new K_.LengthError('Sim', y.length, 2 * index.n);
    }
    this.n = index.n;
    this.ix = index;
    this.d = Float64Array.from(y);   // [col0 (n), col1 (n)]
  }
  // rows: Int32Array or single integer; col: 0 (i-1) or 1 (i)
  get(rows, col) {
    const off = col * this.n;
    if (typeof rows === 'number') return this.d[off + rows];
    const out = new Float64Array(rows.length);
    for (let i = 0; i < rows.length; i++) out[i] = this.d[off + rows[i]];
    return out;
  }
  set(rows, col, values) {
    const off = col * this.n;
    if (typeof rows === 'number') { this.d[off + rows] = values; return; }
    if (typeof values === 'number') {
      for (let i = 0; i < rows.length; i++) this.d[off + rows[i]] = values;
      return;
    }
    if (rows.length !== values.length) {
      throw new K_.LengthError('Sim.set', rows.length, values.length);
    }
    for (let i = 0; i < rows.length; i++) this.d[off + rows[i]] = values[i];
  }
  out() { return this.d; }
}

// R's zk.sum(): 108 industry values -> 2 region totals.
// utils/aux_utils.R:15-23. In R this rebuilds seq(1, by = K, length.out = N)
// twice per element inside an sapply and costs 6.89% of the whole run; here the
// boundaries are arithmetic.
export function zkSum(vec, K, N) {
  const out = new Float64Array(N);
  for (let r = 0; r < N; r++) {
    let s = 0;
    const base = r * K;
    for (let k = 0; k < K; k++) s += vec[base + k];
    out[r] = s;
  }
  return out;
}

export function zkMean(vec, K, N) {
  const s = zkSum(vec, K, N);
  const out = new Float64Array(N);
  for (let r = 0; r < N; r++) out[r] = s[r] / K;
  return out;
}

// ---------------------------------------------------------------------------
// Parameters -- BY NAME, NEVER BY POSITION (s3.4.1)
// ---------------------------------------------------------------------------
// `parms` is a named vector in R and 21 sites index it by name. An integer
// index into it is silently wrong. This wrapper has no positional accessor at
// all, so that error cannot be written.

export class Params {
  constructor(obj) { this.o = obj; }
  get(name) {
    const v = this.o[name];
    if (v === undefined) throw new Error(`parameter not found: ${name}`);
    return v;
  }
  // R's parms[z.lab('alpha1')] -> c(Z1_alpha1, Z2_alpha1)
  z(name, zlabs) {
    return Float64Array.from(zlabs.map((z) => this.get(`${z}_${name}`)));
  }
  zk(name, zlabs, K) {
    const out = new Float64Array(zlabs.length * K);
    let p = 0;
    for (const z of zlabs) for (let k = 1; k <= K; k++) out[p++] = this.get(`${z}_${name}-${k}`);
    return out;
  }
}

// ---------------------------------------------------------------------------
// The model -- one evaluation, one period.
//
// Mirrors mvp.model(t, y, parms, A.mat, B.mat) in model/MVP_model_2026.R.
// Returns { y, A } with the same shapes R returns.
// ---------------------------------------------------------------------------

export function mvpModel({ t, y, params, Amat, Bmat, index, opts = {} }) {
  const ix = index;
  const K = ix.K, N = ix.N, nS = K * N;
  const st = new Sim(y, ix);
  const P = params instanceof Params ? params : new Params(params);

  // R: i <- 2  -- within one call, column 2 is "now" and column 1 is "lagged".
  // Here those are columns 1 and 0.
  const CUR = 1, LAG = 0;

  // =========================================================================
  // BLOCK: demand scenarios            (R source: MVP_model_2026.R:14-31)
  // =========================================================================
  // R:
  //   delta_eff <- compute_all_delta_eff(shock, rho, t, t_shock, sim, i = 2, sc)
  //   sim[zk.lab("beta_Z1"),   2] <- delta_eff$beta_Z1
  //   sim[zk.lab("sigma_Z1"),  2] <- delta_eff$sigma_Z1
  //   sim[zk.lab("iota_Z1"),   2] <- delta_eff$iota_Z1
  //   sim[zk.lab("iota_g_Z1"), 2] <- delta_eff$iota_g_Z1
  //
  // ⚠️ THIS BLOCK WAS MISSING FROM THE PORT UNTIL 2026-09-17, and tier 1 could
  // not see that it was. Every one of the four families it writes is ALSO read
  // later in this file (`beta_Z1` at the consumption and VAT statements,
  // `sigma_Z1`/`iota_Z1`/`iota_g_Z1` at the deflators), so a pass-through
  // reproduced R exactly whenever the value written equalled the value already
  // there -- which is every period except t == t.shock. Tier 1 feeds the
  // CONVERGED current column, so at t = 70 the shifted value was already in its
  // input and the pass-through agreed trivially: the family was reported INERT.
  // Tier 2 starts from R's cold start and caught it immediately, as a ~1.5e-1
  // relative disagreement at t = 70 alone. See log/session_20260917.md s10.3.
  //
  // The base for every write is the LAGGED column, not the current one, so this
  // block is order-independent and must simply precede everything that reads it.
  //
  // `sc` is REQUIRED. In R it is a global read inside mvp.model
  // (MVP_model_2026.R:25); here it arrives as opts.scenarios, exported to
  // web/engine/state/<arm>/scenarios.json by tools/export_model_state.R. A
  // missing table is a hard error rather than a silent no-op, because the R
  // model cannot run without it either.
  const sc = opts.scenarios;
  if (!Array.isArray(sc)) {
    throw new Error(
      'opts.scenarios is required: mvpModel reads the scenario table (MVP_model_2026.R:25). ' +
      'Load web/engine/state/<arm>/scenarios.json and pass it as opts.scenarios.'
    );
  }
  {
    const shock = P.get('shock') | 0;
    const rho = P.get('rho');
    const tShockD = P.get('t.shock') | 0;
    const rows = sc.filter((r) => Number(r.shock) === shock);
    if (rows.length === 1) {
      const target = String(rows[0].target);
      const from = Number(rows[0].primary);
      const to = Number(rows[0].secondary);
      for (const [fam, tgt] of [
        ['beta_Z1', 'beta'], ['sigma_Z1', 'sigma'],
        ['iota_Z1', 'iota'], ['iota_g_Z1', 'iota_g'],
      ]) {
        const idx = ix.zk(fam);
        const out = st.get(idx, LAG);          // sim[zk.lab(fam), 1]
        if (target === tgt && t === tShockD) {
          // compute_delta_eff (demand_scenarios_2026.R:8-45), applied once per
          // region bloc -- R calls it twice, with prefix Z1_ then Z2_, and each
          // call resolves from/to WITHIN the 54-name bloc it names.
          for (let r = 0; r < N; r++) {
            const b = r * K;
            const m = out[b + from - 1];
            out[b + from - 1] = (1 - rho) * m;
            out[b + to - 1] = out[b + to - 1] + rho * m;
          }
        }
        st.set(idx, CUR, out);
      }
    }
    // rows.length != 1 -> R returns the CURRENT column, i.e. a no-op write.
    // That is the baseline (shock = 0) and any scenario the table does not name.
  }

  const tShock = P.get('t.shock') | 0;

  // A.mat arrives as 108 x 108 x 2 (periods i-1 and i), column-major.
  const nA = nS * nS;
  const A_prev = new K_.Mat(Amat.slice(0, nA), nS, nS);
  const A_cur = new K_.Mat(Amat.slice(nA, 2 * nA), nS, nS);
  const B_t = new K_.Mat(Bmat.slice(0, nA), nS, nS);

  // =========================================================================
  // BLOCK: technical coefficients        (R source: the A recursion)
  // =========================================================================
  // R:
  //   ce_eff <- parms[z.lab("ce")]; if (t < t_shock) ce_eff[] <- 0
  //   foo <- matrix(rep(sim[z.lab("gamma_A"), i-1] * ce_eff, each = N*K^2),
  //                 ncol = K*N, nrow = K*N)
  //   A <- A.t[,,i] <- A.t[,,i-1] + foo * (B.t - A.t[,,i-1])
  //
  // `foo` is a K*N x K*N matrix whose entries are constant within each REGION
  // BLOCK OF COLUMNS: rep(x, each = N*K^2) with x of length 2 fills the first
  // N*K^2 = 2*54^2 entries with x[1] and the rest with x[2]. Column-major over
  // a 108x108 matrix, N*K^2 = 5832 entries is exactly 54 columns -- so columns
  // 1..54 carry Z1's rate and columns 55..108 carry Z2's. Written out as that
  // column rule rather than as a flat rep(), because the flat form only
  // happens to be right for N = 2.
  let ce_eff = P.z('ce', ix.zlabs);
  if (t < tShock) ce_eff = new Float64Array(N);

  const gammaA_lag = st.get(ix.z('gamma_A'), LAG);
  const rate = K_.mul(gammaA_lag, ce_eff);          // length N

  const A_new = K_.Mat.zeros(nS, nS);
  for (let c = 0; c < nS; c++) {
    const region = Math.floor(c / K);               // 0 for Z1's columns, 1 for Z2's
    const f = rate[region];
    const base = c * nS;
    for (let r = 0; r < nS; r++) {
      const a0 = A_prev.d[base + r];
      A_new.d[base + r] = a0 + f * (B_t.d[base + r] - a0);
    }
  }

  // R: sim[z.lab('gamma_A'), i] <- parms[z.lab('gammaA0')] +
  //      sim[z.lab('g'), i-1] * c(sum(Z1_gammaA1-k * Z1_sigma_Z1-k),
  //                               sum(Z2_gammaA1-k * Z2_sigma_Z2-k))
  // Note the sigma label differs per region: Z1 reads sigma_Z1, Z2 reads
  // sigma_Z2 -- it is NOT zk.lab('sigma') and must be built per region.
  const gammaA0 = P.z('gammaA0', ix.zlabs);
  const g_lag = st.get(ix.z('g'), LAG);
  const perRegion = new Float64Array(N);
  for (let r = 0; r < N; r++) {
    const z = ix.zlabs[r];
    const gA1 = ix.many(Array.from({ length: K }, (_, k) => `${z}_gammaA1-${k + 1}`));
    const sig = ix.many(Array.from({ length: K }, (_, k) => `${z}_sigma_${z}-${k + 1}`));
    perRegion[r] = K_.sum(K_.mul(st.get(gA1, CUR), st.get(sig, CUR)));
  }
  st.set(ix.z('gamma_A'), CUR, K_.add(gammaA0, K_.mul(g_lag, perRegion)));

  // R: sim[z.lab('dxr'), i] <- sim[z.lab('xr'), i] - sim[z.lab('xr'), i-1]
  const xr = ix.z('xr');
  st.set(ix.z('dxr'), CUR, K_.sub(st.get(xr, CUR), st.get(xr, LAG)));

  // -- A.xr: A with the exchange-rate block mask -----------------------------
  // R:
  //   A.xr.matrix <- cbind(rbind(matrix(1, K, K),          matrix(sim['Z2_xr',1], K, K)),
  //                        rbind(matrix(sim['Z1_xr',1], K, K), matrix(1, K, K)))
  //   A.xr <- A * A.xr.matrix
  //
  // NOTE THE COLUMN INDEX: sim['Z2_xr', 1] is column 1 of the two-column array,
  // which is period i-1 -- the LAGGED rate, not the current one. `dxr` three
  // lines above reads the current one. Two different columns of the same
  // variable a few statements apart; reading them the same way is a silent
  // one-period error.
  const xrZ1_lag = st.get(ix.at('Z1_xr'), LAG);
  const xrZ2_lag = st.get(ix.at('Z2_xr'), LAG);
  const A_xr = K_.Mat.zeros(nS, nS);
  for (let c = 0; c < nS; c++) {
    const cHome = c < K;                       // column in Z1's block
    const base = c * nS;
    for (let r = 0; r < nS; r++) {
      const rHome = r < K;                     // row in Z1's block
      let m;
      if (rHome === cHome) m = 1;              // diagonal blocks
      else if (!rHome && cHome) m = xrZ2_lag;  // bottom-left
      else m = xrZ1_lag;                       // top-right
      A_xr.d[base + r] = A_new.d[base + r] * m;
    }
  }

  // =========================================================================
  // BLOCK: households                     (R source: "#### HOUSEHOLDS ####")
  // =========================================================================
  // THIS BLOCK PRECEDES PRODUCTION FIRMS IN THE R SOURCE AND MUST PRECEDE IT
  // HERE. `d` is built from `c`, which is assigned below; porting production
  // first fed it the stale input and every downstream family came out
  // UPSTREAM-LIMITED at ~2.4e-9 (design s3.5.1).
  //
  // Several statements here read variables assigned LATER in the same call --
  // c reads ydw/ydc, div_h1 reads yn, the per-region loop reads va and va_j.
  // Those are previous-iterate reads and they are the Gauss-Seidel method, not
  // mistakes (s3.3). They work here only because the statements stay in source
  // order and read the CUR column before anything overwrites it.

  // Total real consumption. Reads ydw/ydc at CUR -- assigned in the per-region
  // loop below, so this is the previous iterate.
  let c_v = K_.sums(
    K_.mul(P.z('alpha1', ix.zlabs), st.get(ix.z('ydw'), CUR)),
    K_.mul(P.z('alpha2', ix.zlabs), st.get(ix.z('ydc'), CUR)),
    K_.mul(P.z('alpha3', ix.zlabs), st.get(ix.z('v'), LAG))
  );
  if (t > 2) c_v = K_.div(c_v, st.get(ix.z('pa'), LAG));
  st.set(ix.z('c'), CUR, c_v);

  // Disposable income of domestic households.
  // paste0(z.lab('b_s_'), zlabs)      -> Z1_b_s_Z1, Z2_b_s_Z2  (own holdings)
  // paste0(z.lab('b_s_'), rev(zlabs)) -> Z1_b_s_Z2, Z2_b_s_Z1  (cross holdings)
  const bs_own = ix.many(['Z1_b_s_Z1', 'Z2_b_s_Z2']);
  const bs_cross = ix.many(['Z1_b_s_Z2', 'Z2_b_s_Z1']);
  const es_cross = ix.many(['Z1_e_s_Z2', 'Z2_e_s_Z1']);

  let yd = K_.sums(
    K_.sub(st.get(ix.z('wb'), CUR), st.get(ix.z('t'), CUR)),
    st.get(ix.z('f_b'), CUR),
    K_.mul(st.get(ix.z('rb'), LAG), st.get(bs_own, LAG)),
    K_.mul(K_.rev(st.get(ix.z('rb'), LAG)), st.get(bs_cross, LAG)),
    K_.mul(st.get(ix.z('rm'), LAG), st.get(ix.z('mh'), LAG))
  );
  yd = K_.sub(yd, K_.mul(st.get(ix.z('rh'), LAG), st.get(ix.z('lh'), LAG)));
  yd = K_.add(yd, K_.mul(
    K_.rev(st.get(ix.z('dxr'), CUR)),
    K_.add(st.get(bs_cross, LAG), st.get(es_cross, LAG))
  ));

  // e_h.matrix. R builds this with apply(expand.grid(...), 1, paste), which
  // varies the FIRST factor fastest and fills a 2x2 column-major -- element
  // (r, c) is Z{r+1}_e_h_Z{c+1}. s3.4.2 requires the four labels written out
  // explicitly, because that expand.grid construction already broke an earlier
  // flash builder.
  const eh = new K_.Mat(Float64Array.from([
    st.get(ix.at('Z1_e_h_Z1'), LAG), st.get(ix.at('Z2_e_h_Z1'), LAG),
    st.get(ix.at('Z1_e_h_Z2'), LAG), st.get(ix.at('Z2_e_h_Z2'), LAG),
  ]), N, N);

  // x.r.mat: t(matrix(xr, N, N)) with the diagonal set to 1, i.e.
  // [[1, Z1_xr], [Z2_xr, 1]] -- each region converted at its OWN rate.
  const xr_cur = st.get(ix.z('xr'), CUR);
  const xrm = K_.Mat.zeros(N, N);
  for (let r = 0; r < N; r++) for (let c2 = 0; c2 < N; c2++) xrm.set(r, c2, xr_cur[r]);
  xrm.setDiag(1);

  // Auxiliary dividends term. Reads yn at CUR -- assigned in the production
  // block below, so previous iterate.
  const div_h1 = K_.mul(
    K_.sub(1, P.z('omega', ix.zlabs)),
    K_.sub(
      st.get(ix.z('yn'), CUR),
      K_.sums(
        st.get(ix.z('wb'), CUR),
        st.get(ix.z('af'), CUR),
        K_.mul(st.get(ix.z('rl'), LAG), st.get(ix.z('lf'), LAG))
      )
    )
  );
  st.set(ix.z('div_h1'), CUR, div_h1);

  // Disposable income 2. The branch is on whether ANY region's lagged equity
  // supply is zero: R's `sum(sim[z.lab('e_s'), i-1] == 0) > 0`.
  const es_lag = st.get(ix.z('e_s'), LAG);
  let anyZero = false;
  for (let r = 0; r < N; r++) if (es_lag[r] === 0) anyZero = true;
  if (anyZero) {
    yd = K_.add(yd, div_h1);
  } else {
    yd = K_.add(yd, xrm.mulE(eh).mv(K_.div(div_h1, es_lag)));
  }
  st.set(ix.z('yd'), CUR, yd);

  // Disposable incomes by industry and social class, per region.
  // The guard is R's `if (sim[paste0(z,'_va'), i] > 0)`: a region whose value
  // added is not positive keeps every variable in this loop at its input.
  for (let r = 0; r < N; r++) {
    const va_r = st.get(ix.z('va')[r], CUR);
    if (!(va_r > 0)) continue;

    const yd_r = yd[r];
    const iYdj = ix.zkOf('yd_j', r);
    const iVaj = ix.zkOf('va_j', r);
    const iWbj = ix.zkOf('wb_j', r);
    const iYdwj = ix.zkOf('ydw_j', r);
    const iYdcj = ix.zkOf('ydc_j', r);

    // reads va_j at CUR -- assigned in the production block below
    const yd_j = K_.div(K_.mul(st.get(iVaj, CUR), yd_r), va_r);
    st.set(iYdj, CUR, yd_j);

    const theta_w = st.get(ix.z('theta_w')[r], CUR);
    const ydw_j = K_.mul(st.get(iWbj, CUR), 1 - theta_w);
    st.set(iYdwj, CUR, ydw_j);

    const ydc_j = K_.sub(yd_j, ydw_j);
    st.set(iYdcj, CUR, ydc_j);

    const ydw = K_.sum(ydw_j);
    const ydc = K_.sum(ydc_j);
    st.set(ix.z('ydw')[r], CUR, ydw);
    st.set(ix.z('ydc')[r], CUR, ydc);

    st.set(ix.z('ineq')[r], CUR, Math.abs(1 - ydw / ydc));
    st.set(ix.zkOf('ineq_j', r), CUR, K_.abs(K_.sub(1, K_.div(ydw_j, ydc_j))));

    st.set(ix.z('shp')[r], CUR, ydc / yd_r);
    st.set(ix.z('shw')[r], CUR, ydw / yd_r);
    st.set(ix.zkOf('shp_j', r), CUR, K_.div(ydc_j, yd_j));
    st.set(ix.zkOf('shw_j', r), CUR, K_.div(ydw_j, yd_j));
  }

  // Net household wealth. Reads pa at CUR (the current price), unlike `c`
  // above which reads pa at i-1.
  st.set(ix.z('v'), CUR, K_.sub(
    K_.add(st.get(ix.z('v'), LAG), st.get(ix.z('yd'), CUR)),
    K_.mul(st.get(ix.z('c'), CUR), st.get(ix.z('pa'), CUR))
  ));

  // =========================================================================
  // BLOCK: production firms          (R source: "#### PRODUCTION FIRMS ####")
  // =========================================================================

  // Final demand vector in real terms. Each of the eight terms is a 108-vector
  // of shares times ONE region's scalar aggregate -- written out per term
  // rather than as the commented-out rep(..., each = K) form just below it in
  // the R source, because that form is the one the author disabled.
  const c_Z1 = st.get(ix.at('Z1_c'), CUR), c_Z2 = st.get(ix.at('Z2_c'), CUR);
  const g_Z1 = st.get(ix.at('Z1_g'), CUR), g_Z2 = st.get(ix.at('Z2_g'), CUR);
  const id_Z1 = st.get(ix.at('Z1_id'), CUR), id_Z2 = st.get(ix.at('Z2_id'), CUR);
  const idg_Z1 = st.get(ix.at('Z1_id_g'), CUR), idg_Z2 = st.get(ix.at('Z2_id_g'), CUR);

  const d = K_.sums(
    K_.mul(st.get(ix.zk('beta_Z1'), CUR), c_Z1),
    K_.mul(st.get(ix.zk('beta_Z2'), CUR), c_Z2),
    K_.mul(st.get(ix.zk('sigma_Z1'), CUR), g_Z1),
    K_.mul(st.get(ix.zk('sigma_Z2'), CUR), g_Z2),
    K_.mul(st.get(ix.zk('iota_Z1'), CUR), id_Z1),
    K_.mul(st.get(ix.zk('iota_Z2'), CUR), id_Z2),
    K_.mul(st.get(ix.zk('iota_g_Z1'), CUR), idg_Z1),
    K_.mul(st.get(ix.zk('iota_g_Z2'), CUR), idg_Z2)
  );
  st.set(ix.zk('d'), CUR, d);

  // Real output: x <- solve(diag(K*N) - A.t[,,i]) %*% d, the Leontief solve.
  // A is exactly invariant within a period (measured 2026-09-09), so in the
  // full driver this factorisation is hoisted to once per period -- 99 solves
  // per run, not 7,735. Here it is one evaluation, so it is done in place.
  const IminusA = K_.identity(nS).subE(A_new);
  const x = K_.solve(IminusA, d);
  st.set(ix.zk('x'), CUR, x);

  // Gross output and real demand: zk.sum collapses 108 industry values to 2
  // region totals.
  st.set(ix.z('go'), CUR, zkSum(x, K, N));
  st.set(ix.z('fd'), CUR, zkSum(d, K, N));

  // Value of gross output
  const p_cur = st.get(ix.zk('p'), CUR);
  st.set(ix.z('y'), CUR, zkSum(K_.mul(p_cur, x), K, N));

  // Net income (total value added) net of VAT and tariffs.
  // The last term is rev(z.lab('xr')) * rev(z.lab('tar_rev')): each region is
  // charged the OTHER region's exchange rate and tariff revenue. rev() over a
  // two-element vector is the cross-region swap and appears throughout the
  // model; it is not a reordering of anything.
  const revz = (v, col) => K_.rev(st.get(ix.z(v), col));
  st.set(ix.z('yn'), CUR, K_.sub(
    K_.sums(
      K_.mul(st.get(ix.z('c'), CUR), st.get(ix.z('pa'), CUR)),
      K_.mul(st.get(ix.z('id'), CUR), st.get(ix.z('pid'), CUR)),
      K_.mul(st.get(ix.z('id_g'), CUR), st.get(ix.z('pid_g'), CUR)),
      K_.mul(st.get(ix.z('g'), CUR), st.get(ix.z('pg'), CUR)),
      st.get(ix.z('nex'), CUR)
    ),
    K_.sums(
      st.get(ix.z('nimp'), CUR),
      st.get(ix.z('vat_rev'), CUR),
      K_.mul(revz('xr', CUR), revz('tar_rev', CUR))
    )
  ));

  // Corporate profit and retained profit
  const f_f = K_.sub(
    st.get(ix.z('yn'), CUR),
    K_.sums(
      st.get(ix.z('wb'), CUR),
      st.get(ix.z('af'), CUR),
      K_.mul(st.get(ix.z('rl'), LAG), st.get(ix.z('lf'), LAG))
    )
  );
  st.set(ix.z('f_f'), CUR, f_f);
  st.set(ix.z('f_f_u'), CUR, K_.mul(P.z('omega', ix.zlabs), f_f));

  // Value added by industry: p*x - (p %*% A.xr) * x.
  // `p %*% A.xr` is a ROW vector times a matrix: element c is
  // sum_r p[r] * A.xr[r, c] -- the input value of column c's production.
  const vmul = (v, M) => {
    const out = new Float64Array(M.ncol);
    for (let c2 = 0; c2 < M.ncol; c2++) {
      let s = 0;
      const b = c2 * M.nrow;
      for (let r = 0; r < M.nrow; r++) s += v[r] * M.d[b + r];
      out[c2] = s;
    }
    return out;
  };

  const va_j = K_.sub(K_.mul(p_cur, x), K_.mul(vmul(p_cur, A_xr), x));
  st.set(ix.zk('va_j'), CUR, va_j);
  st.set(ix.z('va'), CUR, zkSum(va_j, K, N));

  // Real value added uses the LAGGED price vector -- p[, i-1], not p[, i].
  const p_lag = st.get(ix.zk('p'), LAG);
  const rva_j = K_.sub(K_.mul(p_lag, x), K_.mul(vmul(p_lag, A_xr), x));
  st.set(ix.zk('rva_j'), CUR, rva_j);
  st.set(ix.z('rva'), CUR, zkSum(rva_j, K, N));

  // =========================================================================
  // BLOCK: investment, amortisation, corporate borrowing and equity issue
  //          (R source: MVP_model_2026.R:250-306, "#### INVESTMENT ####")
  // =========================================================================
  // THIS BLOCK MUST STAY BETWEEN rva AND THE DIVIDEND BLOCK. `f_f` above
  // (R:226) reads `af`, and `af` is assigned HERE, twenty statements later --
  // so f_f sees the PREVIOUS iterate of af, and the same holds for the `lf`
  // that f_f reads at LAG. Hoisting this block above f_f would feed f_f a
  // freshly computed af, which is a different fixed point, not a tidier one.
  //
  // Three more previous-iterate reads inside the block itself, each flagged at
  // its statement: id reads da, lf reads e_s, and both are assigned by the very
  // next statement.

  // Growth rate of value added, and the chained index built on it.
  const va_g = K_.sub(
    K_.div(st.get(ix.z('rva'), CUR), st.get(ix.z('va'), CUR)),
    1
  );
  st.set(ix.z('va_g'), CUR, va_g);
  st.set(ix.z('va_index'), CUR,
    K_.mul(st.get(ix.z('va_index'), LAG), K_.add(1, va_g)));

  // Target fixed capital as a ratio to output. Zero for the first three
  // periods -- the R source's own branch, marked "<--- JBF"; from t = 4 it is
  // the LAGGED-price value of the per-industry capital targets kappa applied to
  // LAGGED output, deflated by the lagged investment deflator. Three lagged
  // reads in one statement and no current one.
  if (t <= 3) {
    st.set(ix.z('kt'), CUR, 0);
  } else {
    st.set(ix.z('kt'), CUR, K_.div(
      zkSum(
        K_.mul(
          K_.mul(p_lag, st.get(ix.zk('kappa'), CUR)),
          st.get(ix.zk('x'), LAG)
        ), K, N),
      st.get(ix.z('pid'), LAG)
    ));
  }

  // Real investment in fixed capital. PREVIOUS-ITERATE READ: `da` is taken at
  // CUR here and assigned by the next statement.
  const da_prev_iter = st.get(ix.z('da'), CUR);
  st.set(ix.z('id'), CUR, K_.sums(
    K_.mul(
      P.z('gamma', ix.zlabs),
      K_.sub(st.get(ix.z('kt'), CUR), st.get(ix.z('k'), LAG))
    ),
    da_prev_iter,
    st.get(ix.z('id_p0'), CUR)
  ));

  // Depreciation allowances in real terms.
  st.set(ix.z('da'), CUR,
    K_.mul(st.get(ix.z('delta'), CUR), st.get(ix.z('k'), LAG)));

  // Fixed capital stock.
  st.set(ix.z('k'), CUR, K_.sub(
    K_.add(st.get(ix.z('k'), LAG), st.get(ix.z('id'), CUR)),
    st.get(ix.z('da'), CUR)
  ));

  // Amortisation funds: depreciation at the LAGGED deflator, less the capital
  // stock revalued by the deflator's change. The two pid columns are one
  // statement apart and are not the same column.
  const pid_cur = st.get(ix.z('pid'), CUR);
  const pid_lag = st.get(ix.z('pid'), LAG);
  st.set(ix.z('af'), CUR, K_.sub(
    K_.mul(st.get(ix.z('da'), CUR), pid_lag),
    K_.mul(st.get(ix.z('k'), CUR), K_.sub(pid_cur, pid_lag))
  ));

  // Corporate demand for bank loans: the residual financing need once
  // amortisation, retained profit and new equity issue are counted.
  // PREVIOUS-ITERATE READ: `e_s` at CUR, assigned by the next statement.
  const es_prev_iter = st.get(ix.z('e_s'), CUR);
  st.set(ix.z('lf'), CUR, K_.sub(
    K_.sub(
      K_.sub(
        K_.add(
          st.get(ix.z('lf'), LAG),
          K_.mul(st.get(ix.z('id'), CUR), pid_cur)
        ),
        st.get(ix.z('af'), CUR)
      ),
      st.get(ix.z('f_f_u'), CUR)
    ),
    K_.sub(es_prev_iter, st.get(ix.z('e_s'), LAG))
  ));

  // Quantity of shares issued by each region's firms: held by that region's own
  // households, plus the OTHER region's holdings of them converted at the other
  // region's rate.
  //   R: sim[z.lab('e_s'), i] = sim[z.lab(paste0('e_h_', zlabs)), i] +
  //        sim[rev(z.lab('xr')), i] * sim[rev(z.lab(paste0('e_h_', rev(zlabs)))), i]
  // The doubly-reversed label list is, element by element,
  // `<other region>_e_h_<this region>` -- foreign households' holdings of this
  // region's equity. Written out that way rather than as a rev() of a rev().
  const ehOwn = ix.many(ix.zlabs.map((z) => `${z}_e_h_${z}`));
  const ehForeignOfMine =
    ix.many(ix.zlabs.map((z, r) => `${ix.zlabs[N - 1 - r]}_e_h_${z}`));
  st.set(ix.z('e_s'), CUR, K_.add(
    st.get(ehOwn, CUR),
    K_.mul(K_.rev(st.get(ix.z('xr'), CUR)), st.get(ehForeignOfMine, CUR))
  ));

  // Supply of foreign shares to this region's households, at this region's own
  // rate: Z1_e_s_Z2 = Z1_e_h_Z2 * Z1_xr, and symmetrically for Z2.
  //
  // NOTE THE ROWS THIS DOES NOT WRITE. The own-region rows Z1_e_s_Z1 and
  // Z2_e_s_Z2 exist in the state vector and are assigned NOWHERE in the R
  // model -- unlike their bill counterparts, which get Z1_b_s_Z1 / Z2_b_s_Z2 at
  // R:477. So for those two rows the faithful port is exactly the pass-through
  // the engine already does, and the families e_s_Z1 / e_s_Z2 are claimed on
  // that basis: every row either has a ported assignment or has no assignment
  // in R at all. Flagged for the maintainer; not "fixed" here.
  const esCrossOfMine =
    ix.many(ix.zlabs.map((z, r) => `${z}_e_s_${ix.zlabs[N - 1 - r]}`));
  const ehCrossOfMine =
    ix.many(ix.zlabs.map((z, r) => `${z}_e_h_${ix.zlabs[N - 1 - r]}`));
  st.set(esCrossOfMine, CUR,
    K_.mul(st.get(ehCrossOfMine, CUR), st.get(ix.z('xr'), CUR)));

  // =========================================================================
  // BLOCK: dividends and equity return    (R source: after the price block)
  // =========================================================================
  // div_h1 IS ASSIGNED TWICE IN THE MODEL -- once in the household block, from
  // the previous iterate of yn, and AGAIN here from the yn just computed. Only
  // the second assignment survives into the returned vector.
  //
  // This was found by tier 1, not by reading: with only the first assignment
  // ported, div_h1 sat at 3.47e-9 while every other ported family was at
  // 1e-15. Inverting R's stored div_h1 for the yn it must have used returned
  // R's OUTPUT yn bit for bit (5.516615355620070e+2 at t = 2), not the input.
  // A duplicate assignment is invisible to a reader working down the source
  // once, and silent in any test that only checks the final vector's plausibility.

  const omega = P.z('omega', ix.zlabs);
  const one_minus_omega = K_.sub(1, omega);

  // Percentage return rate on shares issued by private firms. Reads e_s at
  // CUR; div below reads e_s at i-1. Two columns of the same variable, nine
  // lines apart.
  st.set(ix.z('r_e'), CUR, K_.div(
    K_.mul(one_minus_omega, st.get(ix.z('f_f'), CUR)),
    st.get(ix.z('e_s'), CUR)
  ));

  const div_h1_2 = K_.mul(
    one_minus_omega,
    K_.sub(
      st.get(ix.z('yn'), CUR),
      K_.sums(
        st.get(ix.z('wb'), CUR),
        st.get(ix.z('af'), CUR),
        K_.mul(st.get(ix.z('rl'), LAG), st.get(ix.z('lf'), LAG))
      )
    )
  );
  st.set(ix.z('div_h1'), CUR, div_h1_2);

  // Dividends obtained by households. Note this uses e_h.matrix ALONE, where
  // the yd term in the household block used (x.r.mat * e_h.matrix) -- the
  // exchange-rate mask is absent here.
  if (anyZero) {
    st.set(ix.z('div'), CUR, div_h1_2);
  } else {
    st.set(ix.z('div'), CUR, eh.mv(K_.div(div_h1_2, es_lag)));
  }

  // =========================================================================
  // BLOCK: commercial banks        (R source: "#### COMMERCIAL BANKS ####")
  // =========================================================================

  // ls reads lf at CUR, which is assigned later in the model -- one of the
  // four previous-iterate sites named in s3.3.
  st.set(ix.z('ls'), CUR, K_.add(st.get(ix.z('lf'), CUR), st.get(ix.z('lh'), CUR)));
  st.set(ix.z('ms'), CUR, st.get(ix.z('mh'), CUR));

  // Holdings of bills and demand for advances: a bank with surplus deposits
  // holds bills, a bank short of them borrows from the central bank. Exactly
  // one of the pair is non-zero, and the zero is ASSIGNED, not left alone --
  // so a region that flips sides between iterations clears the other leg.
  for (let r = 0; r < N; r++) {
    const ms_r = st.get(ix.z('ms')[r], CUR);
    const ls_r = st.get(ix.z('ls')[r], CUR);
    if (ms_r > ls_r) {
      st.set(ix.z('b_b')[r], CUR, ms_r - ls_r);
      st.set(ix.z('a_d')[r], CUR, 0);
    } else {
      st.set(ix.z('a_d')[r], CUR, ls_r - ms_r);
      st.set(ix.z('b_b')[r], CUR, 0);
    }
  }

  // Bank profit -- entirely lagged.
  st.set(ix.z('f_b'), CUR, K_.add(
    K_.sub(
      K_.add(
        K_.mul(st.get(ix.z('rl'), LAG), st.get(ix.z('lf'), LAG)),
        K_.mul(st.get(ix.z('rb'), LAG), st.get(ix.z('b_b'), LAG))
      ),
      K_.mul(st.get(ix.z('rm'), LAG), st.get(ix.z('ms'), LAG))
    ),
    K_.mul(st.get(ix.z('rh'), LAG), st.get(ix.z('lh'), LAG))
  ));

  // =========================================================================
  // BLOCK: government and central bank
  //                   (R source: "#### GOVERNMENT AND CENTRAL BANK ####")
  // =========================================================================

  // Government spending. g_g is 0 in both regions in the shipped calibration,
  // so this is g_lag + g0 in practice -- but the growth term is ported, not
  // folded away, because g_g is a live policy lever the model already supports.
  st.set(ix.z('g'), CUR, K_.add(
    K_.mul(st.get(ix.z('g'), LAG), K_.add(1, P.z('g_g', ix.zlabs))),
    st.get(ix.z('g0'), CUR)
  ));

  // id_g reads da_g at CUR, assigned two statements BELOW it -- the same
  // previous-iterate pattern as `id` reading `da` (s3.3). Then k_g reads both
  // of the values just assigned. Reordering these three changes the iteration.
  st.set(ix.z('id_g'), CUR, K_.add(st.get(ix.z('da_g'), CUR), st.get(ix.z('id0'), CUR)));
  st.set(ix.z('da_g'), CUR, K_.mul(P.z('delta_g', ix.zlabs), st.get(ix.z('k_g'), LAG)));
  st.set(ix.z('k_g'), CUR, K_.sub(
    K_.add(st.get(ix.z('k_g'), LAG), st.get(ix.z('id_g'), CUR)),
    st.get(ix.z('da_g'), CUR)
  ));

  // Income tax. paste0(zlabs, '_b_s_', zlabs) is Z1_b_s_Z1 / Z2_b_s_Z2 -- own
  // holdings only; the cross-border legs are added per region just below.
  let tax = K_.add(
    K_.mul(st.get(ix.z('theta_w'), CUR), st.get(ix.z('wb'), CUR)),
    K_.mul(
      st.get(ix.z('theta_c'), CUR),
      K_.sums(
        st.get(ix.z('div'), CUR),
        K_.mul(st.get(ix.z('rb'), LAG), st.get(bs_own, LAG)),
        K_.mul(st.get(ix.z('rm'), LAG), st.get(ix.z('mh'), LAG))
      )
    )
  );
  st.set(ix.z('t'), CUR, tax);

  // The two cross-border legs, written one region at a time exactly as the R
  // source does.
  //
  // NOTE: BOTH legs convert at sim['Z2_xr', i-1] in the R source -- Z1's leg at
  // :381-385 and Z2's at :386-390. That is transcribed as written. It may be
  // deliberate (xr is pinned at 1 and Z2_xr = 1/Z1_xr, so the two are equal in
  // the shipped calibration and nothing distinguishes them numerically) or it
  // may be a slip that only a floating exchange rate would expose. Either way
  // the port must not silently "fix" it -- flagged for the maintainer.
  const xrZ2_lagv = st.get(ix.at('Z2_xr'), LAG);
  st.set(ix.at('Z1_t'), CUR, st.get(ix.at('Z1_t'), CUR) +
    st.get(ix.at('Z1_theta_c'), CUR) * st.get(ix.at('Z2_rb'), LAG) *
    st.get(ix.at('Z1_b_s_Z2'), LAG) * xrZ2_lagv);
  st.set(ix.at('Z2_t'), CUR, st.get(ix.at('Z2_t'), CUR) +
    st.get(ix.at('Z2_theta_c'), CUR) * st.get(ix.at('Z1_rb'), LAG) *
    st.get(ix.at('Z2_b_s_Z1'), LAG) * xrZ2_lagv);

  // Income tax by industry: va_j * rep(t / va, each = K). The rep(each = K) is
  // the explicit broadcast of a per-region ratio across that region's 54
  // industries -- the kernel would reject the implicit form.
  const t_over_va = K_.div(st.get(ix.z('t'), CUR), st.get(ix.z('va'), CUR));
  const t_j = K_.mul(st.get(ix.zk('va_j'), CUR), K_.repEach(t_over_va, K));
  st.set(ix.zk('t_j'), CUR, t_j);

  // Interest payments on bills by industry
  st.set(ix.zk('int_j'), CUR, K_.sub(
    K_.sub(st.get(ix.zk('va_j'), CUR), st.get(ix.zk('yd_j'), CUR)),
    t_j
  ));

  // =========================================================================
  // BLOCK: VAT, tariff revenue, deficit and government debt
  // =========================================================================

  // Total VAT revenue, on the consuming-jurisdiction principle: each region
  // applies ITS OWN rates to everything it buys regardless of origin. R does
  // that with rep(Z1's 54 rates, 2) -- the same 54 rates across both supply
  // blocs, not zk.lab('vat'), which would give each bloc its own.
  const vatZ1 = K_.rep(st.get(ix.zkOf('vat', 0), CUR), N);
  const vatZ2 = K_.rep(st.get(ix.zkOf('vat', 1), CUR), N);
  const p_all = st.get(ix.zk('p'), CUR);
  st.set(ix.z('vat_rev'), CUR, Float64Array.from([
    c_Z1 * K_.sum(K_.div(K_.mul(K_.mul(p_all, vatZ1), st.get(ix.zk('beta_Z1'), CUR)), K_.add(1, vatZ1))),
    c_Z2 * K_.sum(K_.div(K_.mul(K_.mul(p_all, vatZ2), st.get(ix.zk('beta_Z2'), CUR)), K_.add(1, vatZ2))),
  ]));

  // Total import tariff revenue. THE TARIFF BASE IS AN ARM SWITCH
  // (getOption("leeds.tar_spec")); the three branches are the model's own and
  // are transcribed unchanged. Default "submitted" reproduces the published
  // line and is what every cached run was made under.
  //   submitted       real import volume x tariff rate. No price, no divisor.
  //   author_variant  foreign MARKET price p^f with the (1 + tar) divisor --
  //                   carries the EXPORTING region's VAT, since p = p_t(1+vat).
  //   customs         foreign PRE-VAT price p_t^f with the divisor: the
  //                   destination principle.
  const tarSpec = opts.tar_spec || 'submitted';
  const tar = st.get(ix.zk('tar'), CUR);
  const eta = st.get(ix.zk('eta'), CUR);
  let tarCore;
  if (tarSpec === 'submitted') {
    tarCore = zkSum(K_.mul(tar, eta), K, N);
  } else if (tarSpec === 'author_variant') {
    tarCore = zkSum(K_.div(K_.mul(K_.mul(st.get(ix.revZk('p'), CUR), tar), eta), K_.add(1, tar)), K, N);
  } else if (tarSpec === 'customs') {
    tarCore = zkSum(K_.div(K_.mul(K_.mul(st.get(ix.revZk('p_t'), CUR), tar), eta), K_.add(1, tar)), K, N);
  } else {
    throw new Error(`unknown leeds.tar_spec: ${tarSpec}`);
  }
  st.set(ix.z('tar_rev'), CUR, K_.mul(
    K_.mul(K_.rev(st.get(ix.z('xr'), CUR)), st.get(ix.z('tot_imp'), CUR)),
    tarCore
  ));

  // Government deficit. Reads f_cb at CUR, which is assigned later -- the
  // third of the four previous-iterate sites named in s3.3.
  st.set(ix.z('gdef'), CUR, K_.add(
    K_.sub(
      K_.add(
        K_.sub(
          K_.mul(st.get(ix.z('g'), CUR), st.get(ix.z('pg'), CUR)),
          st.get(ix.z('t'), CUR)
        ),
        K_.mul(st.get(ix.z('rb'), LAG), st.get(ix.z('b_s'), LAG))
      ),
      K_.sums(
        st.get(ix.z('f_cb'), CUR),
        st.get(ix.z('vat_rev'), CUR),
        st.get(ix.z('tar_rev'), CUR)
      )
    ),
    K_.mul(st.get(ix.z('id_g'), CUR), st.get(ix.z('pid_g'), CUR))
  ));

  st.set(ix.z('b_s'), CUR, K_.add(st.get(ix.z('b_s'), LAG), st.get(ix.z('gdef'), CUR)));
  st.set(ix.z('debt_gdp'), CUR, K_.div(st.get(ix.z('b_s'), CUR), st.get(ix.z('va'), CUR)));
  st.set(ix.z('a_s'), CUR, st.get(ix.z('a_d'), CUR));
  st.set(ix.z('h_s'), CUR, st.get(ix.z('h_h'), CUR));

  // =========================================================================
  // BLOCK: central bank and policy rates
  // =========================================================================

  // Supply of bills to households. z.lab(paste0('b_s_', zlabs)) is
  // Z1_b_s_Z1 / Z2_b_s_Z2 -- each region's own bills to its own households.
  st.set(bs_own, CUR, st.get(ix.many(['Z1_b_h_Z1', 'Z2_b_h_Z2']), CUR));
  // Only the Z2->Z1 leg is converted and assigned. Z1_b_s_Z2 is NOT assigned
  // here; the asymmetry is the exchange-rate closure and is in the source.
  st.set(ix.at('Z2_b_s_Z1'), CUR,
    st.get(ix.at('Z2_b_h_Z1'), CUR) * st.get(ix.at('Z2_xr'), CUR));

  // Central bank profit, then Z1's extra leg: Z1 holds the world money, so it
  // earns on its holdings of Z2 bills at Z2's lagged rate and lagged xr.
  st.set(ix.z('f_cb'), CUR,
    K_.mul(st.get(ix.z('rb'), LAG), st.get(ix.z('b_cb'), LAG)));
  st.set(ix.at('Z1_f_cb'), CUR, st.get(ix.at('Z1_f_cb'), CUR) +
    st.get(ix.at('Z2_rb'), LAG) * st.get(ix.at('Z1_b_cb_s_Z2'), LAG) *
    st.get(ix.at('Z2_xr'), LAG));

  // Z2 bills held by Z1's central bank. The R source calls this equation
  // unnecessary; it is ported because it writes a reported variable.
  st.set(ix.at('Z1_b_cb_d_Z2'), CUR,
    st.get(ix.at('Z1_b_cb_s_Z2'), CUR) * st.get(ix.at('Z2_xr'), CUR));

  // Policy rates: each is a spread over r_star. These are also set at t = 1 by
  // run.model() before the loop; here they are re-formed every period.
  for (const [r_, mu_] of [['rm', 'mu_m'], ['rb', 'mu_b'], ['rl', 'mu_l'], ['rh', 'mu_h']]) {
    st.set(ix.z(r_), CUR, K_.add(st.get(ix.z('r_star'), CUR), st.get(ix.z(mu_), CUR)));
  }

  // =========================================================================
  // BLOCK: labour market             (R source: "#### LABOUR MARKET ####")
  // =========================================================================

  // Employment is output divided by productivity, industry by industry.
  const n_j = K_.div(st.get(ix.zk('x'), CUR), st.get(ix.zk('pr'), CUR));
  st.set(ix.z('n'), CUR, zkSum(n_j, K, N));
  st.set(ix.zk('n_j'), CUR, n_j);

  // Female employment by industry: rho is the female share.
  const nf_j = K_.mul(n_j, st.get(ix.zk('rho'), CUR));
  st.set(ix.zk('nf_j'), CUR, nf_j);
  st.set(ix.z('nf'), CUR, zkSum(nf_j, K, N));

  // Wage bill
  const wb_j = K_.mul(st.get(ix.zk('w'), CUR), n_j);
  st.set(ix.zk('wb_j'), CUR, wb_j);
  st.set(ix.z('wb'), CUR, zkSum(wb_j, K, N));

  // =========================================================================
  // BLOCK: household portfolio choices
  //        (R source: "#### PORTFOLIO CHOICES OF DOMESTIC HOUSEHOLDS ####")
  // =========================================================================
  // A Tobin / Godley-Lavoie asset-demand system. In the shipped calibration
  // most of its coefficients are zero -- 29 lambda parameters defined per
  // region, 13 read by the model, 5 non-zero (measured 2026-09-08) -- so this
  // block is largely inert in practice. It is ported in full anyway: the
  // parameters are a live policy surface and the zeros are a calibration, not
  // a structural fact.
  //
  // THE CAPITAL-GAIN TERM IS THE DIVERGENCE MECHANISM. (xr[i] - xr[i-1])/xr[i-1]
  // closes the loop Z1_xr -> Z2_xr -> capital gain -> Z1_b_h_Z2 -> Z1_xr, whose
  // gain at the fixed point is exactly lambda22/lambda20. The solver diverges
  // whenever lambda22 > lambda20 = 0.03, and converges in the shipped model
  // only because lambda22 = 0. Porting this term wrongly would move that
  // threshold silently.
  const xr1_cur = st.get(ix.at('Z1_xr'), CUR), xr1_lag = st.get(ix.at('Z1_xr'), LAG);
  const xr2_cur = st.get(ix.at('Z2_xr'), CUR), xr2_lag = st.get(ix.at('Z2_xr'), LAG);
  const gain1 = (xr1_cur - xr1_lag) / xr1_lag;
  const gain2 = (xr2_cur - xr2_lag) / xr2_lag;

  const v1 = st.get(ix.at('Z1_v'), CUR), v2 = st.get(ix.at('Z2_v'), CUR);
  const yd1 = st.get(ix.at('Z1_yd'), CUR), yd2 = st.get(ix.at('Z2_yd'), CUR);
  const rb1L = st.get(ix.at('Z1_rb'), LAG), rb2L = st.get(ix.at('Z2_rb'), LAG);
  const rm1L = st.get(ix.at('Z1_rm'), LAG), rm2L = st.get(ix.at('Z2_rm'), LAG);
  const L = (nm) => P.get(nm);

  st.set(ix.at('Z1_b_h_Z1'), CUR,
    L('Z1_lambda10') * v1
    + L('Z1_lambda11') * rb1L * v1
    - L('Z1_lambda12') * (rb2L + gain2) * v1
    - L('Z1_lambda13') * rm1L * v1
    - L('Z1_lambda14') * yd1);

  st.set(ix.at('Z1_b_h_Z2'), CUR,
    L('Z1_lambda20') * v1
    - L('Z1_lambda21') * rb1L * v1
    + L('Z1_lambda22') * (rb2L + gain2) * v1
    - L('Z1_lambda23') * rm1L * v1
    - L('Z1_lambda24') * yd1);

  st.set(ix.at('Z2_b_h_Z2'), CUR,
    L('Z2_lambda10') * v2
    - L('Z2_lambda11') * (rb1L + gain1) * v2
    + L('Z2_lambda12') * rb2L * v2
    - L('Z2_lambda13') * rm2L * v2
    - L('Z2_lambda14') * yd2);

  st.set(ix.at('Z2_b_h_Z1'), CUR,
    L('Z2_lambda20') * v2
    + L('Z2_lambda21') * (rb1L + gain1) * v2
    - L('Z2_lambda22') * rb2L * v2
    - L('Z2_lambda23') * rm2L * v2
    - L('Z2_lambda24') * yd2);

  // Demand for shares: intercepts on wealth only.
  st.set(ix.at('Z1_e_h_Z1'), CUR, L('Z1_lambda30') * v1);
  st.set(ix.at('Z1_e_h_Z2'), CUR, L('Z1_lambda40') * v1);
  st.set(ix.at('Z2_e_h_Z1'), CUR, L('Z2_lambda30') * v2);
  st.set(ix.at('Z2_e_h_Z2'), CUR, L('Z2_lambda40') * v2);

  // Cash: a transactions demand on LAGGED nominal consumption.
  st.set(ix.z('h_h'), CUR, K_.mul(
    K_.mul(P.z('lambdac', ix.zlabs), st.get(ix.z('c'), LAG)),
    st.get(ix.z('pa'), LAG)
  ));

  // Deposits are the residual that closes the balance sheet. Reads lh at CUR,
  // assigned in the very next statement -- previous iterate again.
  const bh_own = ix.many(['Z1_b_h_Z1', 'Z2_b_h_Z2']);
  const bh_cross = ix.many(['Z1_b_h_Z2', 'Z2_b_h_Z1']);
  st.set(ix.z('mh'), CUR, K_.add(
    K_.sub(
      st.get(ix.z('v'), CUR),
      K_.sums(
        st.get(bh_own, CUR),
        st.get(ix.z('h_h'), CUR),
        st.get(bh_cross, CUR),
        st.get(ix.z('e_h_Z1'), CUR),
        st.get(ix.z('e_h_Z2'), CUR)
      )
    ),
    st.get(ix.z('lh'), CUR)
  ));

  // Personal loans: repayment of the lagged stock plus the larger of the
  // consumption shortfall and a share of the change in nominal consumption
  // spending. max() of two scalars, per region.
  for (let r = 0; r < N; r++) {
    const z = ix.zlabs[r];
    const iP = ix.zkOf('p', r), iDc = ix.zkOf('dc', r);
    const shortfall =
      st.get(ix.z('c')[r], CUR) * st.get(ix.z('pa')[r], CUR) - st.get(ix.z('yd')[r], CUR);
    const spendNow = K_.sum(K_.mul(st.get(iP, CUR), st.get(iDc, CUR)));
    const spendLag = K_.sum(K_.mul(st.get(iP, LAG), st.get(iDc, LAG)));
    const alt = P.get(`${z}_psi`) * (spendNow - spendLag);
    st.set(ix.z('lh')[r], CUR,
      st.get(ix.z('lh')[r], LAG) * (1 - P.get(`${z}_rep`)) + Math.max(shortfall, alt));
  }

  // =========================================================================
  // BLOCK: prices and the production function
  //           (R source: "#### PRICES AND PRODUCTION FUNCTION ####")
  // =========================================================================

  // Reproduction prices. The first term is p_t %*% A.xr with the DIAGONAL
  // CONTRIBUTION REMOVED (p_t * diag(A)), because a sector's own-input
  // requirement is moved to the denominator instead -- that is what makes this
  // a solved reproduction price rather than a fixed point iterated on.
  const diagA = new Float64Array(nS);
  for (let q = 0; q < nS; q++) diagA[q] = A_new.get(q, q);

  const p_t_in = st.get(ix.zk('p_t'), CUR);
  let ptaux = K_.sub(vmul(p_t_in, A_xr), K_.mul(p_t_in, diagA));
  const one_plus_mu = K_.add(1, st.get(ix.zk('mu'), CUR));
  ptaux = K_.add(
    K_.mul(
      K_.mul(ptaux, one_plus_mu),
      K_.add(1, K_.mul(st.get(ix.zk('kappa'), CUR), K_.repEach(st.get(ix.z('delta'), CUR), K)))
    ),
    K_.div(st.get(ix.zk('w'), CUR), st.get(ix.zk('pr'), CUR))
  );
  st.set(ix.zk('p_t'), CUR, K_.div(ptaux, K_.sub(1, K_.mul(diagA, one_plus_mu))));

  // Potential output. Reads pop_j at CUR, assigned much later -- the fourth of
  // the four previous-iterate sites in s3.3.
  st.set(ix.zk('x_star'), CUR,
    K_.mul(st.get(ix.zk('pr'), CUR), st.get(ix.zk('pop_j'), CUR)));

  // Market prices including VAT. NOTE x_star is read at i-1 here, not at the
  // value just assigned two statements above -- the output gap is measured
  // against LAST period's potential.
  st.set(ix.zk('p'), CUR, K_.mul(
    K_.add(
      st.get(ix.zk('p_t'), CUR),
      K_.mul(
        st.get(ix.zk('gamma_x'), CUR),
        K_.sub(st.get(ix.zk('x'), CUR), st.get(ix.zk('x_star'), LAG))
      )
    ),
    K_.add(1, st.get(ix.zk('vat'), CUR))
  ));

  // Average prices: each is the new price vector weighted by one region's
  // share vector, summed over all 108 industries.
  const p_new = st.get(ix.zk('p'), CUR);
  const avg = (share1, share2) => Float64Array.from([
    K_.sum(K_.mul(p_new, st.get(ix.zk(share1), CUR))),
    K_.sum(K_.mul(p_new, st.get(ix.zk(share2), CUR))),
  ]);
  st.set(ix.z('pa'), CUR, avg('beta_Z1', 'beta_Z2'));
  st.set(ix.z('pid'), CUR, avg('iota_Z1', 'iota_Z2'));
  st.set(ix.z('pid_g'), CUR, avg('iota_g_Z1', 'iota_g_Z2'));
  st.set(ix.z('pg'), CUR, avg('sigma_Z1', 'sigma_Z2'));

  // Average import price. The importer is charged the OTHER region's prices
  // and tariffs (rev.zk.lab) but netted of its OWN vat (zk.lab) -- the two
  // index forms appear in the same expression and are not interchangeable.
  st.set(ix.z('pim'), CUR, K_.mul(
    zkSum(
      K_.mul(
        K_.mul(
          st.get(ix.revZk('p'), CUR),
          K_.sub(K_.add(1, st.get(ix.revZk('tar'), CUR)), st.get(ix.zk('vat'), CUR))
        ),
        st.get(ix.zk('eta'), CUR)
      ), K, N
    ),
    K_.rev(st.get(ix.z('xr'), CUR))
  ));

  // =========================================================================
  // BLOCK: ecological -- energy, resources, waste and emissions
  // =========================================================================
  // TWO ARM SWITCHES LIVE HERE, and they are the whole difference between the
  // `customs` and `revised` arms.

  // waste_spec: which rows of A count as waste-treatment purchases. The
  // subtraction rows and the zeroing index MUST move together -- the zeroed
  // sectors are the destination of waste, not a source of it, so zeroing
  // position 54 while subtracting rows {30,50,51,52,53} is wrong by 1.9-3.1%.
  //   last_sector  rows N*K -- the LAST sector of each regional block. Correct
  //                in the stylized 5-sector model this line came from, stale
  //                ever since: sector 54 of 54 is `Other Services`. The default.
  //   treatment    {30,50,51,52,53} -- Recycling, Waste Incineration, Biogas &
  //                Composting, Waste Water, Landfill.
  const wasteSpec = opts.waste_spec || 'last_sector';
  let wasteRows;   // 0-based
  if (wasteSpec === 'last_sector') {
    wasteRows = Array.from({ length: N }, (_, r) => (r + 1) * K - 1);
  } else if (wasteSpec === 'treatment') {
    wasteRows = [];
    for (let r = 0; r < N; r++) for (const s of [30, 50, 51, 52, 53]) wasteRows.push(s - 1 + r * K);
  } else {
    throw new Error(`unknown leeds.waste_spec: ${wasteSpec}`);
  }

  // colSums(A[waste_rows, , drop = FALSE]): for each column, the waste-treatment
  // output used per unit of that column's output.
  const wasteCol = new Float64Array(nS);
  for (let c2 = 0; c2 < nS; c2++) {
    let s = 0;
    const base = c2 * nS;
    for (const r of wasteRows) s += A_new.d[base + r];
    wasteCol[c2] = s;
  }

  const x_cur = st.get(ix.zk('x'), CUR);
  const zeta = st.get(ix.zk('zeta'), CUR);
  const grossWaste = K_.mul(x_cur, zeta);
  const treated = K_.mul(x_cur, wasteCol);

  // Waste STOCK, then waste FLOW. The stock adds the lagged flow; the flow does
  // not. Two nearly identical statements a few lines apart.
  const was_j = K_.sub(K_.add(st.get(ix.zk('wa_j'), LAG), grossWaste), treated);
  for (const r of wasteRows) was_j[r] = 0;
  st.set(ix.zk('was_j'), CUR, was_j);
  st.set(ix.z('was'), CUR, zkSum(was_j, K, N));

  const wa_j = K_.sub(grossWaste, treated);
  for (const r of wasteRows) wa_j[r] = 0;
  st.set(ix.zk('wa_j'), CUR, wa_j);
  st.set(ix.z('wa'), CUR, zkSum(wa_j, K, N));

  // Emissions, land and water: output times an intensity vector each.
  for (const [out_, int_] of [['emis', 'eps'], ['land', 'lambda_j'], ['water', 'omega_j']]) {
    const v = K_.mul(x_cur, st.get(ix.zk(int_), CUR));
    st.set(ix.zk(`${out_}_j`), CUR, v);
    st.set(ix.z(out_), CUR, zkSum(v, K, N));
  }

  st.set(ix.z('co2_cum'), CUR,
    K_.add(st.get(ix.z('co2_cum'), LAG), st.get(ix.z('emis'), CUR)));

  // Matter. mat reads rec, assigned in the NEXT statement; rec reads dis,
  // assigned in the one after that. Two more previous-iterate reads, chained.
  const mu_mat = st.get(ix.zk('mu_mat'), CUR);
  st.set(ix.z('x_mat'), CUR, zkSum(K_.mul(x_cur, mu_mat), K, N));
  st.set(ix.z('mat'), CUR,
    K_.sub(st.get(ix.z('x_mat'), CUR), st.get(ix.z('rec'), CUR)));

  // rec_spec: which sectors count as producing recycled matter.
  //   sector5    mu_mat-5 * x-5, the published line. Sector 5 is Fossil-Fuel
  //              Extraction; the 5 is an artifact of the stylized model and was
  //              never re-indexed. This term is 99.89% of Z1_rec, so it nets
  //              ~65% off reported primary material extraction. The default.
  //   secondary  {12,14,18,22,25,27,30,37} -- the seven Re-processing sectors
  //              plus Recycling, which are exactly what the CE scenarios shock.
  const recSpec = opts.rec_spec || 'sector5';
  let recCore;
  if (recSpec === 'sector5') {
    recCore = K_.mul(
      st.get(ix.many(ix.zlabs.map((z) => `${z}_mu_mat-5`)), CUR),
      st.get(ix.many(ix.zlabs.map((z) => `${z}_x-5`)), CUR)
    );
  } else if (recSpec === 'secondary') {
    const secondary = new Set([12, 14, 18, 22, 25, 27, 30, 37]);
    const mask = new Float64Array(nS);
    for (let r = 0; r < N; r++) {
      for (let k = 1; k <= K; k++) mask[r * K + k - 1] = secondary.has(k) ? 1 : 0;
    }
    recCore = zkSum(K_.mul(K_.mul(mu_mat, x_cur), mask), K, N);
  } else {
    throw new Error(`unknown leeds.rec_spec: ${recSpec}`);
  }
  st.set(ix.z('rec'), CUR, K_.add(
    K_.mul(st.get(ix.z('rho_dis'), CUR), st.get(ix.z('dis'), CUR)),
    recCore
  ));

  st.set(ix.z('dis'), CUR, zkSum(
    K_.mul(K_.mul(mu_mat, st.get(ix.zk('zeta_dc'), LAG)), st.get(ix.zk('dc'), LAG)),
    K, N
  ));

  // Stock of durable consumption goods
  const dc_lag = st.get(ix.zk('dc'), LAG);
  st.set(ix.zk('dc'), CUR, K_.sub(
    K_.sums(
      dc_lag,
      K_.mul(st.get(ix.zk('beta_Z1'), CUR), c_Z1),
      K_.mul(st.get(ix.zk('beta_Z2'), CUR), c_Z2)
    ),
    K_.mul(st.get(ix.zk('zeta_dc'), LAG), dc_lag)
  ));

  // Energy
  const eps_en = st.get(ix.zk('eps_en'), CUR);
  st.set(ix.z('en'), CUR, zkSum(K_.mul(eps_en, x_cur), K, N));
  st.set(ix.z('ren'), CUR,
    zkSum(K_.mul(K_.mul(eps_en, st.get(ix.zk('eta_en'), CUR)), x_cur), K, N));
  st.set(ix.z('nen'), CUR,
    K_.sub(st.get(ix.z('en'), CUR), st.get(ix.z('ren'), CUR)));

  // =========================================================================
  // BLOCK: global stocks of matter and energy, and temperature
  // =========================================================================
  // These are the model's only truly global variables -- no region prefix.
  //
  // NOTE THE SIGN ASYMMETRY between the two reserve stocks, transcribed as
  // written: kmat ADDS conv_mat (resources converted INTO reserves) while ken
  // SUBTRACTS conv_en. Both res_* stocks subtract their conv_*. Whether the
  // energy line is intended or is a sign slip is not something the port can
  // settle; it is reproduced exactly and flagged.
  //
  // conv_mat reads res_mat at CUR, assigned two statements later; conv_en does
  // the same with res_en. Previous-iterate reads again.
  st.set(ix.at('conv_mat'), CUR, P.get('sigma_mat') * st.get(ix.at('res_mat'), CUR));
  st.set(ix.at('kmat'), CUR,
    st.get(ix.at('kmat'), LAG) + st.get(ix.at('conv_mat'), CUR)
    - K_.sum(st.get(ix.z('mat'), CUR)));
  st.set(ix.at('res_mat'), CUR,
    st.get(ix.at('res_mat'), LAG) - st.get(ix.at('conv_mat'), CUR));

  st.set(ix.at('conv_en'), CUR, P.get('sigma_en') * st.get(ix.at('res_en'), CUR));
  st.set(ix.at('ken'), CUR,
    st.get(ix.at('ken'), LAG) - st.get(ix.at('conv_en'), CUR)
    - K_.sum(st.get(ix.z('nen'), CUR)));
  st.set(ix.at('res_en'), CUR,
    st.get(ix.at('res_en'), LAG) - st.get(ix.at('conv_en'), CUR));

  // Atmospheric temperature: TCRE on cumulative emissions, grossed up for the
  // non-carbon forcing share.
  st.set(ix.at('temp'), CUR,
    P.get('tcre') * K_.sum(st.get(ix.z('co2_cum'), CUR)) / (1 - P.get('fnc')));

  // =========================================================================
  // BLOCK: balance of payments -- imports, exports, trade balance
  //              (R source: "#### BALANCE OF PAYMENTS ####")
  // =========================================================================

  // Real intermediate imports. For each region the R source forms
  //   sum(A[, foo] %*% x[foo]) - sum(A[foo, foo] %*% x[foo])
  // where foo is that region's 54 columns: total inputs into its production,
  // less the part sourced from itself -- so what is left is sourced abroad.
  for (let r = 0; r < N; r++) {
    const c0 = r * K;
    let all = 0, own = 0;
    for (let c2 = c0; c2 < c0 + K; c2++) {
      const xc = x_cur[c2];
      if (xc === 0) continue;
      const base = c2 * nS;
      let sAll = 0, sOwn = 0;
      for (let q = 0; q < nS; q++) sAll += A_new.d[base + q];
      for (let q = c0; q < c0 + K; q++) sOwn += A_new.d[base + q];
      all += sAll * xc;
      own += sOwn * xc;
    }
    st.set(ix.at(`${ix.zlabs[r]}_M_TOT_int`), CUR, all - own);
  }

  // Real final imports. Before t = 10 the relative-price term is switched off
  // and the income term is in NOMINAL disposable income; from t = 10 the full
  // Armington form applies with income deflated by pa. The two branches are not
  // continuous in level, which is in the model as written.
  //
  // The mu1 elasticity's provenance is unknown (recorded 2026-09-11); it is
  // used here exactly as calibrated.
  const yd_lag = st.get(ix.z('yd'), LAG);
  const mu0 = P.z('mu0', ix.zlabs), mu1 = P.z('mu1', ix.zlabs), mu2 = P.z('mu2', ix.zlabs);
  if (t < 10) {
    // R's ifelse(yd, exp(...), 0): the condition is the NUMBER yd, so a zero
    // lagged disposable income yields zero imports rather than exp(-Inf).
    const imp = new Float64Array(N);
    for (let r = 0; r < N; r++) {
      imp[r] = yd_lag[r] ? Math.exp(mu0[r] + mu2[r] * Math.log(yd_lag[r])) : 0;
    }
    st.set(ix.z('imp'), CUR, imp);
  } else {
    const pim_lag = st.get(ix.z('pim'), LAG), pa_lag = st.get(ix.z('pa'), LAG);
    st.set(ix.z('imp'), CUR, K_.exp(K_.add(
      K_.sub(mu0, K_.mul(mu1, K_.sub(K_.log(pim_lag), K_.log(pa_lag)))),
      K_.mul(mu2, K_.log(K_.div(yd_lag, pa_lag)))
    )));
  }

  st.set(ix.z('tot_imp'), CUR,
    K_.add(st.get(ix.z('imp'), CUR), st.get(ix.z('M_TOT_int'), CUR)));
  st.set(ix.z('nimp'), CUR,
    K_.mul(st.get(ix.z('pim'), CUR), st.get(ix.z('tot_imp'), CUR)));

  // One region's exports are the other's imports -- rev() is the cross-region
  // swap. Nominal exports convert the OTHER region's nominal imports at ITS own
  // rate: rev(nimp * xr), the whole product reversed, not rev(nimp) * xr.
  st.set(ix.z('rex'), CUR, K_.rev(st.get(ix.z('imp'), CUR)));
  st.set(ix.z('nex'), CUR,
    K_.rev(K_.mul(st.get(ix.z('nimp'), CUR), st.get(ix.z('xr'), CUR))));
  st.set(ix.z('tb'), CUR,
    K_.sub(st.get(ix.z('nex'), CUR), st.get(ix.z('nimp'), CUR)));

  // =========================================================================
  // BLOCK: current account, financial account, and the exchange-rate closure
  //                            (R source: MVP_model_2026.R:836-949)
  // =========================================================================
  // The most intricate block in the model and the one with the most
  // cross-region label gymnastics, so every label list below is written out as
  // an explicit per-region rule rather than as a rev() of a rev(). The naming
  // convention throughout: `Zi_b_s_Zj` is the supply of Zj-ISSUED bills held by
  // Zi's sector, and `Zi_e_s_Zj` the same for equity.
  //
  // Several statements here name Z1 and Z2 literally, and the c(1, -1) sign
  // vector in the official-sector term is two-region by construction. Those are
  // reproduced as literals rather than dressed up in a loop over ix.zlabs: a
  // generic form would be false generality, since the R statement itself is not
  // generic.

  // Label lists used by cab and kabp.
  //   bsMineOfYours[r] = `Z<r>_b_s_Z<other>`  -- R's paste0(z.lab('b_s'), '_', rev(zlabs))
  //   bsYoursOfMine[r] = `Z<other>_b_s_Z<r>`  -- R's paste0(rev(z.lab('b_s')), '_', zlabs)
  const bsMineOfYours =
    ix.many(ix.zlabs.map((z, r) => `${z}_b_s_${ix.zlabs[N - 1 - r]}`));
  const bsYoursOfMine =
    ix.many(ix.zlabs.map((z, r) => `${ix.zlabs[N - 1 - r]}_b_s_${z}`));
  const esMineOfYours = esCrossOfMine;   // `Z<r>_e_s_Z<other>`, built above
  const esYoursOfMine =
    ix.many(ix.zlabs.map((z, r) => `${ix.zlabs[N - 1 - r]}_e_s_${z}`));

  const rb_lag = st.get(ix.z('rb'), LAG);
  const xr_cur_z = st.get(ix.z('xr'), CUR);
  const xr_lag_z = st.get(ix.z('xr'), LAG);

  // Current account: trade balance, plus interest RECEIVED on the foreign bills
  // this region's households hold (converted at the issuer's rate), less
  // interest PAID to the other region's holders of this region's bills.
  //
  // R evaluates `tb + A - B + C` as `((tb + A) - B) + C`, and each product
  // left to right. Written in that order here because the terms are of similar
  // magnitude and opposite sign, so the association is not cosmetic.
  let cab = K_.add(
    st.get(ix.z('tb'), CUR),
    K_.mul(
      K_.mul(K_.rev(rb_lag), st.get(bsMineOfYours, LAG)),
      K_.rev(xr_lag_z)
    )
  );
  cab = K_.sub(cab, K_.mul(rb_lag, st.get(bsYoursOfMine, LAG)));

  // The official-sector leg: interest on the Z2 bills held by Z1's CENTRAL
  // BANK. It is a receipt for Z1 (+1, converted at Z2's rate) and a payment for
  // Z2 (-1, already in Z2's own currency) -- hence c(1, -1) against
  // c(Z2_xr, 1), and hence a term with no counterpart in the household legs
  // above. This is the same circuit the 2026-09-11 spectrum analysis found
  // carrying the model's RoW unstable root.
  let official = K_.mul(Float64Array.of(1, -1), st.get(ix.at('Z2_rb'), LAG));
  official = K_.mul(official, st.get(ix.at('Z1_b_cb_s_Z2'), LAG));
  official = K_.mul(official,
    Float64Array.of(st.get(ix.at('Z2_xr'), LAG), 1));
  cab = K_.add(cab, official);

  // Cross-border dividend flows, but ONLY when no region had zero shares
  // outstanding last period.
  //   R: if (!sum(sim[z.lab('e_s'), i-1] == 0))
  // `sum()` over the logical vector counts the zeros and `!` is TRUE only at a
  // count of zero -- so the guard is "NEITHER region", not "not both". The
  // household block's twin guard at R:125 is written the other way round
  // (`sum(...) > 0`) for the opposite branch; they agree, but the reader has to
  // check, so it is stated here.
  const es_lag_z = st.get(ix.z('e_s'), LAG);
  let anyZeroEsLag = false;
  for (let r = 0; r < N; r++) if (es_lag_z[r] === 0) anyZeroEsLag = true;
  if (!anyZeroEsLag) {
    const omega_z = P.z('omega', ix.zlabs);
    const f_f_cur = st.get(ix.z('f_f'), CUR);
    // Received: the other region's distributed profit, on the share of its
    // equity this region's households hold, converted at the other's rate.
    let recv = K_.mul(K_.rev(xr_cur_z), K_.sub(1, K_.rev(omega_z)));
    recv = K_.mul(recv, K_.rev(f_f_cur));
    recv = K_.mul(recv, st.get(esMineOfYours, LAG));
    recv = K_.div(recv, K_.rev(es_lag_z));
    // Paid: this region's distributed profit on the equity foreigners hold.
    let paid = K_.mul(K_.sub(1, omega_z), f_f_cur);
    paid = K_.mul(paid, st.get(esYoursOfMine, LAG));
    paid = K_.div(paid, es_lag_z);
    cab = K_.sub(K_.add(cab, recv), paid);
  }

  // Net cross-border tariff settlement (added to the R model 2026-09-11 by
  // R/bop_audit.R). yn deducts the PARTNER's tariff revenue from domestic
  // income -- exporters bear the tariff levied on their goods abroad -- while
  // gdef credits the OWN. The trade balance carries both at gross value, so
  // without this line the current account overstates Z1's net lending by
  // xr*tar_rev(Z2) - tar_rev(Z1) and the balance of payments does not close.
  //
  // ⚠️ If the consistent price block of the 2026-09-11 design is ever
  // implemented, ITS §3.2 requires this line to be SKIPPED, because trade
  // valued at the customs value already reproduces the settlement. The port
  // will have to gain that switch at the same time as the R model does.
  cab = K_.sub(
    K_.add(cab, st.get(ix.z('tar_rev'), CUR)),
    K_.mul(K_.rev(xr_cur_z), K_.rev(st.get(ix.z('tar_rev'), CUR)))
  );
  st.set(ix.z('cab'), CUR, cab);

  // Financial account net of official transactions: the change in foreign
  // claims on this region, less the change in this region's claims abroad
  // converted at the other region's rate, for bills and then for equity.
  // R's six terms associate left to right: ((((a - b) - c) + d) - e) - f.
  const dBillsIn = K_.sub(st.get(bsYoursOfMine, CUR), st.get(bsYoursOfMine, LAG));
  const dBillsOut = K_.sub(st.get(bsMineOfYours, CUR), st.get(bsMineOfYours, LAG));
  const dEqIn = K_.sub(st.get(esYoursOfMine, CUR), st.get(esYoursOfMine, LAG));
  const dEqOut = K_.sub(st.get(esMineOfYours, CUR), st.get(esMineOfYours, LAG));
  const xrRevCur = K_.rev(xr_cur_z);
  st.set(ix.z('kabp'), CUR, K_.sub(
    K_.add(
      K_.sub(dBillsIn, K_.mul(dBillsOut, xrRevCur)),
      dEqIn
    ),
    K_.mul(dEqOut, xrRevCur)
  ));

  // Net accumulation of financial assets. cab is read here and nowhere else.
  st.set(ix.z('nafa'), CUR,
    K_.add(st.get(ix.z('gdef'), CUR), st.get(ix.z('cab'), CUR)));

  // -- Exchange rate closures (Godley & Lavoie 2007, pp. 460-464) ------------
  //
  // ⚠️ THE SHIPPED MODEL IS ON THE FIXED-RATE CLOSURE. Z1_xr is set to its own
  // lagged value at the END of this block, so it never moves, and Z2_xr is its
  // reciprocal. The floating closure (12.89FL-12.91FL) and the quasi-floating
  // regime are commented out in the R source and are NOT ported: reinstating
  // them creates the loop Z1_xr -> Z2_xr -> capital gain -> Z1_b_h_Z2 -> Z1_xr
  // whose gain at the fixed point is lambda22/lambda20, so Gauss-Seidel
  // diverges whenever lambda22 > lambda20 = 0.03 (measured 2026-09-07). The
  // shipped model converges only because lambda22 = 0.
  //
  // NOTE THE SEQUENCE. Z2_xr is computed from Z1_xr's PREVIOUS-ITERATE current
  // value, then used by Z1_b_cb below, and only afterwards is Z1_xr itself
  // written. Reordering these three statements changes the iterate.
  st.set(ix.at('Z2_xr'), CUR, 1 / st.get(ix.at('Z1_xr'), CUR));

  // Z1 central bank's holdings of Z1 bills (G&L 12.84, advances added 2023).
  // The `or` (reserves) term is carried because the R statement carries it;
  // both Z1_or and Z2_or are assigned nowhere in the model -- their assignments
  // are commented out at R:887-888 -- so the term is identically zero on every
  // path the shipped model can take. Transcribed, not dropped.
  st.set(ix.at('Z1_b_cb'), CUR,
    st.get(ix.at('Z1_b_cb'), LAG)
    + (st.get(ix.at('Z1_h_s'), CUR) - st.get(ix.at('Z1_h_s'), LAG))
    - (st.get(ix.at('Z1_a_s'), CUR) - st.get(ix.at('Z1_a_s'), LAG))
    - (st.get(ix.at('Z1_b_cb_s_Z2'), CUR) - st.get(ix.at('Z1_b_cb_s_Z2'), LAG))
      * st.get(ix.at('Z2_xr'), CUR)
    - (st.get(ix.at('Z1_or'), CUR) - st.get(ix.at('Z1_or'), LAG))
      * st.get(ix.at('Z1_p_or'), CUR));

  // Z2 central bank's holdings of Z2 bills (G&L 12.83). Note this is a LEVEL,
  // where Z1's is a DIFFERENCE on its own lag -- the asymmetry is in the model
  // as written and is what makes Z1 the world-money issuer here.
  st.set(ix.at('Z2_b_cb'), CUR,
    st.get(ix.at('Z2_h_s'), CUR)
    - st.get(ix.at('Z2_or'), CUR) * st.get(ix.at('Z2_p_or'), CUR)
    - st.get(ix.at('Z2_a_s'), CUR));

  // FIXED EXCHANGE RATE CLOSURE (the live one).
  // Supply of Z2 bills to Z1's households ------------------------------ 12.89F
  st.set(ix.at('Z1_b_s_Z2'), CUR,
    st.get(ix.at('Z1_b_h_Z2'), CUR) * st.get(ix.at('Z1_xr'), CUR));

  // Supply of Z2 bills to Z1's central bank ---------------------------- 12.90F
  // The residual: whatever of Z2's bill issue nobody else holds. This is what
  // makes Z1's central bank the residual buyer of RoW debt.
  st.set(ix.at('Z1_b_cb_s_Z2'), CUR,
    st.get(ix.at('Z2_b_s'), CUR)
    - st.get(ix.at('Z1_b_s_Z2'), CUR)
    - st.get(ix.at('Z2_b_s_Z2'), CUR)
    - st.get(ix.at('Z2_b_cb'), CUR)
    - st.get(ix.at('Z2_b_b'), CUR));

  // Exchange rate: Z1 currency in terms of Z2, exogenous ---------------- 12.91F
  st.set(ix.at('Z1_xr'), CUR, st.get(ix.at('Z1_xr'), LAG));

  // R:948 carries a commented "hidden equation used for consistency check"
  // (12.82A) and R:975-978 computes an `error` scalar from it. That scalar is
  // assigned to a local and never returned or read, so there is nothing for the
  // port to reproduce; it is noted so a later reader does not think it was
  // missed.

  // =========================================================================
  // BLOCK: labour force, immigration and the female employment share
  //                            (R source: MVP_model_2026.R:950-972)
  // =========================================================================
  // Before t = 76 the population of each industry IS its employment -- no
  // unemployment by construction -- and the demographic block only switches on
  // afterwards. The threshold is a literal 75 in the R source, unrelated to
  // t.shock = 70.
  if (t <= 75) {
    st.set(ix.zk('pop_j'), CUR, st.get(ix.zk('n_j'), CUR));
  } else {
    // PREVIOUS-ITERATE READ: `imm` at CUR, assigned two statements later, both
    // as this region's inflow and (via revZk) as the other region's.
    st.set(ix.zk('pop_j'), CUR, K_.sub(
      K_.add(
        K_.mul(
          st.get(ix.zk('pop_j'), LAG),
          K_.add(1, st.get(ix.zk('g_pop'), CUR))
        ),
        st.get(ix.zk('imm'), CUR)
      ),
      st.get(ix.revZk('imm'), CUR)
    ));
  }

  // Unemployment rate by industry.
  st.set(ix.zk('un'), CUR, K_.sub(
    1,
    K_.div(st.get(ix.zk('n_j'), CUR), st.get(ix.zk('pop_j'), CUR))
  ));

  // Immigration: a constant share of last period's population, plus responses
  // to LAGGED unemployment and to the wage CHANGE. un was assigned one
  // statement ago at CUR and is deliberately read at LAG here.
  st.set(ix.zk('imm'), CUR, K_.sums(
    K_.mul(st.get(ix.zk('gamma_imm_0'), CUR), st.get(ix.zk('pop_j'), LAG)),
    K_.mul(st.get(ix.zk('gamma_imm_1'), CUR), st.get(ix.zk('un'), LAG)),
    K_.mul(
      st.get(ix.zk('gamma_imm_2'), CUR),
      K_.sub(st.get(ix.zk('w'), CUR), st.get(ix.zk('w'), LAG))
    )
  ));

  // Female employment share by industry. Read by nf_j at R:509, far ABOVE this
  // statement, so nf_j uses the previous iterate of rho -- already transcribed
  // that way in the labour-market block.
  st.set(ix.zk('rho'), CUR, K_.sub(
    st.get(ix.zk('parw0'), CUR),
    K_.mul(
      st.get(ix.zk('parw1'), CUR),
      K_.sub(st.get(ix.zk('w'), CUR), st.get(ix.zk('w'), LAG))
    )
  ));

  const A_out = new Float64Array(2 * nA);
  A_out.set(A_prev.d, 0);
  A_out.set(A_new.d, nA);

  return { y: st.out(), A: A_out };
}
