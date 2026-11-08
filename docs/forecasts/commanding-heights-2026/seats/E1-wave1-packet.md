# Effort 1 (ai-capital-cycle) - Wave-1 handoff packet

Your own effort's earlier seats only. Other efforts are deliberately withheld.

## Seat: outside-view

**Numbers:** q1={'A': 50, 'B': 36, 'C': 11, 'D': 3} | q2=35 | q3=35 | q4={'p10': 240, 'p50': 440, 'p90': 760} | q5=4 | q6={'p10': 49.8, 'p50': 52.0, 'p90': 54.2} | q7=8

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

## Seat: fermi

**Numbers:** q1={'A': 15, 'B': 59, 'C': 23, 'D': 3} | q2=22 | q3=77 | q4={'p10': 250, 'p50': 365, 'p90': 640} | q5=6 | q6={'p10': 49.4, 'p50': 51.9, 'p90': 54.5} | q7=20

# E1 ai-capital-cycle / fermi (A2, Wave 1, sim-enabled)

**BLUF.** The cash arithmetic puts Big-4 cash capex in 2030 at about 1.5-2x 2026. Simply holding today's reinvestment rate (about 100% of operating cash) while operating cash keeps growing 15-19% a year gets R to ~1.75-2.0. A bust in 2028-29 is the main way below 1.0. The essay's 4x would need ~$2.8T a year from four firms, which is roughly 50+ GW a year of new load, so it fails the physical check. Regime B is modal: A 15 / B 59 / C 23 / D 3.

For the other questions the components point the same way:
- **Q2 (Epoch $10B run):** the training-cost line runs late, and Epoch's cost coverage is thinning. 22%.
- **Q3 (top-10 orgs all US/China):** today's top ten are all US/China. 77%.
- **Q4 (stablecoins):** flat 2026, moderate growth after. P50 $365B.
- **Q5 (Fed yield cap):** explicit YCC is a low-single-digit event. 6%.
- **Q6 (labor share):** drifts down from a 53.0% record low. P50 51.9%.
- **Q7 (Indian IT -10%):** needs per-employee productivity to outrun revenue by ~3.5pp a year. 20%.

## Adapter used (published, as required)

- Spec: `docs/forecasts/commanding-heights-2026/adapter-spec.json`. Command:
  `npx tsx scripts/tetlock-sim-adapter.ts --spec=docs/forecasts/commanding-heights-2026/adapter-spec.json`.
- I re-ran it at repository HEAD `e319e77`. The spec's vintage line names `46df211`. The two commits between them are docs and adapter-disclosure changes only. The output was **byte-identical** to the committed `adapter-output.md` (diffed).
- Statuses obeyed:
  - **Refused:** Q2, Q3, Q4, Q7. No model number is used for these.
  - **Directional (sign and rough size only):** Q1, Q5, Q6.
- Disclosures carried forward:
  - Datacenter capex is a WORLD composite, "~2.5-3x below observed 2025-26 spending". The adapter says to "Treat every datacenter-capex LEVEL as understated; use growth rates only, and only directionally."
  - It has "no lab, no hyperscaler and no stock market" and "no construction lead". The model therefore cannot produce a capex bust (regime A).
  - The labor share is world compensation/GDP, "~0.65, NOT comparable to BLS 52.8%".
  - There is "NO MONETARY BLOCK: no price level, no Fed, no yields, no stablecoins".

| Directional reading | baseline | ai-energy-boom | debt-populism | dc-fast | dc-fast-ai-payoff | repression-2pp |
|---|---|---|---|---|---|---|
| DC capex CAGR 2026-30, %/yr | 12.8 | 20.2 | 12.3 | 39.2 | 39.4 | 13.7 |
| implied R (=(1+g)^4), directional only | ~1.6 | ~2.1 | ~1.6 | ~3.8 | ~3.8 | ~1.7 |
| world public debt/GDP 2030 | 0.89 | 0.89 | 1.07 | 0.89 | 0.88 | 0.80 |
| repression gap 2030, pp | 0 | 0 | 0 | 0 | 0 | 2.0 (imposed) |
| labor share chg 2026-30, pp | -0.11 | -0.75 | -0.11 | -0.11 | -1.92 | -0.11 |

How I use these, and where the model disagrees with the baselines:
- **Q1.** The model's datacenter capex grows 12-20%/yr unless levered. Observed Big-4 cash capex grew ~70% in 2026 (CY2025 ~$410B to ~$700B cash; see Q1). The gap exists because the model's datacenter build is braked by a willingness-to-pay ceiling on the power bill and by GDP. It has no equity-market or strategic-race motive and no construction pipeline. I do not adopt its growth number. I use only two directional facts:
  1. Even the "closest to the essay" lever (`dc-fast`) lands at R ~3.8, below 4.0.
  2. Unlevered runs sit in regime B.
- **Q5.** Fiscal dominance in the model triggers only above 150% WORLD debt/GDP. No run gets there by 2030 (max 1.07), so the model's sign is "no repression by 2030". That is consistent with, not proof of, a low Q5.
- **Q6.** The sign is negative everywhere. Size: ~0.1pp in the default run, ~0.75pp with the automation payoff, ~1.9pp with cognitive-AI payoff over 2026-30. I take only "small negative, larger if AI substitutes for cognitive labour", not a number.

## Q1: Big-4 cash capex, R = 2030/2026

**Denominator (CY2026, cash PP&E line, finance leases excluded).**

| Company | Estimate | Basis |
|---|---|---|
| Alphabet | ~$200B | guidance $195-205B; Q3 cash additions $51.4B ([ppc.land](https://ppc.land/alphabets-free-cash-flow-drops-to-negative-9-1bn-despite-26-2bn-profit/)) |
| Amazon | ~$215B | guidance ~$220B; Q3 ~$77B, "least consistent across sources" ([fourweekmba](https://fourweekmba.com/ai-big-tech-free-cash-flow-turns-negative-in-a-93b-swing/)) |
| Microsoft | ~$148B | headline ~$170B incl. leases × cash share 39.4/45.2 = 0.87 in Q3 |
| Meta | ~$138B | guidance $135-145B; Q3 $34.9B ([letsdatascience](https://letsdatascience.com/news/meta-narrows-2026-capital-spending-range-to-135-billion-145-46f12e07)) |
| **Sum (D26)** | **~$700B** | range $680-730B |

The Microsoft cash share is from secondary press: "capital expenditure, which includes finance leases, was $45.2bn, against $39.4bn of cash paid for property and equipment". The Q3 figures are secondary analyses, not the 10-Qs. One source warns: "Amazon's operating cash flow and capex figures are the least consistent across sources, so treat them as approximate."

Band thresholds:

| Threshold | 2030 cash capex |
|---|---|
| R = 1 | $0.70T |
| R = 2 | $1.40T |
| R = 4 | $2.80T |

**Component 1: funding (cash arithmetic).**
- Q3 2026 operating cash flow for MSFT+GOOGL+AMZN+META+ORCL was $198.6B, up ~19%. Capex was $230.4B, "about 116% of operating cash flow, against about 63% a year earlier" (headline capex, Oracle included; [fourweekmba](https://fourweekmba.com/ai-big-tech-free-cash-flow-turns-negative-in-a-93b-swing/)).
- Removing Oracle (~$7B a quarter) leaves Big-4 operating cash ≈ $190B × 4 ≈ **$740B in 2026**. Cash capex/OCF is therefore ≈ 0.95-1.0.
- 2030 operating cash at 15%/yr = $1.29T; at 19%/yr = $1.48T.
- Hold capex/OCF at 1.0 → R ≈ 1.85-2.1. Hold it at 0.85 (buybacks resume) → R ≈ 1.6-1.8.
- Going above that needs debt. Debt capacity of ~1.5x EBITDA is roughly $1.5-2T cumulative across four AA-ish balance sheets. That could add $300-400B/yr for a few years. So C is financeable, but only with 4-5 years of zero free cash flow. No mega-cap has precedent for that; telecom 1999-2001 did it and then cut capex by roughly half within two years.

**Component 2: physical (GW).**
- At ~$45-50B of all-in capex per GW of IT load (chips ~60-70%), $700B ≈ 14-16 GW/yr.
- R = 2 ≈ 28-30 GW/yr for four firms in 2030. That is hard but reachable if chip $/GW rises (spend can grow faster than GW).
- R = 4 ≈ 55-60 GW/yr, comparable to all US utility-scale generation additions in a year. **D fails the physical check** unless $/GW roughly doubles.

**Component 3: the path so far.**
- 2027 consensus for the four is ~$935B, headline basis ([io-fund via search](https://io-fund.com/ai-stocks/ai-capex-1-trillion-estimates-too-low)). Cash basis that is ≈ $880B → R2027 ≈ 1.26.
- From there, R = 2 needs +16.7%/yr for 2028-30, and R = 4 needs +47%/yr.

**Component 4: composition (E1 lens).**
- As financing strain rises, buildout migrates off the cash line: finance leases, neocloud offtakes, SPV/JV structures like Meta's Hyperion. These are excluded by the question's definition, so the measured cash line understates the boom. Historical analogues: telecom vendor financing, shale drilled-but-uncompleted wells and MLPs.
- This biases measured R down in exactly the high-spend worlds.

**Scenario multiplication.**

| World | P | R distribution | Contribution |
|---|---|---|---|
| No bust by 2030 | 0.75 | lognormal, median 1.75, σ_ln ≈ 0.30, fat right tail | P(R≥2) ≈ 0.31, P(R≥4) ≈ 0.04, P(R<1) ≈ 0.01 |
| Bust 2028-29 (2027 peak ~$0.9-1.1T, then -35-50%) | 0.25 | 2030 ≈ $0.45-0.8T; floor = chip replacement (~$1.5T fleet / 5 yr × 0.65) + non-AI capex ≈ $0.4-0.5T | P(R<1) ≈ 0.55, else B |

Totals:
- **A ≈ 0.25×0.55 + 0.75×0.01 ≈ 0.145**
- **C ≈ 0.75×0.31 ≈ 0.23**
- **D ≈ 0.75×0.04 ≈ 0.03**
- **B ≈ 0.59**

Assumed correlations: bust probability is positively correlated with today's capex/OCF > 1. Lease migration is correlated with the high-R worlds, which pulls mass from C and D into B.

**Answer: A 15, B 59, C 23, D 3.**

## Q2: Epoch $10B training run, published by 2028-12-31 (model REFUSED; arithmetic only)

**Epoch data** (downloaded `notable_ai_models.csv` from [epoch.ai/data/ai-models](https://epoch.ai/data/ai-models), 2026-11-08):
- The headline column is "Training compute cost (2023 USD)". Its maximum is **Grok 4 at $388M** (2025-07-09), rated Confidence "Speculative". Next is GPT-4.5 at $366M.
- Epoch's caveat on Grok 4: "the FLOP and GPU-hour estimates for Grok-4 are largely based on public statements from xAI, which are often vague" ([Epoch data insight](https://epoch.ai/data-insights/grok-4-training-resources)).
- Epoch's confidence bands: "Confident" within 3x, "Likely" within 10x, "Speculative" within 30x.
- The largest-compute model is **GPT-6 Astra (2026-09-03, 9.4e26 FLOP, "Likely")**. It has **no headline cost estimate yet**; its hardware acquisition cost is listed as $4.23B.

**Growth components.**
- Headline cost: GPT-4 (Mar 2023) $37M → Grok 4 (Jul 2025) $388M = 10.5x in 2.33 yr = **2.7x/yr**.
- Frontier compute: 2.1e25 → 9.4e26 over Mar 2023 to Sep 2026 = 2.97x/yr. But Jul 2025 → Sep 2026 was only 1.9x in 14 months.
- Extrapolating the headline from $388M (Jul 2025) to Dec 2028 (3.45 yr):

| Growth rate | Dec 2028 headline |
|---|---|
| 2.4x/yr | $8B |
| 2.7x/yr | $12B |
| 3.5x/yr | $29B |

- From a late-2026 level of ~$0.5-0.7B (GPT-6 Astra at a newer-hardware $/FLOP), $10B needs ~3.3-3.8x/yr. That is above the 2.7x observed.
- **P(some run whose Epoch-method cost is ≥ $10B is published by end-2028) ≈ 0.33.**

**Physical check.**
- Epoch's amortized headline ≈ 3.6% of cluster upfront cost for Grok 4: $388M headline vs $10.7B "Training compute cost (upfront)".
- A $10B headline therefore needs roughly a $60-125B cluster (~1.5-3 GW) for a 6-12 month run. The 2027-28 GW-class sites (Stargate, Hyperion, Colossus 2) make this possible but not likely for a single run.
- E1 lens: a 2028 capex bust would cut exactly this tail.

**Coverage factor.**
- Epoch's cost coverage is collapsing. 2025: 8 of 109 notable models have a headline cost. 2026: **1 of 95**.
- **P(the qualifying model gets a headline cost estimate by 2029-12-31) ≈ 0.5.**

**Resolver ambiguity (flagged).**
- Epoch publishes in **2023 USD**, not nominal. That makes the threshold ~10% harder if converted.
- Epoch also publishes an "upfront" method, under which **Grok 4 is already $10.7B**. If a resolver read "any method it reports" loosely, the question would already be YES.
- I assign ~0.06 to a lenient or alternative-primary-method resolution (including a switch to the cloud-price method, which ran 3.9x the amortized figure for Grok 3).

**P = 0.06 + 0.94 × (0.33 × 0.5) ≈ 0.22. Answer: 22.**

## Q3: LMArena top-10 organizations all US/China on 2028-12-31 (model REFUSED)

**Current state.** A BenchLeader mirror of LMArena Text with style control, data dated 8 Nov 2026 ([benchleader.com](https://www.benchleader.com/benchmarks/lmarena_text)), lists distinct organizations at their best model as follows. The 11th is Baidu (#51).

| Org | Best rank | Country |
|---|---|---|
| Google | #1 | US |
| Meta | #3 | US |
| Anthropic | #4 | US |
| Moonshot | #19 | CN |
| OpenAI | #22 | US |
| Alibaba | #23 | CN |
| Zhipu | #26 | CN |
| Xiaomi | #29 | CN |
| DeepSeek | #37 | CN |
| SpaceXAI | #40 | US |

- **All ten are US/China today.**
- The 10th-place cutoff is ~1475 vs a top score of 1527.
- Mistral's entries sit around 1432-1434 (~#111) on an undated arena.ai snapshot, ~40+ Elo below the cutoff.
- Caveats: a mirror, not lmarena.ai itself (arena.ai returned HTTP 403 to my fetch). The search summary warned that "scores and ranks for the same models differ across sites".

**Decomposition.** P(No) = P(at least one non-US/China org beats the 10th-best of ~15-18 credible US/China orgs on that date).

| Path to No | p | Notes |
|---|---|---|
| Mistral | ~0.12 | Hardware acquisition cost of Mistral Large 4 is $157M vs GPT-6 Astra's $4.2B, a ~27x compute gap. Arena Elo rewards post-training and style, so the gap is closable but not likely. |
| Others combined | ~0.08 | Cohere, Sakana, LG, Naver/Upstage, TII/G42, Sarvam, UK labs |
| Chinese-founded lab re-headquartered offshore | ~0.03 | e.g., to Singapore |

1 − (0.88 × 0.92 × 0.97) ≈ 0.21.

E1 lens: a capex bust that consolidates US labs opens slots. A deep US/China pool (ByteDance, Tencent, MiniMax, StepFun, Amazon, Microsoft MAI, Nvidia waiting behind Baidu) closes them. The two roughly cancel.

**Answer: 77.**

## Q4: DefiLlama total stablecoins, 2028-12-31 (model REFUSED)

**Telemetry I pulled** (DefiLlama API `stablecoins.llama.fi/stablecoincharts/all`, summed over all pegs):

| Date | Supply |
|---|---|
| 2025-01-01 | $204B |
| 2025-10-01 | $297B |
| 2026-01-01 | $305B |
| 2026-07-01 | $305B |
| 2026-11-08 | **$294B**, down from ~$307.5B on 1 Oct |

So 2026 has been flat-to-down despite GENIUS Act legitimation.

**Components (horizon 2.15 yr).**
- **Crypto-trading collateral, ~$190B now.** Scales with crypto market cap: multiplier 2028/now P10 0.6 / P50 1.1 / P90 2.0 → $114B / $209B / $380B.
- **Payments, treasury and EM-savings slice, ~$100B now.** Growth P10 5% / P50 25% / P90 60% per year → $111B / $162B / $275B.
- Correlation between the two ≈ +0.5: both are risk-on and dollar-liquidity driven. E1 lens: an AI capex bust is risk-off, which hits slice 1.

**Sum.** P10 ≈ 250, P50 ≈ 365, P90 ≈ 640 ($B). Partial correlation narrows the tails relative to a fully comonotone sum.

## Q5: Fed numerical yield ceiling (≥1y maturity) before 2031 (model DIRECTIONAL)

**Decomposition.** P = P(stress state) × P(explicit numeric cap | stress) + P(political cap without crisis).

**Stress state by 2030 ≈ 0.35.** Possible triggers:
- a disorderly long-end selloff (10y at 5.12-5.17% in Sep 2026; 30y ~5.40%);
- a fiscal scare;
- a bust-driven recession at the lower bound.

**Explicit cap given stress ≈ 0.12.**
- The Fed's revealed preference is QE without a stated level; it studied and declined YCC in 2020.
- Chair Kevin Warsh "has argued against sustained use of the central bank's balance sheet and signaled that he would like to shrink it". His balance-sheet task force reports late 2026 or early 2027 ([IBTimes](https://ibtimes.com/bessent-wants-bring-treasury-yields-down-warsh-could-complicate-plan-3806665); [thewealthadvisor](https://www.thewealthadvisor.com/article/treasury-just-pushed-long-term-yields-down-makes-kevin-warshs-job-harder)).
- Treasury's current approach, as analysts describe it, is "informal yield curve control with no published targets and capped, temporary operations, and no Federal Reserve participation or unlimited purchase backstop". Buybacks of that kind do not count.

**Political cap without crisis ≈ 0.02.**

0.35 × 0.12 + 0.02 ≈ 0.06.

**Model (directional only).** World debt/GDP stays at 0.80-1.07 through 2030 in every run, below the 150% fiscal-dominance trigger, and the repression gap is 0 unless imposed. The sign is "no forced repression by 2030". The model has no Fed and no yields, so it cannot set the level.

**Answer: 6.**

## Q6: BLS nonfarm business labor share, CY2030 average (model DIRECTIONAL)

**Starting level.**
- The latest first print is **53.0% in 2026Q3**, "the lowest level in the series" ([BLS, 5 Nov 2026](https://www.bls.gov/news.release/archives/prod2_11052026.htm)). It reflects the 2026 NIPA annual update; Q2 was revised and the 52.8% figure is pre-revision.
- Earlier history, pre-revision, from search snippets of BLS tables: 2019 ~56.2; 2022 ~55.4; 2024 ~54.7; 2025 ~54.7 (Q1 55.3 → Q4 54.1).
- Q3 productivity was +3.6% and unit labor costs -0.7%.

**Components (to the 2030 annual average, ~4 yr).**

| Component | P10 | P50 | P90 | Basis |
|---|---|---|---|---|
| Structural trend | -1.6 | -1.0 | -0.5 | 2019-25 ≈ -0.25pp/yr |
| Extra AI substitution | -2.5 | -0.5 | 0 | the model's sign agrees: -0.1 to -1.9pp across runs, directional |
| Cyclical (E1 lens) | -0.3 | +0.3 | +1.8 | ~30% chance of a 2028-29 capex bust; labor share rises 1-2pp in recessions as profits fall first; record lows also mean-revert |
| First-print / vintage noise | | | ±0.4 | |

**Sum.** P50 ≈ 53.0 − 1.0 − 0.5 + 0.3 ≈ 51.8. Tails are combined with imperfect correlation. P10 ≈ 49.4, P50 ≈ 51.9, P90 ≈ 54.5.

The essay's "forty years in a decade" would be about −6 to −8pp. It sits below my P10.

## Q7: Indian IT big-5 headcount ≤ −10% (Mar 2029 vs Mar 2026) (model REFUSED)

**Level.**
- Combined headcount at 30 Sep 2026 ≈ 1.545M: TCS 598k, Infosys 333k, HCLTech 230k, Wipro 236k, TechM ~148k (TechM is my estimate, unverified).
- TCS was ~584.5k at Mar 2026 (607,979 at Mar 2025 − 23,460).
- Combined Mar 2026 ≈ 1.52-1.53M, so the threshold is ≈ 1.37M. That is ~ −11% from Sep 2026 in 2.5 years.
- The latest quarter was **+13,918** net: the line is currently rising.

**Identity.** Headcount growth ≈ revenue growth − revenue-per-employee growth.
- Hitting −10% over three years needs RPE growth to exceed revenue growth by ~3.5pp a year, e.g. revenue +1-2%/yr with AI-driven RPE +5%.
- Precedent: FY2024 saw a ~4% one-year combined decline in a mild demand slowdown. That is roughly one-third of the needed drop in one year, but it was not sustained.
- E1 lens: a US capex bust and recession in 2028 would cut discretionary IT budgets just as AI deflates billable effort. The two are correlated.
- Acquisitions add staff and work against a Yes.

**Probabilities.**
- P(revenue growth ≤ 2%/yr over FY27-29) ≈ 0.4.
- P(RPE growth ≥ revenue growth + 3.5pp | weak revenue) ≈ 0.45.
- P(Yes | revenue holds up) ≈ 0.03.
- 0.4 × 0.45 + 0.6 × 0.03 ≈ 0.20.

**Answer: 20.**

## Sources

- Big-4 cash flows: [fourweekmba Q3 FCF](https://fourweekmba.com/ai-big-tech-free-cash-flow-turns-negative-in-a-93b-swing/), [ppc.land Alphabet](https://ppc.land/alphabets-free-cash-flow-drops-to-negative-9-1bn-despite-26-2bn-profit/), [Meta guidance](https://letsdatascience.com/news/meta-narrows-2026-capital-spending-range-to-135-billion-145-46f12e07), [2027 consensus](https://io-fund.com/ai-stocks/ai-capex-1-trillion-estimates-too-low), [Khaleej Times/Reuters LSEG](https://www.khaleejtimes.com/business/tech/ai-investment-boom-puts-big-techs-free-cash-flow-under-pressure). All are secondary; I did not check transcripts or 10-Qs.
- Epoch: [AI models database and CSV](https://epoch.ai/data/ai-models), [Grok 4 training resources](https://epoch.ai/data-insights/grok-4-training-resources).
- LMArena mirror: [BenchLeader LMArena Text, 8 Nov 2026](https://www.benchleader.com/benchmarks/lmarena_text). arena.ai itself returned 403.
- Stablecoins: DefiLlama API `https://stablecoins.llama.fi/stablecoincharts/all`, pulled 2026-11-08.
- Fed/Treasury: [IBTimes](https://ibtimes.com/bessent-wants-bring-treasury-yields-down-warsh-could-complicate-plan-3806665), [thewealthadvisor](https://www.thewealthadvisor.com/article/treasury-just-pushed-long-term-yields-down-makes-kevin-warshs-job-harder).
- Labor share: [BLS Productivity and Costs, 5 Nov 2026](https://www.bls.gov/news.release/archives/prod2_11052026.htm), [BLS TED 52.8% Q2](https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm).
- Model: adapter output above (`adapter-output.md`, reproduced at `e319e77`).

## Seat: signals

**Numbers:** q1={'A': 12, 'B': 38, 'C': 40, 'D': 10} | q2=33 | q3=84 | q4={'p10': 225, 'p50': 345, 'p90': 540} | q5=8 | q6={'p10': 48.6, 'p50': 51.6, 'p90': 54.4} | q7=12

# E1 ai-capital-cycle / signals (A3, Wave 1)

**BLUF.** The freshest telemetry (October 2026 earnings, Nvidia, GPU rental prices) shows the capex
line still accelerating into 2027, but it has crossed the classic late-cycle threshold: three of the
Big-4 posted negative free cash flow in Q3 2026, Meta is selling up to ~$95B of stock, and hyperscaler
CDS and SPV project-bond yields have repriced wider. I read that as momentum strong enough to put
R >= 2 roughly as likely as a plateau, with a thin tail for the essay's line; the other six
questions are read through what the cycle does to costs, wages and policy. Three resolver problems
are flagged in the audit (Q2 deflator, Q3 domain/rename, Q6 vintage of an annual average).

Lens discipline: every number below is an observed indicator with its source's own caveat; where
the source is secondary press I say so. I did not read other seats' files.

---

## Q1: Big-4 capex, CY2030 / CY2026 (centre of gravity)

### Signals

1. **Q3 2026 cash-flow capex lines (target definition), ~$202B in one quarter.** Per a compilation of
   the Q3 releases ([Stock Metric Lab](https://stockmetriclab.com/ai-capex-comparison-2026/)):
   Alphabet purchases of P&E $51.355B; Microsoft cash P&E additions $39.367B (FY27 Q1); Amazon
   gross purchases of P&E $77.259B ($75.878B net of $1.381B proceeds and incentives); Meta
   $34.906B, which is "P&E of $33.942bn plus $0.964bn finance-lease principal". Sum of the four
   cash P&E lines (Meta at $33.942B): **$201.9B**, matching
   [24/7 Wall St's $201.9B record](https://247wallst.com/cards/amzn-xpost-01m6brbqw7crxv3sfsg6jnhzy6).
   Source caveat verbatim: "Amazon's net figure is SML-calculated. Meta includes finance-lease
   principal. Microsoft's figure excludes non-cash finance-lease additions." The compiler also
   says its sources are "mostly secondary analysis rather than the companies' filings".
   Implication for the denominator: on the locked cash lines CY2026 is likely ~$700-750B, a little
   below the ~$720-745B headline guidance, because Microsoft's ~$170B CY2026 figure includes finance
   leases ([fourweekmba](https://fourweekmba.com/ai-microsoft-lowers-2026-capex-view-to-170b-eyes-new-funding/);
   the Microsoft call quotes come from "a machine transcript of the webcast", unconfirmed).
2. **2027 direction: up, no numbers.** Alphabet CFO: "We continue to expect our capex to increase
   significantly in 2027, and will provide further details on our Q4 call"; CNBC reports 2027
   "projected to exceed $300 billion" (a projection, not guidance)
   ([CNBC, Oct 28](https://www.cnbc.com/2026/10/28/alphabet-googl-earnings-q3-2026.html)). Amazon expects
   to "spend meaningfully more in 2027"; Meta declined to guide ("still developing our budget and
   capacity plans for next year"); Microsoft trimmed CY2026 from ~$175B to ~$170B
   ([trade summary](https://www.datacentres.com/guides/hyperscaler-capex-trends)). Pre-earnings sell-side
   2027 consensus ~$934.5B (+28%), dated Oct 4, i.e. before the reports
   ([yieldtheory](https://www.yieldtheory.app/research/hyperscaler-capex-2027-forecast)); secondary, not checked.
3. **Supplier telemetry: still accelerating.** Nvidia FY27 Q2 (to Jul 26 2026): revenue $96.2B
   (+106% y/y), data-center $89B (+117%), hyperscale within DC $48.71B (+102%); Q3 guide $108.0B
   "plus or minus 2%", and the outlook "excludes Data Center compute revenue from China"; first
   year-ahead forecast of ~70% revenue growth, "although the company continues to face supply
   constraints" ([Unite.AI](https://www.unite.ai/nvidia-posts-96-2b-quarter-as-data-center-revenue-hits-89b/),
   [Verdict](https://www.verdict.co.uk/nvidia-q2-fy27-results/)). AWS-Nvidia: two million more GPUs
   in 2027-2028. Nvidia FY27 Q3 reports later in November.
4. **Utilisation / pricing telemetry: no glut yet.** Median on-demand H100 SXM ~$4.20/GPU-hr on Oct 7
   2026 (range $3.20-$12.29); one index has rental prices "up 12% over the last 12 months, with 16 of
   21 models rising and 5 falling"; Nebius raised H100 $3.85 -> $4.50 on Oct 1 2026
   ([Uvik index](https://uvik.net/blog/gpu-price-index/), [getdeploying](https://getdeploying.com/gpu-price-index)).
   Caveat from the compiling search: "these are mostly vendor or aggregator pages, and their samples
   differ". I found **no** reporting of data-center lease cancellations in 2026 (absence of evidence,
   not a measured zero). Telecom 2001 analogue: dark-fibre prices collapsed BEFORE capex rolled over;
   that leading indicator is currently pointing the other way.
5. **Cash-flow crossover has happened.** Epoch's SEC-XBRL fit (MSFT, AMZN, GOOGL, META, ORCL): CFO
   grows ~23%/yr, cash capex ~70%/yr, "these trends cross around the third quarter of 2026"; CY2026 Q1
   actuals CFO $157.9B vs capex $148.4B. Caveats verbatim: "The crossover is sensitive to the fit
   window"; "The trend extensions are simple extrapolations of the existing trends, not
   all-things-considered forecasts"; "we do not directly model how the surge in AI-related capex will
   affect hyperscalers' future operating cash flow"
   ([Epoch](https://epoch.ai/data-insights/hyperscaler-capex-vs-cash-flow)). Q3 actuals: Alphabet FCF
   -$9.07B "far worse than the $2.70 billion analysts had expected" (CNBC above); Meta capex ~$34.9B vs
   ~$32.8B CFO; Amazon TTM FCF ~-$42.4B on its own definition
   ([CNBC Oct 27](https://www.cnbc.com/2026/10/27/ai-debt-hyperscaler-earnings.html),
   [letsdatascience](https://letsdatascience.com/blog/hyperscaler-ai-capex-outruns-cash-flow-q3-2026-oracle)).
   Microsoft is the exception.
6. **Financing has moved outside the firm.** Meta: up to ~$95B equity, "the first issuance of new stock
   since 2013"; only ~$35B launched immediately, with a proposed $60B ATM from 2027Q1; "Meta says ... it
   expects no initial proceeds from that sale; proceeds would come at future settlement"
   ([Semafor](https://www.semafor.com/article/10/26/2026/meta-announces-95b-offering-to-fund-ai),
   [InvestmentNews](https://www.investmentnews.com/equities/meta-plots-95b-stock-offering-as-ai-spending-drains-cash-flow/268740));
   details differ across sources. Goldman: hyperscalers issued ~$296B of bonds YTD vs a $250B full-year
   baseline, covering ~36% of five hyperscalers' 2026 capex
   ([404k Research summary of GS](https://404kresearch.substack.com/p/the-ai-buildout-enters-the-debt-era); secondary).
   CDS: Meta +177% YTD, Amazon +129%; S&P sees negative free operating cash flow in 2026 and 2027;
   strategist: "The market is really not concerned about credit quality at this point" (CNBC Oct 27).
   SPV project debt: Hyperion (Meta/Blue Owl, ~$27-30B, A+) at 6.58%; El Paso (~$12B) "expected to yield
   more than 7%, around 0.4 percentage points above" Hyperion
   ([Capacity](https://capacityglobal.com/news/metas-12bn-el-paso-bond-exposes-ai-debt-repricing/)).
   Morgan Stanley: up to $800B private credit via asset-specific structures by 2028 (secondary).
7. **Rates backdrop.** 10y 4.86% on Nov 6 2026 (one source,
   [Advisor Perspectives](https://www.advisorperspectives.com/dshort/updates/2026/11/06/treasury-yields-snapshot-november-6-2026)),
   down from 5.17% on Sep 25; the FOMC hiked in September (Fortune, below). Hyperion-style 20-year
   bonds against 4-6-year chips is the duration mismatch the press flags.

### Reading through the cycle lens
Railroads (1850s, 1870s), telecom (2000) and shale (2014) all show the same telemetry sequence:
capex growth outruns internal cash, external finance fills the gap at widening spreads, and capex
peaks within ~1-3 years of the financing turn, usually when the product price breaks. Today we have
steps 1-2 but not the price break (GPU rents rising, cloud revenue doubling at Google: Q3 cloud revenue
$30.7B "more than double the prior year"). Committed 2027-28 hardware (AWS 2M GPUs, Hyperion 3.7M
H100e by Jan 2028 per [Epoch trends](https://epoch.ai/trends)) makes 2027 > 2026 near-certain (R_2027
~1.3-1.4). From there: if capex converges to CFO and CFO keeps growing ~23%/yr, R_2030 ~ 2.1-2.4
(edge of C); if the price break comes in 2028, telecom-style falls of 40-60% from peak put 2030 in A or
low B. D needs ~40%/yr AFTER the financing turn, which no reference cycle sustained for three more
years with negative FCF.

**Q1: A 12 / B 38 / C 40 / D 10.**

---

## Q2: Epoch training cost >= $10B for a model published by 2028-12-31 (centre of gravity)

### Signals
- Epoch trend: training cost "3.5x per year since 2020 (90% CI: 2.8x to 4.4x)"; compute "5x per year
  since 2020 (90% CI: 4x to 6x)"; "A typical AI data center with 1 gigawatt of IT power costs roughly
  $38 billion in up-front capital expenditure"; Colossus 2 "estimated computing capacity of 1.1
  million H100-equivalents"; "Meta Hyperion is expected to have over 3x more computing capacity, at
  3.7M H100-equivalents by January 2028" ([epoch.ai/trends](https://epoch.ai/trends)).
- Latest published Epoch cost point I can verify: **Grok 4 (Jul 2025), median $490M**, 246M
  H100-hours, rental-price method with "a 90% confidence interval of $1.90 to $2.20 per H100-hour".
  Epoch caveat verbatim: "The FLOP and GPU-hour estimates for Grok-4 are largely based on public
  statements from xAI, which are often vague. So there is significant uncertainty around our point
  estimate" ([Epoch data insight](https://epoch.ai/data-insights/grok-4-training-resources)).
- Frontier compute in 2026 is **below** the 5x line: Epoch reportedly estimates GPT-6 Astra (Sep 2026)
  at 9.4e26 FLOP vs Grok 4's 5.0e26 fourteen months earlier (~1.9x). Third-party caveats: the estimate
  "may be 'somewhat inflated'", and "Astra likely did not monopolize the entire cluster, as other
  models were trained simultaneously"; Google, Meta and xAI "have completed runs without public
  estimates" ([FutureSearch, Oct 17 2026](https://futuresearch.ai/app/p/a/rsi-largest-training-compute)).
  I could not find an Epoch dollar figure for Astra; scaling Grok 4's $490M by ~1.9x compute and ~1.4x
  cheaper FLOP gives ~$0.65B (my arithmetic, not Epoch's).
- Path arithmetic: $0.65B (Sep 2026) to $10B (by Dec 2028) is 15x in 2.3 years = ~3.3x/yr, i.e. it
  needs the trend to hold exactly from a point that is already below it. Feasibility exists: a 100-day
  run on all 3.7M H100e of Hyperion at Grok-4's ~$2/H100e-hr is ~$18B (my arithmetic), but labs split
  clusters across concurrent runs, and Epoch notes frontier runs "can't get much longer"
  ([Epoch](https://epoch.ai/data-insights/longest-training-run)).
- Cycle consequence: the financing strain in Q1 lands first on discretionary single-run size, not on
  inference capacity that has paying customers; a 2028 capex wobble cuts the tail here.
- Coverage: Epoch's database shows only models "where we have estimates", and per-model cost exists
  only where compute and hardware are known; closed-lab frontier models are exactly the ones whose
  cost is often missing.

**Q2: 33.**

---

## Q3: All ten top LMArena organizations US or PRC on 2028-12-31

### Signals
- Third-party snapshot of the style-controlled Text board, data as of 8 Nov 2026
  ([BenchLeader](https://www.benchleader.com/benchmarks/lmarena_text)): best model per organization,
  in order: Google 1527, Meta 1513, Anthropic 1505, Moonshot AI 1488, OpenAI 1485, Alibaba 1483,
  Zhipu AI 1482, Xiaomi 1480, DeepSeek 1475, SpaceXAI 1475. **All ten distinct top organizations are
  US or PRC today; the question would resolve Yes now.** Caveat: this is a scrape by a third party;
  the official page returned HTTP 403 to me and "lmarena.ai" now 301-redirects to arena.ai.
- Nearest non-US/PRC contender: Mistral. Mistral Large 3 ~1,414.8 in an Aug 12 2026 snapshot (vs
  GPT-5.5 ~1,476.6); a Mistral Medium 3.5 figure of ~1,481.8 appears on one aggregator but "the
  labeling on that page is inconsistent" and it does not appear in the Nov 8 top 40
  ([gradually.ai](https://www.gradually.ai/en/llm-comparison/gpt-5.5-vs-mistral-large-3/)). Gap to
  the 10th organization: ~60 Elo on the verifiable figure.
- Margin is thin at the bottom: 10th place is a ~1475 tie, and Chinese organizations hold 5 of 10
  seats, so any PRC-lab fade opens a slot to whoever is 11th (unknown from my snapshot; could be
  another US/PRC lab such as ByteDance, Tencent or Amazon).
- Cycle consequence: a capital-cycle bust thins the US commercial tier first (the essay's
  "principalities" survive), which helps sovereign or EU entrants only if they are already close; none
  is.

**Q3: 84.**

---

## Q4: DefiLlama stablecoin market cap on 2028-12-31

### Signals
- DefiLlama total ~$290.1B on Nov 8 2026, "down about 2.2% over the past week and about 4.9% over 30
  days"; USDT ~$176.8B, USDC ~$70.6B ([DefiLlama](https://defillama.com/stablecoins), read via search
  snapshot). Another report: ~$292.31B on Nov 7 after "a $6.66B weekly drop, the steepest of 2026";
  cause disputed ("One ties the November outflow to a Binance security breach, but notes neither
  issuer has linked the two events")
  ([cryptonews](https://cryptonews.net/news/analytics/33719810/)).
- So 2026 is **flat to down**: ~$308B end-2025 -> record ~$322B (26 May) -> ~$290B now (~-6% YTD),
  after ~+50% in 2025. No AI-driven "near-unlimited demand" is visible in the series yet.
- Catalyst: OCC GENIUS Act final rule (Oct 2026), effective 18 Jan 2027; "OCC expects to begin
  processing issuer applications in 2027"; Treasury/FinCEN status unclear
  ([Decrypt](https://decrypt.co/381502/occ-finalizes-genius-act-stablecoin-rules-ahead-of-january-deadline),
  [CryptoBriefing](https://cryptobriefing.com/occ-final-rule-genius-act-stablecoins/)). Bank
  "tokenized deposits" may not be listed by DefiLlama as stablecoins.
- Cycle consequence: stablecoin supply has tracked crypto-cycle liquidity and the T-bill/IORB spread;
  a higher-for-longer rate path (Fed hiked Sep 2026) favours yield-bearing substitutes over
  non-yielding coins, and GENIUS bans issuer-paid yield.

**Q4: P10 $225B / P50 $345B / P90 $540B.**

---

## Q5: Fed numerical Treasury yield ceiling/target (>= 1y) announced before 2031

### Signals
- Treasury, not the Fed, is acting on the long end: Aug 19 2026 Treasury doubled max long-dated
  buyback size from $2B to "at least $4 billion per operation"; Bessent: "We have a big toolkit, so
  we'll see"; "the Treasury and the Fed would work together if there was any change in the balance
  sheet" ([CNBC Aug 20](https://www.cnbc.com/2026/08/20/bessent-warsh-fed-bond-market-treasury-yields.html)).
  Buybacks are excluded by the question.
- Fed Chair Warsh wants a smaller balance sheet tilted to bills ("would likely push up long-term
  Treasury yields", CNBC) and an updated accord in which "The Treasury secretary would need to find the
  proposed change in Fed holdings acceptable". A Warsh balance-sheet task force is "expected to report
  late this year or early next". CNBC: neither the Fed nor Treasury has issued an official statement
  ruling yield curve control in or out.
- The FOMC hiked unanimously in September 2026, then held; Brookings' Robin Brooks: "What's happening
  is yield curve management"; "Warsh is neither hawk nor dove" ... "just trying to keep long-term yields
  manageable" ([Fortune, Nov 1](https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/)).
  That is one economist's interpretation; Fortune's article reports no Warsh statement on YCC and no
  numeric target.
- 10y 4.86% (Nov 6), back under 5% from 5.17% (Sep 25). CBO baseline yields 4.3% with stress scenarios
  +50 and +150bp (Fortune).
- Cycle consequence: an AI capex bust is disinflationary and lowers yields on its own, removing the
  motive for an explicit cap; the YCC path needs a yield spike with weak growth (fiscal dominance).
  The telemetry shows informal management and accord talk, not a numeric peg.

**Q5: 8.**

---

## Q6: BLS nonfarm business labor share, CY2030 average

### Signals
- **Q3 2026 preliminary: 53.0%, "the lowest level in the series, which begins in the first quarter of
  1947"** (BLS USDL 26-1631, Nov 5 2026, [PDF](https://www.bls.gov/news.release/pdf/prod2.pdf)).
  Productivity +3.6% (SAAR), ULC -0.7%, real hourly compensation +1.0% over four quarters vs
  productivity +2.1%. Revised Q3 release: Dec 8 2026.
- **Vintage warning:** the release "reflect[s] the 2026 Annual Update of the National Income and
  Product Accounts"; "measures incorporating compensation were revised back to 2021 for all sectors".
  The pre-revision vintage had Q2 2026 at 52.8% ([BLS TED](https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm));
  since 53.0% is now the series low, Q2 was revised up above 53.0%. The preamble's 52.8% baseline is
  stale.
- Pre-revision path (TED): Q1 2025 55.3, Q2 54.7, Q3 54.2, Q4 54.1, Q1 2026 53.6, Q2 52.8: about -2pp in
  five quarters. Decade average cited ~55.6% (Fortune, Jan 2026).
- Cycle consequence: labor share is counter-cyclical to profits. Capex booms raise measured output and
  profits (share falls); busts crush profits first (share jumps, as in 2001-02 and 2008-09). So the
  capital-cycle lens says the 2030 value depends on WHERE in the cycle 2030 sits: a 2028-29 bust
  lifts it back toward 54-55; a still-running boom plus automation extends the slide.

**Q6: P10 48.6 / P50 51.6 / P90 54.4.**

---

## Q7: Indian IT big-5 headcount 31 Mar 2029 at least 10% below 31 Mar 2026

### Signals
- **31 Mar 2026 base (company-reported via press):** TCS 584,519; Infosys 328,594; Wipro 242,156;
  HCLTech 227,181; Tech Mahindra 147,623 = **1,530,073**. FY26 combined -7,389 vs +12,718 in FY25
  ([IANS](https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000)).
  Infosys's Q4 change is disputed in press (+888 vs -8,440); the 328,594 level reconciles with the Q1
  FY27 combined +5,480 reported later, so I use it.
- **30 Sep 2026:** TCS 598,056; Infosys 332,542; HCLTech 230,339; Wipro 236,328; Tech Mahindra
  152,206 = **1,549,471** (+13,918 in Q2 FY27 after +5,480 in Q1)
  ([Lapaas](https://lapaasvoice.com/tcs-infosys-hcltech-wipro-and-tech-mahindra-add-13918-employees-in-q2-fy27),
  [AngelOne](https://www.angelone.in/news/stocks/indian-it-stocks-in-focus-top-five-firms-add-16-055-employees-in-h1fy27-but-demand-recovery-remains-uncertain)).
  Analyst caveat: the hiring numbers "do not yet signal a recovery"; Infosys cut FY27 revenue-growth
  guidance to 1-2% from 1.5-3%. Infosys fresher hiring >8,000 in Q2; HCLTech 6,136 freshers.
- **Threshold:** 0.9 x 1,530,073 = 1,377,066, i.e. **-11.1% from the Sep 2026 level** in ten quarters
  (~-172k). The worst recent year (FY24) cut roughly 4% from the group (my recollection, unverified).
- Cycle consequence: hyperscaler capex is cannibalising enterprise IT budgets at the margin and
  revenue guidance is weak, but the telemetry shows headcount RISING in H1 FY27, with fresher intakes
  intact. The essay's "bottom K" mechanism shows in revenue per employee and Wipro, not yet in the
  aggregate.

**Q7: 12.**

---

## Resolution audit (resolver read-as-written check)

1. **Q2: deflator mismatch.** Epoch's explorer labels the cost field "Training compute cost (2023
   USD)" ([epoch.ai/data/ai-models](https://epoch.ai/data/ai-models)), i.e. constant dollars, while Q2
   says "nominal USD". A model at ~$9.0-9.9B in 2023 USD could be >= $10B nominal (2023->2028
   inflation ~10-15%). The resolver must either convert (which index?) or accept Epoch's headline as
   is. Recommend: amend to "Epoch's headline training-cost figure as published, in whatever dollar
   basis Epoch uses", or specify the conversion. Also Epoch reports cost via more than one method
   (rental price vs amortized hardware for Grok 4); "any method it reports as primary" needs a
   tie-break if two are shown.
2. **Q3: the named resolver has been renamed.** lmarena.ai 301-redirects to arena.ai ("Arena"); the
   fallback rule (closest successor by same publisher) covers it, but the question text should say so
   to avoid a cancellation argument. Also the official page returned 403 to automated fetch;
   resolution needs a human or archived snapshot at 2028-12-31. **Geography:** several PRC labs'
   ultimate parents are Cayman-incorporated (Alibaba Group Holding, ByteDance Ltd); the lock says
   "headquarters (ultimate parent)", which I read as operating HQ (Hangzhou, Beijing), but an
   incorporation reading would turn Yes into No. Recommend stating "operating headquarters".
   "SpaceXAI" (xAI after the SpaceX combination) is US either way.
3. **Q6: annual average vs vintage rule.** The percent labor share appears in the release TEXT only
   for the latest quarter; the published tables carry the index. A "calendar-2030 annual average" first
   becomes computable from the Q4 2030 preliminary release (~Feb 2031), but each quarter's percent is
   first printed in a different release, and the Q4 2030 release will have revised Q1-Q3. Recommend:
   resolve on the Q4 2030 preliminary release's vintage of all four 2030 quarters (from the BLS
   labor-share percent data series), averaged. The preamble's 52.8% baseline is already superseded
   by the Sep 2026 NIPA revision (Q3 2026 = 53.0% is the new low).
4. **Q1:** readable as written. Note Amazon's line is GROSS "Purchases of property and equipment"
   (proceeds and incentives are a separate line, and "incentives are excluded" means not netted), and
   Meta's headline capex adds finance-lease principal that the lock excludes. Microsoft's headline
   ~$170B includes finance leases; its cash line is materially lower, so the CY2026 denominator will
   be below the $720-745B headline.
5. **Q4, Q5, Q7:** readable. Q7: Infosys's 31 Mar 2026 figure is disputed in secondary press; resolve
   from the company's Q4 FY26 fact sheet.

## Sources (primary where available)
- BLS Productivity and Costs Q3 2026 preliminary, USDL 26-1631: https://www.bls.gov/news.release/pdf/prod2.pdf
- BLS TED, labor share 52.8% Q2 2026 (pre-revision): https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm
- Epoch AI trends: https://epoch.ai/trends ; capex vs cash flow: https://epoch.ai/data-insights/hyperscaler-capex-vs-cash-flow ; Grok 4: https://epoch.ai/data-insights/grok-4-training-resources ; models DB: https://epoch.ai/data/ai-models
- CNBC Alphabet Q3: https://www.cnbc.com/2026/10/28/alphabet-googl-earnings-q3-2026.html ; AI debt: https://www.cnbc.com/2026/10/27/ai-debt-hyperscaler-earnings.html ; Bessent/Warsh: https://www.cnbc.com/2026/08/20/bessent-warsh-fed-bond-market-treasury-yields.html
- Stock Metric Lab Q3 capex table: https://stockmetriclab.com/ai-capex-comparison-2026/
- Semafor, Meta equity: https://www.semafor.com/article/10/26/2026/meta-announces-95b-offering-to-fund-ai
- Fortune on Warsh/yields: https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/
- DefiLlama stablecoins: https://defillama.com/stablecoins
- BenchLeader Arena text snapshot: https://www.benchleader.com/benchmarks/lmarena_text
- FutureSearch on largest training compute: https://futuresearch.ai/app/p/a/rsi-largest-training-compute
