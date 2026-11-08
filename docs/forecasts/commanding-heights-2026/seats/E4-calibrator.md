# E4 labor-distribution / calibrator (A6, Wave 3: the effort-level posterior)

**BLUF.** The US labor share most likely keeps falling, to a 2030 average of **51.4%** (P10 49.0 / P90 54.0). About a quarter point of that fall comes from a scheduled change in how the series is defined, not from the economy. A 10% cut in Indian IT big-five headcount by March 2029 stays unlikely at **10%**. The premortem moved me on four questions:

- **Q6.** BEA has scheduled a definitional break (data capitalization in 2028).
- **Q7.** The real limit on how fast these firms can shrink is staff attrition, not the historical record.
- **Q2.** The fermi seat made an arithmetic slip.
- **Q1.** The outside-view reference class misses that 2026 is not the capex peak, because 2027 guidance is up again.

My single largest update is Q1 regime A, from the effort prior of 52 down to **25**.

Lens: calibrator. I weight the five E4 seats (outside-view, fermi, signals, bayes, premortem) by argument quality, question by question. I did no new research. I made one spot-check of a disputed fact: the premortem's BEA claim, reported under Q6.

---

## Spot-check (the one disputed fact I verified)

The premortem's whole Q6 attack rests on BEA's plan to capitalize data, and no other seat raised it. I fetched the BEA Director's blog ([BEA, 20 Apr 2026](https://bea.gov/news/blog/2026-04-20/when-are-data-and-tractors-treated-same-economic-accounting)). It says, verbatim:

> "'Capitalizing' data—an improvement we plan to introduce with the next comprehensive update of GDP and its major components in 2028—has been on our radar for some time."

The [BEA Research Spotlight](https://apps.bea.gov/scb/spotlights/2026/0526-capitalizing-own-account-data.htm) confirms the direction: capitalization "expands the production boundary" and "raises measured value added and growth".

- **What is confirmed:** the event, its scheduled timing and the sign of its effect.
- **What is not confirmed:** its size. The premortem's -0.3 to -0.8pp is its own estimate, built from a remembered Statistics Canada ratio. No BEA dollar figure appears on either page. Neither page addresses how much of the effect is already counted, because own-account software, which already includes some database development, is capitalized today.

---

## Per-question weighting

### Q6: BLS nonfarm business labor share, CY2030 average (centre of gravity)

| Seat | P10 / P50 / P90 | Weight | Why |
|---|---|---|---|
| outside-view | 50.0 / 52.0 / 54.1 | **Low** | Anchored at 52.6. That anchor mixed vintages: the current-vintage index was scaled to the old-vintage 52.8 for Q2. BLS prints 2026Q3 = 53.0 ([BLS USDL 26-1631](https://www.bls.gov/news.release/archives/prod2_11052026.htm)). I keep its *shape*: a four-year change of P10 -2.6 / P50 -0.6 / P90 +1.5, with its caveat "only about 19 (or 11) independent four-year windows", and the even split in the record-low subclass. |
| fermi | 49.8 / 51.5 / 53.4 | Medium | Its decomposition is sound and its composition arithmetic (-0.4 to -0.55pp) stands without the model. I down-weight two things. Its "back-loaded" timing claim comes from the model's closure, and the premortem showed correctly that the model's labor share moves only through the automation count (`calculateFirmCircuit`). Its revision term has mean 0, which misses a signed break. Its P90 of 53.4 is too tight given the countercyclical record (58.9 in 2020Q2). |
| signals | 49.2 / 51.6 / 54.0 | Medium-high | The freshest data, with caveats preserved. These include the BLS revision band, "-1.1 to +1.4 percentage points about 80 percent of the time", and the note that Indeed's productivity-pay wedge has "not yet shown up clearly in the data". It also gave the resolver audit (no published annual average). It extrapolates a 12-month window that contains a tariff shock, an oil shock and a hiking cycle. |
| bayes | 49.9 / 51.8 / 53.9 | Medium | It made the correct re-base to 53.0, and its LR discipline is honest: every LR is under 2:1. It inherits the outside-view's stationary-definition prior, so it cannot see the boundary change. |
| premortem | 48.6 / 51.4 / 54.4 | **High on the mechanism, medium on the size** | **A real hit.** It is the only seat to find a scheduled, one-sided definitional shift inside the resolution window, and I verified it above. The left-tail compounding argument is also real: strong AI means deeper composition, no recession and the boundary change all at once. The size (-0.4 expected) is its own estimate. The tariff-reversal (+0.3) leg of its upside story **merely poses**: a court refund does not reverse pass-through already in the price level, and the seat flagged its own reading as unverified. |

**My build.**

| Component | Value |
|---|---|
| Start, 2026Q3 | 53.0 |
| Non-AI drift | -0.28pp/yr x 3.9y = -1.1 |
| AI composition plus displacement, net of what the 2023-26 drift already holds | -0.5 |
| Expected cycle (P ~0.33 that a recession weights 2030, x about +1.5) | +0.45 |
| 2028 data capitalization | -0.3 (P implemented before the Feb-2031 print ~0.7, x about -0.4; I shade the premortem's size because part of own-account database work is already capitalized as software) |
| Revision noise | mean 0, sd 0.45 |
| **Median** | **about 51.5, rounded to 51.4 for the left skew** |

The tails:

- **P10 49.0.** A -4.0pp four-year change. That is near the worst observed four-year fall (-4.1, outside-view), and I allow it because the boundary shift and the no-recession strong-AI world stack together. I do not go to the premortem's 48.6. Its downside story assumes real pay trails productivity by 1pp a year for four straight years *and* a full -0.6 boundary shift. That is a conjunction it priced as a 1-in-10 without showing the arithmetic.
- **P90 54.0.** A +1.0 change, which needs a recession-weighted 2030 *and* little boundary effect. The historical P90 of +1.5 is pulled in because the boundary change, if it lands, is one-sided.

**Q6: P10 49.0 / P50 51.4 / P90 54.0.**

Resolver: I adopt the signals/bayes reading. The value is the mean of the four 2030 quarters in the first release that contains 2030Q4. That release will be a post-2028-update vintage, which is exactly why the boundary shift belongs in the forecast.

### Q7: Indian IT big-5 headcount at 31 Mar 2029 at least 10% below 31 Mar 2026 (centre of gravity)

**Disputed base, resolved on the packet's own evidence.** Outside-view and fermi used HCLTech 223,889 for March 2026. Signals' quarterly table shows that 223,889 is the **30 Jun 2026** figure, after -3,292 in Q1 FY27, so March 2026 is 227,181. The signals base is therefore right:

- 31 Mar 2026: **1,530,073**
- Threshold: **≤ 1,377,066**
- Latest, 30 Sep 2026: 1,549,471
- Required: **-11.1% in 10 quarters**, about -4.6% a year. The worst year on record is FY24 at about -4.2%.

| Seat | P | Weight | Why |
|---|---|---|---|
| outside-view | 7 | Low-medium | The aggregate class ("0 of about 25 three-year windows") comes from the growth era. Bayes's own sensitivity concedes it is "not exchangeable with a flat-mean era". The single-firm class (about 17%) is the better half of its blend. |
| fermi | 15 | **Low** | The 16.5% Monte Carlo is driven by an assumed persistent AI factor (±1.2pp a year on both revenue and revenue per employee, for three years). Bayes flagged it correctly as an assumption, not data. It also used the wrong HCLTech base. |
| signals | 7 | Medium | The direction is right (H1 FY27 net +19,398; fresher intake reopening). It preserved caveats: H1 "does not match", and Wipro's fall "should not automatically be interpreted as 6,716 layoffs". It undercounts how fast attrition can turn the figure. |
| bayes | 7 | Medium | Its LRs are honest and it priced the overlapping H1 signals jointly. Its own sensitivity (a 12% prior gives 10.7%) is the more defensible end, and it reported 7 only because the lens fixed the prior. |
| premortem | 13 | **Medium-high on the mechanism, low on the conditional** | **A real hit:** "worst year -4.2%" is a growth-phase statistic, not a physical bound. At 12-14% attrition, about 190-210k people leave each year, so freezing intake shrinks the aggregate by double digits with no layoffs. Its "conjunction error ran backwards" point **merely poses**: the arithmetic still needs about -4.6% a year for 2.5 years from a level that is rising now. Its P(-11% \| demand shock) = 0.33 is asserted. The nearest analogue is the FY24 discretionary dip, which gave -4.2% in a year; a Yes needs about 2.7 times FY24's cumulative fall. I use about 0.2. |

**My pricing.**

- P(US recession or AI-capex bust cutting discretionary IT, starting early enough, i.e. by early 2028, to give 4-6 contracting quarters) ≈ 0.30, times P(Yes \| shock) ≈ 0.22, gives **6.6%**.
- No-shock path (AI deflation on renewals, which Kotak and HCLTech put at 3-5%, set against CLSA's "no evidence of increased deflation in renewal contracts"), with hiring held well below attrition: about **3%**.
- Acquisition drag (the resolver counts reported headcount): -0.3.
- Cross-check: a flat-era random walk with mean -1% a year and an annual sd of 4-5% over 2.5 years gives 7-12%.

**Q7: 10.**

### Q1: Big-4 cash PP&E capex, R = CY2030 / CY2026

| Seat | A / B / C / D | Weight | Why |
|---|---|---|---|
| outside-view | 52/30/13/5 | **Low** | **The premortem's hit is real.** The class is "four years after a year of 50%+ growth", and in most of its cases the surge year was the peak. Here the 2027 telemetry says otherwise: Amazon will "spend meaningfully more in 2027", Alphabet will "increase significantly", and aggregator consensus is about $935B ([Luminix](https://www.useluminix.com/reports/industry-analysis/hyperscaler-capex-q3-2026), "aggregator figure, not company guidance"). Regime A then needs a peak-to-trough fall of more than 23% from 2027, or about 35% from a 2028 peak: a two-step conjunction. |
| fermi | 22/57/19/2 | Medium-high | The physical and financial walls against D are the best argument in the effort: about $1.4T a year of external finance, D&A needing $3-4T of AI revenue, and about 55-60 GW a year. The premortem is right that the walls do not bind C, and that an intensity of 0.30 assumes mean reversion. |
| signals | 15/36/38/11 | Medium | It got the lock-basis level right (about $690-720B for CY2026) and documented funding strain: Alphabet Q3 FCF -$9.1B, Amazon TTM FCF -$42.4B, Meta up to $95B of stock sales. It then read 2027 momentum forward to 2030. Its D of 11 ignores the walls. |
| bayes | 54/32/11/3 | **Low** | It inherits the outside-view's A. Its guidance LR (A 0.5) partly captures the 2027 information, but the reference-class problem sits in the prior, not the evidence. A of 54 alongside a +25-35% 2027 is hard to make coherent. |
| premortem | 24/40/29/7 | Medium-high | It gave the conjunction critique of A and of fermi's scope. Its D of 7 rests on the essay's "Washington backstop", which **merely poses**: no seat showed a federal financing channel for hyperscaler capex. |

**My build** (lock basis, base about $705B):

- 2027 is about 1.27-1.30x the base.
- P(a bust starting in 2028-29 deep enough to take 2030 below the base) ≈ 0.40 x 0.62 ≈ **0.25**. Telecom fell 46% over 2000-02, and semiconductor busts ran 30-40%.
- In no-bust worlds (0.75): growth decelerating to about 15/10/8% gives 2030 ≈ $1.23T, or R ≈ 1.75, inside B.
- C needs about 16% a year sustained over 2027-30: P(C \| no bust) ≈ 0.37. D needs about 45% a year over 2027-30 against fermi's walls: P(D \| no bust) ≈ 0.05.
- Result: A 25 / B 0.75 x 0.58 ≈ 43 / C 0.75 x 0.37 ≈ 28 / D 4.

**Q1: A 25 / B 43 / C 28 / D 4.**

### Q2: Epoch-estimated training cost ≥ $10B, model published by 2028-12-31

| Seat | P | Weight | Why |
|---|---|---|---|
| outside-view | 33 | Medium | The two-factor structure (does the run exist × does Epoch carry a primary estimate) is right. Its threshold sat on the old 2.4x line. |
| fermi | 9 | **Very low** | **A real hit from the premortem.** It set C0 = $0.55B "as of mid-2026", but that is Grok 4 (mid-2025, about $490M median), and it compounded only 2.2 years at 2.6x. Under Epoch's current headline, "3.5×/year since 2020", 90% CI 2.8x-4.4x ([Epoch Trends](https://epoch.ai/trends)), its own arithmetic gives a median of about $8.7B. That is near the threshold, not 8% of it. |
| signals | 38 | Medium | Its resolver frictions are right: closed labs, "unknown" costs, and constant- versus nominal-dollar fields. |
| bayes | 38 | Medium | Factor 1 at 0.596 rests on an LR of 1.8 for the trend, the strongest in its file. It may under-price that GPT-5 used less training compute than GPT-4.5 ([Epoch](https://epoch.ai/gradient-updates/why-gpt5-used-less-training-compute-than-gpt45-but-gpt6-probably-wont)). That is evidence that frontier spend is shifting to RL and inference. |
| premortem | 24 | Medium | It sized the physical check correctly: about 2-3 GW dedicated to one run, plausible only at the end of 2028. That is fair, and it pulls against bayes's 38. |

**Mine.** P(a run with an Epoch-amortized cost ≥ $10B is trained and published by end-2028) ≈ 0.47. The trend median is near or above the threshold, but the GPT-5 compute dip and hyperscaler funding strain cut against it. P(Epoch's 2029-12-31 snapshot carries a primary estimate ≥ $10B for it) ≈ 0.63. That covers non-disclosure, "unknown" costs, and constant 2023 dollars, where a run of $10-11B nominal prints below $10B. 0.47 × 0.63 ≈ **0.30**.

**Q2: 30.**

### Q3: all ten top LMArena organizations US/PRC on 2028-12-31

| Seat | P | Weight | Why |
|---|---|---|---|
| outside-view | 55 | **Low** | Mostly industrial reference classes (aerospace, nuclear) that do not fit. It also could not see that the board is already 10/10 US/PRC with a deep bench. |
| fermi | 75 | Medium | The contender product is the right structure. Its 12% for Mistral is generous: Mistral Large 3 was rank 91 in May 2026 ([DataLearner](https://www.datalearner.com/en/leaderboards/external/text-generation)). |
| signals | 86 | Medium | It has the live status quo: the [BenchLeader](https://www.benchleader.com/benchmarks/lmarena_text) snapshot of 8 Nov 2026, with its caveat "only the 60 rows shown on the page", and Swfte orders the top differently. It applies little decay over two years. Its resolver audit (lmarena.ai now redirects to arena.ai; no dated archive is named) points to cancellation risk, not to No. |
| bayes | 74 | Medium | Capped by the outside-view prior. |
| premortem | 81 | Medium | Its HQ point (Chinese labs under Cayman or HK parents, Singapore redomiciles) **merely poses** for the labs that matter. The rule is headquarters of the ultimate parent, not place of incorporation, and Alibaba, Moonshot, Zhipu, DeepSeek and Xiaomi are headquartered on the mainland. It is a real but small risk only for a lab that actually moves its headquarters. |

**Mine.** The 10th-ranked organization sits around model rank 20-30, behind a deep US/PRC bench. P(no Mistral) 0.92 × P(no Gulf, Japan, Korea or India sovereign lab) 0.94 × P(no Cohere or other) 0.97 × P(no headquarters move or label surprise) 0.96 ≈ 0.80.

**Q3: 80.**

### Q4: DefiLlama total stablecoins, 2028-12-31 ($B)

| Seat | P10/P50/P90 | Weight | Why |
|---|---|---|---|
| outside-view | 260/410/720 | Low | Anchored at $300.4B (secondary). The level is about $290-294B (fermi's DefiLlama API sum is $294B on 2026-11-08). |
| fermi | 235/390/680 | Medium-low | Bayes correctly sided with signals: tokenized money-market funds are not counted as stablecoins, so fermi's "+$15-150B new issuers" stream is partly the wrong object. Its crypto-elasticity stream is reasonable. |
| signals | 225/345/580 | Medium | It has the freshest drawdown data (about -10% from the about $322B May peak; YoY about -6%) with its caveat ("no single catastrophic event"). Its P90 is tight for a series that went +137% over Dec 2023 to Dec 2025. |
| bayes | 225/360/620 | Medium-high | A clean re-base to about $292B and a sensible lognormal refit. |
| premortem | 215/345/650 | Medium | The 2022-23 bear case is legitimate, and P10 near 215 is defensible. |

Not E4's centre of gravity. **Q4: P10 225 / P50 355 / P90 630.**

### Q5: Fed numerical yield ceiling or target (≥1y) before 2031

The seats range from 5 to 9.

- I down-weight the **premortem's** "institutional capture" path (9) as **posing**. A politically aligned Board would more likely deliver cuts, or QE without a stated level, which does not count, than an announced numerical yield. The Fed is hiking, with two dissents for more ([FOMC, 28 Oct 2026](https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm)), and its chair reportedly prefers a smaller balance sheet tilted to bills.
- Its war-financing path, 1942-style, is a fair addition that no Wave-1 seat priced, at about 1%.
- Bayes's joint LR of 2.0 for Treasury buybacks plus a 10y above 5% is at its cap and fair.

**Q5: 6.**

---

## Internal-coherence checks

1. **Q1-A ↔ Q6 upper tail.**
   - P(a recession weights 2030) ≈ 0.25 × 0.5 (given A) + 0.75 × 0.2 (otherwise) ≈ 0.28.
   - P(Δ ≥ +1.0 \| recession) ≈ 0.35, which gives about 0.10.
   - That matches a Q6 P90 of 54.0. ✔
2. **Q1 C+D ↔ Q6 lower tail.**
   - P(LS < 49.0) ≈ 0.32 × 0.18 (C or D: deeper composition, no recession) + 0.68 × 0.06 ≈ 0.10.
   - That matches P10 = 49.0. ✔
3. **Q6 ↔ Q7 sit in different worlds.**
   - Q7's Yes runs mostly through the bust or recession path (about 6.6 of 10 points), and that is Q6's *high*-share world.
   - The joint (Q6 below 49.5 and Q7 Yes) is therefore small, about 1-2%, not the product of two "strong AI" tails. ✔ (This corrects the fermi coherence note, which put Q7 Yes in the strong-AI, low-share world.)
4. **Q1 ↔ Q2.**
   - P(Q2 \| A) ≈ 0.18: big runs can still publish in 2027-28 before a bust.
   - P(Q2 \| not A) ≈ 0.34.
   - 0.25 × 0.18 + 0.75 × 0.34 = 0.30. ✔
5. **Q5 ↔ Q6/Q1.** All three share the recession path. A zero-lower-bound recession contributes about 2 of Q5's 6 points and is the same about 0.28 world as check 1, with P(explicit yield number \| recession) under 0.1. ✔
6. **Q4 is largely orthogonal** to the labor block. A YCC (Q5) world would mildly raise Q4's upper tail, which is immaterial at 6%. ✔
7. **Essay check.** The essay's pro-rata labor transfer lands at about 49.5 (fermi). That is roughly my 13th-14th percentile on Q6, and about a quarter of that tail is the BEA boundary change, not the economy. The essay's "bottom K" world (Q7 Yes) is 10%. The essay's line (Q1 D) is 4%. These are coherent as a "the essay is directionally right but early" posterior.
8. **Sums and orders.** Q1 adds to 100. Q4 225 < 355 < 630. Q6 49.0 < 51.4 < 54.0. Every binary is an integer in [1, 99]. ✔

---

## Wave audit

**Where Wave 1 disagreed.**

- **Q1:** A ran from 52 (outside-view) to 15 (signals), and C from 13 to 38. The split was base rates against momentum.
- **Q2:** 9 (fermi) against 33-38.
- **Q3:** 55 (outside-view) against 75-86.
- **Q6:** the anchor (52.6 against 53.0) and the width of the upper tail (fermi's P90 53.4 against 54.0-54.1).
- **Q7:** 15 (fermi) against 7/7.
- **Q4:** the seats agreed on the level, but fermi counted tokenized money-market funds.

**What Wave 2 changed.**

- Bayes fixed the Q6 anchor: re-based to 53.0, the current-vintage first print.
- Bayes ruled tokenized money-market funds out of DefiLlama's stablecoin count.
- Bayes showed that no signal in the effort earns an LR above 2:1.
- Bayes exposed that Q7's prior sensitivity (7 → 10.7) is the real uncertainty.
- The premortem found the BEA data-capitalization break, which I verified as scheduled for 2028.
- The premortem replaced "worst year" with attrition as the bound on Q7.
- The premortem caught fermi's C0 slip on Q2.
- The premortem showed that regime A is a two-step conjunction once 2027 guidance is known.
- The premortem threw out the model's "back-loaded" timing for Q6 as a property of its closure.
- Its HQ, capture and tariff-reversal arguments posed more than they landed.

**Still unresolved.**

- (a) The size of the BEA data shift, and whether BEA budget cuts delay it past the February 2031 print. This is about ±0.3pp on the Q6 median.
- (b) The Q6 resolver: no published annual average exists, and the four-quarter mean in a single vintage is a proposed ruling.
- (c) Q2: Epoch constant versus nominal dollars.
- (d) Q7: the "an acquired firm's staff count." fragment.
- (e) Q3: arena.ai as successor, and which archive gives the dated 2028-12-31 snapshot.
- (f) Whether the $935B 2027 consensus is on the lock basis (likely headline, so about $890B on the lock basis). It moves Q1's B/C boundary a few points.

**Largest single update.** Q1 regime A, from the effort's base-rate prior (outside-view 52, bayes 54) down to **25**. The cause is the premortem's reference-class hit, made concrete by signals' 2027 telemetry. The 2026 surge year is not the peak, so A needs a later bust *and* a fall of more than 23-35% from a higher peak. Most reference-class cases had only the second step.

---

```json
{"q1": {"A": 25, "B": 43, "C": 28, "D": 4},
 "q2": 30, "q3": 80,
 "q4": {"p10": 225, "p50": 355, "p90": 630},
 "q5": 6,
 "q6": {"p10": 49.0, "p50": 51.4, "p90": 54.0},
 "q7": 10}
```
