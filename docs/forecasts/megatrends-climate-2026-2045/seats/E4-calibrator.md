# Seat E4-calibrator (effort E4 gdp-divergence, Wave 3 posterior)

**BLUF.** The effort's posterior is continuity on a slightly faster growth path than Wave 1 gave: OECD + China per-capita growth of 2.15% a year (1.45 to 2.85), regime B at 67 with A 21 and C 12, and Q5 at 3%. The premortem landed two real hits (the outside view's China path against an official-series resolver; one IMF slope counted three times) and I moved on both; its shift of regime mass toward A I took only in part.

## Reasoning

No web lookups: the seats differ on method, not on a fact a page could settle. Arithmetic is mine, on the packet's inputs.

**C4.** Fermi's build is the packet's best argument (OECD $76.5T at 1.2% per head, China $35.3T at 2.9%, population 2,809M to 2,716M: 2.03%). Two corrections. The premortem's check holds: on those populations the outside view's 1.8% needs Chinese GDP growth of 2.19% for twenty years, against an IMF path of 4.5, 4.0, 4.0, 3.7, 3.3, 3.3 for 2026-31 (https://www.imf.org/external/datamapper/NGDP_RPCH@WEO) and a resolver that reads the official series. And fermi itemised drags while giving AI a static +0.3. China at 3.2% with the OECD at 1.3% gives 2.21%; at 3.0%, 2.13%. Median 2.15. Pessimistic components (2.0%, 0.9%) give 1.51 and optimistic ones (4.2%, 1.9%) 2.97, hence 1.45 and 2.85.

**Q6.** China at 3.8% then 2.6%, OECD 1.3%, gives 2.34% for 2026-35 and 2.07% for 2036-45. I centre g at 2.0 with sigma 0.68: P(g >= 2.5%) = 23, P(g < 1.0%) = 7. Credit-event limb 10 (Italy 3.5, France 2.5, a missed US payment 2.5, UK 1.5, Japan 1, less overlap; the errata excludes ESM-only rescues); stagflation limb 2.5; C = 12. A = 23 x 0.93 = 21. B = 67.

**Q5.** IMF `NGDPD` (https://www.imf.org/external/datamapper/NGDPD@WEO) has US + China at 42.6% (2021), 42.3% (2026), 42.4% (2031). At constant prices and exchange rates the sum falls to about 40% by 2045 (US 1.9%, China 3.2%, world 2.7%), so prices and currencies must supply about ten points: leg one 8%. Given leg one, a pro-rata squeeze of the IMF's EU slope leaves about 12%: leg two 0.4. Q5 = 3.

**C1, Q1.** The outside view's 1.15 leans on liberalisation eras; fermi's 0.86 rests on assumed volume indices. The post-2008 ratio of 0.96 (the outside-view seat's arithmetic on recalled rates; not published) and eighteen years at 0.90 after the WTO's 1.45x start both give 0.96. Median 0.97, P(E < 0.75) = 19%; composite above 42% given that, 0.53 (mild positive correlation assumed); Q1 = 10.

**C2, Q2.** US 1.3, euro area 0.4, Canada 1.6 give 1.01; no seat argued above 1.03, and HLW has not followed yields. A 25% chance of the realised-rate fallback widens both tails: 0.10 / 0.97 / 1.90. Q2 = 0.75 x 5 + 0.25 x 12 = 7.

**C3.** The Wave-1 medians are the IMF slope (108.2 + 20 x 7.0/6 = 131.5). A policies-unchanged path is not a median, and the IMF says "realized debt-to-GDP ratios five-years ahead can be 10 percentage points of GDP higher than projected on average" (https://www.imf.org/en/Blogs/Articles/2024/10/15/global-public-debt-is-probably-worse-than-it-looks). US 175 at a 48% weight and the rest at 96 give 134. Tails 110 (repression) and 163.

**Q3.** Under the errata's gross-level reading, public outlays in the four categories are near 0.35% of G7 GDP today (the premortem's unverified estimate), not the private-loss markers two seats scaled. Fermi's build reaches 0.8%, mine 0.9%; 1.5% is about 1.5 sigma out: 6.

**Q4.** On my C3 only Japan and the US clearly pass 140%; Italy and France are marginal and need a numerical ECB cap. Japan 0.28 x US 0.25 x a third country 0.12, plus automation-tax paths: 2.

**Down-weighted**

- **outside-view** on C4 and Q6-A (its median needs 2.19% Chinese growth for twenty years, below any official path); on Q6-C (its 18% credit-event limb counts four decades of IMF standbys under fixed exchange rates, none since floating); on C1 (eras of trade liberalisation in the reference class); on Q5 leg one (22% from windows in which China rose from under 5% of world GDP).
- **fermi** on C1 and Q1 (the 0.86 is the assumed index for "other" goods, 1.47 over twenty years, restated; Q1 = 18 inherits its 30%); and on every simulation-derived number, since the premortem showed the China wedge was fitted to the same IMF path and the "flat constant-price share" is the allocator's output. Its own C4 arithmetic is kept and is my starting point.
- **signals** on the C4 and Q6-A centre (one year's 2.65% run-rate and a productivity quarter that BLS says moves "-1.1 to +1.4 percentage points about 80 percent of the time" between estimates, carried over twenty years) and on Q3 (private-loss markers, and a bundled IMF figure read from a search summary).
- **bayes** on Q6-A (15.4 updates from the outside-view prior and so inherits its low China anchor; every ratio it applied there is flagged as unjustified above 2:1).
- **premortem** on Q6-A = 26 and the C4 P90 of 2.95: the 20% weight on a US-China AI duopoly is asserted, not derived, so that part posed. Its Q4 = 3 is not supported by its own product (0.12 x 0.15 = 1.8). Its hits on China, on the shared IMF slope and on the model's closure are accepted.

**Coherence checks**

- Q1 <= P(C1 < 0.75): 10 <= 19. Holds (0.19 x 0.53).
- Q2 against C2: P90 is 1.90, below 2.00, and Q2 is 7, below 10. P50 is 0.97, so the above-50 rule does not apply. Holds.
- Q6-A <= P(g >= 2.5%): 21 <= 23. C4's 2.15% is the blend of about 2.3% (2026-35) and 2.0% (2036-45); C4's own quantiles put P(C4 >= 2.5%) at 26%, above the 23% for g, as a later and lower-centred decade requires. Holds.
- Q4 against C3: my C3 median (US about 175, Japan about 185, Italy about 140, France about 138) leaves two countries clearly above 140% and two marginal; the UK, Canada and Germany stay below. Q4 = 2 prices the third country as the binding constraint. Holds.
- Q6 sums to 100 (21 + 67 + 12). Every continuous answer has P10 < P50 < P90.

**Wave audit**

- **Where Wave 1 disagreed.** C4 (1.8 / 2.03 / 2.35) and with it Q6-A (10 / 19 / 25); Q6-C (21 / 10 / 8); C1 (1.15 / 0.86 / 0.95) and Q1 (7 / 18 / 9); Q3 (3 / 9 / 3); Q5 leg one (22% / 5.5% / 6%). It agreed on C2 (0.85-1.03), C3 (131-133), Q2 (6-10) and Q4 (2).
- **What Wave 2 changed.** Bayes re-based C3 on the corrected vintage (134), lifted C4 from 1.8 to 2.0 on the IMF's China path, cut the credit-event limb from 18% to 12.9% and moved Q3 to 5 on fermi's build. The premortem showed that the C3 agreement was one IMF slope, that the outside view's C4 contradicts the official series that resolves it, and that the simulation's regional numbers are fitted, not identified; it widened both growth tails and moved regime mass out of B.
- **Moderated or amplified.** Moderated. Against the Wave-1 median of three (C1 0.95, Q1 9, C2 1.00, Q2 7, C3 132, Q3 3, Q4 2, C4 2.03, Q5 3, Q6 19 / 69 / 10) my posterior moves C1 +0.02, Q1 +1, C2 -0.03, C3 +2, Q3 +3, C4 +0.12, Q6 +2 / -2 / +2, and leaves Q2, Q4 and Q5 unchanged. The spread between seats narrowed (C4 from 0.55 to 0.15 points, C1 from 0.29 to 0.15) and no binary moved further from 50.
- **Still unresolved.** China's reported growth after 2031 (a target-led 3.6% against a regression-led 2.2% is worth about 0.5 points on C4 and decides Q6-A); whether AI adds more than the static 0.3 points to OECD productivity; which trade era C1 belongs to; whether HLW survives to 2046; and what an official source would count under Q3, where no estimate exists and the 0.35% starting level is unverified.
- **Single largest update.** Q3, from the Wave-1 median of 3 to 6 (odds doubled). Cause: the errata's gross-level reading together with fermi's category build, which put the quantity at roughly half the threshold where scaled private catastrophe losses put it at a third. On the effort's own centre of gravity the largest move is C4, +0.12 points, from the premortem's China check.

```json
{"c1": {"p10": 0.66, "p50": 0.97, "p90": 1.30},
 "q1": 10,
 "c2": {"p10": 0.10, "p50": 0.97, "p90": 1.90},
 "q2": 7,
 "c3": {"p10": 110, "p50": 134, "p90": 163},
 "q3": 6,
 "q4": 2,
 "c4": {"p10": 1.45, "p50": 2.15, "p90": 2.85},
 "q5": 3,
 "q6": {"A": 21, "B": 67, "C": 12}}
```
