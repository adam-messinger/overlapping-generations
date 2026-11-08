# Effort 4 (labor-distribution) - Wave-2 handoff packet

Your own effort's earlier seats only. Other efforts are deliberately withheld.

## Seat: outside-view

**Numbers:** q1={'A': 52, 'B': 30, 'C': 13, 'D': 5} | q2=33 | q3=55 | q4={'p10': 260, 'p50': 410, 'p90': 720} | q5=5 | q6={'p10': 50.0, 'p50': 52.0, 'p90': 54.1} | q7=7

# E4 labor-distribution / outside-view (A1, Wave 1)

**BLUF.** History offers no precedent for the essay's numbers. Over 77 years, a four-year move in the BLS labor share has a P10 of about -2.6pp. The aggregate headcount of the Indian big five has never fallen 10% in three years; its worst was -4.2%. A sector's capex usually sits at or below its boom-year level four years after a year of 50%+ growth. Explicit yield pegs by reserve-currency issuers are rare: about 0.5-1% per issuer-year over the long run. I anchor hard on these frequencies. The adjustments are arithmetic only: latest levels and distance to each threshold.

Lens discipline: this seat reasons only from reference-class frequencies. It does not argue about AI-specific mechanisms such as agents, diffusion speed, chips or policy intent. I searched for no forecasts of these questions.

---

## Q6: US nonfarm business labor share, 2030 annual average (centre of gravity)

**Reference class.** I took the full BLS nonfarm business labor-share history (FRED `PRS85006173`, index 2017=100, 1947Q1-2026Q3, current vintage, downloaded 2026-11-08: https://fred.stlouisfed.org/series/PRS85006173). I converted it to percent by fixing 2026Q2 = 52.8% as published. The index is a ratio, so it scales proportionally. The conversion assumes the percent series and the index share a numerator and denominator. I did not verify that against the BLS percent table, which the published 2026Q2 level should do. For every quarter, I measured the change from that quarter to the annual average of quarters +14 to +17. That matches the distance from 2026Q2 to calendar-2030.

| Window | n (overlapping) | P10 | P25 | P50 | P75 | P90 | mean |
|---|---|---|---|---|---|---|---|
| 1947-2026 | 302 | -2.48 | -1.63 | -0.49 | +0.75 | +1.54 | -0.50 |
| 1980-2026 | 170 | -2.72 | -1.98 | -0.83 | +0.43 | +1.46 | -0.76 |

Caveat: the windows overlap heavily, so there are only about 19 (or 11) independent four-year windows. The tails are therefore poorly pinned down.

Decade changes (annual averages): 1947-2025 mean -1.15pp, sd 1.78, min -6.78, max +2.33, n=69 overlapping. Since 1980: mean -1.79, P10 -4.82. The largest ten-year fall on record, about -6.8pp, ran from the early 2000s to the 2010s. The essay's claim of a 40-year decline in one decade implies roughly -5.5pp (1980 62.75 to 2020 57.24, annual averages on this scale) packed into ten years. Only the 2000-2010 window ever did that. Within four years, the worst observed fall is -4.1pp.

**Record lows as a subclass.** I took 27 quarters since 1960 that set a new series minimum. Their change to the year-4 average splits evenly: 1960s-1990s record lows mostly rebounded (+1 to +3pp), while 2003-2010 record lows kept falling (-0.3 to -2.5pp). This subclass gives no reason to shift the centre.

**Arithmetic adjustment.** The published 2026Q2 level is 52.8%. The current-vintage index for 2026Q3 is 93.729, which implies about 52.4% on the same scale. That is after the Nov 5 2026 release, and Q2 may have been revised. I anchor at 52.6 and apply the blended distribution: P10 -2.6, P50 -0.6, P90 +1.5.

**Q6: P10 50.0 / P50 52.0 / P90 54.1.**

## Q7: Indian IT big five, headcount at 31 Mar 2029 at least 10% below 31 Mar 2026 (centre of gravity)

**Arithmetic baseline.** Company-reported headcounts at 31 Mar 2026:

- TCS 584,519
- Infosys 328,594 ([Business Today](https://www.businesstoday.in/technology/story/infosys-headcount-falls-by-over-8400-in-q4-workforce-at-328594-527161-2026-04-23))
- HCLTech 223,889
- Wipro 242,156 ([Business Today](https://www.businesstoday.in/technology/story/wipro-adds-135-employees-in-q4-attrition-eases-to-14-526016-2026-04-16))
- Tech Mahindra 147,623 ([Angel One](https://uatcdn.angelone.in/news/stocks/tech-mahindra-share-price-in-focus-headcount-falls-by-1-993-in-q4fy26-attrition-rate-eases))

The total is about **1,526,800**, so the threshold is about **1,374,100**. The five firms fell by 7,389 combined over FY26 ([IANS](https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000)). By 30 Sep 2026 the first four alone were at 1,397,265, and Tech Mahindra is around 148k. The aggregate is therefore about 1% above the March base, so the remaining fall needed is about 11% in 30 months.

**Reference classes.**

1. *This aggregate.* From memory of the companies' annual reports, the combined headcount of the five was about 1.593M at Mar 2023, 1.526M at Mar 2024 and 1.537M at Mar 2025. Mar 2026 is 1.527M, from the sources above. The worst three-year change in its history is about **-4.2%** (Mar 2023 to Mar 2026). Before 2023 the aggregate grew in essentially every year from the 1990s to 2022. That is 0 of about 25 three-year windows at -10% or worse. The Laplace rule gives (0+1)/(25+2) ≈ **4%**.
2. *Individual large IT/BPO employers in mature phases.* These figures are from memory of company filings, unverified in this session:
   - Wipro: about 259k (2022) to 233k (Mar 2025), about -10%.
   - Tech Mahindra: about 164k (Dec 2022) to 145k (Mar 2024), about -11.5%.
   - Infosys: about 346k (Sep 2022) to 317k (Mar 2024), about -8%.
   - IBM: 2012-2015, about -13%.
   - DXC: 2017-2020, about -19%.
   - Atos: about -14% over 2019-2023.
   - Accenture, Cognizant and Capgemini never had a three-year fall of 10%.

   Single-firm windows reach -10% in roughly 15-20% of mature-phase windows. An aggregate of five firms diversifies away firm-specific restructurings, so this class overstates the rate.

**Blend.** I weight the aggregate class at 2/3 (about 4%) and the single-firm class at 1/3 (about 17%), which gives about 8%. I subtract a point because the starting point (Sep 2026) is above the base.

**Q7: 7.**

## Q1: Big-4 capex regimes, R = CY2030 / CY2026

**Reference class:** a sector's capex four years after a year of at least 50% growth. Big-4 capex roughly +75% in 2026 on the guidance in the preamble.

- **Semiconductors (IC Insights).** IC Insights counts six double-digit capex downturns since 1983: 1985-86, 1992, 1997-98, 2001-02, 2008-09 and 2012-13. It also records that "in every case between 1983 and 2010 where spending declined, a surge in spending of at least 45% occurred two years later" ([AnySilicon / IC Insights](https://anysilicon.com/semiconductor-industry-capex-history-and-forecast-1983-2020/)). The 2014 total was $65.0B ([Design & Reuse](https://us.design-reuse.com/news/37198/2015-semiconductor-capex-memory-foundry.html)) and the 2021 total $152.0B ([Design & Reuse](https://www.design-reuse.com/news/news51109.html)). Surge years and their R at year +4, from memory of IC Insights series and approximate:

  | Surge year | Growth | R (year +4) | Regime |
  |---|---|---|---|
  | 1995 | ~+70% | ~0.8 | A |
  | 2000 | ~+85% | ~0.75 | A |
  | 2004 | ~+55% | ~0.9 | A |
  | 2010 | ~+100% | ~1.2 | B |
  | Memory, 2017 | ~+80% | ~1.3 | B |

- **Telecom carriers.** North American service-provider capex peaked in 2000 at about $92B. It then fell 28% in 2001 and a further 20% in 2002 (estimates and forecasts, not actuals). Global telecom capex fell "46 percent from 2000 to 2002" ([Lightwave](https://www.lightwaveonline.com/business/market-research/article/16659352/north-american-service-provider-capital-expenditures-to-rebound-in-2003)). Caveat: these are trade-press numbers with mixed scopes, part of them forecasts. Peak-year R is about 0.5 (A).
- **Other cases, from memory.** US railroad mileage built in 1880-81, solar PV manufacturing in 2010-11, US upstream shale in 2010-11 and crypto mining in 2021 all have R < 1 at year +4 (A).
- **The one live in-class case.** Big-4 capex grew about 55% in 2024 (from memory). Its R for 2028/2024 is already above 3x at 2026 guidance, so it lands in regime C or D. History has few cases where a sector's own preceding surge kept compounding. This one does, and it is the main reason I keep C and D well above zero.

**Tally.** Of about 12 cases, roughly 8 are A and 4 are B, plus the one live case in C or D. I apply Laplace smoothing over four bins and give the live case some weight. The definition locks (cash-flow PP&E, finance leases excluded) affect both years equally, so they do not move R.

**Q1: A 52 / B 30 / C 13 / D 5.**

## Q2: Epoch database model with an estimated training cost of at least $10B, published by 2028-12-31

**Reference class:** how often trend-extrapolated cost or compute milestones arrive on time. From memory, unverified this session:

- TOP500 petaflop, extrapolated for about 2008: arrived 2008, on time.
- TOP500 exaflop, extrapolated for about 2018-19: arrived 2022 (Frontier), about 3-4 years late.
- ITRS node dates: mostly on time to two years late in the 1990s-2000s, and later slipping.
- Moore's-law density doublings: on time 1970-2005, then slower.
- Genome cost: beat its trend.
- Epoch's own earlier projection of a $1B-plus run by 2027: on track.

On short horizons of about 3 years, a trend extrapolation hits a dated threshold set near the trend line about half the time. That is the median property of Farmer-Lafond-style forecast errors, where errors widen with horizon.

**Arithmetic.** Epoch put Grok 4 (mid-2025) at about $500M (secondary report: [Epoch Gradient Updates](https://epoch.ai/gradient-updates/why-gpt5-used-less-training-compute-than-gpt45-but-gpt6-probably-wont); the cost figure is via search summary). $10B by end-2028 is 20x in about 3.45 years, roughly 2.4x a year. That is Epoch's 2024 trend rate, and the 3.5x rate would clear it easily. The threshold therefore sits near the slower trend line, which gives P(a run at least that large exists) ≈ 0.5.

The second factor is P(Epoch publishes a primary cost estimate for it in the 2029-12-31 snapshot). Frontier labs disclose little, and "unknown" does not count. I put this at about 0.7.

0.5 × 0.7 ≈ 0.35, rounded down slightly for horizon-widening on the late side.

**Q2: 33.**

## Q3: All ten top LMArena organizations headquartered in the US or China on 2028-12-31

**Reference classes:** two-country concentration of frontier technology leadership, judged by top-10 firms or entities.

| Field | Top-10 shared by two countries? |
|---|---|
| Semiconductors (top 10 by revenue: US, Korea, Taiwan, Netherlands, Japan) | No |
| Civil aerospace (Boeing/Airbus duopoly; the top 10 includes UK, France, Canada, Brazil) | No |
| Nuclear reactors (US, USSR, France, UK, Canada, Japan) | No |
| Global search share (Google, Bing, Baidu, Yandex, Naver, Seznam) | No |
| Internet platforms by market cap (from memory of Meeker's 2018 Internet Trends: top 20 all US or China, sustained about 2015-2025) | Yes |
| Space launch and nuclear weapons | Two powers for about 3-8 years before a third entrant |

Frontier-AI leaderboards look most like the internet-platform class, the only one that is digital and software-based. That class persisted for a decade or more. The industrial classes say no.

I could not read the live board: arena.ai returned 403. Secondary snapshots, which I could not verify, suggest the top of the board is US-dominated, with several Chinese labs (Moonshot, Zhipu, DeepSeek) in the top 20-35 models. That places them among the top ten distinct organizations ([AF.NET](https://af.net/realtime/google-gemini-4-carbon-leads-lmarena-text-leaderboard-with-1528-score/), unverified). I found no non-US/China lab near the top-10-organization cut; Mistral sat far down in early-2026 snapshots.

The status quo, a two-year horizon and a deep 10th-place cut combine to favour persistence. One single-date snapshot of the 10th slot adds noise. The internet-platform class gives about 70% and the industrial classes about 15%. I weight them about 2:1 toward the closer class.

**Q3: 55.**

## Q4: Total stablecoin market cap on 2028-12-31 (DefiLlama, USD bn)

**Reference class:** growth of new payment and money-like instruments after regulatory legitimation. From memory:

- US money market funds: about $4B (1977) to about $230B (1982) after rate deregulation legitimised them. Then flat for 2-3 years once the rate edge closed.
- ETFs after 1993: decades of 20-50%+ a year.
- Stablecoins' own two-year changes:
  - Dec 2021 to Dec 2023: about -21%
  - Dec 2022 to Dec 2024: about +46%
  - Dec 2023 to Dec 2025: about +137%

The class shows high median growth with frequent multi-year stalls.

**Arithmetic baseline.** The latest figure is about **$300.4B (25 Oct 2026)**, down about $12.7B since the May peak of about $322B ([summary of DefiLlama via secondary outlets](https://www.onebullex.com/news/articles/usdc-sheds-4-69b-in-30-days-as-stablecoin-market-cap-falls-to-300-36b); not checked on DefiLlama directly). The total crossed $300B around Oct 2025 ([The Block](https://www.theblock.co/post/373314/stablecoin-market-cap-surpasses-300-billion-for-first-time-amid-crypto-rebound)), so it has been flat for about a year since the GENIUS Act. The horizon is about 2.2 years.

Reference two-year log growth: P10 about -15%, P50 about +35%, P90 about +140%.

**Q4: P10 260 / P50 410 / P90 720.**

## Q5: Fed announces a numerical yield ceiling or target, at least one-year maturity, before 2031-01-01

**Reference class:** explicit yield pegs among reserve-currency issuers (USD, GBP, JPY, DEM/EUR, CHF, plus AUD/CAD), about 1913-2026, roughly 600 issuer-years. Explicit adoptions:

- US 1942 (to 1951)
- Japan 2016 (10y about 0%, to 2024)
- Australia 2020 (3y, to 2021)

The UK's wartime "cheap money" was managed, not announced as a numerical ceiling.

| Basis | Rate | Over the 4.15-year US window |
|---|---|---|
| Long-run, all issuers | ~3/600 ≈ 0.5% per issuer-year | ~2% |
| US-specific | 1 adoption in ~113 Fed years ≈ 0.9%/yr | ~3.6% |
| Recent decade, all issuers | 2/60 ≈ 3.3% per issuer-year | ~13% |

I weight mostly toward the long-run and US rates, because the recent-decade estimate rests on n=2. The 10y yield of 5.17% is a level, not a frequency, and I do not adjust for it.

**Q5: 5.**

---

## Sources

- FRED PRS85006173 (BLS nonfarm business labor share index): https://fred.stlouisfed.org/series/PRS85006173
- Business Today (Infosys Q4 FY26): https://www.businesstoday.in/technology/story/infosys-headcount-falls-by-over-8400-in-q4-workforce-at-328594-527161-2026-04-23
- Business Today (Wipro Q4 FY26): https://www.businesstoday.in/technology/story/wipro-adds-135-employees-in-q4-attrition-eases-to-14-526016-2026-04-16
- IANS (FY26 combined change): https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000
- Angel One (Tech Mahindra Q4 FY26): https://uatcdn.angelone.in/news/stocks/tech-mahindra-share-price-in-focus-headcount-falls-by-1-993-in-q4fy26-attrition-rate-eases
- AnySilicon / IC Insights capex cycles: https://anysilicon.com/semiconductor-industry-capex-history-and-forecast-1983-2020/
- Design & Reuse (2014 semiconductor capex): https://us.design-reuse.com/news/37198/2015-semiconductor-capex-memory-foundry.html
- Design & Reuse (2021 semiconductor capex): https://www.design-reuse.com/news/news51109.html
- Lightwave (telecom capex 2000-02): https://www.lightwaveonline.com/business/market-research/article/16659352/north-american-service-provider-capital-expenditures-to-rebound-in-2003
- Epoch Gradient Updates: https://epoch.ai/gradient-updates/why-gpt5-used-less-training-compute-than-gpt45-but-gpt6-probably-wont
- AF.NET (LMArena snapshot, unverified): https://af.net/realtime/google-gemini-4-carbon-leads-lmarena-text-leaderboard-with-1528-score/
- The Block (stablecoins pass $300B): https://www.theblock.co/post/373314/stablecoin-market-cap-surpasses-300-billion-for-first-time-amid-crypto-rebound
- OneBullex (stablecoins Oct 2026, DefiLlama secondary): https://www.onebullex.com/news/articles/usdc-sheds-4-69b-in-30-days-as-stablecoin-market-cap-falls-to-300-36b

Figures marked "from memory" are reference-class values I did not re-verify in this session. Downstream seats should treat them as approximate.

## Seat: fermi

**Numbers:** q1={'A': 22, 'B': 57, 'C': 19, 'D': 2} | q2=9 | q3=75 | q4={'p10': 235, 'p50': 390, 'p90': 680} | q5=7 | q6={'p10': 49.8, 'p50': 51.5, 'p90': 53.4} | q7=15

# E4 labor-distribution / fermi (A2, Wave 1)

**BLUF.** When I break each question into parts and multiply them out, I get a slow drift rather than the essay's line. The US labor share keeps falling at about its 2022-26 pace, to a 2030 median of **~51.5%** (P10 49.8 / P90 53.4). The parts do not produce a 10% three-year cut at the Indian IT big-5 (**15%**). The arithmetic puts Big-4 capex in a **plateau (B, ~57%)** and leaves almost no room for R >= 4. The model contributes direction only: its AI channel moves labor share by 0.1-1.9 pp by 2030 and adds 3.5-14 pp more by 2036. Even if the essay's mechanism is real, most of its effect lands after 2030.

Lens: arithmetic and physical decomposition only. Every number below is a component I chose, then multiplied out. The Monte Carlo scripts are in the session scratchpad, not the repo. Their parameters are written out in each section so you can rebuild them.

---

## The adapter I used (published as required)

- Spec: `docs/forecasts/commanding-heights-2026/adapter-spec.json` (scenarios `baseline`, `ai-energy-boom`, `debt-populism`; levers `lever:dc-fast`, `lever:dc-fast-ai-payoff`, `lever:repression-2pp`).
- Command, re-run at the origin: `npx tsx scripts/tetlock-sim-adapter.ts --spec=docs/forecasts/commanding-heights-2026/adapter-spec.json`. It exited 0 and **reproduced `adapter-output.md` exactly**: every reading was identical. The model vintage is commit 46df211.
- Statuses I follow: **q2, q3, q4, q7 REFUSED.** I take no model number for them. **q1, q5, q6 DIRECTIONAL.** For those I use the sign and rough size only, never a level and never a point estimate.
- Disclosures that bind what I quote:
  - The model's datacenter-capex level is understated about 2.5-3x. It is a world chips-plus-facilities composite with no hyperscaler, no lab and no stock market.
  - Model labor share is world compensation / GDP, about 0.65 in 2025, and is **not comparable to BLS 52.8%**. It moves only through robot and AI worker-equivalents.
  - The model has no Fed, no yields and no stablecoins. Fiscal dominance triggers only above 150% world public debt/GDP.

| Adapter reading (directional) | baseline | ai-energy-boom | debt-populism | dc-fast | dc-fast-ai-payoff | repression-2pp |
|---|---|---|---|---|---|---|
| DC capex CAGR 2026-30 (%/yr) | 12.8 | 20.2 | 12.3 | 39.2 | 39.4 | 13.7 |
| implied 4-yr ratio (my arithmetic, (1+g)^4) | 1.62 | 2.09 | 1.59 | 3.76 | 3.78 | 1.67 |
| world labor share change 2026-30 (pp) | -0.11 | -0.75 | -0.11 | -0.11 | -1.92 | -0.11 |
| world labor share change 2026-36 (pp) | -0.35 | -3.50 | -0.34 | -0.35 | -13.97 | -0.36 |
| world public debt/GDP 2030 | 0.89 | 0.89 | 1.07 | 0.89 | 0.88 | 0.80 |
| repression gap 2030 (pp) | 0 | 0 | 0 | 0 | 0 | 2.0 (imposed) |
| real safe rate change 2026-30 (pp) | +0.17 | +0.19 | +0.80 | +0.17 | +0.21 | -0.09 |

---

## Correction to the preamble baseline (Q6 resolver vintage)

The preamble's 52.8% (2026Q2) predates the 2026 annual NIPA update. The BLS *Productivity and Costs, Third Quarter 2026, Preliminary* release (USDL 26-1631, 5 Nov 2026, [PDF](https://www.dol.gov/newsroom/economicdata/prod2_11052026.pdf)) says:

> "The labor share, which is the percentage of output that accrues to workers in the form of compensation, was 53.0 percent in the third quarter of 2026, the lowest level in the series, which begins in the first quarter of 1947."

The release also says "measures incorporating compensation were revised back to 2021 for all sectors." Q2 hourly compensation was revised up 1.4 pp.

I rebuilt the percent series by scaling FRED's index `PRS85006173` (2017=100, [FRED](https://fred.stlouisfed.org/series/PRS85006173)) to 53.0 at 2026Q3. The results:

- Quarterly, 2025Q3 to 2026Q3: 53.9, 54.1, 54.0, **53.4** (2026Q2 under the new vintage, versus 52.8 in the old one), 53.0.
- Annual averages: 2019 56.6, 2022 55.4, 2023 54.6, 2024 54.5, 2025 54.3. 2026 is about 53.3 if Q4 is about 52.9.

The level is my derivation from the index; BLS does not print the 2026Q2 revised percent in the release text. The September revision alone moved the level about +0.6 pp, which is why I carry a revision term below.

---

## Q6: BLS nonfarm business labor share, CY2030 average (centre of gravity)

**Decomposition.** LS(2030 avg) = LS(2026Q3) + structural drift x horizon + AI labor-to-capital excess + cyclical term + revision noise. The horizon runs from mid-2026Q3 to the centre of 2030, about **3.9 years**.

| Component | Central | Spread | Basis |
|---|---|---|---|
| Start, 2026Q3 | 53.0 | n/a | BLS, 5 Nov 2026 |
| Structural non-AI drift | -0.30 pp/yr (x3.9 = **-1.2 pp**) | sd 0.18 pp/yr | Blends -0.14 pp/yr (1980->2020 annual averages, 63.4 -> 57.8, my rebuild) with about -0.5 pp/yr (2019->2026Q3, 56.6 -> 53.0). Composition, markups and intangibles continue. |
| AI excess | **-0.55 pp** (median), left-skewed, lognormal sd 0.8 | Tail to about -2.5 pp | See composition and displacement arithmetic below. Magnitude checked against the adapter's direction. |
| Cyclical term | P(recession weighting the 2030 average) ~ 0.38: **+1.4 pp** if yes, -0.15 if no | Expected about +0.4 pp | The labor share is countercyclical: 2020Q2 spike to 58.9 (BLS TED). Compensation is sticky while profits fall. |
| Revision to first print | 0 | sd 0.45 pp | The 2026 annual update moved 2026Q2 by about +0.6 pp. |

**AI-excess arithmetic.** I split it into composition and displacement.

1. **Composition.** AI capex is about $0.7T a year, about 2.3% of GDP. AI and cloud value added carries a labor share of about 0.25, against 0.53 for the sector. If AI-heavy activity adds about 1.5-2 pp to nonfarm business output by 2030, the shift lowers the share by 2 x (0.53 - 0.25) ≈ **-0.4 to -0.55 pp**.
2. **Displacement net of reinstatement.** Suppose about 2% of compensation-weighted tasks are automated by 2030, worth about 1.1% of output. Compute providers capture about 30% of the savings at a labor share of about 0.25. About half of the displaced pay reappears through reinstatement. Net: 1.1 x (1 - 0.3 x 0.25) x 0.5 ≈ **-0.5 pp**.
3. **Overlap.** The 2023-26 drift already contains some of this. Hence a combined median of about -0.55 pp on top of the trend, with a fat left tail.

**Correlation assumed.** One AI-strength factor z drives three things at once: a deeper AI excess, a lower recession probability (P = 0.38 - 0.10z) and boom-time margins. A strong-AI world is a no-recession, low-share world. An AI-bust world is a recession, high-share world. Because the two move together, **both tails get wider**.

**Multiplication** (200k draws, seed 7): P10 **49.8**, P50 **51.5**, P90 **53.4**, mean 51.5. The central value is 53.0 - 1.2 - 0.55 + 0.4 ≈ 51.6. Cross-checks:

- The implied 2026->2030 annual-average change is about -1.8 pp, or -0.45 pp/yr. That matches 2023->2026 (-0.43 pp/yr) and sits below the 1980-2019 rate.
- For scale, the essay's claim is the 1980-2020 decline (about 5.6-6.9 pp on my rebuild) in a decade. Pro rata to 2030 that is about -2.5 pp more than my drift. It lands at about **49.5, i.e. at my P10**.

**Model, directional only.**

- The model's sign agrees: every run falls.
- The **size by 2030 is small unless AI cognitive payoff is switched on**: -0.1 pp (baseline), -0.75 (ai-energy-boom), -1.9 (dc-fast-ai-payoff).
- The effect is **back-loaded**. In the payoff run, 2030 carries only about 14% of the 2036 shift (-1.9 of -14.0 pp). Even if the essay's mechanism is real, the model's diffusion arithmetic puts most of the transfer after the Q6 resolution year.
- I do not quote any model level.

**Model vs the baseline it contradicts.** The model's default path moves world labor share -0.11 pp over 2026-30. BLS's US measure fell about -0.9 pp over the last four quarters and -3.1 pp since 2022Q1. The model misses this drift because its labor share responds *only* to automation income. It has none of the following:

- markups or profit-margin cycles,
- sectoral composition (tech's low labor share),
- offshoring or a China shock,
- self-employment imputation.

That is also a different object (world, monetary-circuit closure). So I take the observed drift as the trend component, and the model only to sign and size the AI increment. I do not adopt its number.

## Q7: Indian IT big-5 headcount at 31 Mar 2029 >= 10% below 31 Mar 2026 (centre of gravity)

**Base, 31 Mar 2026** (company releases via press; sources disagree by a few thousand on HCLTech and Infosys):

| Company | 31 Mar 2026 | Source |
|---|---|---|
| TCS | 584,519 | [NiftyTrader / IANS](https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000) |
| Infosys | 328,594 | [Business Today](https://www.businesstoday.in/technology/story/infosys-headcount-falls-by-over-8400-in-q4-workforce-at-328594-527161-2026-04-23) |
| HCLTech | 223,889 | press; one source says a net +802 in Q4 and another says "cutting 3,292", unresolved |
| Wipro | 242,156 | [Business Today](https://www.businesstoday.in/technology/story/wipro-adds-135-employees-in-q4-attrition-eases-to-14-526016-2026-04-16) |
| Tech Mahindra | 147,623 | [Angel One](https://oga-prod.angelone.in/news/stocks/tech-mahindra-share-price-in-focus-headcount-falls-by-1-993-in-q4fy26-attrition-rate-eases) |

- **Sum at 31 Mar 2026 ≈ 1,526,800 (±~5k).** Threshold for Yes: 0.9 x that ≈ **1,374,100**.
- **Latest, 30 Sep 2026:** TCS 598,056 + Infosys 332,542 + HCLTech 230,339 + Wipro 236,328 ([People Matters](https://www.peoplematters.in/news/business/wipro-workforce-declines-28percent-sequentially-to-236328-in-q2-fy27-52773)) + Tech Mahindra 152,206 ([NewsBytes](https://www.newsbytesapp.com/news/business/tech-mahindra-hires-5446-in-q2-headcount-hits-152206/tldr)) = **≈1,549,500**. That is +1.5% above the base. From here a Yes needs **-11.3% in 10 quarters**, about **-4.7%/yr**.

**Decomposition.** Headcount = revenue / revenue-per-employee (RPE). Over three fiscal years:

ln(H29/H26) = Σ (g_rev − g_RPE). A Yes needs Σ ≤ ln 0.9 = −0.105, i.e. **g_rev − g_RPE ≤ −3.5%/yr for three straight years**.

| Component | Central | Spread | Basis |
|---|---|---|---|
| USD revenue growth | +3.5%/yr | AI pass-through: -1.2 pp per AI-sd. Macro factor: ±2.5 pp. Idiosyncratic sd 2 pp/yr. | Sector growth in low single digits in FY25-26 |
| RPE growth | +3.5%/yr | +1.2 pp per AI-sd; idiosyncratic sd 1.2 pp | FY26: revenue about +3% against headcount -0.5% ([IANS](https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000)) |
| Acquired staff | 25% chance of +0.5-3% | n/a | The resolver counts reported headcount, including acquisitions |

**Correlation.** The same AI factor raises RPE and deflates revenue, because clients take the productivity. That is ρ(g_rev, g_RPE) < 0, which **widens** the left tail. This is the essay's mechanism, priced explicitly.

**Physical check against the record.**

- The worst year in the record is FY24: about -67.5k, **-4.2%** (1,593k -> 1,526k, Mar 2023 -> Mar 2024, from the company totals).
- The worst three-year window, Mar 2023 -> Mar 2026, is also only **-4.2%**.
- A Yes needs FY24 repeated three times in a row, starting from a base that is currently *growing*: Wipro -6,716 in Jul-Sep 2026, but TCS +13.5k and TechM +5.4k.

**Multiplication** (200k draws, seed 7): P(ratio ≤ 0.90) = **16.5%**. The ratio's P10/P50/P90 is 0.87 / 1.00 / 1.16. I shade to **15** because the September print starts the path 1.5% above the base. The adapter **refuses** Q7, so no model input.

## Q1: Big-4 cash PP&E capex, R = CY2030 / CY2026

**Decomposition.** R = (capex intensity 2030 / intensity 2026) x (revenue 2030 / revenue 2026).

| Component | Central | Spread | Basis |
|---|---|---|---|
| Big-4 revenue CY2026 | ≈ $1.85T | n/a | CY2025 ≈ $1.6T: MSFT about $300B, GOOGL about $400B, AMZN about $715B, META about $200B |
| Cash PP&E purchases CY2026 | ≈ $650B | n/a | Below the $720-745B headline: Microsoft's guidance includes finance leases, which Q1 excludes |
| Intensity 2026 | ≈ 0.35 | n/a | $650B / $1.85T |
| Revenue CAGR 2026-30 | 12% | sd 3.5 pp on the AI factor + 2 pp idiosyncratic | n/a |
| Intensity 2030 | 0.30 (partial normalization) | Lognormal sd 0.30; ρ with the AI factor 0.6 | The pre-2023 norm was about 0.12-0.15. Telecom's 2000 peak was about 0.3-0.5. |

**Physical and financial walls for regime D** (R ≥ 4, about $2.6T in 2030):

- **Cash.** $2.6T against 2030 operating cash flow of about $1.1-1.3T leaves **≈$1.4T a year of external finance**.
- **Depreciation.** About $1.5-2T a year of D&A by 2032 needs about **$3-4T of AI revenue**, against world IT spend of about $5.5T.
- **Power.** At about $45B per GW all-in, $2.6T is **≈55-60 GW a year** of Big-4 capacity, close to total annual US generation additions.

D needs all three walls to give way at once.

**Multiplication** (200k draws, seed 11): A 22.5 / B 61.7 / C 15.5 / D 0.3. R's P10/P50/P90 is 0.81 / 1.35 / 2.23. I widen the upper tail a little because AI revenue could accelerate beyond my factor. That gives **A 22 / B 57 / C 19 / D 2**.

**Model (directional).** The model's DC-capex growth implies R of about 1.6 (baseline) to 2.1 (ai-energy-boom). Its closest proxy to the essay's line (dc-fast) gives about 3.8. **No run reaches 4**, and the model has no financing or stock-market bust, so it is silent on regime A.

**Where it contradicts the baselines.** Observed Big-4 capex roughly doubled in one year (2025->2026). The model's world composite grows about 13%/yr, from a level understated 2.5-3x. I adopt neither number. I use the model only to note that even the essay-proxy lever stays below R = 4.

## Q2: Epoch-estimated training cost >= $10B for a model published by 2028-12-31

**Decomposition.** C(max, Sep 2028) = C0 x g^t, then x P(Epoch has a primary cost estimate).

- **C0.** The most expensive Epoch-costed frontier model as of mid-2026 is "hundreds of millions". The [Dror Poleg tracker](https://www.drorpoleg.com/charts/frontier-cost/), built on Epoch data, says the cost is up "roughly tenfold since GPT-4 in 2023" and carries this caveat: "Estimates amortize hardware and energy over the run and carry substantial uncertainty." I take ln C0 ~ N(ln $0.55B, 0.35).
- **g.** Epoch measured **2.4x/yr (95% CI: 2.0x to 3.1x)** in amortized hardware plus energy ([Epoch](https://epoch.ai/blog/how-much-does-it-cost-to-train-frontier-ai-models)). The essay and preamble cite 3.5x. I take ln g ~ N(ln 2.6, 0.2).
- **t.** About 2.2 years. A model published by end-2028 has a training run ending around Q3 2028.

**Multiplication.**

- ln C = ln 0.55 + 2.2 ln 2.6 = 1.50, i.e. **$4.5B median**. sd = √(0.35² + 0.44²) = 0.56.
- Hitting $10B needs z = (2.30 - 1.50) / 0.56 = 1.42, so **P ≈ 7.8%**.
- Equivalently, it needs about **3.9x/yr** from $0.55B, which is above Epoch's 95% CI.
- Physical check: a $10B amortized run means a cluster worth roughly $60-100B running for 6+ months, i.e. a 2-3 GW site in operation in 2028.

**Adjustments.**

- × about 0.75 for Epoch having a primary cost estimate at the 2029-12-31 snapshot ("unknown" does not count).
- Plus about 3 pp for lumpiness: the frontier is the maximum across labs and can jump.

Net ≈ **9**. The adapter **refuses** Q2.

## Q3: LMArena top-10 distinct organizations all US/China on 2028-12-31

**Decomposition.** P(Yes) = Π over non-US/China contenders of P(not in the top 10 organizations).

- **Crowding.** There are about 8 US organizations (Google, OpenAI, Anthropic, xAI, Meta, Microsoft, Amazon, Nvidia, plus Thinking Machines and SSI by ultimate parent). There are about 11 Chinese ones (DeepSeek, Alibaba, Moonshot, Zhipu, ByteDance, Tencent, MiniMax, StepFun, Baidu, Xiaomi, Meituan). The 10th organization is therefore around overall rank 20-30.
- **Mistral today.** Mistral Large 3 was rank 91 in May 2026 ([DataLearner](https://www.datalearner.com/en/leaderboards/external/text-generation)). An October 2026 top-17 listing has no non-US/China organization ([developersdigest](https://www.developersdigest.tech/models/best-for/chat)). I could not read arena.ai directly (HTTP 403), so the current organization list is from secondary snapshots.

**Contender probabilities.**

| Contender | P(not in top 10) |
|---|---|
| Mistral, France | 0.88: needs a jump of about 60 ranks; €-scale compute |
| Cohere, Canada | 0.96 |
| A Gulf lab (G42, TII, MBZUAI) | 0.96 |
| A Japanese, Korean or Indian sovereign or industrial lab | 0.95 |
| Other, including a label or parent-reassignment surprise | 0.97 |

**Multiplication.** 0.88 x 0.96 x 0.96 x 0.95 x 0.97 = **0.75**, so **75**. The adapter **refuses** Q3.

## Q4: DefiLlama total stablecoin supply, 2028-12-31 ($B)

**Base.** I computed it from DefiLlama's API (`stablecoins.llama.fi/stablecoincharts/all`, summing all pegs):

- **$294B on 2026-11-08**, down from $305B on 2026-01-01.
- 2026 peak: $317B (17 May) on this sum. Press reported $322B from the dashboard ([Crypto Briefing](https://cryptobriefing.com/stablecoin-market-record-322-billion/)). That method gap is about 1.5%.
- **2026 has been flat-to-down**, even with GENIUS.

**Decomposition** of the end-2028 stock:

| Stream | 2026 stock | Central multiplier | End-2028 central |
|---|---|---|---|
| Crypto collateral and DeFi | ~$195B | Tracks crypto market cap with elasticity 0.7; crypto +30% central (post-April-2028-halving year) | **≈$235B** |
| Payments and EM dollar savings | ~$75B | ~25%/yr compounding, x1.6 | **≈$120B** |
| New regulated issuers after GENIUS takes effect (banks, fintechs, tokenized MMFs DefiLlama counts) | n/a | +$15-150B | **≈$45B** |

**Multiplication.**

- Central ≈ 235 + 120 + 45 = **$400B**.
- Bear: crypto -50%, which also happened in 2022-23, when supply fell 24% peak to trough. That gives 127 + 90 + 15 ≈ **$235B**.
- Bull: crypto x2.5, giving 400 + 165 + 150 ≈ **$715B**.

**P10 / P50 / P90 = 235 / 390 / 680.** The adapter **refuses** Q4: no money block.

## Q5: Fed announces a numerical yield ceiling or target (≥1-yr maturity) before 2031

**Decomposition.** P = Σ over trigger paths of P(path) x P(explicit yield number | path).

| Path | P(path) | P(YCC given path) | Product | Basis |
|---|---|---|---|---|
| (a) Zero-lower-bound recession by 2030 | 0.25 | 0.10 | 2.5% | The Fed studied and rejected YCC in 2020 |
| (b) Bond-market or fiscal stress | 0.30 | 0.12 | 3.6% | The 10y is at 5.17% (Sep 2026). A politically aligned post-Powell Fed chair raises the odds, but "a new Accord" talk has so far meant balance-sheet coordination, not yield caps |
| (c) Front-end target used as forward guidance | n/a | n/a | 1.5% | e.g. a 1-2 yr cap as in Australia 2020-21 |

Sum ≈ **7.6%, call it 7**.

**Model (directional).**

- World public debt/GDP in 2030 is 0.89 (baseline) to 1.07 (debt-populism). That is **far below the model's 150% fiscal-dominance trigger**, so the endogenous repression gap is 0 in every non-imposed run.
- The real safe rate drifts +0.2 to +0.8 pp. That is upward pressure, but not a regime break.
- Direction: no structural forcing toward a peg by 2030. The model has no Fed and no US-specific debt, so this caps nothing; it only means the model supplies no push toward Yes.

---

## Correlations across my answers (coherence checks)

1. **AI-strength factor.**
   - High: Q1 at C or D, Q6 low, Q7 more likely Yes, Q2 more likely Yes.
   - Bust: Q1 at A, a recession lifts Q6, and Q7 is ambiguous: revenue falls but RPE gains slow.
   - My joint numbers respect this: Q6 P10 (49.8) sits in the world where Q1 is C or D (21%) and Q7 is Yes (15%).
2. **Q5 and Q6 share the recession path (a).** A recession raises the 2030 labor share and is the likeliest YCC route. That path adds only about 2.5 pp to Q5.
3. **Q4 is largely orthogonal** to the labor block. It depends on the crypto cycle.

## Sources

- BLS, Productivity and Costs, Q3 2026 preliminary, 5 Nov 2026: https://www.dol.gov/newsroom/economicdata/prod2_11052026.pdf
- BLS TED, "Labor share at its lowest level, 52.8 percent in second quarter 2026" (pre-revision vintage; also the 58.9% 2020Q2 spike and the 66.2% 1960Q4 high): https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm
- FRED PRS85006173 / PRS85006172 (index and annualized % change), downloaded 2026-11-08: https://fred.stlouisfed.org/series/PRS85006173
- Indian IT headcounts: IANS ([link](https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000)), Business Today ([Infosys](https://www.businesstoday.in/technology/story/infosys-headcount-falls-by-over-8400-in-q4-workforce-at-328594-527161-2026-04-23), [Wipro](https://www.businesstoday.in/technology/story/wipro-adds-135-employees-in-q4-attrition-eases-to-14-526016-2026-04-16)), People Matters ([Wipro Q2 FY27](https://www.peoplematters.in/news/business/wipro-workforce-declines-28percent-sequentially-to-236328-in-q2-fy27-52773)), NewsBytes ([TechM Q2 FY27](https://www.newsbytesapp.com/news/business/tech-mahindra-hires-5446-in-q2-headcount-hits-152206/tldr)), Angel One ([TechM Q4 FY26](https://oga-prod.angelone.in/news/stocks/tech-mahindra-share-price-in-focus-headcount-falls-by-1-993-in-q4fy26-attrition-rate-eases)). These are press reports of company releases, not checked against the companies' datasheets.
- Epoch AI, training-cost trend, 2.4x/yr (95% CI 2.0-3.1x): https://epoch.ai/blog/how-much-does-it-cost-to-train-frontier-ai-models
- DefiLlama stablecoins API: https://stablecoins.llama.fi/stablecoincharts/all ; dashboard https://defillama.com/stablecoins
- LMArena secondary snapshots: https://www.datalearner.com/en/leaderboards/external/text-generation , https://www.developersdigest.tech/models/best-for/chat

## Final payload

## Seat: signals

**Numbers:** q1={'A': 15, 'B': 36, 'C': 38, 'D': 11} | q2=38 | q3=86 | q4={'p10': 225, 'p50': 345, 'p90': 580} | q5=5 | q6={'p10': 49.2, 'p50': 51.6, 'p90': 54.0} | q7=7

# E4 labor-distribution / signals (A3, Wave 1)

**BLUF.** The freshest telemetry has the US labor share falling about as fast as the essay needs. The BLS first print for 2026Q3 is 53.0%, a series low, with output +3.7% on hours +0.1%. Indian IT shows the opposite of the essay's "bottom K" collapse: the big-5 grew by 19,398 people in H1 FY27 and fresher onboarding is rising. So I put Q6 below today's level (P50 51.6) and Q7 at a low 7. Elsewhere the signals favour continued capex growth now, under visible funding strain. Stablecoin supply is stalled and falling. The Fed is hiking, not pegging yields. Every top-10 arena organization is in the US or China.

Forecast origin 2026-11-08. Lens: current telemetry only. Every figure below carries its source's caveat. Where I could not reach a primary page (DefiLlama and arena.ai both returned HTTP 403 to my fetch), I say so.

---

## Q6 (centre of gravity): BLS nonfarm business labor share, CY2030 annual average

### Signals

1. **2026Q3 first print: 53.0%, the series low.** BLS, *Productivity and Costs, Third Quarter 2026, Preliminary* (USDL 26-1631, 5 Nov 2026). The release says the labor share was "53.0 percent in the third quarter of 2026, the lowest level in the series, which begins in the first quarter of 1947" ([BLS release](https://www.bls.gov/news.release/archives/prod2_11052026.htm)).
   - Same release: productivity +3.6% (annualized), output +3.7%, hours +0.1%, hourly compensation +2.9%, real hourly compensation +1.1%, unit labor costs -0.7%. Over four quarters, productivity is +2.1% and ULC +2.4%.
   - **Caveat, verbatim from BLS:** the third estimate of quarterly productivity growth has differed from the first by "-1.1 to +1.4 percentage points about 80 percent of the time." The revised Q3 release is due 8 Dec 2026.
   - **Caveat:** "Data in this release reflect the 2026 Annual Update of the National Income and Product Accounts" (BEA, 30 Sep 2026). Levels across vintages are therefore not strictly comparable.
2. **The preamble's 2026Q2 = 52.8% is now stale and its revision is unverified.** BLS TED gave "52.8 percent in the second quarter of 2026, the lowest level ever recorded" ([BLS TED](https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm)).
   - TheStreet says Q2 "was first reported at 52.9% and revised up to 53.3%" ([TheStreet Pro](https://pro.thestreet.com/market-commentary/q3-productivity-hands-fed-doves-some-ammo-but-workers-share-hits-a-record-low)). Two problems: the 52.9% first print conflicts with BLS's 52.8%, and the BLS Q3 release text I read gives no revised Q2 labor share. **I treat 53.3% as unverified.**
   - What is verified: Q2 productivity was revised up 0.7pp to 2.1%, Q2 ULC up to 1.9%, and Q2 real hourly compensation to -1.9%. Upward ULC revisions are consistent with an upward labor-share revision.
3. **Path of first prints.**
   - 2025Q2 54.6%, 2025Q3 53.8% ("lowest level on record"; 2020s average so far 55.6%) ([Bloomberg Law](https://news.bloomberglaw.com/daily-labor-report/labors-share-of-us-gdp-drops-to-record-low-in-data-back-to-1947); paywalled excerpt, truncated mid-sentence).
   - 2026Q1 53.6% ([Fortune](https://fortune.com/2026/09/04/ai-productivity-labor-share/)), 2026Q2 52.8%, 2026Q3 53.0%.
   - TED chart values: 2019 quarters 57.3 / 56.6 / 55.9 / 56.3, and a 2020 spike to 58.9. The TED page "does not discuss revisions or other measurement limitations."
   - Implied pace: about -0.45pp/yr from 2019 to 2026 and about -0.8pp/yr over the last year (mixed vintages).
4. **Wedge between productivity and real pay.** Indeed Hiring Lab sets Q4 2019 = 100: productivity is 116 and "real hourly compensation reached 107.3" ([Hiring Lab](https://hiringlab.indeed.com/2026/11/05/q3-2026-productivity-and-costs/)). Its caveats, verbatim:
   - "Productivity growth can be very noisy quarter-to-quarter"
   - "the productivity data show steady improvement rather than dramatic acceleration"
   - "an AI-driven sea change in efficiency gains has not yet shown up clearly in the data"
5. **Attribution is contested; do not read the fall as AI.**
   - EY-Parthenon's Daco: the productivity gains largely predate the AI boom.
   - ZipRecruiter: displacement "is not the primary force behind the decline in labor share" ([ZipRecruiter Research](https://www.ziprecruiter-research.org/economic-insights-research/the-unproven-promise-of-ai)).
   - Texas A&M's Robertson expects unemployment to rise and margins to expand (quoted in [Fortune](https://fortune.com/2026/09/04/ai-productivity-labor-share/)).
   - These are commentary, not estimates. None carries an interval.
6. **Measure caveat (TheStreet, paraphrasing BLS):** the series covers only the nonfarm business sector on gross value-added output, and it "runs lower than economywide measures based on national income, though the direction is consistent."
7. **Cyclical counter-signal.**
   - The Fed raised rates 25bp on 16 Sep 2026 (12-0) and held at 3.75-4.00% on 28 Oct, with Cook and Hammack dissenting for another hike ([FOMC statement](https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm)).
   - The 10-year yield is near 5%.
   - The labor share rose in every recent recession (58.9% in 2020). A 2029-30 downturn is the main upside tail.

### Reading

The last 12 months of first prints run at about -0.8pp/yr, and the 2019-26 drift at about -0.45pp/yr. Those give a 2030 average of 49.8-51.5 from a 2026 base near 53.2. Annual NIPA revisions have moved recent levels by up to about 0.5pp, and a recession year would add 1-3pp. Signals put the mass below today's level, with a fat right tail.

**Q6: P10 49.2 / P50 51.6 / P90 54.0.**

### Resolution audit (Q6): needs a ruling

- **No published annual average was found.** BLS states the percent labor share quarterly (in the release text and in TED). The TED page "provides no annual averages."
  - The question asks for "the calendar-2030 annual average ... as published in Productivity and Costs". That figure may not exist as a published number.
  - Proposed ruling: the mean of the four 2030 quarterly values in the first release containing 2030Q4 (the preliminary Q4 release, about early Feb 2031). That release gives a single vintage.
  - Do not average each quarter's own first print. That mixes vintages.
- **The vintage rule interacts badly with annual NIPA updates.** The 2026Q2 value already has three reported numbers: 52.8 (BLS), 52.9 (TheStreet "first report") and 53.3 (TheStreet "revised", unverified).

---

## Q7 (centre of gravity): big-5 Indian IT headcount, 31 Mar 2029 at least 10% below 31 Mar 2026

### Base, reconstructed from company-level press figures

| Company | 31 Mar 2025 | 31 Mar 2026 | 30 Jun 2026 | 30 Sep 2026 |
|---|---|---|---|---|
| TCS | 607,979 | 584,519 | 593,798 (+9,279) | 598,056 (+4,258) |
| Infosys | 323,578 | 328,594 (20-F) | 328,062 (-532) | 332,542 (+4,480) |
| HCLTech | 223,420 | 227,181 | 223,889 (-3,292) | 230,339 (+6,450) |
| Wipro | 233,346 | 242,156 | 243,044 (+888) | 236,328 (-6,716) |
| Tech Mahindra | 148,731 | 147,623 | 146,760 (-863) | 152,206 (+5,446) |
| **Combined** | **1,537,054** | **1,530,073** | 1,535,553 (+5,480) | **1,549,471 (+13,918)** |

The **YES threshold is 1,377,066 or fewer at 31 Mar 2029**. From the Sep 2026 level that is a fall of 172,405 (-11.1%) in 10 quarters.

How the table was built:
- The March 2026 values are derived as the June 2026 level minus the Q1 change.
- The Infosys March 2026 figure is from its [20-F](https://www.sec.gov/Archives/edgar/data/0001067491/000119312526270520/infy-20260331.htm).
- The quarterly changes come from [Lapaas Voice / Moneycontrol](https://lapaasvoice.com/tcs-infosys-hcltech-wipro-and-tech-mahindra-add-13918-employees-in-q2-fy27), [Outlook Business](https://www.outlookbusiness.com/news/infosys-headcount-falls-by-532-employees-in-jun-quarter), [StartupFeed](https://startupfeed.in/tcs-adds-9279-jobs-q1-fy27/) and [The People's Board](https://www.thepeoplesboard.com/news/hcltech-workforce-declines-by-3292-in-april-june-quarter/).
- The March 2025 values are from company FY25 releases as reported in the press.

### Signals

1. **FY26 was a small decline.** Secondary sources disagree on its size: -7,389 ([IANS](https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000)) against -6,981 ([Multibagg](https://www.multibagg.ai/market-pulse/articles/indian-it-job-cuts-fy26-cmrjjp4vp00chpc0kd736jt6l); it matches my reconstruction).
   - [NiftyTrader](https://www.niftytrader.in/markets/tcs-cuts-12000-jobs-as-top/) is internally inconsistent. It gives TCS at "-12,000" in the headline and "+2,356" in the body, and its company figures do not sum to its total. It should not be relied on.
   - Even the larger figure is -0.5%.
2. **H1 FY27 reversed the decline.** Net change was +19,398 (Q1 +5,480, Q2 +13,918).
   - Caveat (Lapaas, citing Moneycontrol): the stated H1 total of 24,398 "does not match" Q1 + Q2 = 19,398.
   - Caveat, verbatim: these are net, not gross, figures, and Wipro's fall "should not automatically be interpreted as 6,716 layoffs."
3. **Fresher pipeline is reopening.**
   - TCS onboarded about 24,000 freshers in H1. A separate report gives a FY27 plan of about 25,000, against 44,000 the year before.
   - Infosys is keeping a 20,000-graduate FY27 target, over half done.
   - HCLTech expects "approximately 10,000-11,000 freshers" in FY27.
   - Training "can take up to nine months before they become billable" ([PolicyCircle](https://www.policycircle.org/industry/india-it-hiring-slowdown/)).
4. **Revenue pressure (pushes toward YES).**
   - Infosys cut FY27 constant-currency guidance to 1-2%.
   - TCS reports $3.1B annualized AI revenue. Commentary frames AI as repricing the core business ([Wright Research](https://www.wrightresearch.in/blog/what-happens-to-indian-it-when-ai-reprices-its-core-business/)).
   - AI-related IT hiring is +16% YoY against overall IT hiring -3% (June 2026; single-outlet figure).
5. **Worst-case macro projection.** NITI Aayog's *Roadmap for Job Creation in the AI Economy* (with Nasscom and BCG) gives "15 and 20 lakh jobs over the next five years" ([Free Press Journal](https://www.freepressjournal.in/tech/indian-it-sector-job-loss-15-to-20-lakh-ai-niti-aayog)). Its caveats, verbatim:
   - It is framed as worst case: tech-services headcount "could fall from 7.5–8 million in 2023 to 6 million by 2031."
   - "over 60 percent of formal sector jobs are susceptible to automation by 2030" describes exposure, not confirmed losses.
   - "up to 4 million new AI-enabled jobs could be created" if India adopts a coordinated approach.
   - No methodology is given in the article.
   - Even that worst-case pace (about -3%/yr) gives roughly -8 to -9% over three years, short of -10%.
6. **Sector aggregate is still growing.** Nasscom reports FY26 industry headcount of about 5.9-5.95M, a net +135,000 ([The Star](https://www.thestar.com.my/tech/tech-news/2026/02/24/india039s-technology-sector-to-expand-6-to-315-billion-in-fiscal-2026-industry-body-says)).

### Reading

The worst observed big-5 year was FY24, at about -4%. A YES needs about -11% from today's level within 10 quarters, starting from positive momentum and a reopened fresher pipeline. The telemetry points the wrong way for YES. The live path to YES is a 2027-28 AI-pricing shock that forces TCS-scale cuts (2-3% of headcount) at all five firms in successive years, with fresher intake cut back to FY24 levels.

**Q7: 7.**

### Resolution audit (Q7): needs a ruling

- **"an acquired firm's staff count."** is a sentence fragment. Does it mean acquired staff are included in the March 2029 figure? (The natural reading: yes, as reported.) Or is a firm acquired after March 2026 to be backed out? That matters at the margin if HCLTech or TechM make a large acquisition. **Needs a ruling.**
- The March 2026 base is not published anywhere as a combined figure. Secondary totals disagree (-7,389 vs -6,981 for FY26). The resolver should rebuild it from the five company releases; my reconstruction gives 1,530,073.
- Definitions differ by company. Some figures include subsidiaries and BPO, and contractors are excluded throughout. This is harmless if each company is read consistently over time.

---

## Q1: Big-4 capex, R = CY2030 / CY2026 (lock basis: cash purchases/additions of PP&E, ex finance leases, gross of incentives)

### Signals

Q3 2026 cash PP&E, per [Luminix](https://www.useluminix.com/reports/industry-analysis/hyperscaler-capex-q3-2026) (a secondary compilation from filings; its caveat: "The four figures are not directly comparable"):

| Company | Q3 2026 cash PP&E | YTD | 2026 guidance | 2027 commentary |
|---|---|---|---|---|
| Microsoft (FQ1 FY27) | $39.367B; management's capex figure of $45.2B includes $7.4B finance leases | n/a | about $170B CY | FQ2 capex incl. leases guided above $50B; "accelerate in the second half"; "We still have demand that exceeds supply" |
| Alphabet | $51.355B | $131.953B (9M) | $195-205B | will "increase significantly", details on the Q4 call |
| Amazon | $77.259B gross ($75.9B net of $1.381B proceeds/incentives) | $175.670B gross (9M) | about $220B cash | "spend meaningfully more in 2027" |
| Meta | $33.942B purchases (+$0.964B finance-lease principal) | $83.055B (9M) | $135-145B incl. leases | budget still in development |

- **CY2026 on the lock basis is about $690-720B, not $720-745B.** The preamble's headline figure includes finance leases (Microsoft, Meta) and is net of incentives (Amazon), so it is not on the lock basis.
- **Funding strain (the classic late-cycle tell):**
  - Alphabet Q3 FCF was -$9.1B. It raised $28.7B of notes and sold $12.4B of stock through an at-the-market program, with zero buybacks year to date.
  - Amazon TTM FCF is -$42.4B, and its long-term debt rose from $65.6B to $173.1B in nine months.
  - Meta Q3 FCF was -$2.1B. It announced up to $95B of stock sales, carries $68.4B of maximum loss exposure in data-centre JVs, and has about $825B of commitments.
  - Microsoft priced $25B of notes.
  - Consensus 2027 is about $935B across the four ([Luminix](https://www.useluminix.com/reports/industry-analysis/hyperscaler-capex-q3-2026); aggregator figure, not company guidance).
- **Rates are rising, not falling:** the Fed hiked in September and the 10-year is near 5%.

### Reading

Near-term momentum is unambiguous: 2027 is likely +25-35%. The funding mix is shifting from internal cash to debt and equity at all four firms within one year. Telemetry cannot see 2030, so I spread the mass between B and C. A gets real weight because external financing is now the marginal source. D is thin because it needs about 41%/yr for four years on top of already-negative FCF.

**Q1: A 15 / B 36 / C 38 / D 11.**

Audit: "Finance leases and incentives are excluded" is ambiguous for Amazon. "Excluded" could mean not netted (use the gross purchases line, $77.259B) or netted out ($75.9B). The gap is about 2%, so it is only material near a band edge. I read it as gross.

## Q2: Epoch training cost of at least $10B for a model published by 2028-12-31

### Signals

- **Trend.** Epoch: "The cost to train frontier language models has increased by 3.5×/year since 2020." 90% CI 2.8×-4.4× (0.4-0.6 OOM/yr). Page updated 5 Feb 2026 ([Epoch Trends](https://epoch.ai/trends)).
- **Largest Epoch-estimated cost I found.** Grok 4 at a $490M median, about 246M H100-hours (published 12 Sep 2025, via secondary write-ups citing Epoch; [CloudZero](https://www.cloudzero.com/blog/cost-to-train-ai-model/)).
  - I found no Epoch estimate above $1B. The "$1B runs in 2026" figure remains unconfirmed.
  - Secondary 2026 per-model figures (e.g. [Capital & Compute](https://capitalandcompute.net/blog/what-it-costs-to-train-ai-models-2026/)) are not Epoch's, and that post itself says labs keep costs confidential.
- **Arithmetic.**
  - From $0.49B (mid-2025) to $10B by end-2028 needs about 2.4×/yr. That is below the bottom of Epoch's 90% CI.
  - The largest known cluster (Colossus 2, about 1.1M H100e per Epoch) supports runs in the low billions on an amortized basis.
  - $10B in 2028 needs a multi-GW cluster dedicated to one run for 3-5 months.
- **Strain signal (from Q1).** Hyperscaler funding has turned external, which raises the cost of capital for the very largest runs.

### Reading

The trend says yes. The resolver's frictions say often not: closed labs disclose little, Epoch marks many frontier costs "unknown", estimates are made with a lag, and medians carry wide intervals.

**Q2: 38.**

Audit: Epoch's cost fields have historically been reported in constant dollars (for example "2023 USD"), not nominal. The question specifies nominal USD. By 2028 that is a 10-15% gap, which matters only near $10B. **Ruling needed:** use Epoch's primary figure as published, whatever the dollar year.

## Q3: all ten top distinct organizations on LMArena are US or PRC (2028-12-31)

### Signals

- **Third-party snapshot dated 8 Nov 2026** ([BenchLeader](https://www.benchleader.com/benchmarks/lmarena_text)). The top 10 distinct organizations by best model are Google, Meta, Anthropic, Moonshot AI, OpenAI, Alibaba, Zhipu AI, Xiaomi, DeepSeek and SpaceXAI. That is 10/10 US or PRC today.
  - Caveat: this uses "only the 60 rows shown on the page", and the page does not state headquarters.
  - Another aggregator ([Swfte](https://www.swfte.com/lmarena)) orders the top models differently, so treat exact ranks as unsettled.
- **No non-US/PRC organization is visible near the top.** Mistral Large 4 (open weights, 29 Oct 2026) ranks only seventh among open models ([Wikipedia, Mistral AI](https://en.wikipedia.org/wiki/Mistral_AI); aggregator claims). Cohere, AI21, Sakana, Upstage, LG and Naver do not appear in the visible rows.
- **Bench depth.** US and PRC organizations fill ranks 11-20 as well (Amazon, Microsoft, ByteDance, Tencent, MiniMax and others). Displacing the tenth organization takes a non-US/PRC lab beating that whole bench.

**Q3: 86.**

### Resolution audit (Q3): needs a ruling

- **lmarena.ai now 301-redirects to arena.ai** (renamed "Arena"). The fallback clause ("closest successor by the same publisher") covers this, but the question text names lmarena.ai. **Needs an explicit ruling** that arena.ai's Text leaderboard is the resolver.
- arena.ai returned HTTP 403 to my fetch, so I verified only through aggregators.
- A **dated snapshot for 2028-12-31** must be retrievable. The live board changes daily; the resolver should name an archive (Wayback, or Arena's published leaderboard dataset).
- Organization labels as published sometimes split one parent (for example "Google" vs "Google DeepMind"). The ultimate-parent rule should merge them before counting ten distinct organizations.

## Q4: DefiLlama total stablecoin market cap on 2028-12-31

### Signals

- **Current level and trend.** About $290.1B on 8 Nov 2026 (USDT about $176.8B, USDC about $70.6B), with a 7-day change of -2.23% and a 30-day change of -4.86%. These are search-surfaced DefiLlama values; [defillama.com/stablecoins](https://defillama.com/stablecoins) returned 403 to my fetch.
  - $294.62B on 6 Nov ([TokenPost](https://www.tokenpost.com/news/investing/50082)).
  - $295.21B on 5 Nov ([The Central Bulletin](https://thecentralbulletin.com/intelligence/statistics/stablecoin-statistics/)).
- **Drawdown.** The peak was about $322.1B in mid-May 2026, and June alone lost about $11.4B.
  - Analysts attribute it to USDT/USDC redemptions, tokenized Treasuries (about $17B) drawing "yield-seeking cash off stablecoins" under GENIUS Act rules, and USDe yield compression ([crypto.news](https://crypto.news/stablecoin-market-loses-10b-as-crypto-liquidity-quietly-contracts/); [Crystal Intelligence](https://crystalintelligence.com/stablecoin/what-drove-the-stablecoin-supply-down/)).
  - Caveat from my search: "no single catastrophic event". Some articles' dates could not be confirmed as 2026.
  - The drawdown, about -10% from peak, remains far below the 2022 contraction of about -26%.
- **Year on year.** About -6% (end-2025 about $308B). The 2025 rate was about +50%.

### Reading

Momentum has stalled. Upside depends on GENIUS-regime bank and fintech issuance switching on in 2027-28. The yield prohibition is pushing cash into tokenized money-market products, which DefiLlama does not count as stablecoins.

**Q4: P10 225 / P50 345 / P90 580** (USD bn).

Audit: the resolver is readable as written. The DefiLlama definition of what counts as a stablecoin can change (for example by adding or delisting yield-bearing dollars). The vintage rule (first publication) is awkward for a live dashboard; the resolver should snapshot it on the date.

## Q5: Fed numerical yield ceiling or target at maturity of 1 year or more before 2031

### Signals

- **The FOMC is tightening.** Up 25bp on 16 Sep 2026; held at 3.75-4% on 28 Oct, 10-2, with **two dissents for a further hike**. The statement says nothing about Treasury purchases or yields beyond "maintaining ample reserves" ([FOMC](https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm)).
- **Yield management is on the Treasury side and excluded.** Treasury raised the buyback maximum "from $2 billion to at least $4 billion", aimed at 10-30 year maturities, "formally aimed at improving market liquidity". No numeric yield goal was stated ([CNBC](https://www.cnbc.com/2026/08/19/bessent-treasury-buybacks-yields-warsh-fed.html)). Buybacks are explicitly excluded.
- **The "de facto accord" claim is one economist's suspicion.** Brookings' Robin Brooks: "What's happening is yield curve management". [Fortune](https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/) presents this as his opinion, not a documented fact, and cites no official statement on yield targets.
- **Balance-sheet preference.** Warsh reportedly prefers a smaller balance sheet tilted to bills ([CNBC](https://www.cnbc.com/2026/08/20/bessent-warsh-fed-bond-market-treasury-yields.html)). That is the opposite of a long-end peg.

### Reading

The telemetry shows pressure for yield suppression through Treasury tools and a Fed leaning the other way. The only explicit-YCC path is a crisis.

**Q5: 5.**

Audit: readable as written. One edge case: a facility that caps a yield implicitly, such as a standing purchase at a stated price, should count only if a numerical yield level is announced. The question already says so.

---

## Consolidated

## Seat: bayes

**Numbers:** q1={'A': 54, 'B': 32, 'C': 11, 'D': 3} | q2=38 | q3=74 | q4={'p10': 225, 'p50': 360, 'p90': 620} | q5=6 | q6={'p10': 49.9, 'p50': 51.8, 'p90': 53.9} | q7=7

# E4 labor-distribution / bayes (A4, Wave 2)

**BLUF.** I start from the E4 outside-view's base rates and update on E4's fermi and signals seats. Q6 moves down: the 2026Q3 first print re-bases the start to 53.0%, and the update leaves a 2030 median of **51.8%** (P10 49.9 / P90 53.9). Q7 stays at **7%**. Indian IT's net hiring in H1 FY27 and the reopened fresher pipeline offset the revenue-pressure signals. Q3 rises to 74 on a verified, dated all-US/PRC top ten. Q2 rises to 38 on Epoch's newer 3.5x/yr trend. Q4 falls to a $360B median after the stall and drawdown. Q1 and Q5 barely move, because their signals cancel. **No single signal in this packet earns a likelihood ratio above about 2:1.** Every posterior here is a stack of weak, partly correlated evidence, and the tables below show which LRs are below 2:1 and which overlap.

Lens rules I follow:

- **Prior.** The prior is the E4 outside-view seat's number (q1 A52/B30/C13/D5, q2 33, q3 55, q4 260/410/720, q5 5, q6 50.0/52.0/54.1, q7 7). It is corrected only for arithmetic errors in its anchors (Q4 and Q6 levels), and only where the outside-view seat's own anchor was wrong. Those corrections are stated as re-bases, not as likelihoods.
- **Evidence.** The evidence is only E4's fermi and signals seats. I made one web check of a signal caveat (the BLS release text, below).
- **LR convention.** LR = P(signal | H) / P(signal | not H). For multi-bin questions I give an LR per bin, relative to a common base. "Weak" marks any LR that cannot be justified above about 2:1, or below 1:2 when inverted.
- **Fermi outputs.** The fermi seat's model outputs are treated as evidence only where they carry an observation the prior lacks. Its assumed parameters are not data, and I do not count them twice.

Caveat check (web, 2026-11-08): the [BLS Q3 2026 preliminary release](https://www.bls.gov/news.release/archives/prod2_11052026.htm) confirms the labor share "was 53.0 percent in the third quarter of 2026, the lowest level in the series, which begins in the first quarter of 1947". It confirms "Data in this release reflect the 2026 Annual Update of the National Income and Product Accounts (NIPA)", with output-related measures "revised back to 2021". It confirms "the third estimate of nonfarm business sector quarterly labor productivity growth has differed from the first estimate by -1.1 to +1.4 percentage points about 80 percent of the time." The release **gives no revised 2026Q2 labor share**, so the fermi seat's 53.4 and TheStreet's 53.3 are both derived or unverified.

---

## Q6: BLS nonfarm business labor share, CY2030 average (centre of gravity)

### Prior and re-base

The outside-view distribution of change is: quarter t to the annual average of quarters t+14..t+17, 1947-2026 and 1980-2026 blended, giving **Δ: P10 -2.6 / P50 -0.6 / P90 +1.5**. Its caveat: "the windows overlap heavily, so there are only about 19 (or 11) independent four-year windows. The tails are therefore poorly pinned down."

**Arithmetic re-base, not an LR.** The outside-view scaled the *current-vintage* index to the *old-vintage* 52.8 for 2026Q2 and so put 2026Q3 at about 52.4. BLS prints 2026Q3 = **53.0** in the current vintage. 2026Q3 to calendar 2030 is exactly quarters +14..+17, so I anchor Δ at 53.0. That is +0.4 pp against the outside-view's 52.6 anchor.

I split Δ into three bins, fitted to the prior's quantiles (lower sd 1.56, upper sd 1.64):

| Bin | Δ range | Prior |
|---|---|---|
| H_fall | Δ < -1.5 | 0.28 |
| H_drift | -1.5 ≤ Δ < 0 | 0.36 |
| H_rise | Δ ≥ 0 | 0.36 |

### Likelihood ratios

| # | Signal (seat) | LR fall : drift : rise | Justification | Flag |
|---|---|---|---|---|
| S1 | Recent pace: 53.9 → 53.0 over the four quarters to 2026Q3 (fermi rebuild); -3.1 pp since 2022Q1; 2019-26 about -0.45 pp/yr (signals, "mixed vintages") | 1.3 : 1.1 : 0.8 | Four-year labor-share changes are persistent only weakly. The outside-view's own record-low subclass (27 quarters) "splits evenly": 1960s-90s lows rebounded, 2003-10 lows kept falling. Momentum earns little. | **Weak** (fall/rise 1.6) |
| S2 | Wedge between productivity and real pay: productivity 116 vs real hourly compensation 107.3 (Q4 2019 = 100, Indeed Hiring Lab). Caveats verbatim: "Productivity growth can be very noisy quarter-to-quarter"; "the productivity data show steady improvement rather than dramatic acceleration"; "an AI-driven sea change in efficiency gains has not yet shown up clearly in the data" | 1 : 1 : 1 | The same information as S1: the wedge *is* the share decline. | Double count, set to 1 |
| S3 | Attribution contested: ZipRecruiter says displacement "is not the primary force behind the decline in labor share"; Daco says the gains predate AI; Robertson expects margins up. Commentary, "None carries an interval." | 1 : 1 : 1 | Whether the cause is AI or markups and composition does not change the forward drift distribution I can defend. | Unjustifiable ≠ 1 |
| S4 | Cyclical: Fed hiked 25 bp on 16 Sep 2026 and held 3.75-4.00% with two hawkish dissents; 10y near 5%. The share rose in every recent recession (58.9% in 2020Q2). | 0.9 : 1.0 : 1.1 | Tightening raises P(a recession weights the 2030 average) a little above the base rate already in the prior (fermi uses 0.38). A recession adds about +1.4 pp. | **Weak** |
| S5 | Composition from AI capex (fermi): about $0.7T/yr of AI capex (~2.3% of GDP), whose value added carries a labor share of about 0.25 against 0.53. That gives -0.4 to -0.55 pp by 2030. Displacement net of reinstatement is about -0.5 pp. Overlap with the trend is removed: -0.55 pp median. | 1.4 : 1.05 : 0.75 | The capex level is observed; the share differential is a measured sector fact. A -0.5 pp shift of the prior moves the bin masses by about these ratios (P(Δ<-1.5) 0.28 → 0.40; P(Δ≥0) 0.36 → 0.25). The size is an assumption (lognormal sd 0.8). | **Weak** (fall/rise 1.9, just under 2:1) |
| S6 | Model adapter, directional only: every run falls, -0.1 to -1.9 pp in world labor share by 2030. The adapter calls it "not comparable to BLS 52.8%". | 1 : 1 : 1 | A different object (world compensation/GDP). Its sign duplicates S5. | Inadmissible beyond sign; set to 1 |
| S7 | Vintage noise: the 2026 NIPA annual update moved 2026Q2 by about +0.5-0.6 pp. The release says levels "were revised back to 2021". | n/a | Widens; no direction. | Variance term, sd 0.45 |

### Posterior arithmetic

| | fall | drift | rise |
|---|---|---|---|
| Prior | 0.28 | 0.36 | 0.36 |
| LR product (S1 × S4 × S5) | 1.3×0.9×1.4 = 1.638 | 1.1×1.0×1.05 = 1.155 | 0.8×1.1×0.75 = 0.660 |
| Prior × LR | 0.4586 | 0.4158 | 0.2376 |
| **Posterior** (÷1.112) | **0.412** | **0.374** | **0.214** |

**Refitting a normal on Δ.**

- P(Δ<-1.5) = 0.412 gives z = -0.223. P(Δ<0) = 0.786 gives z = +0.793.
- That gives sd = 1.5/1.016 = **1.48** and median = -1.5 + 0.223 × 1.48 = **-1.17**.
- Adding revision noise in quadrature: √(1.48² + 0.45²) = 1.54. I split it 1.50 below and 1.62 above, which keeps the prior's mild right skew from recession tails.
- P10 = -1.17 - 1.2816 × 1.50 = -3.09. P90 = -1.17 + 1.2816 × 1.62 = +0.91.

From 53.0: **P10 49.9 / P50 51.8 / P90 53.9.**

Sense check: the fermi seat says the essay's pro-rata claim lands at about 49.5. That sits just below my P10, which puts about 8-9% on the essay's pace by 2030.

**Q6 resolver note** (from signals; I agree): BLS publishes the percent share quarterly; "The TED page provides no annual averages." I read the resolver as the mean of the four 2030 quarters in the first release that contains 2030Q4.

---

## Q7: Indian IT big-5 headcount, 31 Mar 2029 ≥10% below 31 Mar 2026 (centre of gravity)

**Prior.** The outside-view blend is 2/3 × about 4% (the aggregate's own record: 0 of about 25 three-year windows at -10%, Laplace) plus 1/3 × about 17% (single mature firms), which gives about **8%**. The seat then shaved 1 point for the Sep 2026 level being above base. **I undo that shave and use 8% (odds 0.0870)**, so that momentum enters once, as S7.1 below.

**Arithmetic.**

- Base, 31 Mar 2026: 1,530,073 (signals' reconstruction; fermi has 1,526,800 ±5k).
- 30 Sep 2026: 1,549,471.
- Threshold: ≤ about 1,377,066, i.e. -11.1% in 10 quarters (about -4.6%/yr) from today.
- The worst year on record is FY24, about -4.2%.

### Likelihood ratios (H = Yes)

| # | Signal (seat) | P(s\|Yes) | P(s\|No) | LR | Flag |
|---|---|---|---|---|---|
| S7.1 + S7.2 (joint) | H1 FY27 net +19,398 (Q1 +5,480, Q2 +13,918). Caveat: Lapaas notes the stated H1 total of 24,398 "does not match". Figures are net, and Wipro's fall "should not automatically be interpreted as 6,716 layoffs". **Plus** fresher intake reopening: TCS about 24k in H1, Infosys a 20k target, HCLTech "approximately 10,000-11,000". Freshers "can take up to nine months before they become billable". | ~0.27 | ~0.54 | **0.50** | **Weak**, under 1:2. The two overlap: H1 freshers sit inside the net adds, so I price them jointly, not 0.6 × 0.75. |
| S7.3 | Revenue pressure: Infosys FY27 cc guidance cut to 1-2%; "AI reprices the core business" commentary; IT hiring -3% YoY against AI-related hiring +16% (single outlet, June 2026) | 0.85 | 0.55 | **1.5** | **Weak.** Low-single-digit growth has been the norm since FY24 in No worlds too. |
| S7.4 | NITI Aayog/BCG worst case: 7.5-8M → 6M by 2031. Caveats verbatim: "over 60 percent of formal sector jobs are susceptible to automation by 2030" is exposure, not confirmed losses; "up to 4 million new AI-enabled jobs could be created"; no methodology in the article. Even this pace gives about -8 to -9% over three years. | n/a | n/a | **1.0** | A scenario, not an observation |
| S7.5 | Nasscom: FY26 sector headcount about 5.9-5.95M, net +135,000 | 0.6 | 0.67 | **0.9** | **Weak.** The big-5 can shrink while GCCs and mid-tier firms grow. |
| S7.6 | Revenue-per-employee decoupling (fermi, from IANS): FY26 revenue about +3% against headcount -0.5%, so RPE is about +3.5% | 0.8 | 0.6 | **1.3** | **Weak.** Partly overlaps S7.3 (revenue), but RPE is a separate margin. |
| S7.7 | Fermi Monte Carlo, P = 16.5% → 15 | n/a | n/a | **1.0** | Driven by assumed persistent AI-factor sd (±1.2 pp on both revenue and RPE for three years). That is an assumption, not data. |

**Posterior.**

- Odds: 0.0870 × 0.50 × 1.5 × 1.0 × 0.9 × 1.3 × 1.0 = 0.0870 × 0.8775 = **0.0763**.
- P = 0.0763 / 1.0763 = **7.1%**, so **7**.

**Sensitivity.** The fermi seat's strongest point against my prior is real. The aggregate's growth-era record (0 of 25) is not exchangeable with a flat-mean era, and a mean near 0 with a three-year sd of 8-10 pp gives about 8-13%. Starting from a 12% prior, the same LRs give 10.7%. I report 7 because the lens takes the outside-view prior as given.

**Resolver note** (signals; agreed): "an acquired firm's staff count." is a fragment. I read it as reported headcount including acquisitions.

---

## Q1: Big-4 cash PP&E capex, R = CY2030/CY2026

**Prior:** A 52 / B 30 / C 13 / D 5. This is about 12 reference cases of sector capex four years after a year of at least 50% growth, plus the live case.

| # | Signal (seat) | LR A : B : C : D | Justification | Flag |
|---|---|---|---|---|
| S1.1 | Forward guidance: Alphabet will "increase significantly", Amazon will "spend meaningfully more in 2027", Microsoft "accelerate in the second half" and "We still have demand that exceeds supply". Aggregator consensus 2027 about $935B (Luminix: "aggregator figure, not company guidance"). | 0.5 : 0.75 : 0.9 : 0.95 | An A world with 2027 at about 1.3x needs 2030 ≤ 0.77 × 2027. That is common after a 2027 peak (telecom fell 46% in 2000-02; semiconductors fall 30-40%), but an A world is less likely to show this guidance than a C world. | **Weak** (C/A 1.8) |
| S1.2 | Funding strain: Alphabet Q3 FCF -$9.1B, $28.7B notes, $12.4B ATM equity, zero buybacks; Amazon TTM FCF -$42.4B, LTD $65.6B → $173.1B; Meta Q3 FCF -$2.1B, up to $95B stock sales, $68.4B JV max-loss exposure; Microsoft $25B notes. Luminix caveat: "The four figures are not directly comparable." | 0.8 : 0.6 : 0.5 : 0.5 | The classic late-cycle tell, but D and C also need external finance (fermi: about $1.4T/yr for D). | **Weak** (A/C 1.6) |
| S1.3 | Rising rates: Fed hiking, 10y about 5% | 1.15 : 1.05 : 0.95 : 0.9 | Cost of capital up; small. | **Weak** |
| S1.4 | Fermi's physical walls for D: about $2.6T in 2030 against 2030 OCF of about $1.1-1.3T; D&A of about $1.5-2T needs $3-4T of AI revenue; about 55-60 GW/yr, "close to total annual US generation additions" | 1 : 1 : 0.9 : 0.5 | Known magnitudes. D needs all three walls to give way at once. | 2:1 against D, the strongest LR here |
| S1.5 | Model adapter, directional: DC-capex R about 1.6-2.1, dc-fast about 3.8; "No run reaches 4"; level understated 2.5-3x; no financing bust | 1 : 1 : 1 : 1 | No bust channel, so it is silent on A. Its D signal duplicates S1.4. | Inadmissible beyond sign |

| | A | B | C | D |
|---|---|---|---|---|
| Prior | 52 | 30 | 13 | 5 |
| LR product | 0.5×0.8×1.15×1 = 0.460 | 0.75×0.6×1.05×1 = 0.4725 | 0.9×0.5×0.95×0.9 = 0.3848 | 0.95×0.5×0.9×0.5 = 0.2138 |
| Prior × LR | 23.92 | 14.18 | 5.00 | 1.07 |
| Posterior (÷44.17) | 54.2 | 32.1 | 11.3 | 2.4 |

Rounded by largest remainder: **A 54 / B 32 / C 11 / D 3.** Guidance and strain nearly cancel. The signals seat's 15/36/38/11 reads current momentum forward. These LRs do not license that move from the base rate.

The lock-basis note from signals (CY2026 is about $690-720B, not $720-745B) does not move R, because both years use the same definition.

---

## Q2: Epoch cost ≥$10B, model published by 2028-12-31

The prior is decomposed as the outside-view did: 0.5 (a run that large exists) × 0.7 (Epoch carries a primary estimate ≥$10B) = 0.35, which it rounded to 33.

**Factor 1: a run that large exists.** Prior 0.5, odds 1.

| # | Signal | LR | Flag |
|---|---|---|---|
| S2.1 | [Epoch Trends](https://epoch.ai/trends) (updated 5 Feb 2026): "The cost to train frontier language models has increased by 3.5×/year since 2020", 90% CI 2.8×-4.4×. The outside-view's threshold sat on the older 2.4× line ([Epoch 2024](https://epoch.ai/blog/how-much-does-it-cost-to-train-frontier-ai-models): "95% CI: 2.0x to 3.1x"). P(latest Epoch trend ≥3× \| Yes) about 0.75 vs about 0.42 \| No. | **1.8** | Under 2:1, but the strongest here: it measures the target quantity directly |
| S2.2 | No Epoch estimate above $1B found as of Nov 2026; the largest is Grok 4 at a $490M median (via [CloudZero](https://www.cloudzero.com/blog/cost-to-train-ai-model/), secondary). Fermi's C0 "hundreds of millions" by mid-2026 ([Dror Poleg](https://www.drorpoleg.com/charts/frontier-cost/): "Estimates amortize hardware and energy over the run and carry substantial uncertainty"). P(none yet \| Yes) about 0.5 vs about 0.72 \| No. | **0.7** | **Weak.** A publication lag explains much of the gap. |
| S2.3 | Multi-GW sites being financed (Big-4 capex about $700B in 2026, about $935B consensus 2027; Colossus 2 at about 1.1M H100e supports runs "in the low billions") | **1.3** | **Weak** |
| S2.4 | Funding strain at the hyperscalers; also Epoch's "GPT-5 used less training compute than GPT-4.5" (with its own view that GPT-6 "probably won't") | **0.9** | **Weak** |

Odds 1 × 1.8 × 0.7 × 1.3 × 0.9 = **1.474**, so P1 = **0.596**.

**Factor 2: resolver.** Prior 0.7, odds 2.333.

| # | Signal | LR | Flag |
|---|---|---|---|
| S2.5 | Signals audit: Epoch's costs are historically in constant dollars (for example 2023 USD), while the question says nominal. A run of $10-11B nominal can print below $10B. | **0.85** | **Weak** |

Odds 2.333 × 0.85 = 1.983, so P2 = **0.665**.

**Posterior: 0.596 × 0.665 = 0.396, giving 38** (rounded down for the S2.2/S2.4 overlap, both "frontier spend not yet visible").

Fermi's 9 rests on g = 2.6 with C0 fixed at mid-2026. Under Epoch's published 3.5×, the same arithmetic gives a median of about $8.7B, so the gap is the growth parameter, not data. I take Epoch's newer figure as the stronger evidence.

---

## Q3: LMArena top-10 organizations all US/PRC on 2028-12-31

The prior is 55: internet-platform class about 70 and industrial classes about 15, weighted 2:1, plus a small status-quo nudge. The outside-view could not read the board (HTTP 403), so I count only the *verified, dated* parts of the status quo as incremental.

| # | Signal | LR | Flag |
|---|---|---|---|
| S3.1 | [BenchLeader](https://www.benchleader.com/benchmarks/lmarena_text), dated 8 Nov 2026: top-10 distinct organizations are Google, Meta, Anthropic, Moonshot, OpenAI, Alibaba, Zhipu, Xiaomi, DeepSeek, SpaceXAI, so 10/10 US/PRC. Caveat: it uses "only the 60 rows shown on the page", does not state HQ, and [Swfte](https://www.swfte.com/lmarena) orders the top differently. The full LR is about 1.65 (P(Yes now \| Yes 2028) 0.9 vs 0.55); about 1.4 of it is incremental to the prior's nudge. | **1.4** | **Weak** |
| S3.2 | Bench depth: US/PRC organizations also fill ranks 11-20 (Amazon, Microsoft, ByteDance, Tencent, MiniMax) | **1.3** | **Weak**; correlated with S3.1 |
| S3.3 | Nearest outsider far back: Mistral Large 4 (29 Oct 2026) is only 7th among open models (aggregator claims, via [Wikipedia](https://en.wikipedia.org/wiki/Mistral_AI)); Mistral Large 3 was rank 91 in May 2026 ([DataLearner](https://www.datalearner.com/en/leaderboards/external/text-generation)); Cohere, AI21, Sakana, Upstage, LG and Naver are not visible | **1.3** | **Weak**; the outside-view already saw Mistral "far down" |
| S3.4 | Fermi's contender product 0.75 | **1.0** | Judgment on the same data as S3.3 |
| S3.5 | Resolution: lmarena.ai 301-redirects to arena.ai; no dated archive is named for 2028-12-31; labels split by parent | **1.0** | A cancellation, not a No. An unpriced risk I flag: a PRC-origin lab redomiciling (for example to Singapore) would flip one slot by the HQ rule. No packet signal measures it. |

**Posterior.** Odds 55/45 = 1.222 × 1.4 × 1.3 × 1.3 = 2.891, so P = 0.743, giving **74**.

---

## Q4: DefiLlama total stablecoins, 2028-12-31 ($B)

**Re-base, arithmetic.** The outside-view anchored at $300.4B (25 Oct 2026, via secondary). Fermi summed DefiLlama's API at **$294B (2026-11-08)**; signals found $290.1B by search; [TokenPost](https://www.tokenpost.com/news/investing/50082) gives $294.62B on 6 Nov. I take $292B, scale by 0.973, and get a **re-based prior of 253 / 399 / 701** (log sd 0.356 below, 0.44 above).

Bins on the end-2028 level:

| Bin | Range | Prior |
|---|---|---|
| Low | <292, i.e. below today | 0.19 |
| Mid | 292-467 | 0.45 |
| High | >467, i.e. more than +60% | 0.36 |

| # | Signal | LR Low : Mid : High | Flag |
|---|---|---|---|
| S4.1 | Drawdown momentum: about -10% from the about $322B May peak; 30-day -4.86%; YoY about -6%. Caveat: "no single catastrophic event"; some article dates could not be confirmed as 2026. The 2022 contraction was about -26%. | 1.5 : 1 : 0.7 | **Weak**; only about 2-3 cycles in the series |
| S4.2 | GENIUS yield ban pushing cash into tokenized Treasuries (about $17B) ([crypto.news](https://crypto.news/stablecoin-market-loses-10b-as-crypto-liquidity-quietly-contracts/), [Crystal Intelligence](https://crystalintelligence.com/stablecoin/what-drove-the-stablecoin-supply-down/)) | 1.2 : 1 : 0.85 | **Weak.** **Seat conflict:** signals says DefiLlama does *not* count tokenized MMFs; fermi's third stream assumes it does. I side with signals: DefiLlama files those under RWA, not stablecoins. That cuts fermi's "+$15-150B new issuers" stream. |
| S4.3 | GENIUS bank and fintech issuance switching on 2027-28 | 0.95 : 1 : 1.1 | **Weak**; legitimation is already the prior's reference class |
| S4.4 | Fermi crypto-cycle stream (elasticity 0.7; end-2028 falls in the post-April-2028-halving year) | 0.9 : 1 : 1.1 | **Weak**; a cycle assumption, n of about 3 |

| | Low | Mid | High |
|---|---|---|---|
| Prior | 0.19 | 0.45 | 0.36 |
| LR product | 1.5×1.2×0.95×0.9 = 1.539 | 1.0 | 0.7×0.85×1.1×1.1 = 0.720 |
| Posterior (÷1.0016) | **0.292** | **0.449** | **0.259** |

**Refitting a lognormal.**

- z(0.292) = -0.548 and z(0.741) = +0.646 give sd 0.393 and a median of e^5.892 = **$362B**.
- With the prior's skew kept (sd 0.36 below, 0.43 above): P10 = 362 × e^(-0.461) = 228; P90 = 362 × e^(0.551) = 628.

**Q4: P10 225 / P50 360 / P90 620.**

---

## Q5: Fed numerical yield ceiling or target (≥1y) before 2031

The prior is **5** (odds 0.0526): long-run about 0.5% per issuer-year, US about 0.9%/yr; the recent decade's 3.3% rests on n = 2.

| # | Signal | P(s\|Yes) | P(s\|No) | LR | Flag |
|---|---|---|---|---|---|
| S5.1 | FOMC hiked on 16 Sep 2026, held on 28 Oct "with two dissents for a further hike" ([FOMC](https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm)) | 0.34 | 0.40 | **0.85** | **Weak.** Inflation makes a buying cap costly, but a hike-induced recession is one Yes path. |
| S5.2 + S5.4 (joint) | Treasury buyback cap raised "from $2 billion to at least $4 billion" at 10-30y, "formally aimed at improving market liquidity" ([CNBC](https://www.cnbc.com/2026/08/19/bessent-treasury-buybacks-yields-warsh-fed.html)). Brooks: "What's happening is yield curve management", which [Fortune](https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/) presents as opinion with no official yield target cited. **Plus** 10y about 5% (5.17% on 25 Sep). | ~0.70 | ~0.35 | **2.0** | At the cap. Taken separately, about 1.6 × 1.7 = 2.7 would count one fiscal-pressure fact twice, so I price them jointly. |
| S5.3 | Warsh "reportedly prefers a smaller balance sheet tilted to bills" ([CNBC](https://www.cnbc.com/2026/08/20/bessent-warsh-fed-bond-market-treasury-yields.html)) | 0.45 | 0.60 | **0.75** | **Weak.** A 1-2y cap (Australia-style) is still compatible with a bills tilt. |
| S5.5 | Model: world debt/GDP 0.89-1.07 in 2030, below the 150% trigger | n/a | n/a | **1.0** | Inadmissible: "The model has no Fed" |
| S5.6 | Fermi trigger paths, 7.6% | n/a | n/a | **1.0** | Judgment, not data |

**Posterior.** Odds 0.0526 × 0.85 × 2.0 × 0.75 = 0.0671, so P = 6.3%, giving **6**.

---

## Coherence checks

1. **Q1 vs Q6 (a capex bust is a recession is a share rise).** I hold A at 54, near the prior's 52, and P(Δ≥0) at 0.21. In A worlds the 2030 recession weight rises (about 0.45 vs 0.30), which adds roughly +0.2 pp to the Q6 mean. That is inside my upper sd. It does not justify moving the median, because A is a 2030-below-2026 capex level, not necessarily a 2029-30 recession.
2. **Q1 vs Q2.** With P(Q2 | A) about 0.25 (big runs can publish in 2027-28 before a bust) and P(Q2 | not A) about 0.5: 0.54 × 0.25 + 0.46 × 0.5 = 0.365. That is consistent with 38.
3. **Q6 vs Q7.** Both lean on one AI-labor factor. Q6's essay-pace tail (≤ about 49.5) is about 8%, and Q7 is 7%. The joint low-labor world is roughly 3-4%, which is consistent.
4. **Q5 vs Q6.** They share the recession path. Q5's S5.1 LR (0.85) and Q6's S4 (rise ×1.1) use the same tightening fact in opposite directions, which is consistent.

## Flag summary (the lens's main duty)

- **No LR in this file exceeds 2:1.** The strongest are S1.4 (D walls, 2:1 against D), S5.2+S5.4 (joint 2.0) and S2.1 (Epoch 3.5×, 1.8).
- **Signals I set to 1:** the model adapter (Q1, Q5, Q6), the Indeed productivity-pay wedge (a duplicate of S1), the attribution commentary, NITI Aayog's worst case, and fermi's Monte Carlo outputs (Q3, Q5, Q7).
- **Overlaps I priced jointly rather than multiplied:** H1 net adds with fresher intake (Q7); buybacks and the "yield curve management" claim with the 10y level (Q5).
- **Seat conflict:** whether DefiLlama counts tokenized MMFs (fermi yes, signals no). I side with signals.

## Sources

- BLS, Productivity and Costs Q3 2026 preliminary (5 Nov 2026): https://www.bls.gov/news.release/archives/prod2_11052026.htm ; PDF https://www.dol.gov/newsroom/economicdata/prod2_11052026.pdf
- BLS TED (52.8%, 2026Q2, old vintage): https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm
- FRED PRS85006173: https://fred.stlouisfed.org/series/PRS85006173
- Indeed Hiring Lab, Q3 2026: https://hiringlab.indeed.com/2026/11/05/q3-2026-productivity-and-costs/
- ZipRecruiter Research: https://www.ziprecruiter-research.org/economic-insights-research/the-unproven-promise-of-ai ; Fortune: https://fortune.com/2026/09/04/ai-productivity-labor-share/
- Indian IT headcount: IANS https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000 ; Lapaas https://lapaasvoice.com/tcs-infosys-hcltech-wipro-and-tech-mahindra-add-13918-employees-in-q2-fy27 ; Infosys 20-F https://www.sec.gov/Archives/edgar/data/0001067491/000119312526270520/infy-20260331.htm ; People Matters https://www.peoplematters.in/news/business/wipro-workforce-declines-28percent-sequentially-to-236328-in-q2-fy27-52773 ; PolicyCircle https://www.policycircle.org/industry/india-it-hiring-slowdown/ ; NITI Aayog via Free Press Journal https://www.freepressjournal.in/tech/indian-it-sector-job-loss-15-to-20-lakh-ai-niti-aayog ; Nasscom via The Star https://www.thestar.com.my/tech/tech-news/2026/02/24/india039s-technology-sector-to-expand-6-to-315-billion-in-fiscal-2026-industry-body-says
- Hyperscaler capex: Luminix https://www.useluminix.com/reports/industry-analysis/hyperscaler-capex-q3-2026
- Epoch: https://epoch.ai/trends ; https://epoch.ai/blog/how-much-does-it-cost-to-train-frontier-ai-models ; https://epoch.ai/gradient-updates/why-gpt5-used-less-training-compute-than-gpt45-but-gpt6-probably-wont
- LMArena aggregators: https://www.benchleader.com/benchmarks/lmarena_text ; https://www.swfte.com/lmarena ; https://www.datalearner.com/en/leaderboards/external/text-generation
- Stablecoins: https://stablecoins.llama.fi/stablecoincharts/all ; https://www.tokenpost.com/news/investing/50082 ; https://crypto.news/stablecoin-market-loses-10b-as-crypto-liquidity-quietly-contracts/
- Fed and Treasury: https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm ; https://www.cnbc.com/2026/08/19/bessent-treasury-buybacks-yields-warsh-fed.html ; https://www.cnbc.com/2026/08/20/bessent-warsh-fed-bond-market-treasury-yields.html

## Seat: premortem

**Numbers:** q1={'A': 24, 'B': 40, 'C': 29, 'D': 7} | q2=24 | q3=81 | q4={'p10': 215, 'p50': 345, 'p90': 650} | q5=9 | q6={'p10': 48.6, 'p50': 51.4, 'p90': 54.4} | q7=13

# E4 labor-distribution / premortem (A5, Wave 2, red team)

**BLUF.** All three Wave-1 seats assumed that the yardstick for Q6, the BLS percent labor share, keeps the same definition through 2030. It will not. BEA plans to start counting own-account data as investment in its **2028 comprehensive update**. That adds to measured business output and leaves compensation unchanged, so the published share would step down by about 0.3-0.8pp before anything real happens. My Q6 is therefore lower and wider than the effort's: **P10 48.6 / P50 51.4 / P90 54.4**. On Q7 the Wave-1 seats bounded the decline by the aggregate's growth-phase record (worst three years: -4.2%). The physical limit is set by attrition instead: about 12-14% of staff leave each year, so a hiring freeze alone shrinks a firm by double digits. I price the Yes world at **13**, roughly double outside-view and signals.

Lens: premortem only. I attack the effort's Wave-1 reasoning (outside-view, fermi, signals) on both tails and then give my own numbers. I did not read other efforts' files.

---

## 1. The shared assumption none of them questioned

**Assumption: "The Q6 resolver is a fixed ruler. Only the economy moves the number."**

Each Wave-1 seat models the 2030 value as the current level plus a drift, an AI increment, a cyclical term and a symmetric revision term:

- **Outside-view** converts the FRED index to percent and applies the historical 4-year change distribution. That implicitly treats the 1947-2026 definitional history as stationary.
- **Fermi** carries a "revision to first print" term with **mean 0, sd 0.45pp**.
- **Signals** notes that annual NIPA updates move levels "by up to about 0.5pp", but treats that as noise.

None of them noticed a scheduled, signed definitional break that falls inside the resolution window:

- BEA says it will capitalize data "**an improvement we plan to introduce with the next comprehensive update of GDP and its major components in 2028**" ([BEA blog, 20 Apr 2026](https://bea.gov/news/blog/2026-04-20/when-are-data-and-tractors-treated-same-economic-accounting)). The blog gives no dollar size.
- BEA's research spotlight says capitalization "expands the production boundary and affects gross fixed capital formation, consumption of fixed capital, net stock, value added, and capital services" and "raises measured value added and growth" ([BEA Research Spotlight, May 2026](https://apps.bea.gov/scb/spotlights/2026/0526-capitalizing-own-account-data.htm)). Its caveats, verbatim:
  - the estimates are "experimental economic statistics intended to preview implementation, gather feedback";
  - there are "ongoing discussions around asset-boundary choices, occupation involvement rates, pseudo-output prices, and depreciation profiles";
  - the views "do not necessarily represent the U.S. Bureau of Economic Analysis."
- The experimental series covers 1997-2024 ([BEA working paper](https://bea.gov/research/papers/2026/toward-economics-statistics-own-account-data-and-databases-assets-1997-2024)). I could not read the level of own-account data investment from the page; the figures sit in a data-appendix spreadsheet.

**Mechanism.** The BLS labor share is "labor compensation divided by current-dollar output", where output is BEA "gross value-added output" ([BLS MLR 2017](https://www.bls.gov/opub/mlr/2017/article/estimating-the-us-labor-share.htm)).

- Own-account data assets are valued at sum of costs. Capitalizing them raises business value added by D, the value of the data produced.
- The intermediate inputs used to produce the data were already deducted, and the data workers' pay is already in compensation. So the numerator does not change.
- Result: ΔLS ≈ -LS x D/VA.

**Size.** This is my estimate, with wide bounds.

- Statistics Canada's broader data, databases and data-science measure ran at roughly 1.3-1.8% of GDP in 2018. That is from memory and includes purchased data.
- For the US own-account slice I take D ≈ 0.6-1.5% of nonfarm business value added in 2030. That makes **ΔLS ≈ -0.3 to -0.8pp, central -0.5**, and the AI-era growth of data work pushes it up.
- P(implemented before the Feb-2031 first print of 2030Q4) ≈ 0.75. BEA budget and staff cuts could delay it, but the 2025 SNA global window (2029-30, per the [IMF/UN implementation strategy](https://www.imf.org/-/media/files/data/statistics/bpm6/approved-guidance-notes/implementation-strategy-for-2025-sna-bpm7-final-version.pdf)) still falls before the resolution date.
- **Expected level shift: about -0.4pp**, with all of it on one side.

**Precedent.** BEA capitalized R&D and entertainment originals in the 2013 comprehensive update. Koh, Santaeulàlia-Llopis and Zheng (2020, *Econometrica*, "Labor Share Decline and Intellectual Property Products Capital") attribute much of the measured long-run decline in the BEA-based labor share to intellectual-property capitalization. That is from memory; I did not re-verify it this session. A boundary change is how this series has moved before.

**Why this matters for the vintage rule.** Q6 resolves on the first publication that contains calendar-2030. That will be a post-2028-update vintage. The question quotes 52.8 as "scale", but the resolver does not re-base. A 2030 print that looks like "-2.4pp" may be -1.9pp of economics plus -0.5pp of accounting.

---

## 2. Attacking the simulation's closure (fermi seat)

The fermi seat used the model correctly on levels: it refused them. It did, however, take a **timing** claim from the model: "the effect is back-loaded ... most of the transfer [lands] after the Q6 resolution year." That claim comes from the model's closure, not from evidence.

- In `src/modules/capital.ts` (`calculateFirmCircuit`), capital's income share is `alpha + automationIncomeToCapital x (1 - alpha) x max(0, automationLaborShareChange)` on market output, and labor compensation is the remainder. With `alpha` fixed, **the model's labor share cannot move at all except through the robot/AI worker-equivalent count.** It has:
  - no markups,
  - no sectoral composition,
  - no depreciation wedge (its share is on market output, not BLS gross value added),
  - no measurement.
- The timing of the automation count comes from the deployment rule: marginal value against marginal cost, scaled by integration costs `(N/anchor)^theta`. CLAUDE.md calls `robotIntegrationExponent` "theta, judgment" and says the AI payoff is off by default.
- So "-0.1pp by 2030, -14pp by 2036" is a parameter choice about diffusion speed. It tells us nothing about when a US gross-output ratio moves.
- What drove the observed 2022-26 fall of about 3pp:
  - composition toward low-labor-share tech, energy and finance value added;
  - the depreciation share of gross output;
  - price shocks running ahead of nominal pay (tariff pass-through in 2025, an oil shock in 2026, real hourly compensation -1.9% in Q2).

  **None of these exists in the model.** The model's -0.11pp baseline is not a weak signal; it says nothing about those channels.

**Verdict.** Discard the "back-loaded" inference. Keep the fermi seat's composition arithmetic (-0.4 to -0.55pp), which does not depend on the model. That arithmetic is itself conservative. If AI and cloud value added grows by about $0.6T by 2030 (about 2.3% of business output) at a labor share of about 0.15, the effect is about -0.9pp, not -0.5.

---

## 3. Q6 premortems (both tails)

### Downside tail: "It printed 48.5 and we all said 51.5"

The story, told from 2031:

- The 2028 comprehensive update capitalized data: -0.6pp across the whole series.
- Hyperscaler and neocloud capex held near $1T a year. AI and cloud value added, with labor share near 0.15, grew to about 3% of business output: composition -1.1pp.
- White-collar substitution kept nominal pay growth near 3% while productivity ran 2.5-3%/yr. Real hourly compensation trailed productivity by about 1pp/yr: -0.5pp/yr, or -2.0pp over four years. This is the 2025-26 pattern repeated. Indeed Hiring Lab's productivity index stands at 116 against real compensation at 107.3 since Q4 2019 ([Hiring Lab](https://hiringlab.indeed.com/2026/11/05/q3-2026-productivity-and-costs/)). Its caveats, verbatim: "Productivity growth can be very noisy quarter-to-quarter"; "an AI-driven sea change in efficiency gains has not yet shown up clearly in the data".
- There was no recession: the AI boom carried demand.

53.0 - 0.6 - 1.1 - 2.0 + 0 = **49.3**. Add a bad revision draw and 48.5 is a 1-in-10 world, not a 1-in-50 world. The outside-view seat put P10 at 50.0 because it treats definitional history as stationary. Its "largest 4-year fall, -4.1pp" is a statistic about a series that has been redefined several times.

Errors Wave-1 made here:

- **Scope insensitivity.** The fermi seat's AI-excess term (-0.55 median) is the same size whether Big-4 capex is $700B or $2T. Its own Q1 gives C plus D about 21%, and in that world composition alone is -1pp or more.
- **Narrative coherence.** The fermi seat's "z-factor" ties a strong-AI world to no recession. That is coherent, but it means the left tail **compounds**: no countercyclical bounce, deeper composition, faster substitution. A 200k-draw Monte Carlo with a lognormal sd of 0.8 on one term does not capture three channels breaking the same way.

### Upside tail: "It printed 55 and we all said 51.5"

The story, told from 2031:

- The Fed hiked into 2026 (3.75-4.00%, two dissents for more; [FOMC 28 Oct 2026](https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm)) with the 10-year above 5%.
- Hyperscalers turned free cash flow negative and financed capex externally (signals seat: Alphabet Q3 FCF -$9.1B, Amazon TTM -$42.4B).
- In 2028-29 the AI capex cycle broke (Q1 regime A) and took a mild recession with it. Profits fell faster than sticky compensation. Every post-war recession lifted the share, to 58.9% in 2020Q2 ([BLS TED](https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm)).
- Tight labor supply amplified the bounce. Net immigration collapsed in 2025-26, and unemployment is 4.1% even after +165k payrolls in October ([AP via ABC](https://abc30.com/story/us-employers-added-surprising-165000-jobs-october-unemployment-rate-dipped-41/20020018/); preliminary; U-6 rose 7.6% -> 7.9%; wages +3.1% y/y, still trailing inflation).
- The price-shock component reversed: IEEPA tariffs were struck down on 20 Feb 2026, with refunds of up to $175B under litigation ([Penn Wharton](https://budgetmodel.wharton.upenn.edu/p/2026-02-20-supreme-court-tariff-ruling/)). Tariff pass-through had sat in the denominator; my reading is that taxes on production and imports are inside BEA value added, which the BLS method page does not state, so treat this as unverified. Oil retraced.
- BEA's data capitalization slipped past 2030.

53.0 - 0.8 (structural drift) + 2.0 (recession) + 0.3 (price reversal) + 0 (no boundary change) = **54.5**.

Errors Wave-1 made here:

- **Drag/pull asymmetry.** Signals and fermi both extrapolate the last 12-28 months, a window that contains a tariff shock, an oil shock and a hiking cycle: three price-level shocks that historically fade from the ratio.
- The record-low subclass (outside-view) splits evenly between rebound and continuation. Wave-1 medians all sit on the continuation branch.

### Q6 pricing (own numbers)

| Component | Central | Notes |
|---|---|---|
| Start, 2026Q3 first print | 53.0 | BLS USDL 26-1631 |
| Structural non-AI drift, 3.9 yr | -1.0 | -0.25pp/yr; I take a little out of the 2025-26 pace for price shocks |
| AI composition plus displacement | -0.6 | left tail to -2.5 |
| Cycle | +0.45 expected | P(recession weighting 2030) ≈ 0.35, x about +1.5 to +2 |
| 2028 data capitalization | -0.4 expected | 0.75 x (-0.3 to -0.8); one-sided |
| Revision noise | 0, sd 0.45 | |

Median ≈ 51.4. The left tail compounds (boundary change, composition and no recession arrive together), so P10 is 48.6. The upside is a recession with no boundary change, so P90 is 54.4.

**Q6: P10 48.6 / P50 51.4 / P90 54.4.**

The interval is wider than every Wave-1 seat's on the downside and roughly matches signals on the upside. The median is close to the fermi seat's, but for a different reason: the boundary change replaces about half of the cyclical offset.

---

## 4. Q7 premortems (both tails)

Requirement: the combined big-5 headcount at 31 Mar 2029 must be ≤ about 1,377,000. From the September 2026 level of 1,549,471 that is **-11.1% in 10 quarters**.

### Yes tail: "The modal 'No' was wrong"

**The shared assumption here is a physical bound taken from history.**

- Outside-view and fermi both cite "worst year -4.2% (FY24)" as a ceiling on how fast the aggregate can shrink. That is a statistic from a **growth-phase** reference class. It is not a physical limit.
- The physical limit is attrition. At 12-14% voluntary attrition (Wipro "attrition eases to 14%", per the [Business Today](https://www.businesstoday.in/technology/story/wipro-adds-135-employees-in-q4-attrition-eases-to-14-526016-2026-04-16) headline), about 190-210k people leave the five firms each year.
- If fresher and lateral intake is cut to half of replacement for six quarters, headcount falls about 10% **with zero layoffs**. Indian IT shrinks by not hiring.
- FY24's -4.2% came from a modest demand dip while attrition was *falling* from above 20%. It shows a policy choice, not a capacity limit.

The 2027-29 story:

1. **AI deflation reaches renewals.** Kotak's base case is "3.5 per cent pricing erosion, first surfacing through renewals of large multi-year contracts"; HCLTech put industry AI deflation at 3-5% ([Tribune / Kotak](https://www.tribuneindia.com/news/business/it-services-growth-to-stay-range-bound-at-3-per-cent-as-ai-deflation-pressures-margins-mid-tiers-better-placed-says-kotak/)). Pricing is moving "away from billing for the number of people deployed" ([Business Today, Jul 2026](https://www.businesstoday.in/technology/artificial-intelligence/story/ai-deals-grow-but-indias-it-services-revenue-model-faces-a-reset-544547-2026-07-23)). Counter-evidence, also from the search summary: a CLSA report (March 2026) "found no evidence of increased deflation in renewal contracts".
2. **Clients insource.** GCCs added "nearly 200,000 net employees in fiscal 2026, almost twice the 110,000 added by IT services firms" (TeamLease Digital via ET, as summarised by [NewsBytes](https://www.newsbytesapp.com/news/business/indias-gccs-added-nearly-200000-net-employees-outpacing-it-services/tldr)). Caveat: part of GCC growth is new AI capability, not work moved away from vendors.
3. **The Q1 regime-A world.** The AI-capex bust brings a 2028 US recession and a cut in discretionary IT spend, as in 2023-24 but with the deflation stacked on top.

In that world USD revenue falls 2-4% a year while revenue per employee rises 4-5% a year. That is -6 to -9% a year, which crosses the threshold by FY29 Q4.

**The Wave-1 conjunction error ran backwards.** Fermi required "FY24 repeated three times in a row". From September 2026 only two fiscal years remain, and attrition-driven contraction compounds within a year. It does not need three separate shocks.

### No tail: why Yes is still the minority

- **Momentum is the wrong way.** The aggregate was +19,398 in H1 FY27. TCS onboarded about 24k freshers in H1, and Infosys holds a 20k target.
- **Drag asymmetry.** There is political and reputational resistance to visible cuts. TCS's 2025 cut of about 12k (about 2%) drew state labour-department scrutiny. Management prefers bench and pyramid flattening, which is slower.
- **Acquisitions.** The resolver counts reported headcount. HCLTech and TechM buy firms, which pushes the March 2029 figure up.
- **Offshoring pull.** A US recession plus the H-1B fee raises the offshore share of delivery, which supports India-based headcount.
- **AI deflation may be a 2-3 year phase** before "new AI implementation work" arrives (Kotak's own framing).

### Q7 pricing

- P(2027-28 demand shock: US recession or AI-capex bust that cuts discretionary IT) ≈ 0.30. Given that shock, P(aggregate -11% from Sep 2026 by Mar 2029) ≈ 0.33. That gives 0.10.
- No-shock structural path (flat revenue, revenue per employee +5-6%/yr, hiring freeze): about 0.05 x 0.7, or 0.035.
- Acquisition drag: -0.5pp.

**Q7: 13.**

---

## 5. The other five questions (premortem pass, E4 lens)

### Q1 (Big-4 capex, R = 2030/2026)

Wave-1 ranged from A 52 (outside-view) to C 38 (signals).

- **Outside-view's error is a reference-class mismatch.** It counts "sector after a ≥50% year". But 2027 consensus is about $935B (+30%; [Luminix](https://www.useluminix.com/reports/industry-analysis/hyperscaler-capex-q3-2026), aggregator), so regime A needs a peak-to-trough fall of more than 25-30% from a 2027-28 peak. Telecom did -46% over 2000-02, so A is plausible, but that is a two-step conjunction (peak, then crash) and outside-view priced it as one step.
- **Fermi's error is a scope error on its own walls.** Its walls (cash, depreciation, power) argue against D. They do not argue against C. Its intensity 0.30 for 2030 assumes partial normalization, which is the same mean reversion the signals rejected.
- My pricing:
  - P(bust that takes 2030 below the 2026 cash base) ≈ 0.24;
  - P(plateau at $0.7-1.4T) ≈ 0.40;
  - P(sustained growth) ≈ 0.29;
  - P(D, ≥ about $2.8T) ≈ 0.07. That needs about $1.5T a year of external finance; possible only if the "Washington backstop" is real.

### Q2 (Epoch training cost ≥ $10B, published by 2028)

- **Fermi's 9 rests on an arithmetic slip.** It set C0 = $0.55B "as of mid-2026", but that figure is Grok 4 (mid-2025). Then it compounded only 2.2 years at 2.6x. From mid-2025:
  - at Epoch's 2.4x, the run reaches $10B at about end-2028;
  - at Epoch's current headline of 3.5x (90% CI 2.8x-4.4x; [Epoch Trends](https://epoch.ai/trends)), it reaches about $35B.
- The honest No-world is different. GPT-5 used *less* training compute than GPT-4.5 ([Epoch](https://epoch.ai/gradient-updates/why-gpt5-used-less-training-compute-than-gpt45-but-gpt6-probably-wont)), so frontier spend may be shifting to RL and inference. Closed labs also disclose little, so Epoch marks costs unknown, and Epoch reports constant (2023) dollars.
- **Physical check.** A 1 GW GB200-class site running for six months amortizes to about $3-5B. $10B needs 2-3 GW dedicated to one run, which is plausible only at the end of 2028.
- **Q2: 24.**

### Q3 (all ten top LMArena organizations US/PRC)

- **Shared Wave-1 blind spot: geography ambiguity, not capability.** Several Chinese labs now sit under offshore listed parents (Hong Kong listings; Cayman parents), and some Chinese-founded agent firms have re-domiciled to Singapore. Under "headquarters (ultimate parent)" a Singapore- or HK-headquartered entry fails the question even if no European lab rises.
- **Mistral.** Large 4 is seventh among open models; P(top-10 organization) ≈ 0.08.
- **Sovereign programmes** (Korea, Japan, Gulf, India): about 0.06 combined.
- **Label or HQ reassignment:** about 0.05.
- **Q3: 81.**

### Q4 (DefiLlama stablecoins, end-2028)

- The supply is falling: about $290-294B against the $322B May peak. The GENIUS yield ban is routing cash to tokenized money-market funds, which DefiLlama does not count.
- **Every Wave-1 seat's P50 assumes a crypto-cycle recovery.** The No-growth world is the 2022-23 pattern: -26%, a stall, and bank-issued tokens that DefiLlama classifies outside "stablecoins". That puts P10 near 215.
- The upside is payments integration plus the 2028 halving bull run.
- **Q4: 215 / 345 / 650.**

### Q5 (Fed numerical yield ceiling, ≥ 1-year maturity, before 2031)

- **Wave-1 shared assumption: YCC needs a crisis that the Fed chooses to answer this way.** The underweighted path is institutional capture.
  - The 10-year is above 5% and mortgage affordability is a 2028 election issue.
  - The Treasury already runs yield-motivated buybacks ([CNBC](https://www.cnbc.com/2026/08/19/bessent-treasury-buybacks-yields-warsh-fed.html)).
  - A Board that the White House can reshape by 2028.
- Paths:
  - Recession with ZLB and front-end YCC: about 2.5%.
  - Bond-market or fiscal stress with an aligned Board: about 3.5%.
  - War financing, the 1942 precedent (a Taiwan or Iran escalation): about 1.5%.
  - Explicit-number front-end guidance: about 1%.
- Each path still needs an *announced number*. The Fed's stated preference (Warsh) is a smaller balance sheet tilted to bills, which works against it.
- **Q5: 9.**

---

## 6. Coherence checks

1. **Q1-A is coupled to Q6's upside and Q7's Yes.**
   - A bust raises the labor share (recession) and also raises the Indian IT Yes (discretionary cut).
   - Q6 P90 (54.4) and Q7's 13 both draw on the same 24% A-world, and I priced each conditionally on it.
2. **Q1 C/D is coupled to Q6's downside.** The 36% C+D mass drives the 48.6 P10 through composition. In that world Q7's Yes runs only through AI deflation (about 3.5pp of my 13).
3. **The Q6 boundary change is independent of the economy.** It shifts the whole distribution down by about 0.4pp and is not a tail event.

## Sources

- BEA blog, 20 Apr 2026 (data capitalization in the 2028 comprehensive update): https://bea.gov/news/blog/2026-04-20/when-are-data-and-tractors-treated-same-economic-accounting
- BEA Research Spotlight, own-account data: https://apps.bea.gov/scb/spotlights/2026/0526-capitalizing-own-account-data.htm
- BEA working paper, own-account data and databases 1997-2024: https://bea.gov/research/papers/2026/toward-economics-statistics-own-account-data-and-databases-assets-1997-2024
- IMF/UN 2025 SNA-BPM7 implementation strategy: https://www.imf.org/-/media/files/data/statistics/bpm6/approved-guidance-notes/implementation-strategy-for-2025-sna-bpm7-final-version.pdf
- BLS MLR 2017, "Estimating the U.S. labor share": https://www.bls.gov/opub/mlr/2017/article/estimating-the-us-labor-share.htm
- BLS TED, labor share 52.8% in 2026Q2: https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm
- BLS Productivity and Costs Q3 2026 (via the Wave-1 packet): https://www.dol.gov/newsroom/economicdata/prod2_11052026.pdf
- Indeed Hiring Lab, Q3 2026: https://hiringlab.indeed.com/2026/11/05/q3-2026-productivity-and-costs/
- FOMC statement, 28 Oct 2026: https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm
- October 2026 jobs (AP via ABC): https://abc30.com/story/us-employers-added-surprising-165000-jobs-october-unemployment-rate-dipped-41/20020018/
- Penn Wharton, IEEPA ruling and refunds: https://budgetmodel.wharton.upenn.edu/p/2026-02-20-supreme-court-tariff-ruling/
- Kotak on AI deflation (Tribune): https://www.tribuneindia.com/news/business/it-services-growth-to-stay-range-bound-at-3-per-cent-as-ai-deflation-pressures-margins-mid-tiers-better-placed-says-kotak/
- Business Today, IT revenue-model reset: https://www.businesstoday.in/technology/artificial-intelligence/story/ai-deals-grow-but-indias-it-services-revenue-model-faces-a-reset-544547-2026-07-23
- GCC net additions FY26 (NewsBytes, citing TeamLease/ET): https://www.newsbytesapp.com/news/business/indias-gccs-added-nearly-200000-net-employees-outpacing-it-services/tldr
- Wipro attrition (Business Today): https://www.businesstoday.in/technology/story/wipro-adds-135-employees-in-q4-attrition-eases-to-14-526016-2026-04-16
- Luminix hyperscaler capex Q3 2026: https://www.useluminix.com/reports/industry-analysis/hyperscaler-capex-q3-2026
- Epoch Trends: https://epoch.ai/trends ; Epoch on GPT-5 compute: https://epoch.ai/gradient-updates/why-gpt5-used-less-training-compute-than-gpt45-but-gpt6-probably-wont
- CNBC on Treasury buybacks: https://www.cnbc.com/2026/08/19/bessent-treasury-buybacks-yields-warsh-fed.html
- Model closure: `src/modules/capital.ts`, `calculateFirmCircuit` (labor share = market output less `alpha` plus the automation-income share)

Figures marked "from memory" (the StatCan data-investment share; Koh-Santaeulàlia-Llopis-Zheng 2020) were not re-verified this session. The size of the data-capitalization shift is my estimate, not a BEA number.
