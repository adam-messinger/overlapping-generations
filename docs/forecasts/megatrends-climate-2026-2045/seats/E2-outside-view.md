# E2-outside-view

**BLUF.** Base rates price 2036-2045 as continuation: composite r* about 0.65% (at least 2.00% only 6%), trade elasticity regressing up to about 1.1, advanced-economy debt about 137% of GDP and aggregate per-capita growth slowing to about 1.95%. Every "break" question (Q1, Q3, Q4, Q5) sits at 2-6%, and the residual regime B takes 76%.

## Reasoning (reference classes only)

**C2/Q2.** NY Fed HLW file ("All estimates are one-sided", final point 2026Q2; https://www.newyorkfed.org/medialibrary/media/research/economists/williams/data/Holston_Laubach_Williams_current_estimates.xlsx), my arithmetic: composite R decade means 3.12 (1976-85), 2.81, 2.75, 1.28, 0.93 (2016-25); latest 0.73. Horizon-matched class: over 140 origins 1972Q1-2006Q4, the 40-quarter mean starting 39 quarters ahead, minus the origin level, had median -0.72pp, P10 -1.98, P90 -0.15, maximum +0.15; the +1.27pp needed here: 0 of 140. Overlapping windows of one secular decline, effectively one or two independent observations. Realized rates (same file, US interest minus inflation) swing more (fallback-relevant): decade means 2.0 (1966-75), 4.5, 3.2, 2.3, -0.3, -0.4. Schmelzing 1311-2018 (https://www.bankofengland.co.uk/working-paper/2020/eight-centuries-of-global-real-interest-rates-r-g-and-the-suprasecular-decline-1311-2018): trend decline 0.6-1.6bp a year, quoted second-hand, not confirmed against the paper. Anchor on the current level: P50 0.65, Q2 6.

**C1.** Maddison export/GDP ratios 4.6% (1870), 7.9 (1913), 5.5 (1950), 10.5 (1973), 17.2 (1998) (via Crafts, https://typeset.io/pdf/globalisation-and-economic-growth-a-historical-perspective-7hfpayob1z.pdf) imply elasticities near 1.6, 0.5, 1.6, 1.7 (my arithmetic on recalled Maddison PPP-GDP growth, not re-verified). 1990-2008 averaged 2, "1:1 since 2012" (https://www.cesifo.org/DocDL/cesifo1_wp7228.pdf). 2008-2025 is about 0.85 and 2005-2025 about 1.0 (recalled WTO annual rates, unverified). One era in six fell below 0.75 (37 of 155 years). Eras correlate weakly, so regress from 1.0 toward 1.5; the WTO's 2026-27 forecasts imply 1.5 and 1.4. P(E<0.75) = 15%.

**Q1.** The composite gained roughly 8pp over 2005-2025 (recalled) and needs 2-5pp more; commodity shares swing 5pp within a decade. P(ii) 40%, assumed independent: 0.15 x 0.40 = 6.

**C3.** IMF historical database (https://www.imf.org/external/pubs/ft/fandd/2011/03/picture.htm): 45% (1880), 23% (1914), 80% (1932), "almost 150 percent of GDP in 1946", 70% (2000), "close to 100 percent" (2009). Twenty-year changes span about -100 to +75pp; every window since the mid-1970s rose (recalled WEO levels). Five-year projections ran about 10% of GDP low on 2007-2020 vintages, about 4% after controlling for growth forecast errors (https://www.imf.org/en/Blogs/Articles/2024/10/15/global-public-debt-is-probably-worse-than-it-looks, https://repec.cepr.org/repec/cpr/ceprdp/DP16108.pdf). So about 122 in 2031, then the fifty-year drift of 1.5pp a year: 137. P10 105: the one earlier episode above 100% ended in decline.

**Q3.** World catastrophe losses were 0.19% of GDP in 2018 against a ten-year average of 0.28% (https://www.segurostv.es/data/informes/sigma2_2019_en.pdf); insured losses grew 5.9% a year 1994-2023 against GDP 2.7% (https://www.swissre.com/institute/research/sigma-research/sigma-2024-01). Doubling relative to GDP leaves total losses, public and private, near 0.5%. Only universal entitlements and wars reached 1.5% of GDP within twenty years (recalled). Q3 = 2.

**Q4.** Explicit caps: Fed 1942-51, BoJ 2016-24, RBA 2020-21 (https://conference.nber.org/conf_papers/f171253/f171253.pdf); never three G7 countries in one twenty-year window. New bases: VAT passed 2% of GDP; the largest carbon tax take (France, $8.4B in 2023, https://statista.com/statistics/1241742/carbon-tax-revenues-worldwide-by-selected-country) is about 0.3% of GDP. Japan 30%, US 15%, others at most 5%: Q4 = 2. My C3 median puts US debt above 140%, so cap rarity binds, not debt.

**C4.** WDI (https://data.worldbank.org/indicator/NY.GDP.MKTP.PP.KD), twenty-year windows: aggregate 2.20-2.55 (n=16), OECD 0.92-1.53, China 7.15-9.68. Korea, from China's 2025 level (reached 2000): 3.18% over twenty years, 2.24% in the second decade. Pritchett-Summers (https://www.nber.org/papers/w20573): 28 super-rapid episodes, median duration nine years, median next episode 2.1%. OECD 1.2 and China 3.2 give 1.95.

**Q5.** WDI (https://data.worldbank.org/indicator/NY.GDP.MKTP.CD), 46 twenty-year windows: US+China gained at least 7.7pp in 10, all China-takeoff windows; the EU lost at least 6pp in 14 but never the 35% of its share needed (worst -33%). 0.13 x 0.40 (positively correlated) = 5.

**Q6.** G7 GDP-weighted CPI (https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG): 18 of 57 ten-year windows averaged 4.0% or more, all with G7 per-capita growth at least 1.7%; the conjunction: 0 of 57. The UK and Italian stand-bys of 1977 ended three post-war decades of IMF facilities for European countries (https://www.globalcapital.com/article/28mssyp51jgqspxhhquct/ssa/old-money-goodbye-great-britain); none in five decades since. C = 18. P(g >= 2.5%) = 7%: it needs China near 4% at Korea's 2010 income. A = 6.

```json
{"c1": {"p10": 0.65, "p50": 1.10, "p90": 1.65},
 "q1": 6,
 "c2": {"p10": -0.3, "p50": 0.65, "p90": 1.7},
 "q2": 6,
 "c3": {"p10": 105, "p50": 137, "p90": 170},
 "q3": 2,
 "q4": 2,
 "c4": {"p10": 1.4, "p50": 1.95, "p90": 2.45},
 "q5": 5,
 "q6": {"A": 6, "B": 76, "C": 18}}
```
