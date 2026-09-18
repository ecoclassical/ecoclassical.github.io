// ---------------------------------------------------------------------------
// kernel.mjs -- the numeric primitives the ported model is written in.
//
// Design: qmd/plans/2026-09-15-browser-engine-and-arm-registry-design.md, s3.4.
//
// The model is ~400 R statements of vectorised arithmetic over a 6,713-row
// state vector. Porting them one-for-one needs a vocabulary that behaves like
// R's -- with ONE deliberate exception, stated first because it is the whole
// reason this file exists rather than raw array loops.
//
// ---------------------------------------------------------------------------
// RECYCLING IS AN ERROR, NOT A FEATURE  (s3.4.4)
//
// R silently recycles a short vector against a long one: `x * y` with
// length(x) = 2 and length(y) = 108 repeats x 54 times. The model relies on
// this in places, but ALWAYS through the explicit form `rep(x, each = K)`,
// which appears 15 times. An implicit recycle that the porter did not intend
// is a bug that produces plausible numbers and no error.
//
// So every binary op here REJECTS mismatched lengths. Where the R source
// recycles, the port must say so with rep() / repEach(). This converts a class
// of silent numerical error into a loud crash.
// ---------------------------------------------------------------------------

export class LengthError extends Error {
  constructor(op, a, b) {
    super(`${op}: length mismatch ${a} vs ${b} -- R would recycle here; the port must use rep()/repEach() explicitly`);
    this.name = 'LengthError';
  }
}

const isNum = (x) => typeof x === 'number';

// --- elementwise binary ops -------------------------------------------------
// A scalar is allowed against a vector (R's own scalar broadcast, which is
// unambiguous). Two vectors must match exactly.

function zipWith(op, name) {
  return (a, b) => {
    if (isNum(a) && isNum(b)) return op(a, b);
    if (isNum(a)) {
      const out = new Float64Array(b.length);
      for (let i = 0; i < b.length; i++) out[i] = op(a, b[i]);
      return out;
    }
    if (isNum(b)) {
      const out = new Float64Array(a.length);
      for (let i = 0; i < a.length; i++) out[i] = op(a[i], b);
      return out;
    }
    if (a.length !== b.length) throw new LengthError(name, a.length, b.length);
    const out = new Float64Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = op(a[i], b[i]);
    return out;
  };
}

export const add = zipWith((x, y) => x + y, 'add');
export const sub = zipWith((x, y) => x - y, 'sub');
export const mul = zipWith((x, y) => x * y, 'mul');
export const div = zipWith((x, y) => x / y, 'div');
export const pow = zipWith((x, y) => Math.pow(x, y), 'pow');

// sum of any number of terms, left to right -- IN SOURCE ORDER.
// Floating-point addition is not associative, so `a + b + c` and `a + (b + c)`
// differ in the last bits. R evaluates left to right and so does this.
export function sums(...xs) {
  return xs.reduce((acc, x) => add(acc, x));
}

// --- unary ------------------------------------------------------------------
const mapv = (f) => (x) => {
  if (isNum(x)) return f(x);
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = f(x[i]);
  return out;
};

export const neg = mapv((v) => -v);
export const log = mapv(Math.log);
export const exp = mapv(Math.exp);
export const abs = mapv(Math.abs);

export function sum(x) {
  if (isNum(x)) return x;
  // left-to-right, matching R's sum() accumulation order
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i];
  return s;
}

export function maxv(x) {
  if (isNum(x)) return x;
  let m = -Infinity;
  for (let i = 0; i < x.length; i++) if (x[i] > m) m = x[i];
  return m;
}

// R's rev()
export function rev(x) {
  if (isNum(x)) return x;
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[x.length - 1 - i];
  return out;
}

export function cumsum(x) {
  const out = new Float64Array(x.length);
  let s = 0;
  for (let i = 0; i < x.length; i++) { s += x[i]; out[i] = s; }
  return out;
}

// R's rep(x, times = n) -- whole vector repeated
export function rep(x, times) {
  const v = isNum(x) ? Float64Array.of(x) : x;
  const out = new Float64Array(v.length * times);
  for (let t = 0; t < times; t++) out.set(v, t * v.length);
  return out;
}

// R's rep(x, each = k) -- each element repeated. This is the explicit form the
// model uses 15 times where it means to broadcast a per-region value across
// that region's sectors.
export function repEach(x, each) {
  const v = isNum(x) ? Float64Array.of(x) : x;
  const out = new Float64Array(v.length * each);
  let p = 0;
  for (let i = 0; i < v.length; i++) for (let k = 0; k < each; k++) out[p++] = v[i];
  return out;
}

export function fill(value, n) {
  const out = new Float64Array(n);
  out.fill(value);
  return out;
}

export function seqLen(n) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = i + 1;
  return out;
}

// R's ifelse() over vectors
export function ifelse(cond, yes, no) {
  const n = cond.length;
  const out = new Float64Array(n);
  const pick = (v, i) => (isNum(v) ? v : v[i]);
  for (let i = 0; i < n; i++) out[i] = cond[i] ? pick(yes, i) : pick(no, i);
  return out;
}

// ---------------------------------------------------------------------------
// Matrices -- COLUMN-MAJOR, matching R and matching the exported binaries.
// Element (r, c) of an nrow x ncol matrix is at c * nrow + r.
// ---------------------------------------------------------------------------

export class Mat {
  constructor(data, nrow, ncol) {
    if (data.length !== nrow * ncol) {
      throw new LengthError('Mat', data.length, nrow * ncol);
    }
    this.d = data instanceof Float64Array ? data : Float64Array.from(data);
    this.nrow = nrow;
    this.ncol = ncol;
  }
  static zeros(nrow, ncol) { return new Mat(new Float64Array(nrow * ncol), nrow, ncol); }
  static filled(v, nrow, ncol) { const m = Mat.zeros(nrow, ncol); m.d.fill(v); return m; }
  get(r, c) { return this.d[c * this.nrow + r]; }
  set(r, c, v) { this.d[c * this.nrow + r] = v; }
  clone() { return new Mat(this.d.slice(), this.nrow, this.ncol); }

  // elementwise, shapes must match exactly
  ewise(other, op, name) {
    if (isNum(other)) {
      const out = new Float64Array(this.d.length);
      for (let i = 0; i < this.d.length; i++) out[i] = op(this.d[i], other);
      return new Mat(out, this.nrow, this.ncol);
    }
    if (this.nrow !== other.nrow || this.ncol !== other.ncol) {
      throw new LengthError(`Mat.${name}`, `${this.nrow}x${this.ncol}`, `${other.nrow}x${other.ncol}`);
    }
    const out = new Float64Array(this.d.length);
    for (let i = 0; i < this.d.length; i++) out[i] = op(this.d[i], other.d[i]);
    return new Mat(out, this.nrow, this.ncol);
  }
  mulE(o) { return this.ewise(o, (x, y) => x * y, 'mulE'); }
  addE(o) { return this.ewise(o, (x, y) => x + y, 'addE'); }
  subE(o) { return this.ewise(o, (x, y) => x - y, 'subE'); }

  // matrix %*% vector
  mv(v) {
    if (v.length !== this.ncol) throw new LengthError('Mat.mv', this.ncol, v.length);
    const out = new Float64Array(this.nrow);
    for (let c = 0; c < this.ncol; c++) {
      const base = c * this.nrow;
      const vc = v[c];
      if (vc === 0) continue;
      for (let r = 0; r < this.nrow; r++) out[r] += this.d[base + r] * vc;
    }
    return out;
  }

  // colSums()
  colSums() {
    const out = new Float64Array(this.ncol);
    for (let c = 0; c < this.ncol; c++) {
      let s = 0;
      const base = c * this.nrow;
      for (let r = 0; r < this.nrow; r++) s += this.d[base + r];
      out[c] = s;
    }
    return out;
  }

  transpose() {
    const out = Mat.zeros(this.ncol, this.nrow);
    for (let c = 0; c < this.ncol; c++) {
      for (let r = 0; r < this.nrow; r++) out.set(c, r, this.get(r, c));
    }
    return out;
  }

  setDiag(v) {
    const n = Math.min(this.nrow, this.ncol);
    for (let i = 0; i < n; i++) this.set(i, i, isNum(v) ? v : v[i]);
    return this;
  }
}

export function diagMat(v) {
  const n = v.length;
  const m = Mat.zeros(n, n);
  for (let i = 0; i < n; i++) m.set(i, i, v[i]);
  return m;
}

export function identity(n) {
  const m = Mat.zeros(n, n);
  for (let i = 0; i < n; i++) m.set(i, i, 1);
  return m;
}

// ---------------------------------------------------------------------------
// solve(A, b) -- LU with partial pivoting.
//
// R's solve() is LAPACK dgesv, which is also LU with partial pivoting, so the
// pivot SEQUENCE agrees; the accumulation order inside the elimination does
// not, which is why s3.5 forbids promising bit-identity. Expect agreement at
// the 1e-14 level, not at the last bit.
// ---------------------------------------------------------------------------

export function solve(A, b) {
  const n = A.nrow;
  if (A.ncol !== n) throw new LengthError('solve: not square', A.nrow, A.ncol);
  if (b.length !== n) throw new LengthError('solve', n, b.length);

  const a = A.d.slice();          // column-major working copy
  const x = Float64Array.from(b);
  const piv = new Int32Array(n);
  for (let i = 0; i < n; i++) piv[i] = i;

  const at = (r, c) => a[c * n + r];
  const put = (r, c, v) => { a[c * n + r] = v; };

  for (let k = 0; k < n; k++) {
    // partial pivot
    let p = k, mx = Math.abs(at(k, k));
    for (let r = k + 1; r < n; r++) {
      const v = Math.abs(at(r, k));
      if (v > mx) { mx = v; p = r; }
    }
    if (mx === 0) throw new Error(`solve: matrix is singular at column ${k}`);
    if (p !== k) {
      for (let c = 0; c < n; c++) {
        const t = at(k, c); put(k, c, at(p, c)); put(p, c, t);
      }
      const t = x[k]; x[k] = x[p]; x[p] = t;
    }
    const pivv = at(k, k);
    for (let r = k + 1; r < n; r++) {
      const f = at(r, k) / pivv;
      if (f === 0) continue;
      put(r, k, 0);
      for (let c = k + 1; c < n; c++) put(r, c, at(r, c) - f * at(k, c));
      x[r] -= f * x[k];
    }
  }
  // back substitution
  for (let r = n - 1; r >= 0; r--) {
    let s = x[r];
    for (let c = r + 1; c < n; c++) s -= at(r, c) * x[c];
    x[r] = s / at(r, r);
  }
  return x;
}

// solve(A, B) for a matrix right-hand side (the Leontief inverse case)
export function solveMat(A, B) {
  const out = Mat.zeros(B.nrow, B.ncol);
  for (let c = 0; c < B.ncol; c++) {
    const col = B.d.subarray(c * B.nrow, (c + 1) * B.nrow);
    const s = solve(A, col);
    out.d.set(s, c * B.nrow);
  }
  return out;
}
