# Effort 4 (labor-distribution) - Wave-1 handoff packet

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
