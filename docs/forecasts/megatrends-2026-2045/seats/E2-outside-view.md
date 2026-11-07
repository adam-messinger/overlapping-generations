**BLUF:** The historical base rates lean against the scary outcomes. Since 1940, US net interest has never exceeded 3.2% of GDP, and CBO has usually overestimated its 10-year net-interest projections. No large economy that fell back from about 0.7 of US GDP has regained that level. Real yields as high as 2.9% have tended to fall back over the following decade. Trade/GDP has stalled since 2008, so Q1 is close to even but slightly below 50%.

**Reasoning (outside view only):**

- **Q1.** Class (a): 11-year changes in WDI world trade/GDP over 1960-2024. About 8 of 54 windows fell (~15-20%). Almost all of them end in the post-2008 plateau or the 1980s after the oil shock. The series ran from 25% in 1970 to a 61% peak in 2008, with 51.6-52.4 in 2020 ([indexmundi](https://www.indexmundi.com/facts/world/trade), [macrotrends](https://macrotrends.net/global-metrics/countries/WLD/%20monde/trade-gdp-ratio)). Class (b): treat the plateau since 2009 as stationary. Only about 4 of 16 years fell below 56.76. Among past technology investment booms, trade rose with railways and with ICT, and collapsed after electrification in the 1930s. Blended: 35%.
- **Q2.** Since 2005 the series has grown 8.1%/yr through 2022 ("almost four-fold"), and 6.9%/yr over 2005-2019 ([WTO dataset](https://data.wto.org/en/dataset/dideliveredservices), [UNCTAD](https://unctad.org/node/36989)). Rolling 10-year growth rates of about 5-9% applied to $5.26T give roughly 8.6-12.5. ICT services slowed after the 1990s boom, which argues against fat upper tails.
- **Q3.** Calendar averages of `DFII10` since 2003 range from about -0.9 to 2.3. A start near 2.9 is in the top tail of that range. Past investment-boom peaks (2000, 2007) were followed by real-yield declines of about 2pp within roughly 9 years. The spread of 9-year changes is about ±1.6pp.
- **Q4.** In 86 years of history the peak is 3.2% (1991, matched in FY2025) ([Cato](https://www.cato.org/blog/federal-interest-costs-1790-2033), [CBPP](https://www.cbpp.org/research/federal-budget/deficits-debt-and-interest)). CBO has "almost always overestimated" net interest ([CBO](https://cbo.gov/publication/59110)), though the error flipped sign after 2021 ([CBO testimony](https://www.cbo.gov/system/files/2024-01/59905-Testimony.pdf)). The 4.5% threshold sits on the CBO median, so the error asymmetry puts the probability at about 30%.
- **Q5.** Japan peaked at about 0.71 of US GDP in 1995 ($5.449T vs $7.664T) and never regained it ([Dupuy](https://dupuyinstitute.org/2018/10/23/where-did-japan-go/)). The EU and the USSR never regained theirs either: 0 of 3 recoveries within 14 years.
- **Q6.**
  - **A (fiscal dominance):** G7 IMF programmes occurred in every decade of 1950-79 and in none since 1977 ([GlobalCapital](https://www.globalcapital.com/article/28mssyp51jgqspxhhquct/ssa/old-money-goodbye-great-britain)). A Laplace estimate on the post-1980 record gives about 15% per decade. Net interest at or above 6% would be nearly double the all-time high.
  - **B (capex-led abundance):** About 3 of 9 five-year windows since 1980 averaged at least 3.75% world growth (PPP), and none of the last two did ([IMF](https://www.imf.org/-/media/files/publications/weo/2020/april/english/statsappendixa.pdf.md)).
  - **C (secular stagnation):** About 74% of `DFII10` windows qualify, but that sample is a single regime. Real-rate history back to 1960 gives about 25%.

```json
{
  "lens": "outside-view",
  "bluf": "The historical base rates lean against the scary outcomes. Since 1940, US net interest has never exceeded 3.2% of GDP, and CBO has usually overestimated its 10-year net-interest projections. No large economy that fell back from about 0.7 of US GDP has regained that level. Real yields as high as 2.9% have tended to fall back over the following decade. Trade/GDP has stalled since 2008, so Q1 is close to even but slightly below 50%.",
  "q1": 35,
  "q2": {"p10": 8.4, "p50": 10.3, "p90": 12.8},
  "q3": {"p10": 0.6, "p50": 1.9, "p90": 3.3},
  "q4": 30,
  "q5": 12,
  "q6": {"A": 25, "B": 16, "C": 27, "D": 32},
  "key_drivers": ["net interest has never exceeded 3.2% of GDP; CBO usually overestimates it", "no challenger that fell back from ~0.7 of US GDP regained it (0/3)", "real yields fall back after investment-boom peaks", "trade/GDP flat since 2008, only ~1 in 4 years below 56.8"],
  "sources": ["https://www.indexmundi.com/facts/world/trade", "https://data.wto.org/en/dataset/dideliveredservices", "https://unctad.org/node/36989", "https://www.cato.org/blog/federal-interest-costs-1790-2033", "https://www.cbpp.org/research/federal-budget/deficits-debt-and-interest", "https://cbo.gov/publication/59110", "https://www.cbo.gov/system/files/2024-01/59905-Testimony.pdf", "https://dupuyinstitute.org/2018/10/23/where-did-japan-go/", "https://www.globalcapital.com/article/28mssyp51jgqspxhhquct/ssa/old-money-goodbye-great-britain", "https://www.imf.org/-/media/files/publications/weo/2020/april/english/statsappendixa.pdf.md"],
  "caveats": ["CBO: net interest projections have been its least accurate outlay category, 'almost always overestimated' before 2021, but 2023 rates were 'higher than we anticipated in March 2022'", "WDI world trade/GDP values differ by vintage (2019: 56.33 vs 56.48; 2020: 51.62 vs 52.37); the year-by-year counts are from aggregators, not the WDI API", "The 2005-2025 digitally delivered services series has been revised upward between vintages; the 8.1%/yr (2005-2022) and 6.9%/yr (2005-2019) rates come from different vintages"]
}
```

`api.worldbank.org` and `www.indexmundi.com` are outside this session's allowed network domains, so the WDI year-by-year values could not be fetched directly. The Q1 and Q3 window counts come from search snippets plus recalled series values, not from the primary series.