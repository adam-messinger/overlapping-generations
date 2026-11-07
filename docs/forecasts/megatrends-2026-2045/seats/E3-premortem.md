**BLUF:** The Wave-1 panel's shared mistake is reading the 2026 snapshot through a Goodhart-Pradhan lens, where an ageing population draws down its saving and makes capital scarce. Three things cut against that lens. Older populations hold more wealth, which raises asset demand. China's yuan is rising and its deflation is fading. And Q6's order hides a trap: real fiscal dominance holds down measured interest. I keep Q4 above even because the fiscal news since February has been bad. But I fatten Q3's low tail, raise Q5 and move Q6 weight toward C.

**Reasoning (premortem / red team):**

**Shared assumption: ageing leaves real rates flat or pushes them up.**
- The fermi seat reads a 2.1pp fall in the model's saving *propensity* as capital scarcity. The signals seat calls fiscal pressure "currently stronger". The outside-view seat lets yields fall back only to 1.5.
- All three use the flow view of saving. In the stock view, older people hold more wealth, so asset demand rises. Auclert, Malmberg, Rognlie and Straub put the effect at about 200% of GDP by 2100 (https://www.kansascityfed.org/documents/11206/AMRS_Jackson_Hole_Final.pdf). Their 250%-of-GDP debt result is a conditional scenario, not a forecast.
- The simulation cannot represent the stock view. It has no current accounts, so China's $1.2T surplus cannot export saving (https://www.chathamhouse.org/2026/01/chinas-12-trillion-trade-surplus-will-increase-calls-stronger-renminbi-dont-expect-much). It has no QE and no financial repression. Interest is tax-financed by construction. Its demography is UN-WPP-low, which is deeper ageing than the medium variant.
- So the rate change that is "positive in every run" is a product of the model's setup, not evidence. Using it to cut C to 11 is not valid.

**Biases found:**
- **Anchoring on a spike.** The 10-year TIPS yield was 1.84% at the Nov-2025 auction (https://tipswatch.com/2025/11/20/10-year-tips-reopening-auction-gets-real-yield-of-1-843-to-lukewarm-demand/) and 2.9% in Oct-2026, after a war shock.
- **Scope insensitivity.** The fermi seat's Q3 80% band is 2.0pp wide. That is narrower than the 2012-26 range of annual averages, roughly -1 to 2.9.
- **One formula, three answers.** All three Q2 medians are 10.8, from the same compounding rate. Nobody noticed the drag: AI can replace the offshored IT and BPO exports that the series measures.
- **Stale assumption on Q5.** China's deflator was turning positive in 2026, and the yuan rose about 6% to around 6.72 by August under "substantial appreciation pressure" (https://www.cfr.org/blog/chinas-currency-now-facing-substantial-appreciation-pressure). Japan's yen in 1985-95 shows a currency move alone can close a 15% gap.
- **Regime-bound track record.** The record that CBO overestimates interest comes from the 1990-2020 era of falling rates. Since February, 2026 tariff collections are running "about $250 billion, or 60 percent, below" CBO's projection (https://www.cbo.gov/publication/62704).
- **Label trap in Q6.** Fiscal dominance of the 1940s kind caps yields, which lowers measured interest. That world resolves C, not A.

**Premortem, high tail (about 30%).** The IEEPA tariff revenue is never replaced. The 2032 trust-fund gap is paid from general revenue. The term premium rises as Japanese and Chinese official holders sell. TIPS run above 3.5% and net interest reaches 6.5% of GDP by 2045.

**Premortem, low tail (about 22%).** AI capex busts around 2030. China exports its saving and its deflation. Boomer wealth sits in bonds. A 2033-34 recession brings Fed cuts. TIPS average about 0.5% in 2035 and stay at or below 1% in the 2040s. Net interest stays below 4.5% of GDP even with higher debt.

```json
{
  "lens": "premortem",
  "bluf": "Wave 1 shares a flow view of ageing (people draw down saving, capital gets scarce) and anchors on a war-spiked 2026. Ageing raises wealth and asset demand, China's yuan is rising and its deflation is fading, and the Q6 order means real fiscal dominance (yield caps) resolves C, not A. Q4 stays above even on post-February fiscal news; Q3's low tail is fatter, Q5 is higher and C gains weight.",
  "q1": 52,
  "q2": {"p10": 7.3, "p50": 10.9, "p90": 16.0},
  "q3": {"p10": 0.5, "p50": 2.1, "p90": 3.6},
  "q4": 58,
  "q5": 24,
  "q6": {"A": 38, "B": 12, "C": 22, "D": 28},
  "key_drivers": ["older savers raise asset demand (AMRS) vs Goodhart-Pradhan dissaving", "2026 TIPS spike is war and term premium, not r*", "yuan appreciation and China's deflator turning positive", "lost IEEPA tariff revenue vs recession and repression lowering measured interest"],
  "sources": ["https://www.kansascityfed.org/documents/11206/AMRS_Jackson_Hole_Final.pdf", "https://www.cbo.gov/publication/62704", "https://www.crfb.org/papers/cbos-february-2026-budget-and-economic-outlook", "https://tipswatch.com/2025/11/20/10-year-tips-reopening-auction-gets-real-yield-of-1-843-to-lukewarm-demand/", "https://tipswatch.com/2026/09/17/10-year-tips-reopening-gets-real-yield-of-2-653-highest-in-nearly-18-years/", "https://www.cfr.org/blog/chinas-currency-now-facing-substantial-appreciation-pressure", "https://www.chathamhouse.org/2026/01/chinas-12-trillion-trade-surplus-will-increase-calls-stronger-renminbi-dont-expect-much"],
  "caveats": ["AMRS's 250%-of-GDP debt result is a conditional scenario, not a forecast; Carvalho et al.: aging 'could, in principle, put either downward or upward pressure on r-star'", "CBO (Aug 2026): 2026 tariff and customs duty collections 'about $250 billion, or 60 percent, below its February projection'; Section 301 replacement tariffs face legal challenge", "China publishes no official GDP deflator; Q1-2026 estimates differ (KPMG -0.06%, China Daily about -0.1%)"]
}
```