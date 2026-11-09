# Seat E2-premortem (effort E2 neutral-rate-capital; lens: premortem)

**BLUF.** Wave 1 forecast a thermometer reading, not a rate: all three seats assumed the 2046 resolver is today's HLW filter sitting near 0.73, and that shrank every tail. I put R at 0.9 inside -0.55 to 2.45 with Q2 at 17, and move C3 (142) and Q3 (14) up; Q4 and Q5 stay rare.

## Reasoning (premortem only)

**Shared assumption: one stable, slow instrument.**
- Continuity: the series follows its author. It was "previously published on the Federal Reserve Bank of San Francisco's website" (https://www.newyorkfed.org/research/policy/rstar), paused 2020-2022, and Williams must leave by June 2028 (Brookings, https://www.brookings.edu/articles/who-has-to-leave-the-federal-reserve-next-2, search summary). I put 30% on the realized-rate fallback, 12% on a successor model; the fallback's US decade means run from -0.4 to 4.5.
- Dispersion: fermi derived a window sd of 1.0-1.3 from HLW's own innovations, then priced Q2 "at 0.87"; at its own sd a driftless 0.73 gives 11-15%.
- Asymmetry: fermi took the official growth drag (-0.48pp) whole and passed 0.6 of the z pulls.

Checked, not the risk: the 2023 rewrite left estimates "close to their respective levels estimated directly before the pandemic" (search summary of https://www.newyorkfed.org/medialibrary/media/research/staff_reports/sr1063.pdf).

**Simulation closure.** "Tenths; climate negative" restates the closure: safe rate = c x trend growth + 3.5bp per point of debt, no term premium, saving-investment balance or adaptation-capex channel, so climate can only lower it. ai-energy-boom adds 1.80pp of growth and 0.47pp of safe rate (0.26 per point, net of the debt term) against HLW's c of 0.96-1.13; on HLW's c that run's gap (US +1.04pp, OECD ex-US +1.03pp) lifts R to about 1.8. Its 2.95% for C4 shares one world production function out by region: an upper bound.

**C2/Q2.** High tail (R 2.4), the world I price: Treasury supply ends the safe-asset premium, AI, grid and defence capex meet ageing dissaving, and z retraces its post-2008 fall or US trend growth passes 3.3%. P(R>=2): 13% on HLW, 25% on a successor, 21% on the fallback: 17. Low tail (R -0.6): an AI-capex bust, euro-area r* below -1, bills held under inflation for a decade.

**C3.** IMF (https://www.imf.org/external/datamapper/api/v1/GGXWDG_NGDP/ADVEC): 74.8 (2005), 70.1 (2007), 101.8 (2012), 100.9 (2019), 119.3 (2020), 108.2 (2025). The ratio jumps in crises (+31.7, +18.4) and erodes between them (-0.9, -11.1); three medians within two points all drew one line from 115.2. Outside-view's bias-corrected 122 plus its own drift is 143, not 137. Drift of 1.1pp a year plus 11 for crises: 142. Low tail, 2020-2025 repeated: 112. High tail, r>g and two crises: 180.

**Q3.** Wave 1 predates the erratum: F is a gross level. Relief and backstops 0.4 (FEMA's fund alone: 0.19% of US GDP, preamble, unverified), adaptation 0.3, support 0.05: 0.75, or 0.55 on a narrow taxonomy. Revenue loss adds 0.35 if the resolver follows the OBR, whose 2.0% of GDP of borrowing on an 8% GDP loss omits adaptation, "one important missing piece of our analysis" (https://obr.uk/frs/fiscal-risks-and-sustainability-july-2025/). Lognormal sigma 0.5: 27% at 1.1, 2% at 0.55; weighted 45/55, plus the high-sensitivity tail: 14.

**Q4.** At my C3 median Japan, the US, Italy and probably France pass 140%: three numerical caps bind, not the gate. Fiscal-dominance regime 15% x 0.2, plus residue: 4.

**C1/Q1.** Regimes move both rates in E together, trade more: fragmentation 0.6, a capex-goods cycle 1.4. After the WTO's 2026-27 head start, E<0.75 needs a run rate near 0.67 for eighteen years: 22%. Low E shrinks the merchandise denominator, so (ii) is 0.6 given (i): 13.

**C4/Q6.** Every ten-year window since 1990 lies in 2.15-2.85, and 2015-2025 (2.58) would pass A's growth test; outside-view's 7% for g>=2.5 assumes China slows on schedule. Low tail (per capita: China 1.5%, OECD 0.8%): 1.15. P(g>=2.5) 25%; A = 25 x 0.92 = 23. C 14: high-R worlds are r>g worlds, and euro members cannot print.

**Q5.** The renminbi is managed against the dollar, so a strong-dollar 2045 lifts both shares: 0.10 x 0.55 = 6.

```json
{"c1": {"p10": 0.6, "p50": 0.95, "p90": 1.4},
 "q1": 13,
 "c2": {"p10": -0.55, "p50": 0.9, "p90": 2.45},
 "q2": 17,
 "c3": {"p10": 112, "p50": 142, "p90": 180},
 "q3": 14,
 "q4": 4,
 "c4": {"p10": 1.55, "p50": 2.2, "p90": 2.9},
 "q5": 6,
 "q6": {"A": 23, "B": 63, "C": 14}}
```
