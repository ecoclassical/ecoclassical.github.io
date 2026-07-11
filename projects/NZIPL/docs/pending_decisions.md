# Pending — flagged, not yet actioned

_Kept open deliberately (2026-07-11). These block on a co-director decision or on
missing source data, so they are parked while the rest of the roadmap proceeds._

---

## 1. EVs `741410` role — needs Bentley's call
- The green dict maps HS **`741410` → "PMSM; Copper Wire"** as a Midstream input,
  but the code carried **two conflicting roles** (Product Component vs Processed
  Material). Resolved **provisionally to `Processed Material`**.
- ⚠️ The official HS text for `741410` is **"Copper: cloth, endless bands, for
  machinery, of copper wire"** — i.e. copper wire *cloth/gauze*, **not** motor
  magnet-wire (which is HS 7408). So the `741410 → PMSM Copper Wire` mapping
  itself looks **miscoded** and may need re-coding, not just a role pick.
- **Action when confirmed:** set `EV741410_ROLE` in
  `scripts/build_data/01c_add_product_description.R` (or fix the code at source in
  the EVs master sheet), then re-run `01c` + a bilateral rebuild.

## 2. The 20 Mode-2 codes — need canonical role/stage sign-off
- 20 `tech × HS6` codes carry **more than one role/stage within a tech** — the
  only cases where collapsing to bare HS6 is lossy for trade/activity.
- Full inventory (with official descriptions + a decision column) is at
  **`docs/green_dict/mode2_multi_role_stage_codes.{csv,md}`**.
- **Action when confirmed:** encode the chosen canonical role/stage per code in
  the green-dict build, then re-run `01c` + downstream.

## 3. EVs dendrite edges — missing source data
- `data/dendrite/dendrite_edges.csv` has **no `EVs` rows**, so the EVs
  **tech tree and value-chain sankey render empty** (engine `_tech_EVs.json`
  has `tree: []`; `sankey` present).
- Not a rendering bug — the process-of-production edges for EVs were never built.
- **Action:** build EVs dendrite edges (same pipeline step that produced the
  other techs' edges) to complete the EVs onboarding.

---

**Everything else in the Task 3 arc is shipped** (official HS-description labels,
viz.js engine display, pre-render retirement, deploy). See
`log/session_20260711.md`.
