# Remaining Tasks — CVCE / Option A / Model Brief

_Last updated: 2026-06-25_

Tracking the four-task roadmap (Option A porting → PDF pipeline → EV PC data → gap-analysis brief).

---

## ✅ Task 1 — Port remaining visual panels into Option A prototype — **DONE**

All 9 atlas visuals now render from per-case data (no per-file HTML).

- Ported `trade_map`, `activity_map`, `sankey`, `tech_tree` into the prototype.
- `scripts/proto/build_datadriven_proto.R`: added `firms` per case (S&P) + per-tech side-files
  `_tech_<Tech>.json` (country-independent tree + sankey).
- `analysis/_proto_datadriven/panel.html`: topojson + `ISO3N` + 4 new cards/draw fns.
- Full regen: **253 case files + 11 tech side-files, 15 MB**. All-158 projection ≈ **85 MB / 3.2 min**.

---

## ✅ Task 2 — PDF rendering (landscape slides) — **DONE (polish pending)**

Root cause of the old broken PDF: iframes loaded/drew async → print fired before they settled
("Loading…" + distorted). Fixed by rendering each slide **from Option A data synchronously**.

- New `analysis/_proto_datadriven/viz.js` — shared, selector-parameterized rendering core (9 visuals
  + `highlights()` auto-bullets).
- New `analysis/_proto_datadriven/report.html` — landscape slide deck: **ToC left · visual · bullets
  below**, `@page landscape`, one slide per page. PDF validated end-to-end (9/9 pages render).

### Polish backlog
1. Treemap / tech-tree labels clip at panel edges (e.g. "STREAM" ← UPSTREAM, "Solar Glass; E").
2. Visual selection is URL-param only (`?vis=radar,map,…`) — add toolbar checkboxes.
3. Theme: currently light page + dark figures — decide on one direction.
4. **Wire `report_builder.html` "Save as PDF" → `report.html`** for the current selection (closes the
   loop between the interactive composer and the print pipeline).
5. Bullets are auto-generated → later become the analyst's editable narrative (IR's reserved text strip).
6. Dedupe `panel.html` onto `viz.js` (currently `panel.html` keeps its own copy of the draw fns).

---

## 🟡 Task 3 — Add EV PC data — **ACTIONABLE (data located)**

Correction (2026-06-25): the EV data was **not** missing — `RCA Construction/EV/` in `ML_vars.zip` is
fully populated (earlier "empty folder" call was an `awk`-on-spaces bug). All 14 model techs carry PC
scores + RCA-by-category. See corrected `model_data_inventory.md`.

- **Ready to wire (in zip):**
  - `ev_predicted_competition_all_years.csv` (`country_code, year, predicted_comp`) → `pc_scores` ✅
  - `ev_rca_by_category_year.csv` (`country, year, category, …, RCA`) → `pc_rca` (radar green) ✅
- **Still needs lifting from the notebook:** per-category / per-HS6 **SHAP** (radar gold polygon +
  PC-scatter x-axis) — computed in `Analysis/RCA EV Analysis.ipynb` (`shap_by_cat`, `shap_df`), no CSV.
- **Plan:** append EV rows to `data/pc/pc_scores.parquet` + `data/pc/pc_rca.parquet`; extract EV SHAP
  from the notebook → `data/pc/pc_features.csv`; rebuild EV radar + PC scatter; regen Option A EV cases.
- **Bonus:** DAC / DRI / Mass Timber also have full PC data — candidates to onboard later.

---

## 🟢 Task 4 — Gap-analysis handbook ("Model Implications") — **v1 DRAFT DONE**

Handbook for **SHAP–RCA gap analysis**, written as a manual (per user's notes), one worked example
per WP-4 cell.

- **Output:** `qmd/report/model_implications_handbook.qmd` → renders **HTML + PDF + DOCX** (docx = the
  Google Docs target). "Reading the Capability Map."
- **Decisions locked:** audience = one source serving internal + public; format = QMD → HTML/PDF, then
  docx for Google Docs.
- **Framework:** the WP-4 7-cell grid (SHAP level × RCA level) at two zooms — radar (category) and PC
  scatter (product). Live R classification from `pc_features.csv` + `pc_rca.parquet` (ref year 2024).
- **Worked cells (verified):** Leverage→Brazil·Biofuel (product) · Build-up→Canada·Batteries ·
  Critical gap→India·Solar · Mature→Canada·Nuclear · Gap→India·Solar·Electronics · Bonus→Brazil·Heat
  Pumps · Not-priority→India·Solar·Ind.Materials. Full India·Solar diagnostic plot in §5.

### Follow-ups
1. **Product-level scatter examples** are currently narrative (e.g. Brazil ethanol "leverage") — back
   them with actual HS6 product-RCA × SHAP data from the scatter pipeline.
2. Fold in Alon & Ishana's **optimization tool** (LLF sensitivity / RCA-impact-by-category) as a
   forward-looking section ("from gaps to investment sizing").
3. Team review pass (Bentley/Tim/Alon/Ishana), then public-polish from the same source.
4. Optional: NZIPL brand styling (dark-green theme, logo) for the public version.
