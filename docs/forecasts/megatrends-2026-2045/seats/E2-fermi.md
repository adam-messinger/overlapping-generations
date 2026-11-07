**BLUF:** Splitting each question into AI-capex, growth, price and fiscal pieces gives this. Digital services exports roughly double to about $10.8T by 2035. The 10y TIPS yield settles near 2.3%, because an AI capex pull of about 2% of GDP is partly offset by mean reversion from the 2026 spike. US net interest is a coin flip around 4.5% of GDP. China reaching 75% of US nominal GDP is unlikely. The 2045 regime is mostly residual D or fiscal-dominance A, and AI-led abundance (B) needs about 0.7pp of extra world growth.

**Reasoning (Fermi decomposition, E2 lens)**

- **Q2.** Start at $5.26T. The trend is 7.1%/yr over the last decade ([UNCTAD](https://unctadstat.unctad.org/insights/theme/254); its "digitally deliverable" scope is wider than the WTO's). I add about +1pp/yr for AI compute and API exports and take off about -1pp/yr for data localisation, leaving 7.5%/yr. Arithmetic: 5.26 x 1.075^10 = 5.26 x 2.06 = 10.8. Tails: 5% gives 8.6, and a dollar or recession shock lowers that to about 8.0. 10.5% gives 14.3. I assume no correlation with the vintage revision.
- **Q1.** Trade/GDP of 56.8 splits into about 41 for goods and about 16 for services (services exports $9.56T / about $117T GDP, times 2) ([WTO](https://www.wto.org/english/news_e/news25_e/stat_07oct25_e.htm)).
  - Services: 16 x (1.07/1.05)^11 = 19.7, a gain of 3.7.
  - Goods: nominal goods trade lags GDP by 1pp/yr, so 41 x 0.99^11 = 36.7, a loss of 4.3.
  - Net about 56.2, a slight lean toward "below". The AI hardware boom (+15% value in H1 2026) works against that lean.
- **Q3.** I build it from an end-2026 level of about 2.4 (2.9 is the October spike).
  - Model run, read only as changes: baseline +0.15pp to 2035; AI-boom +0.19 (AI adds only about 0.04 by 2035 but about 0.64 by 2045); fiscal-stress +0.86.
  - So the P50 is about 2.4 + 0.15 - 0.25 (mean reversion), which is about 2.3.
  - P10 comes from an AI-capex bust (about 25% likely), which gives about 1.1. AI capex is about 1.8% of US GDP in 2026, rising to 2.8% by 2028 ([Goldman](https://www.goldmansachs.com/insights/articles/global-investment-is-forecast-to-exceed-1-trillion-in-2026)).
- **Q4.** Net interest is debt times the effective rate.
  - AI productivity adds about 0.3pp/yr, which takes debt from 118 to about 112 by 2035.
  - Rates come out at about 3.95%. That gives 112 x 3.95% = 4.4.
  - But today's 10y nominal (about 2.9 real + 2.3 breakeven) is above CBO's path, which adds about 0.3-0.6. Net, slightly above a coin flip.
  - The model shows AI barely moves world interest/GDP (+0.04), while deficits move it a lot (+2.3).
- **Q5.** China needs 0.75/0.65 = +15.4% relative, which is +1.6pp/yr over 9 years.
  - Real growth gap about +1.3pp; the model's directional reading is 3.66 - 2.25 = 1.4.
  - Deflator gap about -1.5pp. FX contributes 0.
  - Net about -0.2pp/yr, so the ratio sits at about 0.64. US export controls and AI capex tilt it toward the US.
- **Q6.**
  - **A** (35): 2045 debt about 140% x an effective rate of about 4.3% gives about 6.0%, so roughly a coin flip on the US leg. I put it a little below that because of AI-revenue upside, and add about 5% for a G7 default or IMF programme.
  - **B** (16): the identified model reading is 3.58% (baseline) and 3.90% (AI-boom). But the model's γ=0.55 useful-energy engine runs about 0.5pp above IMF's about 3.0-3.1% medium-term path, so I do not adopt it. B needs AI to add 0.7pp or more to world growth (about 20% likely), times 0.8 for "not A".
  - **C** (16): a yield of 1.00% or below is anti-correlated with A.
  - **D** (33): the residual.

**Specs I ran:** /tmp/claude-0/-home-user-overlapping-generations/9198d79d-6016-55eb-80d2-9521474b8288/scratchpad/panel/E2-a2/e2-a2-spec.json.

| Variant | Rate change 2026->2045 | World growth 2040->2045 |
|---|---|---|
| ai-boom + deficit 5% | +1.82pp | 3.72% |
| ai-stall + deficit 5% | +1.10pp | 3.39% |

So AI adds about 0.7pp to the rate by 2045. The AI-extreme variant failed: the ledger broke ("Godley account 'firms.deposits' cannot have a negative balance"), so it gives no reading.

```json
{
  "lens": "fermi",
  "bluf": "Splitting each question into AI-capex, growth, price and fiscal pieces gives this. Digital services exports roughly double to about $10.8T by 2035. The 10y TIPS yield settles near 2.3%, because an AI capex pull of about 2% of GDP is partly offset by mean reversion from the 2026 spike. US net interest is a coin flip around 4.5% of GDP. China reaching 75% of US nominal GDP is unlikely. The 2045 regime is mostly residual D or fiscal-dominance A, and AI-led abundance (B) needs about 0.7pp of extra world growth.",
  "q1": 57,
  "q2": {"p10": 8.0, "p50": 10.8, "p90": 14.3},
  "q3": {"p10": 1.1, "p50": 2.3, "p90": 3.3},
  "q4": 55,
  "q5": 14,
  "q6": {"A": 35, "B": 16, "C": 16, "D": 33},
  "key_drivers": ["AI capex ~2-3% of US GDP vs desired saving", "digital services 7.5%/yr nominal compounding", "China deflator gap offsets real growth gap", "model AI rate pull small by 2035, ~0.7pp by 2045"],
  "sources": ["https://www.goldmansachs.com/insights/articles/global-investment-is-forecast-to-exceed-1-trillion-in-2026", "https://unctadstat.unctad.org/insights/theme/254", "https://www.wto.org/english/news_e/news25_e/stat_07oct25_e.htm"],
  "caveats": ["UNCTAD's 'digitally deliverable' category is broader than the WTO's 'digitally delivered', so totals are not directly comparable", "Goldman: AI investment ~1.8% of US GDP in 2026 but only ~0.1pp of measured growth because much equipment is imported", "Model rate is an economy-wide real lending rate with no term premium; world-aggregate fiscal path; UN-WPP-low demography; AI-extreme variant failed the stock-flow ledger"]
}
```