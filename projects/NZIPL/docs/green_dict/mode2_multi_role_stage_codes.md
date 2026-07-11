# Green Dictionary — codes carrying multiple roles/stages (Mode 2)

_Generated 2026-07-10 from `data/green_dict/green_dictionary.csv`._

These are the **20 `tech x HS6` codes** where a single 6-digit code maps to **more than one production role and/or stage** within the same technology. They are the only cases where collapsing the identifier to bare HS6 is *lossy* for trade/activity data — a canonical `(role, stage)` must be chosen per code. The other ~90% of multi-name codes differ only in label, not in role/stage, so they collapse cleanly.

- `issue` = which attribute is multivalued (`role`, `stage`, or both).
- `official_description` = official HS text joined on the code’s canonical revision (`hs_rev_canonical`).
- Decide a canonical role/stage per code.

| # | tech | HS6 | rev | issue | official HS description |
|---|------|-----|-----|-------|--------------------------|
| 1 | Batteries | `842010` | HS22 | stage | Machines: calendering or other rolling machines, for other than metal or glass |
| 2 | Batteries | `847982` | HS22 | stage | Machines: for mixing, kneading, crushing, grinding, screening, sifting, homogenising, e... |
| 3 | Batteries | `850790` | HS22 | stage | Electric accumulators: parts n.e.c. in heading no. 8507 |
| 4 | EVs | `741410` | NA | role | _(not in HS22 — see NA)_ |
| 5 | Electrolyzers | `847982` | HS22 | stage | Machines: for mixing, kneading, crushing, grinding, screening, sifting, homogenising, e... |
| 6 | Geothermal | `400259` | HS22 | role | Rubber: synthetic, acrylonitrile-butadiene rubber (NBR), (other than latex), in primary... |
| 7 | Geothermal | `841710` | HS22 | role+stage | Furnaces and ovens: non-electric, for the roasting, melting or other heat-treatment of ... |
| 8 | Geothermal | `845521` | HS22 | stage | Metal-rolling mills: hot or combination hot and cold rolling mills |
| 9 | Geothermal | `845710` | HS22 | stage | Machining centres: for working metal |
| 10 | Geothermal | `845961` | HS22 | stage | Machine-tools: for milling by removing metal, (not knee-type), numerically controlled |
| 11 | Geothermal | `846021` | HS12 | stage | _(not in HS22 — see HS12)_ |
| 12 | Heat Pumps | `841590` | HS22 | stage | Air conditioning machines: with motor driven fan and elements for temperature control, ... |
| 13 | Magnets | `850519` | HS22 | role+stage | Magnets: permanent magnets and articles intended to become permanent magnets after magn... |
| 14 | Nuclear | `840140` | HS22 | role+stage | Nuclear reactors: parts thereof |
| 15 | Solar | `700510` | HS22 | role+stage | Glass: float glass and surface ground or polished glass, in sheets, non-wired, having a... |
| 16 | Solar | `700719` | HS22 | role+stage | Glass: safety glass, toughened (tempered), (not of a size and shape suitable for incorp... |
| 17 | Solar | `848620` | HS12 | stage | Machines and apparatus of a kind used solely or principally for the manufacture of semi... |
| 18 | Solar | `854142` | HS22 | role+stage | Electrical apparatus: photosensitive semiconductor devices, photovoltaic cells not asse... |
| 19 | Wind | `392590` | HS22 | role | Plastics: builders' ware, n.e.c. or included in heading no. 3925 |
| 20 | Wind | `842420` | HS22 | stage | Spray guns and similar appliances |

---

## Competing role/stage assignments per code
