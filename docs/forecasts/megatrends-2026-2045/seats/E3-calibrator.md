**BLUF:** Effort 3's final view: US net interest is more likely than not to reach 4.5% of GDP by FY2035 (59), and fiscal dominance is the largest single Q6 regime (A 40). China reaching 75% of US dollar GDP is unlikely but more plausible than the base rate (19), because the renminbi is appreciating. Ageing pushes real rates both ways, so Q3 stays wide around a median of about 2.15%.

**Reasoning (calibrator):**

**Two premortem claims checked and confirmed.**
- CBO puts 2026 tariff receipts about "$250 billion, or 60 percent, below" its February projection after the Supreme Court ruling ([CBO](https://www.cbo.gov/publication/62704)).
- The renminbi reached about 6.67 on 30 Oct 2026, up 6.2% y/y. The PBOC is resisting moves much beyond about 6.65 ([Trading Economics](https://tradingeconomics.com/china/currency/news/596627), [SCMP](https://www.scmp.com/economy/policy/article/3365461/china-keeps-yuan-check-pboc-resists-sharp-rise-against-weaker-us-dollar-analysts)).

**Q4.** CBO's own 2035 path sits at the threshold ([CRFB](https://www.crfb.org/papers/cbos-february-2026-budget-and-economic-outlook)). The outside-view seat's "almost always overestimated" record comes from an era of falling rates, so it is regime-bound and the premortem's hit on it is real. Since February, two adverse shocks have landed: real yields near 2.9% and the tariff shortfall. That gives 59. Fermi's 66 assumes rates and deficits move together almost perfectly.

**Q5.** The ratio needs about +15%. Bank forecasts of 6.5 by 2027 ([SCMP](https://www.scmp.com/economy/china-economy/article/3336453/chinas-currency-comeback-yuan-seen-strong-68-2026-breaking-key-dollar-level)) deliver about a third of that. The rest needs a renminbi near 6.0 or census revisions, against a workforce shrinking about 0.8%/yr. That gives 19.

**Q3.** The premortem's spike-anchoring point is a real hit: the November 2025 auction cleared at 1.84%. AMRS's stock-of-wealth effect ([KC Fed](https://www.kansascityfed.org/documents/11206/AMRS_Jackson_Hole_Final.pdf)) offsets the flow-saving view. Median 2.15.

**Q2.** The premortem's AI-replaces-BPO drag is posed, not quantified, and AI services are themselves digitally delivered. Median trimmed only to 10.6, with the band widened.

**Fermi audit.** Fermi correctly refused the model's 3.58% for regime B. On C, though, it let the model's "rate change positive in every run" cut C to 11. The model has no current accounts, no QE and no repression, and uses UN-WPP-low demography. Fermi is down-weighted on C.

**Coherence checks.**
- **Q4 vs A:** 0.59×0.57 + 0.41×0.11 gives about 38 for the US leg. The G7 leg adds about 4, and yield-cap repression worlds trim it, giving A = 40.
- **Q3 vs C:** Q3's P10 of 0.7 implies about a 13% chance that 2035 is at or below 1.0. Excluding A and B removes high-rate worlds, and repressed worlds resolve C, so C = 19.
- **Q2 vs Q1:** 10.6T adds about +3.2pp to trade/GDP. Goods intensity falling at its 2011-24 pace subtracts about 4pp. That gives 54.
- **Q6 sums:** 40 + 10 + 19 + 31 = 100, all entries non-negative.

```json
{
  "lens": "calibrator",
  "bluf": "Effort 3's final view: US net interest is more likely than not to reach 4.5% of GDP by FY2035 (59), and fiscal dominance is the largest single Q6 regime (A 40). China reaching 75% of US dollar GDP is unlikely but more plausible than the base rate (19), because the renminbi is appreciating. Ageing pushes real rates both ways, so Q3 stays wide around a median of about 2.15%.",
  "q1": 54,
  "q2": {"p10": 7.4, "p50": 10.6, "p90": 15.2},
  "q3": {"p10": 0.7, "p50": 2.15, "p90": 3.45},
  "q4": 59,
  "q5": 19,
  "q6": {"A": 40, "B": 10, "C": 19, "D": 31},
  "key_drivers": ["CBO 2035 baseline at threshold plus verified post-Feb rate and tariff-revenue shocks", "Ageing raises asset demand (stock view) against flow dissaving: r* direction ambiguous", "Renminbi appreciation under PBOC restraint vs China workforce decline", "Yield-capping repression resolves Q6-C, not A"],
  "sources": ["https://www.cbo.gov/publication/62704", "https://www.crfb.org/papers/cbos-february-2026-budget-and-economic-outlook", "https://tradingeconomics.com/china/currency/news/596627", "https://www.scmp.com/economy/policy/article/3365461/china-keeps-yuan-check-pboc-resists-sharp-rise-against-weaker-us-dollar-analysts", "https://www.kansascityfed.org/documents/11206/AMRS_Jackson_Hole_Final.pdf", "https://frbsf.org/wp-content/uploads/el2025-10.pdf", "https://www.pgpf.org/article/national-debt-projected-to-hit-175-gdp-interest-totals-99-trillion/"],
  "caveats": ["CBO: net interest was its least accurate outlay projection, 'which it has almost always overestimated' (record from a falling-rate era)", "Carvalho et al.: aging 'could, in principle, put either downward or upward pressure on r-star'; no published CI for the US demographic r* effect", "AMRS 250%-of-GDP debt result is a conditional scenario, not a forecast"],
  "downweighted": "outside-view on Q4 and Q6-A (its CBO-overestimation record is regime-bound, and it ignored that CBO's 2035 baseline sits at the threshold) and on Q5 (a reference class of n=4 ageing economies, none with a structurally undervalued, surplus currency); fermi on Q6-C (cut C to 11 from the sign of a model real-rate change that has no current accounts, QE or repression, on UN-WPP-low demography) and partly on Q4 (66 assumes near-perfect rate-deficit correlation); signals on Q5 (10 ignored the verified renminbi appreciation); bayes on Q5 (stale deflation likelihood ratio) and on Q4 (prior inherited from outside-view's regime-bound record); premortem on Q2 (the AI-BPO substitution drag was posed, not quantified; moved the median only 0.2) and slightly on Q5 (24 ignores PBOC resistance beyond about 6.65).",
  "wave_audit": "Wave 1 disagreed on Q4 (outside-view 30 vs fermi 66 / signals 61), Q6-A (22 vs 46/36), Q6-C (24 vs fermi 11) and Q5 (10-11 vs fermi 22). In Wave 2, bayes converted the single real signal (real yields above CBO's path) into Q4 51 and A 41. Premortem broke the shared flow-saving assumption, the regime-bound CBO track record, the stale China-deflation view and the A/C label trap; I verified its tariff and renminbi claims. Final numbers versus the outside-view base rates: Q1 crossed from 48 to 54 (small reversal); Q2 MODERATED (median 10.8 to 10.6, band widened); Q3 essentially held (median 2.2 to 2.15, P90 3.5 to 3.45); Q4 REVERSED (30 to 59); Q5 MODERATED toward 50 (11 to 19); Q6 AMPLIFIED A (22 to 40) and B's low (12 to 10), MODERATED C (24 to 19) and cut D (42 to 31).",
  "largest_update": "Q4 +29 versus outside-view (30 to 59). Cause: the outside-view seat's 'CBO almost always overestimates net interest' base rate comes from an era of falling rates (premortem's real hit), while CBO's own 2035 baseline already sits at the 4.5% threshold. Two adverse shocks have landed since February and are verified: real yields near 2.9% above CBO's rate path, and 2026 tariff receipts about $250B (60%) below projection."
}
```