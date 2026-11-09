# Seat E1-bayes (trade-chokepoints, Bayesian updating)

**BLUF.** Almost no Wave-1 signal earns a likelihood ratio above 2:1, so the posteriors stay near the outside-view priors: P(E < 0.75) 22%, R >= 2% at 12%, debt median 135. The two real updates come from the errata's resolver readings (Q1's broad AI-goods aggregate, Q3's gross-level accounting), not from telemetry.

## Reasoning (Bayes only)

"(weak)" marks an LR I cannot justify above 2:1.

**C1.** Prior P(E<0.75) 24%, odds 0.316. The 2026-27 head start (3.9%/2.6%, 4.1%/2.9%, [WTO](https://www.wto.org/english/news_e/news26_e/stat_08oct26_510_e.htm)) is already in the outside-view prior: LR 1.0; the signals seat's 9% counts it twice. WTO's own 2010-2023 averages are 2.5% trade against 2.7% GDP, 0.93 ([GTO April 2024](https://www.wto.org/english/res_e/booksp_e/trade_outlook24_e.pdf), seen in a search summary), not the UNCTAD index's 0.68: 0.85 (weak). Resilience under tariffs and Hormuz, but narrow ("47% of global merchandise trade growth in value terms"; "A slowdown or reversal of AI investment spending could also have a significant impact on trade", [summary](https://www.wto.org/english/res_e/publications_e/global-trade-outlook-and-statistics_execsum_e.htm)): 0.9 (weak). US tariff 9.1%, fermi's -0.07pp/yr: 1.3. Chokepoints, -0.05pp/yr: 1.05. Oil plateau: 1.15. AI-goods weight doubled: 0.75. All four weak. Product 0.90; odds 0.285; **22%**. Upper tail trimmed (tariffs against a 1990-2008 rerun): 0.63/0.94/1.35.

**Q1.** Prior for limb (ii) given low E 45%, odds 0.82. Fermi's 33% baseline used the narrow aggregate the errata rules out: LR 1. Digitally delivered services rose from 13.8% (2023) to 14.5% (2024) to about 14.7% (2025) of goods-and-services exports (secondary citations of WTO data): 2.0, my only 2:1 signal. Broad composite "near 41%" in H1 2026 (the signals seat's arithmetic; WTO credits "higher prices for fuels and electronic components for data centres"): 1.3 (weak). Fuels and mining shrinking, share unverified: 0.8 (weak). Odds 1.70; 63%. 0.22 x 0.63 = **14**.

**C2/Q2.** Prior 8%, odds 0.087. Ten-year yield 5.3% peak, 4.85% now: 1.4 (weak; the HLW filter has not moved). LW 1.36 to 1.65, the wrong series: 1.1 (weak). US debt 124.4% to 145.0% by 2031: 1.05 (weak, correlated with yields). Fermi, adapter: 1.0. Odds 0.141; **12%**. -0.3/0.75/2.1.

**C3.** Prior P(>132) 50%. IMF path (108.2 to 115.2 by 2031; US +3.4 points a year) with forecasts erring low by "about 10% of GDP" "at the 5-year horizon": 1.5 (weak). April-to-October step-up, press only: 1.15 (weak). Fermi's 130: 0.95. Odds 1.64; 62%; median 135. P(<92): 10% at LR 0.5 (2031 anchor 115) gives 5%. 104/135/161.

**Q3.** Prior 3%, odds 0.031. Errata reading (gross level, not increment) plus fermi's 0.8% build-up, adding adaptation and revenue-loss lines the prior omitted: 2.5. Swiss Re H1 insured USD 42 billion, "below the trend estimate of USD 66 billion", but "58% of global insured natural catastrophe losses occur during the second half": 0.9 (weak). [OBR](https://obr.uk/frs/fiscal-risks-and-sustainability-july-2025/): about 0.7 points of primary deficit attributed to climate damage by the early 2070s (one secondary write-up, unconfirmed), risks "skewed to the downside": 0.9 (weak). Odds 0.063; **6%**.

**Q4.** Prior 2%, odds 0.0204. BoJ tightening: 0.85. Unenacted, unscored AI-tax bills: 1.1. US 140.7% in 2030: 1.2. Italy 135.6% in 2031, under the gate: 0.9. All weak. Product 1.01; **2%**. C3-consistent: only the US, Japan and marginally Italy clear 140%.

**C4.** Prior P(>2.1) 50%. Fermi's arithmetic (China 5.37% over 2015-25 against the prior's 3%): 1.3. AI capex cycle: 1.2. Tariffs, Gulf war: 0.9. All weak. Adapter's 2.95%, above every ten-year window since 1990: 1.0. Odds 1.40; 58%; median 2.2. 1.5/2.2/2.8.

**Q5.** Prior 4%, odds 0.042. Fermi's nominal path (sum 41.5%): 0.8. Its conditional EU limb (0.55 against 0.38): 1.3. Top-10 traders hold "around 85%" of AI-goods exports: 1.1. No drift in 2026 shares: 0.9. All weak. Product 1.03; **4%**.

**Q6.** P(g >= 2.5) prior 15%, odds 0.176; x 1.3 (fermi's g arithmetic) x 1.3 (AI trade share) x 0.9 (fragmentation), all weak, = 0.268; 21%. C prior 11%, odds 0.124; x 1.3 (2002-high yields, a decade early; weak) x 0.8 (errata: ESM-only rescues excluded) = 0.129; 11%. A = 0.21 x 0.92 = 19; B = 70.

Lookups read through a page-summarising tool.

```json
{"c1": {"p10": 0.63, "p50": 0.94, "p90": 1.35},
 "q1": 14,
 "c2": {"p10": -0.3, "p50": 0.75, "p90": 2.1},
 "q2": 12,
 "c3": {"p10": 104, "p50": 135, "p90": 161},
 "q3": 6,
 "q4": 2,
 "c4": {"p10": 1.5, "p50": 2.2, "p90": 2.8},
 "q5": 4,
 "q6": {"A": 19, "B": 70, "C": 11}}
```
