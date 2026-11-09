# Seat E4-signals (effort E4 gdp-divergence, lens: signals)

**BLUF.** Today's telemetry is a hot but narrow AI-goods and US-productivity upswing on top of structural gauges that have not moved: the IMF's October 2026 path holds US+China at 42.4% of world dollar GDP and the EU at 16.7% in 2031, and HLW r* sits at 0.73%. So Q5 is 3%, Q6 is mostly B (67), and C4's median is 2.35% a year.

## Reasoning (current telemetry only)

**C4 / Q6.** WDI (updated 2026-10-08) puts the aggregate's 2025 growth at 2.65% ($38,755 to $39,783 per head, my arithmetic), the upper half of the 2.15-2.85% decade range (https://api.worldbank.org/v2/country/OED;CHN/indicator/NY.GDP.MKTP.PP.KD?date=2005:2025&format=json). US nonfarm productivity rose 3.6% annualized in Q3 2026, 2.1% y/y, 2.2% a year since 2019Q4 against 1.5% in 2007-19; but BLS says the third estimate "has differed from the first estimate by -1.1 to +1.4 percentage points about 80 percent of the time", manufacturing productivity is +0.4% y/y, and 2.2% only equals the post-1947 average (https://www.bls.gov/news.release/archives/prod2_11052026.htm). China grew 4.5% y/y in Q3, 4.6% year-to-date (https://www.stats.gov.cn/english/PressRelease/202610/t20261021_1965671.html); the euro-area flash, on 19 member states covering 96% of its GDP, was 0.4% q/q and 1.3% y/y (https://ec.europa.eu/eurostat/product?code=2-30102026-ap). The IMF's October WEO, read through an extraction tool and not line-checked, has a strong-AI scenario lifting global TFP 0.8% over ten years, and says a faster build-out "could increase world GDP by 0.6 percent by 2029" (https://www.imf.org/-/media/files/publications/weo/2026/october/english/ch1.pdf). The best-known latitude-based damage panel was retracted in December 2025: the authors' reanalysis moves the 2050 income loss from 19.0% to 17.0%, while a critic's rerun without Uzbekistan reportedly gives 6% (secondary: https://retractionwatch.com/2025/12/03/authors-retract-nature-paper-projecting-high-costs-of-climate-change), too unstable to move a 2045 number. Net: a 2.6-2.7% run-rate with China decelerating gives C4 a 2.35% median, g (2036-45) about 2.2%, and P(g >= 2.5%) 27%.

G7 CPI ran 3.5% y/y in September 2026 (OECD 4.5%), with energy accounting for around half or more of that month's rise in five G7 members (https://www.oecd.org/en/data/insights/statistical-releases/2026/11/consumer-prices-updated-6-november-2026.html): an energy spike, not a 2036-45 reading. My lookups surfaced no G7 sovereign in restructuring or IMF talks (not an exhaustive search), so C = 8 and A = 25.

**Q5.** IMF DataMapper `NGDPD` (https://www.imf.org/external/datamapper/api/v1/NGDPD): US+China 42.61% (2025), 42.33% (2026), 42.37% (2031); EU 17.97%, 17.82%, 16.71%. China's dollar GDP rises 9.8% in 2026, so a currency and price tailwind is already inside a flat sum. The legs need +7.6 and -5.2 points in the fourteen years after 2031. Marginals 6% and 12%, P(EU leg | US+China leg) about 0.5: 3%.

**C1 / Q1.** WTO's 3.9/2.6 and 4.1/2.9 start the window near 1.45x. AI-enabling goods were 47% of H1 2026 trade growth, up 67% y/y, in a category the WTO describes as about twice as geographically concentrated as merchandise trade; the forecast assumes AI investment continues (press and executive summary of https://www.wto.org/english/res_e/publications_e/global-trade-outlook-and-statistics_e.htm, not the full report). E < 0.75 then needs about 0.67x for eighteen years: 19%. Composite above 42% given that: 0.5, mildly positive correlation since weak goods volume raises the services share. Q1 = 9.

**C2 / Q2.** HLW has not followed bond yields: composite 0.73% with Treasury yields the highest since about 2002. The NY Fed states the estimates are "not official forecasts" (https://www.newyorkfed.org/research/policy/rstar). Median 1.0%, Q2 = 6.

**C3 / Q4.** DataMapper `GGXWDG_NGDP` (https://www.imf.org/external/datamapper/api/v1/GGXWDG_NGDP): advanced economies 108.2 (2025), 107.8 (2026), 115.2 (2031), up 1.7 points in the last year; 2031 has the US at 145.0, Japan 188.9, Italy 135.6, France 123.6. That slope plus one crisis step gives a 131 median. Only Japan and, from 2030, the US clear 140%. The BoJ left yield control in 2024 and is tightening; I found no automation-tax bill (thin sources; absence of evidence). Q4 = 2.

**Q3.** Observed markers are 0.2-0.3% of GDP. The only official multi-country figure I found bundles climate adaptation with pensions, health, infrastructure and security at 3-4% of GDP a year (IMF paper, from a search summary; the page returned HTTP 429). Q3 = 3.

## Resolution audit

Re-verified from the primary source: the (P) OECD + China row reproduces exactly from WDI vintage 2026-10-08 (2.48% and 2.58%; OECD 1.16/1.41; China 7.15/5.37; 2025 levels $76.49T and 1,402.2M, $35.26T and 1,406.6M), using the `OED` aggregate, not the country-by-country sum the lock requires. The (S) world nominal GDP row matches IMF DataMapper `NGDPD`: world 128,003.8, US 32,642.4 (25.50%), China 21,546.4 (16.83%), Germany 5,471.3; France, Italy, Spain, Netherlands and Poland were not checked, and the API states no vintage (inferred as October 2026 from the match). The orchestrator's EU-27 estimate holds: the IMF's EU aggregate is 22,806.2, or 17.82%. Debt rows: 115.2 (2031), US 145.0, Italy 137.9 (2026), France 123.6, Japan 188.9, UK 102.1 and Germany 62.7-64.6 all match, but three items do not. The current vintage has advanced economies at 108.2 (2025) and 107.8 (2026), not the October 2025 vintage's 110.1 and 110.9, so the within-vintage rise to 2031 is 7.0 points, not 5.1. The US 2025 figure is 124.4; the row's 123.9 equals the G7 aggregate for 2026 in this file. Canada is 113.6 (2025) and 115.6 (2026), not "about 110". Not re-verified: the HLW values (the NY Fed page shows them only in charts and files; its schedule confirms the 28 August 2026 release as latest, next 27 November), and a press item quoting "1.65% for Q2 2026" is probably the LW model, so the resolver must read the HLW one-sided file. Resolvers that need care: Q5's EU-27 must be summed by country if membership changes, because the IMF's EU aggregate follows current membership. C4 and Q6's g rest on a WDI PPP series now in constant 2021 international dollars; a later ICP rebasing changes China's weight, so the growth rate is vintage-dependent even under the one-vintage rule. Q1(ii) mixes bases: the AI-goods share is published against merchandise trade, the threshold against goods plus commercial services. Q3 has no official estimate under the locked accounting and the bundled IMF figure cannot resolve it; cancellation is the likeliest outcome. Coherence checked: Q1 9 <= P(C1 < 0.75) 19; C2 P90 1.8 is below 2.00 and Q2 is 6; Q6-A 25 <= P(g >= 2.5%) 27, with C4's 2.35% median the blend of about 2.5% (2026-35) and 2.2% (2036-45); Q4 counts only countries above 140% on my C3 path.

```json
{"c1": {"p10": 0.66, "p50": 0.95, "p90": 1.25},
 "q1": 9,
 "c2": {"p10": 0.35, "p50": 1.0, "p90": 1.8},
 "q2": 6,
 "c3": {"p10": 114, "p50": 131, "p90": 155},
 "q3": 3,
 "q4": 2,
 "c4": {"p10": 1.75, "p50": 2.35, "p90": 2.9},
 "q5": 3,
 "q6": {"A": 25, "B": 67, "C": 8}}
```
