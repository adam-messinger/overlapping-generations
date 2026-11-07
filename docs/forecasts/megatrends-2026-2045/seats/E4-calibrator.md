**BLUF:** The effort's posterior is that US fiscal strain is the main fragmentation-era risk. FY2035 net interest of at least 4.5% of GDP is slightly more likely than not (59), and fiscal dominance (A, 38) edges out the residual regime D (34) for 2045. Trade/GDP probably holds its 2024 level as digital services offset the drag on goods trade (Q1 41), and China re-reaching 75% of US nominal GDP is an underdog (24).

**Reasoning (calibrator).**
- **Q4 (59).** CBO puts net interest at 3.3% of GDP in 2026 and 4.6% in 2036 (https://www.cbo.gov/publication/62207). FY2035 therefore sits about on the threshold, so the honest prior is roughly 50.
  - The premortem landed a real hit on the outside-view's 30. CBO's habit of over-projecting interest is a 1984-2021 artefact of falling rates.
  - Rates are above CBO's 4.4% 10-year assumption (https://www.crfb.org/blogs/cbo-releases-february-2026-budget-and-economic-outlook), and IEEPA tariff revenue has been lost (https://budgetlab.yale.edu/research/state-us-tariffs-february-20-2026). Both push the number up.
  - I discounted persistence using the premortem's analogue: the October 2023 term-premium spike reversed within weeks. That keeps me below fermi (65) and signals (67).
- **Q6-A (38).** Net interest of 6% or more in 2045 is about 55% likely given a Q4 YES and about 12% given a NO. That gives roughly 37 from the US leg, plus about 4 net from the G7 restructuring/IMF leg, less overlap.
  - Bayes's 44 compounded correlated term-premium and deficit likelihood ratios.
  - Fermi's +0.7pp from the simulation's fragmentation lever is circular, as the premortem showed, so I gave it zero weight. Fermi did not let the model level drive B, which is correct.
- **Q3 (0.7 / 2.2 / 3.4).** Today's ~2.9% (https://fred.stlouisfed.org/series/DFII10) partly mean-reverts. The ACM move is supply-driven, so I expect less reversion than the outside-view's 1.8.
- **Q6-C (15).** If the 2035 median is 2.2, P(2041-45 average ≤ 1.0) is about 19%. I subtracted the A and B overlaps.
  - Repression-style dominance keeps US net interest below 6% and so resolves C, not A. That is why C sits above signals and bayes (10).
  - It stays below the outside-view's 25, whose windows were all at the zero lower bound.
- **Q6-B (13).** IMF medium-term world growth is about 3.1%, and demographics weigh on it.
- **Q2 (8.1 / 10.9 / 14.9).** Growth of about 7.5% a year from 2025. First prints are revised up later, which trims the upper tail. WTO and UNCTAD figures are "not one series" (https://unctadstat.unctad.org/insights/theme/254).
- **Q5 (24).** About 0.65 times growth, deflator and currency factors gives a median near 0.70, with σ(log) about 0.12.

**Coherence checks.**
- **Q4 vs A:** 59 on Q4 maps to about 38 on A. Consistent.
- **Q3 vs C:** consistent, as derived above.
- **Q2 vs Q1:** a Q2 median of 10.9 adds about 4.3pp of trade/GDP from digital services. Goods would have to fall about 10% relative to GDP to resolve Q1 YES, which gives 41.
- **Q6 total:** 38 + 13 + 15 + 34 = 100.

```json
{
  "lens": "calibrator",
  "bluf": "US fiscal strain is the effort's dominant fragmentation-era risk: FY2035 net interest of at least 4.5% of GDP is slightly more likely than not (59), and fiscal dominance (38) narrowly leads the residual regime (34) for 2045. Trade/GDP probably holds as digital services offset goods drag (Q1 41), and China re-reaching 75% of US nominal GDP is an underdog (24).",
  "q1": 41,
  "q2": {"p10": 8.1, "p50": 10.9, "p90": 14.9},
  "q3": {"p10": 0.7, "p50": 2.2, "p90": 3.4},
  "q4": 59,
  "q5": 24,
  "q6": {"A": 38, "B": 13, "C": 15, "D": 34},
  "key_drivers": ["Q4 threshold equals CBO baseline; rates above CBO path, tariff revenue lost", "partial mean reversion of a supply-driven real-yield shock", "digital services add ~4pp to trade/GDP by 2035", "repression-style dominance resolves C, not A"],
  "sources": ["https://www.cbo.gov/publication/62207", "https://www.crfb.org/blogs/cbo-releases-february-2026-budget-and-economic-outlook", "https://budgetlab.yale.edu/research/state-us-tariffs-february-20-2026", "https://fred.stlouisfed.org/series/DFII10", "https://unctadstat.unctad.org/insights/theme/254", "https://www.thewealthadvisor.com/article/surge-treasury-term-premium-warns-rising-bond-risks"],
  "caveats": ["WTO $4.8T (2024) and UNCTAD $5.26T (2025) digitally delivered services are 'not one series'", "HLW r* 1.65% is a secondary report, not confirmed on the NY Fed page; no November 2026 DFII10 print found", "Simulation is real/PPP with no price level; its fragmentation lever's fiscal reading is circular and was given zero weight"],
  "downweighted": "outside-view on Q4 (its CBO over-projection reference class belongs to the 1984-2021 falling-rate regime, and the threshold equals CBO's own baseline, so the prior is ~50, not 30), on Q5 (n=3 rivals) and on Q6-C (all its windows are zero-lower-bound/QE years); signals on Q4 and Q6-A (anchored on the October 2026 sell-off; the 2023 analogue reversed in weeks), on Q5 (one month of CNY strength) and on Q6-B (8 had no growth argument); fermi on Q4 and Q6-A (its model-agreement claim rests on the circular defence-deficit lever, given zero weight) and on Q5 (multiplies three favourable factors), though full weight on its Q1 decomposition; bayes on Q6-A (stacked correlated term-premium and deficit LRs, so 44 is too high) and slightly on Q1 (three weak 0.85 LRs, one of them a transitory price effect); premortem not down-weighted on Q4 or Q3 (real hits), but its fiscal-consolidation reaction function and AI payroll-tax erosion arguments were posed, not shown, so I did not move on them and moved C to 15, not its 19",
  "wave_audit": "Wave 1 split hardest on Q4 (outside-view 30 vs fermi 65 / signals 67), Q6-A (22 vs 40/37), Q6-C (25 vs 13/10) and Q5 (13 vs 30/36). Wave 2: bayes pushed in the signals direction (Q4 58, A 44, C 10); the premortem retired the outside-view's Q4 reference class but also punctured fermi/signals anchoring and model circularity (Q4 55, A 35, C 19). Final versus the outside-view base rates (AMPLIFIED = moved further in the base rate's direction; MODERATED = pulled toward the centre/inside view): Q1 47 to 41 AMPLIFIED; Q2 median 10.8 to 10.9 HELD; Q3 median 1.8 to 2.2 MODERATED (less mean reversion); Q4 30 to 59 REVERSED (crossed 50); Q5 13 to 24 MODERATED; Q6-A 22 to 38 MODERATED upward (A becomes modal), Q6-B 15 to 13 HELD/slightly amplified, Q6-C 25 to 15 MODERATED, Q6-D 38 to 34 MODERATED.",
  "largest_update": "Q4: +29pp versus outside-view (30 to 59). The outside-view's CBO over-projection bias came from the 1984-2021 falling-rate regime (premortem hit). With the threshold sitting at CBO's own FY2035 baseline (3.3% in 2026 to 4.6% in 2036), the prior is ~50; rates above CBO's 4.4% 10-year assumption and lost IEEPA tariff revenue then tilt it up, tempered by the 2023-style reversal risk."
}
```