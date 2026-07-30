# Option A — The General Case Renderer

**A short brief on how NZIPL intelligence cases are stored, rendered, and scaled.**

The system separates *what is drawn* (one shared renderer) from *what is drawn about*
(many tiny per-case data files). One renderer, N cases. A "case" is a single
**technology × country** pair (e.g. `Solar × Brazil`).

---

## 1. The principle: renderer / data split

```
                build_datadriven_proto.R
   pipeline  ──────────────────────────────►   data/*.json   (one per case, ~50 KB)
 (BACI, PC,                                          │
  S&P, sankey)                                       ▼
                                            viz.js  (14 draw fns)
                                                     │
                       ┌─────────────────────────────┼─────────────────────────────┐
                       ▼                              ▼                              ▼
                  report.html                    panel.html                 report_builder.html
                 (print / PDF)              (interactive explorer)            (IR composer)
```

Cases are **pre-aggregated at build time**, not computed at view time. A reader just
fetches a small JSON and the renderer draws it synchronously (data-in → SVG-out).

---

## 2. The data layer — `data/`

`scripts/proto/build_datadriven_proto.R` reads the real pipeline
(`cache/bilateral_ds`, `data/pc/*`, S&P firms, dendrite, sankey) and writes:

| File | What it holds | Count |
|---|---|---|
| `<Tech>_<Country>.json` | one case: `timeline · partners · products · radar · scatter · pc · firms` | 253 today |
| `_tech_<Tech>.json` | country-independent tech-tree edges + value-chain sankey (fetched once on tech change) | 11 |
| `_index.json` | switcher manifest: which techs/countries exist, slugs, colors, region sets | 1 |

- Each case is a **bundle of pre-shaped arrays** — exactly what the charts need, nothing more.
- Whole-case payload ≈ 50 KB; all 253 cases ≈ **13 MB total**.
- Per-case files never carry the tech tree / sankey — those live once in `_tech_*.json`
  to keep payloads lean.

**Build command:**
```bash
Rscript scripts/proto/build_datadriven_proto.R [--countries all|ISO,ISO]
```
Default builds the focal + regional sets listed in `data/case_registry.csv`.

---

## 3. The renderer — `viz.js`

One file, ~14 draw functions, each **data-in → SVG-out, synchronous** — no iframes,
no async draw. Give it a target SVG selector + a slice of a case, it draws.

```
radar · scatter · timeline · treemap · map · firms · sankey · tree
+ setTheme · initGeo · fmtV · highlights
```

Because every function reads its "ink" colors (axes, labels, land, strokes) from the
active theme `T`, the **same code** renders the dark interactive screen and the light
PDF. The PDF path just calls `VIZ.setTheme('light')` and redraws. Data colors
(value-chain SR palette, HS categories, sankey lanes) are fixed — they read on both
backgrounds.

> **Two copies, by design.** `panel.html` carries its own inline draw code (it predates
> the extracted `viz.js`). Renderer changes that must apply everywhere — e.g. the
> domestic-zoom activity map — land in **both** `viz.js` and the inline copy in `panel.html`.

---

## 4. The three consumers

| Consumer | Role | Theme |
|---|---|---|
| `report.html` | Print / slide path → the **PDF deliverable** | light on print |
| `panel.html` | Interactive dark explorer | dark |
| `report_builder.html` | Selector that **composes** an IR from chosen panels | dark |

All three read the same `data/*.json` through the same renderer logic.

---

## 5. Registries — single source of truth

| File | Drives |
|---|---|
| `data/case_registry.csv` | which countries / region-sets get built (35 rows → 253 cases) |
| `data/module_registry.csv` | which visuals (the ~14 modules) exist and how they're labelled |

Both the build script and the builder's selector read these — change the registry,
rebuild, and the new case/visual appears across all three consumers automatically.

---

## 6. How it scales

The split *is* the scaling story. The renderer is fixed; cost grows only with data
(≈ 50 KB × N countries × 11 techs).

- **Today:** focal + regional countries → 253 cases, 13 MB.
- **Full grid:** `--countries all` → ~158 × 11 cases. The build script prints the live
  projection on every run (`→ all 158×11 at this rate: ~X MB, ~Y min`).

To add a country: add a row to `case_registry.csv` → re-run the proto build → it shows
up in the report, the panel, and the builder with **zero renderer changes**.

---

## Files at a glance

```
analysis/navigator/
├── data/
│   ├── <Tech>_<Country>.json    # 253 per-case bundles
│   ├── _tech_<Tech>.json        # 11 tech-level side files (tree + sankey)
│   └── _index.json              # switcher manifest
├── viz.js                       # shared renderer (14 draw fns + theme system)
├── geo.js                       # inlined world topojson (renders under file://)
├── report.html                  # print / PDF path
├── panel.html                   # interactive explorer (own inline draw code)
└── README.md                    # this brief

scripts/proto/build_datadriven_proto.R   # the builder
data/case_registry.csv                    # which countries
data/module_registry.csv                  # which visuals
analysis/intelligence/report_builder.html # IR composer
```
