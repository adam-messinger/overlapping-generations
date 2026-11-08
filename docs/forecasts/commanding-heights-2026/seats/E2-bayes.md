# E2 compute-geopolitics, bayes seat (A4, Wave 2)

**BLUF.** I start from my effort's outside-view numbers as priors. One signal moves a centre-of-gravity question a long way: the Arena text board is closed today, with all of the top ten or eleven organizations US or Chinese and the best outsider 40-60 Elo below the cutoff. That lifts Q3 from 30 to **66**. For Q2, three things together pull it down from 20 to **18**: the largest logged run grew only ~1.9x in 14 months, Epoch has costed no frontier model since July 2025, and a small resolver-ambiguity channel (Grok 4's "upfront" column is already $10.7B) partly offsets those two. Most of the other updates are weak, under 2:1, and I flag them. The posteriors stay close to the priors except for Q1, where the 2027 consensus moves mass from A to B, and Q6, where the prior's baseline was wrong by +0.55pp and I correct it before updating.

Method. Each prior is the outside-view seat's number. Each signal comes from my effort's signals or fermi seat and gets a likelihood ratio LR = P(signal | H) / P(signal | not H). The update is posterior odds = prior odds x product of LRs. I treat signals as conditionally independent only after removing overlaps, and I say where I did that. **Flag** marks an LR I cannot justify at or beyond 2:1 (LR between 0.5 and 2). Model outputs from the fermi seat's adapter are directional, so I give them LRs near 1 and never use them as levels.

---

## Q2: Epoch lists a >= $10B training run published by 2028-12-31 (centre of gravity)

**Prior: 20%.** The outside-view arrived at 0.4 x 0.6 = 0.24, then rounded down for 2023-USD deflation. I split the 20% into its two conjuncts so that each signal updates only the conjunct it bears on:
- P(run) = P(a run worth >= $10B nominal (~$8.7B 2023 USD) is completed and published by 2028-12-31) ≈ 0.33
- P(cov) = P(Epoch prints a headline cost for it by 2029-12-31 | it exists) = 0.60
- Check: 0.33 x 0.60 ≈ 0.20.

### Conjunct 1, the run itself

| # | Signal (seat) | P(s given H) | P(s given not H) | LR | Note |
|---|---|---|---|---|---|
| E1 | The largest logged compute went from Grok 4 at 5.0e26 (Jul 2025) to GPT-6 Astra at 9.4e26 (Sep 2026), ~1.9x in 14 months, ~1.7x/yr (signals, fermi). Epoch's note: "CI of ~[5e26, 2e27] FLOP". Caveat: closed labs (Anthropic, Google) "have no compute estimates for their 2026 frontier models". | 0.40 | 0.62 | **0.65** | **Flag (<2:1).** Logged-maximum series have stalled for 12-18 months before and then jumped. The Astra CI's top end is ~4x, and "largest logged" is not "largest run". |
| E3 | Big-4 2026 capex ~$720B, 2027 consensus ~$1T on a headline basis. GW-scale single sites by 2028: Abilene ~1.2 GW, Colossus 2 >1 GW, Hyperion (fermi, signals). | 0.95 | 0.80 | **1.2** | **Flag.** Capex keeps growing in both worlds, because most of it is inference and fleet. |
| E6 | Fermi's physical decomposition: $10B needs a 0.8-2 GW run lasting 4-6 months. At historical final-run shares of ~10-15%, a 4-6 GW fleet gives $2-6B, so $10B needs an all-in or 8-10 GW lab. | — | — | **0.85** | **Flag.** This is a re-derivation, not an observation. It mostly restates the slowdown in E1, so I discount it. |

Overlap removed: the signals seat's own back-projection (GPT-6 Astra at ~$0.5B, which needs ~3.8x/yr) is the same observation as E1, so I do not count it twice.

Posterior odds = (0.33/0.67) x 0.65 x 1.2 x 0.85 = 0.4925 x 0.663 = 0.327, so **P(run) = 0.246**.

### Conjunct 2, Epoch coverage

| # | Signal | LR on coverage odds | Note |
|---|---|---|---|
| E2 | The signals seat reads Epoch's CSVs: "Of 417 models in Epoch's database dated since 2025-08-01, only 2 have a `Training compute cost (2023 USD)` value" (both SK Telecom). GPT-5 has had no cost for 15 months and GPT-6 Astra none for 2 months. But the column is maintained (Grok 4's row was modified 2026-11-06), and Epoch costed the previous record run, Grok 4, within ~2 months ([Epoch data insight](https://epoch.ai/data-insights/grok-4-training-resources)). | **0.67** (1.5 → 1.0) | **Flag.** The 2-of-417 count is dominated by small models Epoch never costs. The relevant n is about 2 record-holding runs, of which 1 was costed. A first $10B run would be the salient kind of run Epoch writes up. |

P(cov) goes from 0.60 to **0.50**.

### Resolver channel

The signals seat found that `Training compute cost (upfront)` already shows **$10.72B for Grok 4**. The question says "headline ... any method it reports as primary", and Epoch's headline is the amortized 2023-USD column. Both seats recommend locking that column. I give a resolver reading the upfront column, or Epoch switching its primary method, **4%**.

The signals seat also quotes Epoch's own caveat, verbatim: the estimates "are largely based on public statements from xAI, which are often vague"; "There is significant uncertainty around our point estimate". That noise can push a true run just under the bar over it. Because most of the mass sits below the threshold, symmetric noise adds a net **+0.02**.

### Arithmetic

| Step | Value |
|---|---|
| Amortized-column path: 0.246 x 0.50 + 0.02 | 0.143 |
| Add resolver channel: 0.04 + 0.96 x 0.143 | **0.177** |

**Q2 = 18.** If the orchestrator locks the amortized column, my number is 14.

---

## Q3: All ten top Arena organizations US or PRC on 2028-12-31 (centre of gravity)

**Prior: 30%.** The outside-view's reference class is two-country closure of a frontier-tech top 10 (about 1 in 7 lists), with the internet-platforms list weighted double. That class is unconditional: it never looked at the current board. Over a horizon of only 25 months, the current state is the most diagnostic evidence there is.

| # | Signal (seat) | P(s given H) | P(s given not H) | LR | Note |
|---|---|---|---|---|---|
| S1a | **The board is closed today.** The signals seat's 8 Nov 2026 BenchLeader mirror shows the 11 best-placed organizations all US or Chinese, with "no non-US/China organization ... in the visible top 60". The fermi seat's independent 8 Oct snapshot agrees, 10 of 10. Caveats verbatim: the mirror shows "no confidence intervals or vote counts"; the 10th place "is a tie at the displayed precision"; outside aggregators "disagree on who is #1". | 0.90 | 0.30 | **3.0** | Justified above 2:1. If the board is closed in 2028, it is almost surely closed now. Open-2028 worlds mostly run through an outsider that is already near the cutoff, or a new entrant. The 2024 → 2026 history (Cohere and Mistral dropped out) shows composition persisting or closing, never reopening. |
| S1b | **Depth of the gap.** Mistral Large 3 is ~1,415 (± 4, 41,365 votes) or 1,431.8 on third-party sites. Mistral Large 4 was "Added to Text Arena" on 2026-10-08 with no score found. That puts the best outsider ~40-60 Elo below #10, with >= 9-11 US/China organizations in between. | 0.70 | 0.40 | **1.75** | **Flag (<2:1).** Correlated with S1a, so I keep it modest. Preliminary scores move ± 10-20, and top scores rise ~50-70 Elo/yr, so the gap is ~8-12 months of frontier progress. |
| S2 | **Compute stock.** Mistral Large 4 at 1.24e25 FLOP ("Confident"), ~1/75 of GPT-6 Astra. Korea's 4.7T won programme publishes its specs only in Dec 2026. The UAE's K2-Think "is built on Alibaba's Qwen 2.5" (secondary). | 0.85 | 0.65 | **1.3** | **Flag.** Partly redundant with S1b, since the Elo gap already reflects compute. |
| S3 | **China squeeze.** "ABOUT 600,000 of Nvidia's advanced AI chips are stored in Hong Kong awaiting shipment" while Beijing withholds approval ([Manila Times/Reuters](https://www.manilatimes.net/2026/11/07/business/foreign-business/china-puts-nvidia-chips-on-hold-in-hk/2464236)). This conflicts with a March report of approved H200 purchases, and the sources do not reconcile the two. Moonshot is seeking Blackwell capacity in Europe ([CNBC](https://www.cnbc.com/2026/11/05/moonshot-ai-nvidia-chips-europe-china.html)). | 0.50 | 0.55 | **0.9** | **Flag.** If Chinese labs fall back, deep US benches (MAI, Amazon, Thinking Machines, SSI, Reflection) mostly refill the slots. |
| S4 | **Classification hazards.** Chinese startups re-domiciling to Singapore is an observed 2025-26 pattern. Organization labels drift ("SpaceXAI"). | — | — | **0.85** | **Flag.** These are not-H mechanisms. The Hong Kong exclusion is an extra trap. |
| S5 | **Open-weight diffusion.** Kimi K3 is the best open-weight model, at 1488, which is above the #10 cutoff of ~1475. A non-US/China organization that post-trains it well could land in the top 10 under its own label. | — | — | **0.85** | **Flag.** Historically, third-party fine-tunes rarely beat their base model's organization on Arena, but the base is now above the cutoff. |

Posterior odds = (0.30/0.70) x 3.0 x 1.75 x 1.3 x 0.9 x 0.85 x 0.85:
- 0.4286 x 5.25 = 2.250
- x 1.3 = 2.925
- x 0.9 = 2.633
- x 0.85 = 2.238
- x 0.85 = 1.902

P = 1.902 / 2.902 = **0.655**.

Resolver issues from the signals seat:
- lmarena.ai 301-redirects to arena.ai. The successor rule covers that.
- arena.ai 403s automated reads.
- There is no tie rule at 10th place.

These bear on cancellation and noise, not on P(Yes | resolved). Today's 10th-place tie is between two US/China organizations.

**Q3 = 66.** This sits below the fermi seat (79) and the signals seat (80) because the 30% prior still carries weight, and the only signal I can justify above 2:1 is the one at 3.0.

---

## Q1: Big-4 capex regime, R = CY2030 / CY2026

**Prior** (outside-view): A 40 / B 32 / C 22 / D 6.

The likelihoods below are per regime, P(signal | regime).

| # | Signal (seat) | A | B | C | D | Note |
|---|---|---|---|---|---|---|
| S1 | 2027 momentum: cash-PP&E growth ~+30-40% (R27 ≈ 1.35). "Several Wall Street firms project the group above $1T in 2027" (headline, lease-inclusive). Amazon expects capacity constraints through 2027; Alphabet signals an increase. Meta's CFO, verbatim: "We aren't providing a specific outlook for 2027 capex at this time." | 0.40 | 0.75 | 0.90 | 0.95 | A:C = 0.44, about 2.25:1 against A. In the A analogues (telecom 2000, semis 2000, railroads 1887), the boom year was usually the peak. Here the year after the boom has a strong consensus, so A needs a >= 26% fall from a 2027 peak. |
| S2 | Financing climate: the Fed hiked to 3.75-4.00% in September ([CNBC](https://www.cnbc.com/2026/09/16/treasury-yield-bond-market-fed-decision.html)), the 10y is ~5%, and S&P projects negative 2027 FCF at three of the four ([S&P](https://www.spglobal.com/market-intelligence/en/news-insights/research/2026/10/microsoft-and-alphabet-earnings-previews)). | 0.75 | 0.65 | 0.50 | 0.40 | **Flag.** A:C = 1.5. Hyperscalers are mostly funded from operating cash flow, so rates bite weakly until FCF goes negative. |
| S3 | Supply constraints and the physical ceiling: Microsoft trimmed guidance "because third-party capacity deliveries slipped". R=4 means ~$2.8T, or ~45-50 GW/yr for the Big-4 alone (fermi). Partly offset by component inflation (~$25B of Microsoft's figure). | 1.0 | 1.0 | 0.85 | 0.40 | The D:B ratio of 0.4 is justified (2.5:1). The ceiling is physical: gas turbines, transformers, interconnects. |
| S4 | Model, directional: DC-capex CAGR is positive in all six runs (12.8-39%/yr). The model has no financial cycle. | 1 | 1 | 1 | 1 | Set to 1 on purpose: the model cannot see regime A, and its level is understated 2.5-3x. |

Unnormalised posterior:

| Regime | Arithmetic | Value |
|---|---|---|
| A | 0.40 x 0.40 x 0.75 x 1.0 | 0.120 |
| B | 0.32 x 0.75 x 0.65 x 1.0 | 0.156 |
| C | 0.22 x 0.90 x 0.50 x 0.85 | 0.0842 |
| D | 0.06 x 0.95 x 0.40 x 0.40 | 0.0091 |
| Sum | | 0.3693 |

Normalised: A 0.325, B 0.422, C 0.228, D 0.025.

**Q1 = A 32 / B 42 / C 23 / D 3.**

Definitional caveat from the signals seat: on Q1's ex-lease definitions the 2026 denominator is below the $720-745B headline. That cuts toward a higher R, but by a small amount, and the 2027 consensus is also headline-based.

---

## Q4: DefiLlama stablecoin market cap, 2028-12-31

**Prior:** the outside-view's P10 245 / P50 410 / P90 700. I represent it as a three-scenario lognormal mixture on the 2.15-year growth multiple. The mixture reproduces the prior as P10 250 / P50 418 / P90 712, close enough.

| Scenario | Median multiple | Log sd | Prior weight |
|---|---|---|---|
| Bear | 0.85x | 0.12 | 0.20 |
| Base | 1.40x | 0.15 | 0.55 |
| Bull | 2.30x | 0.20 | 0.25 |

| # | Signal (seat) | P(s given Bear : Base : Bull) | Note |
|---|---|---|---|
| S1 | The 2026 drawdown, from the [DefiLlama API](https://stablecoins.llama.fi/stablecoincharts/all) all-pegs sum: $294.1B on 2026-11-08, "-3.2%" year on year, "-7%" from the $317.1B peak. The dashboard read "$290.096b, down 2.23% over 7 days and 4.86% over 30 days". Supply "remains tightly linked to crypto market cycles", with BTC at ~$80k against a ~$126k high. | 0.50 : 0.40 : 0.30 | **Flag (Bear:Bull = 1.67).** It cannot go higher: the last time YoY was negative (2023), 2-year forward growth was ~1.7-1.95x (Mar/Jun 2023 → 2025), against ~1.13x from Sep 2022. n = one episode. |
| S2 | Circle's OCC charter (10 July). GENIUS-licensed bank issuers arrive ~2027. | 1 : 1 : 1 | Already inside the prior's "after legitimation" reference class, so I do not count it again. |
| S3 | Fermi's component build (USDT 10%/yr, USDC+ 22%/yr) gives a P50 of ~$417B. | 1 | It shares the prior's baseline and growth logic, so it carries no independent evidence. |
| — | Baseline re-anchor: the dashboard and API differ by 1.4% on the same date. I use $292B. | — | Arithmetic only, not a likelihood update. |

Posterior weights: Bear 0.253, Base 0.557, Bull 0.190. Simulated mixture (400k draws) x $292B gives **P10 241 / P50 400 / P90 663**.

**Q4 = 241 / 400 / 663 ($B).** This sits above the signals seat's 340. Momentum alone is weak evidence about growth over 25 months, and the 2023 episode shows exactly that kind of reversal.

---

## Q5: Fed numerical yield ceiling or target before 2031

**Prior: 5%.** Prior odds 0.0526.

| # | Signal (seat) | LR | Note |
|---|---|---|---|
| S1 | The Fed under Warsh **hiked** in September, citing inflation. Warsh's stated balance-sheet direction is shrink and shorten, which raises long yields. | **0.7** | **Flag.** Over four more years, the stance today is weakly diagnostic. |
| S2 | Fiscal-dominance commentary: Robin Brooks, "a new Treasury-Fed accord is taking shape" ([Substack](https://robinjbrooks.substack.com/p/the-new-treasury-fed-accord-takes)); Fortune quoting an economist that Warsh "is actually managing U.S. debt costs not inflation" ([Fortune](https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/)). Treasury long-end buybacks, which Q5 excludes. Signals seat: "No official statement of any numerical yield level was found." | **1.5** | **Flag.** Analyst commentary. Chatter is cheap under not-H too. |
| S3 | The 10y at ~5.0-5.17%: high yields plus political pressure is fermi's path 2. | **1.2** | **Flag.** |
| S4 | Model, directional: world public debt/GDP in 2030 is 0.89-1.07, far below the 1.50 repression trigger, and the repression gap is 0. World aggregate, not the Fed's reaction function. | **0.85** | **Flag.** Directional only. |

Posterior odds = 0.0526 x 0.7 x 1.5 x 1.2 x 0.85 = 0.0526 x 1.071 = 0.0564, so **P = 5.3%**.

**Q5 = 5.** Every signal is under 2:1 and they roughly cancel, so the prior stands.

---

## Q6: BLS nonfarm business labor share, CY2030 annual average

**The prior needs a baseline correction first, as arithmetic and not as evidence.** The outside-view rescaled the 2017=100 index so that 2026Q2 = 52.8% (the stale preamble figure), which put Q3 at 52.45%. I read the BLS release myself ([USDL 26-1631, prod2.pdf](https://www.bls.gov/news.release/pdf/prod2.pdf)). It states, verbatim: "The labor share, which is the percentage of output that accrues to workers in the form of compensation, was 53.0 percent in the third quarter of 2026, the lowest level in the series, which begins in the first quarter of 1947." Its data "reflect the 2026 Annual Update of the National Income and Product Accounts".

The outside-view's quantiles were changes from 52.45: -2.65 / -0.45 / +1.55. Applied to 53.0, the corrected prior is **P10 50.35 / P50 52.55 / P90 54.55**.

| # | Signal (seat) | Shift to the median, or LR | Note |
|---|---|---|---|
| S1 | Productivity +2.1% YoY against real hourly compensation +1.0% "over the last four quarters" (BLS). The signals seat's arithmetic gives a -0.4 to -0.6pp/yr drift. | -0.3pp (LR ≈ 1.3 for "decline continues") | **Flag.** Real compensation is CPI-deflated while the share uses the output deflator, so the gap is not the share's drift. BLS caveat, verbatim: productivity "has differed from the first estimate by -1.1 to +1.4 percentage points about 80 percent of the time." |
| S2 | Starting at a record low: the outside-view's subclass of starts within 0.3pp of a record (n=16) had a mean 4-year change of ≈ +0.2. "Record lows do not reliably extend." | +0.2pp | **Flag.** n=16 with overlapping windows. It offsets S1. |
| S3 | Model, directional: -0.11pp (baseline), -0.75 (boom), -1.92 (AI payoff on), 2026→30. World compensation share, "NOT comparable to BLS". | -0.1pp | **Flag.** Sign only. |
| S4 | Recession risk from Fed tightening, which lifts the share (fermi: +1-2pp in recessions). | 0 | Already inside the prior's historical distribution of changes. |

Net median shift: -0.2pp. Spread unchanged.

**Q6 = P10 50.1 / P50 52.3 / P90 54.3 (%).**

Resolver note carried from the signals seat: the release text prints only quarterly levels, so the CY2030 average should be read as the mean of the four first-published quarters.

---

## Q7: Indian IT big-5 headcount at 31 Mar 2029 >= 10% below 31 Mar 2026

**Prior: 7%.** Prior odds 0.0753.

| # | Signal (seat) | P(s given H) | P(s given not H) | LR | Note |
|---|---|---|---|---|---|
| S1 | The combined total at 30 Sep 2026 is ~1.549M, ~+0.5-1% above the Mar 2026 base (~1.53M). Jul-Sep was net +13,918, and TechM's +5,446 was its "highest quarterly addition in two years" (one source says +1,928; sources conflict). | 0.35 | 0.60 | **0.58** | **Flag (1.7:1).** Under H the decline could be back-loaded. The bar now needs ≈ -10.8% in 10 quarters. |
| S2 | FY27 fresher plans: TCS 25k, Infosys 20k (secondary). | — | — | **0.7** | **Flag.** Plans, not hires. |
| S3 | FY26 cuts: TCS -23,460, combined ≈ -7k ("sources disagree on the full-year numbers"). Wipro -6,716 in Q2. | — | — | **1.3** | **Flag.** Restructuring is visible but small. |
| S4 | Fermi decomposition: revenue +3%/yr minus AI productivity +5.5%/yr gives ≈ -2.5%/yr ± 3.5, so P ≈ 0.28. | — | — | **1.8** | **Flag.** The +5.5%/yr AI-productivity input is assumed, not measured, and S1's flat-to-up print contradicts the decomposition's central drift. |

Posterior odds = 0.0753 x 0.58 x 0.7 x 1.3 x 1.8 = 0.0753 x 0.950 = 0.0715, so **P = 6.7%**.

**Q7 = 7.**

The signals seat flagged a truncated acquisition clause. If acquired staff are included, acquisitions push against H. I make no adjustment.

---

## Coherence checks

- **Q1 ↔ Q2.** P(Q2) = 0.18 against P(C+D) = 0.255. The fermi conditionals were P(Q2 | A) ≈ 0.10 and P(Q2 | C) ≈ 0.40. Applied to my Q1, they imply ~0.32 x 0.10 + 0.42 x 0.22 + 0.255 x 0.40 ≈ 0.23 on the true-run reading. That is before the coverage and column discount, so it is consistent with 0.18.
- **Q2 ↔ Q3.** Both lean on the same compute-gap observations, E1 and S2. Slower frontier growth (E1) narrows the gap for outsiders, which would cut Q3 a little. I already priced that inside S1b's modest LR.
- **Q6 ↔ Q7.** Both priors stay near "drift, no cliff". Neither moved by more than 0.3pp or 0.3 percentage points.

## Sources

- Epoch AI data: https://epoch.ai/data/notable_ai_models.csv ; https://epoch.ai/data/frontier_ai_models.csv ; https://epoch.ai/data-insights/grok-4-training-resources (as read by my effort's fermi and signals seats on 2026-11-08)
- Arena: https://arena.ai/leaderboard/text (403 to automated reads); https://www.benchleader.com/benchmarks/lmarena_text ; https://arena.ai/blog/leaderboard-changelog/ ; https://www.datalearner.com/en/leaderboards/external/text-generation
- Manila Times/Reuters: https://www.manilatimes.net/2026/11/07/business/foreign-business/china-puts-nvidia-chips-on-hold-in-hk/2464236 ; CNBC: https://www.cnbc.com/2026/11/05/moonshot-ai-nvidia-chips-europe-china.html
- S&P Global: https://www.spglobal.com/market-intelligence/en/news-insights/research/2026/10/microsoft-and-alphabet-earnings-previews ; tmtfinance: https://www.tmtfinance.com/intel/2026-hyperscaler-capex-tops-us700bn-analysis/
- DefiLlama API: https://stablecoins.llama.fi/stablecoincharts/all
- Fed and Treasury: https://www.cnbc.com/2026/09/16/treasury-yield-bond-market-fed-decision.html ; https://robinjbrooks.substack.com/p/the-new-treasury-fed-accord-takes ; https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/
- BLS Productivity and Costs, USDL 26-1631 (2026-11-05): https://www.bls.gov/news.release/pdf/prod2.pdf (I read the PDF directly in this seat to verify the 53.0% labor-share caveat)
- Indian IT: https://www.newsbytesapp.com/news/business/tech-mahindra-hires-5446-in-q2-headcount-hits-152206/tldr ; https://www.zeebiz.com/companies/news-infosys-headcount-falls-by-8440-qoq-to-329-lakh-attrition-rises-to-126-394183

```json
{"q1": {"A": 32, "B": 42, "C": 23, "D": 3},
 "q2": 18, "q3": 66,
 "q4": {"p10": 241, "p50": 400, "p90": 663},
 "q5": 5,
 "q6": {"p10": 50.1, "p50": 52.3, "p90": 54.3},
 "q7": 7}
```
