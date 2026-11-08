# E1 ai-capital-cycle / bayes (A4, Wave 2)

**BLUF.** My prior is E1's outside-view seat, which put Q1 mostly on a bust (A 50). Almost every signal from the fermi and signals seats has a likelihood ratio I can defend only below 2:1, so the posterior stays close to that prior: A 41 / B 41 / C 16 / D 2.

Only two pieces of evidence clear 2:1:
- **Q3:** today's LMArena top ten organizations are all US or Chinese (LR ~2.8). That lifts Q3 from 35 to 67.
- **Q7:** Indian IT headcount has risen since the base date (cluster LR ~0.4), which offsets the weak-revenue evidence. Q7 stays at 8.

Everything else moves the prior by a few points at most: Q2 29, Q4 P50 $355B, Q5 3, Q6 P50 51.9%.

Lens discipline:
- **Prior:** E1 outside-view (A1).
- **Evidence:** only the signals and arithmetic in the E1 Wave-1 packet (fermi A2, signals A3). The other seats' final numbers are NOT evidence; only their observations and checks are.
- **Weak evidence:** every LR below about 2:1 is flagged **[weak]**.
- **Correlated signals:** these are merged or down-weighted (exponent 0.5) so that one fact is not counted twice.
- **Web search:** I ran none. No caveat needed re-checking beyond what the packet quotes.

---

## Q1: Big-4 cash capex, R = CY2030 / CY2026

**Prior** (outside-view; reference class = sector capex 4 years after a year of 50%+ growth, ~10-12 episodes from memory, biased toward famous busts): **A 50 / B 36 / C 11 / D 3**.

Q1 has four regimes, so I give a likelihood per regime. The LR column is A against not-A, evaluated at the running posterior.

| # | Signal (source, caveat preserved) | P(E \| A / B / C / D) | LR A:not-A | Flag |
|---|---|---|---|---|
| S1 | 2027 guided up. Alphabet: "expect our capex to increase significantly in 2027". Amazon: "spend meaningfully more in 2027". Consensus ~$935B (+28%) was "dated Oct 4, i.e. before the reports" and is secondary. Nvidia guides ~70% growth "although the company continues to face supply constraints". AWS has 2M GPUs committed for 2027-28. | .40 / .55 / .80 / .90 | 0.64 | **[weak]** In the reference class the boom year is often not the peak: telecom 1999 -> 2000, railroads 1881 -> 1882, UK 1845 -> 1847 and solar 2011 all kept rising a year and still ended in A. So momentum into year +1 separates A from not-A only modestly. |
| S2 | Cash-flow crossover and external finance. Three of the Big-4 had negative FCF in Q3. Meta plans up to ~$95B of equity, "the first issuance of new stock since 2013". Bonds are ~$296B YTD against a $250B baseline (GS via a secondary source). CDS: Meta +177% YTD. Hyperion SPV yields 6.58%; El Paso is ">7%". Epoch's caveats: "The crossover is sensitive to the fit window"; the extensions are "not all-things-considered forecasts". | .80 / .55 / .60 / .70 | 1.39 | **[weak]** In the class, telecom, shale and railroads peaked 1-3 years after the financing turn. But regime C and D worlds also need external finance, so the signal is not diagnostic of A alone. |
| S3 | No product-price break. Median H100 ~$4.20/hr, "up 12% over the last 12 months". Nebius raised its price to $4.50. Google Cloud revenue "more than double". No reported lease cancellations, which is "absence of evidence, not a measured zero". Index caveat: "mostly vendor or aggregator pages, and their samples differ". | .55 / .75 / .85 / .90, applied at **exponent 0.5** | 0.83 | **[weak]** Same demand state as S1, so it gets half weight. Telecom's leading indicator (falling dark-fibre prices) points the other way today, but 2030 is four years out. |
| S4 | Fermi cash and GW arithmetic. Holding capex/OCF at ~1.0 with OCF growing 15-19%/yr gives R ≈ 1.85-2.1. D needs ~$2.8T a year, ≈ 55-60 GW/yr for four firms, "comparable to all US utility-scale generation additions". | .90 / 1.0 / .90 / .50 | 0.98 (D:not-D ≈ 0.5) | **[borderline, ~2:1 against D only]** This is a structural check, not an observation. $/GW can rise and power can be built behind the meter, so I cap the LR at 2:1. |
| S5 | Spend is migrating off the cash line: Hyperion SPV, finance leases in Microsoft's ~$170B headline, Morgan Stanley's "up to $800B private credit … by 2028" (secondary). The locked definition excludes all of these. | .80 / 1.0 / .80 / .60 | 0.87 | **[weak]** A measurement effect: it pulls measured R toward B in the high-spend worlds. |
| S6 | Sim adapter, **directional only**. Unlevered runs sit in B, and `dc-fast` reaches R ~3.8. Adapter: datacenter capex is "~2.5-3x below observed 2025-26 spending"; it has "no lab, no hyperscaler and no stock market" and so cannot produce regime A. | 1 / 1 / 1 / .90 | 1.00 | **[weak / near-uninformative]** The model cannot express A, so it carries no evidence on A. |
| S7 | Rates and credit. The FOMC hiked in Sep 2026. 10y 5.17% (Sep 25) -> 4.86% (Nov 6), from a single source. S&P sees negative FOCF in 2026-27. | 1.1 / 1 / 1 / 1 | 1.10 | **[weak]** |

**Sequential posterior** (computed, rounded to 0.1):

| After | A | B | C | D |
|---|---|---|---|---|
| Prior | 50.0 | 36.0 | 11.0 | 3.0 |
| S1 | 39.0 | 38.6 | 17.2 | 5.3 |
| S2 | 47.0 | 32.0 | 15.5 | 5.5 |
| S3 (½ weight) | 42.4 | 33.7 | 17.4 | 6.4 |
| S4 | 42.1 | 37.1 | 17.3 | 3.5 |
| S5 | 38.8 | 42.8 | 15.9 | 2.4 |
| S6 | 38.9 | 42.9 | 16.0 | 2.2 |
| S7 | **41.2** | **41.3** | **15.4** | **2.1** |

The combined LR on A against not-A is ≈ 0.70, built only from signals below 2:1. That is why the posterior stays near the prior.

**Readings of the evidence I decline to make:**
- I do not read the 2027 guidance as near-proof against A. R_2027 ≈ 1.26-1.35 means A needs a fall of at least ~25-35% from the 2027-28 peak by 2030. Telecom 2001-02 managed that: Verizon $17.3B -> $11.9B, Qwest $8.5B -> ~$3B.
- I do not read the financing turn as proof of A, because sustained-growth cycles also borrowed.

**Answer: A 41 / B 41 / C 16 / D 2.**

## Q2: an Epoch headline training cost of at least $10B, published by 2028-12-31

**Prior** (outside-view; trend-extrapolated milestones arrive on time ~40%, with haircuts for publication and for Epoch holding an estimate): **35%**, odds 0.538.

| # | Signal (caveat preserved) | P(E\|Y) | P(E\|N) | LR | Flag |
|---|---|---|---|---|---|
| S1 | The frontier-compute step slowed. GPT-6 Astra (Sep 2026) is 9.4e26 FLOP against Grok 4's 5.0e26 fourteen months earlier, ~1.9x. FutureSearch caveats: it "may be 'somewhat inflated'"; "Astra likely did not monopolize the entire cluster"; Google, Meta and xAI "have completed runs without public estimates". | .42 | .60 | 0.70 | **[weak]** The undisclosed runs mean the measured slowdown may be an artifact. |
| S2 | Epoch's cost coverage is collapsing. Headline costs exist for 8 of 109 notable models in 2025 and 1 of 95 in 2026, per fermi's CSV pull. Astra has hardware acquisition cost $4.23B but no headline cost. | .45 | .75 | 0.60 | **[weak]** The prior already haircuts for "Epoch must hold an estimate", so I count only the observed deterioration beyond that. Epoch could backfill within the year of lag. |
| S3 | GW-class clusters are coming: Hyperion "3.7M H100-equivalents by January 2028" and Colossus 2 at 1.1M. A 100-day run on all of Hyperion ≈ $18B at rental prices (signals' arithmetic). Fermi: a $10B amortized headline needs a ~$60-125B cluster. | .95 | .80 | 1.19 | **[weak]** Labs split clusters, and Epoch notes runs "can't get much longer". |
| S4 | E1 lens: financing strain makes a 2028 wobble likelier, and a wobble cuts discretionary single-run size first. | .85 | .95 | 0.90 | **[weak]** |
| S5 | Epoch's trend was revised to "3.5x per year since 2020 (90% CI: 2.8x to 4.4x)", against 2.4x in 2024. The observed headline line, GPT-4 $37M -> Grok 4 $388M, is 2.7x/yr. | .65 | .50 | 1.30 | **[weak]** Partly the same history as S1, which pulls the other way. |
| S6 | Deflator. Epoch publishes in "2023 USD", and the question says nominal. Converting makes the threshold EASIER: about $8.9-9.1B in 2023 USD reaches $10B nominal. Fermi's packet says "harder if converted"; I think that direction is wrong, and the signals seat's reading is right. | | | 1.05 | **[weak]** |

- Strict-read odds: 0.538 × 0.70 × 0.60 × 1.19 × 0.90 × 1.30 × 1.05 = 0.538 × 0.614 = **0.331**, so p = 0.249.
- **Lenient-resolver mixture.** Epoch also publishes an "upfront" cost, and Grok 4 is already $10.7B on that basis. Its rental-price method gives $490M against $388M amortized. I put P(lenient or other-method resolution) = 0.05.
- p = 0.05 + 0.95 × 0.249 = **0.286**.

**Answer: 29.**

## Q3: the ten highest-ranked Arena organizations all US or PRC on 2028-12-31

**Prior** (outside-view; ~22% across frontier-tech domains, moved toward the software subclass; explicitly no weight on the current board): **35%**, odds 0.538.

| # | Signal (caveat preserved) | P(E\|Y) | P(E\|N) | LR | Flag |
|---|---|---|---|---|---|
| S1 | **The resolving quantity at origin is all US/PRC today.** BenchLeader mirror, 8 Nov 2026, best model per organization: Google 1527, Meta 1513, Anthropic 1505, Moonshot 1488, OpenAI 1485, Alibaba 1483, Zhipu 1482, Xiaomi 1480, DeepSeek 1475, SpaceXAI 1475. Caveat: a third-party scrape; "the official page returned HTTP 403"; "scores and ranks for the same models differ across sites". | .85 | .30 | **2.8** | **Justified above 2:1.** It is a direct observation of the resolver two years early. The class moves slowly: Mistral was in the top-10 organizations in 2024 and dropped out by 2026, so composition does turn over, hence P(E\|N) is well above zero. |
| S2+S3 (merged) | Margin and bench. Mistral is ~40-60 Elo below the cutoff on verifiable figures, with a ~27x hardware-cost gap ($157M against $4.2B). The 11th distinct organization is Baidu (#51), and more US/PRC labs wait behind it. **Conflicting datum:** one aggregator shows Mistral Medium 3.5 at ~1481.8, but "the labeling on that page is inconsistent" and the model is absent from the Nov 8 top 40. | .75 | .47 | 1.6 | **[weak]** Merged because both describe the same margin. The conflicting datum keeps it under 2:1. |
| S4 | E1 lens: a capex bust that consolidates US labs opens slots, partly refilled by the deep PRC pool. | | | 0.95 | **[weak]** |
| S5 | Resolver risk. The signals seat flags Cayman ultimate parents (Alibaba, ByteDance) and that "an incorporation reading would turn Yes into No". A PRC lab could also re-domicile offshore, e.g. to Singapore. The lock says "headquarters", so I put only ~4% on a No through this route. | | | ×0.96 on p | |

- Odds: 0.538 × 2.8 × 1.6 × 0.95 = **2.29**, so p = 0.696.
- With the resolver haircut: 0.696 × 0.96 = **0.668**.

**Answer: 67.** The fermi seat (77) and the signals seat (84) start from the current board itself. My lower prior comes from the outside view's 35, and one 2.8:1 observation cannot carry it to 80.

## Q4: DefiLlama total stablecoins on 2028-12-31 ($B)

**Prior** (outside-view; ~22%/yr median from $294B over 2.15 years): **P10 240 / P50 440 / P90 760**.
- In log space the prior on cumulative growth has median 0.403, and σ ≈ 0.45 (from the P10/P90 spread).
- I treat that uncertainty as uncertainty about the annual drift: μ0 = ln 1.206 = 0.188/yr, τ0 = 0.45 / 2.15 = 0.209.

**Signal S1:** 2026 is flat to down.
- The series went ~$308B at end-2025, to a ~$322B record on 26 May, to ~$290B on 8 Nov: about −6% YTD, x ≈ ln 0.95 = −0.051.
- DefiLlama via a search snapshot: "down about 2.2% over the past week and about 4.9% over 30 days".
- The steepest weekly drop of 2026 has a disputed cause: "neither issuer has linked the two events".
- Year-to-year noise around the drift, from the 2022-26 annual log growths (−0.17, −0.05, +0.44, +0.41, −0.05): σ_obs ≈ 0.27-0.30. I use 0.30.

Normal-normal update:
- Posterior drift = (0.188 / 0.0437 + (−0.051) / 0.09) / (22.9 + 11.1) = 3.735 / 34.0 = **0.110/yr**.
- τ = 1 / √34 = 0.171.
- As a likelihood ratio: "a flat-to-down 2026 after GENIUS legitimation" is about **0.55:1** against the "≥ 20%/yr" hypothesis relative to "< 20%/yr". **[weak, but the only measured signal]**

Further adjustments:
- **S2 [weak, LR ≈ 1.0].** The OCC GENIUS final rule takes effect 18 Jan 2027, and "OCC expects to begin processing issuer applications in 2027". Legitimation is already the reference-class event in the prior.
- **S3 [weak, −0.02 on drift].** The Fed hiked in Sep 2026, and GENIUS bans issuer-paid yield, which favors yield-bearing substitutes. Bank "tokenized deposits may not be listed by DefiLlama as stablecoins".
- **S4 [E1 lens, left skew only].** A capex bust is risk-off and hits the ~$190B crypto-collateral slice (fermi's split). I fatten the lower tail and leave the median alone.

Result:
- Drift ≈ 0.09/yr; cumulative ln = 0.194 from $292B, giving a median of **$355B**.
- Cumulative σ ≈ 0.38, giving P10 = 292 × e^(0.194 − 0.487) ≈ 218 and P90 = 292 × e^(0.681) ≈ 577.
- The left-skew adjustment takes P10 to ~215.

**Answer: P10 215 / P50 355 / P90 580.**

## Q5: a Fed numerical yield ceiling or target (1 year or longer) before 2031

**Prior** (outside-view; ~0.5-0.9% per issuer-year among reserve-currency issuers over 4.15 years): **4%**, odds 0.0417.

| # | Signal (caveat preserved) | LR | Flag |
|---|---|---|---|
| S1 (cluster) | Political and Treasury pressure on the long end. Treasury doubled long-dated buybacks to "at least $4 billion per operation". Bessent: "We have a big toolkit, so we'll see"; "the Treasury and the Fed would work together". Warsh talks of an updated accord in which "The Treasury secretary would need to find the proposed change in Fed holdings acceptable". Brooks: "What's happening is yield curve management". Caveat: that is "one economist's interpretation", and Fortune "reports no Warsh statement on YCC and no numeric target". Buybacks are excluded by the question. | 1.8 | **[weak]** These precursors are likelier in YCC worlds (~0.8 against ~0.45), but with high deficits they would happen anyway. |
| S2 (cluster) | A hawkish Fed. Warsh wants a smaller, bill-tilted balance sheet, which "would likely push up long-term Treasury yields", and "has argued against sustained use of the central bank's balance sheet". The FOMC hiked unanimously in Sep 2026. The 10y is back to 4.86%. | 0.6 | **[weak]** Merged with the hike: they reflect one stance. |
| S3 | Revealed preference: the Fed studied YCC in 2020, at the zero lower bound where it fit best, and declined it. | 0.75 | **[weak]** This is US-specific information the cross-issuer base rate lacks. Softened because the Fed left the option open. |
| S4 | E1 lens: an AI capex bust is disinflationary and lowers yields by itself, which removes the motive for a cap. | 0.9 | **[weak]** |
| S5 | Sim adapter, directional: world debt/GDP stays at 0.80-1.07 through 2030 and never reaches the 150% fiscal-dominance trigger. But the model has "NO MONETARY BLOCK: no price level, no Fed, no yields". | 0.95 | **[weak / near-uninformative]** |

- Odds: 0.0417 × 1.8 × 0.6 × 0.75 × 0.9 × 0.95 = 0.0417 × 0.693 = **0.0289**, so p = **2.8%**.
- Caution: the joint LR of 0.69 rests on five sub-2:1 factors. I merged the correlated hawkish signals so that I am not compounding the same stance twice.

**Answer: 3.**

## Q6: BLS nonfarm business labor share, CY2030 annual average (%)

**Prior** (outside-view): P10 49.8 / P50 52.0 / P90 54.2. That is a change of Δ = −2.8 / −0.6 / +1.6 pp from its start of 52.6.

**Re-anchoring the start (a fact, not a likelihood):**
- BLS USDL 26-1631: 2026Q3 = **53.0%**, "the lowest level in the series, which begins in the first quarter of 1947". It reflects "the 2026 Annual Update of the National Income and Product Accounts".
- The preamble's Q2 figure of 52.8% is therefore stale: Q2 was revised up to above 53.0.
- Revised Q3 release: Dec 8 2026. Resolver caveat from the signals audit: the percent appears only for the latest quarter, so the 2030 average mixes vintages.
- New start: **53.0**.

Discretised prior on Δ (normal approximation, median −0.6, σ ≈ 1.72):
- H1: Δ ≤ −2: .208
- H2: −2 to −0.6: .292
- H3: −0.6 to +0.6: .257
- H4: > +0.6: .243

| # | Signal (caveat preserved) | P(E \| H1 / H2 / H3 / H4) | Flag |
|---|---|---|---|
| S1 | Momentum. Pre-revision TED path: 55.3 (Q1 2025) to 52.8 (Q2 2026), about −2pp in five quarters. Q3: productivity +3.6% SAAR, ULC −0.7%, real hourly compensation +1.0% over four quarters against productivity +2.1%. The outside view's caveat: after new series lows the record is split, with rebounds before 2000 and further falls after 2003. | .65 / .55 / .45 / .35 | **[weak]** LR for H1 against H4 ≈ 1.9. |
| S2 | Sim adapter, directional: the sign is negative in every run, −0.1 to −1.9pp. But its labor share is world compensation/GDP, "~0.65, NOT comparable to BLS 52.8%". | 1.1 / 1.1 / 1.0 / .9 | **[weak]** |
| S3 | E1 cycle lens: the labor share jumps in busts as profits fall first (2001-02, 2008-09). My Q1 bust mass, roughly 35-40% of a bust by 2029, is about the base-rate recession frequency for a four-year window, which the prior class already contains. | LR ≈ 1 | **[weak / none]** |

Posterior by bin:
- Unnormalised: H1 .1487, H2 .1767, H3 .1157, H4 .0765.
- Normalised: **H1 .287 / H2 .341 / H3 .224 / H4 .148**.

Quantiles:
- Median sits in H2 at (0.5 − 0.287) / 0.341 = 0.62 of the bin: Δ ≈ −1.1, so **51.9**.
- P10 ≈ Δ −3.4, so **49.6**.
- P90 ≈ Δ +1.2, so **54.2**.

The essay's "forty years in a decade", about −6 to −8pp, remains below P10.

**Answer: P10 49.6 / P50 51.9 / P90 54.2.**

## Q7: big-5 Indian IT headcount at 31 Mar 2029 at least 10% below 31 Mar 2026

**Prior** (outside-view; the five-firm aggregate never fell 10% in ~22 three-year windows, while firm-level windows did so ~10% of the time): **8%**, odds 0.087.

| # | Signal (caveat preserved) | P(E\|Y) | P(E\|N) | LR | Flag |
|---|---|---|---|---|---|
| S1+S4 (merged) | The line is RISING since the base date, and fresher intake is intact.<br>• Base, 31 Mar 2026: 1,530,073 (Infosys's Q4 figure "disputed in press (+888 vs −8,440)").<br>• 30 Sep 2026: 1,549,471, after +5,480 and +13,918.<br>• Threshold 1,377,066, which is −11.1% from Sep 2026 in ten quarters.<br>• Freshers: Infosys >8,000 in Q2; HCLTech 6,136. | .30 | .75 | **0.40** | **Justified at ~2.5:1.** It observes the first sixth of the resolving path, and that path moved away from the threshold. Merged because hiring and freshers are one fact. |
| S2 | Weak revenue. Infosys cut FY27 guidance to 1-2%; analysts say the numbers "do not yet signal a recovery". | .85 | .50 | 1.7 | **[weak]** A necessary condition for Yes, but common in No worlds. |
| S3 | FY26 combined −7,389 (TCS −23,460): the AI revenue-per-employee mechanism is visible in the base year. | | | 1.2 | **[weak]** Mostly already in the prior class. |
| S4 | E1 lens: hyperscaler capex "cannibalising enterprise IT budgets at the margin", and a 2028 US bust would cut discretionary IT. | | | 1.2 | **[weak]** |

- Odds: 0.087 × 0.40 × 1.7 × 1.2 × 1.2 = 0.087 × 0.979 = **0.0851**, so p = **7.8%**.

**Answer: 8.**

---

## Coherence checks (within my answers)

- **Q1 → Q2.** Q1 puts 41% on A, and S4 gives a modest down-weight for Q2's tail. These are consistent: a bust lowers the chance of a $10B run but does not erase it, because 2027-28 hardware is already committed.
- **Q1 → Q4.** The bust mass appears only as left skew in Q4's P10, not as a shift in its median.
- **Q1 → Q6.** The bust mass is treated as cyclical and inside the prior class, so it gets no extra upward shift. Q6's P90 of 54.2 still covers a 2029 rebound.
- **Q5 against Q1.** If capex rolls over, the disinflation that follows makes YCC less likely, not more. Q5 sits low in both regimes.

## Disagreements with Wave-1 seats, stated

- **Fermi Q2 deflator direction.** Fermi says converting 2023 USD to nominal makes the threshold "harder". I read it as easier. The signals seat agrees with me, and the effect is small (LR 1.05).
- **Q3.** Fermi (77) and signals (84) start from the current board. My 67 is the lens-correct product of a 35 prior and a 2.8:1 observation. The calibrator should judge whether the outside view's prior deserved its weight.
- **Q1.** Signals (C 40) reads momentum as strong evidence. In the reference class, momentum into year +1 is common among eventual busts, so I cannot justify more than 0.64 against A.

## Sources (as given in the E1 Wave-1 packet; not re-fetched)

- Capex and financing:
  - [fourweekmba](https://fourweekmba.com/ai-big-tech-free-cash-flow-turns-negative-in-a-93b-swing/)
  - [Stock Metric Lab](https://stockmetriclab.com/ai-capex-comparison-2026/)
  - [CNBC Alphabet Q3](https://www.cnbc.com/2026/10/28/alphabet-googl-earnings-q3-2026.html)
  - [CNBC AI debt](https://www.cnbc.com/2026/10/27/ai-debt-hyperscaler-earnings.html)
  - [Semafor](https://www.semafor.com/article/10/26/2026/meta-announces-95b-offering-to-fund-ai)
  - [Capacity](https://capacityglobal.com/news/metas-12bn-el-paso-bond-exposes-ai-debt-repricing/)
  - [Epoch capex vs cash flow](https://epoch.ai/data-insights/hyperscaler-capex-vs-cash-flow)
- GPU prices:
  - [Uvik](https://uvik.net/blog/gpu-price-index/)
  - [getdeploying](https://getdeploying.com/gpu-price-index)
- Epoch:
  - [epoch.ai/trends](https://epoch.ai/trends)
  - [AI models database](https://epoch.ai/data/ai-models)
  - [Grok 4 training resources](https://epoch.ai/data-insights/grok-4-training-resources)
  - [FutureSearch](https://futuresearch.ai/app/p/a/rsi-largest-training-compute)
- Arena:
  - [BenchLeader mirror](https://www.benchleader.com/benchmarks/lmarena_text)
  - [gradually.ai](https://www.gradually.ai/en/llm-comparison/gpt-5.5-vs-mistral-large-3/)
- Stablecoins:
  - [DefiLlama](https://defillama.com/stablecoins)
  - [Decrypt on the OCC rule](https://decrypt.co/381502/occ-finalizes-genius-act-stablecoin-rules-ahead-of-january-deadline)
- Fed and Treasury:
  - [CNBC Aug 20](https://www.cnbc.com/2026/08/20/bessent-warsh-fed-bond-market-treasury-yields.html)
  - [Fortune Nov 1](https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/)
  - [Federal Reserve History, the Accord](https://www.federalreservehistory.org/essays/treasury-fed-accord)
- Labor share:
  - [BLS Productivity and Costs](https://www.bls.gov/news.release/pdf/prod2.pdf)
  - [BLS TED](https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm)
- Indian IT:
  - [IANS](https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000)
  - [AngelOne](https://www.angelone.in/news/stocks/indian-it-stocks-in-focus-top-five-firms-add-16-055-employees-in-h1fy27-but-demand-recovery-remains-uncertain)
- Sim adapter: `docs/forecasts/commanding-heights-2026/adapter-output.md`, as quoted by the fermi seat. I used it directionally only.

```json
{"q1": {"A": 41, "B": 41, "C": 16, "D": 2},
 "q2": 29, "q3": 67,
 "q4": {"p10": 215, "p50": 355, "p90": 580},
 "q5": 3,
 "q6": {"p10": 49.6, "p50": 51.9, "p90": 54.2},
 "q7": 8}
```
