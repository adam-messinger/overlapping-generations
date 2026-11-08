# E2 compute-geopolitics, calibrator seat (A6, Wave 3): effort-level posterior

**BLUF.** On its two centre-of-gravity questions, the effort's posterior is **Q3 = 74**: the Arena top ten is all US/China today and probably stays that way, but slot 10 is won by post-training rather than compute, so it is not locked. **Q2 = 17**: on Epoch's own amortized cost metric, a $10B run needs a GW-scale run lasting months, and Epoch has not costed a closed frontier model since July 2025. Off-centre, the effort leans toward Plateau (B 43) for capex, a 2028 stablecoin median of ~$380B, a ~6% chance of a Fed yield peg, a 2030 labor share around 52.2%, and a ~9% chance of a 10% Indian-IT headcount fall.

Forecast origin 2026-11-08. Inputs are the five E2 seats in `seats/E2-wave2-packet.md`: outside-view (OV), fermi, signals (SIG), bayes, premortem (PM). I did no new research. Each spot-check below is a check of arithmetic or logic on figures the seats already cite with sources: the Epoch CSVs, the BenchLeader mirror of Arena, the DefiLlama API and BLS USDL 26-1631 ([prod2.pdf](https://www.bls.gov/news.release/pdf/prod2.pdf)). The source caveats are carried verbatim where they matter.

---

## Per-question weighting

Weights reflect the quality of each seat's argument on that question. They are not a vote. Where my number departs from the weighted mean, I say why.

### Q2: Epoch lists a ≥ $10B run published by 2028-12-31 (centre of gravity). **17**

| Seat | Number | Weight | Reason |
|---|---|---|---|
| OV | 20 | 0.15 | Its ~40% on-time rate for trend milestones is sound. The 0.6 coverage factor predates the evidence that coverage has stalled. |
| fermi | 26 | **0.10** (down-weighted) | Two inputs are too generous. (1) It prices a 2028 Rubin GPU-hour at $5-7, a rental-equivalent figure. Epoch's amortized method implies ~$2.5-3/GPU-hr: Grok 4 was $388M for 246M H100-hours (~$1.6/H100-hr), and $80k all-in amortized over ~3.8 years is ~$2.4/hr plus energy. (2) Its coverage factor of 0.65 is stale. |
| SIG | 15 | 0.20 | Strong telemetry. Epoch rates GPT-6 Astra "Likely" with a "CI of ~[5e26, 2e27] FLOP", and the largest logged run grew 1.9x in 14 months. SIG also found the resolver ambiguity. Its back-projection from an *inferred* $0.5B Astra cost is not an Epoch number. |
| bayes | 18 | 0.25 | It splits the forecast into two conjuncts (a run happens; Epoch costs it) and updates each with honest likelihood ratios, flagging the weak ones. Its coverage point is correct: the "2 of 417" count is dominated by small models Epoch never costs, and the relevant n is the ~2 record-holding runs. |
| PM | 16 | **0.30** | Real hit. It redid the GW-to-dollar conversion on Epoch's own amortization: 1.5 GW at ~$50-55B upfront amortizes to ~$13-14B per run-year, so a 4-6 month run costs ~$4.5-7B nominal. Clearing $8.7B in 2023 USD then needs ≥2.5 GW, or a run of 9 months or more. |

**My arithmetic.**

| Step | Value |
|---|---|
| P(a run ≥ ~$8.7B in 2023 USD is completed and published by 2028-12-31) | **0.27**. Trend extrapolation of Epoch's maximum ($37M → $388M, 2.75x/yr) puts the median right at the bar. PM's physical conversion and the 2026 slowdown pull it below the median. |
| P(Epoch prints a headline cost by 2029-12-31, given such a run) | **0.48**. This sits between bayes's 0.50 and PM's 0.43. Grok 4 was costed within ~2 months; GPT-5 has gone 15 months without a cost. |
| Estimation noise lifting a just-under run over the bar | +0.015 |
| Amortized-column path: 0.27 × 0.48 + 0.015 | 0.145 |
| Resolver channel: the `upfront` column (Grok 4 already at **$10.72B**) read as "primary", or Epoch re-headlining its metric | 0.035 + 0.965 × 0.145 ≈ 0.175 |

**Q2 = 17.** If the orchestrator locks `Training compute cost (2023 USD)`, my number is **14**. Epoch's own caveat on its cost estimates stands, verbatim: "There is significant uncertainty around our point estimate."

### Q3: Arena top-10 organizations all US/PRC on 2028-12-31 (centre of gravity). **74**

| Seat | Number | Weight | Reason |
|---|---|---|---|
| OV | 30 | **0.00** (discarded) | PM landed a real hit. The reference class (aerospace, nuclear, foundries) has decade-long, multi-billion entry barriers. Slot 10 on Arena costs months and hundreds of millions to reach. OV also ignores a status quo that is already closed, and that closed state is the most diagnostic fact over a 25-month horizon. |
| fermi | 79 | 0.25 | The status-quo and Elo-gap arithmetic is good. Its compute-gate mechanism is refuted by the board itself (below). Its "bench depth" (Tencent, ByteDance, MiniMax, MAI, Amazon, SSI and others) is asserted: on the mirror, none of those organizations is in the top 60. |
| SIG | 80 | 0.20 | The best telemetry: 11 of 11 placed organizations are US or Chinese, and none outside those two appears in the visible top 60. Caveats verbatim: the mirror shows "no confidence intervals or vote counts", and 10th place "is a tie at the displayed precision". Its forecast leans on the same compute argument. |
| bayes | 66 | 0.20 | The LR of 3.0 on "board closed today" is well justified. The posterior is held down mechanically by OV's bad prior of 30, so the number is too low for a reason unrelated to evidence. |
| PM | 66 | 0.35 | Three real hits. (1) The spread from #1 to #10 is 52 Elo. Xiaomi holds slot 8, and slot 10 sits at about model rank 40, so post-training, not compute, wins the last seats. (2) Only five US organizations are in the top 11, so closure depends on Chinese labs holding five or six slots. (3) Mistral raised €3B in Sep 2026 ([Euronews](https://euronews.com/business/2026/09/08/mistral-ai-raises-record-3-billion-in-samsung-led-funding-round)). **One logic error, which I correct:** PM raised P(No) from its path sum of 27% to 31% "after the correlation adjustment". For positively correlated failure paths, the probability of their union is *at most* the sum, and lower than under independence. The adjustment runs the wrong way. Fermi's "correlation credit" made the same mistake in the other direction. |

**My No-paths:**

| Path | Probability |
|---|---|
| Mistral directly | 9% |
| Other originals (Korea's ~$3.5B programme, Japan, Gulf, UK, Canada, India) | 4% |
| A derivative fine-tune under a non-US/China label | 2% (posed more than landed: fine-tunes rarely beat their base model's organization) |
| Chinese bench thinning × the next in line being an outsider | 3% (the 11th organization today is Baidu, which is Chinese) |
| Classification: Singapore re-domicile, tie rule at 10th, label drift | 3% |
| Taiwan or delisting discontinuity | 2% |
| Unknown unknowns | 3% |
| **Sum** | **26%** |

The union is ≤ 26%, and positive correlation makes it ~24-25%. Against that, the observed 2024→2026 trend toward closure (Mistral, Cohere and 01.AI all dropped out) argues that ~26% is not an underestimate. **Q3 = 74**, above the weighted mean of 72 because I removed PM's sign error.

### Q1: Big-4 capex regime R = CY2030 / CY2026. **A 25 / B 43 / C 29 / D 3**

| Seat | Numbers (A/B/C/D) | Weight | Reason |
|---|---|---|---|
| OV | 40/32/22/6 | 0.15 | The boom-year reference class is relevant, but it is mostly single-purpose sectors with no replacement floor, and it ignores the 2027 consensus. |
| fermi | 18/44/36/2 | 0.20 | Good physical ceiling on D (~45-50 GW/yr). Its A probability is thin because it priced no accounting drag. |
| SIG | 12/46/34/8 | **0.10** (down-weighted) | D = 8 has no supporting argument. Telemetry cannot see past 2027. |
| bayes | 32/42/23/3 | 0.25 | 2027 momentum is a properly argued LR of ~2.25 against A. The rates signal is flagged as weak, which is correct. |
| PM | 24/42/30/4 | 0.30 | Real hit: the build is migrating off the measured cash line (Meta's Hyperion SPV with Blue Owl, neocloud capacity contracts, Microsoft's finance leases excluded by Q1), and the component-price spike inflates the 2026 denominator. Both are drags on R that exist only in the measured series. **Posed:** the "replacement floor" of $350-450B is well below the ~$690B that A needs, so it does little to rule A out. The Taiwan +3pp is fair but small. |

The weighted mean is 26/41/29/4. I move 1pp from D to B (fermi's physical ceiling) and 1pp from A to B: with R27 ≈ 1.35, A needs a fall of ≥ 26% from a 2027 peak. That has happened (telecom -55%, shale -50%), but always in sectors where capex far exceeded operating cash flow, and today's hyperscaler capex is still only ≈ OCF.

### Q4: DefiLlama stablecoin cap, 2028-12-31. **P10 230 / P50 380 / P90 650 ($B)**

| Seat | Weight | Reason |
|---|---|---|
| OV | 0.20 | Reasonable class, but it uses the 2023-25 pace as its P90. |
| fermi | 0.20 | The component build is sensible. It shares OV's growth logic, so it is not independent evidence. |
| SIG | 0.20 | API sum $294.1B on 2026-11-08, -3.2% year on year, -7% from peak. Its P50 of 340 extrapolates momentum harder than one episode supports. |
| bayes | 0.25 | Correct point: the last negative-YoY episode (2023) was followed by ~1.7-1.95x over two years (n = 1). |
| PM | **0.15** (down-weighted) | The "opportunity cost of non-yielding tokens at 4% rates" hit merely poses: 2024 had a 5%+ policy rate and supply still grew ~+55%. The tokenized-MMF substitution point is fair but slow. |

The weighted mean is ~239/385/651. I shade the P50 down to 380 for the GENIUS ban on issuer yield, and the P10 down to 230 because the 2026 drawdown is still running.

### Q5: Fed numerical yield ceiling/target (≥1y) before 2031. **6**

| Seat | Weight | Reason |
|---|---|---|
| OV | 0.25 | The cleanest base rate: ~0.7%/issuer-year, ~3-4% over the window. |
| fermi | 0.20 | Path decomposition is fine. |
| SIG | 0.15 | Telemetry runs opposite to a peg: hikes to 3.75-4.00%, QT, and buybacks (which Q5 excludes). "No official statement of any numerical yield level was found." The "new accord" item is analyst commentary (Robin Brooks), not policy. |
| bayes | 0.20 | All LRs are under 2:1 and roughly cancel. Correctly flagged. |
| PM | 0.20 | Half a hit. The war channel is real (the 1942 peg was war finance). But P(numerical cap \| Taiwan disruption) = 0.25 is too high for a conflict the US may not fight as a total war; I use ~0.10. Its front-end YCC point stands: a 2-year Australia-style target counts under Q5. |

The weighted mean is 5.7. **6.**

### Q6: BLS nonfarm business labor share, CY2030 average. **P10 50.1 / P50 52.2 / P90 54.3 (%)**

| Seat | Weight | Reason |
|---|---|---|
| OV | **0.05** (down-weighted) | Anchored on the superseded baseline: 52.45 for Q3 against BLS's 53.0. |
| fermi | 0.10 | Started from 52.8, and its AI-transfer term is a guess. |
| SIG | 0.20 | Found the revision. Its -0.4-0.6pp/yr drift uses CPI-deflated compensation against an output-deflator share, a mismatch bayes caught. |
| bayes | 0.35 | Corrected the baseline as arithmetic rather than evidence, then updated modestly. |
| PM | 0.30 | Its stale-anchor hit is the same correction, credited once. Its wider upper tail (an AI-bust recession lifting the share as in 2001) is coherent with my Q1 A = 25. |

The BLS verbatim carries over unchanged: the share "was 53.0 percent in the third quarter of 2026, the lowest level in the series". The revision caveat also carries: productivity "has differed from the first estimate by -1.1 to +1.4 percentage points about 80 percent of the time". The weighted mean is 50.08/52.19/54.25.

### Q7: Indian IT big-5 headcount ≥10% below Mar 2026 at Mar 2029. **9**

| Seat | Weight | Reason |
|---|---|---|
| OV | 0.25 | Good classes. The combined big-5 has never fallen 10% in three years. |
| fermi | **0.10** (down-weighted) | Its +5.5%/yr AI-productivity input is assumed, not measured, and the flat-to-up telemetry contradicts its central -2.5%/yr drift. |
| SIG | 0.20 | ~1.549M at 30 Sep 2026, ~+0.5-1% above the March base. Sources conflict on Tech Mahindra's Q2 addition (+5,446 vs +1,928) and "disagree on the full-year numbers". |
| bayes | 0.25 | Sound. |
| PM | 0.20 | The demerger/carve-out channel is a real mechanical route to Yes. ~2pp is generous for five firms in three years; I credit ~1pp. |

The weighted mean is ~10. I take one point off for PM's over-sized demerger mass. **9.**

---

## Internal-coherence checks

1. **Q1 ↔ Q2.** I apply fermi's conditional structure, rescaled to my coverage and resolver discounts: P(Q2 | A) ≈ 0.08, P(Q2 | B) ≈ 0.13, P(Q2 | C) ≈ 0.28, P(Q2 | D) ≈ 0.5. That gives 0.25×0.08 + 0.43×0.13 + 0.29×0.28 + 0.03×0.5 = **0.172**, consistent with Q2 = 17. P(Q2 | A) is not near zero, because a bust in 2029-30 can follow a 2028 run.
2. **Q2 ↔ Q3.** A Yes on Q2 (bigger runs) is only weakly positive for Q3, because slot 10 is not compute-gated (PM). I add no extra coupling.
3. **Shared discontinuity tail** (Taiwan or delisting, ~5% by 2028 and ~9% by 2031). In that world the answers move together: Q1 toward A, Q2 No, Q3 No, Q5 Yes, Q7 Yes. I priced it once per question: Q1 A +2, Q2 -0.5, Q3 -2, Q5 +1, Q7 +0.5. **The aggregator should not treat these questions as independent in the tail.**
4. **Q1 ↔ Q6.** C goes with a lower share, and A (a recession) with a higher one. P90 54.3 is about +1.3pp from the 53.0 start, in line with A = 25% times a 2001-style +1-2pp jump. P10 50.1 covers C with mild AI transfer.
5. **Q1 ↔ Q7.** Q7 Yes is concentrated in the A-world (US client recession) and the C-world (agentic delivery). P(Q7) = 9% fits P(A) = 25% × P(Q7 | A) ≈ 0.2 plus a small C contribution.
6. **Correlation algebra** (Q3). The probability of a union of positively correlated failure paths is at most their sum. I applied this, and it is why I sit above both 66s.
7. **Bands.** Q1 sums to 100. P10 < P50 < P90 holds for Q4 and Q6. All binaries are between 1 and 99.

---

## Wave audit

**Where Wave 1 disagreed.**
- **Q3:** 30 (OV) against 79-80 (fermi, SIG). An unconditional cross-industry reference class was set against the observed closed board.
- **Q1 A:** 40 (OV) against 12-18 (fermi, SIG). Railroad and telecom busts were set against the 2027 consensus.
- **Q2:** 26 (fermi) against 15 (SIG): a 0.65 coverage factor and a generous $/GPU-hr against the observed slowdown and stalled coverage.
- **Q7:** 20 (fermi) against 7 (OV): an assumed AI productivity rate against base rates.
- **Q4 P50:** 340 (SIG) against 410 (OV, fermi).

**What Wave 2 changed.**
- Bayes formalised the closed board as the one signal justified above 2:1 (LR 3.0).
- Bayes split Q2 into its run and coverage conjuncts.
- Bayes corrected Q6's baseline to BLS's 53.0.
- PM showed slot 10 is gated by post-training, not compute (the 52-Elo spread; Xiaomi at slot 8). This removed the mechanism behind fermi's and SIG's ~80.
- PM redid the Q2 dollar conversion on Epoch's own amortization.
- PM named off-balance-sheet migration as a drag on measured capex.
- PM introduced the shared Taiwan/delisting tail.

**Still unresolved.**
- (a) The Q2 resolver column: `upfront` already shows Grok 4 at $10.72B. Worth ~3.5pp here.
- (b) Q3: no tie rule at 10th, arena.ai 403s automated reads, and Mistral Large 4's Arena score is unpublished.
- (c) Whether Epoch will cost closed frontier models at all (GPT-5, GPT-6 Astra still uncosted).
- (d) Q7's truncated acquisition clause.
- (e) Q6's annual-average reading (mean of four first-published quarters is recommended).
- (f) Q1: how much of 2027-30 build moves to SPVs and leases.

**Single largest update and its cause.** Q3: the effort's outside-view prior of 30 goes to **74**, with OV given zero weight. The cause is PM's reference-class hit: slot 10's entry cost is months and hundreds of millions, not decades and billions. Bayes's evidence carries the rest: the board is closed now, over a 25-month horizon. Measured against the Wave-1 mode (~80), my largest move runs the other way, -6, driven by PM's demonstration that the top ten is not compute-gated. I stopped short of PM's 66 because its correlation adjustment had the wrong sign.

```json
{"q1": {"A": 25, "B": 43, "C": 29, "D": 3},
 "q2": 17, "q3": 74,
 "q4": {"p10": 230, "p50": 380, "p90": 650},
 "q5": 6,
 "q6": {"p10": 50.1, "p50": 52.2, "p90": 54.3},
 "q7": 9}
```
