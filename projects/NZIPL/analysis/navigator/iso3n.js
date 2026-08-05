/* iso3n.js — ISO 3166 alpha-3 → numeric, the join key between our trade rows
 * (ISO3) and the Natural Earth topology in geo.js (numeric feature ids).
 *
 * EXTRACTED 2026-08-05 from viz.js, which had carried the only copy. The Data
 * Explorer's growth map needs the same table, and a second literal copy is
 * exactly register class B-18 — a value in two artifacts with no producer,
 * which drifts the first time a country is added to one of them. This file is
 * the producer; consumers load it before the script that needs it.
 *
 * ⚠️ viz.js still has its own inline copy. Migrating it means touching the nine
 * pages that load viz.js, so it is recorded in the register rather than done
 * here — but the two are identical as of this extraction, and this file is
 * where a new country should be added.
 *
 * Coverage: 137 countries — the Natural Earth 110m set that carries trade in the
 * green baskets, not every BACI reporter. A reporter absent here is simply not
 * drawn on the map; it is still in every table and every total.
 *
 * TWN (158) is present and matters: BACI reports Taiwan as "Other Asia, nes"
 * under the reporter code S19, so the map resolves S19 → TWN → 158. */
window.ISO3N_TABLE = {
  AFG: 4, AGO: 24, ALB: 8, ARE: 784, ARG: 32, ARM: 51, AUS: 36, AUT: 40, AZE: 31, BDI: 108,
  BEL: 56, BFA: 854, BGD: 50, BHR: 48, BLR: 112, BOL: 68, BRA: 76, CAF: 140, CAN: 124,
  CHE: 756, CHL: 152, CHN: 156, CMR: 120, COD: 180, COG: 178, COL: 170, CUB: 192, CYP: 196,
  CZE: 203, DEU: 276, DJI: 262, DNK: 208, DOM: 214, DZA: 12, ECU: 218, EGY: 818, ERI: 232,
  ESP: 724, EST: 233, ETH: 231, FIN: 246, FJI: 242, FRA: 250, GBR: 826, GEO: 268, GHA: 288,
  GNQ: 226, GRC: 300, GTM: 320, GUY: 328, HKG: 344, HND: 340, HRV: 191, HTI: 332, HUN: 348,
  IDN: 360, IND: 356, IRL: 372, IRN: 364, IRQ: 368, ISR: 376, ITA: 380, JOR: 400, JPN: 392,
  KAZ: 398, KEN: 404, KHM: 116, KOR: 410, KWT: 414, LAO: 418, LBN: 422, LBY: 434, LKA: 144,
  LTU: 440, LUX: 442, LVA: 428, MAR: 504, MDA: 498, MDG: 450, MEX: 484, MLI: 466, MLT: 470,
  MMR: 104, MNG: 496, MOZ: 508, MRT: 478, MWI: 454, MYS: 458, NAM: 516, NER: 562, NGA: 566,
  NLD: 528, NOR: 578, NPL: 524, NZL: 554, OMN: 512, PAK: 586, PAN: 591, PER: 604, PHL: 608,
  POL: 616, PRK: 408, PRT: 620, QAT: 634, ROU: 642, RUS: 643, RWA: 646, SAU: 682, SDN: 729,
  SEN: 686, SGP: 702, SLE: 694, SLV: 222, SUR: 740, SVK: 703, SWE: 752, SWZ: 748, SYR: 760,
  TCD: 148, THA: 764, TJK: 762, TKM: 795, TTO: 780, TUN: 788, TUR: 792, TWN: 158, TZA: 834,
  UGA: 800, UKR: 804, URY: 858, USA: 840, UZB: 860, VNM: 704, YEM: 887, ZAF: 710, ZMB: 894,
  ZWE: 716
};
