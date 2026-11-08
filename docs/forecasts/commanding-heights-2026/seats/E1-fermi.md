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

```json
{"q1": {"A": 15, "B": 59, "C": 23, "D": 3},
 "q2": 22, "q3": 77,
 "q4": {"p10": 250, "p50": 365, "p90": 640},
 "q5": 6,
 "q6": {"p10": 49.4, "p50": 51.9, "p90": 54.5},
 "q7": 20}
```
