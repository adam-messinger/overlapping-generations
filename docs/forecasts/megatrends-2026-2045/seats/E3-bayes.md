**BLUF:** I started from the outside-view priors and applied explicit likelihood ratios. The one strong signal is that real yields sit well above CBO's rate path. It lifts Q4 from 30 to 51 and pushes Q6 toward fiscal dominance (A=41). Almost every demographic signal is weak (LR under 2:1), so Q1, Q2 and Q5 barely move from their priors.

**Reasoning (prior odds × LRs = posterior; LRs under 2:1 are marked weak)**

**Q1.** Prior 48, odds 0.92.
- Ageing shifts spending to non-tradable care (fermi): ×1.15, weak.
- Digital services still growing ~10%/yr: ×0.85, weak.
- Tariff and fragmentation drift: ×1.2, weak.
- 0.92 × 1.17 = 1.08, so **52**.

**Q2.** Prior median 10.8.
- The 2025 growth of +10% ([WTO via JETRO]) moves the median up about 0.2.
- A first-release nowcast tends to be revised up later, so the first print runs low: about −0.1.
- Result: **7.9 / 10.9 / 14.6**, spread unchanged.

**Q3.** Prior median 2.2, built as a 50/50 blend of persistence at 2.9 and reversion to 1.5.
- Three things move it: Carvalho et al. say the demographic downward pressure "has declined" ([FRBSF](https://frbsf.org/wp-content/uploads/el2025-10.pdf)), HLW r* has risen from 1.36 to 1.73, and China's saving is projected to fall ([IMF](https://www.imf.org/en/publications/wp/issues/2025/12/12/reforms-to-reduce-chinas-high-household-savings-572507/index.md)).
- Pulling the other way: AMRS find ageing adds about 200% of GDP to asset demand ([KC Fed](https://www.kansascityfed.org/documents/11206/AMRS_Jackson_Hole_Final.pdf)).
- Net effect: the blend weight moves to 65/35, giving a median of **2.4**, with the tails unchanged.

**Q4.** Prior 30, odds 0.43.
- **One rate shock, counted once** (TIPS 2.9%, nominal 10y ~4.95%, both above CBO's path): ×2.4. P(rates ≥50bp above the path at origin | YES) ≈ 0.6 vs | NO ≈ 0.25, and pass-through is about 0.5pp of GDP per 0.5pp of rate.
- CBO's immigration cut ([CBO](https://www.cbo.gov/system/files/2026-01/61879-Demographic-Outlook.pdf)): ×1.05, weak, and mostly already in the baseline.
- OASI depletion in 2032 ([SSA](https://www.ssa.gov/OACT/TRSUM/)): ×0.95, weak, because a forced benefit cut would lower deficits.
- 0.43 × 2.39 = 1.03, so **51**.

**Q5.** Prior 11, odds 0.124.
- China's working-age decline of −0.8%/yr ([Caixin](https://www.caixinglobal.com/2026-01-19/chinas-population-decline-accelerates-as-births-hit-modern-era-low-in-2025-102405521.html)): ×0.9, weak.
- Persistent deflation: ×0.7, weak (inverse 1.4).
- A softer dollar: ×1.2, weak.
- Census revisions in 2028 and 2033: ×1.1, weak.
- Total ×0.83, so **9**.

**Q6.**
- **A, US net interest leg.** Prior 13%, odds 0.149. CBO's long-term projection of 5.7% in FY2046 ([PGPF](https://www.pgpf.org/article/national-debt-projected-to-hit-175-gdp-interest-totals-99-trillion/)) gives ×2.0. The rate shock, diluted over 19 years, gives ×1.8. Result: 35%.
- **A, G7 leg.** Prior 10%, times 1.3 (weak) for gilt, OAT and JGB stress: 12%.
- **A total.** The union is 43%; trimmed for correlation between the legs, **41**.
- **B.** Unconditional odds 0.18. IMF medium-term trend of about 3.1: ×0.6. Labour drag: ×0.85, weak. AI capex: ×1.4, weak. That gives 11.5%; times not-A, plus a correlation adjustment, gives **8**.
- **C.** Prior odds 0.43 (30%). The adjustments are 0.6 (2.9% level), 0.8, 1.3, 0.85 and 0.8; all but the first are weak. That gives 15%, and excluding A and B worlds gives **14**.
- **D.** **37**.

```json
{
  "lens": "bayes",
  "bluf": "I started from the outside-view priors and applied explicit likelihood ratios. The one strong signal is that real yields sit well above CBO's rate path. It lifts Q4 from 30 to 51 and pushes Q6 toward fiscal dominance (A=41). Almost every demographic signal is weak (LR under 2:1), so Q1, Q2 and Q5 barely move from their priors.",
  "q1": 52,
  "q2": {"p10": 7.9, "p50": 10.9, "p90": 14.6},
  "q3": {"p10": 0.9, "p50": 2.4, "p90": 3.6},
  "q4": 51,
  "q5": 9,
  "q6": {"A": 41, "B": 8, "C": 14, "D": 37},
  "key_drivers": ["rates ~50-65bp above CBO path, counted once (LR 2.4)", "CBO LTBO 5.7% net interest FY2046 (LR 2.0)", "demographic r* signals all weak and offsetting", "China deflation plus labour decline (weak LRs)"],
  "sources": ["https://www.cbo.gov/publication/62207", "https://www.cbo.gov/system/files/2026-01/61879-Demographic-Outlook.pdf", "https://www.pgpf.org/article/national-debt-projected-to-hit-175-gdp-interest-totals-99-trillion/", "https://www.ssa.gov/OACT/TRSUM/", "https://frbsf.org/wp-content/uploads/el2025-10.pdf", "https://www.kansascityfed.org/documents/11206/AMRS_Jackson_Hole_Final.pdf", "https://www.imf.org/en/publications/wp/issues/2025/12/12/reforms-to-reduce-chinas-high-household-savings-572507/index.md", "https://www.caixinglobal.com/2026-01-19/chinas-population-decline-accelerates-as-births-hit-modern-era-low-in-2025-102405521.html"],
  "caveats": ["CBO: net interest is the outlay it 'has almost always overestimated' (2023 the exception)", "FRBSF: aging 'could, in principle, put either downward or upward pressure on r-star'; no published CI for the US demographic r* effect", "AMRS 250%-debt-without-higher-rates is a conditional scenario, not a forecast"]
}
```