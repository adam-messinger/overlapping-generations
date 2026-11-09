# Seat E1-premortem (trade-chokepoints, red team)

**BLUF.** Wave 1 banked a two-year AI-capex head start and then drew the other eighteen years from a "0.9-1.0 regime" that the WTO's annual figures do not show once the 2011 rebound and the 2025 AI year are removed: I put E at 0.84 with 32% below 0.75, and Q1 at 13. On the other eight questions the attack widens tails more than it moves medians.

## Reasoning (premortem lens)

**The shared assumption (C1).** All three seats ran one sum: 2026-27 are banked at 3.9% and 4.1%, so E < 0.75 "needs" about 0.67 for eighteen years, a tail against "2011-25 ≈1.0, 2018-25 ≈0.8".

1. *The benchmark is its endpoints.* WTO Chart 3 ([GTO April 2024](https://www.wto.org/english/res_e/booksp_e/trade_outlook24_e.pdf), read directly): trade 3.2, 0.4, -5.0, 9.6, 3.0, -1.2 against GDP 3.3, 2.6, -3.1, 6.2, 3.1, 2.7 for 2018-23. Adding 2024 (2.9/2.8, search summary) the compound ratio is 1.76/2.48 = 0.71 for 2018-24 and 0.65 for 2019-24 (my arithmetic; short windows with a pandemic inside), and about 0.84 for 2012-24 (2012-17 recalled). The "needed" 0.67 is what the tariff era delivered.
2. *The head start is one product cycle.* AI-enabling goods were "47% of global merchandise trade growth in the first half of 2026" (value terms), and 2027 rests on capex rising "a further 10-20%" ([WTO](https://www.wto.org/english/news_e/news26_e/stat_08oct26_510_e.htm)). The head start is 4.2 log points above a 0.67 path; a 30% fall in a 14.8% value share removes 4.4. In 2001 office and telecom exports fell "nearly 14%" and world trade volume fell ([WTO PR316](https://www.wto.org/english/news_e/pres02_e/pr316_e.htm), search summary). Hyperscaler guidance is still rising (secondary press), so the give-back is a 2028-30 risk.
3. *Drag/pull asymmetry.* The seats priced tariffs and Hormuz and missed the megatrends' own sign: ageing moves demand to government (import content 11.9% against investment's 35.5%; Auboin and Borino 2022, same report), electrification swaps a recurring fuel cargo for a one-off capital good, robots erase the wage gap behind offshoring, and AI raises the denominator through untraded services.

**Both tails.** Local-for-local with falling fuel volumes, E 0.50-0.68: 20%. Tariff-era norm, 0.68-0.86: 33%. Regime near 0.9: 32%. Investment-led decade (AI, grids, defence), 1.05-1.4: 15%; fermi's 1.18 ceiling is too tight.

**Q1.** The errata's broad aggregate starts the composite near 38%, not fermi's 33%. Low-E worlds split: dematerialisation lifts digital services while electrification cuts fuels (P(ii) 0.5); an AI give-back cuts the goods leg (0.25). 0.32 x 0.41 = 13.

**Simulation closure.** Fermi's "adapter direction agrees" (C2) is circular: the model's safe rate is an HLW rule by construction. Its growth is no tail to borrow: all ten runs (2.64-3.98% per capita) exceed the realised 2.48-2.58%, because the model has no trade block, no recession, and population falling 0.317% a year against 0.089% under UN Medium. Its 2026 damage (1.16% of GDP) is about five times observed catastrophe losses and has no budget line. Stripped, P(g >= 2.5%) is 21%, not 30%.

**C2/Q2.** Three seats, three 8s. R >= 2 needs the US near 2.6 with the euro area at 1; an AI boom alone gives about 1.7. Down-world: a post-bust recession drags the filter, as in 2008-10 (recalled). Q2 11.

**C3/Q4.** Extrapolation ignores two ratchets: recessions add 10-20 points; the 2021-23 inflation removed about 14 (recalled). 110/135/163. Four G7 debts can pass 140% by 2040, so the gate does not bind; a stated number does. 1940s war finance (US, UK; memory) contradicts "never three at once". Q4 4.

**Q3.** Catastrophe losses are the wrong base: outlays (i)-(iv) are about 0.4% of G7 GDP now (my estimate), and the errata's gross-level reading reverses fermi's cut. 7.

**C4/Q6.** Low world: China at 2%, an ICP rebasing trimming its weight. 1.55/2.15/2.85. C: the ESM route is excluded, but a coerced Treasury term-out would count (my reading). A 19, B 70, C 11.

**Q5.** Japan lost two-thirds of its share in 1995-2015 (memory), so the EU "never" is small-sample; the first leg still needs a 20% joint dollar-renminbi appreciation. 5.

**Coherence.** Q1 13 <= 32; Q2 11 with C2 P90 2.05; A 19 <= 21.

```json
{"c1": {"p10": 0.59, "p50": 0.84, "p90": 1.17},
 "q1": 13,
 "c2": {"p10": -0.1, "p50": 0.9, "p90": 2.05},
 "q2": 11,
 "c3": {"p10": 110, "p50": 135, "p90": 163},
 "q3": 7,
 "q4": 4,
 "c4": {"p10": 1.55, "p50": 2.15, "p90": 2.85},
 "q5": 5,
 "q6": {"A": 19, "B": 70, "C": 11}}
```
