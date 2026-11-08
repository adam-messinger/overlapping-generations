# E3 (dollar-monetary) / outside-view (A1, Wave 1)

**BLUF.** Reference classes say the essay's monetary claims are tail events: explicit yield
pegs by reserve-currency issuers start about 0.5-2% per issuer-year, so Q5 is ~6%, and new
payment instruments after legitimation grow ~15-25% a year in the median, so stablecoins
reach ~$410B (P50) by end-2028, not "near-unlimited". Elsewhere: capex after a >=50% growth
year usually falls or plateaus (Q1 A+B ~87%), the $10B Epoch run is a coin flip on
trend times disclosure (35%), the US+China top-10 holds about as often as not (45%), the
labor share follows its own 4-year change distribution (P50 52.4%), and a 10% three-year drop
in the Indian big-5 has never happened in the aggregate (8%).

Lens discipline: no episode-specific mechanism. Each answer is a base-rate frequency with its
window and source, adjusted only for the arithmetic in the baselines (levels, required growth
rates, time remaining). Forecast origin 2026-11-08.

---

## Q1: Big-4 capex, CY2030 / CY2026 (centre of gravity for E1; reached here by base rate)

**Reference class:** sector capex in the 4 years after a year of >=50% growth (R = capex in t+4 / capex in t).

| Episode (boom year t) | Approx. R = t+4 / t | Source / caveat |
|---|---|---|
| Semiconductors 1984 (capex roughly doubled) | ~1.1-1.2 | IC Insights capex history, as summarised at [AnySilicon](https://anysilicon.com/semiconductor-industry-capex-history-and-forecast-1983-2020/) (gives growth rates and decline years, not dollar levels; my level reading is approximate) |
| Semiconductors 1995 | ~0.85 | same; 1997-98 was a double-digit decline period |
| Semiconductors 2000 (~$62-64B, record) | ~0.7 (2004 ~$45B) | Gartner Dataquest 2001 forecast (2001 $47.3B, -26%; actual ~$44.4B, -29%), [Lightwave](https://www.lightwaveonline.com/business/market-research/article/16659882/gartner-dataquest-forecasts-decline-in-worldwide-semiconductor-spending); 2003 $29.7B and 2004 $44.8B are from an unattributed secondary source, treat as unverified |
| Semiconductors 2010 (+~100% after 2009) | ~1.2 | IC Insights: "the 2010 rebound after the 2008-2009 downturn as the lone exception" to the stronger-second-year pattern; 2012-13 double-digit declines |
| US telecom/fibre carriers 2000 | ~0.4-0.5 | standard telecom-bust record (from memory, not re-sourced here) |
| Upstream oil and gas 1980-81 | ~0.6 | 1980s oil bust (from memory, not re-sourced here) |
| US railroads 1880-82 (track miles built +40-46%/yr) | ~0.7-1.1 | 1880s railway mania; below the 50% threshold, so a weak member of the class |

Frequency in this small sample (n~7, approximate levels): R < 1 in about 4/7; 1 <= R < 2 in
about 3/7; R >= 2 in 0/7. IC Insights also counts six double-digit capex declines in 1983-2015
(1985-86, 1992, 1997-98, 2001-02, 2008-09, 2012-13): roughly one every 5 years, so a 4-year window
after a peak growth year almost always contains one.

**Arithmetic adjustment.** CY2026 (~$720-745B on guidance vs ~$410B CY2025, +~76%) would be the
third consecutive >=50% year (CY2024 was ~+60% on the cash-flow lines). In the class, the
episodes that broke hardest (telecom 2000, semis 2000) were the late years of multi-year booms,
so this nudges toward A, not away from it. The tiny sample has no R >= 2 case; I keep mass in C
and D for small-sample humility (rule of succession), not because of any mechanism.

**Answer:** A 50, B 37, C 11, D 2.

## Q2: An Epoch-estimated training run >= $10B, published by 2028-12-31

**Reference class:** trend-extrapolated cost/compute milestones and whether they arrived on time.

- TOP500 1 TFLOP (1997) and 1 PFLOP (2008) arrived on the trend line; 1 EFLOP, extrapolated for
  ~2018-19, arrived in 2022 (late, the trend bent ~2013).
- Intel node cadence: 10nm targeted ~2016, shipped in volume ~2019 (late).
- $1,000 genome: roughly on time (~2014-15). Battery packs $100/kWh: roughly on time.
- Rough frequency: ~half of mature-trend milestones arrive within a year of the extrapolated date.
  (These are from memory as a class; I did not re-source each.)

**Arithmetic content.** Epoch's own largest estimate in hand is Grok 4 at ~$490M (July 2025;
Epoch rates the underlying 5e26 FLOP figure as *speculative*:
[Epoch data insight](https://epoch.ai/data-insights/grok-4-training-resources)). Reaching $10B by
2028-12-31 is 20x in ~3.45 years = ~2.4x/yr, which is exactly Epoch's earlier central cost trend
(2.4x/yr, [Cottier et al.](https://arxiv.org/pdf/2405.21015), which reports a 95% CI of roughly
2.0-3.1x); at the newer ~3.5x/yr it lands ~$35B. So "on trend" is about the bar, not well clear
of it: ~50% from the class.

**Resolvability haircut (arithmetic of the resolver, not mechanism):** the model must carry an
Epoch headline cost estimate in the 2029-12-31 snapshot; a model whose cost is unknown does not
count. Many recent frontier models lack Epoch compute/cost estimates; I take ~0.7 for "the
largest run gets a published estimate within a year".

**Answer:** 0.5 x 0.7 = **35**.

## Q3: All ten top organizations on LMArena Text US or PRC on 2028-12-31

**Widest reference class:** two-country concentration of the top-10 firms in a frontier
technology. Semiconductors (Korea, Taiwan, Netherlands, Germany always present), aerospace
(Airbus, BAE, Safran, Thales), nuclear vendors (Rosatom, Framatome, KHNP), search engines (Yandex,
Naver, Seznam) never had a US+China-only top 10. Cloud IaaS comes closest. Class frequency: low,
~10-20% of industry-decades.

**The leaderboard's own record (computed from LMArena's published history,
[lmarena-ai/leaderboard-dataset](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset),
`text_style_control`, overall, 194 snapshots 2024-08-28 to 2026-11-06; organizations as labelled,
non-US/PRC = mistral, cohere, AI21, TII, Upstage, Stability):**

| Year | Snapshots | Top-10 all US/PRC |
|---|---|---|
| 2024 (from Aug) | 22 | 0 |
| 2025 | 85 | 18 |
| 2026 (to Nov 6) | 87 | 81 |
| All | 194 | 99 (51%) |

Last violation: 2026-02-10 (Mistral). The current run began 2026-02-11 (~9 months). In the
2026-11-06 snapshot the top 10 are Google, Meta, Anthropic, Moonshot, OpenAI, Alibaba, Z.ai,
Xiaomi, DeepSeek, xAI; ranks 11-14 (Baidu, ByteDance, Tencent, StepFun) are also US/PRC.
Caveat: some April 2026 snapshots carry a blank organization label in the top 10 (anonymous
models), which a resolver would have to adjudicate.

**Combining frequencies.** Wide class ~15%; leaderboard all-history 51%; a Lindy/Gott estimate
for a 9-month-old state still holding 26 months on is ~9/(9+26) = ~26% if it must hold
continuously, higher for a single-date snapshot. Weighted toward the question's own history,
since the arithmetic of the baseline is that the condition holds today with a cushion of four
more US/PRC organizations.

**Answer: 45.**

## Q4: Stablecoin market cap on DefiLlama, 2028-12-31 (centre of gravity)

**Baseline re-verified** from DefiLlama's API ([stablecoins.llama.fi/stablecoincharts/all](https://stablecoins.llama.fi/stablecoincharts/all), summing `totalCirculatingUSD` across pegs): **$294.1B on 2026-11-08**; peak $317.1B on 2026-05-17
(the preamble's ~$322B record is a different aggregation); $305.0B on 2026-01-01. Supply is
*down* ~4% year-to-date. Horizon: ~2.15 years.

**Own-series annual growth (1 Jan to 1 Jan, DefiLlama):** 2021 $27.4B -> 2022 $162.6B (+493%);
2023 $137.7B (-15%); 2024 $130.2B (-5%); 2025 $203.7B (+56%); 2026 $305.0B (+50%); 2026 YTD -4%.
Median of the five full years +50%, but heavily skewed by the 2021 base effect; peak-to-trough
2022-23 was about -22%.

**Reference class: new payment instruments after regulatory legitimation.** ETFs after the 1993
SEC exemptive relief and mobile money (M-Pesa, Alipay) after licensing grew ~25-50%/yr in their
first post-legitimation decade; the EU e-money regime (2000, revised 2009) and Japan's 2022-23
stablecoin licensing produced long stagnation. My read of the class: median ~15-25%/yr, with a
fat lower tail of "legitimated and then flat". (Class members from memory; not re-sourced.)
The post-GENIUS realised rate so far (Jul 2025 $252B -> Nov 2026 $294B) is ~+12%/yr.

**Arithmetic.** 294 x 1.18^2.15 = ~$420B; a 2022-23-style -20% drawdown gives ~$235B; a
~55%/yr path gives ~$750B.

**Answer:** P10 235, P50 410, P90 740 ($B).

## Q5: Fed announces a numerical yield ceiling/target (>=1y maturity) before 2031-01-01 (centre of gravity)

**Reference class: explicit yield pegs among reserve-currency issuers.**

| Episode | Issuer | Maturity / level | Duration |
|---|---|---|---|
| 1942-51 | US (Fed with Treasury) | 2.5% long bond, 3/8% bills | 9 years, ended by the 1951 Accord |
| Sep 2016-Mar 2024 | Japan (BoJ YCC) | 10y ~0% | ~7.5 years |
| Mar 2020-Nov 2021 | Australia (RBA) | 3y 0.25% then 0.1% | ~1.7 years |
| 1945-51 (informal) | UK, Canada | cheap-money support, no announced numerical long-yield target | does not count under Q5's rule |

Issuer-years 1946-2025 for the main reserve issuers (USD, GBP, DEM/EUR, JPY, CHF, CAD, AUD, CNY)
are roughly 400-450; post-war new starts: 2 (Japan 2016, Australia 2020). Rate ~0.5% per
issuer-year. US alone: one start in the Fed's 112 years (~0.9%/yr), none in the 75 years since
the Accord.

**Arithmetic adjustment for the baseline (debt level, not mechanism):** restricted to
issuer-years with public debt above ~100% of GDP (US 1942-50, UK 1945-65, Canada 1945-50, Japan
1997-2025, US 2020-26: ~70 issuer-years), starts are 1-2, i.e. ~1.5-3% per year. Over the 4.15
years to 2030-12-31: 1-(1-0.007)^4.15 = ~3% unconditional; 1-(1-0.02)^4.15 = ~8% high-debt
conditional. Both post-war starts came at the zero lower bound, which the 10y at 5.17% is not;
I do not weigh that (it is mechanism), and stay between the two rates.

**Answer: 6.**

## Q6: BLS nonfarm business labor share, calendar-2030 annual average

**Baseline re-verified.** BLS TED: 52.8% in 2026Q2, "the lowest level ever recorded"; 53.6
(2026Q1), 54.1 (2025Q4), 54.7 (2025Q2); 2019 56.3-57.3; 2020 Q2 spike to 58.9
([BLS TED 2026](https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm)).
FRED's index PRS85006173 ([FRED](https://fred.stlouisfed.org/data/PRS85006173)) at the current
vintage shows 2026Q3 at 93.73 vs 2026Q2 94.36; scaled to the 52.8% level, **2026Q3 is ~52.45%**
(my conversion; the Q1 ratio differs slightly across vintages, so +/-0.2pp).

**Reference class: 4-year and decade changes in this series** (computed from the FRED index
1947Q1-2026Q3, scaled to percent):

- Change from a year's Q2 to the annual average four years later (n = 75 overlapping windows,
  1947-2021): mean -0.53pp, SD 1.57; P10 -2.49, P25 -1.66, P50 -0.46, P75 +0.81, P90 +1.33;
  min -4.33 (from the 2020 spike), max +2.68.
- Subset starting within 0.5pp of the running series low (n = 21, heavily overlapping):
  median ~+0.85pp, range -2.71 to +2.68 (mild mean reversion from lows, but 2004-08 kept falling).
- Decade changes in annual averages: P10 -2.95, median -0.93, P90 +0.67, min -6.78.
- For scale: 1980s-2020s the level went ~63 -> ~55; the essay's "forty years in a decade" is
  ~-8pp, below the worst decade in the record.

**Arithmetic.** Start ~52.6 (between the published Q2 52.8 and the revised-vintage Q3 ~52.45).
Weight 0.7 unconditional / 0.3 near-low subset: median change ~-0.2pp. P10/P90 from the
unconditional tails, widened ~0.1pp for first-print/vintage noise.

**Answer:** P10 50.1, P50 52.4, P90 54.2 (%).

## Q7: Indian IT big-5 headcount at 31 Mar 2029 >= 10% below 31 Mar 2026

**Baseline arithmetic.** March 2026: TCS 584,519; Infosys 328,594; HCLTech 227,181; Tech Mahindra
147,623; Wipro ~233-243k (single-source; one article's date looks mistyped) -> combined ~1.52-1.53M
([Business Today on Infosys](https://www.businesstoday.in/amp/technology/story/infosys-headcount-falls-by-over-8400-in-q4-workforce-at-328594-527161-2026-04-23),
[Angel One on TechM](https://www.angelone.in/news/stocks/tech-mahindra-share-price-in-focus-headcount-falls-by-1-993-in-q4fy26-attrition-rate-eases),
[IANS on FY26](https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000):
the five fell a combined 7,389 in FY26 after +12,718 in FY25). Threshold: ~1.37M, a ~150k cut.
30 Sep 2026 figures in the preamble sum to ~1.55M, so the path must fall ~11% from today in 2.5
years (~-4.5%/yr).

**Reference class: multi-year headcount declines at large IT/BPO employers.**
- The big-5 aggregate itself: deepest 3-year fall on record is Mar 2023 (~1.59M) -> Mar 2026
  (~1.52M), about -4 to -5%. Zero >= 10% 3-year declines in ~25 years of the aggregate.
- Single firms do it: IBM ~2012-15 (~-13%), CSC/DXC (several), Unisys (1990s), Wipro Dec 2022 ->
  Mar 2025 (~-10%). Firm-level frequency among large IT-services employers: ~15-20% of 3-year
  windows (from memory; not re-sourced firm by firm).
- Sector aggregates do it rarely: US computer-systems-design employment after 2001 (~-15%
  peak-to-trough) is the one clear case in ~35 years: ~3-5% of 3-year windows.

An aggregate of five firms behaves like a sector, not a firm. Class rate ~5%, nudged up for the
current downward drift (FY26 negative, TCS -23,460) and down for the latest quarter's rebound
(+13,918).

**Answer: 8.**

---

## Sources (primary where available)

- DefiLlama stablecoin API: https://stablecoins.llama.fi/stablecoincharts/all
- BLS TED, labor share 52.8% in 2026Q2: https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm
- FRED PRS85006173 (index, used only for changes, scaled to the BLS percent level): https://fred.stlouisfed.org/data/PRS85006173
- BLS MLR, estimating the US labor share: https://www.bls.gov/opub/mlr/2017/article/estimating-the-us-labor-share.htm
- LMArena leaderboard history: https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset
- Epoch, Grok 4 training resources: https://epoch.ai/data-insights/grok-4-training-resources
- Cottier et al., rising costs of frontier training: https://arxiv.org/pdf/2405.21015
- IC Insights capex history via AnySilicon: https://anysilicon.com/semiconductor-industry-capex-history-and-forecast-1983-2020/
- Gartner Dataquest 2001 capex forecast via Lightwave: https://www.lightwaveonline.com/business/market-research/article/16659882/gartner-dataquest-forecasts-decline-in-worldwide-semiconductor-spending
- Indian IT headcount: Business Today, Angel One, IANS links above

Caveats carried forward: Q1 levels for several class members are approximate and partly from
memory; Q2's Grok 4 compute is rated *speculative* by Epoch; Q4's own-series growth median is
dominated by small-base years; Q6's percent conversion from the FRED index is mine and vintage
sensitive; Q7's Wipro March 2026 figure rests on one source.

```json
{"q1": {"A": 50, "B": 37, "C": 11, "D": 2},
 "q2": 35, "q3": 45,
 "q4": {"p10": 235, "p50": 410, "p90": 740},
 "q5": 6,
 "q6": {"p10": 50.1, "p50": 52.4, "p90": 54.2},
 "q7": 8}
```
