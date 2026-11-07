**BLUF:** All three Wave-1 seats treat AI as a US-centred capex boom priced in a stable dollar. Under that frame, both AI tails stay narrow and the exchange rate drops out of every nominal question. Once the frame is broken, the bust tail is larger (35%, not 25%), the Q3 and Q2 bands widen in both directions, Q5 roughly doubles to 27%, and fiscal dominance (Q6-A) rises, because both AI tails damage the US budget.

**Reasoning (premortem lens)**

**The shared assumption.** All three seats hold the dollar, the price level and the "US wins AI" frame fixed. The fermi seat writes "FX contributes 0". The signals seat lets Chinese deflation offset the renminbi. The outside-view seat applies a "no recovery from 0.7" rule to a ratio that is mostly driven by the exchange rate; Japan's rise to 0.71 in 1985-95 was largely the yen.
- The renminbi is at about 6.65, its strongest since 2022 and up about 5% this year. The PBOC is slowing the rise, and September exports were +36% y/y ([TradingEconomics](https://tradingeconomics.com/china/currency/news/597478), [SCMP](https://scmp.com/economy/policy/article/3372944/yuan-fixing-trimmed-despite-four-year-high-offshore-beijing-manages-pace-appreciation)).
- Using fermi's own gaps (real growth +1.3, deflator -1.5) plus a +1%/yr FX drift gives a ratio of about 0.69. With a 9-year log standard deviation of about 0.16, P(ratio ≥ 0.75) is about 27%.

**Biases found.**
- **Scope insensitivity on Q3.** The outside-view seat's own figure for the spread of 9-year changes is ±1.6pp, yet the panel's 80% bands are only 1.9-2.7pp wide.
- **Anchoring on Q3.** All three medians (1.9-2.4) sit 0.5-1.0pp below a 2.9 spot, which is a bet against the forward curve. The outside-view seat's history covers a single falling-rate regime.
- **Narrative coherence on trade.** The signals seat reads "47% of trade growth is AI goods" as strength, but the WTO caveats that the same import content makes trade fragile.
- **Drag/pull asymmetry on Q4.** CBO's tariff offset (about $3T over the decade) was put in doubt by the Supreme Court ([Fortune](https://fortune.com/2026/02/21/cbo-national-debt-deficit-today-projections/?rand=8593)).

**The model's closure.** The simulation has no exchange rate or price level, fixes the labour share at 65.5%, and is a world aggregate in which interest is tax-financed by construction.
- Fermi's reading that AI adds +0.04 to world interest/GDP is therefore built into the model's structure; it is not evidence.
- The AI-extreme run broke the ledger, so the model has no support in the high tail at all.

**Premortem, low tail (35%).** It is 2036. The October 2026 cracks spread:
- Alphabet fell about 12% on capex, with free cash flow at -$9.1bn ([Trustnet](https://www.trustnet.com/news/13487548/tech-giants-earnings-round-up-markets-disappointed-as-ai-spend-starts-to-bite)).
- CoreWeave's 2031 notes traded near 79 cents.
- S&P expects negative free cash flow through 2027 ([fi-desk](https://www.fi-desk.com/ratings-analysis-hyperscaler-spending-rings-credit-alarm-bells/)).
- These meet the 2027-29 refinancing wall. Capex falls by 40-50%, as telecom capex did in 2001-02.

In that world, AI goods trade reverses, TIPS fall to about 1%, the dollar sags and the China/US ratio jumps. Deficits balloon, so Q4 is still close to a coin flip.

**Premortem, high tail (13%).** It is 2046. Agentic AI pushed US total factor productivity to 2.5-3% a year:
- Real rates rise to 3.5-4.5, digitally delivered services reach $18T or more, and the China/US ratio falls.
- The labour-share collapse hollows out payroll and income taxes, which feeds A, not only B.

```json
{
  "lens": "premortem",
  "bluf": "All three Wave-1 seats treat AI as a US-centred capex boom priced in a stable dollar, so both AI tails stay narrow and the exchange rate drops out of every nominal question. Breaking that frame raises the bust tail to 35%, widens Q3 and Q2 in both directions, roughly doubles Q5 via the renminbi, and lifts Q6-A because both AI tails damage the US budget.",
  "q1": 45,
  "q2": {"p10": 7.9, "p50": 11.2, "p90": 17.0},
  "q3": {"p10": 0.9, "p50": 2.3, "p90": 3.6},
  "q4": 54,
  "q5": 27,
  "q6": {"A": 42, "B": 13, "C": 15, "D": 30},
  "key_drivers": ["AI capex bust probability ~35% (2027-29 refinancing wall)", "FX/RMB drift omitted by all seats and by the model", "labour-share erosion of US tax base (model fixes it at 65.5%)", "tariff-revenue offset in CBO baseline at legal risk"],
  "sources": ["https://tradingeconomics.com/china/currency/news/597478", "https://scmp.com/economy/policy/article/3372944/yuan-fixing-trimmed-despite-four-year-high-offshore-beijing-manages-pace-appreciation", "https://fortune.com/2026/02/21/cbo-national-debt-deficit-today-projections/?rand=8593", "https://www.trustnet.com/news/13487548/tech-giants-earnings-round-up-markets-disappointed-as-ai-spend-starts-to-bite", "https://www.fi-desk.com/ratings-analysis-hyperscaler-spending-rings-credit-alarm-bells/", "https://letsdatascience.com/blog/coreweave-debt-60-percent-default-odds-104-billion-backlog", "https://tipswatch.com/2026/09/17/10-year-tips-reopening-gets-real-yield-of-2-653-highest-in-nearly-18-years/", "https://www.wto.org/english/res_e/publications_e/global-trade-outlook-and-statistics_execsum_e.htm"],
  "caveats": ["Meta's 30 Oct 2026 move conflicts across sources (flat per Trustnet vs -11.3% per Lloyds); CoreWeave bond prices come from a blog, not primary data", "No November 2026 DFII10 reading found; latest is 2.92% on 2 Oct 2026 from a secondary FRED tracker", "CBO publishes no 2035-specific net-interest share in the secondary coverage found (4.6% is for 2036); crfb.org and finimize.com were unreachable from this session"]
}
```