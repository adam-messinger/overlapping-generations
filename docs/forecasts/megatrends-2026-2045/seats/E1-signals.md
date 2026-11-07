**BLUF:** The 2026 data show oil demand falling (IEA: -2.6 mb/d in 2026), clean-energy capex at about twice fossil capex, and nominal trade values inflated by the Hormuz price shock. My lens therefore leans YES on Q1, which is nominal and so reflects fossil trade shrinking. It leans slightly YES on Q4, because rates sit above the CBO path, and NO on Q5, because China's cleantech overcapacity is pushing its prices down.

**Reasoning (signals lens):**
- **Fossil trade is shrinking and losing value.**
  - IEA OMR Oct-2026 puts 2026 demand at 102.4 mb/d against 105.0 in 2025, a fall of 2.6 mb/d (https://iea.org/reports/oil-market-report-october-2026). The war drives much of this, and the IEA still projects 104.4 mb/d for 2027.
  - Brent went from under $70 before the war to more than $119 in March, then to about $78 after the June accord (https://www.thenationalnews.com/business/2026/06/15/oil-slides-nearly-5-as-us-iran-deal-paves-way-for-hormuz-reopening/). The IEA flags a possible 2027 glut.
  - BNEF EVO2026 expects EVs at 27% of 2026 car sales, but it "cut its outlook for the second year running" (https://about.bnef.com/?p=1729).
- **Capex is front-loaded.** IEA WEI 2026 has $3.4T of total energy investment, of which $2.2T is clean, and $1.6T goes to power supply (https://www.iea.org/reports/world-energy-investment-2026/regional-dashboards).
- **Solar is the noisy signal.** China installed 72 GW in H1-2026, down 66% y/y (https://taiyangnews.info/markets/cpia-china-h1-2026-solar-pv-istallations-drop-66-percent-yoy). Global 2026 forecasts range from 584 to 612 GW, and the sources mix AC and DC bases. The China slump means falling prices and overcapacity, which is negative for China's dollar GDP (Q5).
- **Petrostates are under fiscal strain.** Saudi Arabia expects a 2026 deficit of SAR245bn, 4.9% of GDP. Its breakeven is $86.60/bbl per the IMF, or about $94 per Bloomberg once PIF spending is included (https://agsi.org/analysis/saudi-fiscal-deficit-to-be-larger-than-budgeted-in-2026/).
- **Minerals are tightening.** IEA GCMO 2026 reports lithium prices more than doubled between Jan-2025 and Apr-2026. China's controls are "suspended until November 2026" (https://www.iea.org/reports/global-critical-minerals-outlook-2026/executive-summary).
- **Trade.** WTO (8 Oct 2026) reports H1 merchandise value up 15% against volume up 3.5%, driven by fuel prices and AI hardware. Computer-services exports rose 18% in Q1 and an "estimated" 12% in Q2. I could not reach www.wto.org from this session because the host is not on the network allowlist, so these figures come from secondary press (https://www.wtnh.com/news/business/ap-business/ap-wto-raises-merchandise-trade-growth-forecast-to-3-9-as-ai-boom-offsets-hit-from-middle-east/amp/).

**Resolution audit:**
- **Q1** is a nominal ratio. Lower 2035 oil and gas prices and electrified imports cut the value of fuels in trade without any volume change, so this biases toward YES. The 2026 price spike will not affect the result. The 2024 base can be revised within the 2037 vintage.
- **Q2:** the WTO "digitally delivered" series is not UNCTAD's "digitally deliver*able*" series (56%, +7.1%/yr). Do not mix the two.
- **Q6-A:** it is unclear whether "IMF lending arrangement" covers precautionary lines.

**Numbers:**
- **Q2:** the 10-year average growth rate of 7.1% gives about $10.4T, and the current growth of 10% or more gives about $13.6T. I lean high because of upward vintage revisions.
- **Q3:** front-loaded grid and storage capex plus energy-shock term premia keep the TIPS yield above 2%.
- **Q6:** A 33, B 9, C 16, D 42 (detail in the json below).

```json
{
  "lens": "signals",
  "bluf": "The 2026 data show oil demand falling (IEA: -2.6 mb/d in 2026), clean-energy capex at about twice fossil capex, and nominal trade values inflated by the Hormuz price shock. My lens therefore leans YES on Q1, which is nominal and so reflects fossil trade shrinking. It leans slightly YES on Q4, because rates sit above the CBO path, and NO on Q5, because China's cleantech overcapacity is pushing its prices down.",
  "q1": 63,
  "q2": {"p10": 8.4, "p50": 11.0, "p90": 14.5},
  "q3": {"p10": 1.3, "p50": 2.3, "p90": 3.2},
  "q4": 56,
  "q5": 22,
  "q6": {"A": 33, "B": 9, "C": 16, "D": 42},
  "key_drivers": ["fossil-fuel trade value displacement (nominal Q1)", "clean capex $2.2T front-loading real rates", "China cleantech overcapacity and deflation", "petrostate deficits at $78-90 Brent"],
  "sources": ["https://iea.org/reports/oil-market-report-october-2026", "https://www.iea.org/reports/world-energy-investment-2026/regional-dashboards", "https://about.bnef.com/?p=1729", "https://taiyangnews.info/markets/cpia-china-h1-2026-solar-pv-istallations-drop-66-percent-yoy", "https://agsi.org/analysis/saudi-fiscal-deficit-to-be-larger-than-budgeted-in-2026/", "https://www.iea.org/reports/global-critical-minerals-outlook-2026/executive-summary", "https://www.wtnh.com/news/business/ap-business/ap-wto-raises-merchandise-trade-growth-forecast-to-3-9-as-ai-boom-offsets-hit-from-middle-east/amp/", "https://www.thenationalnews.com/business/2026/06/15/oil-slides-nearly-5-as-us-iran-deal-paves-way-for-hormuz-reopening/"],
  "caveats": ["BNEF has reduced its long-term and short-term passenger EV adoption outlook for the second year in a row", "WTO Q2-2026 computer services growth is 'an estimated 12%'; WTO figures are from secondary press because www.wto.org was not reachable in this session", "Solar 2026 forecasts mix AC and DC bases and were revised downward over time (BNEF 649 -> 584 GW)"]
}
```