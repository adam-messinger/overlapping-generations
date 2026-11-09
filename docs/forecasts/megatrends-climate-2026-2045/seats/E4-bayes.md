# Seat E4-bayes (effort E4 gdp-divergence, lens: bayes)

**BLUF.** Only two signals earn a likelihood ratio of 2:1: a US + China dollar share that is flat from 2021 through the IMF's 2031 projection (against Q5) and the fermi build of the climate fiscal categories (for Q3); the IMF's China path comes close and lifts C4 from 1.8% to 2.0% a year. Every other ratio is weaker and flagged, so the posteriors stay near the outside view: Q5 3%, regime B 71%.

## Reasoning

O = odds; † = a ratio I cannot justify above 2:1. Six lookups confirmed the packet's IMF, BLS and WDI figures; the OECD CPI and Employment Outlook pages returned HTTP 403 (unverified).

**C4.** Prior 1.2/1.8/2.5: P(≥ 2.0) 35%, O 0.53. IMF China growth 4.5, 4.0, 4.0, 3.7, 3.3, 3.3 for 2026-31 (https://www.imf.org/external/datamapper/api/v1/NGDP_RPCH/CHN/USA), about 4.1% per head against the prior's 2.5-2.85%: 1.8†. US productivity 2.2% a year since 2019Q4 against 1.5%, though the third estimate "has differed from the first estimate by -1.1 to +1.4 percentage points about 80 percent of the time" and 2.2% equals the post-1947 average (https://www.bls.gov/news.release/archives/prod2_11052026.htm): 1.3†. OECD's 0.6% "if nothing is done": 0.8†. The 2.65% run-rate repeats the prior's decade, the simulation's 2.95% is rejected by its own seat, the damage panel is retracted: 1.0 each. O = 0.53 × 1.87 = 1.00, 50%: 1.35/**2.0**/2.65.

**Q6.** P(g ≥ 2.5) prior 13%, O 0.149; China path front-loaded 1.1†, productivity 1.3†, OECD 0.85†: O 0.182, **15.4%** (g median 1.73; with 2.27% for 2026-35 that averages C4's 2.0). Credit-event limb: prior 18%, O 0.22; fermi's 8% country build (own-currency issuers; the errata excludes ESM-only rescues) 0.6†; no G7 sovereign in talks, a decade early, 0.9†; US debt 145.0% by 2031 and a 5.3% ten-year peak 1.25†: O 0.148, 12.9%. Stagflation limb stays 4% (one energy-led CPI print: 1.0†). C = 12.9 + 4 − 1.5 overlap = **15**; A = 15.4 × 0.93 = **14**; B = **71**.

**Q5.** Leg one prior 22%, O 0.28. `NGDPD` (https://www.imf.org/external/datamapper/api/v1/NGDPD/USA/CHN/EU/WEOWORLD): US + China 42.6% (2021), 42.3% (2026), 42.4% (2031), against 0.54 points a year needed afterwards: 0.5. Fermi's flat constant-price share overlaps: 0.85†. China's +9.8% dollar GDP: 1.0†. O 0.12, 10.7%. Leg two given leg one: prior 25%, O 0.33. IMF's EU slope, 17.8% to 16.7%: 1.5†. But the same file has the EU at 18.0% in 2015, so the whole 2008-26 fall predates 2015 and fermi's "12.3 repeating 2008-26" replays the euro crisis: 0.7†. O 0.35, 26%. 0.107 × 0.26 = **3**.

**C1/Q1.** P(E < 0.75) prior 12%, O 0.136. WTO's 1.45x start, two years of twenty: 0.85†. AI goods 47% of H1 2026 trade growth, one concentrated category: 1.2†. Fermi's 0.86, built on assumed volume indices: 1.4†. O 0.195, **16.3%**; the same product moves P(E < 1.0) from 33% to 41%: 0.65/1.07/1.50. Composite above 42% given low E: prior 55%; the AI surge raises the start but is what reverses in that world, 1.2†: 59.5%. Q1 = 0.163 × 0.595 = **10**.

**C2/Q2.** Prior 10%, O 0.111. HLW at 0.73% has not followed yields: 0.8†. Fermi's g + z (R ≥ 2 needs US ≥ 2.7) overlaps the prior's "none after 2001": 0.85†. Productivity raises g: 1.2†. Model safe rate: 1.0†. O 0.091: **8**. P(R ≥ 1.0) 43% to 49% (1.2† × 1.15† × 0.9†); P(R < 0) 15% to 8% (0.6† × 0.8†): 0.10/0.97/1.92.

**C3.** The prior's "110 plus 20-25" used the superseded vintage; from 108.2 its median is 131: P(≥ 130) 52%, O 1.07. IMF's 115.2 in 2031 matches the prior's drift: 1.0. Rising US weight at +3.4 points a year: 1.1†. Yields: 1.15†. O 1.35, 57.5%: 109/**134**/164.

**Q4.** Prior 2%, O 0.0204. BoJ tightening 0.9†; yields, with the US at 140.7% in 2030, 1.3†; no automation-tax bill found (thin search) 1.0†. O 0.024: **2**. On my C3 only Japan and the US clear 140%; Italy (135.6%) is marginal.

**Q3.** Prior 3%, O 0.031. Fermi's build under the locked categories (0.3 + 0.3 + 0.2 = 0.8% of GDP), about half the threshold where the prior's scaling gave a third: 2.0. OBR dates its 2.0% to "the early 2070s": 0.9†. Signals' 0.2-0.3% markers: 0.9†. O 0.050: **5**.

```json
{"c1": {"p10": 0.65, "p50": 1.07, "p90": 1.5},
 "q1": 10,
 "c2": {"p10": 0.1, "p50": 0.97, "p90": 1.92},
 "q2": 8,
 "c3": {"p10": 109, "p50": 134, "p90": 164},
 "q3": 5,
 "q4": 2,
 "c4": {"p10": 1.35, "p50": 2.0, "p90": 2.65},
 "q5": 3,
 "q6": {"A": 14, "B": 71, "C": 15}}
```
