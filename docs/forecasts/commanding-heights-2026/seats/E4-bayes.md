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

```json
{"q1": {"A": 54, "B": 32, "C": 11, "D": 3},
 "q2": 38, "q3": 74,
 "q4": {"p10": 225, "p50": 360, "p90": 620},
 "q5": 6,
 "q6": {"p10": 49.9, "p50": 51.8, "p90": 53.9},
 "q7": 7}
```
