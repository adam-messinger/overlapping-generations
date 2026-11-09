# Seat E2-bayes (effort E2 neutral-rate-capital; lens: bayes)

**BLUF.** Updating the outside-view base rates on this effort's signals leaves composite R near 0.8% for 2036-45 and Q2 at 8%: the 2026 bond rout is one correlated cluster worth about 2:1, and the growth-leg arithmetic takes a third of it back. Only one signal in the packet earns a likelihood ratio above 2:1 (the OBR's official damage scoring, Q3); every other is flagged.

## Reasoning (prior odds x LR = posterior odds)

LR = P(signal|H) / P(signal|not H). "Flag" = not justifiable above 2:1.

**Q2/C2.** Prior 6% (odds 0.064), P50 0.65. Prior re-run on the resolver file (https://www.newyorkfed.org/medialibrary/media/research/economists/williams/data/Holston_Laubach_Williams_current_estimates.xlsx): 140 origins, median change -0.72, maximum +0.15, 0 of 140 reach the +1.27 needed.
(a) Price-of-capital cluster: 10-year TIPS 2.60% on 2026-11-05, peak 2.95% (https://fred.stlouisfed.org/data/DFII10); FOMC longer-run median 3.2% (https://www.federalreserve.gov/monetarypolicy/fomcprojtabl20260916.htm); six-measure "alternative r-star" 1.43% in 2025Q4, which "might be biased upward", HLW the lowest (https://www.stlouisfed.org/on-the-economy/2026/may/comparing-fomc-estimate-r-star-alternative-estimates); debt supply; capex. One signal, not five: dots, models and forwards read the same tape. 0.8/0.4 = LR 2.0, flag. Not higher: TIPS stood at 2.43% in January 2003 and the matched window (2012Q4-2022Q3) averaged 0.89; at 2.52% in October 2023 the composite then fell 0.89 to 0.73.
(b) Fermi's growth leg: H needs US trend growth near 3.3% against official 1.8-1.9%. 0.5/0.75 = LR 0.67, flag.
(c) Filter fell 1.29 to 0.73 through the rout: already in the prior, LR 1.
(d) Dispersion: sigma_r* 0.19/0.24/0.14 compounds to window sd 1.02-1.27; the composite's realized quarterly changes (sd 0.129) give 0.93; the prior implies 0.87. LR 1. Fermi's 5-7% used 0.87, not its own 1.0-1.3 (8-14%).
0.064 x 2.0 x 0.67 = 0.086: **8%**. The same 1.34 on "R above 0.65" gives 57%, +0.15: P50 0.80, P90 1.92. "S.E. (final obs.)" 1.53/1.97/4.79 is level noise; not applied.

**C1/Q1.** Prior P(E < 0.75) 15% (odds 0.176), P50 1.1. Fermi's components (tariffs, fuel volumes, import substitution, net of AI goods) are judgment: LR 1.5, flag. WTO ratios 1.5/1.4 are in the prior: LR 1. 0.265: 21%; P50 1.0. Share above 42%: prior 40% (odds 0.67); AI-goods surge (two years, two aggregates) LR 1.5, flag; fermi's share arithmetic LR 1.2, flag: 1.2, 55%; 0.58 given low E. 0.21 x 0.58 = **12**.

**C3.** Prior P50 137. On "above 137": TIPS 2.60% above HLW US trend growth 2.41%, LR 1.3, flag (35 bp off the peak); IMF 2031 path revised up, LR 1.1, flag; fermi's component sum 135, LR 0.9. 1.29: 56%, +3.6: P50 140.

**Q3.** Prior 2% (odds 0.020), built on catastrophe losses alone. OBR, verified: damage "could add 2.0 per cent of GDP to primary borrowing by the early 2070s", mostly lost receipts, just-below-3C scenario, no 2040s figure found, with "significant uncertainties ... that cannot, for the moment, be readily quantified" (https://obr.uk/frs/fiscal-risks-and-sustainability-july-2025/). An official body scoring leg (iv) at that size: 0.85/0.35 = LR 2.4. Errata's gross-level reading LR 1.3, flag; no live marker near 1.5% (Spain: 0.7 points over three years, one event) LR 0.8, flag. 0.051: **5**.

**Q4.** Prior 2%. Fed tightened into the worst long-end stress since 2002: 0.55/0.8 = LR 0.7, flag; live stress and US debt 140.7% in 2030, LR 1.3, flag; errata's euro-area double count, LR 1.1, flag. Product 1.0: **2**.

**C4/Q6.** Prior P50 1.95, P(g >= 2.5) 7% (odds 0.075), C 18%. Fermi's components and 2026-27 telemetry near 2.6%: one cluster, LR 1.8, flag (two years of twenty). Adapter 2.95%: contradicts OECD history, LR 1. 0.135: 12%; "above 1.95" 64%, +0.15: P50 2.1. C: 0.22 x 0.8 (ESM-only rescues excluded) x 1.2 (live stress, press; flag) x 0.85 (fermi's hazards, unsourced; flag) = 0.18: 15. A = 12 x 0.92 = 11; B 74.

**Q5.** Prior 5% (odds 0.053). US + China flat at 42.3% since 2021: 0.45/0.75 = LR 0.6, flag; fermi's nominal path 42.7%/13.9%, LR 0.85, flag. 0.027: **3**.

**Coherence.** Q1 12 <= 21. C2 P90 1.92 < 2.00, Q2 8 < 10. A 11 <= 12. Q4: C3 puts the US and Japan above 140%, Italy near it; cap rarity binds.

```json
{"c1": {"p10": 0.62, "p50": 1.0, "p90": 1.42},
 "q1": 12,
 "c2": {"p10": -0.25, "p50": 0.8, "p90": 1.92},
 "q2": 8,
 "c3": {"p10": 112, "p50": 140, "p90": 168},
 "q3": 5,
 "q4": 2,
 "c4": {"p10": 1.6, "p50": 2.1, "p90": 2.6},
 "q5": 3,
 "q6": {"A": 11, "B": 74, "C": 15}}
```
