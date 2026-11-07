**BLUF:** The base rates say inertia and mean reversion. Openness drifts sideways, so a 2035 trade/GDP below 2024 is a little less than a coin flip (42%). US net interest has never been above 3.2% of GDP, and CBO has almost always over-projected it, so Q4 is 25%. Large economies that peak against the US in dollar terms have not regained that peak, so Q5 is 10%. For 2045 the residual regime D (42%) leads, with C next (24%).

**Reasoning** (outside view only):

**Q1.** Two reference classes give different answers.
- Over 1960–2024, about 10 of 54 eleven-year changes in WDI world trade/GDP were negative, roughly 18% (https://data.worldbank.org/indicator/NE.TRD.GNFS.ZS). They cluster after the 1974–80 peak and after 2008.
- Since 2008 ("slowbalization"), 4 of the 6 eleven-year windows ending 2019–2024 fell, within a 52–62% band.
- The 1913–38 collapse, roughly halving the ratio, is a tail class.
- Adjustment for the baseline: 2024's 56.76 sits slightly below the post-2008 mean of about 57.5. Weighting the recent regime at about 2/3 gives 42.

**Q2.** WTO: exports of digitally delivered services grew "+375% since 2005", "8.1 per cent on an average per year between 2005 and 2022" (https://data.wto.org/en/dataset/dideliveredservices).
- New tradables usually slow after their first two decades. My central 10-year compound rate is 7.5% from $5.26T, which gives $10.8T.
- The lower decile of past 10-year windows, which absorbed 2009 and the 2015 dollar shock, is about 4.5% (giving $8.2T). The upper decile is about 10% (giving $13.6T).

**Q3.** I take two classes:
- DFII10 annual averages, 2003–2026: mean about 1.0%, range −1.0 to +2.9 (https://fred.stlouisfed.org/series/DFII10).
- The reconstructed US real 10-year yield since 1960: long-run mean about 1.8%.
- Persistence: an annual autoregressive coefficient of about 0.9 implies about 0.4 of today's ~2.7% gap from the mean survives 9 years. That gives about 2.0% central, with a 9-year spread of about ±1.2pp.
- After energy shocks the sign is mixed: real yields fell after 1973 and 2008 and rose after 2022.

**Q4.** Two classes:
- From 1940 to 2025, net interest exceeded 4.5% of GDP in 0 of 86 years; the peak was about 3.2% (https://www.cbo.gov/data/budget-economic-data).
- CBO 10-year error record: net interest is its least accurate outlay category, "which it has almost always overestimated… driven by CBO's overestimates of interest rates" (https://cbo.gov/publication/58613). 2023 broke that pattern: "Roughly $170 billion of the total underestimate resulted from" rates (https://www.cbo.gov/system/files/2024-01/59905-Testimony.pdf).
- The threshold is about CBO's own 2035 baseline, so the question is close to "does CBO under-project?", which is historically a minority outcome.

**Q5.** Peak-and-retreat episodes in the dollar-GDP ratio to the US: Japan (peak about 0.71 in 1995), the euro area (2008), the USSR, Brazil (2011), Russia (2013). None regained its peak within 15 years, a 0/5 record. China's ratio, 0.76 in 2021 and 0.65 now, falls in this class.

**Q6** (regimes in lexical order):
- **A, fiscal dominance:**
  - US net interest at or above 6%: never in history, though a straight-line extrapolation of CBO's path (3.2% in 2025 to 4.6% in 2036) reaches about 5.75% by 2045.
  - G7 restructuring or IMF arrangement: UK, Italy and France had IMF programmes in the 1950s–70s, but there have been none since 1980 (0 of 4.5 decades).
  - Combined: about 22.
- **B, capex-led abundance:** about 4 of 9 non-overlapping five-year blocks of IMF PPP world growth since 1980 averaged at least 3.75%, but none of the last two did. Taken as a probability conditional on not-A: 12.
- **C, secular stagnation:** about half of the rolling five-year DFII10 windows since 2003 averaged 1% or less, and about 30% over the longer reconstruction. Net of A worlds: 24.
- **D:** the residual, 42.

```json
{
  "lens": "outside-view",
  "bluf": "The base rates say inertia and mean reversion. Openness drifts sideways, so a 2035 trade/GDP below 2024 is a little less than a coin flip (42%). US net interest has never been above 3.2% of GDP, and CBO has almost always over-projected it, so Q4 is 25%. Large economies that peak against the US in dollar terms have not regained that peak, so Q5 is 10%. For 2045 the residual regime D (42%) leads, with C next (24%).",
  "q1": 42,
  "q2": {"p10": 8.2, "p50": 10.8, "p90": 13.6},
  "q3": {"p10": 0.7, "p50": 2.0, "p90": 3.2},
  "q4": 25,
  "q5": 10,
  "q6": {"A": 22, "B": 12, "C": 24, "D": 42},
  "key_drivers": ["post-2008 trade/GDP band 52-62%", "CBO net-interest over-projection bias 1984-2021", "0/5 peak-regain rate for USD-GDP catch-up episodes", "real-yield mean reversion (~0.4 persistence over 9y)"],
  "sources": ["https://data.worldbank.org/indicator/NE.TRD.GNFS.ZS", "https://data.wto.org/en/dataset/dideliveredservices", "https://fred.stlouisfed.org/series/DFII10", "https://cbo.gov/publication/58613", "https://www.cbo.gov/system/files/2024-01/59905-Testimony.pdf", "https://www.cbo.gov/data/budget-economic-data"],
  "caveats": ["CBO: net interest 'which it has almost always overestimated. Those misestimates have been driven by CBO's overestimates of interest rates' (1984-2021 evaluation); reversed in 2023", "WTO: digitally delivered services up '8.1 per cent on an average per year between 2005 and 2022'; UNCTAD's 'digitally deliverable' is a different, broader series", "DFII10 starts in 2003 (about 23 annual observations); the pre-2003 real-yield class is a reconstruction, not the resolving series"]
}
```