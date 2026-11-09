# Effort 4 (gdp-divergence) - Wave-2 handoff packet

Your own effort's earlier seats only. Other efforts are deliberately withheld.

## Seat: outside-view

**Numbers:** c1={'p10': 0.72, 'p50': 1.15, 'p90': 1.65} | q1=7 | c2={'p10': -0.2, 'p50': 0.85, 'p90': 2.0} | q2=10 | c3={'p10': 103, 'p50': 133, 'p90': 165} | q3=3 | q4=2 | c4={'p10': 1.2, 'p50': 1.8, 'p90': 2.5} | q5=6 | q6={'A': 10, 'B': 69, 'C': 21}

# Seat E4-outside-view (gdp-divergence, base rates only)

**BLUF.** Reference classes say continuity plus regression to the mean: trade grows about as fast as GDP (E 1.15), composite r* stays near 0.85%, advanced-economy debt drifts to about 133% of GDP, and OECD + China per-capita growth falls to about 1.8% a year as China reverts. Every tail question (Q1-Q5) is priced at 10% or below, and the residual regime B takes 69%.

## Reasoning

**C1.** Maddison's export/GDP ratios (WTO WTR 2013, Table B.1: 4.6% 1870, 7.9% 1913, 5.5% 1950, 10.5% 1973, 17.2% 1998; https://www.wto.org/english/res_e/booksp_e/wtr13-2b_e.pdf) with his GDP growth rates (recalled, not re-read) give era elasticities of about 1.6, 0.5, 1.6 and 1.7. WTO half-decades: "0.92" (1980-85), "2.32" (early 1990s), "1.66 between 2005 and 2011 (which is admittedly slightly longer than a half-decade)". 2008-2025 is about 0.96 and 2005-2025 about 1.10 (my arithmetic on recalled WTO annual rates; not published). One era in six fell below 0.75. The 2026-27 forecasts imply about 1.45. P(E < 0.75) = 12%.

**Q1.** The composite rose roughly 5-7 points over 2005-2025 (my estimate from recalled WTO components). P(> 42%) is about 50%, 55% given low E (assumed mild positive correlation): 0.12 x 0.55 = 7%.

**C2/Q2.** Jordà et al. (https://www.frbsf.org/wp-content/uploads/sites/4/wp2017-25.pdf): real bill return 0.98% (s.d. 6.01) over 1870-2015 and 0.87% (s.d. 3.43) post-1950, "Annual global returns in 16 countries, equally weighted. Period coverage differs across countries"; "Two four-decade-long declines in real rates stand out". Rogoff-Rossi-Schmelzing (https://www.nber.org/papers/w30475): a downward trend of "about 1.6 basis points per year", a pattern "not found in data covering the last 150 years" (NBER digest). Baseline: no HLW decade starting after 2001 averaged 2.0%. Anchor 0.85; Q2 = 10.

**C3.** IMF (https://www.imf.org/external/pubs/ft/fandd/2011/03/picture.htm): 45% (1880), 29% (1913), 80% (1932), "almost 150 percent of GDP in 1946", 70% (2000), "close to 100 percent in 2009"; group and weighting are not stated. Seven twenty-year blocks from 1885 (mid-century values recalled): -8, +35, +70, -90, +10, +20, +35; median +20, five of seven up. IMF: "realized debt-to-GDP ratios five-years ahead can be 10 percentage points of GDP higher than projected on average" (https://www.imf.org/en/Blogs/Articles/2024/10/15/global-public-debt-is-probably-worse-than-it-looks). 110 plus 20-25 gives 133.

**Q3.** Catastrophe losses are 0.2-0.3% of world GDP. Swiss Re's insured trend is "5-7% annually in real terms", exposure growth explaining "more than 80%" (https://www.swissre.com/institute/research/sigma-research/sigma-2025-01-natural-catastrophes-trend.html). That about doubles the GDP share by 2042; 1.5% needs sixfold. Only health and pension entitlements have grown that fast. 3%.

**Q4.** Explicit caps: Fed 1942-51, BoJ 2016-24, RBA 2020-21, and "the Fed announced only the bill target" (https://www.chicagofed.org/publications/economic-perspectives/2021/2), so one G7 case in 85 years fits the wording. No carbon, transaction or digital tax has reached 2% of GDP; VAT did. No twenty-year window held three. My C3 view leaves three or four G7 countries above 140%: eligibility is not the constraint. 2%.

**C4.** Pritchett-Summers (https://www.nber.org/system/files/working_papers/w20573/w20573.pdf): growth has "an average of 2 percent with a standard deviation of 2 percent"; adjacent-decade correlations 0.24-0.36 (N = 66-142); China 2023-33 predicted at 3.28%, "regression standard error of estimation is 1.6 percent"; after 70 rapid episodes "the median growth ... is 1.85 percent". Ten WDI economies at or past $25,000, China's 2025 level, then grew a median 1.7% (series starts 1990; windows of 13-20 years; Portugal, Turkey and Russia not read; https://api.worldbank.org/v2/country/KOR;JPN;ESP;PRT;GRC;POL;MYS;TUR;RUS;CHL;ARG;HUN;CZE;CHN/indicator/NY.GDP.PCAP.PP.KD?date=1990:2025&format=json&per_page=600). China at 2.5-2.85% and the OECD at 1.25%, on baseline weights and recalled UN population paths, give 1.72-1.84%.

**Q5.** WDI shares, eight twenty-year windows (https://api.worldbank.org/v2/country/USA;CHN;EUU;JPN;WLD/indicator/NY.GDP.MKTP.CD?date=1970:2025&format=json&per_page=400): US + China gained 7.7 points or more in three, all while China rose from under 5%. The EU's share of the remainder never fell more than 18%; 26% is required. 0.22 x 0.25 = 6%.

**Q6.** "The British and Italian standbys of 1977 were the last of three decades of post-war IMF facilities for European countries" (secondary: https://www.globalcapital.com/article/zttxgrmgkcmr/goodbye-great-britain). Four of eight decades since 1946 had a G7 event, none of the last four: limb one 18%. G7 CPI (my GDP-weighting of https://api.worldbank.org/v2/country/USA;JPN;DEU;GBR;FRA;ITA;CAN/indicator/FP.CPI.TOTL.ZG?date=1966:2025&format=json&per_page=500; US 2025 missing) averaged 4% or more in two of six decades, never with g < 1: limb two 4%. P(g >= 2.5%) is 13% (median 1.65%).

## Seat: fermi

**Numbers:** c1={'p10': 0.6, 'p50': 0.86, 'p90': 1.1} | q1=18 | c2={'p10': 0.2, 'p50': 1.03, 'p90': 1.85} | q2=7 | c3={'p10': 114, 'p50': 132, 'p90': 158} | q3=9 | q4=2 | c4={'p10': 1.35, 'p50': 2.03, 'p90': 2.8} | q5=3 | q6={'A': 19, 'B': 71, 'C': 10}

# E4-fermi

**BLUF.** Component arithmetic gives OECD+China per-capita growth of about 2.0%/yr for 2026-2045 and 1.9% for 2036-2045, under every ten-year window since 1990, because China's growth falls faster than its weight rises; the simulation's identified 2.95% is published here but not adopted. US+China would have to outgrow the rest of the world by about 1.6 pp a year in dollars for nineteen years to pass 50%, so Q5 is 3%.

## Reasoning

Adapter re-run 2026-11-09, identical to `adapter-output.md`. C1, Q1 and Q4 are **refused**: no model number used.

**C4 (identified).** Baseline GDP +2.622%, population −0.317%: 1.02622/0.99683−1 = 2.95%; runs span 2.64 (ssp3-70) to 3.99 (ai-energy-boom); un-wpp-medium 2.74, so demography is worth 0.21 pp. Not adopted: 2.95 tops every WDI window (2.15-2.85); the model's US (+2.90%) and OECD-ex-US (+2.25%) GDP run about 1 pp above IMF WEO October 2026 (US 1.8% by 2030-31), its China (+2.83%) matches my 2.9. Run-to-run differences kept.

- OECD per capita: productivity 1.1 + AI 0.3 − employment ratio 0.25 − climate and fragmentation 0.1 = 1.05; IMF-path reading 1.35; I use 1.2. OECD's own figure: "from the already meagre 1% per year in 2006‑19 to 0.6% per year in 2024‑60 on average", "if nothing is done" ([Employment Outlook 2025](https://www.oecd.org/en/publications/oecd-employment-outlook-2025_194a947b-en/full-report/component-6)). AI: OECD staff 0.25-0.6 pp a year of TFP; Acemoglu caps it at a "0.71% increase in total factor productivity" over ten years ([NBER w32487](https://www.nber.org/papers/w32487)); both static.
- China GDP: IMF 4.5, 4.0, 4.0, 3.7, 3.3, 3.3 for 2026-31 ([WEO](https://www.imf.org/external/datamapper/NGDP_RPCH@WEO)), fading to 2%: 2.9% average. Population −0.45%/yr: UN medium is 1.306B in 2045 (secondary site), but 2025 births were 7.92M and the TFR of "approximately 0.96" is an independent estimate, not NBS ([Caixin](https://www.caixinglobal.com/2026-01-19/chinas-population-decline-accelerates-as-births-hit-modern-era-low-in-2025-102405521.html)).
- 2025: 111.8/2,809 = $39.8k. 2045: 76.5×1.012^20×1.020 = 99.1; 35.3×1.029^20 = 62.5; 161.6/2,716 = $59.5k; **2.03%**. Component ranges 0.5-1.9 and 2.4-4.5, correlation 0.4: σ 0.55.

**Q6 (g identified).** Model: 1.02349/0.99546−1 = 2.82% (ssp3-70 2.47, ai-energy-boom 4.61); same objection. Mine: $49.2k in 2035 to $59.5k = 1.92%; σ 0.65 gives P(g≥2.5)=20%, P(g<1)=8%. C = credit events 8% (Italy 3, France 2.5, US and UK 1.5 each, Japan 1, less overlap) + P(π≥4) 12% × P(g<1|π) 20% = 10. A = 0.20×0.95 = 19. B = 71.

**Q5 (directional).** IMF NGDPD ([DataMapper](https://www.imf.org/external/datamapper/NGDPD@WEO)): US+China 30.0% (2008), 42.6% (2021), 42.3% (2026), 42.4% (2031); EU 25.3%, 17.8%, 17.8%, 16.7%. Passing 50% needs ln(50/42.33)/19 = 0.88%/yr against the world, about 1.6 pp against the rest; realised +1.3 over 2015-26, −0.2 over 2021-26, IMF 0.0 to 2031. Model: constant-price share 44.83→44.49, so real growth supplies no drift; prices and exchange rates must supply it all: P = 5.5%. EU reaches 14.0% on the IMF slope and 12.3% repeating 2008-26; a proportional squeeze with US+China at 50.5 leaves 12.0: P = 0.5. 0.055×0.5 = **3**.

**C1, Q1.** Volume to 2045, share×index: fuels and mining 0.15×0.94, AI goods 0.15×2.28, agriculture 0.10×1.43, other 0.60×1.47 = 1.51, 2.08%/yr; with the WTO's 3.9% and 4.1% for 2026-27, 2.20%. GDP 2.57%. E = **0.86**; P(E<0.75)=30%. Composite: digital services $5.26T×4.25 = 22.4, AI goods 12.8, fuels and mining 4.4, over 88.6 = 44.7%; from the baseline's 37% end, 42.5%: P = 0.6 given low E. Q1 = 0.30×0.60 = **18**.

**C2, Q2 (directional).** Model safe rate, 2036-45 mean less 2026: +0.04 pp, −0.13 to +0.51 across runs; sign and size only. HLW r*=g+z: 0.61×(2.0−0.6) + 0.34×(1.0−0.7) + 0.05×1.5 = **1.03**. R ≥ 2 needs US ≥ 2.7: 7%.

**C3 (directional).** Model world debt +8.4 pp (−4.1 to +73.6); sign only. US 143.5 (2031) + 14×1.9 = 170; others 93→100; 0.46×170 + 0.54×100 = **132**.

**Q3 (directional).** Model world damage 2.12% of GDP in 2040-45 (4.60-5.52 with high sensitivity), an output loss; ×0.35 tax share = 0.74. OBR: damage "could add 2.0 per cent of GDP to primary borrowing by the early 2070s" at "just below 3°C", adaptation "one important missing piece" ([OBR](https://obr.uk/frs/fiscal-risks-and-sustainability-july-2025/)). Revenue 0.3 + relief 0.3 + adaptation 0.2 = 0.8%: **9**.

**Q4.** Above 140% on my C3: Japan, US, Italy, France marginal. Yield-cap odds 0.25, 0.11, 0.04, 0.03; a 2% automation tax 1% each. Repression regime 10%×0.19 + 0.3% = **2**.

## Seat: signals

**Numbers:** c1={'p10': 0.66, 'p50': 0.95, 'p90': 1.25} | q1=9 | c2={'p10': 0.35, 'p50': 1.0, 'p90': 1.8} | q2=6 | c3={'p10': 114, 'p50': 131, 'p90': 155} | q3=3 | q4=2 | c4={'p10': 1.75, 'p50': 2.35, 'p90': 2.9} | q5=3 | q6={'A': 25, 'B': 67, 'C': 8}

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

## Seat: bayes

**Numbers:** c1={'p10': 0.65, 'p50': 1.07, 'p90': 1.5} | q1=10 | c2={'p10': 0.1, 'p50': 0.97, 'p90': 1.92} | q2=8 | c3={'p10': 109, 'p50': 134, 'p90': 164} | q3=5 | q4=2 | c4={'p10': 1.35, 'p50': 2.0, 'p90': 2.65} | q5=3 | q6={'A': 14, 'B': 71, 'C': 15}

# Seat E4-bayes (effort E4 gdp-divergence, lens: bayes)

**BLUF.** Only two signals earn a likelihood ratio of 2:1: a US + China dollar share that is flat from 2021 through the IMF's 2031 projection (against Q5) and the fermi build of the climate fiscal categories (for Q3); the IMF's China path comes close and lifts C4 from 1.8% to 2.0% a year. Every other ratio is weaker and flagged, so the posteriors stay near the outside view: Q5 3%, regime B 71%.

## Reasoning

O = odds; † = a ratio I cannot justify above 2:1. Six lookups confirmed the packet's IMF, BLS and WDI figures; the OECD CPI and Employment Outlook pages returned HTTP 403 (unverified).

**C4.** Prior 1.2/1.8/2.5: P(≥ 2.0) 35%, O 0.53. IMF China growth 4.5, 4.0, 4.0, 3.7, 3.3, 3.3 for 2026-31 (https://www.imf.org/external/datamapper/api/v1/NGDP_RPCH/CHN/USA), about 4.1% per head against the prior's 2.5-2.85%: 1.8†. US productivity 2.2% a year since 2019Q4 against 1.5%, though the third estimate "has differed from the first estimate by -1.1 to +1.4 percentage points about 80 percent of the time" and 2.2% equals the post-1947 average (https://www.bls.gov/news.release/archives/prod2_11052026.htm): 1.3†. OECD's 0.6% "if nothing is done": 0.8†. The 2.65% run-rate repeats the prior's decade, the simulation's 2.95% is rejected by its own seat, the damage panel is retracted: 1.0 each. O = 0.53 × 1.87 = 1.00, 50%: 1.35/**2.0**/2.65.

**Q6.** P(g ≥ 2.5) prior 13%, O 0.149; China path front-loaded 1.1†, productivity 1.3†, OECD 0.85†: O 0.182, **15.4%** (g median 1.73; with 2.27% for 2026-35 that averages C4's 2.0). Credit-event limb: prior 18%, O 0.22; fermi's 8% country build (own-currency issuers; the errata excludes ESM-only rescues) 0.6†; no G7 sovereign in talks, a decade early, 0.9†; US debt 145.0% by 2031 and a 5.3% ten-year peak 1.25†: O 0.148, 12.9%. Stagflation limb stays 4% (one energy-led CPI print: 1.0†). C = 12.9 + 4 − 1.5 overlap = **15**; A = 15.4 × 0.93 = **14**; B = **71**.

**Q5.** Leg one prior 22%, O 0.28. `NGDPD` (https://www.imf.org/external/datamapper/api/v1/NGDPD/USA/CHN/EU/WEOWORLD): US + China 42.6% (2021), 42.3% (2026), 42.4% (2031), against 0.54 points a year needed afterwards: 0.5. Fermi's flat constant-price share overlaps: 0.85†. China's +9.8% dollar GDP: 1.0†. O 0.12, 10.7%. Leg two given leg one: prior 25%, O 0.33. IMF's EU slope, 17.8% to 16.7%: 1.5†. But the same file has the EU at 18.0% in 2015, so the whole 2008-26 fall predates 2015 and fermi's "12.3 repeating 2008-26" replays the euro crisis: 0.7†. O 0.35, 26%. 0.107 × 0.26 = **3**.

**C1/Q1.** P(E < 0.75) prior 12%, O 0.136. WTO's 1.45x start, two years of twenty: 0.85†. AI goods 47% of H1 2026 trade growth, one concentrated category: 1.2†. Fermi's 0.86, built on assumed volume indices: 1.4†. O 0.195, **16.3%**; the same product moves P(E < 1.0) from 33% to 41%: 0.65/1.07/1.50. Composite above 42% given low E: prior 55%; the AI surge raises the start but is what reverses in that world, 1.2†: 59.5%. Q1 = 0.163 × 0.595 = **10**.

**C2/Q2.** Prior 10%, O 0.111. HLW at 0.73% has not followed yields: 0.8†. Fermi's g + z (R ≥ 2 needs US ≥ 2.7) overlaps the prior's "none after 2001": 0.85†. Productivity raises g: 1.2†. Model safe rate: 1.0†. O 0.091: **8**. P(R ≥ 1.0) 43% to 49% (1.2† × 1.15† × 0.9†); P(R < 0) 15% to 8% (0.6† × 0.8†): 0.10/0.97/1.92.

**C3.** The prior's "110 plus 20-25" used the superseded vintage; from 108.2 its median is 131: P(≥ 130) 52%, O 1.07. IMF's 115.2 in 2031 matches the prior's drift: 1.0. Rising US weight at +3.4 points a year: 1.1†. Yields: 1.15†. O 1.35, 57.5%: 109/**134**/164.

**Q4.** Prior 2%, O 0.0204. BoJ tightening 0.9†; yields, with the US at 140.7% in 2030, 1.3†; no automation-tax bill found (thin search) 1.0†. O 0.024: **2**. On my C3 only Japan and the US clear 140%; Italy (135.6%) is marginal.

**Q3.** Prior 3%, O 0.031. Fermi's build under the locked categories (0.3 + 0.3 + 0.2 = 0.8% of GDP), about half the threshold where the prior's scaling gave a third: 2.0. OBR dates its 2.0% to "the early 2070s": 0.9†. Signals' 0.2-0.3% markers: 0.9†. O 0.050: **5**.

## Seat: premortem

**Numbers:** c1={'p10': 0.58, 'p50': 0.92, 'p90': 1.32} | q1=13 | c2={'p10': -0.15, 'p50': 0.9, 'p90': 1.9} | q2=8 | c3={'p10': 110, 'p50': 135, 'p90': 163} | q3=7 | q4=3 | c4={'p10': 1.4, 'p50': 2.15, 'p90': 2.95} | q5=4 | q6={'A': 26, 'B': 61, 'C': 13}

# Seat E4-premortem (effort E4 gdp-divergence, lens: premortem)

**BLUF.** All three Wave-1 seats extended one official no-shock slope with China's scheduled fade as the only moving part, so their agreement is one anchor counted three times and both tails are thin. I keep the centre near theirs but take mass out of the residual regime (Q6: A 26, B 61, C 13; C4 from 1.4 to 2.95), while the consensus No on Q5, Q2 and Q4 survives the attack.

## Reasoning (premortem only)

**Shared assumption: smooth-slope continuity.** The three C3 medians (131, 132, 133) are the corrected IMF slope to the decimal: 108.2 + 20 x 7.0/6 = 131.5. Q5 rests on the IMF's flat 42.4%, C4 on the IMF's China path plus an unchanged OECD. A WEO path is a policies-unchanged, constant-real-exchange-rate projection, not a median, and every twenty-year window since 1970 holds a break.

**Anchoring and drag/pull asymmetry.** The brief's "2.15-2.85% in every window" became each seat's ceiling, though that band was an OECD slowdown offset by China's rising weight. The label "techno-abundance" made g >= 2.5% read as utopia; it is that band's midpoint. Fermi itemised drags (employment -0.25, climate -0.1) and gave AI a static +0.3.

**China.** The outside-view median (1.8%) needs Chinese GDP growth near 2.3% for twenty years, from 4.6% today, yet the resolver is the official series. Beijing's 2035 goal implies "average annual growth of at least 4.17% over the next decade" (Trivium's own calculation, not a number in the Proposals; 2020 dollars; https://triviumchina.com/?p=189785), against about 3.5% on my extension of fermi's IMF path. A requirement, not a forecast.

**Simulation closure.** The adapter's "identified" growth is world GDP times a renormalised regional share moved by hand-set residual-TFP wedges (`src/modules/demand.ts`); the US gets +2.90% because its wedge sits near the world average. China's +2.83% "matching" fermi's 2.9 is circular: that wedge was grid-fitted in 2026-11 to the same IMF path and an earlier panel's P50. The same allocator gave fermi's "no real drift" in Q5 (44.83 to 44.49); on the IMF real paths fermi quotes, the constant-price share falls to about 39% by 2045 (my arithmetic, world 2.7%), so prices and exchange rates must supply about 11 points, not 7.7. The safe rate is smoothed world growth plus 3.5 bp per debt point with z constant, so +0.04 pp is assumed; debt stabilises by an imposed Bohn reaction; DICE damage x 0.35 is no budget line.

**Strongest wrong world (20%): a US-China AI duopoly, the rest lagging.** There g >= 2.5% (0.85), US + China > 50% (0.4), R >= 2.00 (0.25). IMF `NGDPD` (https://www.imf.org/external/datamapper/api/v1/NGDPD, extraction tool): US + China outgrew the rest by about 1.5 points a year over 2000-2026 against 1.6 required, but on China's 12% dollar growth; the EU's share was flat over 2015-2026 (18.0%, 17.8%). Q5 = 0.10 x 0.4 = 4. HLW has not followed yields and may lapse to the realised-rate fallback (30%), which widens C2 both ways without lifting Q2 above 8.

**Opposite tail (20%): bust and sovereign stress.** A narrow capex boom (47% of H1 trade growth) unwinds, debt steps up, China's target lapses: C4 near 1.4, C3 above 160. Q6-C = credit events 11 (Italy 4, US technical default 3.5, France 2.5, UK and Japan 1.5 each, less overlap; ESM-only rescues excluded) + stagflation 2 = 13. Repression is the other debt tail, 110.

**Remaining.** g: centre 2.1, sigma 0.7, so P(g >= 2.5%) = 28. C1: P(E < 0.75) = 27; composite above 42% given that, 0.5 (the WTO's broad aggregate may not exist in 2046): Q1 = 13. Q3: two seats scaled private catastrophe losses; the errata's gross public level is near 0.35% of G7 GDP (my unverified estimate) and needs a fourfold rise: 7. Q4: one fiscal-dominance regime (12%) brings Japan, the US and a euro cap on Italy and France (0.15), plus an automation-tax path: 3.

**Coherence.** Q1 13 <= 27. C2 P90 1.90 < 2.00, Q2 8 < 10. A 26 <= 28; C4's 2.15 blends 2.3 then 2.1. Q4 counts Japan, the US and Italy, above 140% on my C3.
