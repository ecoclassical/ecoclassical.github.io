# Net Zero Industrial Policy Lab -- Claude Code Context

Shared context for the NZIPL team. This file loads automatically in any Claude Code session opened from this repo.

## About the Lab

The Net Zero Industrial Policy Lab at Johns Hopkins University identifies and sequences clean industrial opportunities for countries using economic complexity methods. The Lab works with governments, multilateral institutions, and development finance partners to translate capabilities analysis into actionable industrial policy, with active programs focused on Brazil, India, and Mexico.

Outputs span interactive analytical products (play cards, infrastructure maps, cross-country comparators) and traditional research formats (policy briefs, working papers, methodological notes). This kit supports the Lab's tooling and shared conventions; the research itself lives in published work and project-specific repositories.

Website: netzeropolicylab.com
Platform: cice.netzeropolicylab.com (Clean Industrial Capabilities Explorer)

## Research agenda

Current threads the Lab is working across:

- **Clean industrial policy sequencing** — which plays to develop first, in what order, with what preconditions
- **Subnational industrial policy** — state industrial policies in Mexico
- **Subnational industrial capabilities** — state- and municipality-level RCA, relatedness density, capability clusters
- **Green investment** — How can countries sustain investment at home to create jobs and boost domestic growth 
- **Finance architecture for industrial policy** — instruments, actors, bottlenecks, and the coordination problem
- **Cross-country comparison methods** — standardizing indicators so Brazil, India, and Mexico are comparable

## Team

This kit is a shared resource. As Lab members contribute, add yourself and your focus below.

| Member | Focus |
|--------|-------|
| Gilberto García-Vazquez | Mexico, India and Brazil pipelines: play selection, energy infrastructure map, play cards |
| _Add yours..._ | _e.g., Brazil research, CICE development, finance architecture_ |

## How this kit fits

The kit is tooling, not a source of truth for Lab research positions. It accumulates conventions (data source auth patterns, naming norms, design tokens), reusable pipelines, and hard-won gotchas so the next person doesn't rediscover them. Research outputs — papers, briefs, presentations, datasets — stay in their own repos and publication channels. When in doubt: *can this knowledge save a colleague an hour next Tuesday?* If yes, it belongs here.

## Deliverable patterns

The interactive analytical products the kit currently supports. Traditional research formats (papers, briefs, conference talks, methodological notes) sit alongside these; the kit focuses on what benefits from shared tooling.

| Deliverable | Format | Description |
|-------------|--------|-------------|
| Play Cards | HTML scrollytelling (8 sections) | Target activities, inputs, standards, sequencing, finance architecture for a single play |
| Constraint Maps | HTML scrollytelling | Ranked bottleneck maps per play with finance annex |
| Chart Packs | HTML/PPTX | Standardized country-level visualization sets |
| Cross-country Comparators | HTML | Visual products comparing indicators across countries |
| Infrastructure Maps | HTML (Leaflet) | Interactive maps overlaying energy grid, RCA, supply chain, and investment data |

## Sprint Structure

Each country follows a 5-month production + 1-month QA cycle:

| Sprint | Output | Description |
|--------|--------|-------------|
| S0 | Play Selector | Data-driven ranking of 10 candidate plays using RCA, relatedness, trade volume |
| S1 | Play Cards (2-3) | Deep-dive per play: components, geography, trade, standards, sequencing, finance |
| S2 | Constraint Maps | Bottleneck analysis by category with finance annex |
| S3 | Platform Products | Cross-country comparators, methods notes |
| S4 | QA and Synthesis | Review, consistency checks, final packaging |

## Kit coverage by country

Reflects what's *in this kit* — pipelines, data caches, deliverables that have been systematized for reuse. Research programs may be further along than the tooling suggests; add to this table as kit coverage expands.

| Country | Kit status | Notes |
|---------|-----------|-------|
| Mexico | Active | Play selector, 3 play cards (Auto Supplier, EV Components, Grid Hardware), infrastructure map, 431-park scoring |
| Brazil | Planned | Illustrative plays in concept note; pipelines not yet parameterized |
| India | Planned | Illustrative plays in concept note; pipelines not yet parameterized |

## Data Sources

| Source | Cube/Endpoint | Used For | Auth |
|--------|--------------|----------|------|
| OEC (oec.world) | `trade_i_baci_a_22` | RCA computation, bilateral trade (BACI 2022) | API key + browser User-Agent header |
| OEC Mexico | `trade_s_mex_y_hs6` | National + subnational exports/imports | Same |
| OEC USA | `trade_s_usa_state_m_hs` | US state-level trade | Same |
| OEC Canada | `trade_s_can_m_hs` | Canadian trade | Same |
| DataMexico | `economy_foreign_trade_mun` | Municipality-level HS4 exports | Public, no auth |
| DataMexico | `/stats/rca` (DENUE) | Manufacturing employment by state/industry | Public, multi-month parameter required |
| DataMexico | `industrial_parks` | AMPIP-registered industrial parks | Public |
| BNEF | Manual JSON | Green manufacturing project pipeline | Pre-compiled |
| OSM (earth-osm) | GeoJSON | Transmission lines, substations, generators | Public |
| WRI GPPD | JSON | Power plants (277 plants, 62K MW for Mexico) | Public, v1.3 |
| OpenDataSoft/INEGI | GeoJSON | Municipality boundaries | Public |
| NZIPL EV Greenfield | `projects/nzipl/infra-mx/data/nzipl_ev_greenfield_global.json` | Verified global EV investment pipeline (three-tier sourced) | Manual JSON, CC-BY-4.0 |

### OEC API Reference

- Base: `https://api-v2.oec.world/tesseract/data.jsonrecords`
- Auth: Three headers required:
  - `Authorization: Bearer <key>`
  - `X-API-KEY: <key>`
  - `token=<key>` as query param
- **Critical**: Also requires a browser-like `User-Agent` header (Cloudflare protection)
- Response: Records are inside a `data` key: use `result.get("data", result)` or `result["data"]`

### DataMexico API Reference

- Base: `https://www.economia.gob.mx/datamexico/api/` (legacy `api.datamexico.org` is deprecated)
- Endpoints: `/data` (cubes), `/stats/rca` (specialization, also the only path with full DENUE sector coverage)
- No auth required, but set a browser User-Agent
- **Critical**: The `/data` endpoint silently drops manufacturing (31-33), wholesale (43), info (51), professional services (54) from DENUE. Use `/stats/rca` with multi-month parameter (e.g., `Month=20250522,20241126,20240523`) to get all sectors.
- **Full reference**: install the `datamexico-api` skill (this folder) for the curated 14-cube catalog, 12 gotchas, and 8 stdlib templates. The skill auto-triggers when Claude needs to write or extend a Mexico pipeline.

## Play Card Structure (8 Sections)

| Section | Content |
|---------|---------|
| Hero | Play name, key metric cards, one-sentence framing |
| 01 The Play | Horizontal grouped bars (exports/imports by category) |
| 02 Components | Category cards with mini RCA + state bars |
| 03 Geography | State x category heatmap (matrix + map toggle) |
| 04 Trade | Stacked bars (destinations, sources) |
| 05 Standards | HTML table of certification requirements |
| 06 Sequencing | Swimlane Gantt (4 phases, 0-72 months) |
| 07 Takeaways | 3x2 card grid |
| 08 Finance | Capex ranges, gap analysis, instrument heatmap, actor coordination |

## Pipeline Conventions

- **Language**: Python 3, stdlib only (json, argparse, urllib). No pip dependencies.
- **Output**: JSON files. All data embedded in HTML deliverables as `const DATA = {...}`.
- **Caching**: API responses cached locally (`*_cache.json`). Use `--skip-api` flags to reuse caches.
- **Self-contained**: HTML deliverables make no runtime API calls. Fully offline-capable.

## Design System

Use the `/nzipl-design` skill for all visual formatting. Key tokens:
- Dark theme: body `#1A1B1E`, cards `#25262B`
- Brand green: `#56a360` (accent), `#7fc77f` (links)
- Font: Archivo (headings 600-700, body 400)
- Attribution: "Net Zero Industrial Policy Lab | Johns Hopkins University | netzeropolicylab.com"

## Skills

| Skill | Description |
|-------|-------------|
| `nzipl-design` | Apply the NZIPL/CICE design system to HTML, PPTX, and data visualizations. Dark Mantine theme, Archivo, green accent. |
| `gather-ev-greenfield` | Gather and verify EV greenfield manufacturing investments worldwide into the Lab's public-citable dataset. Three-tier verification, dedup against BNEF + fDi Markets. Doubles as the training exercise for new Lab members. |
| `datamexico-api` | Expert reference for the DataMexico API (Mexican subnational economic data via economia.gob.mx). Auto-triggers on DataMexico, DENUE, AMPIP industrial parks, INEGI economic census, ECI/PCI Mexico, municipality HS4 trade, FDI, CONEVAL. Curated 14 cubes + 12 gotchas + 8 stdlib templates, distilled from production pipelines. |
| `naics-hs-matching` | Audit, clean, validate, and maintain NAICS-HS concordance mappings for economic complexity and clean technology work. Bundles a 7-step pipeline (profile → clean → review-fields → audit → build → inspect → validate → compare) with stdlib + pandas scripts. Auto-triggers on Green Dictionary mappings, S&P firm NAICS matching, candidate NAICS selection, and mapping review workflow columns. |

## Commands

| Command | Description |
|---------|-------------|
| `/enrich-fdi` | Enrich FDI dataset rows with per-row source URLs via web research. Reads xlsx, searches for confirming articles, writes URLs to source columns. |

## Tasks

| Task | File | Status |
|------|------|--------|
| FDI Source Enrichment | `tasks/enrich-fdi.md` | In progress. Live count: `tasks/enrich-fdi-progress.json` |
| EV Greenfield Global | `tasks/ev-greenfield-TEMPLATE.md` | Template. Copy to `tasks/ev-greenfield-<country>.md` per researcher. Dataset: `projects/nzipl/infra-mx/data/nzipl_ev_greenfield_global.json` |

## References

- `glossary.md` -- Terms, acronyms, internal vocabulary
- `gotchas.md` -- Known data/API issues that cause silent failures
- `gotchas-frontend.md` -- D3, headless browser, and HTML rendering issues
- `discoveries.md` -- Team-contributed findings (append here when you learn something)
- `prompts.md` -- Starter prompts for new team members
- `pre-read.md` -- 5-min pre-session skim note (no install required)
- `CONTRIBUTING.md` -- How to add to this kit
