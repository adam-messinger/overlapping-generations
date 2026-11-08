# E3 (dollar-monetary) / calibrator (A6, Wave 3): effort-level posterior

**BLUF.** E3's posterior gives the essay's monetary leg little support over the forecast window. Stablecoins are most likely around $385B at end-2028 (P10 $220B, P90 $760B): growth, but not "near-unlimited". A numerical Fed yield cap before 2031 gets **4%**. The premortem moved E3 on three things. It showed the Wave-1 seats priced each question as a separate draw around one rate snapshot, when one latent rate path drives Q1/Q4/Q5/Q6/Q7 together. It showed the effort's only US yield-cap conditional (June 2020) and the reference class's own exits (RBA, BoJ) point down. It showed the simulation readings carry a likelihood ratio of 1. The effort's single largest update is Q3, from outside-view's 45 to 78. Its cause is the depth of the US/PRC cushion on LMArena's own published board, not any new argument about geopolitics.

Forecast origin 2026-11-08. I did no new research: every fact below comes from the five E3 seats (`seats/E3-wave2-packet.md`), with their caveats carried forward. URLs are the seats' own.

Seat shorthand: **OV** outside-view (A1), **FE** fermi (A2), **SI** signals (A3), **BA** bayes (A4), **PM** premortem (A5).

| Seat | Q1 A/B/C/D | Q2 | Q3 | Q4 P10/P50/P90 | Q5 | Q6 P10/P50/P90 | Q7 |
|---|---|---|---|---|---|---|---|
| OV | 50/37/11/2 | 35 | 45 | 235/410/740 | 6 | 50.1/52.4/54.2 | 8 |
| FE | 22/46/28/4 | 17 | 86 | 225/390/680 | 7 | 49.6/52.0/54.6 | 15 |
| SI | 20/38/34/8 | 16 | 83 | 235/370/720 | 6 | 49.3/51.6/54.0 | 11 |
| BA | 43/42/14/1 | 26 | 62 | 220/388/685 | 5 | 50.3/52.6/54.5 | 8 |
| PM | 32/41/24/3 | 18 | 78 | 215/365/820 | 4 | 49.7/52.5/55.0 | 14 |
| **Calibrator** | **30/43/24/3** | **21** | **78** | **220/385/760** | **4** | **49.8/52.3/54.8** | **11** |

---

## Per-question weighting

### Q5: numerical Fed yield ceiling or target on a Treasury of 1 year or longer before 2031 (centre of gravity): **4**

**Weighted up: PM, then BA.**
- **PM landed a real hit on FE's path table.** FE's path 3 (ELB, then RBA-style YCC on 2-3y tenors) carried a conditional of 0.15. The one US observation of that exact state contradicts it. In June 2020 the US had the ELB, debt above 100% of GDP, an acute crisis and a staff briefing on yield caps, and produced no cap. The minutes say "nearly all participants indicated that they had many questions regarding the costs and benefits"; only "a couple" favoured a cap ([FOMC minutes, June 2020](https://www.federalreserve.gov/monetarypolicy/fomcminutes20200610.htm)). That minority is the honest size of the conditional, so ~0.08 rather than 0.15.
- **PM landed a second real hit on OV's class rate.** The class's two post-war starts both repudiated the tool afterwards. The RBA board "views the probability of using a yield target again in future as low" ([RBA review, 2022](https://www.rba.gov.au/monetary-policy/reviews/yield-target/)); the BoJ exited in March 2024 after forced band-widenings. A class that is learning against the tool justifies a forward rate at or below the historical ~0.5-0.9% per issuer-year, not above it.
- **BA's merged-signal discipline was right.** It folded the hiking Fed, the two hawkish dissents at the Oct 28 hold and Warsh's "reverse operation twist" ([ABN AMRO](https://www.abnamro.com/research/en/our-research/kevin-warshs-reverse-operation-twist)) into one LR of 0.6. It folded the fiscal pressure (net interest above $1T, the 10y at 5.31-5.34%, "highest level since 2002") into one LR of 1.5. It did not multiply four correlated hawkish signals down to ~3%.

**Down-weighted: FE's Q5 reasoning.** FE took the model's "~3-4%" and adjusted *up* to 7. PM is right that this anchors on a reading whose LR is exactly 1: the adapter says "NO MONETARY BLOCK", and its repression is an unannounced real-rate cap, which Q5 excludes by construction. The model's "no" is true in every world, so it carries no information.

**Merely posed (no move): PM's "stablecoin bill demand substitutes for a cap".** The sign is plausible, but ~$300B of tokens against a ~$30T market is too small to move a 4-year probability. Separately, PM's point about the Democratic Congress (2026-11-03) and the SCOTUS for-cause ruling (a stay-stage ruling; the merits remain open) closes the essay's *specific* route, Congress changing the mandate. The Fed needs no statute to announce a yield target, so the effect on Q5 is small (LR ~0.9, as BA priced it).

**What keeps it off 2-3.** The window holds a plausible bust-to-ELB world (PM's W2, ~0.30) and a bond-stress world (W3, ~0.15). The ELB is the only setting in which post-war yield targets have started. Warsh's chair term ends ~May 2030, which opens a short window for a new chair under the president inaugurated in January 2029. The resulting path sum is PM's ~4.2%.

### Q4: DefiLlama total stablecoin market cap, 2028-12-31 (centre of gravity): **P10 220 / P50 385 / P90 760 ($B)**

**Weighted up: BA on the rate headwind, PM on the tails and the resolver.**
- **BA's discount of the rate headwind (LR 1.35, "weakly justified") is the best-argued step in the packet.** In 2024-25 supply grew ~+50%/yr with fed funds at 4.25-5.5%. The 2022-23 fall coincided with Terra and FTX, not just with hikes. SI's "a non-yielding token competes with 5%-yielding bills" is a real headwind on the savings use only.
- **PM landed a real hit on herding.** The three Wave-1 P50s (370/390/410) and P90s (680-740) share one driver, the 2026 stall, so their agreement counts one observation three times. The upper edge was set by the snapshot, not by the reference class.
- **PM landed a second real hit on the correlated rate path.** The likeliest way the snapshot breaks is an AI-capex bust that leads to cuts. That world first hits crypto, then lowers the opportunity cost of a zero-yield dollar; in 2020-21, near zero rates, supply rose ~6x in two years. Both tails are therefore fatter than seats centred on the snapshot priced them.
- **PM's resolver note (small but real).** DefiLlama counts BUIDL ($1.76B) and YLDS ($0.47B) as fiat-backed stablecoins ([stablecoins endpoint](https://stablecoins.llama.fi/stablecoins)). Some yield-seeking substitution therefore stays *inside* the resolver.

**My own check on the median: the halving-cycle analogue,** at the same phase as FE's C1 component.
- 2018 bear, 2019 flat, 2020 boom (May-2020 halving).
- 2022 bear, 2023 flat, 2024 +56% (Apr-2024 halving).
- Read across: 2026 is a bear (BTC "down nearly 40% for the year", secondary sources), 2027 is flat at -10% to +10%, and 2028 rises +30-55% after the ~Apr-2028 halving.
- From $294.1B (API, 2026-11-08; [stablecoincharts/all](https://stablecoins.llama.fi/stablecoincharts/all)), that path gives ~$380-460B. The n=3 cycle record is contested (BA flagged it as weak).
- Two drags pull the median to the lower part of that range:
  - The GENIUS foreign-issuer deadline of **18 Jul 2028** falls inside the window. USDT is ~60% of supply. BA confirmed the date against law-firm summaries; the caveat is that foreign issuers can register under "comparable regimes", and legal experts disagree on the runway.
  - The steepest weekly outflow of 2026 was the week to Nov 7: -$4.99B on DefiLlama against Sentora's -$6.02B, *"because the two trackers measure supply differently"*.

**Tails.**
- **P10 220.** A 2022-23-style -30 to -34% peak-to-trough from the $317B May-2026 peak lands at ~$210-220B. PM puts ~12% on at most $220B; I take ~10%.
- **P90 760.** About +60%/yr, which needs cheaper money plus a regulated take-off plus a halving bull market.

**Down-weighted: PM's P90 of 820.** PM itself calls its high tail "merely posed": it rests on several things going right at once. Its own price of ~11% for at least $800B puts the P90 near $780-800B, and I shade below that.

**Ignored: the published forecasts** (StanChart $2T, Bessent's "$2T", JPM $500-600B). All of them *predate the 2026 stall* (BA, LR 1).

**Unresolved level noise (±1.5%).** The seats disagree on which way the API total and the dashboard headline differ. I leave it in the tails.

The essay's "near-unlimited" (~$1T+ by 2028) sits beyond my P90, at ~5%.

### Q1: Big-4 cash capex, R = CY2030 / CY2026: **A 30 / B 43 / C 24 / D 3**

**Down-weighted: OV's A 50 and FE's model corroboration.**
- **OV's class is weak for this case.** Its levels come partly from memory (n~7), and its members are single-commodity manufacturers and carriers. Big-4 capex sits on firms with large non-AI cloud and maintenance bases. PM made this point, and Q1 is also E1's ground, not E3's.
- **PM landed a real hit on FE's model reading.** FE's "corroboration that the fundamentals-led pace sits in B" is circular: the model's DC capex is braked by `dataCenterPowerSpendCeiling`, and with no expectations block the model cannot bust. Its LR is 1 in both tails.

**Down-weighted: SI's D 8.** D needs cash capex of at least ~$2.66T, roughly the four firms' entire 2030 revenue (PM's point). FE's physical check, ~55 GW/yr against turbine and transformer backlogs, bounds it further. BA's discount of that check is fair: $/GW inflation raises nominal spend without adding GW. Even so, D stays at ~3.

**Weighted up: BA's signal-1 defence and FE's denominator arithmetic.**
- All four firms guide 2027 up. The third-party 2027 consensus is ~$935B on the headline, but SI's caveat applies: *"consensus forecasts, not company guidance"*.
- For A, 2030 must fall more than ~20-23% below a 2027 peak. Telecom-style busts did that, but a guided-up 2027 is evidence against A (LR ~2.25:1).
- FE's cash-line denominator (~$665B, range ~$630-700B, not filing-verified) lowers the C threshold to ~$1.33T: ~19%/yr from 2026, or ~+16%/yr after a +28% 2027.

**PM's A case, half a hit.** "1999-2000" is one analogy, but the stress telemetry is real: Amazon trailing FCF -$42.4B, Alphabet -10% on a capex guide, the VIX +48% intraday on Nov 5, and Microsoft trimming CY26 to $170B. The off-balance-sheet shift (SPVs, JVs, leases) biases the *locked cash line* down even without a bust.

I land A 30 rather than BA's 43 because BA's prior is OV's manufacturing class. I land A above FE and SI's 20-22 because the W2 bust world (~0.30) maps mostly to A.

### Q2: an Epoch headline training cost of at least $10B, model published by 2028-12-31: **21**

**Down-weighted: OV's 35.** Its 0.7 coverage factor was assumed. SI and FE then measured coverage from Epoch's own CSV ([notable_ai_models.csv](https://epoch.ai/data/notable_ai_models.csv)): 8 of 109 models dated 2025 and 1 of 95 dated 2026 carry a headline cost. The largest run, GPT-6 Astra (9.4e26 FLOP, confidence *"Likely"*), has none.

**Weighted up: FE's FLOP decomposition and BA's arithmetic correction.**
- **FE's FLOP decomposition.** The bar is ~3.2e28 FLOP, ~34x Astra. At 4.5x/yr that gives P ~0.25. The power check is feasible: ~1.2-1.5 GW.
- **BA's arithmetic correction.** SI's "4.1x/yr" mixed a Jul-2025 level with a Sep-2026 clock. The consistent requirement is ~2.5x/yr from Grok 4 ($388M, Jul 2025), or ~2.9-3.2x/yr from Astra's implied $0.6-0.8B. That sits *between* Epoch's 2.4x and 3.5x trends.
- FE's clock (trained by ~mid-2028) is slightly conservative, because a model released in Dec 2028 counts. So P(run exists and is released) is ~0.30.

**Coverage factor ~0.6.** PM's point holds: the largest-ever run tends to get an Epoch data insight, as Grok 4 did.

**Resolver.** I add ~3pp for a resolver reading the `upfront` column, which already shows $10.7B for Grok 4. SI's audit is the most important resolution flag in the packet and should be fixed by naming `Training compute cost (2023 USD)`. The column is in 2023 USD while the question asks for nominal, a ~10-15% gap that is a minor effect.

Total: 0.30 × 0.6 + 0.03 = ~0.21.

### Q3: LMArena top ten all US/PRC on 2028-12-31: **78**

**Down-weighted: OV (45) and BA (62).**
- **PM landed a real hit on OV.** OV's Lindy estimate is scope-insensitive. A No needs a non-US/PRC lab to pass ten US/PRC organisations, not one.
- **BA's 62 is prior-dominated,** as BA itself says ("the prior choice dominates the posterior"). That prior is OV's 15% wide class (aerospace, nuclear, semis, search), which is weakly relevant when the question's own board is observable.

**Weighted up: the publisher's dataset, read by FE and confirmed by OV.**
- In the 2026-11-06 `text_style_control` snapshot ([HF dataset](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset)), 20 US/PRC organisations stand ahead of the first outsider: Mistral at #20, ~48 points below the 10th organisation.
- CIs run about ±5-9 points.
- SI's mirror (unverified against the primary) finds no outsider among the top 60 models.

**Not at FE's 86: PM is right that FE's three failure paths are not independent.** Churn, a sovereign entrant, and the label/tie/redomicile paths are correlated. OV's history shows the condition held in only 18 of 85 snapshots in 2025, and Mistral was in the top 10 as recently as Feb 2026, so two years is a long time on this board.

**Resolver risks.** lmarena.ai now 301-redirects to arena.ai; I treat that as a rebrand, i.e. a successor. Others: the five-way tie at 1475 at the 10th boundary, blank or anonymous labels, and parent mapping ("SpaceXAI"). These are a small additional No path.

### Q6: BLS nonfarm business labor share, 2030 annual average: **P10 49.8 / P50 52.3 / P90 54.8 (%)**

**Down-weighted: OV (stale start) and SI (recency).**
- **PM and BA both landed a hit on OV's start.** It scales to the pre-revision 52.8. The 2026-11-05 release prints 2026Q3 at **53.0%**, *"the lowest level in the series"*, with Q2 *"first reported at 52.9%, was revised to 53.3%"* ([Indeed Hiring Lab](https://hiringlab.indeed.com/2026/11/05/q3-2026-productivity-and-costs/), [BLS release](https://www.bls.gov/news.release/archives/prod2_11052026.htm)).
- **SI's P50 of 51.6 extrapolates a six-quarter slope.** Part of that slope is an inflation squeeze (Q2 real hourly compensation -1.9% annualised) that tends to reverse.

**FE's AI component (-0.6pp) is kept as judgment, not as model output.** PM's point stands: the model's baseline -0.11pp is the default-off AI-payoff parameter, so choosing among the runs *is* the question.

**Construction.**
- Start 53.0.
- The historical median 4-year change is -0.46 (OV, n=75 overlapping windows).
- Mean reversion from series lows runs about +0.85 (n=21, heavily overlapping).
- The AI and productivity tilt is negative: Q3 productivity +3.6% annualised, with the revision caveat *"differed from the first by -1.1 to +1.4 percentage points about 80% of the time"*.
- Net about -0.7, so the P50 is 52.3.

**Tails.**
- The P90 at +1.8 carries PM's W2 case: a 2029-30 recession (2001 +1.8, 2020 +2.4).
- The P10 at -3.2 carries the essay's path (~50.3 by 2030, per FE) plus vintage noise. The BLS API publishes only the index, so the percent comes from release text.

### Q7: Indian IT big-5 headcount at 31 Mar 2029 at least 10% below 31 Mar 2026: **11**

**Weighted up: OV's aggregate history and PM's attrition mechanism, as a partial hit.**
- **OV's aggregate history.** The aggregate has had zero 3-year falls of 10% or more in ~25 years. The deepest was ~-4-5% over Mar 2023 to Mar 2026, a period that already contained weak demand and early GenAI.
- **PM's attrition mechanism.** ~12-14% attrition (PM's recollection, not re-sourced) means ~200k exits a year, and a coordinated backfill freeze would deliver the -10%. The mechanism is real, so I move off 8. But the five firms had freezes in 2023-24 and kept hiring freshers. Freshers were still 60-65% of net hiring in H1 FY27 (SI), and attrition falls in downturns. So I do not go to PM's 14.

**Down-weighted: FE's 15.** Its 6.5pp 3-year σ is inflated by the FY22 post-COVID boom year, an upside observation.

**Telemetry and threshold.** H1 FY27 was **+16,055** ([Angel One](https://www.angelone.in/news/stocks/indian-it-stocks-in-focus-top-five-firms-add-16-055-employees-in-h1fy27-but-demand-recovery-remains-uncertain); a conflicting source implies +19,398). The threshold of ~1.380M is ~-10.9% from 30 Sep 2026's 1,549,471 in 2.5 years.

**Coherent decomposition.** P(Yes | W2 bust and US recession) ~0.25 × 0.30, plus P(Yes | otherwise) ~0.06 × 0.70, is ~0.117.

Resolver: the acquisition clause is truncated (SI). Acquired staff add to the count, which cuts slightly against Yes.

---

## Where the premortem landed and where it posed

| PM claim | Verdict | Effect on my numbers |
|---|---|---|
| Wave-1 froze the Nov-2026 rate regime and treated the questions as independent | **Real hit** | Q4 tails widened; Q1 A, Q6 P90 and Q7 tied to one W2 weight (0.30) |
| June 2020 minutes contradict FE's ELB-YCC conditional | **Real hit** (data, not story) | Q5 7 -> 4 |
| RBA and BoJ repudiated the tool; the class is learning against it | **Real hit** | Q5 below OV's 6 |
| Model readings on Q1/Q5/Q6 carry LR = 1 | **Real hit** | Model given zero weight everywhere |
| OV's Q6 start is stale; OV's Q3 is scope-insensitive | **Real hits** | Q6 start 53.0; Q3 to 78 |
| BUIDL/YLDS counted inside the resolver | Real, small | Weakens the rate-headwind argument slightly |
| Attrition makes a 10% fall a management choice | Partial | Q7 8 -> 11, not 14 |
| "1999-2000 configuration" | Posed (one analogy), though the stress telemetry under it is real | Q1 A 30, not higher |
| Q4 P90 820 | Posed (PM's own admission) | P90 760 |
| Stablecoin bill demand substitutes for a cap | Posed (sign plausible, size immaterial) | None |
| Democratic Congress and the SCOTUS ruling close the routes | Posed for Q5 (the Fed needs no statute); real for the essay's specific route | LR ~0.9 at most |

## Internal-coherence checks

1. **Q1 ↔ Q2.** P(Q2 | A) ~0.08, P(Q2 | B) ~0.20, P(Q2 | C) ~0.35, P(Q2 | D) ~0.50. Weighted: 0.30×0.08 + 0.43×0.20 + 0.24×0.35 + 0.03×0.50 = **0.21**, matching Q2 = 21. As BA notes, Q2 does not strictly need C/D, because lab and Stargate money is outside Q1.
2. **One latent W2 weight (bust, recession, cuts, ~0.30) across questions.**
   - Q1: A = 30, mostly W2, plus the lease shift without a bust.
   - Q7: the W2 branch supplies ~0.075 of its 0.117.
   - Q6: the P90 (+1.8) is a 2029-30 recession year.
   - Q4: W2 feeds both tails, with a crypto crash first and cheap money later.
   - Q5: W2's ELB branch is its largest path (~1.6pp).
   - No answer assumes W2 at a materially different weight.
3. **Q4 ↔ Q5.** A yield cap is a debasement regime and would lift stablecoins. At Q5 = 4%, that joint tail sits inside Q4's P90. Conversely, a Q4 boom does not raise Q5, because captive bill demand is a mild substitute for a cap.
4. **Q6 ↔ Q7.** Both load on AI substituting labour. The Q6 P50 is -0.7 from the start and Q7 is 11%. In the essay world both move together: Q6 toward ~50 (my ~P15) and Q7 toward ~30%. The joint essay-world mass is ~4-5%, consistent with Q4's ~5% for $1T+, the essay's monetary leg.
5. **Q1 D ↔ the physical and revenue bounds.** D = 3 is consistent with D requiring ~4 firms' entire 2030 revenue in cash capex.
6. **Format.** Q1 sums to 100. Binaries are integers in 1-99. P10 < P50 < P90 holds for Q4 and Q6.

## Wave audit

**Where Wave 1 disagreed.**
- **Q3 was the largest gap:** OV 45 against FE 86 and SI 83. It was a reference-class dispute (the wide industry class against the board's own record), not a dispute about evidence.
- **Q1 A:** OV 50 against FE and SI at 20-22.
- **Q2:** OV 35 against FE and SI at 16-17, because OV assumed coverage the CSV refutes.
- **Q6 start level:** OV's stale 52.6 against 53.0-53.1.
- **Q7:** 8 against 15.
- **Q4 and Q5 agreed tightly.** PM showed that this was herding on one observation (the 2026 stall and the hiking Fed), not independent confirmation.

**What Wave 2 changed.**
- **BA:**
  - lifted Q3 to 62 on the depth of the cushion;
  - corrected SI's Q2 growth-rate arithmetic;
  - confirmed the 18 Jul 2028 GENIUS foreign-issuer date;
  - moved Q6 +0.4 for the revision;
  - discounted the rate headwind on Q4 using 2024-25.
- **PM:**
  - exposed the frozen-regime and independence assumption;
  - supplied the June 2020 and RBA evidence against yield caps;
  - zeroed the model's LR on Q1, Q5 and Q6;
  - widened Q4;
  - flagged BUIDL inside the resolver;
  - gave Q7 a mechanism for a fast fall.

**Still unresolved.**
1. **Q2 resolver column.** 2023 USD versus nominal, and the `upfront` $10.7B trap; the orchestrator should name the column.
2. **Q4 API versus dashboard,** a ±1.5% gap whose sign the seats dispute. The value should be archived on the day.
3. **Q7 baseline.** The 31 Mar 2026 sum conflicts (+16,055 versus +19,398 for H1), and the acquisition clause is truncated.
4. **Q6 baseline.** The preamble's 52.8 versus the first print 52.9 and the revision 53.3. Percent-level publication: only the index is in the API.
5. **Q1 cash-line denominator** (~$665B) has not been checked against filings.
6. **The direction of the 2027-29 rate cycle,** the common factor no seat can observe yet.
7. **Q3 reference-class choice.** I side with the board's own record; BA's prior-sensitivity note shows the spread is real.

**Single largest update.** **Q3: 45 (the effort's outside-view prior) to 78, +33pp.** The cause is the depth of the cushion: 20 US/PRC organisations ahead of the first outsider, ~48 rating points clear, read from LMArena's own published dataset. Behind it is PM's scope-insensitivity critique of OV's Lindy and wide-class blend. Within E3's centre of gravity, the largest move is Q5 from FE's 7 to 4, caused by the June 2020 FOMC minutes and the RBA's 2022 review.

```json
{"q1": {"A": 30, "B": 43, "C": 24, "D": 3},
 "q2": 21, "q3": 78,
 "q4": {"p10": 220, "p50": 385, "p90": 760},
 "q5": 4,
 "q6": {"p10": 49.8, "p50": 52.3, "p90": 54.8},
 "q7": 11}
```
