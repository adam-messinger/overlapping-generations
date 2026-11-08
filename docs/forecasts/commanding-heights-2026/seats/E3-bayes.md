# E3 (dollar-monetary) / bayes (A4, Wave 2)

**BLUF.** I start from E3's outside-view numbers as the prior and update on the Wave-1 fermi and signals evidence. Three moves come out of it.

- **Q3 moves the most: 45 to 62.** On LMArena, ten US or Chinese organisations stand between the 10th place and the first outsider, so the US/China top ten has a deep cushion.
- **Q4 and Q5 move down a little.** A zero-yield token now competes with tight money, and the offshore-USDT deadline (18 Jul 2028) falls inside the window. The Q4 median drops from 410 to 388 ($B). The Fed is hiking and sits far from the zero lower bound, so Q5 drops from 6 to 5.
- **Everything else stays close to the prior.** Q1 shifts mass from A to B. Q2 falls on Epoch's thin cost coverage. Q6 moves up only because the BLS revision put the starting level ~0.4pp higher.

Nearly every likelihood ratio below is under 2:1, and I say so where I cannot defend more.

Method. Prior = E3 outside-view seat (`seats/E3-wave1-packet.md`). Evidence = the E3 fermi and signals seats only. For each signal I write P(signal | H) / P(signal | not-H) (binaries), or a likelihood vector over bins (Q1, Q4, Q6), then multiply.

Three rules for the evidence:

- **No double counting.** Any signal the outside-view prior already conditioned on is excluded or discounted. That covers the 2026 year-to-date stablecoin fall, the 2026 LMArena run, the FY26 Indian IT decline, and the high-debt conditioning in Q5.
- **Correlated signals are merged** into one likelihood ratio, not multiplied separately.
- **Model outputs and other people's forecasts get LR ~1.** Fermi's adapter readings are directional by its own spec, and the bank forecasts predate the 2026 stall.

LR strength flags:

- **[weak]**: LR within 1.25 of 1.
- **[moderate]**: LR 1.25-2.
- **[>2:1, defended]**: only where I give the reason.

Forecast origin 2026-11-08.

---

## Q1: Big-4 cash capex, R = CY2030 / CY2026

**Prior (outside-view):** A 50, B 37, C 11, D 2. This comes from sector capex after a year of at least 50% growth (n≈7, approximate levels, partly from memory).

| # | Signal (source seat) | P(E\|A) | P(E\|B) | P(E\|C) | P(E\|D) | LR A:C | Flag |
|---|---|---|---|---|---|---|---|
| 1 | All four guide CY2027 up; third-party 2027 consensus ≈$935B headline, about +28%. Caveat: *"consensus forecasts, not company guidance"* (signals, citing [CNBC Alphabet](https://www.cnbc.com/2026/10/28/alphabet-googl-earnings-q3-2026.html), [CNBC Amazon](https://www.cnbc.com/2026/10/29/amazon-amzn-q3-earnings-report-2026.html)) | 0.40 | 0.65 | 0.90 | 0.95 | 0.44 (≈2.25:1 against A) | **[>2:1, defended]** |
| 2 | Stress: Microsoft cut CY26 guidance from $175B to $170B; Alphabet fell about 10% on capex; VIX up as much as 48% on Nov 5; FCF going negative (Amazon trailing FCF −$42.4B); 10y near 5% (signals, fermi). Merged with fermi's financing-gap arithmetic | 0.70 | 0.60 | 0.50 | 0.45 | 1.4 | [moderate] |
| 3 | Fermi: cheap financing runs off balance sheet (SPVs, JVs, leases), which biases the cash line down | 1.10 | 1.05 | 0.95 | 0.90 | 1.16 | [weak] |
| 4 | Fermi physical check: D means ~55 GW/yr for four firms, against turbine and transformer backlogs. Discounted because $/GW inflation raises nominal capex without adding GW | 1 | 1 | 1 | 0.60 | n/a (D only, 1.7:1) | [moderate] |
| 5 | Fermi model, DIRECTIONAL: world DC capex ~13-20%/yr. The model has no equity market or lab race (per its own disclosure) | 1 | 1 | 1 | 1 | 1 | refused (cannot justify >1.2) |
| — | Third consecutive year of at least 50% growth | already in prior | | | | | excluded |

**Defence of signal 1 above 2:1.** In the prior's own reference class, the year after the boom year was flat or down in nearly every R<1 case (semis 2000→2001 −29%, telecom 2001, semis 1985). Here the four firms guide 2027 up by about a quarter. For A to hold from a 2027 at ~1.25x, 2030 must fall more than ~20% below the 2027 peak. Telecom-style busts did fall that far, so A stays live. I set P(E|A) at 0.40, not lower, because in 2000-01 telecom carriers also guided up shortly before cutting. Guidance is not realisation.

**Arithmetic (products of the likelihoods):**
- A: 0.50 × 0.40 × 0.70 × 1.10 × 1 = 0.1540
- B: 0.37 × 0.65 × 0.60 × 1.05 × 1 = 0.1515
- C: 0.11 × 0.90 × 0.50 × 0.95 × 1 = 0.0470
- D: 0.02 × 0.95 × 0.45 × 0.90 × 0.60 = 0.0046
- Sum 0.3572. **Posterior: A 43.1, B 42.4, C 13.2, D 1.3.**

**Q1: A 43, B 42, C 14, D 1.** The forward guidance and the stress signals mostly cancel. The net effect moves ~7pp from A into B.

Scope-lock note: the cash-line CY2026 denominator is probably ~$650-690B, not the $720-745B headline, which includes Microsoft and Meta finance leases. Neither Wave-1 seat checked this against filings. The ratio R is roughly invariant to that only if the lease share stays constant, and signal 3 prices the risk that it does not.

---

## Q2: Epoch headline training cost ≥ $10B, model published by 2028-12-31

**Prior:** 35, built as 0.5 (on trend) × 0.7 (Epoch posts a cost). **Prior odds** 35/65 = 0.538.

| # | Signal | P(E\|Yes) / P(E\|No) | LR | Flag |
|---|---|---|---|---|
| 1 | Coverage is thinner than the prior's 0.7 assumes. Only 8 of 109 2025 models and 1 of 95 2026 models carry a headline cost. GPT-5 and GPT-6 Astra (9.4e26 FLOP, Epoch confidence *"Likely"*; *"100,000 in 'Hardware quantity' is a lower bound/underestimate"*) have no headline cost; Grok 3, Grok 4 and GPT-4.5 do ([notable_ai_models.csv](https://epoch.ai/data/notable_ai_models.csv)). Swapping the 0.7 for fermi's ~0.55 is an odds factor of 0.70 | via component swap | 0.70 | [moderate] |
| 2 | The headline column is **2023 USD**. $10B nominal is ≈$8.7B in 2023 USD if the resolver inflates; if it reads the column as-is, the bar is unchanged | 0.95/0.90 | 1.05 | [weak] |
| 3 | The observed frontier maximum grew only ~1.9x in FLOP from Jul 2025 to Sep 2026 (~1.5-2x/yr in cost), against Epoch's 3.5x/yr trend. Caveat (fermi): *"lagged and censored by thin coverage."* The frontier maximum is lumpy: GPT-4 held the record for ~2 years before Grok 3 | 0.45/0.60 | 0.75 | [moderate] |
| 4 | 1-2 GW sites are under construction (Abilene, Colossus 2, Hyperion), so a ~3e28 FLOP run is physically feasible (fermi) | 1.0/0.9 | 1.1 | [weak] |
| — | Resolver trap: the `upfront` column shows **$10.7B for Grok 4** already. It is not the headline. I price a 4% chance that a resolver misreads it, added at the end and not treated as an LR | n/a | n/a | additive |

**An arithmetic correction to the signals seat.** Its "26x in ~2.3 years ⇒ 4.1x/yr" sets a Jul-2025 level ($388M) against a Sep-2026 clock. The consistent figures are:
- From $388M (Jul 2025) to $8.7B by end-2028: 22x in 3.45 years, about **2.5x/yr**.
- From an implied $0.6-0.8B (Sep 2026): 11-15x in 2.3 years, about **2.9-3.2x/yr**.

So the bar sits between Epoch's 2.4x/yr and 3.5x/yr trends. The prior's 0.5 for "on trend" stands.

**Posterior odds:** 0.538 × 0.70 × 1.05 × 0.75 × 1.1 = 0.538 × 0.606 = 0.326.
- P = 0.246.
- Add the resolver misread: 0.246 + 0.754 × 0.04 = **0.276**.

**Coherence with Q1.**
- P(Q2 | A) ≈ 0.12, P(Q2 | B) ≈ 0.30, P(Q2 | C+D) ≈ 0.50.
- Weighted: 0.43 × 0.12 + 0.42 × 0.30 + 0.15 × 0.50 = **0.25**.
- A $10B amortised run is ~1.5% of one year of B-world Big-4 capex, and lab and Stargate money sits outside Q1. Q2 therefore does not require C or D, which is a weaker coupling than fermi assumed.

I take **26**.

**Q2: 26.**

---

## Q3: Top ten LMArena Text organisations all US/PRC on 2028-12-31

**Prior:** 45, a blend of three numbers:
- the wide class (~15%);
- the leaderboard's own history (51% of 194 snapshots);
- Lindy (~26%).

The prior already knew the top 14 were US/PRC. **Prior odds** 0.818.

| # | Signal | P(E\|Yes) / P(E\|No) | LR | Flag |
|---|---|---|---|---|
| 1 | **Depth of the cushion beyond what the prior saw.** In the 2026-11-06 `text_style_control` snapshot ([HF dataset](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset)), the first outsider is Mistral at organisation #20, ~48 rating points below the 10th organisation. Fermi's caveat: CIs run *"about +/-5-9 points"*. Signals' mirror ([benchleader](https://www.benchleader.com/benchmarks/lmarena_text), unverified against the primary) finds no non-US/PRC organisation in the top 60 models. Raw ≈0.85/0.35 = 2.4; discounted for the partial overlap with the prior's "cushion of four" | 0.80/0.40 | **2.0** | [>2:1 borderline, defended] |
| 2 | Every 2026 entrant to the organisation top 20 is US/PRC (Xiaomi, Meituan, Thinking Machines, Reflection, StepFun). New entrants are the main route to No. Correlated with 1, so shrunk | 0.80/0.67 | 1.2 | [weak] |
| 3 | Funded sovereign programmes exist (Gulf G42/Humain, Korea, Japan, India, France) and have so far produced no top-20 model | — | 0.9 | [weak] |
| 4 | Resolver: lmarena.ai 301-redirects to arena.ai; *"a five-way tie at 1475"* at the 10th boundary; labels such as "SpaceXAI" or blank need a parent mapping; possible redomicile of a Chinese lab to Singapore | — | 0.95 | [weak] |

**Defence of signal 1.** The observation is exact, read from the publisher's own dataset. A No world needs an outsider to pass ten US/PRC organisations, not one. Mistral fell out of the top 10 in February 2026 and has since slipped to #20. A No world that runs through a sudden new entrant would look like today, so I do not push the LR past 2.

**Posterior odds:** 0.818 × 2.0 × 1.2 × 0.9 × 0.95 = 0.818 × 2.052 = 1.679, so **P = 0.627**.

**Q3: 62.** The prior's 15% wide class still holds this well below fermi's 86 and signals' 83. A Bayesian update from 45 on this evidence does not reach the mid-80s without LRs I cannot justify (the posterior would need about 7:1 combined).

---

## Q4: DefiLlama total stablecoin market cap, 2028-12-31 (centre of gravity)

**Prior:** P10 235 / P50 410 / P90 740. Fit as ln(V/294) ~ N(0.333, σ_lo 0.434, σ_hi 0.461), which reproduces 230 / 410 / 731. In bins:

| Bin | <250 shrink | 250-400 slow | 400-600 moderate | >600 boom |
|---|---|---|---|---|
| Prior mass | 0.136 | 0.342 | 0.323 | 0.199 |

**Already in the prior, not re-counted:**
- $294.1B on 2026-11-08 (API);
- −4% year to date;
- post-GENIUS growth of ~12%/yr;
- the 2022-23 drawdown.

| # | Signal | L(shrink) | L(slow) | L(mod) | L(boom) | LR shrink:boom | Flag |
|---|---|---|---|---|---|---|---|
| 1 | Steepest weekly drop of 2026: −$4.99B (−1.7%) on DefiLlama, against Sentora's −$6.02B. Caveat: *"because the two trackers measure supply differently"*; the drivers are possibilities, not findings ([24/7 Wall St.](https://247wallst.com/investing/cryptocurrency/2026/11/07/stablecoins-shrank-by-5-billion-in-a-week-can-ethereum-rally-while-money-leaves-crypto/)). USDT fell from $184.2B to $176.8B in a month. One week is mostly noise | 1.10 | 1.02 | 0.98 | 0.92 | 1.2 | [weak] |
| 2 | Rates: the Fed hiked in September 2026, with two dissents for more at the Oct 28 hold; the 10y is 4.8-5.3%; zero-yield tokens compete with ~4-5% bills and MMFs. **Discounted**: in 2024-25 supply grew ~+50%/yr with fed funds at 4.25-5.5%, and the 2022-23 fall coincided with the Terra/FTX collapse | 1.15 | 1.05 | 0.95 | 0.85 | 1.35 | [moderate, weakly justified] |
| 3 | The GENIUS offshore deadline falls inside the window: from **18 Jul 2028** US digital-asset service providers may not offer stablecoins from non-permitted issuers ([Paul Weiss](https://www.paulweiss.com/insights/client-memos/genius-act-ushers-in-comprehensive-federal-regulation-of-payment-stablecoins), [Latham](https://www.lw.com/en/insights/2025/07/the-genius-act-of-2025-stablecoin-legislation-adopted-in-the-us)). This was **unverified** in the signals seat; I confirmed the date. Caveat carried: the bar applies *absent a safe harbor*, and foreign issuers in comparable regimes can register. USDT is ~60% of supply and mostly serves non-US users. USAT launched at *"a $10 million supply"* and is not in the top 12 | 1.15 | 1.05 | 0.95 | 0.95 | 1.2 | [weak] |
| 4 | Crypto-cycle timing: end-2028 is ~8 months after the April 2028 halving; in the 2024 analogue supply rose +28% in 8 months (fermi). n=3 cycles, contested | 0.85 | 1.0 | 1.1 | 1.1 | 0.77 | [weak] |
| 5 | OCC final GENIUS rule (2026-10-21; effective 2027-01-18) keeps the issuer-yield ban. *"nearly every other implementing rulemaking remains at the proposal stage"* ([Gibson Dunn](https://www.gibsondunn.com/the-genius-act-occ-finalizes-its-payment-stablecoin-framework/)). The ban was already statute; go-live is on schedule | 1.0 | 1.0 | 1.05 | 1.0 | 1.0 | null |
| 6 | Published forecasts (StanChart $2T by 2028; JPM $500-600B; Bessent "$2T"). All *predate the 2026 stall* | 1 | 1 | 1 | 1 | 1 | refused |

**Combined likelihoods:**
- shrink: 1.10 × 1.15 × 1.15 × 0.85 = 1.237
- slow: 1.02 × 1.05 × 1.05 × 1.0 = 1.125
- moderate: 0.98 × 0.95 × 0.95 × 1.1 × 1.05 = 1.022
- boom: 0.92 × 0.85 × 0.95 × 1.1 = 0.817

**Posterior bins:**
- Unnormalised: 0.168, 0.385, 0.330, 0.163 (sum 1.045).
- Normalised: **0.161, 0.368, 0.316, 0.156**.
- Posterior CDF: 0.161 at 250, 0.529 at 400, 0.844 at 600.

**Quantiles (prior density rescaled within each bin):**
- **P10:** 0.10 / 1.183 = 0.0845 of the prior CDF, so z = −1.375 and V = 294·e^(0.333−0.597) = **221**.
- **P50:** (0.5 − 0.161) / 1.076 = 0.315 of prior mass into the slow bin, so the prior CDF target is 0.451, z = −0.123 and V = 294·e^(0.333−0.053) = **388**.
- **P90:** (0.9 − 0.844) / 0.782 = 0.072 of prior mass into the boom bin, so the prior CDF target is 0.873, z = 1.14 and V = 294·e^(0.333+0.526) = **685**.

**Unresolved ±1.5% level ambiguity.** The two seats disagree on which way DefiLlama's API and dashboard headline differ:
- fermi says the API runs *below* the dashboard;
- signals says the dashboard reads ~$290-293B against the API's $294.1B.

I make no adjustment and leave it in the tails.

**Q4: P10 220 / P50 388 / P90 685 ($B).** This is about +12%/yr at the median: growth, not "near-unlimited demand". The essay's ~$1T+ by 2028 sits beyond my P90, at roughly 4%.

---

## Q5: A numerical Fed (or Fed-Treasury) yield ceiling on ≥1-year Treasuries before 2031 (centre of gravity)

**Prior:** 6, set between 3% (unconditional reserve-issuer rate, ~0.5-0.9% per issuer-year) and 8% (issuer-years with debt above 100% of GDP). **Prior odds** 6/94 = 0.0638.

The prior already conditions on high debt, so debt above 100% of GDP is not re-counted. I merge the correlated "Fed stance" signals into one LR and the "fiscal pressure" signals into another. Multiplying four correlated hawkish signals separately would take Q5 to ~3%, which is the main failure mode this lens is meant to avoid.

| # | Signal (merged) | P(E\|Yes) / P(E\|No) | LR | Flag |
|---|---|---|---|---|
| 1 | **Fed in a tightening regime far from the zero lower bound.** Unanimous hike in September 2026 ([CNBC](https://www.cnbc.com/2026/09/16/treasury-yield-bond-market-fed-decision.html)); two dissents for a further hike at the Oct 28 hold at 3.75-4.00% ([CNN](https://www.cnn.com/2026/10/28/business/live-news/federal-reserve-interest-rate-october)). Warsh's "accord" means a *smaller* balance sheet and a "reverse operation twist" ([ABN AMRO](https://www.abnamro.com/research/en/our-research/kevin-warshs-reverse-operation-twist)). Inflation 3.5-4.2% (search snippet, unverified). All three post-war-style starts (US 1942, Japan 2016, Australia 2020) came from policy rates near zero | 0.45/0.75 | **0.6** | [moderate] |
| 2 | **Fiscal pressure on the long end beyond the debt level.** FY2026 net interest above $1T; the 10y reached 5.31-5.34%, *"highest level since 2002"* ([Senate Banking letter](https://www.banking.senate.gov/imo/media/doc/20261007lettertobessentreyields.pdf); sources differ by a few bp). Treasury long-bond buybacks (excluded by Q5 but a revealed preference to manage long yields). Brooks' *"yield curve management"* is one person's interpretation; *no official statement … setting a yield target* ([Fortune](https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/)) | 0.80/0.53 | **1.5** | [moderate] |
| 3 | Democrats won both chambers on 2026-11-03 (some races uncalled). This lowers the odds of the essay's "Congress changes the mandate" route and raises debt-limit stress | — | 0.9 | [weak] |
| 4 | The 10y fell back to 4.84% by Nov 5 | — | 1.0 | noise, null |
| 5 | Fermi model, DIRECTIONAL: the fiscal-dominance trigger does not bind by 2030. The model has *"NO MONETARY BLOCK"* | — | 1.0 | refused |

**Posterior odds:** 0.0638 × 0.6 × 1.5 × 0.9 = 0.0638 × 0.81 = 0.0517, so **P = 4.9%**.

**Q5: 5.** The pressure is real but runs through excluded tools (buybacks, issuance mix). A numerical cap would need a disorderly Treasury-market crisis or a war under a chair appointed to shrink the balance sheet.

---

## Q6: BLS nonfarm business labor share, 2030 annual average

**Prior:** P10 50.1 / P50 52.4 / P90 54.2, built from a start level of ~52.6 and a median 4-year change of −0.2pp.

**Data correction (a level shift, not an LR).** The 2026-11-05 release gives **2026Q3 = 53.0%**, *"the lowest level in the series, which begins in the first quarter of 1947"*. Q2 was *"first reported at 52.9%, was revised to 53.3%"* ([Indeed Hiring Lab](https://hiringlab.indeed.com/2026/11/05/q3-2026-productivity-and-costs/), [BLS release](https://www.bls.gov/news.release/archives/prod2_11052026.htm)). The preamble's 52.8 and the prior's ~52.45 Q3 conversion are stale. The start moves to ~53.0, a **+0.4 shift**, giving a shifted prior of 50.5 / 52.8 / 54.6 (σ_lo 1.80, σ_hi 1.40).

Shifted prior in bins: Low (<51) 0.158; Mid (51-53) 0.399; High (>53) 0.443.

| # | Signal | L(Low) | L(Mid) | L(High) | LR Low:High | Flag |
|---|---|---|---|---|---|---|
| 1 | Momentum: the index fell ~3.2% in six quarters (−0.65pp/yr), with Q3 productivity +3.6% annualised and unit labor costs −0.7%. Caveats verbatim: productivity revisions *"differed from the first by −1.1 to +1.4 percentage points about 80% of the time"*. The prior's near-low subset shows mean reversion (median +0.85pp), which partly offsets this | 1.25 | 1.0 | 0.80 | 1.56 | [moderate] |
| 2 | Real hourly compensation −1.9% annualised in Q2. Part of the fall is an inflation squeeze that tends to reverse as inflation normalises | 0.90 | 1.0 | 1.10 | 0.82 | [weak] |
| 3 | Fermi model, DIRECTIONAL: AI payoff off gives −0.1pp, on gives −1.9pp (model units, *"NOT comparable to BLS 52.8%"*). Sign only | 1.05 | 1.0 | 0.95 | 1.1 | [weak] |
| 4 | Recession risk (VIX shock, AI-equity rout). The share spikes in a recession year (2001 +1.8, 2020 +2.4) but falls back afterwards, so the effect on 2030 depends on timing | 1 | 1 | 1 | 1 | null |

**Combined likelihoods:** Low 1.181, Mid 1.0, High 0.836.

**Posterior bins:**
- Unnormalised: 0.187, 0.399, 0.371 (sum 0.956).
- Normalised: **0.195, 0.417, 0.388**.

**Quantiles:**
- **P10:** prior CDF target 0.081, z = −1.40, so 52.8 − 2.51 = **50.3**.
- **P50:** prior CDF target 0.450, z = −0.127, so **52.6**.
- **P90:** prior CDF target 0.886, z = 1.205, so 52.8 + 1.69 = **54.5**.

**Q6: P10 50.3 / P50 52.6 / P90 54.5.** The essay's "1980-2020 in a decade" path (~50.3 by 2030, per fermi) sits at my P10. Resolution caveat from signals: the BLS API carries only the index, so the percent level comes from release text. The question's 52.8 baseline conflicts with both the first print and the revision.

---

## Q7: Indian IT big-5 headcount at 31 Mar 2029 ≥10% below 31 Mar 2026

**Prior:** 8. The aggregate has never fallen 10% over three years. The prior already folded in the FY26 decline and the +13,918 in Q2. **Prior odds** 0.087.

| # | Signal | P(E\|Yes) / P(E\|No) | LR | Flag |
|---|---|---|---|---|
| 1 | H1 FY27 net **+16,055** ([Angel One](https://www.angelone.in/news/stocks/indian-it-stocks-in-focus-top-five-firms-add-16-055-employees-in-h1fy27-but-demand-recovery-remains-uncertain)). A conflicting source gives +19,398, so filings are needed. This implies a base of ~1,533k, a threshold of ~1,380k, and a required fall of **−10.9% from Sep-2026 in 2.5 years**. Incremental to the prior's Q2 read only | 0.50/0.62 | 0.8 | [weak] |
| 2 | Composition: freshers were 60-65% of net hiring; *"overall IT hiring declined by 3%"*; *"not evidence of a broad recovery in demand"*. FY27 net additions *"fewer than 30,000–40,000"* | — | 1.0 | null (cuts both ways) |
| 3 | A substitution mechanism outside the reference class: revenue per employee rising on GenAI delivery (fermi's identity, median −1%/yr). No direct telemetry in hand | — | 1.2 | [weak] |
| 4 | E3 channel: INR weakness and the H-1B fee shift push work offshore and protect India headcount (fermi) | — | 0.9 | [weak] |
| 5 | US-recession risk (Nov 5 VIX shock). A recession is the main fast path to Yes | 0.50/0.43 | 1.15 | [weak] |
| 6 | Resolver: the acquisition clause is truncated, and acquired staff add to the count | — | 0.95 | [weak] |

**Posterior odds:** 0.087 × 0.8 × 1.0 × 1.2 × 0.9 × 1.15 × 0.95 = 0.087 × 0.944 = 0.082, so **P = 7.6%**.

**Q7: 8.** No signal clears 1.25:1. The evidence is a wash, so the prior holds.

---

## Coherence checks

- **Q1 ↔ Q2:** Q2 implied from the Q1 regimes is ≈25%, against 26 stated. Consistent.
- **Q4 ↔ Q5:** a yield cap means debasement, which lifts stablecoins. At Q5 = 5% the joint tail sits inside Q4's P90, so neither number needs to move.
- **Q6 ↔ Q7:** both load on AI substituting labour. Both stay modest (Q6 median −0.4pp from start; Q7 8%). In a world where the essay is right, both move together: Q6 toward ~50 and Q7 toward ~30%.
- **Prior sensitivity:** Q3 is the only question where the prior choice dominates the posterior. From fermi's implicit prior the same LRs would give ~90%. That spread is the panel's real disagreement, and it is about the reference class (wide industry class against the leaderboard's own record), not about the evidence.

## Sources

- Wave-1 packet (prior and evidence): `docs/forecasts/commanding-heights-2026/seats/E3-wave1-packet.md`
- GENIUS three-year foreign-issuer provision (18 Jul 2028), checked for this seat: [Paul Weiss](https://www.paulweiss.com/insights/client-memos/genius-act-ushers-in-comprehensive-federal-regulation-of-payment-stablecoins); [Latham & Watkins](https://www.lw.com/en/insights/2025/07/the-genius-act-of-2025-stablecoin-legislation-adopted-in-the-us); [Orrick](https://www.orrick.com/de-DE/Insights/2025/07/Stablecoin-Framework-Signed-into-Law). Caveat: these are 2025 law-firm summaries, not the statute text; final rules or a safe harbor can change its reach.
- All other URLs are cited inline and taken from the E3 Wave-1 seats as they reported them.

```json
{"q1": {"A": 43, "B": 42, "C": 14, "D": 1},
 "q2": 26, "q3": 62,
 "q4": {"p10": 220, "p50": 388, "p90": 685},
 "q5": 5,
 "q6": {"p10": 50.3, "p50": 52.6, "p90": 54.5},
 "q7": 8}
```
