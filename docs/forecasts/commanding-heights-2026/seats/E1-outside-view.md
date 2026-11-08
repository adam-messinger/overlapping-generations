# E1 ai-capital-cycle / outside-view (A1, Wave 1)

**BLUF.** In the widest reference class, a sector whose capex grew 50% or more in a year is usually
spending less, or about the same, four years later: about half the documented cases end below the boom
year and a few per cent reach 4x. So I put Q1 mostly on A or B (A 50 / B 36 / C 11 / D 3). The other six
questions are anchored on the base rates in the table below and moved only by baseline arithmetic. A $10B
Epoch-estimated run by 2028 would need the cost trend to land on time: 35. All ten top Arena organisations
US or Chinese: 35. A Fed yield ceiling before 2031: 4. Big-5 Indian IT headcount down 10% or more: 8.

Lens discipline: I use only reference-class frequencies, plus arithmetic on the baselines in
`questions.md` and a few verified current levels. I make no argument about the mechanism of this
particular AI episode. I did not search for anyone's forecast of these questions.

---

## Q1: Big-4 capex, CY2030 / CY2026

**Reference class (required):** the sector's capex in the 4 years after a year of growth of 50% or more.
Arithmetic on the baseline: CY2025 ~$410B, CY2026 guidance ~$720-745B, so about +78% in 2026 after about
+75% in 2025. That is two consecutive years of 50% or more, which puts the episode squarely in the class.

| Episode (boom year, growth >= ~50%) | Capex 4 years later vs boom year | Regime | Source / caveat |
|---|---|---|---|
| Semiconductor capex 2000 | 2004 below 2000 (~$60B -> high-$40Bs) | A | IC Insights series (via anysilicon); dollar values are from my memory of the IC Insights/Gartner series, not re-read |
| Semiconductor capex 2010 (~+100% after the 2008-09 trough) | 2014 ~1.2x | B | same; IC Insights notes "a surge of at least 45% occurred two years after each decline" 1983-2010, and double-digit declines in 1985-86, 1992, 1997-98, 2001-02, 2008-09 and 2012-13 ([anysilicon/IC Insights](https://anysilicon.com/semiconductor-industry-capex-history-and-forecast-1983-2020/)) |
| Semiconductor capex mid-1980s and mid-1990s surges | followed within 1-3 years by the 1985-86 and 1997-98 double-digit cuts; 4-year ratio ~0.8-1.1 | A/B | same; levels approximate |
| US telecom/CLEC build 1997-2000 ($35B -> $83B carrier capex, ~+33%/yr; CLEC segment faster) | 2002 collapse: Verizon $17.3B -> $11.9B, Qwest $8.5B -> ~$3B in 2001-02 | A | informal reproduction of an analyst series ([seclists](https://seclists.org/interesting-people/2001/Dec/277)), congressional testimony ([govinfo](https://www.govinfo.gov/content/pkg/CHRG-108hhrg86044/html/CHRG-108hhrg86044.htm)); sector-level growth may have been below 50% in any single year |
| US railroad construction 1880-82 and 1887 (miles laid, a capex proxy) | 1886 and 1891 far below the peaks | A | historical statistics, from memory |
| UK railway mania 1845-47 | collapse by 1850 | A | standard history, from memory |
| China real-estate investment 1992-93 (+100% or more, two consecutive years) | 1997 ~1.6x 1993 | B | NBS series, from memory |
| Solar PV manufacturing build 2010-11; shipbuilding orders 2007 | far below within 4 years | A | from memory |
| China ferrous-metals fixed-asset investment 2003 | 2007 above 2003 | B | from memory |

**Base rate:** about 55-60% of cases end in A, ~35% in B, ~5-10% in C, and D is rare: I found no
documented sector-wide case of 4x four years after a 50%-plus boom year. The sample is small (~10-12
episodes), selected from memory and therefore biased toward famous busts. Correcting for that selection
bias pulls A down a little.

Adjustment for baseline arithmetic only: the class includes two-consecutive-boom-year cases (China
real-estate 1992-93: B; railroads 1880-81: A), and they do not change the split. D at 3 rather than 1
reflects the extreme right skew of sector capex levels.

**Answer: A 50 / B 36 / C 11 / D 3.**

## Q2: an Epoch-estimated training run of at least $10B with publication date on or before 2028-12-31

**Reference class (required):** how often a trend-extrapolated cost or compute milestone arrived on time.

- TOP500 petaflop: on trend (2008). Exaflop: trend lines pointed to ~2018-19; Frontier arrived in 2022,
  about 3-4 years late (from memory).
- Sequencing cost ($1,000 genome): about on time, ~2014-2016 depending on definition (from memory).
- Moore's-law node roadmaps (ITRS): roughly on time through the 2000s, then repeatedly late after ~2012
  (from memory).
- Epoch's own frontier training-cost trend: about 2.4x a year in its 2024 estimate for amortized hardware
  plus energy, 45 frontier models. As I recall the paper, the reported interval was about 2.0-2.9x. Epoch
  framed it as "the largest models will cost over a billion dollars by 2027"
  ([Epoch](https://epoch.ai/blog/how-much-does-it-cost-to-train-frontier-ai-models);
  [arXiv 2405.21015](https://arxiv.org/html/2405.21015v2)).

Base rate: when the deadline sits near the trend's median arrival date, roughly 40% of such milestones
arrived on time. Arrival is a coin flip if the trend holds, and these trends often bend.

**Baseline arithmetic:** the highest current Epoch estimate I can verify is Grok 4 (mid-2025) at about
$490M. Epoch flags this as highly uncertain: "xAI's public statements are vague", and the estimate rests on
~246M H100-hours ([Epoch data insight](https://epoch.ai/data-insights/grok-4-training-resources)). The
~$1B runs of 2026 in the preamble are unconfirmed in Epoch's database.

Reaching $10B by end-2028 from $490M in mid-2025 is a 20x rise in ~3.5 years, about 2.4x a year: exactly
Epoch's 2024 central trend. On the faster ~2.9x a year implied by GPT-4 (~$40M, 2023) to Grok 4, $10B
arrives around mid-2028, about 6 months of slack.

Two resolution conditions sit on top of on-time arrival:
- the model must be public by 2028-12-31;
- Epoch must hold a cost estimate for it by 2029-12-31 ("unknown" does not count).

Both are haircuts on the on-time rate.

**Answer: 35.**

## Q3: the ten highest-ranked Arena organizations all US or Chinese on 2028-12-31

**Reference class (required):** the share of frontier-technology domains whose top-10 organizations come
from only two countries. All assessments are from memory.

| Domain | Top 10 from two countries? |
|---|---|
| Semiconductors by revenue | Never: Korea, Taiwan, the Netherlands and Japan are always present |
| Aerospace and defence (SIPRI Top 100) | No: BAE, Airbus and Leonardo are present |
| Nuclear-weapon states | The top two are US and USSR/Russia, not US and China |
| Search engines by share | No: Yandex, Naver and Seznam are present |
| TOP500 top-10 systems | No: Japan and Europe are usually present |
| Smartphone OEMs | No: Samsung is present |
| Space launch providers | No: Russia and Europe are present |
| Top internet companies by market cap, ~2015-2024 | Yes: Meeker 2018 had the top 20 split 11 US / 9 China |
| Cloud IaaS top 10, 2020s | About yes |

Base rate: about 2 of 9 domains, ~20-25%, with the software-platform subclass near 100%.

The LLM arena's own history (2023-24 boards included Mistral (France) and Cohere (Canada) among the top
distinct organizations) shows that a single non-US/China entrant is enough to break the condition. The
condition needs all ten slots to hold.

Adjustment: I could not verify the current Arena top-10 organisation list. The arena.ai page returned 403,
and secondary snapshots conflict, for example Mistral at rank ~91 on one 2026 aggregator, so I place no
weight on the current state.

**Answer: 35.** The wide class gives ~22%. I moved toward the software subclass because Arena ranks
software artifacts.

## Q4: DefiLlama total stablecoin market cap on 2028-12-31 ($B)

**Verified current level:** about **$294B on 2026-11-08**. Other points:

| Date | Total ($B) |
|---|---|
| End-2025 | 306 |
| 2026-06-01 | 314 |
| End-2024 | 204 |
| End-2023 | 131 |
| End-2022 | 138 |
| End-2021 | 163 |

These are pulled from [stablecoins.llama.fi/stablecoincharts/all](https://stablecoins.llama.fi/stablecoincharts/all),
the API behind [defillama.com/stablecoins](https://defillama.com/stablecoins). The last day may be partial.

**Reference class (required):** growth of new payment and money-like instruments after regulatory
legitimation. All from memory, not re-verified:

- US money-market funds after the 1983 Rule 2a-7 regime: ~15-20%/yr, after an explosive pre-regulation phase.
- EU e-money after the 2000 E-Money Directive: slow for years.
- ETFs after 1993: fast from a tiny base.
- Stablecoins' own calendar-year growth since 2021: +500%, -16%, -5%, +56%, +50%, and -4% year-to-date
  2026. Median ~+20-25%, with drawdowns of up to -20% over two years.

The GENIUS Act (July 2025) is the legitimation event. Supply has been flat to down in the 15 months since.

Anchor: ~22%/yr median over 2.15 years, so 294 x 1.53 = ~450. Tails come from the class's spread:
- P10: -10%/yr, about the 2022-23 drawdown.
- P90: +55%/yr, about the 2024-25 pace.

**Answer: P10 240 / P50 440 / P90 760.**

## Q5: a Fed numerical yield ceiling or target on any Treasury of 1 year or longer, before 2031-01-01

**Reference class (required):** explicit yield pegs among reserve-currency issuers.

Episodes I count:

| Episode | Period | Source |
|---|---|---|
| US | 1942-51 peg, ended by the Accord | [Federal Reserve History](https://www.federalreservehistory.org/essays/treasury-fed-accord) |
| Japan | YCC on the 10-year JGB, Sep 2016 - Mar 2024 | BoJ |
| Australia | 3-year target, Mar 2020 - Nov 2021 | RBA |
| UK, Canada | wartime and early-postwar cheap-money support, 1940s | Debatable whether an announced numerical target |

That gives about 3-5 starts over ~85 years among ~6-8 issuers, ~600 issuer-years: **~0.5-0.8% per
issuer-year**. The US alone: 1 start in ~112 years of the Fed, ~0.9%/yr.

Over the 4.15-year window that is ~2.5-3.7%. Pegs cluster in war and crisis, which fattens the tail
slightly, but the crisis frequency is already inside the base rate. Baseline arithmetic: the 10-year at
5.17% is high by post-2008 standards but within the range the class covers.

**Answer: 4.**

## Q6: calendar-2030 average BLS nonfarm business labor share (%)

**Reference class (required):** changes in the US labor share over a decade and over the
4.5-year horizon to 2030.

I computed these from FRED [PRS85006173](https://fred.stlouisfed.org/series/PRS85006173), which is an
index with 2017=100. I rescaled it so that 2026Q2 = 52.8%, the preamble's percent figure. The rescaling
assumes the 52.8% and the current index vintage agree; the preamble flags a Nov 5 revision.

The current vintage's 2026Q3 is 93.729 in index terms, about **52.45%** on that scaling.

**Change from a year's Q2 to the annual average four years later, 1947-2025** (75 overlapping windows,
so effective n is much smaller):

| Statistic | Change (pp) |
|---|---|
| Mean | -0.53 |
| SD | 1.56 |
| P10 | -2.49 |
| P50 | -0.46 |
| P90 | +1.35 |
| Post-1990 subsample (n=32) P10 / P50 / P90 | -2.71 / -1.32 / +1.35 |

**Decade changes** (n=69 overlapping windows):

| Statistic | Change (pp) |
|---|---|
| P10 | -2.95 |
| P50 | -0.93 |
| P90 | +0.67 |
| Worst decade | -6.78 (the 2000s) |

The essay's claim implies a fall like 1980-2020, about -6 to -7pp in a decade. In this record that is
roughly a minimum-decade event, below the 1st-5th percentile.

New series lows were followed four years later by rebounds of +1 to +2.8pp before 2000, and by further
falls of -0.2 to -2.5pp after 2003. That is a split record, with no mean reversion I can rely on.

Anchor: start ~52.6, between 2026Q2 and Q3. Add the blended median change of -0.6pp and the class
P10/P90, widened for the small effective n.

**Answer: P10 49.8 / P50 52.0 / P90 54.2.**

## Q7: big-5 Indian IT combined headcount at 31 Mar 2029 at least 10% below 31 Mar 2026

**Reference class (required):** multi-year headcount declines at large IT/BPO employers. All figures from
memory unless sourced.

| Employer or series | 3-year decline of 10% or more? |
|---|---|
| IBM 1990-93 (~373k -> ~256k, -31%) | Yes |
| IBM 2012-15 (467k -> 412k, -12%) ([macrotrends](https://macrotrends.net/stocks/charts/IBM/ibm/number-of-employees)) | Yes |
| DXC 2017-20 (~-19%) | Yes |
| HP Enterprise Services (2010s) | Yes |
| Accenture, Capgemini, Genpact, Cognizant | Never over any 3-year window |
| TCS, Infosys, HCLTech | Never, individually |
| Wipro, Infosys, Tech Mahindra, FY2023-26 | -6% to -9% at worst |
| Big-5 Indian aggregate, ~25 years | Never; the largest 3-year decline is about -4 to -5%, Mar 2023 -> Mar 2026 |

At firm level, about 10% of 3-year windows for large IT employers show a 10%-plus decline, concentrated in
legacy-hardware incumbents. For a five-firm aggregate the rate is 0 of ~22 windows, and diversification
lowers the firm-level rate.

Baseline arithmetic: the aggregate rose about 1-2% from Mar 2026 to Sep 2026. Jul-Sep was +13,918 net, and
TCS was 598,056 at Sep 2026, against about 584.5k at Mar 2026 implied by the FY2026 fall of 23,460. So the
condition needs an 11-12% fall from today's level in 2.5 years: worse than any aggregate precedent, and
about a firm-level tail event.

**Answer: 8.**

---

## Lens caveats (preserved, not compressed)

- Q1's reference cases come from memory and are biased toward well-known busts (selection bias). Dollar
  levels for semiconductors, railroads and China are approximate, from memory.
- Q2: Epoch's Grok 4 cost carries "significant uncertainty" (Epoch's own words). The 2.4x a year trend is
  from 45 models.
- Q6: the windows overlap, so the effective sample is ~15-20 independent observations, not 75. The
  index-to-percent scaling assumes vintage consistency.
- Q3: the current Arena composition is unverified (403 from arena.ai). No weight is placed on it.

```json
{"q1": {"A": 50, "B": 36, "C": 11, "D": 3},
 "q2": 35, "q3": 35,
 "q4": {"p10": 240, "p50": 440, "p90": 760},
 "q5": 4,
 "q6": {"p10": 49.8, "p50": 52.0, "p90": 54.2},
 "q7": 8}
```
