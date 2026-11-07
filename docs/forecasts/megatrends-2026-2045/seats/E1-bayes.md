**BLUF:** Most energy-lens signals carry likelihood ratios under 2:1, so they barely move the outside-view priors (Q1 44, Q5 8). The one signal worth more than 2:1 is US nominal rates sitting 60-90bp above CBO's assumed path. Counted once per question, it lifts Q4 from 25 to 45 and regime A from 22 to 38.

**Reasoning** (prior from outside-view, then prior odds x LRs = posterior)

- **Q1** prior 42% (odds 0.72). Every signal here is weak (LR below 2):
  - Structural fuel displacement, LR 1.3. EVs at 27% of sales and clean capex at twice fossil capex share one cause, so I count them once (https://www.iea.org/reports/world-energy-investment-2026).
  - Chinese cleantech export deflation, LR 1.15.
  - WTO volume of +3.9%/+4.1%, running above GDP, LR 0.8.
  - Digital services growing more than 10%, LR 0.9.
  - The 2026 oil spike, LR 1.0: it is gone by 2035.
  - 0.72 x 1.3 x 1.15 x 0.8 x 0.9 = 0.78, so **44%**.
- **Q2** prior median 10.8.
  - The 2025 +10% print and computer-services +18% (Q1) / +12% (Q2, "estimated") share the AI cause; counted once, median +0.3.
  - Upward vintage revisions: median +0.2 and a fatter upper tail.
  - The UNCTAD 7.1%/yr figure is the "deliverable" series, so I exclude it.
  - Result: 8.5 / 11.3 / 14.6.
- **Q3** prior median 2.0.
  - HLW r* rising from 1.36 to 1.65 (secondary source, "not confirmed on NY Fed page"), LR about 1.4: median +0.15, upper tail +0.2.
  - Clean capex, LR about 1.0: fermi's model moves the result only +0.02pp.
  - Oil-shock inflation acts on breakevens, not real yields, LR 1.0.
  - Result: 0.9 / 2.25 / 3.4.
- **Q4** prior 25% (odds 0.33).
  - CBO assumes the 10-year at 4.1% in 2026 and 4.4% from 2031 (https://www.crfb.org/papers/cbos-february-2026-budget-and-economic-outlook). The market hit 5.35% in October and sat about 5.0% on 30 October (https://tradingeconomics.com/united-states/government-bond-yield/news/505912).
  - With debt at about 118% of GDP fully repriced by 2035, a 0.6pp higher effective rate adds about 0.7pp of GDP. LR 2.5, cut from about 3 because the 5% yields of 2023 reverted.
  - The oil-inflation signal shares this cause, so it adds nothing.
  - 0.33 x 2.5 = 0.83, so **45%**.
- **Q5** prior 10% (odds 0.11).
  - Persistent Chinese PPI deflation and solar overcapacity (installs -66%; https://taiyangnews.info/markets/cpia-china-h1-2026-solar-pv-istallations-drop-66-percent-yoy) widen the deflator gap, LR 0.7.
  - The Hormuz importer hit, LR 0.9 (transient).
  - Dollar softening, LR 1.2.
  - 0.11 x 0.7 x 0.9 x 1.2 = 0.084, so **8%**.
- **Q6** prior A22 / B12 / C24 / D42, updated jointly:
  - A x2: the same rate signal, with CBO's long-term outlook at 5.7% of GDP in FY2046.
  - B x1.0: fast-electrification upside offset by BNEF cutting its EV outlook.
  - C x0.7: high real yields plus an upward r* drift.
  - D x1.
  - That gives 44 / 12 / 16.8 / 42 = 114.8, which normalises to **38 / 11 / 15 / 36**.

```json
{
  "lens": "bayes",
  "bluf": "Most energy-lens signals carry likelihood ratios under 2:1, so they barely move the outside-view priors (Q1 44, Q5 8). The one signal worth more than 2:1 is US nominal rates sitting 60-90bp above CBO's assumed path. Counted once per question, it lifts Q4 from 25 to 45 and regime A from 22 to 38.",
  "q1": 44,
  "q2": {"p10": 8.5, "p50": 11.3, "p90": 14.6},
  "q3": {"p10": 0.9, "p50": 2.25, "p90": 3.4},
  "q4": 45,
  "q5": 8,
  "q6": {"A": 38, "B": 11, "C": 15, "D": 36},
  "key_drivers": ["10y at ~5.0% vs CBO path 4.1-4.4% (LR 2.5)", "China export/PPI deflation widens deflator gap", "structural fuel-trade displacement (weak LR 1.3)", "AI-driven digital services growth plus upward vintage revisions"],
  "sources": ["https://www.crfb.org/papers/cbos-february-2026-budget-and-economic-outlook", "https://tradingeconomics.com/united-states/government-bond-yield/news/505912", "https://www.iea.org/reports/world-energy-investment-2026", "https://taiyangnews.info/markets/cpia-china-h1-2026-solar-pv-istallations-drop-66-percent-yoy", "https://www.cbo.gov/publication/62207"],
  "caveats": ["NY Fed HLW r* figures are a secondary report, not confirmed on the NY Fed page", "WTO Q2 computer-services growth is 'estimated'; WTO figures came via secondary press", "Flagged weak (LR < 2): Q1 fuel displacement, China deflation, digital services, oil-shock signals; only the rate-gap signal exceeds 2:1"]
}
```