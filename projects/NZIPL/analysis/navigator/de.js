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
  idx: null, products: null,
  /* Multi-use correction lookup, from the ENGINE's data/_index.json (shared
   * with the Atlas Navigator), fetched at boot — see muShare() below. */
  muShares: {}, muRoles: [], muNote: '', muYear: null,
  techCache: {}, flowCache: {}, decCache: new WeakMap(),
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
const APPLIC = {
  chains:    {tech: false, seg: false, country: false},
  segments:  {tech: true,  seg: false, country: false},
  exporters: {tech: true,  seg: false, country: false},
  importers: {tech: true,  seg: false, country: false},
  products:  {tech: true,  seg: true,  country: true}
};
const WHY_OFF = {
  tech:    'This view has one row per supply chain, so the chain filter does not apply.',
  seg:     'This view is aggregated over all value-chain segments. The segment filter applies only to the HS-6 product detail view, which is the only slice carrying stage and role per code.',
  country: 'This view is either a world total or already one row per country. The country filter applies only to the HS-6 product detail view.'
};

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
    ({key, label, cls: cls || 'derived', src, how, fmt: fmtPct})
};

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
const PANELS = [
  {btn: 'tg-prov',    panel: 'panel-prov',    key: 'cscde.panel.prov'},
  {btn: 'tg-overlap', panel: 'panel-overlap', key: 'cscde.panel.overlap'}
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
  const a = APPLIC[STATE.preset] || APPLIC.chains;
  const set = (ctlId, selId, on, why) => {
    const sel = document.getElementById(selId);
    const ctl = document.getElementById(ctlId);
    sel.disabled = !on;
    ctl.classList.toggle('off', !on);
    ctl.title = on ? '' : why;
    sel.title = on ? '' : why;
  };
  set('ctl-tech', 'sel-tech', a.tech, WHY_OFF.tech);
  set('ctl-seg', 'sel-seg', a.seg, WHY_OFF.seg);
  set('ctl-country', 'sel-country', a.country, WHY_OFF.country);
  document.getElementById('sel-tech').value = STATE.tech;
  document.getElementById('sel-seg').value = STATE.segment;
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

/* ── View: Q1, one row per supply chain ─────────────────────────────────── */
function viewChains() {
  const rows = [];
  const ch = decode(STATE.idx.chains).filter(d => d.flow === 0);
  STATE.idx.meta.techs.forEach((t, ti) => {
    const a = ch.find(d => d.tech === ti && d.year === STATE.y0);
    const b = ch.find(d => d.tech === ti && d.year === STATE.y1);
    const v0 = a ? a.v : 0, v1 = b ? b.v : 0;
    rows.push({chain: t, v0, v1, delta: v1 - v0, cagr: cagr(v0, v1, yearsSel())});
  });
  rows.sort((x, y) => y.v1 - x.v1);
  const tot = rows.reduce((s, r) => s + r.v1, 0);
  rows.forEach(r => { r.tot = tot; r.share = tot ? r.v1 / tot : null; });

  const howSum = 'Sum of every bilateral BACI flow whose HS-6 code is in this chain’s green-dictionary basket. At BACI’s bilateral grain world exports and world imports are the same number.';
  STATE.cols = [
    C.txt('chain', 'Supply chain', 'raw', SRC_GD, 'The ten technology baskets defined by the NZIPL green dictionary.'),
    C.val('v0', `World trade ${STATE.y0}`, 'raw', SRC_BACI, howSum),
    C.val('v1', `World trade ${STATE.y1}`, 'raw', SRC_BACI, howSum),
    C.val('delta', 'Change', 'derived', SRC_CALC, `= (World trade ${STATE.y1}) − (World trade ${STATE.y0})`),
    C.pct('cagr', 'CAGR', 'derived', SRC_CALC, `= (v${STATE.y1} / v${STATE.y0})^(1/${yearsSel()}) − 1`),
    C.val('tot', `All chains ${STATE.y1}`, 'derived', SRC_CALC, 'Sum of the column above over the ten chains. Shown so the share below is reproducible.'),
    C.pct('share', `Share of all chains ${STATE.y1}`, 'derived', SRC_CALC, '= (World trade of this chain) / (All chains total), both shown.')
  ];
  STATE.rows = rows;
  /* The chain-overlap caution is not a per-view note any more: it lives in the
   * ⚠ Overlap header panel (#panel-overlap), verbatim and always reachable,
   * instead of pushing the table down on every load of this view. */
  STATE.notes = [];
  return `<span class="k">${rows.length}</span> supply chains · combined world trade
          <span class="k">${fmtV(tot)}</span> in ${STATE.y1}`;
}

/* ── View: Q2, one row per stage × role segment ─────────────────────────── */
function viewSegments() {
  const L = STATE.idx.lookups;
  const sg = decode(STATE.idx.segments)
    .filter(d => STATE.tech === 'ALL' || d.tech === +STATE.tech);
  const agg = {};
  sg.forEach(d => {
    if (d.year !== STATE.y0 && d.year !== STATE.y1) return;
    const k = `${d.stage}|${d.role}`;
    agg[k] = agg[k] || {stage: L.stage[d.stage], role: L.role[d.role], v0: 0, v1: 0};
    if (d.year === STATE.y0) agg[k].v0 += d.v; else agg[k].v1 += d.v;
  });
  const rows = Object.values(agg).map(r =>
    Object.assign({}, r, {delta: r.v1 - r.v0, cagr: cagr(r.v0, r.v1, yearsSel())}));
  rows.sort((a, b) => b.v1 - a.v1);
  const tot = rows.reduce((s, r) => s + r.v1, 0);
  rows.forEach(r => { r.tot = tot; r.share = tot ? r.v1 / tot : null; });

  const howSeg = 'Sum of bilateral BACI flows whose HS-6 code carries this stage and role in the green dictionary.';
  STATE.cols = [
    C.txt('stage', 'Value-chain stage', 'raw', SRC_GD, 'Extraction → Processing → Manufacturing → Final Product, as assigned in the green dictionary.'),
    C.txt('role', 'Product role', 'raw', SRC_GD, 'Raw Material / Processed Material / Product Component / Process Equipment / Final Product, as assigned in the green dictionary.'),
    C.val('v0', `Trade ${STATE.y0}`, 'raw', SRC_BACI, howSeg),
    C.val('v1', `Trade ${STATE.y1}`, 'raw', SRC_BACI, howSeg),
    C.val('delta', 'Change', 'derived', SRC_CALC, `= (Trade ${STATE.y1}) − (Trade ${STATE.y0})`),
    C.pct('cagr', 'CAGR', 'derived', SRC_CALC, `= (v${STATE.y1} / v${STATE.y0})^(1/${yearsSel()}) − 1`),
    C.val('tot', `All segments ${STATE.y1}`, 'derived', SRC_CALC, 'Sum of the column above over the segments listed. Shown so the share is reproducible.'),
    C.pct('share', `Share ${STATE.y1}`, 'derived', SRC_CALC, '= (Segment trade) / (All segments total), both shown.')
  ];
  STATE.rows = rows;
  STATE.notes = [];
  const scope = STATE.tech === 'ALL' ? 'all 10 chains' : techName(+STATE.tech);
  return `<span class="k">${rows.length}</span> stage × role segments ·
          ${esc(scope)} · <span class="k">${fmtV(tot)}</span> in ${STATE.y1}`;
}

/* ── View: Q3 / Q4, one row per country ─────────────────────────────────── */
async function viewFlow(dir) {
  const L = STATE.idx.lookups;
  const all = await loadFlow(dir);
  const f = all.filter(d => STATE.tech === 'ALL' || d.tech === +STATE.tech);
  const t0 = f.filter(d => d.year === STATE.y0), t1 = f.filter(d => d.year === STATE.y1);
  const s0 = t0.reduce((s, d) => s + d.v, 0), s1 = t1.reduce((s, d) => s + d.v, 0);
  const agg = {};
  t0.forEach(d => { agg[d.iso] = agg[d.iso] || {iso: d.iso, v0: 0, v1: 0}; agg[d.iso].v0 += d.v; });
  t1.forEach(d => { agg[d.iso] = agg[d.iso] || {iso: d.iso, v0: 0, v1: 0}; agg[d.iso].v1 += d.v; });

  const rows = Object.values(agg).map(r => {
    const sh0 = s0 ? r.v0 / s0 : null, sh1 = s1 ? r.v1 / s1 : null;
    return {
      iso3: L.iso[r.iso], country: ISO_NAME[L.iso[r.iso]] || L.iso[r.iso],
      v0: r.v0, v1: r.v1, w0: s0, w1: s1,
      sh0, sh1,
      shDelta: (sh0 === null || sh1 === null) ? null : sh1 - sh0,
      cagr: cagr(r.v0, r.v1, yearsSel())
    };
  }).sort((a, b) => b.v1 - a.v1);

  const lab = dir === 'exporters' ? 'Exports' : 'Imports';
  const side = dir === 'exporters' ? 'exporter' : 'importer';
  const howC = `Sum of BACI bilateral flows for which this country is the ${side}, over the HS-6 codes in the selected chain(s).`;
  STATE.cols = [
    C.txt('iso3', 'ISO3', 'raw', SRC_BACI, 'BACI reporter code.'),
    C.txt('country', 'Country', 'raw', 'ISO 3166 name for the BACI reporter code', 'Label only; it does not affect any number.'),
    C.val('v0', `${lab} ${STATE.y0}`, 'raw', SRC_BACI, howC),
    C.val('v1', `${lab} ${STATE.y1}`, 'raw', SRC_BACI, howC),
    C.val('w0', `World ${lab.toLowerCase()} ${STATE.y0}`, 'derived', SRC_CALC, 'Sum of the country column over every country listed. Shown so the share is reproducible.'),
    C.val('w1', `World ${lab.toLowerCase()} ${STATE.y1}`, 'derived', SRC_CALC, 'Sum of the country column over every country listed. Shown so the share is reproducible.'),
    C.pct('sh0', `World share ${STATE.y0}`, 'derived', SRC_CALC, `= (${lab} ${STATE.y0}) / (World ${lab.toLowerCase()} ${STATE.y0}), both shown.`),
    C.pct('sh1', `World share ${STATE.y1}`, 'derived', SRC_CALC, `= (${lab} ${STATE.y1}) / (World ${lab.toLowerCase()} ${STATE.y1}), both shown.`),
    C.pct('shDelta', 'Share change', 'derived', SRC_CALC, `= (World share ${STATE.y1}) − (World share ${STATE.y0}), in percentage points.`),
    C.pct('cagr', 'CAGR', 'derived', SRC_CALC, `= (v${STATE.y1} / v${STATE.y0})^(1/${yearsSel()}) − 1`)
  ];
  STATE.rows = rows;
  STATE.notes = [];
  const scope = STATE.tech === 'ALL' ? 'all 10 chains' : techName(+STATE.tech);
  return `<span class="k">${rows.length}</span> countries · ${esc(scope)} · world
          ${lab.toLowerCase()} <span class="k">${fmtV(s1)}</span> in ${STATE.y1}`;
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
  prod.forEach(d => {
    if (d.v > 0) {
      const s = span[d.code] || (span[d.code] = {a: d.year, b: d.year});
      if (d.year < s.a) s.a = d.year;
      if (d.year > s.b) s.b = d.year;
    }
    if (d.year !== STATE.y0 && d.year !== STATE.y1) return;
    const w = world[d.code] || (world[d.code] = {v0: 0, v1: 0});
    if (d.year === STATE.y0) w.v0 += d.v; else w.v1 += d.v;
  });

  /* Country drill-down. The slice covers the top 30 exporters per chain, so
   * rebuild the selector from what is actually available. */
  const pbc = decode(t.products_by_country);
  const lastYear = STATE.idx.meta.year_max;
  const byIso = {};
  pbc.forEach(d => {
    const e = byIso[d.iso] || (byIso[d.iso] = {i: d.iso, iso: L.iso[d.iso], last: 0});
    if (d.year === lastYear) e.last += d.v;
  });
  const avail = Object.values(byIso).sort((a, b) => b.last - a.last);
  populateCountries(avail);

  const isCountry = STATE.country !== 'ALL';
  const ci = isCountry ? +STATE.country : null;
  const ctry = {};
  if (isCountry) {
    pbc.forEach(d => {
      if (d.iso !== ci) return;
      if (d.year !== STATE.y0 && d.year !== STATE.y1) return;
      const k = ctry[d.code] || (ctry[d.code] = {v0: 0, v1: 0});
      if (d.year === STATE.y0) k.v0 += d.v; else k.v1 += d.v;
    });
  }
  /* Basket denominators: the country's / the world's total for THIS chain in
   * the end year. Both are rendered as columns so RCA is reproducible. */
  const cTot1 = Object.values(ctry).reduce((s, r) => s + r.v1, 0);
  const wTot1 = Object.values(world).reduce((s, r) => s + r.v1, 0);

  const tn = techName(ti);
  const rows = codes.map(c => {
    const w = world[c.code] || {v0: 0, v1: 0};
    const k = ctry[c.code] || {v0: 0, v1: 0};
    const sp = span[c.code] || null;
    const mu = muShare(tn, L.code[c.code], c.role);
    const cShare = (isCountry && cTot1) ? k.v1 / cTot1 : null;
    const wShare = wTot1 ? w.v1 / wTot1 : null;
    const rca = (cShare !== null && wShare) ? cShare / wShare : null;
    const brk = sp ? ((sp.a > STATE.y0 ? 1 : 0) | (sp.b < STATE.y1 ? 2 : 0)) : 0;
    return {
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
    };
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
    C.txt('span', 'BACI trade years', 'derived', SRC_CALC, 'First and last year in which this code records any world trade, across the full 1995–' + STATE.idx.meta.year_max + ' series. A span that stops short of your window is flagged ⚠ — see the note above the table.'),
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
      C.num('rca', 'RCA (within basket)', 'derived', SRC_CALC, '= (Country share of basket) / (World share of basket). NOT a Balassa RCA — see the note above the table.', 2),
      C.pct('mktShare', 'World market share', 'derived', SRC_CALC, `= (${L.iso[ci]} exports ${STATE.y1}) / (World trade ${STATE.y1}), both shown.`)
    );
  }
  STATE.cols.push(
    C.pct('cagr', 'CAGR', 'derived', SRC_CALC, `= (v${STATE.y1} / v${STATE.y0})^(1/${yearsSel()}) − 1, on the ${isCountry ? L.iso[ci] + ' export' : 'world trade'} columns. −100.0% means the series reaches zero — check the HS revision first.`),
    C.num('shap', 'SHAP mean |z|', 'model', SRC_SHAP, 'Mean absolute standardised SHAP value from the predicted-competitiveness random forest. Measures how much this code drives the model’s competitiveness prediction. It is a model output and cannot be recomputed from this page.', 3),
    Object.assign(
      C.txt('informal_tag', 'informal_tag (internal label — NOT official)', 'raw', SRC_GD, 'The researcher’s working shorthand for the sub-component. Shown for traceability against internal spreadsheets only. It is never used as a product identifier here.'),
      {wide: true})
  );

  STATE.rows = rows;
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
  STATE.notes.push(
    `<b>&#9878; Multi-use correction.</b> BACI counts a copper cathode as copper whatever
     it ends up in, so a chain&rsquo;s upstream is mostly trade that never reaches the
     technology. The <b>Use share</b> column is the EXIOBASE direct use share for this
     (chain, HS-6 code)${STATE.muYear ? ` (${STATE.muYear})` : ''} — the fraction of the
     code&rsquo;s trade that plausibly serves THIS chain — and each <b>corrected</b>
     column is raw &times; use share, reconcilable by hand from the columns shown. Only
     <b>Raw Material</b> and <b>Processed Material</b> carry a measurement; for every
     other role the share is 1.0 <b>by assumption — no correction applied: downstream
     inputs are already tech-specific</b> (marked &#8801;). That is a modelling decision,
     not missing data. The correction reaches the raw trade columns only: CAGR, basket
     shares, RCA and market share are computed on raw values, and the Q1–Q4 headline
     views sum the HS-6 dimension away, so they cannot be corrected in the browser.` +
    (STATE.muNote ? `<br><br>${esc(STATE.muNote)}` : ''));
  STATE.notes.push(
    `<b>The country drill-down is capped at the top 30 exporters per chain</b>
     (<code>TOP_EXPORTERS = 30</code> in the slice builder), so the country selector in
     this view lists only those 30. The four headline views Q1–Q4 are
     <b>uncapped</b> — every BACI reporter is included.`);
  STATE.notes.push(
    `<b>Electric vehicles (EVs) are not part of this tool</b> — the explorer covers 10 of
     the 11 chains — and EVs have no EXIOBASE use shares either, so they receive no
     corrected figures for two independent reasons.`);

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
    if (STATE.preset === 'chains')          note = viewChains();
    else if (STATE.preset === 'segments')   note = viewSegments();
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
  syncControls();
  paintCaveat();
  paintNotes();
  paintTable();
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
  if (!STATE.notes || !STATE.notes.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = STATE.notes.join('<br><br>');
}

function paintTable() {
  const thead = document.querySelector('#tbl thead');
  const tbody = document.querySelector('#tbl tbody');

  thead.innerHTML = '<tr>' + STATE.cols.map(c => {
    const arrow = STATE.sortKey === c.key ? (STATE.sortDir < 0 ? ' ▾' : ' ▴') : '';
    return `<th data-k="${esc(c.key)}" class="${c.align === 'l' ? 'tl' : ''}${c.wide ? ' w' : ''}" ` +
           `title="${esc(c.src)} — ${esc(c.how)}">` +
           `<span class="lab">${c.label}${arrow}</span>` +
           `<span class="cls ${c.cls}">${c.cls.toUpperCase()}</span></th>`;
  }).join('') + '</tr>';

  tbody.innerHTML = STATE.rows.map(r => '<tr>' + STATE.cols.map(c => {
    let cell = esc(c.fmt(r[c.key]));
    let cls = (c.align === 'l' ? 'tl' : '') + (c.wide ? ' w' : '');
    if (c.key === 'desc') cls = 'tl desc';
    if (c.key === 'hs6') {
      cls = 'tl';
      cell = `<span class="hs">${cell}</span>`;
      if (r.brk & 1) cell += `<span class="flag" title="No BACI trade before ${esc(String(r.span).split('–')[0])}. HS-6 codes are renumbered between HS revisions (this code is mapped from ${esc(r.rev)}), so this may be a renumbering rather than a new market. See the note above the table.">&#9888;</span>`;
      if (r.brk & 2) cell += `<span class="flag" title="No BACI trade after ${esc(String(r.span).split('–').pop())}. HS-6 codes are renumbered between HS revisions (this code is mapped from ${esc(r.rev)}), so this may be a renumbering rather than a collapse in trade. See the note above the table.">&#9888;</span>`;
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
    CAGR = (v<sub>1</sub> / v<sub>0</sub>)<sup>1/years</sup> &minus; 1 &middot;
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
  chains:    'Q1 · Are the chains growing? (one row per supply chain)',
  segments:  'Q2 · Which segments? (one row per value-chain stage × role)',
  exporters: 'Q3 · Who exports? (one row per exporting country)',
  importers: 'Q4 · Who imports? (one row per importing country)',
  products:  'HS-6 product detail (one row per HS-6 code)'
};

function buildExportRows() {
  const header = STATE.cols.map(c => `${c.label} [${c.cls.toUpperCase()}]`);
  const rows = STATE.rows.map(r => STATE.cols.map(c => {
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
  const a = APPLIC[STATE.preset] || APPLIC.chains;
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
    ['CAGR', '(v1 / v0)^(1/years) − 1 (both endpoints are columns in this file). ' +
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
  const chain = STATE.tech === 'ALL' || !APPLIC[STATE.preset].tech
              ? 'all_chains' : techName(+STATE.tech).replace(/ /g, '_');
  const ctry = STATE.country === 'ALL' || !APPLIC[STATE.preset].country
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
