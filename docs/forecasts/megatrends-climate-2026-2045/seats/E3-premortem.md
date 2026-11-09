# E3-premortem (sovereign-debt-fiscal, lens: premortem)

**BLUF.** Wave 1 priced the debt stock and its financing regime as separable: debt drifts to 132-138% while r*, central-bank practice and sovereign credit keep post-1980 base rates. That calm drift is one branch in four, so I hold the centre near 140%, fatten the upper tail to 176%, put the regime-break questions above every Wave-1 seat (Q3 10, Q4 6) and r* below them.

## Reasoning (premortem only)

**Shared assumption: separability.** Nobody asked who holds a US debt of 170%+, at what price. (1) Stale slopes: outside-view and signals extended 110.1→115.2 (0.85 points a year) to 127, then lifted; fermi gave the US +1.8 a year. Inside the October 2026 vintage (errata) the group rises 1.7 a year over 2027-31 and the US 4.0-4.3: 139 unlifted, the US near 200%. (2) Missed precursors: Fed Chair Warsh backs a new Treasury-Fed accord; Tim Duy: "it could look more like a framework for yield-curve control"; caveat: "Neither Warsh nor Treasury Secretary Scott Bessent has detailed what they may consider" (Bloomberg, 9 Feb 2026, https://www.nationalmortgagenews.com/articles/warsh-call-for-fed-treasury-accord-stirs-debate-in-30-trillion-bond-market). Japan's 10-year hit "an intraday high of 3.115% on September25" (https://mufgresearch.com/rates/japan-economic-financial-weekly-19-october-2026/; no cap mentioned).

**Four branches.** Calm drift, partial consolidation: 45%, group debt ~142. Fiscal dominance, caps plus 4-5% inflation: 17%, ~130 (repression erodes the ratio, so Q4-Yes worlds are not C3-high worlds). Snowball, r above g, no adjustment: 20%, ~170. AI growth escape: 18%, ~118. **C3** = 116 / 140 / 176. Unraised composition trap: weights are nominal GDP, so a rising US share lifts the group with no ratio moving.

**Tails.** High: war or pandemic on the snowball, 185+. Low: 1946-51 again, or the AI boom; inflation took the group from about 122% (2020) to 107.4% (2024).

**Simulation closure.** Fermi took "positive in nine of ten runs, order ten pp" as corroboration. Those runs assume a 3% structural deficit, a sovereign tightening 0.03 points per point of debt above 60% (`capital.ts` defaults) and a safe rate of 0.9-1.5% against growth of 2.6-4.7%; the US at 124% runs a primary deficit near 4.7% (fermi's chart read). The run with a 6% deficit and weak reaction gives +74pp: run counts are scenario design, and +10 is a floor. "Tenths" on the safe rate restates a 3.5bp coefficient with no term premium. The flat US+China share is the regional allocator (US 2.90%, China 2.83%), not proof that exchange rates do all the work.

**Q4.** In fiscal dominance Japan 0.8, US 0.6; the third country needs an ECB number with Italy above 140% (0.3; one act can also count France) or Britain reaching 140%. P(≥3 | branch) ≈ 0.30: 0.17 × 0.30 + 0.01 = **6**.

**Q3.** The errata's gross reading deletes fermi's 0.8 attribution discount and adds existing outlays. CBO: flood damage $55B a year, Disaster Relief Fund spending about $16.5B a year since 2005 (search summary; https://www.cbo.gov/publication/62839 returned 403), so FEMA's $57.9B appropriation overstates the run-rate. Gross today ≈0.3% of G7 GDP (my estimate). 2040-45 median 0.85 if the resolver counts macro revenue losses (weight 0.4), 0.65 if not; lognormal σ 0.55 gives 15% and 6%: **10**.

**C2/Q2.** HLW is trend growth plus a residual. The composite fell from 2.75 to 0.93 while group debt rose from about 70% to 108%, and shrinking labour forces cut trend growth; Wave 1's drift up to 1.0-1.1 is narrative pull. Median 0.85; 2.0 needs the US near 3.0 with the euro area at 0.3 (AI branch only): **9**.

**C4/Q6.** 2.35; the second decade carries the AI tail: P(g≥2.5) 32%, A = 0.32 × 0.92 = 29. C counts only 2036-45 and not ESM-only rescues: Italy 4, France 2.5, US debt-ceiling default 2.5, UK 2, Japan 1, stagflation limb 2: **13**.

**C1/Q1.** Fermi's P90 (1.12) fails if the hardware cycle (1.45 in 2026-27) lasts a decade; outside-view's median (1.12) fails as fuels trade shrinks. 0.60 / 0.91 / 1.28; P(E<0.75) 25% × 0.52 = **13**.

**Q5.** Shares sum to 100: with India rising, US+China above 50 nearly forces the EU leg. Needs a dollar-and-renminbi upswing plus a euro crisis: **5**.

```json
{"c1": {"p10": 0.60, "p50": 0.91, "p90": 1.28},
 "q1": 13,
 "c2": {"p10": 0.0, "p50": 0.85, "p90": 1.95},
 "q2": 9,
 "c3": {"p10": 116, "p50": 140, "p90": 176},
 "q3": 10,
 "q4": 6,
 "c4": {"p10": 1.6, "p50": 2.35, "p90": 3.15},
 "q5": 5,
 "q6": {"A": 29, "B": 58, "C": 13}}
```
