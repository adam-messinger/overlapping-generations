# E2 compute-geopolitics, outside-view seat (A1, Wave 1)

**BLUF.** History says booms that grow capex 50%+ in a year usually stall or reverse within four years, so the regime mass sits on "line broken" and "plateau" (A+B = 72%), not on the essay's line (D = 6%). Trend-dated cost milestones arrive on time less than half the time, and the Q2 resolver needs Epoch to have *published* a cost (Q2 = 20%). Two-country closure of a frontier-tech top-10 is rare across industries (Q3 = 30%). Yield pegs by reserve-currency issuers run at under 1% per issuer-year (Q5 = 5%). Labor share and Indian-IT headcount are forecast from their own 4-year and 3-year change distributions: drift continues and there is no cliff (Q6 P50 52.0; Q7 = 7%).

Lens discipline: every number below comes from a reference-class frequency. The only adjustments are arithmetic ones made to the baselines (current levels, the threshold multiple each question needs). I give no mechanism arguments about AI, chips, export controls or policy, and I did not look up anyone else's forecast of these questions.

---

## Q1: Big-4 capex regime, R = CY2030 / CY2026

**Reference class:** capex in a sector (or a hyperscaler aggregate) in the four years after a year of >=50% capex growth. The ratio is year t+4 over the boom year t. Values are approximate, from IC Insights/Gartner semiconductor capex series, company 10-Ks and standard railway history. Treat each as roughly +/-15%.

| Boom year (growth >= ~50%) | R = t+4 / t | Regime |
|---|---|---|
| UK railway mania, 1846 (capital calls peak) -> 1850 | well below 1 | A |
| US railroad track built, 1887 (peak ~12.9k miles) -> 1891 (~4.6k) | ~0.36 | A |
| Semiconductor capex, 1984 -> 1988 | ~1.0 | A/B border |
| Semiconductor capex, 1995 -> 1999 | ~0.7 | A |
| Semiconductor capex, 2000 (~+80%) -> 2004 | ~0.75 | A |
| Optical/telecom equipment, 2000 -> 2004 | ~0.4-0.5 | A |
| Semiconductor capex, 2004 -> 2008 | ~1.0 | A/B border |
| Semiconductor capex, 2010 (~+100%) -> 2014 | ~1.2 | B |
| Solar manufacturing capex, 2010 -> 2014 | <1 | A |
| US shale upstream, 2010 -> 2014 | ~1.5 | B |
| Big-4 hyperscalers, 2018 (~+60%, ~$40B -> ~$64B) -> 2022 (~$150B) | ~2.35 | C |
| Amazon alone, 2017 (+53%) -> 2021 | ~5 | D (single firm) |

IC Insights' summary of semiconductor capex reports six episodes of double-digit capex declines (1985-86, 1992, 1997-98, 2001-02, 2008-09, 2012-13). It also notes that "in every case between 1983 and 2010 where spending declined, a surge in spending of at least 45% occurred two years later". In other words, booms and busts alternate on a roughly four-year beat ([AnySilicon / IC Insights](https://anysilicon.com/semiconductor-industry-capex-history-and-forecast-1983-2020/); [Design-Reuse / IC Insights 2021](https://www.design-reuse.com/news/news51109.html)).

**Frequency** across the ~11 sector-level cases (single-firm row excluded): A ~55-60%, B ~25-30%, C ~10-15%, D ~0%. **Arithmetic adjustment:** the closest sub-class, the Big-4 aggregate itself, has resolved C once, and D occurs only at single-firm level, so I move a little mass from A toward C/D. The 2026 base (~$720-745B guidance, excluding leases on the Q1 definition) follows a second consecutive year of ~+75%. In every analogue the boom-year base was the year the cycle's level was most stretched, so I make no upward adjustment for it.

**Answer:** A 40, B 32, C 22, D 6.

## Q2: Epoch lists a >= $10B training run published by 2028-12-31

**Reference class 1:** trend-extrapolated compute or cost milestones, and whether they arrived on the date the trend implied.
- TOP500 exaflop: the 2010s extrapolation of the #1 system pointed to ~2018-19. It arrived June 2022 (Frontier), about 3-4 years late, because the list's growth rate broke around 2013.
- Petaflop (Roadrunner 2008): on trend.
- Intel's Moore's-law node cadence: held to ~2014, then slipped (10 nm ~3 years late).
- Li-ion pack $100/kWh: projected for ~2023 in the late 2010s; not reached as a global average by then.
- Epoch's own 2024 report: "if the trend of growing training costs continues, the largest training runs will cost more than a billion dollars by 2027" ([Epoch](https://epoch.ai/blog/trends-in-the-dollar-training-cost-of-machine-learning-systems); [arXiv 2405.21015](https://arxiv.org/abs/2405.21015)). This is still open.

Rough on-time frequency for milestones set by a continued established trend: **~40%**. Trends tend to decelerate at about the point people start extrapolating them.

**Arithmetic on the baseline.** I downloaded Epoch's `notable_ai_models.csv` on 2026-11-08 ([epoch.ai/data](https://epoch.ai/data/notable_ai_models.csv)).
- The headline column is "Training compute cost (2023 USD)". Its maximum is **$388M (Grok 4, 2025-07-09)**, then GPT-4.5 at $366M and Grok 3 at $218M.
- Only **180 of 1,092** models carry a headline cost. **No model published in 2026 has one**, including the largest-compute entry, GPT-6 Astra (2026-09-03, 9.4e26 FLOP), which has only a "hardware acquisition cost" of $4.2B.
- Of the ten largest-compute models, 6 carry a headline cost.
- Going from $388M (mid-2025) to $10B by end-2028 needs about 2.5x/yr for 3.5 years. Epoch's 2024 trend of 2.4x/yr gives ~$8.3B, a near miss at the median. The essay's 3.5x/yr gives ~$31B.

The threshold therefore sits at the trend median. I take P(true run >= $10B by end-2028) at the ~40% on-time rate, then multiply by P(Epoch publishes a headline cost for it by 2029-12-31) ~0.6 (the coverage rate among top-compute models). That gives ~0.24, and I round down for the headline's 2023-dollar deflation.

**Resolver caveats.**
- (a) Epoch's headline column is in **2023 USD, not nominal**, while the question says nominal. Using 2023 dollars lowers the reported figure by roughly 8-12% at 2028 prices.
- (b) Epoch also publishes "Training compute cost (upfront)". Grok 4 **already shows $10.7B** on that column. If an auditor read "upfront" as primary, the question would already resolve Yes. I treat the 2023-USD amortized column as the headline, per the question text.

**Answer: 20.**

## Q3: All ten top LMArena organizations US or PRC on 2028-12-31

**Reference class:** in a frontier technology, do the ten leading organizations all come from two countries?

| Industry, list | Two-country top 10? |
|---|---|
| Large commercial aerospace / airframers | No (US + Europe + Brazil/Canada) |
| Civil nuclear vendors | No (US, France, Russia, Japan, Korea, China) |
| Semiconductors by revenue / foundry | No (US, Korea, Taiwan, Japan, Netherlands, Europe) |
| Web search engines by share | No (Yandex, Naver, Seznam alongside US/China) |
| TOP500 top-10 supercomputers | No in essentially every list (Japan, Europe present) |
| Space launch | No (Europe, Russia, India, Japan) |
| Internet platforms by market cap, top 10 (~2015-2024) | **Yes** (Meeker 2018: top 20 = 11 US + 9 China) |

**Frequency:** about 1 in 7 industry lists, ~15%. The closest analogue, internet platforms, did close to two countries and stayed closed for about a decade, so I weight it double. That gives ~25-30%.

**Arithmetic:** the condition is a conjunction over ten slots. One non-US/PRC organization anywhere in the top ten resolves No, and the history of these lists shows that the tenth slot turns over.

**Resolver caveat:** lmarena.ai now 301-redirects to arena.ai. That domain is the same publisher's successor, so the fallback rule applies and the question should not be cancelled. On a DataLearner mirror (May 2026) of the board, Mistral ranked 91st overall. I note this only as a status-quo level and do not adjust for it beyond the analogue weight.

**Answer: 30.**

## Q4: DefiLlama stablecoin market cap on 2028-12-31

**Baseline re-check (arithmetic).** I summed DefiLlama `stablecoincharts/all` `totalCirculatingUSD` across all pegs ([stablecoins.llama.fi](https://stablecoins.llama.fi/stablecoincharts/all)). It shows **$294.1B on 2026-11-08**, against a peak of $317.1B on 2026-05-17 and $305.7B at Dec-2025. The level is down ~4% year to date. Year-end series: 2020 $27B, 2021 $163B, 2022 $138B, 2023 $131B, 2024 $204B, 2025 $306B.

**Reference class 1: new payment/store-of-value instruments after regulatory legitimation, once they reach ~$200-300B.**
- US money-market funds after Reg Q workarounds: ~$230B in 1982, then -25% in 1983 when MMDAs were legalised. Growth from 1982 to 1990 was ~+10%/yr.
- US ETFs at the ~$300B scale (2004-06): ~+30%/yr.
- EU e-money after the 2009 directive: modest single-digit to low-double-digit growth.
- Central tendency: **~+15-25%/yr**, with a fat left tail when a substitute is legalised or the market sours.

**Reference class 2: stablecoins' own post-2022 25-month growth ratios.** Dec-2022 -> Jan-2025 ~1.5x; Dec-2023 -> Jan-2026 ~2.35x; mid-2022 -> mid-2024 ~1.07x; the 2022-23 drawdown fell ~-20%. Across all 58 overlapping 25-month windows since 2020, the deciles are P10 0.88x, P50 1.86x, P90 11.8x, but the upper part is inflated by 2020-21 hypergrowth from a tiny base.

**Combination:** ~+20%/yr for 2.15 years gives ~1.4x, so P50 = $294B x 1.4 ≈ **$410B**. P10 is a 2022-style drawdown (~0.83x) ≈ $245B. P90 is about the 2023-25 pace (~2.4x) ≈ $700B.

**Answer:** P10 245, P50 410, P90 700 ($B).

## Q5: Fed announces a numerical yield ceiling/target (>= 1-yr maturity) before 2031

**Reference class:** explicit yield pegs or targets on securities of one year or longer, by reserve-currency issuers (USD, GBP, JPY, DEM/EUR, FRF, CHF, AUD, CAD, CNY), 1913/1940-2026.
- **Events:** US 1942 (peg to 1951, ended by the Accord); Japan September 2016 (10-year YCC, to March 2024); Australia March 2020 (3-year target, to November 2021). The UK's 1940s "cheap money" (3% war, Dalton's 2.5%) used rate guidance and tap issuance rather than a formally announced peg, so I count it half.
- **Rate:** ~3.5 events in ~500 issuer-years ≈ **0.7% per issuer-year**. Over the 4.15-year window that is ~3%.
- **US-specific:** 1 adoption in 113 years of the Fed ≈ 0.9%/yr, or ~3.6% over the window.
- **Sub-class with public debt near or above 100% of GDP** (US 1942-51, UK 1945-60s, Japan 1997-2026, Italy, France): ~2 events in ~80-100 issuer-years, ≈ 2-2.5%/yr, or ~9% over the window.

**Arithmetic adjustment:** the baseline 10-year yield of 5.17% is the only baseline input. A high starting yield is when pegs have been *adopted* (the US in 1942 pegged at the then-prevailing 2.5%, Japan at ~0%), so it does not move the class. I weight the unconditional ~3-4% more heavily than the high-debt sub-class's ~9%.

**Answer: 5.**

## Q6: BLS nonfarm business labor share, 2030 annual average

**Reference class:** I downloaded FRED PRS85006173 (labor share index, 2017=100, 1947Q1-2026Q3; [FRED](https://fred.stlouisfed.org/series/PRS85006173)) and rescaled it to the BLS percent level by setting 2026Q2 = 52.8%. I then took the change from Q2 of year t to the annual average of year t+4, for t = 1947-2021.
- **All years (n = 75):** mean -0.53pp, SD 1.57pp; P10 -2.49, P25 -1.66, P50 -0.46, P75 +0.81, P90 +1.33.
- **Since 1980 (n = 42):** mean -0.79, SD 1.68; P10 -2.64, P50 -0.93, P90 +0.97.
- **Decade changes in the annual average:** min -6.8pp (2000s), max +2.3pp, mean -1.15pp. The essay's claim maps onto the 2000s decade, the worst in the record.
- **Starts within 0.3pp of a record low (n = 16):** 4-year changes range from -2.7 to +2.7, mean ≈ +0.2. Record lows do not reliably extend.

**Arithmetic on the baseline:** the 2026Q3 print (index 93.729, out 2026-11-05) rescales to **52.45%**, already 0.35pp below Q2. Anchoring on Q3 and applying the full-sample quantiles, slightly widened for the shorter, 3.25-year horizon's rescaling uncertainty, gives the answer below. A drop to 2000s pace (-6.8pp per decade, ≈ -2.7pp over four years) lands at about P10.

**Answer:** P10 49.8, P50 52.0, P90 54.0 (%).

## Q7: Indian IT big-5 combined headcount at 31 Mar 2029 >= 10% below 31 Mar 2026

**Reference class 1, sector aggregate:** US "computer systems design and related services" employment (FRED [CES6054150001](https://fred.stlouisfed.org/series/CES6054150001), 1990-2026). The share of 36-month windows with a decline of 10% or more is **3.4% (n = 406)**. All of them start in late 2000-2001, the dot-com bust; the worst is -16.2% from March 2001.

**Reference class 2, single large IT/BPO firms, 3-year windows:**
- IBM 2012 -> 2015: ~-13%.
- IBM 2017 -> 2020: ~-13%.
- DXC FY2018 -> FY2021: ~-11%.
- CSC 2012 -> 2015 (with spin-offs).
- Wipro March 2023 (256,921) -> about March 2026: ~-8 to -10%.
- Accenture, Cognizant, Capgemini and TCS: no such window.
- Frequency across firm-windows: roughly 10-20%.

**Reference class 3, the big-5 combined itself:** I know of no 3-year window since 2000 with a combined fall of 10% or more. The worst, March 2023 (~1.59M) -> 2024/26, was single-digit (about -4% in FY2024).

**Arithmetic:** the five-firm sum diversifies firm-level shocks, so it sits between the sector rate (3%) and the single-firm rate (10-20%). With combined headcount at ~1.53M, a Yes needs about 150k net exits in three years.

**Answer: 7.**

---

**Sources:**
- [Epoch AI notable models dataset](https://epoch.ai/data/notable_ai_models.csv)
- [Epoch, trends in training cost](https://epoch.ai/blog/trends-in-the-dollar-training-cost-of-machine-learning-systems)
- [arXiv 2405.21015](https://arxiv.org/abs/2405.21015)
- [AnySilicon / IC Insights capex history](https://anysilicon.com/semiconductor-industry-capex-history-and-forecast-1983-2020/)
- [Design-Reuse / IC Insights 2021](https://www.design-reuse.com/news/news51109.html)
- [DefiLlama stablecoins API](https://stablecoins.llama.fi/stablecoincharts/all)
- [FRED PRS85006173](https://fred.stlouisfed.org/series/PRS85006173)
- [FRED CES6054150001](https://fred.stlouisfed.org/series/CES6054150001)
- [LMArena text leaderboard](https://lmarena.ai/leaderboard/text) (now redirects to arena.ai)

Figures without a link (railway, telecom, solar and shale capex; the IBM, DXC and CSC headcounts; the yield-peg episodes) are from standard histories and company filings as I recall them. They are approximate, roughly +/-15%, and were not re-verified in this session.

```json
{"q1": {"A": 40, "B": 32, "C": 22, "D": 6},
 "q2": 20, "q3": 30,
 "q4": {"p10": 245, "p50": 410, "p90": 700},
 "q5": 5,
 "q6": {"p10": 49.8, "p50": 52.0, "p90": 54.0},
 "q7": 7}
```
