/* Clean Supply Chain Data Explorer — data access, computation, rendering.
 *
 * ── Ground rules ───────────────────────────────────────────────────────────
 * 1. ALL functions are declared at TOP-LEVEL scope on purpose. A function
 *    declared inside an if-block or another function is not visible globally
 *    and fails silently at call time; this has bitten this project before.
 * 2. No ratio is stored in the slices. Shares, CAGRs and RCA are computed here
 *    from operands that are themselves rendered as columns, so any figure on
 *    screen can be reproduced by hand in a spreadsheet. See design spec §5.2.
 * 3. Every column definition carries `cls` (RAW / DERIVED / MODEL), `src` (the
 *    file the number comes from) and `how` (the formula). `cls` paints the
 *    badge, `src`/`how` fill the Column dictionary. Screen and dictionary are
 *    generated from the same object, so they cannot drift apart.
 * 4. Official BACI text is the only product identifier. `informal_tag` is the
 *    researcher's internal shorthand and is shown only in an explicitly
 *    labelled column, never as a name.
 * 5. Ten technologies. EVs is excluded from this product by design.
 */

const DE = 'data_explorer/';

/* ISO3 → readable country name. Generated once from R `countrycode`
 * (iso3c → country.name) over lookups.iso; five BACI reporter codes have no
 * ISO country and are labelled as such rather than guessed. */
const ISO_NAME = Object.fromEntries(
  'ABW:Aruba|AFG:Afghanistan|AGO:Angola|AIA:Anguilla|ALB:Albania|AND:Andorra|ANT:Netherlands Antilles (former)|ARE:United Arab Emirates|ARG:Argentina|ARM:Armenia|ASM:American Samoa|ATF:French Southern Territories|ATG:Antigua and Barbuda|AUS:Australia|AUT:Austria|AZE:Azerbaijan|BDI:Burundi|BEL:Belgium|BEN:Benin|BES:Caribbean Netherlands|BFA:Burkina Faso|BGD:Bangladesh|BGR:Bulgaria|BHR:Bahrain|BHS:Bahamas|BIH:Bosnia and Herzegovina|BLM:St. Barthelemy|BLR:Belarus|BLZ:Belize|BMU:Bermuda|BOL:Bolivia|BRA:Brazil|BRB:Barbados|BRN:Brunei|BTN:Bhutan|BWA:Botswana|CAF:Central African Republic|CAN:Canada|CCK:Cocos (Keeling) Islands|CHE:Switzerland|CHL:Chile|CHN:China|CIV:Cote d’Ivoire|CMR:Cameroon|COD:Congo - Kinshasa|COG:Congo - Brazzaville|COK:Cook Islands|COL:Colombia|COM:Comoros|CPV:Cape Verde|CRI:Costa Rica|CUB:Cuba|CUW:Curacao|CXR:Christmas Island|CYM:Cayman Islands|CYP:Cyprus|CZE:Czechia|DEU:Germany|DJI:Djibouti|DMA:Dominica|DNK:Denmark|DOM:Dominican Republic|DZA:Algeria|ECU:Ecuador|EGY:Egypt|ERI:Eritrea|ESP:Spain|EST:Estonia|ETH:Ethiopia|FIN:Finland|FJI:Fiji|FLK:Falkland Islands|FRA:France|FSM:Micronesia (Federated States of)|GAB:Gabon|GBR:United Kingdom|GEO:Georgia|GHA:Ghana|GIB:Gibraltar|GIN:Guinea|GMB:Gambia|GNB:Guinea-Bissau|GNQ:Equatorial Guinea|GRC:Greece|GRD:Grenada|GRL:Greenland|GTM:Guatemala|GUM:Guam|GUY:Guyana|HKG:Hong Kong SAR China|HND:Honduras|HRV:Croatia|HTI:Haiti|HUN:Hungary|IDN:Indonesia|IND:India|IOT:British Indian Ocean Territory|IRL:Ireland|IRN:Iran|IRQ:Iraq|ISL:Iceland|ISR:Israel|ITA:Italy|JAM:Jamaica|JOR:Jordan|JPN:Japan|KAZ:Kazakhstan|KEN:Kenya|KGZ:Kyrgyzstan|KHM:Cambodia|KIR:Kiribati|KNA:St. Kitts and Nevis|KOR:South Korea|KWT:Kuwait|LAO:Laos|LBN:Lebanon|LBR:Liberia|LBY:Libya|LCA:St. Lucia|LKA:Sri Lanka|LSO:Lesotho|LTU:Lithuania|LUX:Luxembourg|LVA:Latvia|MAC:Macao SAR China|MAR:Morocco|MDA:Moldova|MDG:Madagascar|MDV:Maldives|MEX:Mexico|MHL:Marshall Islands|MKD:North Macedonia|MLI:Mali|MLT:Malta|MMR:Myanmar (Burma)|MNE:Montenegro|MNG:Mongolia|MNP:Northern Mariana Islands|MOZ:Mozambique|MRT:Mauritania|MSR:Montserrat|MUS:Mauritius|MWI:Malawi|MYS:Malaysia|MYT:Mayotte|NAM:Namibia|NCL:New Caledonia|NER:Niger|NFK:Norfolk Island|NGA:Nigeria|NIC:Nicaragua|NIU:Niue|NLD:Netherlands|NOR:Norway|NPL:Nepal|NRU:Nauru|NZL:New Zealand|OMN:Oman|PAK:Pakistan|PAN:Panama|PCN:Pitcairn Islands|PER:Peru|PHL:Philippines|PLW:Palau|PNG:Papua New Guinea|POL:Poland|PRK:North Korea|PRT:Portugal|PRY:Paraguay|PSE:Palestinian Territories|PUS:PUS (BACI reporter code, no ISO country)|PYF:French Polynesia|QAT:Qatar|ROU:Romania|RUS:Russia|RWA:Rwanda|S19:S19 (BACI reporter code, no ISO country)|SAU:Saudi Arabia|SCG:Serbia and Montenegro (former)|SDN:Sudan|SEN:Senegal|SGP:Singapore|SHN:St. Helena|SLB:Solomon Islands|SLE:Sierra Leone|SLV:El Salvador|SMR:San Marino|SOM:Somalia|SPM:St. Pierre and Miquelon|SRB:Serbia|SSD:South Sudan|STP:Sao Tome and Principe|SUR:Suriname|SVK:Slovakia|SVN:Slovenia|SWE:Sweden|SWZ:Eswatini|SXM:Sint Maarten|SYC:Seychelles|SYR:Syria|TCA:Turks and Caicos Islands|TCD:Chad|TGO:Togo|THA:Thailand|TJK:Tajikistan|TKL:Tokelau|TKM:Turkmenistan|TLS:Timor-Leste|TON:Tonga|TTO:Trinidad and Tobago|TUN:Tunisia|TUR:Turkey|TUV:Tuvalu|TZA:Tanzania|UGA:Uganda|UKR:Ukraine|URY:Uruguay|USA:United States|UZB:Uzbekistan|VCT:St. Vincent and Grenadines|VEN:Venezuela|VGB:British Virgin Islands|VNM:Vietnam|VUT:Vanuatu|WLF:Wallis and Futuna|WSM:Samoa|YEM:Yemen|ZA1:ZA1 (BACI reporter code, no ISO country)|ZAF:South Africa|ZMB:Zambia|ZWE:Zimbabwe'
  .split('|').map(s => { const i = s.indexOf(':'); return [s.slice(0, i), s.slice(i + 1)]; }));

/* ── Source strings, used verbatim in the Column dictionary ─────────────── */
const SRC_BACI = 'BACI (CEPII), HS-6 bilateral, via cache/bilateral_ds';
const SRC_HS   = 'Official BACI HS-6 product text (green_dictionary.product_description)';
const SRC_GD   = 'data/green_dict/green_dictionary.csv (NZIPL value-chain classification)';
const SRC_SHAP = 'data/pc/pc_features.csv (external ML model; SHAP mean |z|)';
const SRC_CALC = 'Computed in this page from the columns shown';
const SRC_EXIO = 'EXIOBASE direct use share, via analysis/navigator/data/_index.json (use_shares[chain][HS-6 code])';

const STATE = {
  tech: 'ALL', segment: 'ALL', country: 'ALL',
  y0: 2015, y1: 2024, preset: 'chains',
  /* 'levels' | 'yoy' | 'index' — how the year columns are read. One series,
   * three arithmetics; see ARITH_META. */
  arith: 'levels',
  /* Q3/Q4 show TOP_N countries unless asked for the tail. */
  showAll: false,
  /* 'data' | 'visual' — the same numbers as a table or as a chart. */
  viewMode: 'data',
  /* The year list the current view painted; the chart reads it back. */
  years: [],
  idx: null, products: null,
  /* Multi-use correction lookup, from the ENGINE's data/_index.json (shared
   * with the Atlas Navigator), fetched at boot — see muShare() below. */
  muShares: {}, muRoles: [], muNote: '', muYear: null,
  techCache: {}, flowCache: {}, decCache: new WeakMap(),
  /* tech·code → stage||role keys, built once by codeSegmentIndex(). */
  segIdx: null,
  rows: [], cols: [], notes: [],
  sortKey: null, sortDir: -1,
  /* Bumped once per completed render. Views load their slices asynchronously,
   * so the table can still be showing the previous view for a moment; anything
   * automating this page should wait on this counter rather than on row count. */
  renderSeq: 0
};
/* `const` at the top level of a classic script does NOT create a property on
 * `window`; function declarations do. Publish STATE explicitly so headless
 * checks and the browser console can reach it as `window.STATE`. */
window.STATE = STATE;

/* Which controls actually change the numbers in each view. Anything that does
 * not is disabled with an explanation, so a filter can never look applied when
 * it is not. */
/* Which controls change the numbers in each view. Two of these used to be flat
 * `false` with a message explaining that the slices could not support them.
 * They can: `_index.json.codes` maps tech·code → stage|role and each per-tech
 * file carries products_by_country at code × iso × year, so the cross-filters
 * are derivable in the browser. What is still genuinely impossible is stated
 * below, and only that.
 *
 * A function, not a constant, because two of the answers depend on whether a
 * single chain is selected — the per-tech files are per tech, so "all 10
 * chains" plus a country would mean fetching ten of them (~11 MB). */
function applicFor(preset) {
  const oneChain = STATE.tech !== 'ALL';
  switch (preset) {
    case 'panels':    return {tech: true,  seg: false, country: false};
    case 'chains':    return {tech: false, seg: false, country: false};
    case 'segments':  return {tech: true,  seg: false, country: oneChain};
    /* Exports can be segment-filtered; imports cannot. products_by_country.iso
     * is the EXPORTER (verified: it reproduces exporters.json exactly and
     * importers.json not at all), and no code × importer × year source exists
     * in these slices. */
    case 'exporters': return {tech: true,  seg: oneChain, country: false};
    case 'importers': return {tech: true,  seg: false, country: false};
    default:          return {tech: true,  seg: true,  country: true};
  }
}
const WHY_OFF = {
  tech:    'This view has one row per supply chain, so the chain filter does not apply.',
  seg_isSegments: 'This view already has one row per segment — filtering to a single segment would leave one row. Use the chain and country filters instead.',
  seg_needsChain: 'Filtering by segment needs the per-chain HS-6 detail, which is stored one file per chain. Choose a single supply chain above and this becomes available.',
  seg_importsOnly: 'Segment detail exists per exporting country only — the per-chain HS-6 slice records who ships each code, not who buys it. Q3 · Who exports? can be filtered by segment; this view cannot.',
  country_isFlow: 'This view is already one row per country. Use the chain and segment filters instead.',
  country_needsChain: 'Filtering by country needs the per-chain HS-6 detail, which is stored one file per chain — filtering all ten at once would fetch about 11 MB. Choose a single supply chain above and this becomes available.'
};
function whyOff(preset, ctl) {
  if (ctl === 'tech') return WHY_OFF.tech;
  if (ctl === 'seg') {
    if (preset === 'segments') return WHY_OFF.seg_isSegments;
    if (preset === 'importers') return WHY_OFF.seg_importsOnly;
    return WHY_OFF.seg_needsChain;
  }
  return (preset === 'exporters' || preset === 'importers')
    ? WHY_OFF.country_isFlow : WHY_OFF.country_needsChain;
}

/* ── Decoding ───────────────────────────────────────────────────────────── */

/* Expand a {cols, rows} block into an array of objects. Memoised on the block
 * object itself — the index blocks are decoded on every render otherwise. */
function decode(block) {
  if (!block || !block.cols || !block.rows) return [];
  const hit = STATE.decCache.get(block);
  if (hit) return hit;
  const cols = block.cols;
  const out = block.rows.map(r => {
    const o = {};
    for (let i = 0; i < cols.length; i++) o[cols[i]] = r[i];
    return o;
  });
  STATE.decCache.set(block, out);
  return out;
}

/* ── Formatting ─────────────────────────────────────────────────────────── */
/* Slice values are KUSD (thousands of USD), BACI's native unit, unconverted. */
function fmtV(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  if (v === 0) return '$0';
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}B`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(1)}M`;
  return `$${v.toFixed(0)}K`;
}
function fmtN(v, d) {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  return v.toFixed(d === undefined ? 2 : d);
}
function fmtPct(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  const a = Math.abs(v * 100);
  return `${(v * 100).toFixed(a < 1 ? 2 : 1)}%`;
}
function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function isoLabel(iso) {
  const n = ISO_NAME[iso];
  return n && n !== iso ? `${iso} — ${n}` : iso;
}

/* CAGR over the selected window. Both endpoints are rendered as columns, so
 * this is DERIVED, not opaque. A series that goes to zero is -100%, which is
 * shown rather than blanked — it is exactly the case the HS-revision note
 * below is about. */
function cagr(v0, v1, years) {
  if (v0 === null || v1 === null || v0 === undefined || v1 === undefined) return null;
  if (years <= 0 || v0 <= 0) return null;
  if (v1 === 0) return -1;
  return Math.pow(v1 / v0, 1 / years) - 1;
}
function yearsSel() { return Math.max(1, STATE.y1 - STATE.y0); }
function techName(i) { return STATE.idx.meta.techs[i]; }

/* ── Multi-use correction ───────────────────────────────────────────────
 * Ported from navigator.html (search "let muOn" there for the reference
 * implementation); the same three rules:
 * 1. The share is per (chain, HS-6 code), never per code alone — aluminium
 *    ore 260600 is 0.529 for Batteries and 0.0019 for Biofuel.
 * 2. Only Raw Material and Processed Material carry a measurement. Every
 *    other role is 1.0 BY ASSUMPTION — no correction applied: downstream
 *    inputs are already tech-specific. A reason, not missing data.
 * 3. Only a field that still carries an HS code can be corrected here
 *    (raw × share). The Q1–Q4 headline views sum the code dimension away,
 *    so they stay raw; the corrected columns live in the HS-6 detail view.
 * `why` distinguishes the four ways share ends up 1.0, so the page can
 * label the assumption case rather than implying a measurement was made. */
function muShare(tech, code, role) {
  const t = STATE.muShares[tech] || STATE.muShares[String(tech).replace(/ /g, '_')];
  if (!t) return {share: 1, why: 'unmapped'};
  const measured = String(role === null || role === undefined ? '' : role)
    .split(' | ').some(r => STATE.muRoles.indexOf(r) >= 0);
  if (!measured) return {share: 1, why: 'assumption'};
  const s = t[code];
  return s === undefined ? {share: 1, why: 'unmeasured'} : {share: s, why: 'measured'};
}

/* ── Column constructors ────────────────────────────────────────────────── */
/* cls is authoritative: it paints the badge and (in Task 11) annotates export
 * headers, so provenance cannot drift between screen and file. */
const C = {
  txt: (key, label, cls, src, how) =>
    ({key, label, cls: cls || 'raw', src, how, align: 'l', fmt: v => (v === null || v === undefined) ? '' : String(v)}),
  val: (key, label, cls, src, how) =>
    ({key, label, cls: cls || 'raw', src, how, fmt: fmtV}),
  num: (key, label, cls, src, how, d) =>
    ({key, label, cls: cls || 'raw', src, how, fmt: v => fmtN(v, d)}),
  pct: (key, label, cls, src, how) =>
    ({key, label, cls: cls || 'derived', src, how, fmt: fmtPct}),
  /* A drawing of the year cells already in the row — no new number. `viz`
   * marks it so paintTable() emits SVG instead of escaped text, sortBy()
   * refuses it, and buildExportRows() leaves it out of the file: a picture
   * cannot go in a CSV cell, and the columns it draws are already there. */
  spark: (key, label, how) =>
    ({key, label, cls: 'derived', src: SRC_CALC, how, viz: true, fmt: v => v})
};

/* ── Sparklines ─────────────────────────────────────────────────────────────
 * Ported in spirit from navigator.html (search "drawSpark" there), but built as
 * an SVG STRING with no d3 — this page has no d3, and paintTable() writes the
 * whole tbody with innerHTML in one pass, so there is no element to draw into
 * afterwards.
 *
 * What it draws: the row's own year cells, exactly as the "Read as" toggle
 * leaves them. In $ mode that is the level series, in YoY mode the growth
 * series, in index mode the rebased series. It therefore CANNOT disagree with
 * the numbers beside it — which is the same rule the Visual mode follows:
 * nothing is computed differently, only drawn.
 *
 * Scale: the row's own min/max, not a shared one. A sparkline shows shape; the
 * magnitude is in the cells it sits next to. When the series spans zero (any
 * YoY row with a contraction in it) a zero line is drawn, because the sign
 * change is the thing worth seeing.
 *
 * Colour comes from CSS variables so it follows the light/dark theme. */
const SPK_W = 58, SPK_H = 16, SPK_PAD = 2;

function sparkSVG(vals, years) {
  if (!Array.isArray(vals) || vals.length < 2) return '';
  const pts = vals.map((v, i) => ({
    i, v: (v === null || v === undefined || !isFinite(v)) ? null : v
  }));
  const real = pts.filter(p => p.v !== null);
  /* One observation is not a trend. Say so rather than drawing a dot that
   * reads as a flat line. */
  if (real.length < 2) {
    return `<span class="spk-na" title="Fewer than two years with data in this window — nothing to draw.">&middot;</span>`;
  }
  const w = SPK_W, h = SPK_H, pad = SPK_PAD, n = pts.length;
  const X = i => pad + (n < 2 ? (w - 2 * pad) / 2 : i * (w - 2 * pad) / (n - 1));
  let lo = Math.min(...real.map(p => p.v));
  let hi = Math.max(...real.map(p => p.v));
  if (hi === lo) { hi = lo + 1; lo = lo - 1; }          // a flat series draws flat, mid-height
  const Y = v => h - pad - (v - lo) * (h - 2 * pad) / (hi - lo);

  /* Gaps are breaks, not zeros — a missing year must not be drawn as a plunge
   * to the axis. Each run of consecutive real points is its own polyline. */
  const runs = [];
  let run = [];
  pts.forEach(p => {
    if (p.v === null) { if (run.length) runs.push(run); run = []; }
    else run.push(p);
  });
  if (run.length) runs.push(run);

  let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">`;
  if (lo < 0 && hi > 0) {
    svg += `<line class="spk-zero" x1="0" x2="${w}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/>`;
  }
  runs.forEach(r => {
    if (r.length < 2) return;
    svg += `<polyline class="spk-ln" points="${
      r.map(p => `${X(p.i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ')}"/>`;
  });
  const last = real[real.length - 1];
  svg += `<circle class="spk-dot" cx="${X(last.i).toFixed(1)}" cy="${Y(last.v).toFixed(1)}" r="1.7"/>`;
  svg += '</svg>';

  const y0 = years && years[real[0].i], y1 = years && years[last.i];
  const ttl = (y0 && y1) ? `${y0}–${y1}, drawn from the year cells in this row` : '';
  return `<span class="spk" title="${esc(ttl)}">${svg}</span>`;
}

/* ── Loaders ────────────────────────────────────────────────────────────── */

async function loadJSON(fn) {
  const r = await fetch(DE + fn);
  if (!r.ok) throw new Error(`could not load ${DE}${fn} (HTTP ${r.status})`);
  return r.json();
}

/* products.json lives outside _index.json (it is ~325 KB on its own and only
 * the HS-6 detail view needs it). Fetched once, cached. */
async function loadProducts() {
  if (STATE.products) return STATE.products;
  STATE.products = await loadJSON('products.json');
  return STATE.products;
}

async function loadTech(techIdx) {
  const name = STATE.idx.meta.techs[techIdx];
  if (STATE.techCache[name]) return STATE.techCache[name];
  STATE.techCache[name] = await loadJSON(name.replace(/ /g, '_') + '.json');
  return STATE.techCache[name];
}

async function loadFlow(dir) {
  if (STATE.flowCache[dir]) return STATE.flowCache[dir];
  STATE.flowCache[dir] = decode(await loadJSON(dir + '.json'));
  return STATE.flowCache[dir];
}

/* ── Header reference panels ────────────────────────────────────────────── */
/* The RAW/DERIVED/MODEL legend and the chain-overlap caution are reference
 * material, not content: they stay on the page verbatim but collapsed, so the
 * table starts near the top. Open/closed survives a reload, because a reader
 * who wants the provenance legend up wants it up on every view.
 * All three functions are TOP-LEVEL by design — see ground rule 1. */
/* Only the multi-use explanation stays a header toggle: it is the one piece of
 * reference a reader consults WHILE reading a row, because it explains a column
 * they are looking at. Provenance, the overlap caution and the coverage caps are
 * standing text that belongs after the numbers, and now render below the table
 * in #refnotes — always open, nothing to discover. */
const PANELS = [
  {btn: 'tg-mu', panel: 'panel-mu', key: 'cscde.panel.mu'}
];

function readPanelPref(key) {
  try { return localStorage.getItem(key) === '1'; } catch (e) { return false; }
}
function writePanelPref(key, open) {
  try { localStorage.setItem(key, open ? '1' : '0'); } catch (e) { /* private mode */ }
}

function setPanel(cfg, open, persist) {
  const btn = document.getElementById(cfg.btn);
  const panel = document.getElementById(cfg.panel);
  if (!btn || !panel) return;
  panel.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (persist) writePanelPref(cfg.key, open);
}

function wirePanels() {
  PANELS.forEach(cfg => {
    const btn = document.getElementById(cfg.btn);
    if (!btn) return;
    setPanel(cfg, readPanelPref(cfg.key), false);
    btn.onclick = () =>
      setPanel(cfg, btn.getAttribute('aria-expanded') !== 'true', true);
  });
}

/* ── Boot ───────────────────────────────────────────────────────────────── */

async function boot() {
  /* Before the data load, so the reference panels work even if the slices do
   * not (the error message below is itself something a reader may want the
   * provenance legend next to). */
  wirePanels();
  const sum = document.getElementById('summary');
  try {
    STATE.idx = await loadJSON('_index.json');
  } catch (e) {
    sum.textContent = 'Could not load data_explorer/_index.json — serve this page over ' +
      'HTTP, not file://. (' + e.message + ')';
    return;
  }
  /* Multi-use correction lookup: the ENGINE's index, one directory up from
   * the slices — the same file and keys navigator.html reads at boot
   * (use_shares[chain][code], use_share_measured_roles, use_share_note).
   * A failure here must not take the page down: every share degrades to 1.0
   * and the corrected columns simply equal the raw ones. */
  try {
    let eidx = await (await fetch('data/_index.json')).json();
    eidx = Array.isArray(eidx) ? eidx[0] : eidx;
    STATE.muShares = eidx.use_shares || {};
    STATE.muRoles = eidx.use_share_measured_roles || [];
    STATE.muNote = eidx.use_share_note || '';
    STATE.muYear = eidx.use_share_source_year || null;
  } catch (e) {
    console.warn('multi-use shares', e);
  }
  fillStandingPanels();
  const m = STATE.idx.meta, L = STATE.idx.lookups;

  document.getElementById('meta-line').textContent =
    `BACI ${m.baci_version} · ${m.year_min}–${m.year_max} · ` +
    `${m.techs.length} chains · ${m.units} · built ${m.built}`;

  const st = document.getElementById('sel-tech');
  m.techs.forEach((t, i) => st.add(new Option(t, String(i))));

  /* Segment options: unique stage|role pairs actually present in the data,
   * keyed by NAME because the codes block stores stage/role as text. */
  const seg = document.getElementById('sel-seg');
  const seen = new Set();
  decode(STATE.idx.segments).forEach(s => {
    const key = `${L.stage[s.stage]}||${L.role[s.role]}`;
    if (seen.has(key)) return;
    seen.add(key);
    seg.add(new Option(`${L.stage[s.stage]} · ${L.role[s.role]}`, key));
  });

  const y0 = document.getElementById('y0'), y1 = document.getElementById('y1');
  y0.min = y1.min = m.year_min; y0.max = y1.max = m.year_max;
  STATE.y0 = Math.max(m.year_min, 2015); STATE.y1 = m.year_max;
  y0.value = STATE.y0; y1.value = STATE.y1;

  wireControls();
  await setPreset('chains');
}

function wireControls() {
  document.getElementById('sel-tech').onchange = e => {
    STATE.tech = e.target.value; STATE.sortKey = null; render();
  };
  document.getElementById('sel-seg').onchange = e => {
    STATE.segment = e.target.value; STATE.sortKey = null; render();
  };
  document.getElementById('sel-country').onchange = e => {
    STATE.country = e.target.value; STATE.sortKey = null; render();
  };
  document.getElementById('y0').onchange = e => { setYear('y0', +e.target.value); };
  document.getElementById('y1').onchange = e => { setYear('y1', +e.target.value); };
  document.querySelectorAll('.preset').forEach(b => {
    b.onclick = () => setPreset(b.dataset.preset);
  });
  document.querySelectorAll('.vm').forEach(b => {
    b.onclick = () => { STATE.viewMode = b.dataset.vmode; render(); };
  });
  document.querySelectorAll('.ar').forEach(b => {
    b.onclick = () => { STATE.arith = b.dataset.arith; STATE.sortKey = null; render(); };
  });
  document.getElementById('dl-csv').onclick = downloadCSV;
  document.getElementById('dl-xlsx').onclick = downloadXLSX;
}

function setYear(which, v) {
  const m = STATE.idx.meta;
  v = Math.min(m.year_max, Math.max(m.year_min, Math.round(v || m.year_min)));
  STATE[which] = v;
  if (STATE.y1 < STATE.y0) { const t = STATE.y0; STATE.y0 = STATE.y1; STATE.y1 = t; }
  document.getElementById('y0').value = STATE.y0;
  document.getElementById('y1').value = STATE.y1;
  STATE.sortKey = null;
  render();
}

async function setPreset(p) {
  STATE.preset = p;
  STATE.sortKey = null;
  document.querySelectorAll('.preset').forEach(b =>
    b.classList.toggle('on', b.dataset.preset === p));
  /* The HS-6 view is per-chain by construction: codes, SHAP and the
   * country drill-down slice are all keyed on one technology. */
  if (p === 'products' && STATE.tech === 'ALL') {
    STATE.tech = '0';
    document.getElementById('sel-tech').value = '0';
  }
  await render();
}

/* Disable the controls that do not affect the current view, and say why. */
function syncControls() {
  const p = STATE.preset;
  const a = applicFor(p);
  const set = (ctlId, selId, on, why) => {
    const sel = document.getElementById(selId);
    const ctl = document.getElementById(ctlId);
    sel.disabled = !on;
    ctl.classList.toggle('off', !on);
    ctl.title = on ? '' : why;
    sel.title = on ? '' : why;
  };
  set('ctl-tech', 'sel-tech', a.tech, whyOff(p, 'tech'));
  set('ctl-seg', 'sel-seg', a.seg, whyOff(p, 'seg'));
  set('ctl-country', 'sel-country', a.country, whyOff(p, 'country'));
  /* A filter that is switched off must also stop applying, or the numbers keep
   * a restriction the disabled control no longer shows. */
  if (!a.seg && STATE.segment !== 'ALL') STATE.segment = 'ALL';
  if (!a.country && STATE.country !== 'ALL') STATE.country = 'ALL';
  document.getElementById('sel-tech').value = STATE.tech;
  document.getElementById('sel-seg').value = STATE.segment;
  syncArith();
  syncVMode();
}

/* Which countries a per-tech payload actually holds, ranked by their value in
 * the last year. Used by both the HS-6 view and the segments view, so the two
 * offer exactly the same list. */
function availCountries(t) {
  const L = STATE.idx.lookups, lastYear = STATE.idx.meta.year_max;
  const byIso = {};
  decode(t.products_by_country).forEach(d => {
    const e = byIso[d.iso] || (byIso[d.iso] = {i: d.iso, iso: L.iso[d.iso], last: 0});
    if (d.year === lastYear) e.last += d.v;
  });
  return Object.values(byIso).sort((a, b) => b.last - a.last);
}

/* The HS-6 country drill-down slice covers the top 30 exporters per chain
 * only. Offering all 231 BACI reporters here would silently return zeros for
 * the other 201, so the list is rebuilt from what the slice actually holds. */
function populateCountries(entries) {
  const sc = document.getElementById('sel-country');
  const prev = STATE.country;
  sc.innerHTML = '';
  sc.add(new Option('World (all countries)', 'ALL'));
  entries.forEach(e => sc.add(new Option(isoLabel(e.iso), String(e.i))));
  const ok = entries.some(e => String(e.i) === prev);
  sc.value = ok ? prev : 'ALL';
  if (!ok && prev !== 'ALL') STATE.country = 'ALL';
  return ok || prev === 'ALL';
}

/* ── The year-series engine ─────────────────────────────────────────────────
 * Every Q1–Q4 slice already carries the FULL 1995–2024 series — `chains` 600
 * rows, `segments` 1,927, `exporters` 47,879, `importers` 60,798, each with a
 * `year` column. The page used to read STATE.y0 and STATE.y1 and discard the
 * other 28 years. These functions hand back the whole thing, so a view can be a
 * matrix instead of two columns and a delta.
 *
 * The window (y0..y1) is a view ON the series, never a filter applied while
 * building it: year-on-year growth for the first year in the window needs the
 * year before it, which is outside the window. Building narrow would silently
 * blank that column.
 *
 * Ground rule 2 still holds — every derived cell is reproducible from level
 * cells that are themselves renderable, so nothing here hides its operands. */

function allYears() {
  const m = STATE.idx.meta, out = [];
  for (let y = m.year_min; y <= m.year_max; y++) out.push(y);
  return out;
}
function windowYears() {
  const out = [];
  for (let y = STATE.y0; y <= STATE.y1; y++) out.push(y);
  return out;
}

/* One row per entity, with its complete year → value map.
 * `chains` and `segments` are synchronous off STATE.idx; `exporters` and
 * `importers` need their slice fetched, so this is async throughout. */
async function seriesFor(view) {
  const L = STATE.idx.lookups;
  const mk = (bucket, key, label) =>
    bucket[key] || (bucket[key] = {key, label, byYear: {}});
  const acc = {};

  if (view === 'chains') {
    /* flow === 0 is exports. At BACI's bilateral grain world exports and world
     * imports are the same number, so one flow direction is the world total. */
    decode(STATE.idx.chains).filter(d => d.flow === 0).forEach(d => {
      const s = mk(acc, String(d.tech), STATE.idx.meta.techs[d.tech]);
      s.byYear[d.year] = (s.byYear[d.year] || 0) + d.v;
    });

  } else if (view === 'segments') {
    decode(STATE.idx.segments)
      .filter(d => STATE.tech === 'ALL' || d.tech === +STATE.tech)
      .forEach(d => {
        const stage = L.stage[d.stage], role = L.role[d.role];
        const s = mk(acc, `${stage}||${role}`, `${stage} · ${role}`);
        s.stage = stage; s.role = role;
        s.byYear[d.year] = (s.byYear[d.year] || 0) + d.v;
      });

  } else if (view === 'exporters' || view === 'importers') {
    (await loadFlow(view))
      .filter(d => STATE.tech === 'ALL' || d.tech === +STATE.tech)
      .forEach(d => {
        const iso = L.iso[d.iso];
        const s = mk(acc, iso, ISO_NAME[iso] || iso);
        s.iso3 = iso;
        s.byYear[d.year] = (s.byYear[d.year] || 0) + d.v;
      });

  } else {
    throw new Error(`seriesFor: no series for view "${view}"`);
  }

  return Object.values(acc);
}

/* The three arithmetic modes. Each is a pure function of one series and the
 * years asked for — the toggle changes the arithmetic, never the data. */
function asLevels(s, years) {
  return years.map(y => (s.byYear[y] === undefined ? null : s.byYear[y]));
}
/* Growth against the PREVIOUS year, which may sit outside the window — that is
 * why the series is built full-width. A year whose predecessor is zero or
 * missing is null, not Infinity. */
function asYoY(s, years) {
  return years.map(y => {
    const a = s.byYear[y - 1], b = s.byYear[y];
    if (a === undefined || b === undefined || a === null || b === null) return null;
    if (a <= 0) return null;
    return b / a - 1;
  });
}
/* Rebased to `base` = 100. Comparable across chains of very different size,
 * which is what the levels chart cannot show. */
function asIndex(s, years, base) {
  const b0 = s.byYear[base];
  if (!b0) return years.map(() => null);
  return years.map(y => (s.byYear[y] === undefined ? null : 100 * s.byYear[y] / b0));
}
function applyArith(s, years, mode, base) {
  if (mode === 'yoy')   return asYoY(s, years);
  if (mode === 'index') return asIndex(s, years, base);
  return asLevels(s, years);
}

/* tech·code → the stage||role keys that code carries, built once from
 * _index.json.codes. A Mode-2 code carries several values pipe-separated and
 * therefore lands in SEVERAL segments — the same reading viewProducts already
 * uses for its segment filter, so the two cannot disagree.
 * This is what makes the cross-filters possible without a slice rebuild. */
function codeSegmentIndex() {
  if (STATE.segIdx) return STATE.segIdx;
  const idx = {};
  decode(STATE.idx.codes).forEach(c => {
    const keys = [];
    String(c.stage).split(' | ').forEach(st =>
      String(c.role).split(' | ').forEach(ro => keys.push(`${st}||${ro}`)));
    idx[`${c.tech}|${c.code}`] = keys;
  });
  STATE.segIdx = idx;
  return idx;
}

/* ── Visual mode ────────────────────────────────────────────────────────────
 * Hand-rolled SVG. This page loads no charting library and does not acquire one
 * here: the marks needed are lines and stacked areas, the offline build would
 * have to inline any dependency, and a library in a page whose whole claim is
 * "nothing is black-boxed" is the wrong trade.
 *
 * The chart reads STATE.rows and STATE.years — the SAME values the table paints,
 * after the same arithmetic. A chart and a table that can disagree is the defect
 * this design exists to make impossible.
 *
 * No <script>, no external URL, no fetch inside the SVG. Tooltips are native
 * <title> elements. */

const TECH_COLORS = {
  Solar: '#eab308', Nuclear: '#0ea5e9', Batteries: '#f59e0b', Transmission: '#06b6d4',
  Wind: '#3b82f6', Biofuel: '#84cc16', Electrolyzers: '#a855f7', Geothermal: '#ef4444',
  'Heat Pumps': '#f97316', Magnets: '#ec4899', EVs: '#14b8a6'
};
const SR_COLORS = {
  'Upstream|Raw Material': '#b45309', 'Upstream|Processed Material': '#c17a2e',
  'Midstream|Processed Material': '#22c55e', 'Midstream|Process Equipment': '#65a30d',
  'Midstream|Product Component': '#16a34a', 'Downstream|Product Component': '#4ade80',
  'Downstream|Process Equipment': '#6b7280', 'Downstream|Final Product': '#f97316',
  'Final Product|Final Product': '#f97316', 'Final Product|Product Component': '#fb923c',
  'Downstream|Processed Material': '#86efac'
};
/* For countries, which have no canonical palette. Ten distinguishable hues, then
 * grey — the tail is context, not a series anyone reads individually. */
const CAT10 = ['#073309', '#3cb54a', '#2563eb', '#ef4444', '#7c3aed', '#f59e0b',
               '#0891b2', '#db2777', '#65a30d', '#9a3412'];
const GREY = '#9ca3af';

function seriesColor(row, i) {
  if (STATE.preset === 'chains') return TECH_COLORS[row.chain] || GREY;
  if (STATE.preset === 'segments') {
    return SR_COLORS[`${row.stage}|${row.role}`] || GREY;
  }
  return i < CAT10.length ? CAT10[i] : GREY;
}

const svgEsc = s => String(s === null || s === undefined ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Nice round tick values for an axis spanning lo..hi. */
function ticks(lo, hi, n) {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || 10 * mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v);
  return out;
}

/* Build one chart as an SVG string. Extracted from paintChart so the four-panel
 * view can call it four times with different data — same marks, same scales,
 * same reading, whether it is one big chart or one of four small ones. */
function chartSVG(cfg) {
  const {rows, years, stacked, colorOf, labelOf, fmt, W, H, focus, maxLabels} = cfg;
  if (!rows.length || !years.length) return '';
  const mL = cfg.mL === undefined ? 62 : cfg.mL;
  const mR = cfg.mR === undefined ? 176 : cfg.mR;
  const mT = 14, mB = 30;
  const iw = W - mL - mR, ih = H - mT - mB;
  const x = i => mL + (years.length === 1 ? iw / 2 : iw * i / (years.length - 1));
  const val = (r, y) => { const v = r['y' + y]; return (v === null || v === undefined) ? null : v; };

  let lo = 0, hi = 0;
  if (stacked) {
    years.forEach(y => { hi = Math.max(hi, rows.reduce((s, r) => s + (val(r, y) || 0), 0)); });
  } else {
    let any = false;
    rows.forEach(r => years.forEach(y => {
      const v = val(r, y); if (v === null) return;
      if (!any) { lo = hi = v; any = true; }
      lo = Math.min(lo, v); hi = Math.max(hi, v);
    }));
    if (!any) return '';
    if (cfg.zeroBase) lo = Math.min(0, lo);
    if (lo === hi) hi = lo + 1;
    const pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
  }
  const y = v => mT + ih - ih * ((v - lo) / (hi - lo || 1));

  const parts = [];
  ticks(lo, hi, cfg.nTicks || 5).forEach(t => {
    const yy = y(t);
    parts.push(`<line class="cx-grid" x1="${mL}" x2="${mL + iw}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}"/>`);
    parts.push(`<text class="cx-axis" x="${mL - 7}" y="${(yy + 3.5).toFixed(1)}" text-anchor="end">${svgEsc(fmt(t))}</text>`);
  });
  if (lo < 0 && hi > 0) parts.push(`<line class="cx-zero" x1="${mL}" x2="${mL + iw}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"/>`);

  const every = Math.max(1, Math.ceil(years.length / (cfg.nYearTicks || 12)));
  years.forEach((yr, i) => {
    if (i % every && i !== years.length - 1) return;
    parts.push(`<text class="cx-axis" x="${x(i).toFixed(1)}" y="${H - 10}" text-anchor="middle">${yr}</text>`);
  });

  const ends = [];
  if (stacked) {
    const base = years.map(() => 0);
    rows.slice().reverse().forEach((r, ri) => {
      const top = years.map((yr, i) => base[i] + (val(r, yr) || 0));
      const d = years.map((yr, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(top[i]).toFixed(1)}`).join('')
        + years.map((yr, i) => `L${x(years.length - 1 - i).toFixed(1)},${y(base[years.length - 1 - i]).toFixed(1)}`).join('') + 'Z';
      const i0 = rows.length - 1 - ri;
      parts.push(`<path class="cx-area" d="${d}" fill="${colorOf(rows[i0], i0)}" fill-opacity=".9"><title>${svgEsc(labelOf(rows[i0]))}</title></path>`);
      years.forEach((yr, i) => { base[i] = top[i]; });
    });
  } else {
    /* Focused series are drawn LAST so they sit above the grey field — the
     * Gilberto reading: context in grey, the thing you asked about in colour. */
    const order = rows.map((r, i) => i).sort((a, b) => {
      const fa = focus ? (labelOf(rows[a]) === focus ? 1 : 0) : 0;
      const fb = focus ? (labelOf(rows[b]) === focus ? 1 : 0) : 0;
      return fa - fb;
    });
    order.forEach(ri => {
      const r = rows[ri];
      let d = '', open = false, lastI = -1;
      years.forEach((yr, i) => {
        const v = val(r, yr);
        if (v === null) { open = false; return; }
        d += `${open ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
        open = true; lastI = i;
      });
      if (!d) return;
      const isFocus = focus ? labelOf(r) === focus : false;
      const dim = focus && !isFocus;
      const col = dim ? GREY : colorOf(r, ri);
      parts.push(`<path class="cx-line" d="${d}" stroke="${col}" stroke-width="${isFocus ? 2.6 : 2}" stroke-opacity="${dim ? .5 : (ri < (maxLabels || 12) ? 1 : .45)}"><title>${svgEsc(labelOf(r))}</title></path>`);
      if (lastI >= 0 && (isFocus || ri < (maxLabels || 12))) {
        ends.push({y: y(val(r, years[lastI])), col, bold: isFocus,
                   text: `${labelOf(r)} ${fmt(val(r, years[lastI]))}`});
      }
    });
  }

  /* End labels: de-collide downward, then, if the stack has run past the bottom
     of the plot, shift the whole column back up. Without the clamp a crowded
     panel writes its last few labels off the canvas. */
  ends.sort((a, b) => a.y - b.y);
  let prev = -Infinity;
  const gapPx = cfg.labelGap || 13;
  ends.forEach(e => { e.ty = Math.max(e.y, prev + gapPx); prev = e.ty; });
  if (ends.length) {
    const over = ends[ends.length - 1].ty - (mT + ih);
    if (over > 0) {
      const lift = Math.min(over, ends[0].ty - mT);
      ends.forEach(e => { e.ty -= lift; });
    }
  }
  ends.forEach(e => {
    parts.push(`<line class="cx-grid" x1="${mL + iw}" x2="${mL + iw + 5}" y1="${e.y.toFixed(1)}" y2="${e.ty.toFixed(1)}" stroke="${e.col}"/>`);
    parts.push(`<text class="cx-lab" x="${mL + iw + 8}" y="${(e.ty + 3.5).toFixed(1)}" fill="${e.col}"${e.bold ? ' font-weight="700"' : ''}>${svgEsc(e.text)}</text>`);
  });

  return `<svg viewBox="0 0 ${W} ${H}" role="img" preserveAspectRatio="xMidYMid meet" `
    + `aria-label="${svgEsc(cfg.aria || '')}">${parts.join('')}</svg>`;
}

function arithFmt() {
  return STATE.arith === 'levels' ? fmtV : STATE.arith === 'yoy' ? fmtPct : (v => fmtN(v, 0));
}

function paintChart() {
  const wrap = document.getElementById('chartwrap');
  const leg = document.getElementById('chartlegend');
  const tbl = document.getElementById('tablewrap');
  const panels = document.getElementById('panels');
  if (STATE.preset === PANEL_VIEW) {
    tbl.hidden = true; wrap.hidden = true; leg.hidden = true; panels.hidden = false;
    wrap.innerHTML = ''; leg.innerHTML = '';
    return;
  }
  panels.hidden = true; panels.innerHTML = '';
  const on = STATE.viewMode === 'visual' && MATRIX_VIEWS.has(STATE.preset);
  tbl.hidden = on;
  wrap.hidden = leg.hidden = !on;
  if (!on) { wrap.innerHTML = ''; leg.innerHTML = ''; return; }

  const years = STATE.years || [], rows = STATE.rows || [];
  if (!years.length || !rows.length) { wrap.innerHTML = ''; leg.innerHTML = ''; return; }

  const stacked = STATE.preset === 'segments' && STATE.arith === 'levels';
  const labelOf = r => r.chain || r.segment || r.country || r.iso3 || '';
  wrap.innerHTML = chartSVG({
    rows, years, stacked, labelOf, fmt: arithFmt(),
    colorOf: seriesColor, W: 1180, H: 470, zeroBase: STATE.arith === 'levels',
    aria: document.getElementById('summary').textContent.trim()
  });
  leg.innerHTML = (stacked ? rows : rows.slice(0, 12)).map((r, i) =>
    `<span><span class="sw" style="background:${seriesColor(r, i)}"></span>${esc(labelOf(r))}</span>`).join('')
    + (!stacked && rows.length > 12
        ? `<span><span class="sw" style="background:${GREY}"></span>${rows.length - 12} more (unlabelled)</span>` : '');
}

/* ── The four-panel view ────────────────────────────────────────────────────
 * All four headline questions on one screen, the way Gilberto's atlas panel
 * puts them, so a chain can be read across growth, segments, exporters and
 * importers at once instead of four clicks apart. Clicking a chain chip focuses
 * every panel: the chosen chain in colour, the field in grey.
 *
 * It draws from the same seriesFor() the tables use — no second pipeline. */
const PANEL_DEFS = [
  {n: '01', key: 'chains',    kicker: 'The chains',   title: 'against the field'},
  {n: '02', key: 'segments',  kicker: 'The segments', title: 'Where the value sits'},
  {n: '03', key: 'exporters', kicker: 'Top exporters', title: 'Who ships it'},
  {n: '04', key: 'importers', kicker: 'Top importers', title: 'Who buys it'}
];

async function paintPanels() {
  const host = document.getElementById('panels');
  const years = windowYears();
  const focusName = STATE.tech === 'ALL' ? null : techName(+STATE.tech);
  const fmt = arithFmt();
  const out = [];

  for (const d of PANEL_DEFS) {
    const series = await seriesFor(d.key);
    let rows = series.map(s => {
      const vals = applyArith(s, years, STATE.arith, STATE.y0);
      const r = {_last: s.byYear[STATE.y1] || 0, chain: null, segment: null, country: null};
      if (d.key === 'chains') r.chain = s.label;
      else if (d.key === 'segments') { r.segment = s.label; r.stage = s.stage; r.role = s.role; }
      else { r.country = s.label; r.iso3 = s.iso3; }
      years.forEach((y, i) => { r['y' + y] = vals[i]; });
      return r;
    }).sort((a, b) => b._last - a._last);

    /* Panels 03/04 are a top-10 read, as his are — the tail is noise at this size. */
    if (d.key !== 'chains' && d.key !== 'segments') rows = rows.slice(0, 10);

    const stacked = d.key === 'segments' && STATE.arith === 'levels';
    const labelOf = r => r.chain || r.segment || r.country || r.iso3 || '';
    const colorOf = (r, i) => {
      if (d.key === 'chains') return TECH_COLORS[r.chain] || GREY;
      if (d.key === 'segments') return SR_COLORS[`${r.stage}|${r.role}`] || GREY;
      return i < 6 ? CAT10[i] : GREY;
    };
    const scope = focusName || 'all ten chains';
    const svg = chartSVG({
      rows, years, stacked, labelOf, colorOf, fmt,
      W: 900, H: 380, mL: 56, mR: 150, nTicks: 4, nYearTicks: 6, labelGap: 14,
      zeroBase: STATE.arith === 'levels',
      focus: d.key === 'chains' ? focusName : null,
      maxLabels: 10,
      aria: `${d.kicker} — ${scope}, ${STATE.y0} to ${STATE.y1}`
    });
    const title = d.key === 'chains'
      ? `${focusName || 'All ten chains'} ${d.title}`
      : `${d.title} · ${scope}`;
    out.push(`<figure class="pnl">
      <figcaption><span class="pn">${d.n} &middot; ${esc(d.kicker.toUpperCase())}</span>
        <span class="pt">${esc(title)}</span></figcaption>
      <div class="pbody">${svg || '<p class="pempty">No data for this selection.</p>'}</div>
    </figure>`);
  }
  host.innerHTML = out.join('');
}

/* Chain chips. They set the same STATE.tech the header selector does, so the
 * two can never disagree. */
function paintChips() {
  const host = document.getElementById('chips');
  if (!host) return;
  const on = STATE.preset === 'panels';
  host.hidden = !on;
  if (!on) { host.innerHTML = ''; return; }
  const chips = [`<button type="button" class="chip${STATE.tech === 'ALL' ? ' on' : ''}" data-tech="ALL">All ten chains</button>`]
    .concat(STATE.idx.meta.techs.map((t, i) =>
      `<button type="button" class="chip${STATE.tech === String(i) ? ' on' : ''}" data-tech="${i}">` +
      `<span class="dot" style="background:${TECH_COLORS[t] || GREY}"></span>${esc(t)}</button>`));
  host.innerHTML = chips.join('');
  host.querySelectorAll('.chip').forEach(b => {
    b.onclick = () => { STATE.tech = b.dataset.tech; STATE.sortKey = null; render(); };
  });
}

function syncVMode() {
  const grp = document.getElementById('vmode-grp');
  if (!grp) return;
  grp.hidden = !MATRIX_VIEWS.has(STATE.preset);
  grp.querySelectorAll('.vm').forEach(b =>
    b.classList.toggle('on', b.dataset.vmode === STATE.viewMode));
}

/* The four-panel view has no table: its content is the grid. It still returns a
 * summary line, and still clears cols/rows so nothing stale paints under it. */
async function viewPanels() {
  STATE.cols = []; STATE.rows = []; STATE.notes = [];
  STATE.years = windowYears();
  const ch = await seriesFor('chains');
  const one = STATE.tech === 'ALL' ? null : techName(+STATE.tech);
  /* With a chain focused, quote THAT chain's trade. Quoting the ten-chain total
   * beside the word "Batteries" reads as Batteries' number and is not. */
  const tot = one
    ? ((ch.find(x => x.label === one) || {byYear: {}}).byYear[STATE.y1] || 0)
    : ch.reduce((s, x) => s + (x.byYear[STATE.y1] || 0), 0);
  await paintPanels();
  return `Four views, one question &middot; ${esc(one || 'all ten chains')}
          &middot; ${STATE.y0}&ndash;${STATE.y1} &middot;
          ${one ? 'world trade' : 'combined world trade'}
          <span class="k">${fmtV(tot)}</span> in ${STATE.y1}` + arithSuffix();
}

/* ── View: Q1, one row per supply chain ─────────────────────────────────── */
async function viewChains() {
  const series = await seriesFor('chains');
  const years = windowYears();

  const rows = series.map(s => {
    const vals = applyArith(s, years, STATE.arith, STATE.y0);
    const r = {chain: s.label, _last: s.byYear[STATE.y1] || 0};
    years.forEach((y, i) => { r['y' + y] = vals[i]; });
    r._spark = vals;
    r.cagr = cagr(s.byYear[STATE.y0], s.byYear[STATE.y1], yearsSel());
    return r;
  });
  /* Always ranked on the LEVEL in the end year, whatever the arithmetic on
   * screen — otherwise the row order jumps when the toggle is pressed and the
   * table stops being comparable to itself. */
  rows.sort((x, y) => y._last - x._last);

  const tot = rows.reduce((s, r) => s + r._last, 0);
  rows.forEach(r => { r.share = tot ? r._last / tot : null; });

  STATE.cols = [
    C.txt('chain', 'Supply chain', 'raw', SRC_GD,
      'The ten technology baskets defined by the NZIPL green dictionary.'),
    ...yearCols(years),
    C.spark('_spark', 'Trend',
      `A drawing of this row's year cells, ${years[0]}–${years[years.length - 1]}: nothing is computed here that is not already a column. Scaled to this row's own range, so it shows shape — the magnitude is in the cells beside it. A gap is a break in the series, not a zero.`),
    C.pct('cagr', 'CAGR (compound annual growth rate)', 'derived', SRC_CALC,
      `= (value ${STATE.y1} / value ${STATE.y0})^(1/${yearsSel()}) − 1, on the $ levels — unaffected by the “Read as” toggle.`),
    C.pct('share', `Share of all chains ${STATE.y1}`, 'derived', SRC_CALC,
      `= (this chain’s ${STATE.y1} trade) / (all chains ${STATE.y1} total). The total is in the summary line above the table.`)
  ];
  STATE.rows = rows;
  STATE.years = years;
  /* The chain-overlap caution is not a per-view note any more: it lives in the
   * ⚠ Overlap header panel (#panel-overlap), verbatim and always reachable,
   * instead of pushing the table down on every load of this view. */
  STATE.notes = [];
  return `<span class="k">${rows.length}</span> supply chains · ${years.length} years
          (${STATE.y0}–${STATE.y1}) · combined world trade
          <span class="k">${fmtV(tot)}</span> in ${STATE.y1}` + arithSuffix();
}

/* ── Matrix plumbing, shared by every year-matrix view ─────────────────── */

/* Which views render as one row per entity and one column per year. Q2/Q3/Q4
 * join this in Tasks 4 and 5. */
const MATRIX_VIEWS = new Set(['chains', 'segments', 'exporters', 'importers']);
/* Views carrying a year column per year. Deliberately WIDER than MATRIX_VIEWS:
 * the HS-6 detail view gained a year matrix, but 302 product series cannot be
 * drawn as a chart, so it takes the "Read as" toggle without taking Visual
 * mode. Keeping the two sets apart is what lets one grow without the other. */
const YEARCOL_VIEWS = new Set([...MATRIX_VIEWS, 'products']);
/* The four-panel view is charts only — the Data/Visual toggle does not apply. */
const PANEL_VIEW = 'panels';

/* Default row cap for the two country views. 229 economies is a scroll, not a
 * table; the count is always stated and "show all" is one click away. */
const TOP_N = 15;
const FLOW_VIEWS = new Set(['exporters', 'importers']);

/* What a year column actually holds, for the exported Notes block. */
const ARITH_EXPORT_NOTE = {
  levels: 'Trade value in KUSD (thousands of USD), as recorded in BACI. Raw and unrounded.',
  yoy:    'Year-on-year growth as a decimal fraction (0.025 = +2.5%), = (value in this year / value in the previous year) − 1. Switch “Read as” to $ on the page and re-download for the underlying levels.',
  index:  'Index, first year of the selected window = 100, = 100 × (value in this year / value in the first year). Switch “Read as” to $ on the page and re-download for the underlying levels.'
};

const ARITH_META = {
  levels: {cls: 'raw',     fmtOf: () => fmtV,
           how: y => `Sum of every bilateral BACI flow in this basket in ${y}. At BACI’s bilateral grain world exports and world imports are the same number.`,
           src: () => SRC_BACI, suffix: () => ' · values in US$'},
  yoy:    {cls: 'derived', fmtOf: () => fmtPct,
           how: y => `= (value ${y} / value ${y - 1}) − 1. Both operands are level cells; switch “Read as” to $ to see them.`,
           src: () => SRC_CALC, suffix: () => ' · year-on-year growth'},
  index:  {cls: 'derived', fmtOf: () => (v => fmtN(v, 1)),
           how: y => `= 100 × (value ${y} / value ${STATE.y0}). Rebased so chains of different size are comparable.`,
           src: () => SRC_CALC, suffix: () => ` · rebased ${STATE.y0} = 100`}
};

function yearCols(years) {
  const m = ARITH_META[STATE.arith] || ARITH_META.levels;
  return years.map(y => ({
    key: 'y' + y, label: String(y), cls: m.cls, src: m.src(), how: m.how(y), fmt: m.fmtOf()
  }));
}
function arithSuffix() {
  return (ARITH_META[STATE.arith] || ARITH_META.levels).suffix();
}

/* Show the toggle only where it means something, and keep the index button
 * labelled with the actual base year — a button reading "2015=100" when the
 * window starts in 2003 is a lie. */
function syncArith() {
  const grp = document.getElementById('arith-grp');
  if (!grp) return;
  grp.hidden = !(YEARCOL_VIEWS.has(STATE.preset) || STATE.preset === PANEL_VIEW);
  const ix = document.getElementById('ar-index');
  if (ix) ix.textContent = `${STATE.y0}=100`;
  grp.querySelectorAll('.ar').forEach(b =>
    b.classList.toggle('on', b.dataset.arith === STATE.arith));
}

/* ── View: Q2, one row per stage × role segment ─────────────────────────── */
async function viewSegments() {
  const years = windowYears();
  /* The country control is enabled for a single chain, so it must be populated
   * with the countries that chain actually holds — offering all 231 would
   * silently return zeros for the ~200 outside the top-30 slice. */
  if (STATE.tech !== 'ALL') populateCountries(availCountries(await loadTech(+STATE.tech)));
  const isCountry = STATE.tech !== 'ALL' && STATE.country !== 'ALL';
  const series = isCountry ? await segmentsForCountry(+STATE.tech, +STATE.country)
                           : await seriesFor('segments');

  const rows = series.map(s => {
    const vals = applyArith(s, years, STATE.arith, STATE.y0);
    const r = {segment: s.label, stage: s.stage, role: s.role,
               _last: s.byYear[STATE.y1] || 0};
    years.forEach((y, i) => { r['y' + y] = vals[i]; });
    r._spark = vals;
    r.cagr = cagr(s.byYear[STATE.y0], s.byYear[STATE.y1], yearsSel());
    return r;
  });
  rows.sort((x, y) => y._last - x._last);
  const tot = rows.reduce((s, r) => s + r._last, 0);
  rows.forEach(r => { r.share = tot ? r._last / tot : null; });

  STATE.cols = [
    C.txt('segment', 'Segment (stage · role)', 'raw', SRC_GD,
      'Value-chain stage (Upstream → Midstream → Downstream → Final Product) and product role (Raw Material / Processed Material / Product Component / Process Equipment / Final Product), as assigned in the green dictionary.'),
    ...yearCols(years),
    C.spark('_spark', 'Trend',
      `A drawing of this row's year cells, ${years[0]}–${years[years.length - 1]}: nothing is computed here that is not already a column. Scaled to this row's own range, so it shows shape — the magnitude is in the cells beside it. A gap is a break in the series, not a zero.`),
    C.pct('cagr', 'CAGR (compound annual growth rate)', 'derived', SRC_CALC,
      `= (value ${STATE.y1} / value ${STATE.y0})^(1/${yearsSel()}) − 1, on the $ levels — unaffected by the “Read as” toggle.`),
    C.pct('share', `Share ${STATE.y1}`, 'derived', SRC_CALC,
      `= (this segment’s ${STATE.y1} trade) / (all segments ${STATE.y1} total). The total is in the summary line above the table.`)
  ];
  STATE.rows = rows;
  STATE.years = years;
  STATE.notes = [];
  if (isCountry) STATE.notes.push(
    `<b>This country view is built from the per-chain HS-6 detail</b>, which covers the
     <b>top 30 exporting countries</b> for this chain, and the values are that country’s
     <b>exports</b>. A code carrying more than one stage or role within the chain is
     counted in each of them, so the segment rows can sum to more than the chain total —
     the same convention the world view uses.`);

  const scope = STATE.tech === 'ALL' ? 'all 10 chains' : techName(+STATE.tech);
  return `<span class="k">${rows.length}</span> stage × role segments · ${esc(scope)}`
       + (isCountry ? ` · ${esc(isoLabel(STATE.idx.lookups.iso[+STATE.country]))} exports` : '')
       + ` · <span class="k">${fmtV(tot)}</span> in ${STATE.y1}` + arithSuffix();
}

/* Segments for ONE chain and ONE country, derived in the browser: the per-tech
 * file carries products_by_country at code × iso × year, and codeSegmentIndex()
 * says which stage||role each code belongs to. Nothing in the slice builder
 * changes — this is the cross-filter the page used to say was impossible.
 *
 * Only for a single chain: the source is one file per chain, so "all 10" would
 * mean fetching ten (~11 MB). applicFor() disables the control there and says so. */
async function segmentsForCountry(ti, ci) {
  const t = await loadTech(ti);
  const idx = codeSegmentIndex();
  const acc = {};
  decode(t.products_by_country).forEach(d => {
    if (d.iso !== ci) return;
    const keys = idx[`${ti}|${d.code}`];
    if (!keys) return;
    keys.forEach(k => {
      const s = acc[k] || (acc[k] = {
        key: k, label: k.replace('||', ' · '),
        stage: k.split('||')[0], role: k.split('||')[1], byYear: {}
      });
      s.byYear[d.year] = (s.byYear[d.year] || 0) + d.v;
    });
  });
  return Object.values(acc);
}

/* ── View: Q3 / Q4, one row per country ─────────────────────────────────── */
async function viewFlow(dir) {
  const years = windowYears();
  const lab = dir === 'exporters' ? 'Exports' : 'Imports';
  const side = dir === 'exporters' ? 'exporter' : 'importer';

  /* The segment filter is derivable for EXPORTS only. products_by_country.iso
   * is the exporter — verified against exporters.json, which it reproduces
   * exactly (overlap ratio 1.0000) where importers.json does not (0.5568).
   * There is no code × importer × year source in these slices, so Q4 cannot
   * carry it and applicFor() leaves the control off. */
  const bySeg = dir === 'exporters' && STATE.tech !== 'ALL' && STATE.segment !== 'ALL';
  if (dir === 'exporters' && STATE.tech !== 'ALL') await loadTech(+STATE.tech);
  const series = bySeg ? await flowForSegment(+STATE.tech, STATE.segment)
                       : await seriesFor(dir);

  /* World totals per year, over every country in the series — the share
   * denominator, and itself a rendered column so the share is reproducible. */
  const world = {};
  series.forEach(s => years.forEach(y => {
    world[y] = (world[y] || 0) + (s.byYear[y] || 0);
  }));

  const all = series.map(s => {
    const vals = applyArith(s, years, STATE.arith, STATE.y0);
    const r = {iso3: s.iso3 || s.key, country: s.label, _last: s.byYear[STATE.y1] || 0};
    years.forEach((y, i) => { r['y' + y] = vals[i]; });
    r._spark = vals;
    r.w1 = world[STATE.y1] || 0;
    r.sh1 = r.w1 ? r._last / r.w1 : null;
    const a = s.byYear[STATE.y0] || 0;
    r.shDelta = (world[STATE.y0] && r.w1) ? (r._last / r.w1) - (a / world[STATE.y0]) : null;
    r.cagr = cagr(a, s.byYear[STATE.y1], yearsSel());
    return r;
  }).sort((x, y) => y._last - x._last);

  const shown = STATE.showAll ? all : all.slice(0, TOP_N);
  const howC = `Sum of BACI bilateral flows for which this country is the ${side}, over the HS-6 codes in the selected chain(s).`;
  STATE.cols = [
    C.txt('iso3', 'ISO3', 'raw', SRC_BACI, 'BACI reporter code.'),
    C.txt('country', 'Country', 'raw', 'ISO 3166 name for the BACI reporter code',
      'Label only; it does not affect any number.'),
    ...yearCols(years).map(c => Object.assign({}, c,
      {how: STATE.arith === 'levels' ? howC : c.how})),
    C.val('w1', `World ${lab.toLowerCase()} ${STATE.y1}`, 'derived', SRC_CALC,
      'Sum of the country column over every country in this view — including any hidden by the row cap. Shown so the share is reproducible.'),
    C.pct('sh1', `World share ${STATE.y1}`, 'derived', SRC_CALC,
      `= (${lab} ${STATE.y1}) / (World ${lab.toLowerCase()} ${STATE.y1}), both shown.`),
    C.pct('shDelta', 'Share change', 'derived', SRC_CALC,
      `= (World share ${STATE.y1}) − (World share ${STATE.y0}), in percentage points.`),
    C.spark('_spark', 'Trend',
      `A drawing of this row's year cells, ${years[0]}–${years[years.length - 1]}: nothing is computed here that is not already a column. Scaled to this row's own range, so it shows shape — the magnitude is in the cells beside it. A gap is a break in the series, not a zero.`),
    C.pct('cagr', 'CAGR (compound annual growth rate)', 'derived', SRC_CALC,
      `= (value ${STATE.y1} / value ${STATE.y0})^(1/${yearsSel()}) − 1, on the $ levels — unaffected by the “Read as” toggle.`)
  ];
  STATE.rows = shown;
  STATE.years = years;
  STATE.notes = [];
  if (bySeg) STATE.notes.push(
    `<b>Segment-filtered exports are derived from the per-chain HS-6 detail</b>, which covers
     the <b>top 30 exporting countries</b> for this chain — so the world total on this view is
     the sum over those 30, not every BACI reporter. Remove the segment filter for the
     uncapped figures.`);

  const scope = STATE.tech === 'ALL' ? 'all 10 chains' : techName(+STATE.tech);
  return `<span class="k">${shown.length}</span> of ${all.length} countries`
       + (all.length > shown.length
            ? ` <button type="button" class="lnk" id="show-all">show all ${all.length}</button>`
            : (all.length > TOP_N
                 ? ` <button type="button" class="lnk" id="show-all">show top ${TOP_N}</button>`
                 : ''))
       + ` · ${esc(scope)}`
       + (bySeg ? ` · ${esc(STATE.segment.replace('||', ' · '))}` : '')
       + ` · world ${lab.toLowerCase()} <span class="k">${fmtV(world[STATE.y1] || 0)}</span>
          in ${STATE.y1}` + arithSuffix();
}

/* Exports for one chain, restricted to the codes carrying one stage||role,
 * aggregated by exporter and year. Same source and same index as
 * segmentsForCountry(); capped at the top 30 exporters the slice holds. */
async function flowForSegment(ti, segKey) {
  const t = await loadTech(ti);
  const L = STATE.idx.lookups, idx = codeSegmentIndex();
  const acc = {};
  decode(t.products_by_country).forEach(d => {
    const keys = idx[`${ti}|${d.code}`];
    if (!keys || keys.indexOf(segKey) < 0) return;
    const iso = L.iso[d.iso];
    const s = acc[iso] || (acc[iso] = {key: iso, iso3: iso,
                                       label: ISO_NAME[iso] || iso, byYear: {}});
    s.byYear[d.year] = (s.byYear[d.year] || 0) + d.v;
  });
  return Object.values(acc);
}

/* ── View: HS-6 detail — the traceable spine ────────────────────────────── */
/* RCA is computed here from four operands that are all rendered as columns:
 *   RCA = (c1 / cTot) / (w1 / wTot)
 * so any cell can be checked with a calculator. */
async function viewProducts() {
  const L = STATE.idx.lookups, ti = +STATE.tech;
  const [t, prodAll] = [await loadTech(ti), await loadProducts()];

  let codes = decode(STATE.idx.codes).filter(d => d.tech === ti);
  const shapBy = {};
  decode(STATE.idx.shap).filter(d => d.tech === ti).forEach(s => { shapBy[s.code] = s.shap; });

  /* Segment filter. codes.stage / codes.role are TEXT here (not lookup
   * indices), and a Mode-2 code carries several values pipe-separated. */
  let segLabel = '';
  if (STATE.segment !== 'ALL') {
    const [sName, rName] = STATE.segment.split('||');
    segLabel = `${sName} · ${rName}`;
    codes = codes.filter(c =>
      String(c.stage).split(' | ').indexOf(sName) >= 0 &&
      String(c.role).split(' | ').indexOf(rName) >= 0);
  }

  /* World series for this chain, over ALL years — the full span is what tells
   * us whether a code was renumbered mid-window. */
  const prod = decode(prodAll).filter(d => d.tech === ti);
  const world = {}, span = {};
  /* The window years are kept per code, not just the two endpoints. This view
   * used to hold v0 and v1 only, which is why it was the one view with no year
   * columns; the loop already visits every year to compute `span`, so carrying
   * the series costs one object per code. v0/v1 are still derived here and
   * still rendered, because RCA, market share and the corrected twins are all
   * defined on the endpoints and every operand must stay on screen. */
  const wy = STATE.y0, wy1 = STATE.y1;
  prod.forEach(d => {
    if (d.v > 0) {
      const s = span[d.code] || (span[d.code] = {a: d.year, b: d.year});
      if (d.year < s.a) s.a = d.year;
      if (d.year > s.b) s.b = d.year;
    }
    /* Built FULL-WIDTH, not clipped to the window: asYoY() reads the year
     * before the first one on screen, so a clipped series would blank the
     * leading growth cell — the same reason seriesFor() builds full-width. */
    const w = world[d.code] || (world[d.code] = {v0: 0, v1: 0, by: {}});
    w.by[d.year] = (w.by[d.year] || 0) + d.v;
    if (d.year === wy) w.v0 += d.v;
    else if (d.year === wy1) w.v1 += d.v;
  });

  /* Country drill-down. The slice covers the top 30 exporters per chain, so
   * rebuild the selector from what is actually available. */
  const pbc = decode(t.products_by_country);
  const lastYear = STATE.idx.meta.year_max;
  populateCountries(availCountries(t));

  const isCountry = STATE.country !== 'ALL';
  const ci = isCountry ? +STATE.country : null;
  const ctry = {};
  if (isCountry) {
    pbc.forEach(d => {
      if (d.iso !== ci) return;
      const k = ctry[d.code] || (ctry[d.code] = {v0: 0, v1: 0, by: {}});
      k.by[d.year] = (k.by[d.year] || 0) + d.v;
      if (d.year === wy) k.v0 += d.v;
      else if (d.year === wy1) k.v1 += d.v;
    });
  }
  /* Basket denominators: the country's / the world's total for THIS chain in
   * the end year. Both are rendered as columns so RCA is reproducible. */
  const cTot1 = Object.values(ctry).reduce((s, r) => s + r.v1, 0);
  const wTot1 = Object.values(world).reduce((s, r) => s + r.v1, 0);

  const tn = techName(ti);
  const pyears = windowYears();
  const rows = codes.map(c => {
    const w = world[c.code] || {v0: 0, v1: 0, by: {}};
    const k = ctry[c.code] || {v0: 0, v1: 0, by: {}};
    const sp = span[c.code] || null;
    const mu = muShare(tn, L.code[c.code], c.role);
    const cShare = (isCountry && cTot1) ? k.v1 / cTot1 : null;
    const wShare = wTot1 ? w.v1 / wTot1 : null;
    const rca = (cShare !== null && wShare) ? cShare / wShare : null;
    const brk = sp ? ((sp.a > STATE.y0 ? 1 : 0) | (sp.b < STATE.y1 ? 2 : 0)) : 0;
    /* The row's headline series: the selected country's when one is chosen,
     * the world's otherwise — the same series its endpoint columns and its
     * CAGR are already computed on, so the line, the cells and the rate cannot
     * tell three different stories. */
    const hy = (isCountry ? k : w).by || {};
    const vals = applyArith({byYear: hy}, pyears, STATE.arith, STATE.y0);
    const yr = {};
    pyears.forEach((y, i) => { yr['y' + y] = vals[i]; });
    return Object.assign(yr, {
      _spark: vals,
      hs6: L.code[c.code], desc: c.desc, informal_tag: c.informal_tag,
      role: c.role, stage: c.stage, cat: L.cat[c.cat], rev: c.rev || '',
      mode2: (String(c.role).indexOf(' | ') >= 0 || String(c.stage).indexOf(' | ') >= 0) ? 1 : 0,
      traded: c.traded,
      span: sp ? (sp.a === sp.b ? String(sp.a) : `${sp.a}–${sp.b}`) : 'no BACI trade',
      brk,
      ushare: mu.share, ushareWhy: mu.why,
      w0: w.v0, w1: w.v1,
      w0c: w.v0 * mu.share, w1c: w.v1 * mu.share,
      c0: isCountry ? k.v0 : null, c1: isCountry ? k.v1 : null,
      c0c: isCountry ? k.v0 * mu.share : null,
      c1c: isCountry ? k.v1 * mu.share : null,
      cTot: isCountry ? cTot1 : null, wTot: wTot1,
      cShare, wShare, rca,
      mktShare: (isCountry && w.v1) ? k.v1 / w.v1 : null,
      cagr: cagr(isCountry ? k.v0 : w.v0, isCountry ? k.v1 : w.v1, yearsSel()),
      shap: shapBy[c.code] === undefined ? null : shapBy[c.code]
    });
  }).sort((a, b) => isCountry ? (b.c1 - a.c1) || (b.w1 - a.w1) : b.w1 - a.w1);

  const howW = `Sum of every bilateral BACI flow on this HS-6 code, worldwide. The same value appears under every chain that shares the code — no split_weight apportionment is applied anywhere in this tool.`;
  const howShare = 'EXIOBASE direct use share for this (chain, HS-6 code): the fraction of the code’s trade that plausibly serves THIS chain. Only Raw Material and Processed Material carry a measurement; every other role is 1.0 by assumption — no correction applied: downstream inputs are already tech-specific. A modelling decision, not missing data.';
  STATE.cols = [
    C.txt('hs6', 'HS-6 code', 'raw', SRC_BACI, 'Harmonised System 6-digit product code as recorded by BACI.'),
    C.txt('desc', 'Official BACI description', 'raw', SRC_HS, 'The official HS text for the code. This is the only product identifier used in this tool.'),
    C.txt('stage', 'Stage', 'raw', SRC_GD, 'NZIPL classification. A pipe-separated value means the code sits in more than one place in this chain.'),
    C.txt('role', 'Role', 'raw', SRC_GD, 'NZIPL classification. A pipe-separated value means the code carries more than one role in this chain.'),
    C.txt('cat', 'HS category', 'raw', SRC_GD, 'The HS category used as a feature group by the competitiveness model.'),
    C.txt('rev', 'HS revision', 'raw', SRC_GD, 'The canonical HS revision the code was mapped from (green_dictionary.hs_rev_canonical). HS-6 codes are renumbered between revisions.'),
    C.txt('span', 'BACI trade years', 'derived', SRC_CALC, 'First and last year in which this code records any world trade, across the full 1995–' + STATE.idx.meta.year_max + ' series. A span that stops short of your window is flagged ⚠ — see the note below the table.'),
    Object.assign(
      C.num('ushare', 'Use share', 'raw', SRC_EXIO, howShare, 6),
      {fmt: v => (v === null || v === undefined || Number.isNaN(v)) ? '' : (v === 1 ? '1' : v.toFixed(6))}),
    C.val('w0', `World trade ${STATE.y0}`, 'raw', SRC_BACI, howW),
    C.val('w0c', `World trade ${STATE.y0} corrected`, 'derived', SRC_CALC, `= (World trade ${STATE.y0}) × (Use share), both shown.`),
    C.val('w1', `World trade ${STATE.y1}`, 'raw', SRC_BACI, howW),
    C.val('w1c', `World trade ${STATE.y1} corrected`, 'derived', SRC_CALC, `= (World trade ${STATE.y1}) × (Use share), both shown.`)
  ];
  if (isCountry) {
    const nm = isoLabel(L.iso[ci]);
    STATE.cols.push(
      C.val('c0', `${L.iso[ci]} exports ${STATE.y0}`, 'raw', SRC_BACI, `Sum of BACI flows on this code with ${nm} as exporter.`),
      C.val('c0c', `${L.iso[ci]} exports ${STATE.y0} corrected`, 'derived', SRC_CALC, `= (${L.iso[ci]} exports ${STATE.y0}) × (Use share), both shown.`),
      C.val('c1', `${L.iso[ci]} exports ${STATE.y1}`, 'raw', SRC_BACI, `Sum of BACI flows on this code with ${nm} as exporter.`),
      C.val('c1c', `${L.iso[ci]} exports ${STATE.y1} corrected`, 'derived', SRC_CALC, `= (${L.iso[ci]} exports ${STATE.y1}) × (Use share), both shown.`),
      C.val('cTot', `${L.iso[ci]} ${tn} basket ${STATE.y1}`, 'derived', SRC_CALC, `Sum of the ${L.iso[ci]} exports column over every code in the ${tn} basket. RCA denominator — shown so RCA is reproducible.`),
      C.val('wTot', `World ${tn} basket ${STATE.y1}`, 'derived', SRC_CALC, `Sum of the world trade column over every code in the ${tn} basket. RCA denominator — shown so RCA is reproducible.`),
      C.pct('cShare', 'Country share of basket', 'derived', SRC_CALC, `= (${L.iso[ci]} exports ${STATE.y1}) / (${L.iso[ci]} ${tn} basket ${STATE.y1}), both shown.`),
      C.pct('wShare', 'World share of basket', 'derived', SRC_CALC, `= (World trade ${STATE.y1}) / (World ${tn} basket ${STATE.y1}), both shown.`),
      C.num('rca', 'RCA (within basket)', 'derived', SRC_CALC, '= (Country share of basket) / (World share of basket). NOT a Balassa RCA — see the note below the table.', 2),
      C.pct('mktShare', 'World market share', 'derived', SRC_CALC, `= (${L.iso[ci]} exports ${STATE.y1}) / (World trade ${STATE.y1}), both shown.`)
    );
  }
  /* The year matrix, same as Q1–Q4 — this view used to show two endpoint years
   * and nothing between them. It carries the series the row's endpoints and its
   * CAGR are already computed on: the selected country's exports when a country
   * is chosen, world trade otherwise. In $ mode the first and last cells
   * therefore repeat the endpoint columns above, and that repetition is the
   * point — those columns are the operands of RCA and of the corrected twins,
   * and every operand stays on screen. The correction is NOT applied here: only
   * a column that names its own use share beside it can be reconciled by hand,
   * which is exactly what the endpoint pairs do. */
  STATE.cols.push(
    ...yearCols(pyears).map(c => Object.assign(c, {
      how: c.how + (isCountry
        ? ` Sum of BACI flows on this code with ${isoLabel(L.iso[ci])} as exporter.`
        : ' World trade on this code, all exporters.') +
        ' Raw — the multi-use correction is applied in the endpoint columns, which show the use share next to them.'
    })),
    C.spark('_spark', 'Trend',
      `A drawing of this row's year cells, ${pyears[0]}–${pyears[pyears.length - 1]}: nothing is computed here that is not already a column. Scaled to this row's own range, so it shows shape — the magnitude is in the cells beside it. A gap is a break in the series, not a zero.`),
    C.pct('cagr', 'CAGR (compound annual growth rate)', 'derived', SRC_CALC, `The average rate at which this series grew per year, compounding — not the sum of the yearly changes. = (v${STATE.y1} / v${STATE.y0})^(1/${yearsSel()}) − 1, on the ${isCountry ? L.iso[ci] + ' export' : 'world trade'} columns. −100.0% means the series reaches zero — check the HS revision first.`),
    C.num('shap', 'SHAP mean |z|', 'model', SRC_SHAP, 'Mean absolute standardised SHAP value from the predicted-competitiveness random forest. Measures how much this code drives the model’s competitiveness prediction. It is a model output and cannot be recomputed from this page.', 3),
    Object.assign(
      C.txt('informal_tag', 'informal_tag (internal label — NOT official)', 'raw', SRC_GD, 'The researcher’s working shorthand for the sub-component. Shown for traceability against internal spreadsheets only. It is never used as a product identifier here.'),
      {wide: true})
  );

  STATE.rows = rows;
  STATE.years = pyears;
  STATE.notes = [];

  const nBrk = rows.filter(r => r.brk).length;
  const nT = rows.filter(r => r.traded === 0).length;
  const nM = rows.filter(r => r.mode2 === 1).length;
  if (nBrk) STATE.notes.push(hsRevNote(nBrk, rows.length));
  if (nM) STATE.notes.push(
    `<b>${nM} code${nM > 1 ? 's carry' : ' carries'} more than one stage or role</b> in this
     chain (shown pipe-separated, marked &#9673;). The canonical assignment is pending
     co-director sign-off; the trade value is unaffected.`);
  if (nT) STATE.notes.push(
    `<b>${nT} code${nT > 1 ? 's are' : ' is'} in the ${esc(tn)} dictionary but record no BACI
     trade</b> in any year (marked &#8709;). They are listed rather than dropped so the
     basket definition stays visible.`);
  /* The multi-use explanation, the top-30 cap and the EVs exclusion used to be
   * pushed here on every render. None of them varies with the selection, so they
   * were a fixed ~20-line wall between the reader and the first row. They now
   * live verbatim in the ⚖ Multi-use and ◉ Coverage header panels. Only the
   * counts above — which do vary — remain as notes. */

  return `<span class="k">${rows.length}</span> HS-6 codes · ${esc(tn)}`
       + (segLabel ? ` · ${esc(segLabel)}` : '')
       + (isCountry ? ` · ${esc(isoLabel(L.iso[ci]))}` : ' · world')
       + ` · world basket <span class="k">${fmtV(wTot1)}</span> in ${STATE.y1}`
       + (isCountry ? ` · ${L.iso[ci]} basket <span class="k">${fmtV(cTot1)}</span>` : '');
}

/* The single most misleading thing a user can hit in this data: an HS-6 code
 * that goes to zero mid-window because the World Customs Organization
 * renumbered it, not because the trade stopped. Verified example: Solar
 * 854140 runs $4.99B (JPN, 2020) and $5.95B (2021), then exactly 0 from 2022,
 * because HS22 split it into 854142 / 854143. Total Solar trade is continuous
 * across the boundary — 474.8 -> 463.9 -> 440.9 B USD — so nothing is lost.
 * The flag and this note exist so nobody reads a renumbering as a collapse. */
function hsRevNote(n, total) {
  return `<b>&#9888; ${n} of ${total} codes do not have BACI trade across your whole
    ${STATE.y0}&ndash;${STATE.y1} window</b>, and are flagged in the HS-6 column. Before
    reading this as a market collapse or a new market, check the
    <b>HS revision</b> and <b>BACI trade years</b> columns:
    <b>HS-6 codes are renumbered between HS revisions</b>
    (HS92&middot;1995 &middot; HS96&middot;1996&ndash;2001 &middot; HS02&middot;2002&ndash;2006 &middot;
     HS07&middot;2007&ndash;2011 &middot; HS12&middot;2012&ndash;2016 &middot;
     HS17&middot;2017&ndash;2021 &middot; HS22&middot;2022+),
    so a code can legitimately stop or start at a revision boundary while the trade
    itself continues under a different number. Worked example: Solar <code>854140</code>
    records $4.99B of Japanese exports in 2020 and $5.95B in 2021, then exactly $0 from
    2022 &mdash; because HS22 split it into <code>854142</code> and <code>854143</code>.
    Total Solar trade is continuous across that boundary ($474.8B &rarr; $463.9B &rarr;
    $440.9B). <b>Chain and segment totals are unaffected</b>; only single-code time series
    are.`;
}

/* ── Paint ──────────────────────────────────────────────────────────────── */

async function render() {
  const sum = document.getElementById('summary');
  sum.textContent = 'Computing…';
  syncControls();
  let note = '';
  try {
    if (STATE.preset === 'panels')          note = await viewPanels();
    else if (STATE.preset === 'chains')     note = await viewChains();
    else if (STATE.preset === 'segments')   note = await viewSegments();
    else if (STATE.preset === 'exporters')  note = await viewFlow('exporters');
    else if (STATE.preset === 'importers')  note = await viewFlow('importers');
    else                                    note = await viewProducts();
  } catch (e) {
    sum.textContent = 'Error: ' + e.message;
    console.error(e);
    STATE.renderSeq++;
    return;
  }
  sum.innerHTML = note;
  /* The summary line is innerHTML'd on every render, so anything interactive in
   * it has to be re-wired here rather than once at boot. */
  const sa = document.getElementById('show-all');
  if (sa) sa.onclick = () => { STATE.showAll = !STATE.showAll; render(); };
  syncControls();
  paintCaveat();
  paintNotes();
  paintTable();
  paintChart();
  paintChips();
  paintDict();
  paintProvenance();
  STATE.renderSeq++;
}

/* The not-a-Balassa-RCA caveat shows wherever RCA is on screen, and nowhere
 * else. It is keyed on the column set, so it cannot fall out of step. */
function paintCaveat() {
  const el = document.getElementById('caveat');
  const showsRCA = STATE.cols.some(c => c.key === 'rca');
  if (showsRCA) {
    el.hidden = false;
    el.innerHTML = '<b>&#9888; Read this before using the RCA column.</b> ' +
      esc(STATE.idx.meta.rca_caveat);
  } else {
    el.hidden = true;
    el.innerHTML = '';
  }
}

function paintNotes() {
  const el = document.getElementById('revnote');
  if (!STATE.notes || !STATE.notes.length) { el.hidden = true; el.innerHTML = ''; }
  else { el.hidden = false; el.innerHTML = STATE.notes.join('<br><br>'); }
  paintNoteMark();
}

/* The notes moved below the table, so something above it has to say they exist —
 * otherwise this is not decluttering, it is hiding. Counts what actually applies
 * to the current view and scrolls to it. */
function paintNoteMark() {
  const mark = document.getElementById('notemark');
  if (!mark) return;
  const rcaOn = !document.getElementById('caveat').hidden;
  const n = (STATE.notes ? STATE.notes.length : 0) + (rcaOn ? 1 : 0);
  if (!n) { mark.hidden = true; mark.textContent = ''; return; }
  mark.hidden = false;
  mark.innerHTML = `&#9888; ${n} note${n > 1 ? 's' : ''} on this view` +
                   `<span class="arrow">jump to them &darr;</span>`;
  mark.onclick = () => {
    const t = rcaOn ? document.getElementById('caveat')
                    : document.getElementById('revnote');
    t.scrollIntoView({behavior: 'smooth', block: 'center'});
    t.classList.add('flash');
    setTimeout(() => t.classList.remove('flash'), 1600);
  };
}

/* Fills the two header panels whose text is static markup in the HTML — only the
 * EXIOBASE source year and the engine's own note are injected, so a failed slice
 * load still leaves both texts readable on the page. */
function fillStandingPanels() {
  const y = document.getElementById('mu-year');
  if (y) y.textContent = STATE.muYear ? ` (${STATE.muYear})` : '';
  const n = document.getElementById('mu-note');
  if (n) n.textContent = STATE.muNote || '';
}

function paintTable() {
  const thead = document.querySelector('#tbl thead');
  const tbody = document.querySelector('#tbl tbody');

  thead.innerHTML = '<tr>' + STATE.cols.map(c => {
    const arrow = STATE.sortKey === c.key ? (STATE.sortDir < 0 ? ' ▾' : ' ▴') : '';
    return `<th data-k="${esc(c.key)}" class="${c.align === 'l' ? 'tl' : ''}${c.wide ? ' w' : ''}${c.viz ? ' novs' : ''}" ` +
           `title="${esc(c.src)} — ${esc(c.how)}">` +
           `<span class="lab">${c.label}${arrow}</span>` +
           `<span class="cls ${c.cls}">${c.cls.toUpperCase()}</span></th>`;
  }).join('') + '</tr>';

  tbody.innerHTML = STATE.rows.map(r => '<tr>' + STATE.cols.map(c => {
    /* A viz column is drawn, not written: esc() would render the SVG as text
     * and the numeric branches below do not apply to an array. */
    if (c.viz) return `<td class="spkcell">${sparkSVG(r[c.key], STATE.years)}</td>`;
    let cell = esc(c.fmt(r[c.key]));
    let cls = (c.align === 'l' ? 'tl' : '') + (c.wide ? ' w' : '');
    if (c.key === 'desc') cls = 'tl desc';
    if (c.key === 'hs6') {
      cls = 'tl';
      cell = `<span class="hs">${cell}</span>`;
      if (r.brk & 1) cell += `<span class="flag" title="No BACI trade before ${esc(String(r.span).split('–')[0])}. HS-6 codes are renumbered between HS revisions (this code is mapped from ${esc(r.rev)}), so this may be a renumbering rather than a new market. See the note below the table.">&#9888;</span>`;
      if (r.brk & 2) cell += `<span class="flag" title="No BACI trade after ${esc(String(r.span).split('–').pop())}. HS-6 codes are renumbered between HS revisions (this code is mapped from ${esc(r.rev)}), so this may be a renumbering rather than a collapse in trade. See the note below the table.">&#9888;</span>`;
      if (r.mode2) cell += `<span class="flag" title="This code carries more than one stage/role within this chain. Canonical assignment is pending co-director sign-off.">&#9673;</span>`;
      if (r.traded === 0) cell += `<span class="flag" title="In the dictionary, but no BACI trade recorded for this code in any year.">&#8709;</span>`;
    }
    if (c.key === 'ushare' && r.ushareWhy === 'assumption') {
      cell += `<span class="flag" title="No correction applied: downstream inputs are already tech-specific — use share 1.0 by assumption, not by measurement.">&#8801;</span>`;
    }
    const zero = (typeof r[c.key] === 'number' && r[c.key] === 0) ? ' num0' : '';
    /* Wide free-text columns (informal_tag) are clamped to three lines so one
     * long internal label cannot blow up the row height; the full value stays
     * available on hover and in the exported file. */
    if (c.wide) {
      const full = String(r[c.key] === null || r[c.key] === undefined ? '' : r[c.key]);
      return `<td class="${cls}${zero}" title="${esc(full)}"><span class="clamp">${cell}</span></td>`;
    }
    return `<td class="${cls}${zero}">${cell}</td>`;
  }).join('') + '</tr>').join('');

  thead.querySelectorAll('th').forEach(th => {
    /* Sorting a drawing is meaningless — the Trend column is deliberately
     * inert. Sort by CAGR, which is the same series expressed as a number. */
    if (th.classList.contains('novs')) return;
    th.onclick = () => sortBy(th.dataset.k);
  });
}

function sortBy(k) {
  if (STATE.sortKey === k) STATE.sortDir = -STATE.sortDir;
  else { STATE.sortKey = k; STATE.sortDir = -1; }
  const d = STATE.sortDir;
  const num = STATE.rows.some(r => typeof r[k] === 'number');
  STATE.rows.sort((a, b) => {
    if (num) {
      const x = (a[k] === null || a[k] === undefined) ? -Infinity : a[k];
      const y = (b[k] === null || b[k] === undefined) ? -Infinity : b[k];
      return d < 0 ? y - x : x - y;
    }
    const s = String(a[k] === null || a[k] === undefined ? '' : a[k])
      .localeCompare(String(b[k] === null || b[k] === undefined ? '' : b[k]));
    return d < 0 ? -s : s;
  });
  paintTable();
}

/* Generated from the same column objects that paint the table, so the badge
 * on screen and the source line here can never disagree. */
function paintDict() {
  document.getElementById('dictbody').innerHTML = STATE.cols.map(c => `
    <tr><td><b>${c.label}</b></td>
        <td><span class="cls ${c.cls}">${c.cls.toUpperCase()}</span></td>
        <td><code>${esc(c.src)}</code></td>
        <td>${esc(c.how)}</td></tr>`).join('');
}

function paintProvenance() {
  const m = STATE.idx.meta;
  document.getElementById('prov').innerHTML = `
    <b>Provenance.</b> Trade values: BACI (CEPII) ${esc(m.baci_version)}, HS-6 bilateral,
    via <code>cache/bilateral_ds</code>. Product text: official BACI HS-6 descriptions.
    Value-chain classification (stage, role, HS category, HS revision, informal_tag):
    <code>data/green_dict/green_dictionary.csv</code>. SHAP:
    <code>data/pc/pc_features.csv</code> &mdash; an external model output, not recomputable
    here.<br>
    <b>Units.</b> ${esc(m.units)}. Displayed as $K / $M / $B.<br>
    <b>Apportionment.</b> None. <code>split_weight</code> is not applied anywhere in this
    tool, so a code shared by two chains shows the same full BACI value in both, by design.
    Chain totals therefore overlap and must not be added together as a world figure.<br>
    <b>Multi-use correction.</b> The HS-6 product detail view shows every raw trade value
    beside its corrected twin: raw &times; EXIOBASE direct use share for that
    (chain, HS-6 code), the share itself shown as a column. Only Raw Material and
    Processed Material carry a measured share; every other role is 1.0 by assumption
    (downstream inputs are already tech-specific). Q1&ndash;Q4 aggregate away the HS-6
    dimension and are raw throughout.<br>
    <b>Formulas.</b> share = value / total, both shown &middot;
    <b>CAGR</b> (<b>c</b>ompound <b>a</b>nnual <b>g</b>rowth <b>r</b>ate &mdash; the average
    rate the series grew per year, compounding, not the sum of the yearly changes)
    = (v<sub>1</sub> / v<sub>0</sub>)<sup>1/years</sup> &minus; 1 &middot;
    RCA (within basket) = (country share of basket) / (world share of basket), all four
    operands shown as columns.<br>
    <b>Scope.</b> ${m.techs.length} supply chains
    (${m.techs.map(esc).join(', ')}) &mdash; electric vehicles are not part of this tool.
    Only HS-6 codes listed in the NZIPL green dictionary are covered: this is a view of the
    clean-technology baskets, not a general BACI or Comtrade replacement. Country-level
    HS-6 detail covers the top 30 exporting countries per chain; country-level totals in
    that view are sums over those countries&rsquo; own flows and are complete for each
    listed country. Years ${m.year_min}&ndash;${m.year_max}. Slices built ${esc(m.built)}.`;
}

/* ── Downloads ──────────────────────────────────────────────────────────── */
/* The whole point of this tool: "I cannot do anything with the data you gave
 * me. I need HS codes in line." So the file must reproduce the visible table
 * EXACTLY — same columns, same order, same row order (including whatever the
 * user last sorted by), same filtering — and must carry RAW numbers, not the
 * $1.2B display abbreviations, because the point is arithmetic in a
 * spreadsheet, not a screenshot. Provenance (the RAW / DERIVED / MODEL class
 * and the formula) travels in the header and the Notes block so a file that
 * has been emailed on, detached from this page, still explains itself. */

const VIEW_NAMES = {
  panels:    'Four views, one question (01 chains · 02 segments · 03 exporters · 04 importers)',
  chains:    'Q1 · Are the chains growing? (one row per supply chain)',
  segments:  'Q2 · Which segments? (one row per value-chain stage × role)',
  exporters: 'Q3 · Who exports? (one row per exporting country)',
  importers: 'Q4 · Who imports? (one row per importing country)',
  products:  'HS-6 product detail (one row per HS-6 code)'
};

function buildExportRows() {
  /* Drawings do not go in a file: the Trend column is a picture of the year
   * columns, which are exported in full right next to it. */
  const cols = STATE.cols.filter(c => !c.viz);
  const header = cols.map(c => `${c.label} [${c.cls.toUpperCase()}]`);
  const rows = STATE.rows.map(r => cols.map(c => {
    const v = r[c.key];
    return (v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)))
      ? '' : v;
  }));
  return {header, rows};
}

/* A filter that does not apply to the current view is reported as such rather
 * than as a selection, for the same reason syncControls() greys the control
 * out: a filter must never look applied when it is not. */
function selLabel(kind) {
  const a = applicFor(STATE.preset);
  const L = STATE.idx.lookups;
  if (kind === 'tech') {
    if (!a.tech) return 'not applicable to this view (all 10 chains)';
    return STATE.tech === 'ALL' ? 'All 10 chains' : techName(+STATE.tech);
  }
  if (kind === 'seg') {
    if (!a.seg) return 'not applicable to this view (all segments)';
    return STATE.segment === 'ALL' ? 'All segments'
         : STATE.segment.split('||').join(' · ');
  }
  if (!a.country) return 'not applicable to this view';
  return STATE.country === 'ALL' ? 'World (all countries)'
       : isoLabel(L.iso[+STATE.country]);
}

function preamble() {
  const m = STATE.idx.meta;
  const {header, rows} = buildExportRows();
  return [
    ['Clean Supply Chain Data Explorer'],
    ['Net Zero Industrial Policy Lab (NZIPL), Johns Hopkins SAIS'],
    [],
    ['— What you selected —'],
    ['View', VIEW_NAMES[STATE.preset] || STATE.preset],
    ['Supply chain', selLabel('tech')],
    ['Segment', selLabel('seg')],
    ['Country', selLabel('country')],
    ['Years', `${STATE.y0}–${STATE.y1}`],
    /* Without this line the file is unreadable away from the page: a column
     * headed "2019" holding 114.5 is meaningless unless you know whether that
     * is dollars, a growth rate or an index. */
    ['Year columns read as', ARITH_EXPORT_NOTE[STATE.arith] || ARITH_EXPORT_NOTE.levels],
    ['Rows', STATE.showAll || !FLOW_VIEWS.has(STATE.preset)
      ? 'every row in this view'
      : `top ${TOP_N} by ${STATE.y1} value — the view was capped; use “show all” on the page for the full list`],
    ['Sorted by', STATE.sortKey
      ? `${(STATE.cols.find(c => c.key === STATE.sortKey) || {}).label || STATE.sortKey}` +
        `, ${STATE.sortDir < 0 ? 'descending' : 'ascending'}`
      : 'default order for this view (largest end-year value first)'],
    ['Table', `${rows.length} rows × ${header.length} columns — identical to the screen`],
    [],
    ['— Where the numbers come from —'],
    ['Trade source', `BACI (CEPII) ${m.baci_version}, HS-6 bilateral, via cache/bilateral_ds`],
    ['HS descriptions', 'Official BACI HS-6 product text — the only product identifier used'],
    ['informal_tag', 'Internal NZIPL working shorthand, NOT an official product name'],
    ['Units', m.units],
    ['Numbers', 'Raw and unrounded. The screen abbreviates to $M / $B; this file holds the exact figure.'],
    ['Percentages', 'Exported as decimal fractions (0.25 = 25%). Format as % in your spreadsheet.'],
    ['Column classes', 'RAW = as recorded in the source files · DERIVED = computed from ' +
                       'columns also present in this file · MODEL = external ML output, not recomputable'],
    ['split_weight applied', 'NO — values are exact raw BACI numbers per HS-6 code. A code ' +
                             'shared by two chains carries its full value in both, so chain ' +
                             'totals overlap and must not be added into a world figure.'],
    [],
    ['— Formulas —'],
    ['share', 'value / total (both operands are columns in this file)'],
    ['CAGR', 'Compound annual growth rate: the average rate the series grew per ' +
             'year, compounding — NOT the sum or the average of the yearly changes. ' +
             '= (v1 / v0)^(1/years) − 1 (both endpoints are columns in this file). ' +
             '−1 means the series reaches zero — check the HS revision column first.'],
    ['RCA (within basket)', '(country share of basket) / (world share of basket); all 4 ' +
                            'operands are columns in this file'],
    ['RCA caveat', m.rca_caveat],
    ['SHAP', 'External model output (predicted-competitiveness random forest). ' +
             'MODEL columns are not recomputable from this file.'],
    ['Blank SHAP', 'Expected — the code did not pass the model feature-selection cut. ' +
                   'It is not missing data.'],
    ['HS revisions', 'HS-6 codes are renumbered between HS revisions (HS92·1995 · ' +
                     'HS96·1996–2001 · HS02·2002–2006 · HS07·2007–2011 · HS12·2012–2016 · ' +
                     'HS17·2017–2021 · HS22·2022+). A single code can stop or start at a ' +
                     'revision boundary while the trade continues under a different number.'],
    [],
    ['— Multi-use correction —'],
    ['Use share', 'EXIOBASE direct use share per (supply chain, HS-6 code), via ' +
                  'analysis/navigator/data/_index.json (use_shares[chain][code]). Only ' +
                  'Raw Material and Processed Material carry a measurement; every other ' +
                  'role is 1.0 by assumption — no correction applied: downstream inputs ' +
                  'are already tech-specific. A modelling decision, not missing data.'],
    ['Corrected columns', STATE.preset === 'products'
      ? 'raw × use share; both operands are columns in this file. CAGR, basket shares, ' +
        'RCA and market share are computed on RAW values.'
      : 'absent from this view — Q1–Q4 totals aggregate away the HS-6 dimension and ' +
        'cannot be corrected in the browser, so every value in this file is raw.'],
    ['Top-30 cap', 'The country-level HS-6 drill-down (product detail view) covers the ' +
                   'top 30 exporters per chain only (TOP_EXPORTERS = 30). Q1–Q4 are ' +
                   'uncapped: every BACI reporter is included.'],
    ['EVs', 'Electric vehicles are not part of this tool (10 of 11 chains) and have no ' +
            'EXIOBASE use shares — no corrected figures exist for them, for two ' +
            'independent reasons.'],
    [],
    ['— Scope —'],
    ['Chains', `${m.techs.length}: ${m.techs.join(', ')}. Electric vehicles are not part of this tool.`],
    ['Coverage', 'Only HS-6 codes listed in the NZIPL green dictionary — a view of the ' +
                 'clean-technology baskets, not a general BACI or Comtrade replacement. ' +
                 'Country-level HS-6 detail covers the top 30 exporting countries per chain.'],
    ['Years available', `${m.year_min}–${m.year_max}`],
    ['Slices built', m.built],
    ['Generated', new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC'],
    []
  ];
}

function csvEscape(v) {
  const s = (v === null || v === undefined) ? '' : String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function downloadCSV() {
  const {header, rows} = buildExportRows();
  const lines = preamble().map(r => r.map(csvEscape).join(','));
  lines.push(header.map(csvEscape).join(','));
  rows.forEach(r => lines.push(r.map(csvEscape).join(',')));
  /* Join with an ACTUAL newline. Writing '\\n' here yields a literal
   * backslash-n in the file — this exact bug has shipped in this project
   * before. The BOM makes Excel read the file as UTF-8, without which the
   * en-dashes and curly quotes in the HS descriptions arrive mangled. */
  saveBlob('\uFEFF' + lines.join('\n'), 'text/csv;charset=utf-8', ext('csv'));
}

/* Excel export without a bundled library: SpreadsheetML 2003, a plain XML
 * format that Excel, Numbers and LibreOffice all open directly. The page has
 * to stay self-contained and offline-capable, which rules out a CDN copy of
 * SheetJS; a real .xlsx would need a ZIP writer we would have to hand-roll. */
function downloadXLSX() {
  const {header, rows} = buildExportRows();
  const cell = v => (typeof v === 'number' && Number.isFinite(v))
    ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
    : `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`;
  const row = cs => `<Row>${cs.map(cell).join('')}</Row>`;
  const notes = preamble().map(r => row(r.length ? r : ['']));
  const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Notes"><Table>${notes.join('')}</Table></Worksheet>
 <Worksheet ss:Name="Data"><Table>${row(header)}${rows.map(row).join('')}</Table></Worksheet>
</Workbook>`;
  saveBlob(xml, 'application/vnd.ms-excel', ext('xls'));
}

/* SpreadsheetML must keep the .xls extension: Excel sniffs the content, but an
 * .xlsx extension on non-ZIP bytes makes it refuse the file outright. */
function ext(e) {
  const a = applicFor(STATE.preset);
  const chain = STATE.tech === 'ALL' || !a.tech
              ? 'all_chains' : techName(+STATE.tech).replace(/ /g, '_');
  const ctry = STATE.country === 'ALL' || !a.country
             ? 'world' : STATE.idx.lookups.iso[+STATE.country];
  return `cscde_${STATE.preset}_${chain}_${ctry}_${STATE.y0}-${STATE.y1}.${e}`;
}

function saveBlob(text, mime, filename) {
  const url = URL.createObjectURL(new Blob([text], {type: mime}));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
