# Project Usage & Subscription Cost Analysis
**Oriol Vallès Codina · April 2026**

---

## Overview

This document summarises AI and software subscription costs (March–April 2026), how they map to different research projects, and the key tools used in each workflow.

---

## Subscriptions: What Each Service Does

### Claude (Anthropic)
**Claude Pro / Claude Code** is the primary AI assistant and agentic coding environment used across all research projects. In this workflow it is used as a *pair programmer and research assistant*: it reads and writes code (R, Python, JavaScript), navigates codebases, builds data pipelines, edits HTML/CSS/JS for interactive outputs, debugs errors, and helps draft and edit academic writing. Claude Code (the CLI tool used here) goes beyond chat — it executes shell commands, edits files, runs scripts, and manages git. The Claude Sonnet 4.6 model is the default; Opus 4.7 is available for complex reasoning tasks.

### ChatGPT Plus (OpenAI)
**ChatGPT** is used as a *secondary AI assistant*, primarily for long-form writing, mathematical derivations, and cases where a second AI perspective is useful for cross-checking. GPT-4o handles most tasks; the o1/o3 reasoning models are used for hard mathematical or logical problems (equation notation, formal model setup).

### Windsurf Pro (Codeium / Exafunction)
**Windsurf** is an AI-powered IDE (code editor), similar to VS Code but with deep in-editor AI assistance. It provides inline code completion, refactoring suggestions, and a chat interface directly in the editor. Used primarily for Python and R development where IDE-level autocomplete is valuable. Complements Claude Code by operating at the file-editing layer while Claude Code handles multi-file projects and shell operations.

### Posit Connect Cloud
**Posit Connect Cloud** is the hosting platform for R-based interactive applications (Shiny apps). It was used to host the CVCE Shiny app (the original R Shiny version of the Clean Value Chain Explorer) so that collaborators at NZIPL/Johns Hopkins could access it via a web URL. Cancelled in March 2026 when the project moved to a pure static-HTML architecture deployed on GitHub Pages (no server needed).

---

## Receipts Summary: March 6 – April 30, 2026

### By subscription (USD, EUR@1.17 for Anthropic)

| Service | What it does (brief) | Months | Per month | Total USD | PDFs |
|---|---|---|---|---|---|
| **Claude (Anthropic)** | Primary AI assistant + agentic coding | 2 months active | €18 sub + variable overages | **$366.65** (€313.38 × 1.17) | 7 (recent); 4 missing |
| **ChatGPT Plus (OpenAI)** | Secondary AI, writing + math | 16 months (Jan 2025–Apr 2026) | $21.63 | **$346.08** | 9 (Aug 2025–Apr 2026) |
| **Windsurf Pro (Exafunction)** | AI-powered IDE / code editor | 7 months (Sep 2025–Mar 2026) | $16.22 | **$113.54** | 7 ✓ complete |
| **Posit Connect Cloud** | Shiny app hosting (cancelled Mar 2026) | 6 months (Sep 2025–Feb 2026) | $20.54 | **$123.24** | 6 ✓ complete |
| **TOTAL** | | | | **$949.51** | |

*EUR→USD conversion: 1.17 (Wise transfer calculator rate, April 2026)*

### Anthropic detail (invoice sequence NJJAFZLE-XXXX)

| Invoice | Date | Amount | Type | Project |
|---|---|---|---|---|
| 0001 | Mar 6 2026 | €21.78 | Claude Pro – month 1 | CVCE setup |
| 0002 | Mar 23 | €6.05 | Extra usage €5 | LEEDS_MODEL |
| 0003 | Mar 31 | €6.05 | Extra usage €5 | LEEDS_MODEL |
| 0004 | Apr 1 | €24.20 | Extra usage €20 | LEEDS_MODEL |
| 0005 | Apr 2 | €24.20 | Extra usage €20 | LEEDS_MODEL (submission sprint) |
| 0006 | Apr 2 | €24.20 | Extra usage €20 | LEEDS_MODEL (submission sprint) |
| 0007 | Apr 6 | €21.78 | Claude Pro – month 2 | CVCE |
| 0008 | Apr 8 | €46.28 | Extra usage €38.25 | CVCE (PC scatter, type→role rename) |
| 0009 | Apr 15 | €46.28 | Extra usage €38.25 | CVCE (Global Atlas, Chile Atlas, IR) |
| 0010 | Apr 28 | €46.28 | Extra usage €38.25 | CVCE + CONSERVATION |
| 0011 | Apr 29 | €46.28 | Extra usage €38.25 | CVCE + CONSERVATION |
| **Total** | | **€313.38** | | |

**April 2026 alone: €279.50** (8 charges: 1 Pro sub + 7 overages of €6–€46 each)

---

## Project Attribution (speculative, based on git history + file timestamps)

| Project | Period active | Estimated Claude share | Evidence |
|---|---|---|---|
| **CVCE / NZIPL** | Apr 8 → ongoing | ~51% (~€130) | 50+ git commits Apr 8–30; atlas, intelligence report, CVCE.html restructure |
| **LEEDS_MODEL** | Mar 23 → Apr 3 | ~23% (~€60) | 8 commits Apr 2 alone; submitted Apr 3; zero commits after |
| **CONSERVATION papers** | Apr 22 → ongoing | ~19% (~€50) | Files modified Apr 22, 25, 29, 30; no git repo |
| **Mixed / setup** | Mar 6–22 | ~7% | CVCE workplan, render scripts, within Pro limits |

### Timeline narrative
- **Mar 6–22:** Claude Pro starts. CVCE Phase II setup — workplan render scripts, dendrite snapshots, deploy pipeline. Usage within Pro limits (no overages).
- **Mar 23 – Apr 3 (LEEDS_MODEL sprint):** Intensive MRIO equation work for Ecological Economics submission. Two €5 top-ups in March, then €20 × 3 in a 2-day submission sprint (Apr 1–2). Paper submitted to Ecological Economics SI on April 3.
- **Apr 8 (CVCE resumes):** 13 commits in one day — PC scatter viewer, type→role rename across entire codebase, OneDrive sync. First large top-up (€38.25).
- **Apr 10–24 (CVCE intensive):** Global Atlas v1, Chile Atlas, Brazil Atlas, Intelligence Report initial build. Second large top-up Apr 15.
- **Apr 22+ (CONSERVATION parallel):** Conservation/thermodynamics papers start appearing alongside CVCE. Apr 25: sraffa_acs_PRE, value_conservation_paper; Apr 29: econ_thermo_manuscript; Apr 30: full manuscript. Top-ups Apr 28–29 cover both CVCE (IR map debugging) and CONSERVATION (renders).

---

## Cost Efficiency Assessment

### April was an outlier
April 2026 was an exceptionally intensive month: LEEDS_MODEL submission + CVCE Phase II acceleration + CONSERVATION parallel work. Normal monthly spend should be lower.

### Claude Max recommendation
At current usage intensity, **Claude Max ($100/month)** is cost-efficient:
- April Anthropic spend: **€279.50 (~$327)** — 3.3× what Max would cost
- Break-even: ~5 extra usage top-ups/month (you hit 7 in April alone)

### With NZIPL Team subscription
If Johns Hopkins NZIPL provides a Claude Team seat:
- CVCE work (~51% of usage) moves to lab account
- Personal usage (CONSERVATION + other personal research) ~€120–130/month
- Personal Max ($100) still likely worth it given CONSERVATION intensity
- **Key question:** Can the Team seat be your personal account? If yes, Max may be redundant during CVCE-heavy periods.

---

## Productivity Impact of Switching to Claude Code

Claude Code (Anthropic's agentic CLI) was adopted on **March 6, 2026**, replacing a multi-tool stack (ChatGPT + Windsurf + Posit). The productivity impact, measured by git commits per week across all active repositories, was immediate and substantial.

### Commits per week: before vs. after Claude Code

| Repository | Before (Aug 15 – Mar 5) | After (Mar 6 – Apr 30) | Increase |
|---|---:|---:|:---:|
| CVCE / NZIPL | 6.4 / week | 21.5 / week | **+3.4×** |
| LEEDS_MODEL | 0.6 / week | 3.6 / week | **+6.0×** |
| ecoclassical.github.io | 0.6 / week | 18.9 / week | **+33.0×** |
| **All repos combined** | **7.5 / week** | **44.0 / week** | **+5.8×** |

*Before: 28-week lab period (211 total commits). After: 8-week Claude Code period (352 commits).*

### Monthly CVCE commit trajectory

| Month | Commits | Note |
|---|:---:|---|
| Aug 2025 | 5 | Project start |
| Sep 2025 | 75 | Initial codebase setup sprint |
| Oct 2025 | 42 | |
| Nov 2025 | 14 | |
| Dec 2025 | 12 | |
| Jan 2026 | 12 | |
| Feb 2026 | 18 | |
| **Mar 2026** | **82** | **← Claude Code starts Mar 6** |
| **Apr 2026** | **90** | CVCE Phase II + Intelligence Report |

### What the numbers understate

- **CONSERVATION papers** (active Apr 22–30, multiple files modified daily) have no git repository — this parallel workstream is not captured in commit counts.
- **Tool consolidation**: ChatGPT Plus cancelled Apr 29, 2026. Windsurf ended Mar 2026. Posit ended Feb 2026. One subscription replaced four, at lower combined cost during intensive periods.
- **Quality dimension**: commit frequency measures output volume, not quality. The LEEDS_MODEL paper was submitted to a peer-reviewed journal (Ecological Economics SI) during this period; the CVCE Intelligence Report went from concept to deployed interactive HTML in under two weeks.

---

## Files
- `docs/receipts/subscription_costs.csv` — full ledger (41 rows + total)
- `docs/receipts/pdf/` — 29 PDFs named `{Service}_{YYYY-MM-DD}.pdf`
- `docs/receipts/Project_Usage.pdf` — lab co-directors version (rendered PDF)

*Generated May 1, 2026. EUR/USD conversion: 1.17 (Wise)*
