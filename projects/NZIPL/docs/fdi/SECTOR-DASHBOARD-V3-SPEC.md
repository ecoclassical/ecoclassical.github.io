# NZIPL Sector Cluster Dashboard — v3 Standard

**Spec for replicating the Solar v3 dashboard across the other technologies (wind, nuclear, battery, grid).**
Solar v3 is the reference implementation. This document is written to be executed with Claude.

Reference shell: `../NZIPL-Solar-Dashboard-v3.html` (solar v3)
Turnkey build script: **`build_tech_v3.py`** (config-driven — fill a CONFIG, run)
Worked example output: `../NZIPL-Wind-Dashboard-v3.html` (built + verified with this kit)
Transform references (what changed solar original→v2→v3): `build_solar_v2_reference.py`, `build_solar_v3_reference.py`

---

## 0. TL;DR for the person doing this

Each technology has a **Plotly "6-3-26" original** (`<tech>_dashboard 6-3-26.html`) that holds the data, but only **solar** has the polished CICE standalone (v3). To bring a technology to the v3 standard, **do not rebuild the design** — instead **swap that technology's data into the v3 shell** and change a small set of sector-specific values (color + copy + 3 recomputed headline numbers). Everything else (charts, map, benchmark, toggle, export, URL state, layout, fonts) is generic and carries over unchanged.

Workflow in one line: `v3 solar shell + <tech> data + <tech> color + <tech> copy → <tech> v3`.
`build_tech_v3.py` does exactly this — fill its CONFIG block (color from §4 table, copy editorially, numbers via §4 recompute) and run. Wind is already done as the worked example (`NZIPL-Wind-Dashboard-v3.html`).

---

## 1. What you are editing (the artifact format)

The standalone is **not editable as plain HTML**. It is a self-unpacking bundle:

- One very long line is a JSON map: `{ "<uuid>": { "mime", "compressed":true, "data": "<base64(gzip(content))>" }, ... }`.
- A `<script type="__bundler/template">"…escaped HTML…"</script>` near the end holds the page body + `<style>` as a **plain (uncompressed) JSON string**. Footer text, CSS, and the Overview live here.
- The `<head>` loads Plotly + Mapbox GL (≈4.5 MB, resource `7db760ae…`). Leave it alone.
- 8 app/data resources are loaded at the end of the template via `<script src="<uuid>">`. The bundler resolves those UUIDs from the JSON map at runtime.

To change anything you must: decompress the relevant resource(s) → edit → re-gzip → rebuild the JSON line. For template (footer/CSS/Overview) you edit the plain JSON string. See the reference scripts for the exact mechanics (`dec()`, `recompress()`, `span_of_var()`, the template regex).

**Resource roles** (identify by sniffing the decompressed head, do not hardcode UUIDs — they are stable within a file but verify):

| Role | First bytes contain | Holds |
|------|--------------------|-------|
| charts.js | `charts.js` | bar / cl / country / scatter / ranked renderers |
| map.js | `map.js` | cluster map + year (vintage) control |
| ui.js | `ui.js` | scrollspy, search, cross-filter, display drawer |
| benchmark.js | `benchmark.js` | Section 05 scorecard + Section 06 reference (reference table is **rebuilt from data at runtime**) |
| palette.js | `palette.js` | NAICS color system (auto-derived from data — no per-sector edit) |
| main.js | `main.js` | boot sequence (+ `enhance.js` appended here in v3) |
| map_data | `var map_data` | choropleth + cluster polygons (the 16 MB one) |
| data bundle | `extracted data` | `_RD, bar_data, cl_data, country_data, scatter_data, _ts, BENCH, REF_TABLE_HTML` |

---

## 2. Data model (identical across sectors)

The `6-3-26` originals and the standalone share these globals. **All are byte-identical between an original and its standalone** except `D`→`BENCH` (rename) and `REF_TABLE_HTML` (added but unused):

- `_RD` = `{ clusters:[{id,label,n,nc}], naics:[{code,label,short,primary,color}], primary:[codes] }` — `n` = firm count, `nc` = {naics→count}.
- `_ts` = `{ "<year>": { kpi:{firms,clusters,countries}, map:[{n,nm,la,lo,…}], bar:[…], country:{…} } }` — drives the year slider.
- `bar_data` — firms per technology (the distribution bar).
- `cl_data` — clusters-dominated per technology.
- `country_data` — top-20 countries, stacked by technology.
- `scatter_data` — patents vs firms (x=log₁₀ patents, y=firms, customdata=[patents,composite]).
- `map_data` = `{ data:[…], layout }` — country patent polygons + cluster hull polygons.
- `BENCH` (called **`D`** in the `6-3-26` original) = `{ "<naics>": { label, color, benchmark_share_pct, clusters:[{cluster_id,location,share,share_pct,score,naics_count,total_firms,top_firms[]}] } }`.
- `REF_TABLE_HTML` — **dead; omit it.** benchmark.js rebuilds the reference table from `bar_data`/`cl_data`/`_RD` at runtime.

---

## 3. The v3 standard (acceptance criteria)

A sector dashboard is "v3" when it has **all** of the following. Items marked **[generic]** carry over from the solar shell unchanged; **[sector]** must be set per technology.

**Design / brand**
- [sector] Accent = the Global Atlas sector color (see §4 table). Applied via the `[data-theme="cice"]` CSS block.
- [generic] Single fixed look: the **Accent theme** and **Technology palette** pickers are removed from the Display drawer; only **Density** and **Map style** remain. `ui.js` forces `opt.theme='cice'; opt.palette='refined';` after the localStorage read.
- [generic] Footer (exact text, no institute list, no internal note):
  > **Net-Zero Industrial Policy Lab (NZIPL)** · Johns Hopkins University.
  > Clusters identified globally with HDBSCAN over haversine distance; firms geocoded to city level (country-centroid fallbacks excluded). Patent intensity shown as log₁₀ cumulative filings, 2010 onward.

**Content**
- [sector] Title, brand line ("… Cluster Atlas"), masthead flag, `<h1>` "Global **<tech>** manufacturing clusters", and the masthead dek (rewrite the supply-chain examples for the sector's actual top NAICS).
- [sector] KPI values + the "N NAICS technologies" chip.
- [sector] Overview (00) "What the data shows" — three finding cards (see §4 for the recompute recipe). Match the editorial style of the solar cards; do **not** use "best-in-class" (use "most specialized / most concentrated").

**Visualizations / UX (all [generic])**
- Country panel **Firms / Share %** toggle (Share % = `barnorm:'percent'`, reveals specialization).
- Scatter **quadrant guides** (dotted median lines + "leaders" / "emerging" corner labels).
- **Shareable URL** state (`#tech=<code>&year=<yyyy>`) written live and restored on load.
- **Copy link** button in the top bar.
- **PNG** export on every chart; **CSV** export on country / distribution / clusters / scatter.

**Optimization (all [generic])**
- Coordinate precision trimmed to 4 decimals on `map_data` (`lat`/`lon`) and `_ts` (`la`/`lo`). Lossless on a world map; ~5–6% file reduction.

**Quality bar**
- Loads with no console errors; all 6 Plotly charts + the map render; basemap tiles load (needs network).

---

## 4. Per-sector parameters

### Accent color triad (set in the `[data-theme="cice"]` CSS block)
Base colors are the Global Atlas sector colors; `--accent-2` is 22% darker, `--accent-soft` is a 90%-white tint. **Leave `--warn` as `#B7791F`** (semantic, not the accent).

| Sector  | `--accent` | `--accent-2` | `--accent-soft` | `--ring` |
|---------|-----------|-------------|-----------------|----------|
| solar   | `#D39200` | `#A57200` | `#FBF4E6` | `rgba(211,146,0,.34)` |
| wind    | `#0F766E` | `#0C5C56` | `#E7F1F0` | `rgba(15,118,110,.34)` |
| nuclear | `#2563A8` | `#1D4D83` | `#E9EFF6` | `rgba(37,99,168,.34)` |
| battery | `#5B3AA1` | `#472D7E` | `#EFEBF6` | `rgba(91,58,161,.34)` |
| grid    | `#023247` | `#022737` | `#E6EAED` | `rgba(2,50,71,.34)` |

CSS block to write (wind example):
```css
[data-theme="cice"]{ --accent:#0F766E; --accent-2:#0C5C56; --accent-soft:#E7F1F0; --ring:rgba(15,118,110,.34); --warn:#B7791F; }
```

### Recompute the headline numbers from the sector's data
```
firms          = sum(bar_data.data[0].x)            // total clustered firms
clusters       = _RD.clusters.length
countries      = _ts["<maxYear>"].kpi.countries     // or distinct countries in country_data
naics_count    = number shown in the "N NAICS technologies" chip (count of primary techs)

leadingTech    = argmax over bar_data (y,x) by x    // technology with most firms
  -> name, firms, pct = firms/total, clustersLed = cl_data value for that tech

topCountries   = sum country_data.data[*].x grouped by country (y); take top 2
  -> "<C1> hosts X and <C2> Y — together Z% of the top-20-country total"

mostSpecialized = BENCH[leadingTechCode].clusters[0]   // highest-share cluster in the leading tech
  -> location, naics_count + "/" + total_firms, "the most specialized cluster in the leading technology"
```
(The solar values, for reference: 80,364 firms · 26 NAICS · 1,245 clusters · 109 countries; leading = Semiconductors 22,204 / 28% / 454; top = China 29,000 + U.S. 16,132 ≈ 56%; most specialized = Calamba, Philippines 40/41.)

### Sector-specific copy to swap (string finds in the template)
- `Global <em>solar</em> manufacturing clusters` → `<tech>`
- `Solar Cluster Atlas`, `Spatial Analysis · Solar & Net-Zero Manufacturing`, page `<title>` → `<tech>`
- Masthead dek "from semiconductors and motors to glass, polysilicon and critical minerals" → the sector's actual top NAICS examples
- KPI `<div class="kpi-v">` values + the chip "26 NAICS technologies"
- The three Overview cards

---

## 5. Workflow — use `build_tech_v3.py`

The script already does the whole data-swap. **To add a sector, copy the `CONFIG` block at the top, fill it, and run** `python3 build_tech_v3.py`. Wind is the example CONFIG in the file.

Fill CONFIG with:
- `original` → path to `<tech>_dashboard 6-3-26.html`; `out` → output path.
- accent triad → the §4 color table (copy the 4 values for the sector).
- copy → `title`, `brand_atlas`, `flag`, `h1_word`, `dek` (rewrite supply-chain examples for the sector).
- numbers → `kpi_firms/naics/clusters/countries`, `kpi_naics_sub`, `ov_lede`, `ov_cards` (recompute per §4).

What the script does under the hood (no need to touch unless debugging): extracts the 8 data vars from the original, trims `map_data`/`_ts` coordinates to 4 dp, rebuilds the data + map_data resources (renaming `D`→`BENCH`, omitting `REF_TABLE_HTML`), recompresses them into the solar v3 bundle, then applies the accent CSS + copy + KPI + Overview edits to the template. Everything else (charts, map, benchmark, toggle, scatter quadrants, export, URL state, Plotly, fonts) comes from the shell untouched; `palette.js` re-derives colors from the swapped data.

To get the recompute numbers, run the extraction snippet in §4 against the sector original (or ask Claude — it did this for wind). Then `python3 build_tech_v3.py` and verify (§6).

> The reference scripts `build_solar_v2_reference.py` / `build_solar_v3_reference.py` are kept only to document the original solar transforms; you don't run them for new sectors — `build_tech_v3.py` is the path.

---

## 6. Verification checklist (browser, via preview tools)

- [ ] Loads, unpacks, **no console errors**; `_RD`, `map_data`, Plotly all defined.
- [ ] 6 Plotly charts render; map shows polygons + basemap + patent gradient.
- [ ] Accent is the sector color: `getComputedStyle(documentElement).--accent` matches the table; the `<h1>` `<em>` is that color.
- [ ] Display drawer shows **only** Density + Map style (no color pickers).
- [ ] Footer = the exact §3 text. Title / H1 / brand name the correct technology.
- [ ] KPIs and the three Overview cards match values recomputed from the sector's data.
- [ ] Country **Firms / Share %** toggle flips `barnorm`. Scatter has 2 median lines + 2 labels.
- [ ] Focusing a technology writes `#tech=…`; reloading that URL restores the filter (+ `&year=` if set). Copy link works. PNG + CSV download.

---

## 7. Known limitations (carry over from solar; flag, do not block)

- **Map hover breakdown colors** use the original S0 palette (baked into `map_data.text`), so they don't match the refined map polygon colors. Fixing means regenerating the per-cluster hover strings (remap old→new hex). Optional polish.
- **Network required** for the map basemap (Carto tiles). Charts/data work offline; the basemap goes blank.
- File stays ~self-contained and ~3–5 MB depending on the sector's data size (wind's original is larger than solar's).
