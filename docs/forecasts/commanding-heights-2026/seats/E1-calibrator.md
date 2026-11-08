# E1 ai-capital-cycle / calibrator (A6, Wave 3, effort-level posterior)

**BLUF.** E1's posterior on the Line is a plateau-leaning barbell. Big-4 cash capex in 2030 is most
likely 1-2x the 2026 level (B 44), with real mass on a funding-loop break (A 25) and on sustained growth
(C 28). The essay's 4x line is a 3% tail. The other six answers:
- **Q2 ($10B Epoch run):** 21.
- **Q3 (all ten top Arena organizations US or Chinese):** 78. A spot-check shows the first 18 distinct
  organizations are US/PRC.
- **Q4 (stablecoins, $B):** 220 / 360 / 640.
- **Q5 (Fed yield ceiling or target):** 5.
- **Q6 (labor share, %):** 48.9 / 51.6 / 54.1, measured from a revised 53.0% start.
- **Q7 (Indian IT headcount down 10%):** 13.

Inputs:
- I read only `questions.md`, the E1 mandate and calibrator lens in `efforts.md`, and the E1 Wave-2 packet
  (outside-view A1, fermi A2, signals A3, bayes A4, premortem A5).
- I ran one spot-check of a disputed fact: Mistral's Arena score (Q3).
- No other research.

---

## Seat inputs

| Q | outside-view | fermi | signals | bayes | premortem | **calibrator** |
|---|---|---|---|---|---|---|
| Q1 A/B/C/D | 50/36/11/3 | 15/59/23/3 | 12/38/40/10 | 41/41/16/2 | 30/36/29/5 | **25/44/28/3** |
| Q2 | 35 | 22 | 33 | 29 | 18 | **21** |
| Q3 | 35 | 77 | 84 | 67 | 68 | **78** |
| Q4 P10/P50/P90 | 240/440/760 | 250/365/640 | 225/345/540 | 215/355/580 | 225/370/700 | **220/360/640** |
| Q5 | 4 | 6 | 8 | 3 | 6 | **5** |
| Q6 P10/P50/P90 | 49.8/52.0/54.2 | 49.4/51.9/54.5 | 48.6/51.6/54.4 | 49.6/51.9/54.2 | 48.7/51.4/54.0 | **48.9/51.6/54.1** |
| Q7 | 8 | 20 | 12 | 8 | 18 | **13** |

---

## Per-question weighting

### Q1: Big-4 cash capex, R = CY2030 / CY2026 (centre of gravity)

**Weights (by argument quality):**

| Seat | Weight | Reason |
|---|---|---|
| premortem | ~0.30 | strongest argument |
| fermi (cash and GW arithmetic) | ~0.25 | |
| bayes | ~0.15 | |
| outside-view | ~0.15 | |
| signals | ~0.15 | |

**Down-weighted, by name:**
- **Outside-view (A 50).** Its class is drawn from memory and, by its own words, "biased toward famous
  busts". The busts are mostly single-product, debt-financed sector booms such as CLECs and railway
  mania. It is also blind, by lens, to one structural fact all four other seats accept: committed 2027-28
  hardware puts R_2027 at ~1.26-1.35. Regime A therefore needs a fall of at least ~25-30% from a
  2027-28 peak. Telecom incumbents did fall that far, so A is live. But it is not the default.
- **Bayes (A 41).** Its LRs are honestly flagged as weak, but it inherits the outside-view prior that I
  down-weight. Its S1 LR of 0.64 is defensible. The posterior's height on A comes from the prior, not
  from the evidence.
- **Signals (C 40 / D 10).** The premortem's scope check landed. An R = 2 path is ~$5.8T cumulative
  2025-30 from four firms, already above McKinsey's ~$5.2T world base case; an R = 4 path is ~$8.5T,
  above the $7.9T world high case. Both figures are secondary summaries. Fermi's GW check also stands:
  D ≈ 55-60 GW/yr for four firms. D 10 is not supportable. C 40 rests on extrapolating CFO at ~23%/yr,
  which is exactly the assumption the premortem broke.
- **Fermi (B 59), partly.** Its cash arithmetic is the best structural anchor in the packet: capex/OCF
  ≈ 1.0 and OCF growing 15-19% give R ≈ 1.85-2.1. Two of its supports fell:
  - It treated OCF as independent of the build, so bust and no-bust were separate draws.
  - It took comfort from the simulation. "dc-fast lands at R ≈ 3.8" is the lever's own setting
    (`dataCenterBaseGrowth` 0.30, so 1.30^4 = 2.86, plus a loosened ceiling). "Unlevered runs sit in B"
    restates a load-addition closure that cannot produce A.

**Where the premortem landed real hits (I moved):**
1. **OCF is endogenous to the build.** OpenAI and Anthropic are reported as about half of the ~$2T
   combined backlog: ~45% of Microsoft's RPO, and Anthropic >40% of Google's when disclosed. Caveat
   preserved: the sources are "mixed in quality", and Microsoft's backlog appears as "$625B, $627B, and
   $678B across different reports". Because the vendors partly fund those customers, a break in the
   lab-funding loop hits capex and OCF together. This fattens both wings relative to fermi's 59 on B.
2. **Cash-rich incumbents cut hard.**
   - SBC fell from ~$12-13B (2000) to ~$5-6B (2003). Verizon fell from $17.3B to $11.9B (2001-02).
   - Amazon and Meta both cut P&E in 2023 (from memory, not re-read).
   - Fermi's bust branch, with P(R<1 | bust) = 0.55 and a $0.4-0.5T floor, is if anything mild.
3. **The scope check on C and D** (above).
4. **The attack on the simulation closure** (above).

**Where it merely posed (I did not move):**
- **"R < 1 on the cash line with no bust" through off-balance-sheet migration.** Hyperion-style JVs move
  the shell and the power, but chips, ~60-70% of all-in spend per fermi, stay on the hyperscaler's
  purchases line. So migration can shave R, not halve it. I give it ~3 points of A inside the no-break
  branch.
- **Asset-life extension as a reason the floor fails.** Book lives are an accounting choice. Replacement
  cadence is set by economic obsolescence. This is a partial hit at most.

**My construction:**

| Branch | P | R distribution | Contribution |
|---|---|---|---|
| Funding loop breaks by 2029 (lab-round failure, ROI pause or efficiency shock); 2027-28 peak, then a cut | 0.35 | P(A) ≈ 0.60 (A needs a ≥25-30% cut from peak; telecom incumbents cut 30-60%); else B | A 0.21, B 0.14 |
| Loop holds | 0.65 | lognormal, median R ≈ 1.95, σ_ln 0.30, right tail fattened to P(R≥4) ≈ 0.04; ~0.04 of A from migration and the low tail | A 0.026, B 0.32, C 0.28, D 0.026 |

Totals: A ≈ 0.24 / B ≈ 0.46 / C ≈ 0.28 / D ≈ 0.03. Rounded **A 25 / B 44 / C 28 / D 3**. A
quality-weighted mean of the five seats gives ~28/43/25/4, so the construction and the weighting agree to
within 3 points.

### Q2: Epoch ≥ $10B training cost, published by 2028-12-31

**Up-weighted:**
- **Fermi** and **premortem** price the two terms that dominate:
  - **Coverage.** Epoch's headline cost exists for 8 of 109 notable models in 2025 and 1 of 95 in 2026.
    GPT-6 Astra has a $4.23B hardware acquisition cost but no headline cost.
  - **Physical scale.** A $10B amortized headline needs roughly the full Hyperion-class cluster (3.7M
    H100e "by January 2028") for 3-4 months, with the model then published inside 2028.
- **Bayes** is right on the deflator: Epoch reports "2023 USD", and converting to nominal makes the
  threshold EASIER (~$9B in 2023 USD ≈ $10B nominal). Fermi and the premortem both carried the wrong
  sign ("harder"). The effect is small either way.

**Down-weighted:**
- **Outside-view (35)** and **signals (33).** Neither prices the coverage collapse beyond a generic
  haircut. Signals' path arithmetic is good: from ~$0.65B in Sep 2026 the trend must hold at
  ~3.3x/yr from a point already below it. But it lands at the on-time rate.

**Construction:**
- P(a ~$10B-scale single run, published by end-2028) ≈ 0.30.
- P(Epoch prices it by 2029-12-31 | it exists) ≈ 0.50. Frontier models get Epoch's attention, and there
  is a year of lag to backfill.
- Lenient or other-method resolution (Grok 4 is already $10.7B "upfront") ≈ 0.04.
- 0.30 × 0.50 + 0.04 = 0.19. Nudged up to **21** for the lumpiness argument: compute steps arrive when
  GW sites come online, and the 1.9x in 14 months since Grok 4 may be a pause between steps.

### Q3: top-10 distinct Arena organizations all US/PRC on 2028-12-31

**Spot-check of the disputed fact.** One aggregator put Mistral Medium 3.5 at ~1481.8, which would be
inside the top ten today. I fetched the BenchLeader mirror
([benchleader.com/benchmarks/lmarena_text](https://www.benchleader.com/benchmarks/lmarena_text); entries
stamped "Published 2026-11-06") and parsed each developer's best entry. Its top-10 values match the
signals seat's exactly.

**Rank of distinct organizations at their best model:**

| Ranks | Organizations | Scores |
|---|---|---|
| 1-10 | Google, Meta, Anthropic, Moonshot, OpenAI, Alibaba, Zhipu, Xiaomi, DeepSeek, SpaceXAI | 1526.5 down to 1474.7 |
| 11-18 | Baidu, ByteDance, Tencent, StepFun, Thinking Machines, Meituan, MiniMax, Reflection | 1467.2 down to 1435.1 |
| **19** | **Mistral AI** (Mistral Medium 3.5; Mistral Large 4 is 1419.6) | **1426.5** |
| 20 | NVIDIA | 1426.2 |

- The first non-US/PRC organization is therefore 19th, ~48 Elo below the 10th, with eight more US/PRC
  organizations between them.
- The ~1481.8 figure is not what this mirror shows.
- Caveats: this is a third-party mirror, not arena.ai, which returned 403 to earlier seats. I assume its
  "value" field is the style-controlled Arena score; it matches the signals seat's top-10 numbers.

**Down-weighted:**
- **Outside-view (35).** It used the wrong class (national hardware and industrial sectors) and by lens
  ignored the resolver's current state.
- **Bayes (67).** It is anchored on that prior. Its LR of 2.8 for "all ten US/PRC today" is too timid
  once the depth behind slot 10 is known. The relevant hypothesis is not "the board is all US/PRC today"
  but "an outsider must climb ~50 Elo past eight deep-pocketed US/PRC organizations".
- **Premortem (68).** It posed rather than hit. Its turnover argument (Mistral fell out of the top ten
  between 2024 and 2026) cuts the other way: turnover has run toward US/PRC concentration. Two of its
  channels are real but small:
  - a non-US/PRC organization's style-tuned fine-tune of a Chinese open-weight base;
  - a Chinese lab re-domiciling to Singapore (the Manus pattern).

**Paths to No (two years ≈ 2-3 Arena generations):**

| Path | P |
|---|---|
| Mistral climbs back | ~0.07 |
| A new sovereign or Gulf, Korean, Japanese or Canadian entrant, or a fine-tune | ~0.07 |
| Re-domicile | ~0.03 |
| Resolver reads the Cayman ultimate parent rather than operating HQ | ~0.02 |

P(No) ≈ 1 − (0.93 × 0.93 × 0.97 × 0.98) ≈ 0.18, which rounds to **78** for Yes. I sit below signals'
84 because the 6th-10th slots sit in an 8-Elo cluster, so composition can move in a single release
cycle.

### Q4: DefiLlama stablecoins on 2028-12-31 ($B)

**Down-weighted:**
- **Outside-view (P50 440).** Its ~22%/yr median ignores that supply has been flat to down for 15 months
  after GENIUS legitimation: ~$308B at end-2025, a ~$322B record in May, ~$290-294B now.

**Kept:**
- **Bayes's** normal-normal drift update, to ~9-11%/yr, giving a P50 of ~355.

**Premortem (real hits, both tails):**
- **Foreign-issuer cliff.** From 18 July 2028 it is "generally unlawful" for US service providers to
  offer a payment stablecoin not from a permitted issuer, and USDT is ~60% of supply. This fattens P10,
  although most migration to USDC/USAT conserves the total. Caveat preserved: "Legal experts disagree on
  the exact timing for foreign issuers."
- **Upside.** GENIUS-licensed bank and fintech issuance from 2027 does not need a crypto bull market.
  That supports a P90 above signals' 540.

**E1 lens:** a 2028 capex bust is risk-off and hits the ~$190B trading-collateral slice. That fattens the
left tail; it does not move the median.

**Answer: 220 / 360 / 640.**

### Q5: Fed numerical yield ceiling or target, ≥1y maturity, before 2031

**Premortem (real hit):**
- "Any Treasury of at least one year" admits a **short-end** target: an RBA-style 2-3-year target at the
  lower bound, which is the form the FOMC actually discussed in 2020. That is an E1-specific path: bust,
  then recession, then the lower bound by 2030.
- P(lower bound by 2030) ≈ 0.15 × P(short-end target | lower bound) ≈ 0.10 ≈ 0.015.

**Down-weighted:**
- **Bayes (3).** It missed that path.
- **Fermi's** model argument: world debt below the 150% trigger. As the premortem says, a world average
  says nothing about the Fed, and the model's repression is a smooth real-rate cap, not an announced
  numeric target.
- **Signals (8).** Slightly high. The Brooks "yield curve management" quote is "one economist's
  interpretation", and Fortune "reports no Warsh statement on YCC and no numeric target".

**Construction:**
- Base: ~2.5-3.7% over the window (0.5-0.9% per issuer-year).
- Short-end path: ~1.5pp, of which only ~0.5-1pp is new relative to that base, which already contains
  crises.
- Treasury-led pressure on the long end, and Warsh's "updated accord" talk: a small uplift.
- Warsh's bill-tilted, smaller balance sheet and the September hike: a small cut.

**Answer: 5.**

### Q6: BLS nonfarm business labor share, CY2030 average

**Start level.** 53.0% (2026Q3 first print, USDL 26-1631, "the lowest level in the series"). It reflects
the 2026 NIPA annual update; the preamble's 52.8% is pre-revision. I down-weight the **outside-view's**
52.6 start for that reason only. Its post-1990 4-year change distribution (P10 / P50 / P90 =
−2.71 / −1.32 / +1.35 pp) is the best anchor in the packet and gives 50.3 / 51.7 / 54.35 from 53.0.

**Premortem:**
- **Real hit on fermi's cyclical +0.3 median.** A 2028-29 bust read through a 2030 *annual average*
  falls in the recovery, when the share has historically fallen with the productivity rebound. So no
  upward median shift. The bust stays as P90 width.
- **Depreciation channel: partial hit.** BLS output is gross, so a wave of short-lived AI capital raises
  the gross capital share. But that holds only to the extent revenue covers the depreciation; otherwise
  net operating surplus absorbs it. The premortem's 0.6-1.0pp is an upper bound. I take ~0.3pp, applied
  mostly to P10.

**Model:** the sim adapter adds nothing. Its sign is negative by construction (`automationIncomeToCapital`).

**Answer: 48.9 / 51.6 / 54.1.** The essay's −6 to −8pp in a decade remains below P10.

### Q7: big-5 Indian IT headcount, Mar 2029 at least 10% below Mar 2026

**Facts:**
- Base 1,530,073 (Mar 2026); threshold 1,377,066.
- Sep 2026: 1,549,471, so the threshold is −11.1% from today in ten quarters.

**Premortem: partial hit on speed.**
- With ~13% voluntary attrition (TCS 12.7%, Wipro 13.8%), a freeze could cut that much in a year.
  Caveat preserved: attrition definitions "cannot be compared directly". This removes "unprecedented
  speed" as a barrier.
- It does not remove the economic constraint: headcount ≈ revenue / revenue per employee. A Yes needs
  RPE growth to beat revenue growth by ~4-4.5pp a year for 2.5 years, against a line that is currently
  rising, with fresher intakes intact.

**Down-weighted:**
- **Outside-view** and **bayes (8).** Both lean on "never in ~22 aggregate windows", which the speed
  point weakens.
- **Fermi's** P(RPE gap | weak revenue) = 0.45, which is generous for a sustained 2.5-year gap.

**E1 lens:** a 2028 US recession lands on discretionary IT budgets just as coding agents mature, so the
conditions are correlated.

**Answer: 13.**

---

## Internal coherence checks

1. **Q1 sums to 100:** 25 + 44 + 28 + 3 = 100. P(R ≥ 2) = 31%.
2. **Q2 ≤ the no-break share of Q1.** A $10B run in 2028 needs the loop intact through 2028 (~0.7 or
   more), a GW-class single run, and Epoch coverage. 21 < 0.70 × 0.30 × 0.5 + 0.04 ≈ 0.145 + headroom
   for lumpiness. It is also below P(C + D) = 31. Consistent.
3. **Q1 against Q6.** The bust mass (A 25) does not shift the Q6 median up, because the 2030 average sits
   in the recovery. It widens P90 to 54.1. The C-world depreciation wave and the AI substitution sit in
   P10. Consistent with a median Δ of −1.4pp, near the post-1990 4-year median of −1.32.
4. **Q1 against Q5.** A bust is disinflationary and lowers the long-end motive, but opens the short-end
   lower-bound path. Q5 = 5 carries ~1pp from that path. P(lower bound by 2030) ≈ 0.15 is below P(A) +
   the bust part of B ≈ 0.35. Consistent.
5. **Q1 against Q7.** A US bust raises Q7, but Q7 also needs sustained RPE gains. Q7 = 13 is well below
   P(break) = 0.35. Consistent.
6. **Q1 against Q4.** The bust risk-off sits only in Q4's P10 (220, below the current ~290). The median
   implies ~10%/yr drift.
7. **Q3 is independent of Q1, by design.** A US-lab shakeout from a bust is refilled by the PRC bench
   (Baidu, ByteDance, Tencent, StepFun are 11th-14th), so I make no Q1-conditioned adjustment.
8. **Shared start levels.** Q6 is measured from 53.0, Q7 from 1,530,073, Q4 from ~$290-294B. No seat's
   stale baseline is mixed in.

---

## Wave audit

**Where Wave 1 disagreed.**
- **Q1.** Regime A ranged from 12 (signals) to 50 (outside-view), and B from 36 to 59 (fermi). The root
  was whether the Big-4 behave like busted single-product sectors (outside-view), cash-rich incumbents
  that self-fund (fermi), or momentum-driven builders (signals).
- **Q3.** 35 (outside-view) against 77 and 84 (fermi, signals). The class was prior against the current
  board.
- **Q7.** 8 against 20 (fermi). The question was whether the identity or the aggregate record governs.
- **Q2.** 22 to 35. Fermi alone priced the Epoch coverage collapse.
- **Q4 P50.** 345 to 440. The outside-view ignored the flat 2026.

**What Wave 2 changed.**
- **Bayes** re-anchored Q6 to the revised 53.0 start and corrected the Q2 deflator sign. It showed that
  almost every Q1 signal sits below 2:1, so momentum and financing strain cannot carry much weight.
- **Premortem**:
  - broke the shared assumption that OCF is exogenous (backlog concentration plus vendor financing);
  - scope-checked C and D against world forecasts;
  - showed the simulation's Q1, Q5 and Q6 "directional facts" restate its closure;
  - added the short-end path to Q5, the July 2028 GENIUS cliff to Q4, the recovery-timing point to Q6,
    and the attrition-speed point to Q7.

**What is still unresolved.**
- **Q1.** The size of the funding-loop break probability (I use 0.35; the premortem uses 0.40, fermi
  0.25). No seat has a reference class for vendor-financed booms run by diversified mega-caps.
- **Q2.** Whether Epoch will cost closed frontier models at all after 2026 (1 of 95). This is a resolver
  question as much as a world question.
- **Resolver issues the signals audit flagged, not fixed:**
  - Q6: the annual average mixes vintages;
  - Q2: 2023 USD against nominal, and the method tie-break;
  - Q3: the domain rename and Cayman parents.
- **Q3.** The official arena.ai board was never read directly; the mirror is the only source.

**My single largest update and its cause.** **Q3**, from the effort's prior of 35 (outside-view, and
67 after bayes) to **78**. The cause is that the resolving quantity is observable at origin and its
margin is deep. My spot-check found the first 18 distinct organizations US/PRC, with the nearest
outsider (Mistral) 19th and ~48 Elo below slot 10. That refutes the ~1481.8 aggregator figure the
signals seat had flagged as inconsistent. An observation of the resolver with that much buffer outweighs
a cross-domain concentration base rate.

---

```json
{"q1": {"A": 25, "B": 44, "C": 28, "D": 3},
 "q2": 21, "q3": 78,
 "q4": {"p10": 220, "p50": 360, "p90": 640},
 "q5": 5,
 "q6": {"p10": 48.9, "p50": 51.6, "p90": 54.1},
 "q7": 13}
```
