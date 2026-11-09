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

```json
{"c1": {"p10": 0.72, "p50": 1.15, "p90": 1.65},
 "q1": 7,
 "c2": {"p10": -0.2, "p50": 0.85, "p90": 2.0},
 "q2": 10,
 "c3": {"p10": 103, "p50": 133, "p90": 165},
 "q3": 3,
 "q4": 2,
 "c4": {"p10": 1.2, "p50": 1.8, "p90": 2.5},
 "q5": 6,
 "q6": {"A": 10, "B": 69, "C": 21}}
```
