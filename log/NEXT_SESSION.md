# Next Session — written 2026-10-16 at the close of `session_20261016.md`

Repo state at hand-off: `ecoclassical.github.io` `master` fast-forwarded to `9a19510c` before this save. Untracked `_pages/about_1.md` belongs to another workstream; preserve it. The public Leeds evidence URL and its principal pages returned HTTP 200 on 2026-10-16.

---

## 1. Streamline the Research page

**Goal.** The public Research page presents the three research tracks clearly in substantially less text while retaining accurate project descriptions and working links.

**Why this is next.** The maintainer reports that the current page is overlong and needs clearer organization.

**Prompt to open with:**
> Review `_pages/research.md` from a reader's perspective. Identify duplicated framing and paragraphs that can be cut or moved, then edit the page into a scannable overview of the three research tracks and their current work. Preserve the claims that are backed by project pages, check the Leeds evidence link plus other outgoing project links, and preview the rendered page. Do not stage or edit unrelated `_pages/about_1.md`.

**Files in play:** `_pages/research.md` (source) · `projects/leeds_model/evidence/` (linked evidence pages) · `_data/navigation.yml` (navigation reference)

**Done when:** the rendered Research page is shorter, keeps the three-track structure, and its project links work; only intended files are committed.

**Watch out:** the current Research page links to the Leeds evidence site from two places. The base URL and model, closure, Analysis and Discussion pages returned HTTP 200 on 2026-10-16; this is an availability check, not a full browser test.
