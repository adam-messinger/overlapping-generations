**BLUF:** Treating the Wave-1 outside-view numbers as priors, only one signal clears 2:1: the 10y nominal yield of about 5.2% against CBO's assumed 4.1-4.4%. Updating on it takes US net interest of 4.5% or more in FY2035 to a near coin flip (47%) and pushes fiscal dominance to the top of the 2045 regime list (A 37%). Every other signal is weak, and moves Q1, Q2, Q3 and Q5 only slightly.

**Reasoning (Bayesian likelihood-ratio updates):**

- **AI-capex cluster, counted once per question.** The cluster is AI goods driving 47% of H1-2026 trade growth, computer services up 12-18%, and capex at 1.8% of GDP rising toward 2.8%. These share one cause, so I did not stack them.
- **Q1.** Prior 35% (odds 0.54).
  - AI-goods and digital-services surge lifts the starting level: LR 0.75, weak.
  - China's export-price deflation (deflator -0.4/-0.7): LR 1.2, weak.
  - Tariff fragmentation: LR 1.2, weak.
  - 0.54 x 0.75 x 1.2 x 1.2 = 0.58, so **37%**.
- **Q2.** Prior P50 10.3.
  - 2025 grew +10.0% against a trend of about 7%; 2026 computer services are secondary and cover only a subset. That shifts the median up 0.5.
  - The WTO-UNCTAD series has been revised upward between vintages, so I skew up 0.2.
  - Median **11.0**, with a slightly fatter upper tail.
- **Q3.** Prior P50 1.9.
  - Term premium at 0.98%, highest since 2014, points to fiscal supply rather than cyclical pressure: +0.2.
  - HLW r* 1.36 to 1.65 is "not confirmed on NY Fed page": +0.1, weak.
  - AI capex adds only +0.05, because the fermi seat's model reads AI as worth about +0.04pp by 2035.
  - P50 **2.25**. The P10 of 0.9 reflects a capex bust.
- **Q4.** Prior 30% (odds 0.43).
  - Signal: the 10y nominal yield is about 5.2% (`DFII10` 2.92 on 2 Oct plus about 2.3 breakeven, [thetrading.tools](https://www.thetrading.tools/real-yields)). CBO assumes 4.1% in 2026 and 4.4% from 2031 ([CRFB](https://www.crfb.org/papers/cbos-february-2026-budget-and-economic-outlook), [CBO](https://www.cbo.gov/publication/62207)). Most of the debt reprices before 2035, so I set LR 1.9.
  - No productivity breakout yet (+1.4% in Q2, [BLS](https://www.bls.gov/news.release/archives/prod2_09032026.htm)): LR 1.1, weak.
  - 0.43 x 1.9 x 1.1 = 0.90, so **47%**.
- **Q5.** Prior 12% (odds 0.136).
  - Chinese deflation: LR 0.6.
  - Renminbi +5% y/y: LR 1.5, weak.
  - US AI capex lifting US nominal GDP: LR 0.85, weak.
  - 0.136 x 0.6 x 1.5 x 0.85 = 0.104, so **9%**.
- **Q6.** Prior A 25 / B 16 / C 27 / D 32, updated jointly then normalised.
  - A: the Q4 rate signal, diluted for the 2045 horizon, LR 1.4. The G7 leg gets LR 1.1, weak. Combined x1.54, giving 38.5.
  - B: AI capex (LR 1.2) against no measured productivity breakout (LR 0.85), roughly x1.0, giving 16.
  - C: real rates near 2.9% and rising r*: LR 0.6, giving 16.2.
  - D: x1, giving 32.
  - Normalised and rounded: **37 / 16 / 16 / 31**.

```json
{
  "lens": "bayes",
  "bluf": "Treating the Wave-1 outside-view numbers as priors, only one signal clears 2:1: the 10y nominal yield of about 5.2% against CBO's assumed 4.1-4.4%. Updating on it takes US net interest of 4.5% or more in FY2035 to a near coin flip (47%) and pushes fiscal dominance to the top of the 2045 regime list (A 37%). Every other signal is weak, and moves Q1, Q2, Q3 and Q5 only slightly.",
  "q1": 37,
  "q2": {"p10": 8.6, "p50": 11.0, "p90": 14.0},
  "q3": {"p10": 0.9, "p50": 2.25, "p90": 3.4},
  "q4": 47,
  "q5": 9,
  "q6": {"A": 37, "B": 16, "C": 16, "D": 31},
  "key_drivers": ["10y nominal ~5.2% vs CBO 4.1-4.4% path (LR 1.9)", "AI-capex signals share one cause, counted once per question", "China deflation offsets renminbi gain", "no measured productivity breakout caps B"],
  "sources": ["https://www.thetrading.tools/real-yields", "https://www.crfb.org/papers/cbos-february-2026-budget-and-economic-outlook", "https://www.cbo.gov/publication/62207", "https://www.bls.gov/news.release/archives/prod2_09032026.htm", "https://tipswatch.com/2026/09/17/10-year-tips-reopening-gets-real-yield-of-2-653-highest-in-nearly-18-years/", "https://www.jetro.go.jp/world/gtir/2026/ch1/sec2/sub1/"],
  "caveats": ["HLW r* figures are a secondary report; not confirmed on NY Fed page", "WTO figures are from search snippets and secondary coverage, not the primary page; computer-services growth is a secondary estimate covering only a subset of the category", "CBO publishes a 2036 net-interest figure (4.6%); no 2035-specific baseline figure was found"]
}
```