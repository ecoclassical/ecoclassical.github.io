/* Clean Supply Chain Data Explorer — data access, computation, rendering.
 *
 * ── Ground rules ───────────────────────────────────────────────────────────
 * 1. ALL functions are declared at TOP-LEVEL scope on purpose. A function
 *    declared inside an if-block or another function is not visible globally
 *    and fails silently at call time; this has bitten this project before.
 * 2. No ratio is stored in the slices. Shares, CAGRs and RCA are computed here
 *    from operands that are themselves rendered as columns, so any figure on
 *    screen can be reproduced by hand in a spreadsheet. See design spec §5.2.
 * 3. Every column definition carries `src` (the file the number comes from) and
 *    `how` (the formula). Both fill the Column dictionary AND the download's
 *    Notes block, generated from the same objects that paint the table, so the
 *    three cannot drift apart. `cls` (raw / derived / model) is still carried —
 *    the year columns switch it with the arithmetic mode — but since 2026-08-05
 *    it is no longer painted as a badge: it summarised `src`/`how` in one word,
 *    and the thing summarised is more useful than the summary.
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
  'ABW:Aruba|AFG:Afghanistan|AGO:Angola|AIA:Anguilla|ALB:Albania|AND:Andorra|ANT:Netherlands Antilles (former)|ARE:United Arab Emirates|ARG:Argentina|ARM:Armenia|ASM:American Samoa|ATF:French Southern Territories|ATG:Antigua and Barbuda|AUS:Australia|AUT:Austria|AZE:Azerbaijan|BDI:Burundi|BEL:Belgium|BEN:Benin|BES:Caribbean Netherlands|BFA:Burkina Faso|BGD:Bangladesh|BGR:Bulgaria|BHR:Bahrain|BHS:Bahamas|BIH:Bosnia and Herzegovina|BLM:St. Barthelemy|BLR:Belarus|BLZ:Belize|BMU:Bermuda|BOL:Bolivia|BRA:Brazil|BRB:Barbados|BRN:Brunei|BTN:Bhutan|BWA:Botswana|CAF:Central African Republic|CAN:Canada|CCK:Cocos (Keeling) Islands|CHE:Switzerland|CHL:Chile|CHN:China|CIV:Cote d’Ivoire|CMR:Cameroon|COD:Congo - Kinshasa|COG:Congo - Brazzaville|COK:Cook Islands|COL:Colombia|COM:Comoros|CPV:Cape Verde|CRI:Costa Rica|CUB:Cuba|CUW:Curacao|CXR:Christmas Island|CYM:Cayman Islands|CYP:Cyprus|CZE:Czechia|DEU:Germany|DJI:Djibouti|DMA:Dominica|DNK:Denmark|DOM:Dominican Republic|DZA:Algeria|ECU:Ecuador|EGY:Egypt|ERI:Eritrea|ESP:Spain|EST:Estonia|ETH:Ethiopia|FIN:Finland|FJI:Fiji|FLK:Falkland Islands|FRA:France|FSM:Micronesia (Federated States of)|GAB:Gabon|GBR:United Kingdom|GEO:Georgia|GHA:Ghana|GIB:Gibraltar|GIN:Guinea|GMB:Gambia|GNB:Guinea-Bissau|GNQ:Equatorial Guinea|GRC:Greece|GRD:Grenada|GRL:Greenland|GTM:Guatemala|GUM:Guam|GUY:Guyana|HKG:Hong Kong SAR China|HND:Honduras|HRV:Croatia|HTI:Haiti|HUN:Hungary|IDN:Indonesia|IND:India|IOT:British Indian Ocean Territory|IRL:Ireland|IRN:Iran|IRQ:Iraq|ISL:Iceland|ISR:Israel|ITA:Italy|JAM:Jamaica|JOR:Jordan|JPN:Japan|KAZ:Kazakhstan|KEN:Kenya|KGZ:Kyrgyzstan|KHM:Cambodia|KIR:Kiribati|KNA:St. Kitts and Nevis|KOR:South Korea|KWT:Kuwait|LAO:Laos|LBN:Lebanon|LBR:Liberia|LBY:Libya|LCA:St. Lucia|LKA:Sri Lanka|LSO:Lesotho|LTU:Lithuania|LUX:Luxembourg|LVA:Latvia|MAC:Macao SAR China|MAR:Morocco|MDA:Moldova|MDG:Madagascar|MDV:Maldives|MEX:Mexico|MHL:Marshall Islands|MKD:North Macedonia|MLI:Mali|MLT:Malta|MMR:Myanmar (Burma)|MNE:Montenegro|MNG:Mongolia|MNP:Northern Mariana Islands|MOZ:Mozambique|MRT:Mauritania|MSR:Montserrat|MUS:Mauritius|MWI:Malawi|MYS:Malaysia|MYT:Mayotte|NAM:Namibia|NCL:New Caledonia|NER:Niger|NFK:Norfolk Island|NGA:Nigeria|NIC:Nicaragua|NIU:Niue|NLD:Netherlands|NOR:Norway|NPL:Nepal|NRU:Nauru|NZL:New Zealand|OMN:Oman|PAK:Pakistan|PAN:Panama|PCN:Pitcairn Islands|PER:Peru|PHL:Philippines|PLW:Palau|PNG:Papua New Guinea|POL:Poland|PRK:North Korea|PRT:Portugal|PRY:Paraguay|PSE:Palestinian Territories|PUS:US Misc. Pacific Is. (BACI, to 1999)|PYF:French Polynesia|QAT:Qatar|ROU:Romania|RUS:Russia|RWA:Rwanda|S19:Taiwan (BACI: Other Asia, nes)|SAU:Saudi Arabia|SCG:Serbia and Montenegro (former)|SDN:Sudan|SEN:Senegal|SGP:Singapore|SHN:St. Helena|SLB:Solomon Islands|SLE:Sierra Leone|SLV:El Salvador|SMR:San Marino|SOM:Somalia|SPM:St. Pierre and Miquelon|SRB:Serbia|SSD:South Sudan|STP:Sao Tome and Principe|SUR:Suriname|SVK:Slovakia|SVN:Slovenia|SWE:Sweden|SWZ:Eswatini|SXM:Sint Maarten|SYC:Seychelles|SYR:Syria|TCA:Turks and Caicos Islands|TCD:Chad|TGO:Togo|THA:Thailand|TJK:Tajikistan|TKL:Tokelau|TKM:Turkmenistan|TLS:Timor-Leste|TON:Tonga|TTO:Trinidad and Tobago|TUN:Tunisia|TUR:Turkey|TUV:Tuvalu|TZA:Tanzania|UGA:Uganda|UKR:Ukraine|URY:Uruguay|USA:United States|UZB:Uzbekistan|VCT:St. Vincent and Grenadines|VEN:Venezuela|VGB:British Virgin Islands|VNM:Vietnam|VUT:Vanuatu|WLF:Wallis and Futuna|WSM:Samoa|YEM:Yemen|ZA1:Southern African Customs Union (to 1999)|ZAF:South Africa|ZMB:Zambia|ZWE:Zimbabwe'
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
  /* 'data' | 'visual' | 'map' — the same numbers as a table, a chart, or a
   * flat world choropleth. Nothing is computed differently between the three;
   * only drawn. */
  viewMode: 'data',
  /* 'raw' | 'corrected' — which of the two aggregates every slice carries is
   * read. Raw is the default and stays the default: it is the honest answer to
   * "how much trade touches this basket", and it is the basis every existing
   * screenshot, debrief and external citation was taken against. See val(). */
  basis: 'raw',
  /* 'full' | 'exclusive' — Q6 only. Which HS basket the concentration index is
   * computed over. Default `full` because it matches what every other view of
   * this tool reports; opening Q6 on `exclusive` would make one chain appear to
   * have two sizes depending on which tab you were looking at. */
  basket: 'full',
  concCache: null,
  /* The year list the current view painted; the chart reads it back. */
  years: [],
  /* Every country row, uncapped — the map's source. See viewFlow(). */
  rowsAll: [],
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
    /* Q6. The chain filter narrows the rows; the segment filter would leave one
     * row per year, same as Q2. The COUNTRY filter genuinely does not apply: a
     * concentration index is a property of a segment across all its exporters,
     * not of any one of them. */
    case 'conc':      return {tech: true,  seg: false, country: false};
    default:          return {tech: true,  seg: true,  country: true};
  }
}
const WHY_OFF = {
  tech:    'This view has one row per supply chain, so the chain filter does not apply.',
  seg_isSegments: 'This view already has one row per segment — filtering to a single segment would leave one row. Use the chain and country filters instead.',
  seg_needsChain: 'Filtering by segment needs the per-chain HS-6 detail, which is stored one file per chain. Choose a single supply chain above and this becomes available.',
  seg_importsOnly: 'Segment detail exists per exporting country only — the per-chain HS-6 slice records who ships each code, not who buys it. Q3 · Who exports? can be filtered by segment; this view cannot.',
  country_isFlow: 'This view is already one row per country. Use the chain and segment filters instead.',
  country_needsChain: 'Filtering by country needs the per-chain HS-6 detail, which is stored one file per chain — filtering all ten at once would fetch about 11 MB. Choose a single supply chain above and this becomes available.',
  seg_isConc: 'This view already has one row per chain × stage. Filtering to a single stage would leave one row per chain — use the chain filter for that.',
  /* Not "not supported yet". Concentration is a property of a segment measured
   * ACROSS its exporters; asking for one country's concentration is asking for
   * the share of a share. The Top exporter column is where a country appears
   * in this view. */
  country_isConc: 'A concentration index has no country dimension: it measures how a segment’s exports are spread ACROSS countries, so filtering to one country would leave nothing to spread. The Top exporter column names the leader of each segment.'
};
function whyOff(preset, ctl) {
  if (ctl === 'tech') return WHY_OFF.tech;
  if (ctl === 'seg') {
    if (preset === 'conc') return WHY_OFF.seg_isConc;
    if (preset === 'segments') return WHY_OFF.seg_isSegments;
    if (preset === 'importers') return WHY_OFF.seg_importsOnly;
    return WHY_OFF.seg_needsChain;
  }
  if (preset === 'conc') return WHY_OFF.country_isConc;
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

/* BACI reporter codes that are not countries. S19 is deliberately NOT here.
 *
 * S19 is BACI/Comtrade's "Other Asia, nes", which is overwhelmingly TAIWAN —
 * reported that way because Taiwan is not a UN member, not because the data is
 * junk. Measured 2026-08-05 on cache/bilateral_ds: S19 is the world's 15th
 * largest Solar exporter in 2024 ($8.0bn, 1.8% of world solar trade), 16th in
 * Heat Pumps and 18th in EVs, with $1.8tn of green-basket trade across
 * 1995–2024. Hiding it would delete a top-20 clean-tech exporter from the tool,
 * so it is RELABELLED instead — the row stays, the name explains itself.
 *
 * These two are different: both are historical aggregates that stop in 1999 and
 * neither is a country you can act on. PUS carries $23m of green trade in total.
 * They are dropped from the country selector only; nothing is removed from the
 * underlying totals, so no headline figure moves. */
const NON_COUNTRY_REPORTERS = new Set(['PUS', 'ZA1']);

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
 * 3. The correction is applied in the R BUILDER, per row, before any
 *    group_by — so every slice carries `vc` beside `v` and every view can be
 *    restated. This used to say the opposite: that only a field still
 *    carrying an HS code could be corrected, and that Q1–Q4 therefore stayed
 *    raw. That was true of the shipped JSON, not of the data. importers.json
 *    is (tech, year, iso, v) with the code dimension summed away, so nothing
 *    the browser can do recovers it — but the builder still has the code, and
 *    correcting before the sum makes Q1–Q5 exact. See val() below.
 * `why` distinguishes the four ways share ends up 1.0, so the page can
 * label the assumption case rather than implying a measurement was made.
 * muShare() survives because the HS-6 view still needs the per-code share to
 * EXPLAIN a row; the toggle shows the effect, this shows the cause. */
function muShare(tech, code, role) {
  const t = STATE.muShares[tech] || STATE.muShares[String(tech).replace(/ /g, '_')];
  if (!t) return {share: 1, why: 'unmapped'};
  const measured = String(role === null || role === undefined ? '' : role)
    .split(' | ').some(r => STATE.muRoles.indexOf(r) >= 0);
  if (!measured) return {share: 1, why: 'assumption'};
  const s = t[code];
  return s === undefined ? {share: 1, why: 'unmeasured'} : {share: s, why: 'measured'};
}

/* THE one place a slice row's value is read. Every aggregation on this page
 * goes through it, so the Raw | Corrected toggle cannot reach some panels and
 * miss others — which was the failure mode of the previous design, where the
 * correction existed as five extra columns in one view out of five.
 *
 * `?? d.v` is load-bearing, not defensive habit: a slice built before the
 * builder learned to emit `vc` must degrade to raw, not to NaN. A NaN here
 * renders as an empty cell, which looks like "no trade" rather than "no
 * column", and the page would lie quietly rather than fail. */
let _basisDiffers = false;
function val(d) {
  if (d.vc !== undefined && d.vc !== null && d.vc !== d.v) _basisDiffers = true;
  return STATE.basis === 'corrected' ? (d.vc === undefined || d.vc === null ? d.v : d.vc) : d.v;
}

/* Whether the CURRENT view can differ between the two bases at all. Only Raw
 * Material and Processed Material rows carry a measurement, so a reader who
 * flips the toggle on a Final Product segment and sees nothing move is owed
 * the reason rather than left to wonder whether the control is broken.
 *
 * Detected inside val() rather than by re-scanning the rows afterwards, because
 * val() is the ONE path every aggregation takes: a view that reached its
 * numbers some other way would also escape a row scan, and this way it cannot.
 * render() resets the flag before each pass. */
function basisMoves() { return _basisDiffers; }

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
  /* A share shown as a percentage to ONE decimal (2026-08-05, by request). The
   * `<0.1%` floor is not decoration: use shares run down to 0.0019 (aluminium
   * ore in Biofuel), and "0.0%" would read as "no measurement" for a code that
   * has one. The unrounded fraction still goes to the CSV. */
  pct1: (key, label, cls, src, how) =>
    ({key, label, cls: cls || 'raw', src, how, fmt: v => {
      if (v === null || v === undefined || Number.isNaN(v)) return '';
      const p = v * 100;
      return p > 0 && p < 0.05 ? '<0.1%' : `${p.toFixed(1)}%`;
    }}),
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

/* Q6's slice. Its own file for the same reason products.json is: 122 KB on top
 * of a 195 KB index would have put the cold boot past its 300 KB budget, and
 * five of the six views never need it. */
async function loadConc() {
  if (STATE.concCache) return STATE.concCache;
  STATE.concCache = decode(await loadJSON('concentration.json'));
  return STATE.concCache;
}

/* ── Header reference panels ────────────────────────────────────────────── */
/* The RAW/DERIVED/MODEL legend and the chain-overlap caution are reference
 * material, not content: they stay on the page verbatim but collapsed, so the
 * table starts near the top. Open/closed survives a reload, because a reader
 * who wants the provenance legend up wants it up on every view.
 * All three functions are TOP-LEVEL by design — see ground rule 1. */
/* ONE toggle for every standing note (2026-08-05). Multi-use, provenance, the
 * overlap caution, coverage and the sources/units/formulas/scope block are all
 * inside #notespanel, below the table.
 *
 * The history is worth keeping, because it was three separate mistakes: the
 * multi-use text was a header toggle, provenance and coverage were an always-open
 * band, and the sources block was a page footer that could not be hidden at all.
 * "Show me the notes" and "get the notes out of my way" were therefore three
 * gestures, and one of them was impossible. They are now one.
 *
 * Still exactly one copy of each text — a second copy of an explanation is a copy
 * with no producer (register B-18) and the two drift. */
const PANELS = [
  {btns: ['tg-notes'], panel: 'notespanel', key: 'cscde.panel.notes',
   /* The button sits directly above the panel, so opening it from a long table
    * would otherwise leave the reader looking at rows. */
   scrollFrom: 'tg-notes'}
];

function readPanelPref(key) {
  try { return localStorage.getItem(key) === '1'; } catch (e) { return false; }
}
function writePanelPref(key, open) {
  try { localStorage.setItem(key, open ? '1' : '0'); } catch (e) { /* private mode */ }
}

function setPanel(cfg, open, persist) {
  const panel = document.getElementById(cfg.panel);
  if (!panel) return;
  panel.classList.toggle('open', open);
  /* Every trigger reflects the panel's state, so a reader who opened it from
   * the header does not find the button below the table claiming it is shut. */
  cfg.btns.forEach(id => {
    const b = document.getElementById(id);
    if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  if (persist) writePanelPref(cfg.key, open);
}

function wirePanels() {
  PANELS.forEach(cfg => {
    setPanel(cfg, readPanelPref(cfg.key), false);
    cfg.btns.forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.onclick = () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        setPanel(cfg, open, true);
        if (open && id === cfg.scrollFrom) {
          const p = document.getElementById(cfg.panel);
          if (p && p.scrollIntoView) p.scrollIntoView({behavior: 'smooth', block: 'center'});
        }
      };
    });
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
  /* Both toggles share the `.ar` class because they are the same control idiom.
   * Dispatch on which data attribute the button actually carries — reading
   * `b.dataset.arith` unconditionally would set STATE.arith to undefined every
   * time someone pressed Raw or Corrected. */
  document.querySelectorAll('.ar').forEach(b => {
    b.onclick = () => {
      if (b.dataset.arith) STATE.arith = b.dataset.arith;
      else if (b.dataset.basis) STATE.basis = b.dataset.basis;
      else if (b.dataset.basket) STATE.basket = b.dataset.basket;
      else return;
      STATE.sortKey = null;
      render();
    };
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
    /* Deliberately RAW, and deliberately not val(). Two reasons, both real:
     * this only orders a dropdown, and a list that reshuffles when the basis
     * flips is disorienting for no gain. More importantly val() sets the
     * "does the basis bite on this view" flag, and this helper sweeps EVERY
     * code in the chain including upstream ones the view may filter out — so
     * routing it through val() made a Final-Product-only view claim the
     * toggle was live when it was not. */
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
  entries.filter(e => !NON_COUNTRY_REPORTERS.has(e.iso))
         .forEach(e => sc.add(new Option(isoLabel(e.iso), String(e.i))));
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
      s.byYear[d.year] = (s.byYear[d.year] || 0) + val(d);
    });

  } else if (view === 'segments') {
    decode(STATE.idx.segments)
      .filter(d => STATE.tech === 'ALL' || d.tech === +STATE.tech)
      .forEach(d => {
        const stage = L.stage[d.stage], role = L.role[d.role];
        const s = mk(acc, `${stage}||${role}`, `${stage} · ${role}`);
        s.stage = stage; s.role = role;
        s.byYear[d.year] = (s.byYear[d.year] || 0) + val(d);
      });

  } else if (view === 'exporters' || view === 'importers') {
    (await loadFlow(view))
      .filter(d => STATE.tech === 'ALL' || d.tech === +STATE.tech)
      .forEach(d => {
        const iso = L.iso[d.iso];
        const s = mk(acc, iso, ISO_NAME[iso] || iso);
        s.iso3 = iso;
        s.byYear[d.year] = (s.byYear[d.year] || 0) + val(d);
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
  /* Q6's "levels" are HHI, not dollars. Formatting an index with fmtV would
   * print "$0K" for every segment on the chart and in its tooltips — the axis
   * has to follow the view, not the toggle name. */
  if (STATE.preset === 'conc' && STATE.arith !== 'yoy') return (v => fmtN(v, 3));
  return STATE.arith === 'levels' ? fmtV : STATE.arith === 'yoy' ? fmtPct : (v => fmtN(v, 0));
}

/* ── The growth map ─────────────────────────────────────────────────────────
 * "Where are chains growing?" — the third view mode, beside Data and Visual.
 *
 * DELIBERATELY FLAT (2D, equirectangular). Not a globe: a globe hides half the
 * world at any moment, and the question this answers is a comparison across all
 * of it at once — you cannot see that South Asia outgrew Europe if one of them
 * is round the back. Antarctica is cropped (lat 84°N–58°S) because it carries
 * no trade and would otherwise take a fifth of the height.
 *
 * NO DEPENDENCY, by the same rule as Visual mode: this page has no d3 and no
 * topojson-client, so the ~20 lines below decode the topology directly. geo.js
 * is a plain `window.__WORLD110 = {...}` assignment with no library of its own.
 *
 * What it colours: CAGR over the selected window, per country, from exactly the
 * rows the table would show — same series, same arithmetic, uncapped. It follows
 * the chain and segment selectors, so "Solar + Midstream" recolours the map. */

function topoFeatures(topo) {
  if (!topo || !topo.transform || !topo.objects || !topo.objects.countries) return [];
  const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
  /* TopoJSON arcs are quantised and delta-encoded: each point is an offset from
   * the previous one, so they have to be walked in order to be absolute. */
  const arcs = topo.arcs.map(arc => {
    let x = 0, y = 0;
    return arc.map(p => { x += p[0]; y += p[1]; return [x * sx + tx, y * sy + ty]; });
  });
  /* A negative index means "this arc, reversed" — the shared-boundary trick that
   * makes the format small. ~i is -i-1. */
  const arcOf = i => (i < 0 ? arcs[~i].slice().reverse() : arcs[i]);
  const ringOf = idxs => idxs.reduce(
    (acc, i, k) => acc.concat(k ? arcOf(i).slice(1) : arcOf(i)), []);
  return topo.objects.countries.geometries.map(g => ({
    id: parseInt(g.id, 10),
    name: (g.properties && g.properties.name) || '',
    rings: g.type === 'Polygon'      ? g.arcs.map(ringOf)
         : g.type === 'MultiPolygon' ? g.arcs.reduce((a, p) => a.concat(p.map(ringOf)), [])
         : []
  }));
}

const MAP_LAT_N = 84, MAP_LAT_S = -58;

/* A diverging ramp centred on zero growth, because the reader's question is
 * "which way, and how hard" — a sequential scale would make a 2% decline and a
 * 40% boom differ only in intensity. Red shrinking, green growing, matching the
 * brand's green as the positive end. */
const MAP_STOPS = [
  [-0.25, [153, 27, 27]], [-0.10, [239, 118, 118]], [-0.02, [252, 211, 211]],
  [ 0.00, [235, 236, 238]],
  [ 0.02, [200, 240, 209]], [ 0.10, [ 90, 200, 120]], [ 0.25, [ 22, 128,  60]],
  [ 0.50, [ 10,  74,  38]]
];
function mapColor(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  const s = MAP_STOPS;
  if (v <= s[0][0]) return `rgb(${s[0][1].join(',')})`;
  if (v >= s[s.length - 1][0]) return `rgb(${s[s.length - 1][1].join(',')})`;
  for (let i = 1; i < s.length; i++) {
    if (v <= s[i][0]) {
      const t = (v - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
      const c = s[i - 1][1].map((a, k) => Math.round(a + t * (s[i][1][k] - a)));
      return `rgb(${c.join(',')})`;
    }
  }
  return null;
}

function growthMapSVG(rows, opts) {
  const W = 1180, H = 560, pad = 6;
  const world = window.__WORLD110;
  const N2I = window.ISO3N_TABLE || {};
  if (!world) {
    return `<p class="mapmsg">The map geometry (<code>geo.js</code>) did not load, so the
            map cannot be drawn. The same numbers are in the table &mdash; switch back to
            Data.</p>`;
  }
  const feats = topoFeatures(world);
  if (!feats.length) return `<p class="mapmsg">The map geometry decoded to nothing.</p>`;

  /* BACI reports Taiwan as "Other Asia, nes" under S19; the topology knows it as
   * TWN. Without this the world's 15th largest solar exporter is a hole in the
   * map. Any other reporter with no ISO3166 country simply is not drawn. */
  const ALIAS = {S19: 'TWN'};
  const byNum = {};
  rows.forEach(r => {
    const iso = ALIAS[r.iso3] || r.iso3;
    const n = N2I[iso];
    if (n !== undefined) byNum[n] = r;
  });

  const X = lon => pad + (lon + 180) / 360 * (W - 2 * pad);
  const Y = lat => pad + (MAP_LAT_N - lat) / (MAP_LAT_N - MAP_LAT_S) * (H - 2 * pad);
  const path = f => f.rings.map(rg => 'M' + rg.map(
    p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('L') + 'Z').join('');

  const fmtC = v => (v === null || v === undefined || Number.isNaN(v))
    ? 'no CAGR (series starts or ends at zero)' : `${(v * 100).toFixed(1)}% a year`;

  const shapes = feats.map(f => {
    const r = byNum[f.id];
    const col = r ? mapColor(r.cagr) : null;
    const d = path(f);
    if (!d) return '';
    const label = r
      ? `${r.country || r.iso3}\n${opts.lab} ${opts.y1}: ${fmtV(r._last || 0)}\nCAGR ${opts.y0}–${opts.y1}: ${fmtC(r.cagr)}`
      : `${f.name}\nnot in this selection`;
    return `<path d="${d}" fill="${col || 'var(--mapnone)'}" stroke="var(--mapline)" ` +
           `stroke-width="0.4"><title>${esc(label)}</title></path>`;
  }).join('');

  const withData = Object.keys(byNum).length;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" class="growthmap" ` +
         `aria-label="${esc(opts.aria)}">${shapes}</svg>` +
         `<p class="mapfoot">${withData} of ${rows.length} countries in this selection are ` +
         `drawn &mdash; the rest are BACI reporters with no matching country outline ` +
         `(territories, historical aggregates), and they remain in the table and in every ` +
         `total. Grey means the country is not in this selection at all.</p>`;
}

/* Q6's map. NOT a choropleth of HHI — HHI has no country dimension, it is a
 * property of a segment measured across countries. What it colours is
 * `top1_iso`: how many of the chain×stage segments on screen each country
 * LEADS. That is the picture the phrase "choke point" is actually about.
 *
 * Sequential, not the diverging CAGR ramp. A count of segments led has no
 * meaningful zero to diverge from — leading none and leading one are not
 * opposite directions — so this takes the positive half of MAP_STOPS only.
 * Reusing mapColor() unchanged would have painted every country red at the
 * bottom of the scale, which reads as "bad" rather than "few". */
function leaderColor(n, max) {
  if (!n) return null;
  const t = max <= 1 ? 1 : Math.sqrt(n / max);   /* sqrt: 1-vs-2 must stay visible */
  return mapColor(0.02 + t * 0.48);
}

function leaderMapSVG(rows, opts) {
  const world = window.__WORLD110, N2I = window.ISO3N_TABLE || {};
  if (!world) {
    return `<p class="mapmsg">The map geometry (<code>geo.js</code>) did not load, so the
            map cannot be drawn. The same numbers are in the table &mdash; switch back to
            Data.</p>`;
  }
  const feats = topoFeatures(world);
  if (!feats.length) return `<p class="mapmsg">The map geometry decoded to nothing.</p>`;

  const W = 1180, H = 560, pad = 6;
  const X = lon => pad + (lon + 180) / 360 * (W - 2 * pad);
  const Y = lat => pad + (MAP_LAT_N - lat) / (MAP_LAT_N - MAP_LAT_S) * (H - 2 * pad);
  const path = f => f.rings.map(rg => 'M' + rg.map(
    p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('L') + 'Z').join('');

  /* Same Taiwan alias as the growth map, and for the same reason. */
  const ALIAS = {S19: 'TWN'};
  const led = {};
  rows.forEach(r => {
    if (!r.top1) return;
    const e = led[r.top1] || (led[r.top1] = {n: 0, segs: [], v: 0});
    e.n++; e.segs.push(`${r.chain} ${r.stage}`); e.v += (r.v || 0);
  });
  const max = Object.values(led).reduce((m, e) => Math.max(m, e.n), 0);
  const byNum = {};
  Object.keys(led).forEach(iso => {
    const n = N2I[ALIAS[iso] || iso];
    if (n !== undefined) byNum[n] = Object.assign({iso}, led[iso]);
  });

  const shapes = feats.map(f => {
    const e = byNum[f.id];
    const d = path(f);
    if (!d) return '';
    const label = e
      ? `${ISO_NAME[e.iso] || e.iso}\nLeads ${e.n} of ${rows.length} segments\n` +
        `${e.segs.slice(0, 6).join('\n')}${e.segs.length > 6 ? `\n…and ${e.segs.length - 6} more` : ''}`
      : `${f.name}\nleads no segment in this selection`;
    return `<path d="${d}" fill="${e ? leaderColor(e.n, max) : 'var(--mapnone)'}" ` +
           `stroke="var(--mapline)" stroke-width="0.4"><title>${esc(label)}</title></path>`;
  }).join('');

  const nLead = Object.keys(led).length;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" class="growthmap" ` +
         `aria-label="${esc(opts.aria)}">${shapes}</svg>` +
         `<p class="mapfoot"><b>${nLead}</b> countries lead at least one of the
          <b>${rows.length}</b> segments on screen; the darkest leads <b>${max}</b>.
          This is not a map of concentration &mdash; HHI has no country dimension. It is a
          map of <b>who is the largest exporter</b> of each segment, which is a different
          and blunter question: leading a segment with a 12% share is not the same as
          leading one with a 60% share. The Top-1 share column carries that.</p>`;
}

function leaderLegendHTML(max) {
  const steps = max <= 1 ? [1] : [1, Math.ceil(max / 3), Math.ceil(2 * max / 3), max]
    .filter((v, i, a) => a.indexOf(v) === i);
  return `<div class="maplegend">
      <span class="mlab">Segments led</span>
      ${steps.map(n => `<span class="mlab"><span class="msw" style="background:${
        leaderColor(n, max)}"></span>${n}</span>`).join('')}
      <span class="mlab"><span class="msw"></span>none</span>
    </div>`;
}

function mapLegendHTML() {
  const ticks = [-0.25, -0.10, 0, 0.10, 0.25, 0.50];
  const grad = MAP_STOPS.map(([v, c]) => {
    const p = ((v + 0.25) / 0.75 * 100).toFixed(1);
    return `rgb(${c.join(',')}) ${p}%`;
  }).join(',');
  return `<div class="maplegend">
      <span class="mlab">CAGR</span>
      <span class="mbar" style="background:linear-gradient(to right,${grad})"></span>
      <span class="mticks">${ticks.map(t =>
        `<i>${t > 0 ? '+' : ''}${(t * 100).toFixed(0)}%</i>`).join('')}</span>
      <span class="mlab"><span class="msw"></span>not in selection</span>
    </div>`;
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

  /* Map mode, and only where a row IS a country. Q1 chains and Q2 segments have
   * no geography, which is why syncVMode() hides the button there rather than
   * drawing an empty world. */
  if (STATE.viewMode === 'map' && MAP_VIEWS.has(STATE.preset)) {
    const rows = STATE.rowsAll && STATE.rowsAll.length ? STATE.rowsAll : (STATE.rows || []);
    tbl.hidden = true; wrap.hidden = false; leg.hidden = false;
    if (!rows.length) { wrap.innerHTML = ''; leg.innerHTML = ''; return; }
    /* Q6's rows are segments, not countries, so it gets the leader map instead
     * of the growth choropleth — same projection, different question. */
    if (STATE.preset === 'conc') {
      const max = Object.values(rows.reduce((a, r) => {
        if (r.top1) a[r.top1] = (a[r.top1] || 0) + 1;
        return a;
      }, {})).reduce((m, n) => Math.max(m, n), 0);
      wrap.innerHTML = leaderMapSVG(rows, {
        aria: document.getElementById('summary').textContent.trim()
      });
      leg.innerHTML = leaderLegendHTML(max);
      return;
    }
    wrap.innerHTML = growthMapSVG(rows, {
      y0: STATE.y0, y1: STATE.y1,
      lab: STATE.preset === 'exporters' ? 'Exports' : 'Imports',
      aria: document.getElementById('summary').textContent.trim()
    });
    leg.innerHTML = mapLegendHTML();
    return;
  }

  const on = STATE.viewMode === 'visual' && MATRIX_VIEWS.has(STATE.preset);
  tbl.hidden = on;
  wrap.hidden = leg.hidden = !on;
  if (!on) { wrap.innerHTML = ''; leg.innerHTML = ''; return; }

  const years = STATE.years || [], rows = STATE.rows || [];
  if (!years.length || !rows.length) { wrap.innerHTML = ''; leg.innerHTML = ''; return; }

  /* Q6 is never stacked: stacking HHI would add indices together, which is not
   * a quantity. Its rows also need both fields in the label — `chain` alone
   * repeats four times, once per stage. */
  const stacked = STATE.preset === 'segments' && STATE.arith === 'levels';
  const labelOf = STATE.preset === 'conc'
    ? (r => `${r.chain} · ${r.stage}`)
    : (r => r.chain || r.segment || r.country || r.iso3 || '');
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
  /* The map needs a country per row, which only Q3 and Q4 have. Rather than
   * draw an empty world on Q1/Q2, hide the button — and if the reader was
   * already in map mode when they switched view, put them back in the table
   * instead of leaving them on a mode that renders nothing. */
  const mapOK = MAP_VIEWS.has(STATE.preset);
  const mb = grp.querySelector('[data-vmode="map"]');
  if (mb) mb.hidden = !mapOK;
  if (!mapOK && STATE.viewMode === 'map') STATE.viewMode = 'data';
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
    C.pct('cagr', 'CAGR', 'derived', SRC_CALC,
      `Compound Annual Growth Rate — the average rate the series grew per year, compounding; not the sum or the average of the yearly changes. = (value ${STATE.y1} / value ${STATE.y0})^(1/${yearsSel()}) − 1, on the $ levels — unaffected by the “Read as” toggle.`),
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
const MATRIX_VIEWS = new Set(['chains', 'segments', 'exporters', 'importers', 'conc']);
/* Views carrying a year column per year. Deliberately WIDER than MATRIX_VIEWS:
 * the HS-6 detail view gained a year matrix, but 302 product series cannot be
 * drawn as a chart, so it takes the "Read as" toggle without taking Visual
 * mode. Keeping the two sets apart is what lets one grow without the other. */
const YEARCOL_VIEWS = new Set([...MATRIX_VIEWS, 'products', 'conc']);
/* Q6's year matrix holds an index, not a quantity, so "=100" would rebase an
 * index — an index of an index. The button is hidden there rather than left to
 * produce a number nobody can interpret. */
const NO_INDEX_VIEWS = new Set(['conc']);
/* The four-panel view is charts only — the Data/Visual toggle does not apply. */
const PANEL_VIEW = 'panels';

/* Default row cap for the two country views. 229 economies is a scroll, not a
 * table; the count is always stated and "show all" is one click away. */
const TOP_N = 15;
const FLOW_VIEWS = new Set(['exporters', 'importers']);
/* Views whose rows are countries, and so can be drawn on a map. Same membership
 * as FLOW_VIEWS today, kept separate because the reason differs: FLOW_VIEWS is
 * about the row cap, MAP_VIEWS is about having geography at all. */
const MAP_VIEWS = new Set(['exporters', 'importers', 'conc']);

/* What a year column actually holds, for the exported Notes block. */
const ARITH_EXPORT_NOTE = {
  levels: 'Trade value in KUSD (thousands of USD), as recorded in BACI. Raw and unrounded.',
  yoy:    'Year-on-year growth as a decimal fraction (0.025 = +2.5%), = (value in this year / value in the previous year) − 1. Switch “Read as” to $ on the page and re-download for the underlying levels.',
  index:  'Index, first year of the selected window = 100, = 100 × (value in this year / value in the first year). Switch “Read as” to $ on the page and re-download for the underlying levels.'
};

const BASIS_EXPORT_NOTE = {
  raw: 'RAW — every dollar of trade in this chain’s HS basket, exactly as BACI records it. A product used by many industries (copper ore, steel, aluminium) counts in full towards this chain.',
  corrected: 'CORRECTED FOR MULTI-USE — upstream flows scaled by the EXIOBASE share of that product’s use attributable to this chain. Applies to Raw Material and Processed Material rows ONLY; Product Component, Process Equipment and Final Product rows are unchanged (share = 1.0 by modelling assumption, not by measurement). Corrected totals are NOT comparable to published BACI figures.'
};

const BASKET_EXPORT_NOTE = {
  full: 'FULL BASKET — the index is computed over every HS code this chain claims. 107 of 431 dictionary codes are claimed by more than one chain (copper ore 260300 by ten), so a shared code’s exporters shape several chains’ indices at once. Do NOT read these as chain sizes.',
  exclusive: 'CHAIN-EXCLUSIVE BASKET — the index is computed only over HS codes claimed by exactly one chain (324 of 431). Five segments have no such codes at all and are absent from this file entirely: Electrolyzers Final Product, Electrolyzers Upstream, Heat Pumps Upstream, Magnets Final Product, Transmission Upstream.'
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
/* Every view's summary line ends with this, so the basis travels with the
 * headline total. A corrected total is roughly half a raw one on an
 * upstream-heavy selection; a screenshot of the number without the basis beside
 * it is the same class of error as a year column with no units. Raw adds
 * nothing to the line — it is the default, and labelling the default on every
 * view would train the reader to stop reading the suffix. */
function arithSuffix() {
  const a = (ARITH_META[STATE.arith] || ARITH_META.levels).suffix();
  return a + (STATE.basis === 'corrected' ? ' · corrected for multi-use' : '');
}

/* Show the toggle only where it means something, and keep the index button
 * labelled with the actual base year — a button reading "2015=100" when the
 * window starts in 2003 is a lie. */
function syncArith() {
  const grp = document.getElementById('arith-grp');
  if (!grp) return;
  grp.hidden = !(YEARCOL_VIEWS.has(STATE.preset) || STATE.preset === PANEL_VIEW);
  const ix = document.getElementById('ar-index');
  if (ix) {
    ix.textContent = `${STATE.y0}=100`;
    ix.hidden = NO_INDEX_VIEWS.has(STATE.preset);
    /* If the reader arrived on Q6 already in index mode, fall back rather than
     * render a rebased index and let them read it as a quantity. */
    if (ix.hidden && STATE.arith === 'index') STATE.arith = 'levels';
  }
  grp.querySelectorAll('.ar').forEach(b =>
    b.classList.toggle('on', b.dataset.arith === STATE.arith));
}

/* The basis toggle applies to every view, so unlike `arith` it is never hidden.
 * What it does do is say when it has no effect: on a view with no Raw Material
 * or Processed Material rows the two bases are identical by construction, and
 * a control that visibly does nothing has to explain itself or it reads as
 * broken. basisMoves() is set inside val() during the render that just ran. */
function syncBasis() {
  const grp = document.getElementById('basis-grp');
  if (!grp) return;
  grp.querySelectorAll('.ar').forEach(b =>
    b.classList.toggle('on', b.dataset.basis === STATE.basis));
  const corr = document.getElementById('ba-corr');
  if (!corr) return;
  /* Q6 is not a trade total, so the multi-use basis has nothing to scale: HHI
   * is a ratio of shares WITHIN a segment, and multiplying every exporter of a
   * code by the same factor leaves those shares essentially untouched while
   * making Segment trade disagree with the rest of the page. Reported as
   * inapplicable rather than left looking live. */
  const isConc = STATE.preset === 'conc';
  const moves = !isConc && basisMoves();
  corr.classList.toggle('inert', !moves);
  corr.title = isConc
    ? 'Does not apply to this view. Concentration is a ratio of exporter shares ' +
      'within a segment; scaling every exporter of a code by the same use share ' +
      'leaves those shares unchanged. Use the Basket control instead — that is ' +
      'the choice that moves these numbers.'
    : moves
    ? 'Upstream flows scaled by the EXIOBASE share of that product’s use ' +
      'attributable to this chain. Applies to Raw Material and Processed ' +
      'Material rows only; everything downstream is unchanged.'
    : 'No effect on this view: it holds no Raw Material or Processed Material ' +
      'rows, and only those carry a use-share measurement. Every other role is ' +
      '1.0 by modelling assumption, so the two bases are identical here.';
}

/* Q6's basket control. Unlike the basis toggle this is hidden off Q6 entirely,
 * because no other view has two baskets — a control that is inapplicable
 * everywhere but one place is clutter, not information. */
function syncBasket() {
  const grp = document.getElementById('basket-grp');
  if (!grp) return;
  grp.hidden = STATE.preset !== 'conc';
  grp.querySelectorAll('.ar').forEach(b =>
    b.classList.toggle('on', b.dataset.basket === STATE.basket));
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
    C.pct('cagr', 'CAGR', 'derived', SRC_CALC,
      `Compound Annual Growth Rate — the average rate the series grew per year, compounding; not the sum or the average of the yearly changes. = (value ${STATE.y1} / value ${STATE.y0})^(1/${yearsSel()}) − 1, on the $ levels — unaffected by the “Read as” toggle.`),
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
      s.byYear[d.year] = (s.byYear[d.year] || 0) + val(d);
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
    /* The world total used to be a column. It is one constant repeated down
     * every row, so it cost a column's width to say a single number — removed
     * 2026-08-05. It has NOT simply been dropped: World share below is a ratio,
     * and this page's rule is that every operand of a displayed ratio stays
     * visible. The denominator is now stated once, in the note under the table,
     * and it still goes into the download's Notes block. */
    C.pct('sh1', `World share ${STATE.y1}`, 'derived', SRC_CALC,
      `= (${lab} ${STATE.y1}) / (world ${lab.toLowerCase()} ${STATE.y1}). The denominator is one number for the whole view — ${fmtV(world[STATE.y1] || 0)} — and is stated in the note under the table rather than repeated down a column.`),
    C.pct('shDelta', 'Share change', 'derived', SRC_CALC,
      `= (World share ${STATE.y1}) − (World share ${STATE.y0}), in percentage points.`),
    C.spark('_spark', 'Trend',
      `A drawing of this row's year cells, ${years[0]}–${years[years.length - 1]}: nothing is computed here that is not already a column. Scaled to this row's own range, so it shows shape — the magnitude is in the cells beside it. A gap is a break in the series, not a zero.`),
    C.pct('cagr', 'CAGR', 'derived', SRC_CALC,
      `Compound Annual Growth Rate — the average rate the series grew per year, compounding; not the sum or the average of the yearly changes. = (value ${STATE.y1} / value ${STATE.y0})^(1/${yearsSel()}) − 1, on the $ levels — unaffected by the “Read as” toggle.`)
  ];
  STATE.rows = shown;
  /* The table is capped at TOP_N, the map is not. A choropleth that drew only
   * the top 25 exporters would leave most of the world blank and read as "no
   * trade" rather than "not in the top 25" — the opposite of what the map is
   * for, which is seeing where growth is happening away from the leaders. */
  STATE.rowsAll = all;
  STATE.years = years;
  STATE.notes = [];
  /* Carried for the download's Notes block: the World share denominator left the
   * table as a column, so it has to reach the exported file some other way or a
   * reader working offline cannot reproduce the share. Cleared by every other
   * view — see clearFlowTotals() at the top of render(). */
  STATE.worldTot = {y0: world[STATE.y0] || 0, y1: world[STATE.y1] || 0, lab: lab.toLowerCase()};
  /* The World share denominator, stated once — it replaced a column that held
   * this same number on every row (2026-08-05). It stays on screen because the
   * share above it is a ratio, and no ratio on this page is shown without its
   * operands. */
  STATE.notes.push(
    `<b>World ${lab.toLowerCase()} ${STATE.y1}: ${fmtV(world[STATE.y1] || 0)}</b> —
     the denominator behind the World share column, summed over
     <b>every</b> country in this view including any hidden by the row cap.
     World ${lab.toLowerCase()} ${STATE.y0} was ${fmtV(world[STATE.y0] || 0)},
     which is the ${STATE.y0} end of the Share change column.`);
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
    s.byYear[d.year] = (s.byYear[d.year] || 0) + val(d);
  });
  return Object.values(acc);
}

/* ── View: Q6, one row per chain × stage — the choke points ─────────────── */
/* How concentrated is each segment's export base, and is it narrowing.
 *
 * The year matrix holds HHI, not dollars — the one view where it does. That is
 * deliberate: concentration is only interesting as a trajectory, and the
 * alternative (a second chart surface for one view) costs more than it saves
 * and splits the download path in two. The consequence is that "=100" would be
 * an index of an index, which is meaningless; syncArith() suppresses it here.
 *
 * HHI = Σ sᵢ² over exporter shares of that segment-year, as fractions, so it
 * runs (0,1]. The competition-authority ×10,000 scale is not used on screen:
 * this page shows fractions everywhere else and one column on a different scale
 * would be read wrong. The threshold most people know — 2,500 = "highly
 * concentrated" — is 0.25 here, and it is stated in the note rather than
 * implied by a colour. */
const CONC_HI = 0.25;   /* the 2,500 competition-authority line, as a fraction */
/* How far the two baskets must diverge before a row is marked. A JUDGEMENT, so
 * it is defined once and its effect is stated: on the current data it flags
 * Upstream and Midstream rows and leaves most Final Product rows clean, which
 * is the expected shape given which codes are shared. */
const CONC_GAP = 0.05;

async function viewConcentration() {
  const L = STATE.idx.lookups, years = windowYears();
  const rows0 = await loadConc();
  const bi = L.basket.indexOf(STATE.basket);
  const other = STATE.basket === 'full' ? 'exclusive' : 'full';
  const oi = L.basket.indexOf(other);
  const oneChain = STATE.tech !== 'ALL';

  /* Both baskets are built, always. The selected one paints the row; the other
   * one decides whether the row gets marked. A reader who never touches the
   * control still has to be told when the number in front of them is one of
   * two very different answers. */
  const mk = (acc, d) => {
    const key = `${d.tech}||${d.stage}`;
    return acc[key] || (acc[key] = {
      key, tech: d.tech, stage: L.stage[d.stage],
      chain: techName(d.tech), byYear: {}, cr3: null, cr1: null,
      nexp: null, top1: null, v: null, otherByYear: {}, otherSeen: false
    });
  };
  const acc = {};
  rows0.forEach(d => {
    if (oneChain && d.tech !== +STATE.tech) return;
    if (d.basket === bi) {
      const s = mk(acc, d);
      s.byYear[d.year] = d.hhi;
      if (d.year === STATE.y1) {
        s.cr3 = d.cr3; s.cr1 = d.cr1; s.nexp = d.nexp;
        s.top1 = d.top1 === null || d.top1 === undefined ? null : L.iso[d.top1];
        s.v = d.v;
      }
    } else if (d.basket === oi) {
      const s = mk(acc, d);
      s.otherSeen = true;
      s.otherByYear[d.year] = d.hhi;
    }
  });

  const series = Object.values(acc);
  /* Two kinds of disagreement, and they are not the same thing:
   *  - `gap`   — both baskets measure the segment, and differ.
   *  - `only`  — the segment has NO chain-exclusive codes, so it exists in the
   *              full basket alone. Five segments are like this; Transmission's
   *              whole Upstream basket is a subset of Nuclear's. A blank row
   *              would read as missing data; this is a finding. */
  series.forEach(s => {
    const a = s.byYear[STATE.y1], b = s.otherByYear[STATE.y1];
    s.hhiOther = (b === undefined ? null : b);
    s.gap = (a === undefined || b === undefined) ? null : Math.abs(a - b);
    s.onlyFull = !s.otherSeen && STATE.basket === 'full';
    s.missingHere = Object.keys(s.byYear).length === 0;
  });

  const rows = series.filter(s => !s.missingHere).map(s => {
    const r = {chain: s.chain, stage: s.stage, key: s.key,
               _last: s.byYear[STATE.y1] || 0, _tech: s.tech};
    /* asLevels, not applyArith: HHI has no dollar reading, and rebasing an
     * index to 100 would invent a quantity. YoY on HHI is legitimate — it is
     * the rate the segment is narrowing — so that mode is left available. */
    const vals = STATE.arith === 'yoy' ? asYoY(s, years) : asLevels(s, years);
    years.forEach((y, i) => { r['y' + y] = vals[i]; });
    r._spark = vals;
    r.cr3 = s.cr3; r.cr1 = s.cr1; r.nexp = s.nexp; r.top1 = s.top1; r.v = s.v;
    r.hhiOther = s.hhiOther; r.gap = s.gap; r.onlyFull = s.onlyFull;
    r.hhiDelta = (s.byYear[STATE.y0] !== undefined && s.byYear[STATE.y1] !== undefined)
      ? s.byYear[STATE.y1] - s.byYear[STATE.y0] : null;
    return r;
  }).sort((a, b) => b._last - a._last);

  const bLab = STATE.basket === 'full' ? 'full' : 'chain-exclusive';
  const howH = `Herfindahl-Hirschman Index on exporter shares of this segment in that year: Σ (country share)², over exporters with positive trade. Runs 0–1; 1 would be a single exporter. Computed on the ${bLab} HS basket. The competition-authority "highly concentrated" line of 2,500 is ${CONC_HI} on this scale.`;
  STATE.cols = [
    C.txt('chain', 'Supply chain', 'raw', SRC_GD, 'NZIPL value-chain classification.'),
    C.txt('stage', 'Stage', 'raw', SRC_GD, 'NZIPL value-chain stage.'),
    ...yearCols(years).map(c => Object.assign({}, c, {
      cls: STATE.arith === 'yoy' ? 'derived' : 'derived',
      src: SRC_CALC,
      fmt: STATE.arith === 'yoy' ? fmtPct : (v => fmtN(v, 3)),
      how: STATE.arith === 'yoy'
        ? `Change in HHI against the previous year, as a fraction of the previous year's HHI. Both operands are cells in this row — switch “Read as” to $ to see them.`
        : howH
    })),
    C.num('hhiDelta', `HHI change ${STATE.y0}→${STATE.y1}`, 'derived', SRC_CALC,
      `= (HHI ${STATE.y1}) − (HHI ${STATE.y0}), both shown. Positive means the segment’s exports concentrated into fewer countries over the window.`, 3),
    C.pct('cr3', `Top-3 share ${STATE.y1}`, 'derived', SRC_CALC,
      `Combined share of this segment’s world exports held by its three largest exporters in ${STATE.y1}, on the ${bLab} basket.`),
    C.pct('cr1', `Top-1 share ${STATE.y1}`, 'derived', SRC_CALC,
      `Share held by the single largest exporter in ${STATE.y1}, on the ${bLab} basket.`),
    C.txt('top1', 'Top exporter', 'derived', SRC_CALC,
      `The country holding the Top-1 share in ${STATE.y1}. This is where a country appears in this view — the country filter does not apply here.`),
    C.num('nexp', `Exporters ${STATE.y1}`, 'derived', SRC_CALC,
      `Countries with positive exports in this segment in ${STATE.y1}. The HHI denominator’s support — a segment with 12 exporters and one with 120 can share an HHI.`, 0),
    C.spark('_spark', 'Trend',
      `A drawing of this row's HHI cells, ${years[0]}–${years[years.length - 1]}. Rising means narrowing to fewer exporters.`),
    /* Segment trade is what makes an HHI interpretable and it is not optional:
     * HHI 0.24 on $3bn and HHI 0.24 on $300bn are different facts. */
    C.val('v', `Segment trade ${STATE.y1}`, 'raw', SRC_BACI,
      `World exports of this segment in ${STATE.y1}, on the ${bLab} basket — the base the shares are computed over. An HHI without it cannot be read: a highly concentrated segment worth $200m is not the same finding as one worth $200bn.`)
  ];
  STATE.rows = rows;
  STATE.rowsAll = rows;
  STATE.years = years;
  STATE.notes = [];

  const marked = rows.filter(r => r.gap !== null && r.gap >= CONC_GAP).length;
  const onlyF = rows.filter(r => r.onlyFull).length;
  STATE.notes.push(
    `<b>Two baskets, and this tool does not pick one.</b> ${
      STATE.basket === 'full'
        ? 'You are looking at the <b>full</b> basket: every HS code each chain claims. 107 of 431 dictionary codes are claimed by more than one chain, so a shared code shapes several chains’ indices at once.'
        : 'You are looking at the <b>chain-exclusive</b> basket: only codes claimed by exactly one chain.'
    } ${marked} row${marked === 1 ? '' : 's'} here read materially differently on the
     other basket (marked &#9873;), and where they do, <b>the disagreement is the
     finding</b> — not a defect to pick a side on.`);
  if (onlyF) STATE.notes.push(
    `<b>${onlyF} segment${onlyF === 1 ? ' has' : 's have'} no chain-exclusive codes at all</b>
     (marked &#8709;) — every code in ${onlyF === 1 ? 'it is' : 'them is'} shared with another
     chain, so ${onlyF === 1 ? 'it disappears' : 'they disappear'} entirely from the
     chain-exclusive basket. Transmission’s whole Upstream basket is a subset of Nuclear’s:
     one iron-ore fact, reported under several chains.`);
  STATE.notes.push(
    `<b>This view measures the overlap; it does not resolve it.</b> Deciding which chain
     <i>owns</i> a shared code needs a rule that does not yet exist, so no number here should
     be read as a settled chain size.`);

  const scope = oneChain ? techName(+STATE.tech) : 'all 10 chains';
  const hi = rows.filter(r => r._last >= CONC_HI).length;
  return `<span class="k">${rows.length}</span> chain&times;stage segments &middot;
          ${esc(scope)} &middot; ${STATE.y0}&ndash;${STATE.y1} &middot;
          <span class="k">${hi}</span> above HHI ${CONC_HI} in ${STATE.y1}
          &middot; ${bLab} basket`;
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
    w.by[d.year] = (w.by[d.year] || 0) + val(d);
    if (d.year === wy) w.v0 += val(d);
    else if (d.year === wy1) w.v1 += val(d);
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
      k.by[d.year] = (k.by[d.year] || 0) + val(d);
      if (d.year === wy) k.v0 += val(d);
      else if (d.year === wy1) k.v1 += val(d);
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
      /* w0/w1/c0/c1 are whatever basis STATE.basis selects — they are summed
       * from val(), so under Corrected the endpoints, the CAGR built on them,
       * and RCA built on those are all one consistent basis. The `*c` twin
       * fields that used to sit here are gone with their columns. */
      w0: w.v0, w1: w.v1,
      c0: isCountry ? k.v0 : null, c1: isCountry ? k.v1 : null,
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
    /* 'BACI trade years' was a column until 2026-08-05. It is now carried where
     * it is actually needed: `r.span` still feeds the ⚠ tooltips on the HS-6
     * code cell, which name the first or last year of trade for exactly the
     * codes whose series breaks. For every other row the span was the window
     * the year matrix already draws, so the column restated a fact the reader
     * could see. The field stays on the row; only the column is gone. */
    /* THE FOUR CORRECTED TWINS WERE REMOVED HERE ON 2026-08-05: `World trade
     * <y> corrected` ×2 and `<ISO> exports <y> corrected` ×2. They were the
     * whole of the multi-use correction's presence in this tool — four columns
     * in one view out of five — and the Raw | Corrected toggle replaces them
     * everywhere at once. With the toggle on Corrected the columns below ARE
     * the corrected numbers, so a twin would restate its neighbour.
     *
     * `Use share` STAYS, against the plan, which listed it for removal. The
     * plan was written before the request of 2026-08-05 to render it as a
     * percentage to one decimal — an instruction to keep a column, not to drop
     * it. It is also the only thing on the page that explains WHY a row moves
     * when the toggle flips: the toggle shows the effect, this shows the cause.
     *
     * `w0`/`w1` STAY for a harder reason: they are the operands of Country
     * share, World share, RCA and World market share, all of which are
     * rendered. Removing them would break this page's ground rule that every
     * derived cell is reproducible from cells beside it. */
    C.pct1('ushare', 'Use share', 'raw', SRC_EXIO, howShare),
    C.val('w0', `World trade ${STATE.y0}`, 'raw', SRC_BACI, howW),
    C.val('w1', `World trade ${STATE.y1}`, 'raw', SRC_BACI, howW)
  ];
  if (isCountry) {
    const nm = isoLabel(L.iso[ci]);
    STATE.cols.push(
      C.val('c0', `${L.iso[ci]} exports ${STATE.y0}`, 'raw', SRC_BACI, `Sum of BACI flows on this code with ${nm} as exporter.`),
      C.val('c1', `${L.iso[ci]} exports ${STATE.y1}`, 'raw', SRC_BACI, `Sum of BACI flows on this code with ${nm} as exporter.`),
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
   * point — those columns are the operands of RCA, and every operand stays on
   * screen. Both the matrix and the endpoints are built from val(), so the
   * whole row is on ONE basis: the sentence that used to sit here, saying the
   * correction is not applied to the matrix, described the four corrected-twin
   * columns that the Raw | Corrected toggle replaced. */
  STATE.cols.push(
    ...yearCols(pyears).map(c => Object.assign(c, {
      how: c.how + (isCountry
        ? ` Sum of BACI flows on this code with ${isoLabel(L.iso[ci])} as exporter.`
        : ' World trade on this code, all exporters.') +
        ' Raw — the multi-use correction is applied in the endpoint columns, which show the use share next to them.'
    })),
    C.spark('_spark', 'Trend',
      `A drawing of this row's year cells, ${pyears[0]}–${pyears[pyears.length - 1]}: nothing is computed here that is not already a column. Scaled to this row's own range, so it shows shape — the magnitude is in the cells beside it. A gap is a break in the series, not a zero.`),
    C.pct('cagr', 'CAGR', 'derived', SRC_CALC, `Compound Annual Growth Rate — the average rate at which this series grew per year, compounding; not the sum of the yearly changes. = (v${STATE.y1} / v${STATE.y0})^(1/${yearsSel()}) − 1, on the ${isCountry ? L.iso[ci] + ' export' : 'world trade'} columns. −100.0% means the series reaches zero — check the HS revision first.`),
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
    <b>HS revision</b> column and hover the &#9888; flag, which names the first or last
    year of trade for that code:
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
  /* Only viewFlow sets this. Clearing it here rather than trusting each view to
   * unset it means a stale world total from Q3 can never be exported inside a Q1
   * download — the failure mode would be a plausible-looking wrong number in a
   * file, which is the worst kind this page can produce. */
  STATE.worldTot = null;
  /* Reset before the view runs, so basisMoves() describes THIS pass. Left set
   * from a previous view it would claim the toggle bites on a view where it
   * does not. */
  _basisDiffers = false;
  try {
    if (STATE.preset === 'panels')          note = await viewPanels();
    else if (STATE.preset === 'chains')     note = await viewChains();
    else if (STATE.preset === 'segments')   note = await viewSegments();
    else if (STATE.preset === 'exporters')  note = await viewFlow('exporters');
    else if (STATE.preset === 'importers')  note = await viewFlow('importers');
    else if (STATE.preset === 'conc')       note = await viewConcentration();
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
  /* After the view, never before: basisMoves() reports what val() saw during
   * the pass that just finished. */
  syncBasis();
  syncBasket();
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

/* Fills the notes blocks whose text is static markup in the HTML — only the
 * EXIOBASE source year and the engine's own note are injected, so a failed slice
 * load still leaves the text readable on the page. */
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
           `<span class="lab">${c.label}${arrow}</span></th>`;
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
    /* Q6's basket-disagreement markers, on the Stage cell so they sit beside
     * the segment they qualify. This is the whole point of Task 3: a reader who
     * never touches the Basket control still has to be told when the number in
     * front of them is one of two very different answers. Magnets Midstream is
     * the worked example — 0.055 full against 0.397 exclusive, because the full
     * basket's leading exporters are aluminium producers, not magnet makers. */
    if (c.key === 'stage' && STATE.preset === 'conc') {
      if (r.onlyFull) {
        cell += `<span class="flag" title="No chain-exclusive codes: every HS code in this segment is also claimed by another chain, so this segment does not exist in the chain-exclusive basket at all. It is measuring trade that several chains share.">&#8709;</span>`;
      } else if (r.gap !== null && r.gap >= CONC_GAP) {
        const otherName = STATE.basket === 'full' ? 'chain-exclusive' : 'full';
        cell += `<span class="flag warn" title="The two baskets disagree here: HHI ${fmtN(r._last, 3)} on the ${STATE.basket === 'full' ? 'full' : 'chain-exclusive'} basket against ${fmtN(r.hhiOther, 3)} on the ${otherName} one — a gap of ${fmtN(r.gap, 3)}. Shared HS codes are doing the work. Switch the Basket control to see the other reading; neither is the answer.">&#9873;</span>`;
      }
    }
    if (c.key === 'ushare' && r.ushareWhy === 'assumption') {
      cell += `<span class="flag" title="No correction applied: downstream inputs are already tech-specific — use share 1.0 by assumption, not by measurement. This row reads the same under Raw and Corrected.">&#8801;</span>`;
    }
    const zero = (typeof r[c.key] === 'number' && r[c.key] === 0) ? ' num0' : '';
    /* Wide free-text columns (informal_tag) are clamped to three lines so one
     * long internal label cannot blow up the row height; the full value stays
     * available on hover and in the exported file. */
    if (c.wide) {
      const full = String(r[c.key] === null || r[c.key] === undefined ? '' : r[c.key]);
      return `<td class="${cls}${zero}" title="${esc(full)}"><span class="clamp">${cell}</span></td>`;
    }
    /* Official BACI descriptions run to a paragraph for some codes ("Machines and
     * mechanical appliances having individual functions, not specified…"), which
     * made a single row three or four lines tall and pushed the year matrix off
     * screen. Capped at two lines in a scroll box (2026-08-05): the row height is
     * now uniform and nothing is lost — the rest scrolls inside the cell, the full
     * string stays on hover, and the export is untouched. */
    if (c.key === 'desc') {
      const full = String(r[c.key] === null || r[c.key] === undefined ? '' : r[c.key]);
      return `<td class="${cls}${zero}" title="${esc(full)}"><div class="descbox">${cell}</div></td>`;
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

/* Generated from the same column objects that paint the table, so the source
 * line here and the column on screen can never disagree.
 *
 * The RAW / DERIVED / MODEL badge was dropped 2026-08-05: it was accurate but
 * low-information next to `src` and `how`, which say where the number came from
 * and how it was made. `cls` is still carried on every column object — the year
 * columns switch it with the arithmetic mode — it is simply no longer painted. */
function paintDict() {
  document.getElementById('dictbody').innerHTML = STATE.cols.map(c => `
    <tr><td><b>${c.label}</b></td>
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
    <b>Multi-use correction.</b> The <b>Count as</b> control restates every number on
    every view. <i>Raw</i> counts each dollar of trade in the chain&rsquo;s HS basket as
    BACI records it. <i>Corrected</i> scales each flow by the EXIOBASE direct use share
    for that (chain, HS-6 code) &mdash; the fraction of that product&rsquo;s use
    attributable to this chain. The scaling happens in the builder, per flow, before any
    aggregation, which is why the country and segment totals can be corrected at all.
    Only Raw Material and Processed Material carry a measured share (${
      esc(String(m.basis_pairs_measured || ''))} chain&times;code pairs); every other role
    is 1.0 by assumption &mdash; downstream inputs are already chain-specific. On a view
    with no upstream rows the two bases are identical. Corrected totals are not comparable
    to published BACI figures.<br>
    <b>Formulas.</b> share = value / total, both shown &middot;
    <b>CAGR</b> &mdash; <b>Compound Annual Growth Rate</b>, the average rate the series grew
    per year, compounding, not the sum of the yearly changes
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
  conc:      'Q6 · Where are the choke points? (one row per supply chain × value-chain stage)',
  products:  'HS-6 product detail (one row per HS-6 code)'
};

function buildExportRows() {
  /* Drawings do not go in a file: the Trend column is a picture of the year
   * columns, which are exported in full right next to it. */
  const cols = STATE.cols.filter(c => !c.viz);
  /* Plain column labels: the `[RAW]` / `[DERIVED]` suffix went with the on-screen
   * badge on 2026-08-05. A header that reads exactly like the screen is easier to
   * match against by hand, and the Notes block still names every source and
   * formula per column. */
  const header = cols.map(c => c.label);
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
    /* Same reason as the line above, and a sharper one: raw and corrected differ
     * by roughly a factor of two on an upstream-heavy selection. A file that did
     * not say which basis produced it could be quoted against the other one. */
    ...(STATE.preset === 'conc'
      ? [['HS basket', BASKET_EXPORT_NOTE[STATE.basket] || BASKET_EXPORT_NOTE.full]]
      /* The multi-use basis is meaningless on Q6 and stating it would imply the
       * numbers had been through it. Q6 states its own basket instead. */
      : [['Counted as', BASIS_EXPORT_NOTE[STATE.basis] || BASIS_EXPORT_NOTE.raw]]),
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
    ['Per-column detail', 'Every column has its own source and formula line in the ' +
                          '“Where each column comes from” block below.'],
    ['split_weight applied', 'NO — values are exact raw BACI numbers per HS-6 code. A code ' +
                             'shared by two chains carries its full value in both, so chain ' +
                             'totals overlap and must not be added into a world figure.'],
    [],
    ['— Formulas —'],
    ['share', 'value / total (both operands are columns in this file)'],
    /* The World share denominator is a single number for the whole view, so it
     * is a note rather than a column (2026-08-05). It must still be here, or the
     * share cannot be reproduced from the file alone. */
    ...(STATE.worldTot ? [
      [`World ${STATE.worldTot.lab} ${STATE.y1}`,
       `${STATE.worldTot.y1} — denominator of the World share column, summed over every ` +
       `country in this view including any hidden by the row cap. Same units as the ` +
       `value columns.`],
      [`World ${STATE.worldTot.lab} ${STATE.y0}`,
       `${STATE.worldTot.y0} — the ${STATE.y0} denominator, behind the Share change column.`]
    ] : []),
    ['CAGR', 'Compound annual growth rate: the average rate the series grew per ' +
             'year, compounding — NOT the sum or the average of the yearly changes. ' +
             '= (v1 / v0)^(1/years) − 1 (both endpoints are columns in this file). ' +
             '−1 means the series reaches zero — check the HS revision column first.'],
    ['RCA (within basket)', '(country share of basket) / (world share of basket); all 4 ' +
                            'operands are columns in this file'],
    ['RCA caveat', m.rca_caveat],
    ['SHAP', 'External model output (predicted-competitiveness random forest). ' +
             'It is not recomputable from this file.'],
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
    ['Basis of this file', BASIS_EXPORT_NOTE[STATE.basis] || BASIS_EXPORT_NOTE.raw],
    ['How the correction is applied', 'In the R builder, to each bilateral flow, BEFORE ' +
      'any aggregation — so every view is exact, including the country totals that ' +
      'aggregate the HS-6 dimension away. Each slice carries both aggregates (v raw, ' +
      'vc corrected) and the page reads one of them. Under Corrected, every number in ' +
      'this file — levels, CAGR, basket shares, RCA, market share — is on the corrected ' +
      'basis, because all of them are computed from the same scaled operands.'],
    ...(STATE.preset === 'conc' ? [
      [],
      ['— Concentration (Q6) —'],
      ['HHI', 'Herfindahl-Hirschman Index on exporter shares within each (chain, stage, ' +
              'year): the sum of squared country shares of that segment\'s world exports, ' +
              'as fractions. Runs 0-1; 1 would be a single exporter. The competition-' +
              'authority "highly concentrated" line of 2,500 on the x10,000 scale is 0.25 ' +
              'here. Source: scripts/build_data/12_build_stage_concentration.R.'],
      ['Why two baskets', STATE.idx.meta.basket_note || ''],
      ['What this does NOT settle', 'Q6 measures the effect of chains sharing HS codes; it ' +
              'does not resolve it. Deciding which chain owns a shared code needs a ' +
              'canonical-owner rule that does not yet exist, so no figure here is a ' +
              'settled chain size.'],
      ['Country filter', 'Does not apply. A concentration index measures how a segment\'s ' +
              'exports are spread ACROSS countries; there is no one-country reading of it. ' +
              'The Top exporter column is where a country appears in this view.']
    ] : []),
    ['Top-30 cap', 'The country-level HS-6 drill-down (product detail view) covers the ' +
                   'top 30 exporters per chain only (TOP_EXPORTERS = 30). Q1–Q4 are ' +
                   'uncapped: every BACI reporter is included.'],
    ['EVs', 'Electric vehicles are not part of this tool (10 of 11 chains) and have no ' +
            'EXIOBASE use shares — no corrected figures exist for them, for two ' +
            'independent reasons.'],
    [],
    ['— Scope —'],
    [],
    /* Added 2026-08-05, when the `[RAW]` / `[DERIVED]` suffix came off the column
     * headers. The badge was a one-word summary; this is the thing it summarised,
     * per column, and it keeps the file self-documenting away from the page.
     * Built from the same STATE.cols objects that paint the table and the on-screen
     * Column dictionary, so the three cannot disagree. */
    ['— Where each column comes from —'],
    ['Column', 'Source', 'How it is produced'],
    ...STATE.cols.filter(c => !c.viz).map(c => [c.label, c.src, c.how]),
    [],
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
