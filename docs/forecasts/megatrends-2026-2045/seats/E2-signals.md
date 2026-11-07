**BLUF:** Fresh telemetry shows an AI capex boom that is already large in the macro data: about 47% of H1-2026 goods-trade growth by value, roughly a third of US GDP growth, and a 10y TIPS yield near 2.9%. That leans toward higher openness by value, strong digital-services growth, elevated real rates and US net interest above baseline. Measured productivity has not yet broken out, which caps the odds of capex-led abundance (Q6-B).

**Reasoning (signals lens):**
- **Trade (Q1/Q2).** The WTO's 8 Oct 2026 outlook raised 2026 merchandise volume growth to 3.9% (from 1.9%) and 2027 to 4.1%. One secondary source says 4.7% for 2027, so that figure is unresolved. AI-enabling goods were 47% of H1-2026 growth in value terms, growing +67% y/y after +16% in 2024 and +31% in 2025 (https://www.wto.org/english/res_e/publications_e/global-trade-outlook-and-statistics_execsum_e.htm; https://www.wtnh.com/news/business/ap-business/ap-wto-raises-merchandise-trade-growth-forecast-to-3-9-as-ai-boom-offsets-hit-from-middle-east/amp/). The WTO's own caveat: "a slowdown or reversal of AI investment spending could also have a significant impact on trade given its high import content." The forecast assumes AI infrastructure spending rises at least 30% in 2026 and 10-20% in 2027. Digitally delivered services were $5.2589T in 2025, +10.0%, 55.0% of services exports (https://www.jetro.go.jp/world/gtir/2026/ch1/sec2/sub1/). Computer services rose +18% in Q1 2026 and an estimated +12% in Q2. That is secondary and covers only a subset of the category.
- **Rates and debt (Q3/Q4/Q6).** `DFII10` was 2.92% on 2 Oct 2026, and the term premium is about 0.98%, highest since 2014 (https://www.thetrading.tools/real-yields; https://tipswatch.com/2026/09/17/10-year-tips-reopening-gets-real-yield-of-2-653-highest-in-nearly-18-years/). Hyperscaler 2026 capex is $720-828B depending on scope. Microsoft's figure conflicts across sources ($170-190B). Every firm that commented signals more in 2027 (https://www.datacenterknowledge.com/data-center-construction/hyperscalers-say-ai-race-has-entered-a-new-phase). Fed staff put the AI buildout at about 0.73pp of Q1 growth (2.1% annualised), with computer imports subtracting 0.45pp (https://think.ing.com/opinions/how-much-is-ai-contributing-to-us-economic-growth/). A 5.2% nominal 10y (TIPS plus about 2.3% breakeven) sits above the rate path CBO assumed.
- **Productivity.** Nonfarm productivity was +1.4% annualised in Q2 2026 and +2.2% y/y, a 2.1% cycle average (https://www.bls.gov/news.release/archives/prod2_09032026.htm). The American Action Forum says six quarters "don't suggest AI has created a sea change."
- **Robots and China (Q5).** The IFR counts 603,307 installs in 2025 (+11%). China took 59% of them, and the EU fell 11% (https://ifr.org/img/worldrobotics/Executive_Summary_WR_2026_-_Industrial_Robots.pdf). BIS moved H200/MI325X exports to China to case-by-case review on 15 Jan 2026, with a 25% duty (https://media.bis.gov/press-release/department-commerce-revises-license-review-policy-semiconductors-exported-china). China's GDP deflator was -0.4 in 2024 and -0.7 in 2025 (IMF). The RMB was about 6.77 in mid-2026, up about 5% y/y. Deflation offsets the currency's gain, and US AI capex keeps US nominal growth high.

**Resolution audit:**
- **Q1:** AI-chip unit values raise trade/GDP with no change in volume.
- **Q6-B:** It names no WEO vintage for the 2041-45 average.
- **Q5:** A Chinese GDP census benchmark revision could shift the 2036 database discretely.
- **Q4:** It resolves on actuals published about Feb 2036.

```json
{
  "lens": "signals",
  "bluf": "Fresh telemetry shows an AI capex boom that is already large in the macro data: about 47% of H1-2026 goods-trade growth by value, roughly a third of US GDP growth, and a 10y TIPS yield near 2.9%. That leans toward higher openness by value, strong digital-services growth, elevated real rates and US net interest above baseline. Measured productivity has not yet broken out, which caps the odds of capex-led abundance (Q6-B).",
  "q1": 34,
  "q2": {"p10": 8.0, "p50": 11.5, "p90": 15.5},
  "q3": {"p10": 1.4, "p50": 2.4, "p90": 3.4},
  "q4": 62,
  "q5": 18,
  "q6": {"A": 32, "B": 14, "C": 12, "D": 42},
  "key_drivers": ["AI goods 47% of H1-2026 trade growth (value)", "DFII10 ~2.9%, term premium ~0.98%", "hyperscaler capex $720-828B, rising in 2027", "productivity 2.1% cycle avg, no AI break yet"],
  "sources": [
    "https://www.wto.org/english/res_e/publications_e/global-trade-outlook-and-statistics_execsum_e.htm",
    "https://www.jetro.go.jp/world/gtir/2026/ch1/sec2/sub1/",
    "https://www.thetrading.tools/real-yields",
    "https://tipswatch.com/2026/09/17/10-year-tips-reopening-gets-real-yield-of-2-653-highest-in-nearly-18-years/",
    "https://think.ing.com/opinions/how-much-is-ai-contributing-to-us-economic-growth/",
    "https://www.bls.gov/news.release/archives/prod2_09032026.htm",
    "https://ifr.org/img/worldrobotics/Executive_Summary_WR_2026_-_Industrial_Robots.pdf",
    "https://media.bis.gov/press-release/department-commerce-revises-license-review-policy-semiconductors-exported-china",
    "https://www.datacenterknowledge.com/data-center-construction/hyperscalers-say-ai-race-has-entered-a-new-phase"
  ],
  "caveats": [
    "WTO: a slowdown or reversal of AI investment spending could also have a significant impact on trade given its high import content; forecast assumes AI infrastructure spending up at least 30% in 2026 and 10-20% in 2027",
    "Fed staff: AI buildout about 0.73pp of Q1-2026 growth, but net imports of computers subtracted 0.45pp; ING says a third of growth on a broad definition, 44% on the narrow measure net of imports",
    "AAF: the past six quarters of data don't suggest AI has created a sea change in productivity growth; the computer-services +12% Q2-2026 figure is secondary and covers only a subset of the category"
  ]
}
```

Notes for the orchestrator: www.wto.org would not resolve from this session, so every WTO figure above comes from search snippets and secondary coverage, not the primary page. I found no November 2026 renminbi quote (latest about 6.77, July 2026) and no WEO October 2026 USD GDP figure for China, so the ~0.65 ratio in your baseline table is not re-verified.