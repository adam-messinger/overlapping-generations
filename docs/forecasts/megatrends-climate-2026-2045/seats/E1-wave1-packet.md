# Effort 1 (trade-chokepoints) - Wave-1 handoff packet

Your own effort's earlier seats only. Other efforts are deliberately withheld.

## Seat: outside-view

**Numbers:** c1={'p10': 0.6, 'p50': 0.95, 'p90': 1.4} | q1=11 | c2={'p10': -0.5, 'p50': 0.55, 'p90': 1.85} | q2=8 | c3={'p10': 92, 'p50': 132, 'p90': 158} | q3=3 | q4=2 | c4={'p10': 1.4, 'p50': 2.1, 'p90': 2.75} | q5=4 | q6={'A': 13, 'B': 76, 'C': 11}

# E1-outside-view (trade-chokepoints, historical base rates)

**BLUF.** History says the low trade elasticity mostly persists (C1 median 0.95; one era in six since 1870 was below 0.75) and that r* above 2%, a 1.5%-of-GDP climate line, three G7 yield caps and US+China above half of world GDP each have single-digit frequencies. Debt is the exception: twenty-year rises of 20-60 points are the rule since 1970.

## Reasoning (outside view only)

**C1.** Trade-to-GDP growth ratios by era. 1870-1913: 1.6 (exports 3.4%/yr, GDP 2.1%). Export share of GDP 7.9% (1913), 5.5% (1950), 10.5% (1973), 17.2% (1998) ([WTO WTR 2013, Table B.1](https://www.wto.org/english/res_e/booksp_e/wtr13-2b_e.pdf)): about 0.5, 1.6, 1.7 with Maddison's GDP rates (PPP, recalled from memory). World Bank goods-plus-services volumes ([NE.EXP.GNFS.KD](https://api.worldbank.org/v2/country/WLD/indicator/NE.EXP.GNFS.KD?format=json)): 1973-90 1.47, 1990-2008 1.90, 2008-25 1.05; 36 rolling 20-year windows from 1970, minimum 1.18. Merchandise alone: 0.85 (2005-24) and 0.68 (2008-24) on the UNCTAD-sourced index ([TX.QTY.MRCH.XD.WD](https://api.worldbank.org/v2/country/WLD/indicator/TX.QTY.MRCH.XD.WD?format=json), ends 2024); the WTO's own is "0.9-to-1 on average" since 2010, "excluding the trade collapse and rebound of 2009-10" ([GTO April 2024](https://www.wto.org/english/res_e/booksp_e/trade_outlook24_e.pdf)). One era of six sat below 0.75. Current regime (~0.9), a third reverted toward the 155-year mean (~1.3), plus the 2026-27 forecasts (1.5, 1.4): 0.60 / 0.95 / 1.40; P(E < 0.75) = 24%.

**Q1.** Broad shares move 5-10 points in one or two decades: manufactures 70% (1990), 75% (2000), 65% (2011); fuels and mining 14% to 23% (1990-2011), with "no clear trend in the post-Second World War period, as it rises and falls in step with oil prices" (same WTO report). The composite gaining 2-5 points: 40%, 45% given low E. 0.24 x 0.45 = 11.

**C2/Q2.** [HLW file](https://www.newyorkfed.org/medialibrary/media/research/economists/williams/data/Holston_Laubach_Williams_current_estimates.xlsx) ("All estimates are one-sided"): over 140 origin quarters 1972Q1-2006Q4, the change from composite R to its average 39-78 quarters later ran -2.43 to +0.15 (median -0.72); +1.27 is needed (overlapping: about three independent windows). Wider class, ex-post real short rates at the same weights ([JST R6](https://www.macrohistory.net/app/download/9834512569/JSTdatasetR6.xlsx), 1871-2020): 67 of 141 rolling decades averaged >= 2%, as did 15 of 41 decades beginning ten years after a decade <= 1%. HLW resolves; realized rates are the fallback. -0.5 / 0.55 / 1.85; Q2 = 8.

**C3.** JST public debt, 18 advanced economies, my PPP weights (not the IMF concept): 31% (1913), 131% (1946), 30% (1974), 129% (2020). Twenty-year changes, starts 1900-2000 (n=101, overlapping): P10 -37, median +24.5, P90 +46.5. All 31 starts from 1970 rose (+20 to +60); all seven above 90% (1943-49) fell 58-94. Official forecasts err low: realized debt "about 10% of GDP" above forecast "at the 5-year horizon" ([Estefania-Flores et al.](https://ideas.repec.org/p/cpr/ceprdp/16108.html)). 92 / 132 / 158.

**Q3.** Catastrophe losses: 0.2-0.3% of world GDP, half insured. Swiss Re's insured-loss trend is "5-7% a year" real, exposure "explaining more than 80%" (press reports of [sigma 1/2026](https://www.swissre.com/dam/jcr%3A4b5669a3-b7e2-4682-bf96-a597085958a6/sigma-1-2026-natural-catastrophes-report.pdf), not read directly): at most a doubling of the GDP share in twenty years; fivefold is needed. 3.

**Q4.** Caps: Fed 1942-51, BoJ 2016-24, RBA 2020-21 (memory); only Japan's met the 140% test; never three G7 countries at once. Of new tax bases only VAT passed 2% of GDP; carbon, transaction and digital taxes have not (memory). Three G7 debts above 140% fit C3. 2.

**C4.** [Maddison 2020](https://www.rug.nl/ggdc/historicaldevelopment/maddison/data/mpd2020.xlsx), 32 OECD members with 1950 data plus China, to 2018: 20-year windows 1.89-3.15% (median 2.44). After 20 years at >= 5%/yr (39 episodes) the next 20 had median 3.0%; 2.7% for the 19 at 20-40% of US income (>= 4% in 3). China 3%, OECD 1.3% gives 2.0%. 1.4 / 2.1 / 2.75.

**Q5.** [World Bank current-dollar shares](https://api.worldbank.org/v2/country/USA;CHN;EUU;JPN;WLD/indicator/NY.GDP.MKTP.CD?format=json), 1960-2025: US+China never above 44.0%; 20-year gains >= 7.7 points in 10 of 46 windows. The EU never lost the required 36% of its share (worst -33%). 0.12 x 0.38 = 4.

**Q6.** The C4 aggregate's decade growth (Maddison) was >= 2.5% in 9 of 29 windows starting 1980+, never < 1.5%; with China decelerating, P(g >= 2.5) = 15%. G7 decade inflation >= 4%: 47 of 141 rolling windows (JST, my weights), none starting after 1983. Last G7 IMF stand-by 1977, last default 1953 (memory). C 11, A 13, B 76.

## Seat: fermi

**Numbers:** c1={'p10': 0.67, 'p50': 0.91, 'p90': 1.18} | q1=7 | c2={'p10': 0.2, 'p50': 1.0, 'p90': 1.9} | q2=8 | c3={'p10': 114, 'p50': 130, 'p90': 150} | q3=8 | q4=2 | c4={'p10': 1.7, 'p50': 2.3, 'p90': 3.0} | q5=4 | q6={'A': 27, 'B': 61, 'C': 12}

# Seat E1-fermi (trade-chokepoints, arithmetic and physical decomposition)

**BLUF.** Component arithmetic puts the 2026-2045 merchandise elasticity near 0.9: after the WTO's 3.9% and 4.1% for 2026-27, trade would have to run at an elasticity of about 0.66 for eighteen years to finish under 0.75, so the Q1 conjunction is about 7%. The same method gives R near 1.0%, advanced-economy debt near 130% of GDP, aggregate per-capita growth near 2.3% and B as the modal regime.

## Reasoning

**Adapter** (re-run today, identical to `adapter-output.md`). REFUSED: c1, q1, q4; no model number used. DIRECTIONAL, sign and rough size only: c2/q2 safe-rate change 2026→2040 +0.06pp baseline, −0.11 to +0.42 across runs; c3 world debt/GDP +8.4pp 2026→2045 (−4.1 to +10.6; debt-populism +73.6); q3 global damage 2.1% of GDP 2040-45 (cascade 5.5%), output loss not outlay; q5 US+China constant-price share 44.8→44.5, OECD-ex-US 31.3→27.8. IDENTIFIED, conditional on each run: c4 GDP +2.622%, population −0.317% → 2.95% per capita (2.64-3.98); q6 g = 1.02349/0.99546−1 = 2.82% (2.47-4.61).

**C1.** Weight × volume growth (%/yr, mine): fuels 0.11×(−0.2) ([IEA WEO-2025](https://www.iea.org/reports/world-energy-outlook-2025) via press, tables not read: oil ~102 mb/d plateau in STEPS, 113 by 2050 in CPS); mining 0.045×2.5; agriculture 0.10×2.0; AI-enabling goods 0.105×5.5; other manufactures 0.58×2.2 (0.85×g_Y); other 0.06×2.0. Sum 2.26, +0.1 chain reweighting: 2.36/2.6 = 0.91. Cross-check, [WTO update](https://www.wto.org/english/news_e/news26_e/stat_08oct26_510_e.htm): 1.039×1.041×1.021^18 = 1.572 → 2.29%/yr → 0.88. E<0.75 needs 1.0195^20/1.0816 → 1.73%/yr, elasticity 0.66, over 2028-45; realised 2011-25 ≈1.0, 2018-25 ≈0.8 (recalled WTO annual rates, not re-read). Drags: US tariff 9.1% ([Yale Budget Lab](https://budgetlab.yale.edu/topic/trade): "If the Section 122 tariffs expire in 150 days as scheduled, the effective tariff rate will then be 7.3%") × 13% import share × elasticity −2 ≈ −0.07pp/yr; three 2026-size Gulf shocks (Middle East exports −17.2%, about 1pp each) ≈ −0.05pp/yr. WTO caveat: 2027 "depends on a timely resolution of the Middle East conflict". P(E<0.75) = 19%.

**Q1.** Composite recomputed for 2025: digital services 5.26/35.8 ($26.3T goods + $9.5T services, [UNCTAD-WTO](https://unctad.org/news/unctad-wto-trade-data-highlights-shifting-global-trends-ahead-key-ministerial-talks)) = 14.7%; AI goods ≈10.5% of merchandise ([WTO](https://www.wto.org/english/res_e/publications_e/global-trade-outlook-and-statistics_execsum_e.htm): H1 14.8%×1.15/1.67) ×0.735 = 7.7%; fuels and mining ≈10.9% (my estimate). Total 33%, about 37% in H1 2026: the preamble's 37-40% adds a merchandise share to total shares. 2045: 23 + 9.5 + 7.5 = 40, sd 4.5 → P(>42) = 33%; 35% given E<0.75 (mild positive correlation). 0.19×0.35 = 7%.

**C2/Q2.** R = 0.61×1.4 + 0.34×0.3 + 0.05×1.55 = 1.03: US +0.4 on 1.01 (debt supply, AI growth, less ageing saving), euro area +0.2, Canada −0.2. Adapter direction agrees. sd 0.7 → P(R≥2.0) = 8%.

**C3.** US: [CBO](https://www.cbo.gov/publication/62207) held-by-public 101% (2026), 120% (2036), 175% (2056) → ~143% in 2045, +21 for IMF gross = 164; IMF's 145% in 2031 (S) at +2.6pp/yr = 181; midpoint 172. Non-US: (115.2 − 0.46×145)/0.54 = 90 in 2031, +5 for ageing and defence. 0.46×172 + 0.54×95 = 130. The model's +8pp is a world aggregate with a ~1% safe rate below growth: sign taken, size not.

**Q3.** F = adaptation 0.3, relief and backstops 0.25, household support 0.05, attributed revenue loss 0.2: 0.8% of GDP. [OBR](https://obr.uk/publications/fiscal-risks-and-sustainability-july-2025) central case, via ICAEW: ~17pp of debt from damage over 50 years; risks "skewed to the downside". Lognormal σ 0.5 → 10%, cut to 8%: official attribution counts increments.

**Q4.** Fiscal-dominance world (12%): Japan 0.75, US 0.55, Italy 0.15, France 0.10, UK 0.08 → P(≥3) = 0.15. AI-displacement world (10%): 0.04. Otherwise 0.001. Total 2.2%. Coherent with C3: only US, Japan and Italy plausibly pass 140%.

**C4.** OECD 76.5×1.016^20 = 105.1; China 35.3×1.0315^20 = 65.7; 170.8/111.8 → 2.14%; population 1,459M + 1,286M → −0.12%; per capita 2.26%. The model's 2.95% exceeds every ten-year window since 1990: its population falls 0.2pp/yr faster, its OECD-ex-US GDP grows 2.25%/yr against 1.7% realised. Not adopted; it fattens my upper tail.

**Q5.** US 25.5×(1.044/1.047)^19 = 24.1; China 16.8×(1.049/1.047)^19 = 17.4; sum 41.5. EU 17.7×(1.033/1.047)^19 = 13.7. P(sum>50) = 7% (needs ~25% dollar-and-renminbi appreciation; the model's real leg is flat); P(EU<11.5 | that) = 0.55 → 4%.

**Q6.** g: (89.7×1.016^10 + 51.3×1.025^10)/141.0 → 1.94%, +0.2 population = 2.14%; sd 0.6 plus model upside → P(g≥2.5) = 30%. C: credit event (US 3.5, Italy 2.5, France 1.5, UK 1.2, others 1.4: ≈10%) plus stagflation 0.10×0.2 = 2% → 12. A = 0.30×0.92 ≈ 27. B = 61.

## Seat: signals

**Numbers:** c1={'p10': 0.76, 'p50': 1.0, 'p90': 1.25} | q1=5 | c2={'p10': 0.3, 'p50': 1.0, 'p90': 1.9} | q2=8 | c3={'p10': 117, 'p50': 137, 'p90': 160} | q3=2 | q4=4 | c4={'p10': 1.7, 'p50': 2.25, 'p90': 2.85} | q5=2 | q6={'A': 21, 'B': 69, 'C': 10}

# Seat E1-signals (trade-chokepoints, current telemetry)

**BLUF.** The freshest telemetry puts the first two years of the C1 window at a trade-to-GDP elasticity of about 1.4-1.5 (WTO: 3.9%/2.6% for 2026, 4.1%/2.9% for 2027) with Hormuz traffic depressed and US tariffs near post-1943 highs, so a twenty-year E below 0.75 needs about 0.67 over the other eighteen years; I price that under one in ten. Q1's composite cannot be read uniquely: the WTO published two different "AI-enabling goods" aggregates in 2026, about 3-4 points of the composite apart, which is the size of the gap to the 42% threshold.

## Reasoning (signals lens)

**C1 (centre of gravity).** WTO, 8 Oct 2026 ([release](https://www.wto.org/english/news_e/news26_e/stat_08oct26_510_e.htm)): "merchandise trade volume is now expected to grow by 3.9% in 2026" (March forecast 1.9%) and 4.1% in 2027, with GDP at "2.6% and 2.9%": elasticity 1.5 and 1.4 for the window's first two years, after 4.6%/2.9% in 2025. Caveats verbatim: the 2027 path "depends on a timely resolution of the Middle East conflict", and it rests on market projections that "AI capital expenditure will continue to rise by a further 10-20% in 2027". The growth is narrow: AI-enabling goods "accounted for 47% of global merchandise trade growth in value terms in the first half of 2026", and "the top 10 traders of AI-enabling goods accounted for around 85% of world exports" ([executive summary](https://www.wto.org/english/res_e/publications_e/global-trade-outlook-and-statistics_execsum_e.htm)). Merchandise value was "up 15% year-on-year compared to 3.5% growth in volume terms". One sector's capex cycle is evidence about 2026-27, not 2045, so I centre at 1.0 with wide tails.

Chokepoints today. Hormuz: Lloyd's List Intelligence ([5 Nov brief](https://www.lloydslistintelligence.com/resources/blog/strait-of-hormuz-brief-5-november-2026)) has "Total transits: 116 vs 124" non-Iranian-linked for 19-25 October and "At least 44 crude tankers sailed into the MEG" against "The 'normal' average is about 41". Stated limits: "Preliminary data", "at least", "All analysis focuses on cargo-carrying vessels over 10,000 dwt"; the brief gives no pre-war baseline for total transits. WTO: Middle East crude exports "fell by roughly 24%" in H1 2026 while world crude exports fell about 6%, and "Global container throughput remained resilient, rising 3.9% year-to-date through July". Trade rerouted more than it shrank. Suez: 1,228 transits in September, Bab el-Mandeb 47% below pre-Houthi-crisis levels, "still far away from a full recovery, but it is undeniably under way" (Lloyd's List Red Sea Briefs, snippets). Panama: 33 daily transits from 15 October after "near-average rainfall" ([ACP](https://pancanal.com/en/panama-canal-announces-increase-in-draft-and-daily-transit/), snippet); no drought binds today. Tariffs: Yale Budget Lab's US effective rate was 11.0% on 2 April 2026, "the highest since 1943 (excluding 2025)", falling to 8.2% if Section 122 expired ([report](https://budgetlab.yale.edu/research/state-us-tariffs-april-2-2026), snippet; no October reading found).

**Q1.** P(E < 0.75) about 9%. P(composite > 42% | E < 0.75) about 0.55: weak goods volume shrinks the denominator, but an AI bust or falling fuel trade cuts the numerator, so I assume correlation near zero. 5.

**C2, Q2.** I found no HLW release after 2026Q2. Press quotes a New York Fed r* of 1.65% for 2026Q2 against 1.36% in 2025Q1 ([IBTimes](https://www.ibtimes.sg/A000OGx), secondary); that is the Laubach-Williams series, not HLW, so it informs direction only (up). Yields at 2002 highs have not moved the HLW filter, and the euro area's 0.09% carries 34%. Median 1.0; Q2 8.

**C3.** Each IMF vintage steps up: 2031 advanced-economy debt 114.8% in April, 115.2% in October; US 142.1% then 145% (press only, [example](https://greekcitytimes.com/2026/10/14/imf-forecasts-greek-public-debt-to-fall-to-111-1-of-gdp/)). Median 137.

**Q3.** Swiss Re, H1 2026 ([sigma note](https://www.swissre.com/institute/research/topics-and-risk-dialogues/climate-and-natural-catastrophe-risk/first-half-2026-insured-catastrophe-losses.html), snippet): preliminary economic losses USD 100 billion, insured USD 42 billion, "below the trend estimate of USD 66 billion", and "Historically, 58% of global insured natural catastrophe losses occur during the second half". Total losses, public and private, are 0.2-0.3% of world GDP against a 1.5% public-budget threshold. 2.

**Q4.** The BoJ raised to 1.25% in September and is cutting JGB purchases with the ten-year at 2.7-2.95% (trade press, snippets): the opposite of a cap. US AI-tax bills are introduced, unenacted and unscored ([H.R. 10044](https://www.govinfo.gov/app/details/BILLS-119hr10044ih)). 4.

**C4, Q5, Q6.** WTO world GDP of 2.6-2.9% through a war and an AI capex boom sits inside the aggregate's 2.15-2.85% history. Nominal shares (42.3% and about 17.7%) show no drift of the size Q5 needs. Today's stress (Hormuz, yields, energy) precedes Q6's window by a decade: A 21, B 69, C 10.

## Resolution audit

Re-verified on the WTO pages: 3.9%/2.6% and 4.1%/2.9% (the release says "global GDP growth" and does not state the exchange-rate basis on the page); H1 2026 value +15% against volume +3.5%; AI-enabling goods 14.8% of world MERCHANDISE trade in H1 2026, "up from 7 to 8% between 2016 and 2023", and 47% of merchandise trade growth "in value terms". Digitally delivered services of $5.26T in 2025 (55.0% of services exports) is confirmed only through JETRO's summary of WTO data (https://www.jetro.go.jp/world/gtir/2026/ch1/sec2/sub1/); the 2025 totals ($26.26T merchandise, $9.56T commercial services, $34.65T goods and services on a balance-of-payments basis) came from a search snippet of the March Outlook, not the WTO table. The fuels-and-mining share is NOT verified (one secondary summary gives -4% in 2025). **Q1(ii) cannot be read as written.** The March 2026 Outlook reports AI-enabling goods "rising to US$ 4.18 trillion in 2025", +21.9%, "about one-sixth of global trade" (https://www.wto.org/english/news_e/news26_e/stat_19mar26_329_e.htm); the October 2026 Outlook reports 14.8% in H1 2026 after growth of "31% in 2025" from "7 to 8%", which implies roughly 11% of merchandise trade in 2025 (my inference, not a published figure). Those are two aggregates, and both are "the WTO's definition as used in its 2026 Global Trade Outlook". The orchestrator's 37-40% for 2025 matches the March (broad) one; on the October (narrow) one 2025 is nearer 34-35% and H1 2026 about 37-38%, and on the broad one H1 2026 may already be near 41% (my arithmetic). The lock should name the edition. Note also that 14.8% is a share of merchandise, about 11% of goods plus commercial services. C2: the New York Fed publishes both LW and HLW, and press "New York Fed r*" figures are usually LW; the resolver must be read from the HLW file. Quotations were read through a page-summarising fetch tool; S&P Global's Hormuz and Red Sea piece returned HTTP 403 and was not read; items marked "snippet" were seen only in search results.
