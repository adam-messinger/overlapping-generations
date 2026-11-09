# Seat E3-bayes (sovereign-debt-fiscal, lens: bayes)

**BLUF.** One signal in the packet earns a likelihood ratio of 2:1 (the Fermi bottom-up on Q3); every other is weaker, so the posteriors sit close to the outside-view priors: advanced-economy debt 138% of GDP in 2045, Q3 at 4% and Q4 at 3%. The market-stress telemetry (yields at 2002 highs, the Fed's September hike, r-g closing) is worth at most 1.4:1 on any question here.

## Reasoning (bayes only)

Form: prior odds x LRs = posterior odds. **[w]** marks an LR I cannot justify above 2:1. Checked myself: Fed hike of 16 Sep 2026 (https://federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm); H.R. 10044, still in committee (https://www.govinfo.gov/app/details/BILLS-119hr10044ih); IMF deck slides 10, 17, 18 (https://www.suerf.org/wp-content/uploads/2026/09/Davide-Furceri-Fiscal-Monitor.pdf); CBO 108% (2030), 129% (2040), 175% (2056) (https://www.crfb.org/blogs/debt-rises-175-gdp-under-cbos-long-term-outlook).

**C3.** H: at least 140. Prior N(132, 23): 36%, odds 0.57. Errata slope (108.2 to 115.2, 7.0 points, not 5.1) with the CBO path (US about half the weight): jointly 1.6 [w], not 2.4, since both restate one US baseline. r-g slide 1.15 [w]: "unweighted cross-country medians; bands: interquartile ranges", 35 AEs, median below zero to 2029. Yields and hike 1.0 [w]: interest bill against inflation erosion (ratio fell 108.2 to 107.8 in 2026). Adapter "order ten pp" 0.8 [w]. 0.57 x 1.47 = 0.84: 46%, median 138.

**Q4.** Prior 2%, odds 0.020. Errata reading (one euro-area cap can count Italy and France; US 140.7% in 2030) 1.4 [w]. H.R. 10044 1.1 [w]: no official score; TPC "Hardest. Base is undefined". Tightening central banks 1.0 [w]: independence intact against rising pressure. Fed-Treasury accord commentary 1.1 [w]: newsletters only. 0.020 x 1.69 = 0.035: 3.

**Q3.** Prior 3%, odds 0.031. Fermi sum 0.71% (the prior anchored on a 0.2% marker) 2.0. Errata gross-level reading 1.4 [w]. IMF bar, about 0.15 for 2025-45 on my read ("relative to 2024 ... Climate: adaptation investment"), with OBR's "2.0 per cent of GDP ... by the early 2070s": jointly 0.55 [w], limb (i) only and "not be seen as forecasts". Swiss Re half-year 0.95 [w]. 0.031 x 1.46 = 0.045: 4.

**C2/Q2.** Prior 15%, odds 0.176. Market repricing (yields, hike, forward-rate coefficient about 0.07, "rolling windows of 40 observations", 90% band about 0.02-0.12) 1.4 [w]: nominal forwards with term premium, not r*. Resolver inertia (HLW 0.73, unmoved by three years of high yields; euro area 0.09 at 34%) 0.7 [w]. Adapter "tenths" 0.8 [w]. 0.176 x 0.78 = 0.138: 12. Median: precision-weighting the prior's 0.9 with Fermi's 1.04 gives 1.0.

**C1/Q1.** H: E below 0.75. Prior 12%, odds 0.136. Fuel-volume composition (Fermi) 1.5 [w]; AI goods 47% of first-half growth 1.3 [w]; "Tariffs rolled back" 0.85 [w]; product 1.66, cut to 1.5 for overlap: 0.205, 17%. Hurdle: after 2026-27 near 1.45, the other eighteen years must average about 0.66. Share leg: prior 0.5; AI-goods surge 1.5 [w], Fermi's 40.5 +/- 5 0.8 [w]: 0.55. Q1 = 0.17 x 0.55 = 9.

**C4, g.** H: g at least 2.5. Prior 24%, odds 0.316. Adapter 2.82 1.3 [w]: Fermi documents its upward bias. AI capex telemetry 1.2 [w]. IMF "lackluster" 0.9 [w]. Product 1.40, cut to 1.25 for overlap: 0.395, 28%. First decade 2.45, g 2.1: C4 median 2.28.

**Q5.** Leg one prior 20%, odds 0.25: adapter's flat constant-price share 0.6 [w]; Europe's exports -0.1% against Asia's +9.9% 1.2 [w]: 15%. Leg two prior 0.35, odds 0.54: Fermi's EU 14.0 baseline 1.5 [w]: 0.45. 0.15 x 0.45 = 7.

**Q6.** Credit-event prior 16%, odds 0.19. Stress telemetry with the debt path 1.3 [w]. Errata (ESM-only rescue excluded) 0.8 [w]. Fermi hazard sum 0.8 [w]: asserted, no evidence. 0.19 x 0.83 = 0.158: 14%. Stagflation limb 1.5%, overlapping slightly: C = 15. A = 0.28 x 0.91 = 25. B = 60.

**Coherence.** Q1 9 is under 17. C2 P90 2.1 exceeds 2.00 with Q2 12. A 25 is under 28. C3's median implies the US near 168, Japan near 185, Italy near 140: the three Q4 needs.

```json
{"c1": {"p10": 0.67, "p50": 0.98, "p90": 1.38},
 "q1": 9,
 "c2": {"p10": 0.1, "p50": 1.0, "p90": 2.1},
 "q2": 12,
 "c3": {"p10": 112, "p50": 138, "p90": 167},
 "q3": 4,
 "q4": 3,
 "c4": {"p10": 1.68, "p50": 2.28, "p90": 2.92},
 "q5": 7,
 "q6": {"A": 25, "B": 60, "C": 15}}
```
