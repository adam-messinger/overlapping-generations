# E3-outside-view

**BLUF.** Base rates describe continuation, not a regime break: advanced-economy debt drifts up to about 132% of GDP, r* stays near 1%, trade elasticity sits near 1.1, and each tail outcome (three-country yield caps or automation taxes, a 1.5%-of-GDP climate line, US+China above half of world GDP) is under 10%. The one fat tail history supplies is a G7 credit event or IMF draw (16%), which every decade from the 1920s to the 1970s contained and none has since.

## Reasoning (outside view only)

**C1.** Era elasticities from Maddison's constant-price export/GDP ratios (4.6% 1870, 7.9% 1913, 5.5% 1950, 10.5% 1973, 17.2% 1998; read from a search-result table, source not opened) and his GDP growth: 1870-1913 1.6, 1913-50 0.47, 1950-73 1.57, 1973-98 1.66. WTO: "Historically, world merchandise trade volumes have grown around 1.5 times faster than world real GDP at market exchange rates", about 1:1 after the crisis (https://www.wto.org/english/res_e/statis_e/wts2017_e/wto_chapter_03_e.pdf). My arithmetic on annual WTO rates (recalled, unverified; 2025 = +4.6%, https://www.wto.org/english/news_e/news26_e/stat_08oct26_510_e.htm): 2008-2025 0.84, 2005-2025 1.00. One era in six sits below 0.75; the 2026-27 baseline (about 1.45) adds roughly 0.07. P(E < 0.75) = 12%.

**Q1.** The composite rose roughly 6-8 points over 2005-2025 (my estimate); fuels alone swing about 6 points of total trade per cycle. P(above 42% | low E) = 0.5, correlation assumed mildly positive. 0.12 x 0.5 = 6.

**C2/Q2.** Estimated r*: no ten-year window starting after 2001 reached 2.0%, and no 15-year span of HLW shows a 1.3-point rise (about 5%). Realized US real bill rates (recalled, unverified): of five low decades, two were followed one decade on by a decade at or above 2% (40%). Schmelzing finds "a trend decline between 0.6–1.6 basis points per annum" (https://www.bankofengland.co.uk/working-paper/2020/eight-centuries-of-global-real-interest-rates-r-g-and-the-suprasecular-decline-1311-2018). Weighting the resolver's own class 0.7: Q2 = 15.

**C3.** IMF history: 45% (1880), 29% (1913), 80% (1932), "almost 150 percent of GDP in 1946", 70% (2000), 122.0% (2020); no weighting stated (https://www.imf.org/external/pubs/ft/fandd/2011/03/picture.htm). About 60% of twenty-year windows rose (my estimate); 2000-2020 rose 52 points; the one start above 100% fell. Projection error: "Realized debt-to-GDP ratios five-years ahead can be 10 percentage points of GDP higher than projected on average" (https://www.imf.org/en/blogs/articles/2024/10/15/global-public-debt-is-probably-worse-than-it-looks; sample not described). CBO's sixth-year average absolute error is 7.1% of GDP, and its longer-term debt projections "have tended to be overestimates" (https://www.cbo.gov/publication/55234, https://www.cbo.gov/publication/60664; summaries, not opened). Extending 110.9 to 115.2 gives 127; bias and base rate lift the median to 132.

**Q3.** EU environmental-protection spending "remained relatively stable between 1995 and 2023, ranging between 0.7% and 0.8% of GDP" (https://ec.europa.eu/eurostat/statistics-explained/index.php/Government_expenditure_on_environmental_protection). Catastrophe losses were 0.19% of world GDP in 2018 against a ten-year 0.28%; the 5-7% real growth is insured losses only (https://www.swissre.com/institute/research/sigma-research/sigma-2025-01-natural-catastrophes-trend.html). 1.5% is seven times today's marker: 3.

**Q4.** Explicit caps in G7 history: the Fed 1942-51, where "neither the Fed nor the Treasury announced the policy upon implementation in March 1942, apart from the bill target" (https://www.chicagofed.org/publications/economic-perspectives/2021/2), and Japan 2016-24; never the ECB; never three countries in one twenty-year window. New bases: VAT passed 2% of GDP; carbon, transaction and digital taxes never did (Sweden's carbon tax is about 1% of tax revenue, not GDP: https://taxfoundation.org/research/all/global/sweden-carbon-tax-revenue-greenhouse-gas-emissions/). My C3 median leaves only the US, Japan and Italy plausibly above 140%, so all three must act: 2.

**C4.** Aggregate decades all 2.15-2.85%. Persistence of the parts gives 3.0%; regression to the mean ("averaged 2 percent with a standard deviation of 2 percent", https://www.nber.org/papers/w20573) with China at 3.2% gives 2.0%. Median 2.25; for 2036-45, 2.15 with P(g >= 2.5) = 24%.

**Q5.** US+China gained 10-12 points in two of six twenty-year windows since 1960, both one catch-up episode; an EU ratio of 0.65 matches only Japan after 1995 (shares recalled, unverified). 0.2 x 0.35 = 7.

**Q6.** The UK and Italian stand-bys of 1977 were "the last of three decades of post-war IMF facilities for European countries" (https://www.globalcapital.com/article/28mssyp51jgqspxhhquct/ssa/old-money-goodbye-great-britain). Six of twelve decades since 1900 held a G7 event, none of the last four (recalled): 16%. Decade inflation at or above 4% occurred in two of seven decades, g < 1% in none: 1%. A = 0.24 x 0.83 = 20.

```json
{"c1": {"p10": 0.72, "p50": 1.12, "p90": 1.65},
 "q1": 6,
 "c2": {"p10": -0.1, "p50": 0.9, "p90": 2.3},
 "q2": 15,
 "c3": {"p10": 103, "p50": 132, "p90": 163},
 "q3": 3,
 "q4": 2,
 "c4": {"p10": 1.65, "p50": 2.25, "p90": 2.8},
 "q5": 7,
 "q6": {"A": 20, "B": 63, "C": 17}}
```
