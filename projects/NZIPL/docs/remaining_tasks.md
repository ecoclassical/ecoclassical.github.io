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

## 🟢 Task 3 — Add EV PC data — **DONE (interim; awaiting Ishana's authoritative RCA)**

**EV is fully loaded and consistent across all 3 PC files + rebuilt everywhere:**
- `pc_scores` ✅ · `pc_rca` ✅ (Electronics present, standard mapping) · `pc_features`/SHAP ✅
- Rebuilt: Global Atlas of the EVs Base + 7 EV country sheets + 7 focal radar/PC-scatter panels + Option A.
- **EV RCA fix (Option B):** Ishana's `ev_rca_by_category_year.csv` used a different `hs2_category`
  (ch85→Machinery, no Electronics). SHAP was per-HS so recategorised directly; RCA was pre-aggregated
  so **recomputed from the product-level `hs17_rca_cyh.csv`** with the standard mapping —
  `scripts/build_data/07c_ev_rca_reaggregate.py` (validated: replicating her mapping reproduces her
  file to 6 dp). EV radar gold + green now consistent and matching the other 10 techs.
- **Still pending (Option A, authoritative):** Ishana re-exports `ev_rca_by_category_year.csv` +
  `ev_hs_shap_above_threshold.csv` with the standard `hs2_category` → drop-in supersedes the interim.
- **Reproducibility caveat:** EV `pc_scores`/`pc_rca` are manual overlays from the EV-folder CSVs;
  `07_build_pc.R` rebuilds the 10 base techs from the datawheel Excel (EV-less) — re-apply EV after a
  full `07` run (or wire an EV step into the pipeline).

### (original notes below — superseded by the above)

Correction (2026-06-25): the EV data was **not** missing — `RCA Construction/EV/` in `ML_vars.zip` is
fully populated (earlier "empty folder" call was an `awk`-on-spaces bug). All 14 model techs carry PC
scores + RCA-by-category. See corrected `model_data_inventory.md`.

- **Ready to wire (in zip):**
  - `ev_predicted_competition_all_years.csv` (`country_code, year, predicted_comp`) → `pc_scores` ✅
  - `ev_rca_by_category_year.csv` (`country, year, category, …, RCA`) → `pc_rca` (radar green) ✅
- **Done:** PC scores + RCA appended to `pc_scores.parquet` + `pc_rca.parquet` (EVs). Radar green renders.
- **Last mile — EV SHAP:** the 10-tech SHAP is NOT in the model repo or `ML_vars.zip` — it's hand-delivered
  per-tech files in **`data/pc/Feature Importance/<tech>_hs_shap_above_threshold.csv`**
  (cols `HS Code, Description, Category, Mean absolute z-score`), consolidated by `07_build_pc.R`.
  EV needs `ev_hs_shap_above_threshold.csv` in that exact shape. **Requested from Ishana.**
  On arrival: drop in the folder → add `ev = "EVs"` to `07_build_pc.R` tech_map → re-run `07` →
  `pc_features` gains EV → rebuild EV radar gold + PC scatter; regen Option A EV cases.
- **Bonus:** DAC / DRI / Mass Timber / E-waste also have full PC data — candidates to onboard later.

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
