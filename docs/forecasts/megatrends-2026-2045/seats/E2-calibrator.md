**BLUF:** My effort-level posterior has five parts:
- US net interest reaching 4.5% of GDP in FY2035 is slightly more likely than not (54%).
- The 10y TIPS yield settles near 2.3% in 2035, with wider bands than Wave 1 gave.
- Digitally delivered services reach about $11T.
- The trade-openness question is close to even but leans No (43%), and China reaching 75% of US GDP stays unlikely (17%).
- For 2045, fiscal dominance (A, 38) overtakes secular stagnation (C, 14). The residual regime D is 34.

**Reasoning (calibrator)**

- **Q4.** I give the outside-view seat little weight here. Its 86-year record comes from years when debt was far lower than today. Its own source says CBO's tendency to overestimate interest "flipped sign after 2021". The signal that decides it is a 10y nominal yield of about 5.2% against the 4.1-4.4% CBO assumed ([CRFB](https://www.crfb.org/papers/cbos-february-2026-budget-and-economic-outlook), [real yields](https://www.thetrading.tools/real-yields)), with most debt repricing before 2035. The red team's tariff-offset point also counts ([Fortune](https://fortune.com/2026/02/21/cbo-national-debt-deficit-today-projections/?rand=8593)). I set 54 rather than signals' 62, because my own Q3 median implies the spike partly reverses.
- **Q3.** The red team landed two hits: its anchoring point (medians sit below spot) and its scope point (bands too narrow against the ±1.6pp spread of 9-year changes). I moved the median to 2.33, raised P10 to 0.95 and widened P90 to 3.62.
- **Q5.** The red team's FX hit is real: fermi's "FX contributes 0" is an assumption, not a finding ([renminbi](https://tradingeconomics.com/china/currency/news/597478)). Its +1%/yr appreciation drift is asserted, though, and China's deflation pulls the other way. I take about half of it and land at 17.
- **Q1.** The case for fermi's goods-lag figure depends on the start year. From 2012 to 2024 goods value lagged GDP by about 1pp/yr; from 2016 to 2024 it did not lag. I treat the plateau since 2015 (mean about 57.5) as stationary with a fragmentation drift, which gives 43.
- **Fermi model check.** The simulation was used as changes, not levels. Two caveats: the "AI adds +0.04 to interest/GDP" result is built into the model's closure and I give it zero weight; and its growth readings for regime B (3.58 baseline / 3.90 AI-boom) straddle 3.75, so I keep B at 14.
- **Red-team claim I did not move on.** "Both AI tails damage the budget" is posing. The high-AI tail raises growth and lowers debt/GDP, and a bust lowers rates.
- **Coherence checks:**
  - Q4→A: 0.54 x 0.55 + 0.46 x 0.12 is about 33 for the US leg, plus about 5 for the G7 leg, so 38.
  - Q3→C: with a 2035 P50 of 2.33 and P10 of 0.95, the chance of a 2041-45 average at or below 1.0 is about 18%. Taking out the overlap with A leaves 14.
  - Q2→Q1: a P50 of 11.1 adds about 2.6pp to trade/GDP from digital services alone, so a Yes needs goods trade/GDP to fall by more than that. Q1 therefore stays below 50.
  - Q6 sums to 100.
- **Spot-check:** I could not confirm a 2025 world value for WDI trade/GDP.

```json
{
  "lens": "calibrator",
  "bluf": "Effort posterior: US net interest >=4.5% of GDP in FY2035 is slightly more likely than not (54); 2035 TIPS ~2.3% with wide bands; digital services ~$11T; trade-openness decline near-even but leaning No (43); China reaching 75% of US GDP unlikely (17); fiscal dominance (38) displaces secular stagnation (14) in 2045.",
  "q1": 43,
  "q2": {"p10": 8.1, "p50": 11.1, "p90": 15.6},
  "q3": {"p10": 0.95, "p50": 2.33, "p90": 3.62},
  "q4": 54,
  "q5": 17,
  "q6": {"A": 38, "B": 14, "C": 14, "D": 34},
  "key_drivers": ["10y nominal ~5.2% vs CBO 4.1-4.4% path", "partial mean reversion of 2.9% real-yield spike", "RMB FX volatility dominates the China/US ratio", "AI capex fragility on both trade and rates"],
  "sources": ["https://www.crfb.org/papers/cbos-february-2026-budget-and-economic-outlook", "https://www.thetrading.tools/real-yields", "https://tradingeconomics.com/china/currency/news/597478", "https://fortune.com/2026/02/21/cbo-national-debt-deficit-today-projections/?rand=8593", "https://www.bls.gov/news.release/archives/prod2_09032026.htm", "https://www.jetro.go.jp/world/gtir/2026/ch1/sec2/sub1/"],
  "caveats": ["NY Fed HLW r* figures are a secondary report, 'not confirmed on NY Fed page'", "WTO: 'a slowdown or reversal of AI investment spending could also have a significant impact on trade given its high import content'", "IMF 2026 nominal US/China GDP figures via secondary press, unverified; WDI 2025 world trade/GDP not confirmed"],
  "downweighted": {
    "outside-view": "Q4 (86-yr history comes from low-debt years; its own CBO-error source flipped sign after 2021); Q6-C 27 (DFII10 windows come from one regime); Q3 P10 0.6 (too low given the 2.9 start)",
    "signals": "Q4 62 (treats the spot rate as persistent despite its own Q3 median of 2.4); Q6-D 42 (residual inflated without argument); Q1 34 (ignored the fragility caveat it quoted)",
    "fermi": "Q1 57 (goods-lag figure depends on start year: about 1pp/yr from 2012, about 0 from 2016); Q5 (FX=0 assumed); the model's +0.04 AI-to-interest reading is built into the closure, weight zero",
    "bayes": "Q5 9 (stacked a deflation LR of 0.6 and under-weighted FX volatility); Q3 used the model's +0.05 as evidence",
    "premortem": "Q6-A 'both AI tails feed A' is posing (high-AI growth lowers debt/GDP; a bust lowers rates); Q5 +1%/yr FX drift is asserted, so I took about half; Q2 P90 17 partly taken (15.6)"
  },
  "wave_audit": "Wave 1 split most sharply on Q1 (fermi 57 vs outside-view 35 / signals 34) and Q4 (outside-view 30 vs fermi 55 / signals 62). Wave 2: bayes took Q4 to 47 on a single 1.9 likelihood ratio from the yield gap; the premortem broke the stable-dollar frame (Q5 to 27), widened the Q2/Q3 tails and raised A to 42. Final numbers versus the outside-view base rates: Q1 MODERATED (35->43, toward even); Q2 AMPLIFIED upward (P50 10.3->11.1, P90 12.8->15.6); Q3 MODERATED its mean-reversion bet (P50 1.9->2.33, P10 0.6->0.95, P90 widened to 3.62); Q4 AMPLIFIED, lean reversed (30->54); Q5 MODERATED (12->17); Q6 AMPLIFIED A (25->38) and cut C (27->14), with B 16->14 and D 32->34.",
  "largest_update": "Q4 +24pp vs outside-view (30->54): the 10y nominal yield of about 5.2% sits above CBO's assumed 4.1-4.4% path while most debt reprices before FY2035, and the tariff-revenue offset is in doubt; the 86-year net-interest base rate is uninformative at debt above 100% of GDP. It drives the Q6-A increase (25->38) by coherence."
}
```