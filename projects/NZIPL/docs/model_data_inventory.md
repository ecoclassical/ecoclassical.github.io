# Model Data Inventory — Shared Material (PC / RCA model + optimization tool)

**Compiled:** 2026-06-25 · **Author of source material:** Alon & Ishana (NZIPL modeling team)
**Purpose:** inventory of two shared drops on OneDrive (`000 Data Infrastructure/`), what each
contains, and — critically — whether the material is **reproducible** and whether **EVs** are covered.

---

## 1. `CICE Updated/` — the model inputs & per-tech RCA analyses

Folder holding the Predicted-Competitiveness (PC) / RCA model material.

| Item | Size | What it is |
|---|---|---|
| `ML_vars.zip` | 968 MB | Model variables + per-technology RCA analysis notebooks (see below) |
| `baci.zip` | 3.07 GB | Raw CEPII **BACI** bilateral trade (the model's trade input) |
| `Product Proximity Update.ipynb` | 14 KB | Product-space proximity / relatedness update (standalone) |

### Inside `ML_vars.zip`

```
ML_vars/
├── Bentley_data_cleaning.R          # WDI download + cleaning (context variables)
├── wdi.xlsx · wdi_impute.csv        # World Bank Development Indicators (imputed) — model covariates
├── IRENA_INSPIRE_Patents_April_2024(INSPIRE_data).csv   # patent counts (feature)
├── Analysis/RCA <Tech> Analysis.ipynb   # 14 per-tech notebooks (the actual model runs)
└── RCA Construction/<Tech>/         # ⚠️ ALL EMPTY directory stubs (no files shipped)
```

**Context / covariate data present (reproducibility inputs):**
- `wdi_impute.csv` + `Bentley_data_cleaning.R` — the WDI macro covariates (GDP, population, FDI,
  electricity use, governance, trade openness, manufacturing share, …) and how they're built.
- `IRENA_INSPIRE_Patents…csv` — patent feature.
- `baci.zip` — raw trade (the RCA base).

**Per-tech model notebooks (`Analysis/`)** — 14 technologies, each a fully-executed notebook
(RandomForest classifier on an RCA>1 target + `shap.TreeExplainer` for feature importance):
Batteries · Biofuel · Electrolyzer · Geothermal · Heatpump · Magnets · Nuclear · Solar ·
Transmission · Wind · **EV** · plus DRI, DAC, Mass Timber (not in CVCE).

### Reproducibility status — ⚠️ PARTIAL

The notebooks read their main inputs from **hardcoded local paths on the author's machine** that
are **not bundled**, e.g. (from `RCA EV Analysis.ipynb`):

```python
ev      = pd.read_csv("…/RCA Construction/EV/ev_trade.csv")        # ❌ missing (folder empty)
rca_hs17= pd.read_csv("…/RCA Construction/EV/hs17_rca_cyh.csv")    # ❌ missing
hs_master=pd.read_csv("…/concordance/HS_Descriptions.csv")        # ❌ no concordance/ in zip
wdi     = pd.read_csv("…/ML_vars/wdi_impute.csv")                  # ✅ present
```

So: **present** = model code (notebooks), WDI covariates, patents, raw BACI. **Missing** = the
intermediate **"RCA Construction"** per-tech panels (`ev_trade.csv`, `hs17_rca_cyh.csv`, …) and the
**HS concordance** file. Those `RCA Construction/<Tech>/` folders ship as empty stubs. → **You cannot
push-button rerun the model as-is**; the intermediate RCA panels between raw BACI and the RF must be
regenerated or requested.

### EVs specifically — answering "is it empty?"

- **Not empty as code:** there **is** a complete `RCA EV Analysis.ipynb` (22 cells, fully executed,
  dated 2026-05-15) — RandomForest + SHAP, identical pattern to the other techs.
- **Empty as data:** the `RCA Construction/EV/` output folder is an **empty directory** in the zip.
  The notebook *writes* its results there on the author's machine (`out_dir = …/RCA Construction/EV/`):
  - `ev_rca_by_category_year.csv` — RCA by category × year (→ atlas **radar** axis)
  - `X_rank_save[['country_code','year','predicted_comp']]` — PC scores by country-year (→ **pc_scores**)
  - `df_2024_ev[['country_code','rank','rank_label','predicted_comp']]` — 2024 ranks
  - a per-HS6 SHAP table (`shap_df`, `shap_by_cat`) (→ **pc_features** SHAP weights)

  **None of these output CSVs are in the zip.** They exist only inside the notebook's run.

**Implication for Task 3 (wire EVs into the atlas radar + PC scatter):** the three CSVs the CVCE
pipeline needs (PC scores, RCA-by-category, SHAP-by-HS6) are *computed* but *not shipped*. Cleanest
path is to **ask Ishana/Alon for the contents of `RCA Construction/EV/`** (3 small CSVs) — that is
exactly the `pc_scores.parquet` / `pc_rca.parquet` / `pc_features.csv` material for EVs. Failing that,
the values are partially recoverable by re-executing the EV notebook, but only after the missing
`ev_trade.csv` / `hs17_rca_cyh.csv` / `HS_Descriptions.csv` inputs are obtained.

---

## 2. `Alon's optimization tool.zip` — CICE-V1 Interactive POC

A **self-contained, email-able proof-of-concept dashboard**: a *country-competitiveness sensitivity*
tool. "If country X invested an extra ΔExport (as % of GDP) in technology T, how would its
probability of being competitive — P(RCA>1) — move, and which HS categories drive it?"

```
web/
├── interactive_poc.html        # the dashboard (template + manifest + HS6 meta inlined)
├── interactive_template.html   # hand-written template (__INLINE_DATA__ substituted at build)
├── pipeline_flowchart.html + FLOWCHART_GUIDE.md   # methodology flowchart + its style guide
├── README.md                   # methodology + build instructions
└── data/
    ├── manifest.json           # {tech:{iso3:[years]}} availability + country names + ALPHAS grid
    ├── _hs_meta.js             # HS6 code → description cache
    └── <Tech>.json.gz          # one gzipped bundle per tech (country × year payloads)
```

**Scope:** 10 technologies (Batteries, Biofuel, Electrolyzer, Geothermal, Heatpump, Magnets, Nuclear,
Solar, Transmission, Wind) × ~153 countries × 21 years (**2003–2023**). **No EVs / DRI / DAC / Timber.**

**What the dashboard does (methodology):**
- **Left panel** — P(RCA>1) vs. investment expressed as **ΔExport (% of GDP**, with a $ axis). The
  blue curve is the full **log-linear-form (LLF)** model prediction; drag the marker to read
  `P`, `ΔP`, `ΔExport (%GDP)`, `ΔExport ($)`. An **orange dotted "validity range"** marks the largest
  investment α at which the local linearization stays within 50% of the full prediction. A static
  label reports `P_baseline`, marginal `dP/dExport ($)`, and the validity threshold.
- **Right panel** — **RCA Impact (%) by HS2 category**, recomputed live as you drag. Bar height =
  `Σ_{i∈C} gᵢ² / Σ_all gⱼ² × 100` (bars sum to 100%); stacked segments are individual HS6 products by
  their L2² share. Categories: Chemicals, Industrial Materials, Electronics, Machinery, Metals,
  Textiles, Other.

**Per-country-year payload** (in each `<Tech>.json.gz`): `pb` (baseline P), `gdp`, `exp` (export
level), `val`, and `pf` (the per-HS6 gradient / prediction vector) — the inputs that drive the
draggable sensitivity curve.

**Reproducibility:** the bundles are **build artifacts** (gitignored upstream), regenerated by
`scripts/build_interactive_data.py --techs ALL --countries ALL --years ALL`. That build script is
**not** in this zip (only its outputs + the assembled HTML are). Runs over HTTP only (uses `fetch`);
Plotly.js + pako load from CDN.

---

## Bottom line

| Question | Answer |
|---|---|
| Is there an EV model? | **Yes** — `RCA EV Analysis.ipynb`, fully run (RF + SHAP), May 15. |
| Is the EV *data* shipped? | **No** — `RCA Construction/EV/` is an empty folder; output CSVs not included. |
| Can we reproduce the model from this drop? | **Not fully** — covariates (WDI), patents, raw BACI present, but the intermediate per-tech RCA panels + HS concordance are missing (hardcoded author-local paths). |
| Fastest route to EVs in the atlas | Request the 3 CSVs in `RCA Construction/EV/` from Ishana/Alon (PC scores, RCA-by-category, SHAP-by-HS6). |
| Does Alon's tool cover EVs? | **No** — 10 techs, EVs not among them. |
