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

```json
{"q1": {"A": 52, "B": 30, "C": 13, "D": 5},
 "q2": 33, "q3": 55,
 "q4": {"p10": 260, "p50": 410, "p90": 720},
 "q5": 5,
 "q6": {"p10": 50.0, "p50": 52.0, "p90": 54.1},
 "q7": 7}
```
