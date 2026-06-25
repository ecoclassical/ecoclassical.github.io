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
└── RCA Construction/<Tech>/         # ✅ POPULATED — 146 files / 1.3 GB; per-tech variable-build
                                     #    files + PC values (see correction note below)
```

> **Correction (2026-06-25):** an earlier version of this file said `RCA Construction/<Tech>/` was
> empty. That was a tooling error on our side (a shell `awk` split on the space in "RCA Construction"
> and truncated the filenames). The model author confirmed — and a re-listing verified — that **every
> tech folder is fully populated**. Per the author: *"ML vars has all the files that build the model
> variables; those are under RCA Construction; PC values are in each technology folder."*

**Context / covariate data present (reproducibility inputs):**
- `wdi_impute.csv` + `Bentley_data_cleaning.R` — the WDI macro covariates (GDP, population, FDI,
  electricity use, governance, trade openness, manufacturing share, …) and how they're built.
- `IRENA_INSPIRE_Patents…csv` — patent feature.
- `baci.zip` — raw trade (the RCA base).

**Per-tech model notebooks (`Analysis/`)** — 14 technologies, each a fully-executed notebook
(RandomForest classifier on an RCA>1 target + `shap.TreeExplainer` for feature importance):
Batteries · Biofuel · Electrolyzer · Geothermal · Heatpump · Magnets · Nuclear · Solar ·
Transmission · Wind · **EV** · plus DRI, DAC, Mass Timber (not in CVCE).

### Reproducibility status — ✅ AVAILABLE

`RCA Construction/` is **fully populated** — **146 files / 1.3 GB**, with a subfolder per technology
holding the variable-build inputs *and* the model's PC outputs. Verified for **all 14 techs**: every
folder carries PC scores, RCA-by-category, and the trade panel.

| What | File (per tech, e.g. `EV/`) | Maps to |
|---|---|---|
| PC scores (country × year) | `<tech>_predicted_competition_all_years.csv` | `data/pc/pc_scores.parquet` |
| RCA by capability category | `<tech>_rca_by_category_year.csv` | `data/pc/pc_rca.parquet` (radar) |
| Product RCA (country × year × HS) | `hs17_rca_cyh.csv` | product-level RCA (PC scatter) |
| Trade panel | `<tech>_trade.csv` | RF feature build |
| Product-space proximity (EV only) | `ev_phi.csv` | relatedness/density |

So the model **is** reproducible from this drop: the per-tech RCA-construction inputs are present
(plus `wdi_impute.csv`, patents, `baci.zip`). The only piece not shipped as a tidy CSV is the
**per-category / per-HS6 SHAP table** (the radar's gold "need" polygon + the PC-scatter x-axis) — that
is computed inside each `Analysis/RCA <Tech> Analysis.ipynb` (`shap_by_cat`, `shap_df`) and lifted from
the notebook output rather than read from a file.

### EVs specifically

`RCA Construction/EV/` is the **most complete** folder (15–18 files), containing everything needed to
wire EVs into the atlas:

- `ev_predicted_competition_all_years.csv` (`country_code, year, predicted_comp`) → **PC scores** ✅
- `ev_rca_by_category_year.csv` (`country, year, category, …, RCA`) → **radar RCA (green) axis** ✅
- `ev_phi.csv`, `ev_trade.csv`, `hs17_rca_cyh.csv` (389 MB product RCA), `BACI_HS17_V202601.zip` (794 MB)
- Notebooks: `EV_Vars.ipynb`, `EV_Historical_Downscaling.ipynb`; `EVDataExplorer2025.xlsx`

**Task 3 status — unblocked.** PC scores + RCA-by-category are ready to slot into `data/pc/` for EVs
(rebuilds the radar's green polygon + PC-score readout). The radar's **gold SHAP polygon** and the
**PC-scatter SHAP axis** still need the per-category / per-HS6 SHAP, lifted from `RCA EV Analysis.ipynb`.

### Three techs in the model not yet in CVCE

All fully populated with PC scores + RCA: **DAC** (direct air capture), **DRI** (direct reduced iron /
green steel), **Mass Timber**. PC side is done; onboarding would need green-dict HS codes + a BACI
extract (see CLAUDE.md "Adding a new technology").

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
| Is the EV *data* shipped? | **Yes** — `RCA Construction/EV/` is fully populated (15–18 files): PC scores, RCA-by-category, product RCA, trade, proximity, raw BACI. |
| Can we reproduce the model from this drop? | **Yes** — `RCA Construction/` holds the per-tech variable-build inputs + outputs for all 14 techs, plus WDI/patents/BACI. Only the tidy SHAP table isn't a CSV (it's in the notebooks). |
| Fastest route to EVs in the atlas | Slot `ev_predicted_competition_all_years.csv` → `pc_scores` and `ev_rca_by_category_year.csv` → `pc_rca`; lift SHAP-by-category from `RCA EV Analysis.ipynb` for the radar gold polygon / scatter x-axis. |
| Techs in the model but not in CVCE | **DAC, DRI, Mass Timber** — PC side done; need green-dict + BACI extract to onboard. |
| Does Alon's tool cover EVs? | **No** — 10 techs, EVs not among them. |
