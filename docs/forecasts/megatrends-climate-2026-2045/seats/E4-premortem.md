# Seat E4-premortem (effort E4 gdp-divergence, lens: premortem)

**BLUF.** All three Wave-1 seats extended one official no-shock slope with China's scheduled fade as the only moving part, so their agreement is one anchor counted three times and both tails are thin. I keep the centre near theirs but take mass out of the residual regime (Q6: A 26, B 61, C 13; C4 from 1.4 to 2.95), while the consensus No on Q5, Q2 and Q4 survives the attack.

## Reasoning (premortem only)

**Shared assumption: smooth-slope continuity.** The three C3 medians (131, 132, 133) are the corrected IMF slope to the decimal: 108.2 + 20 x 7.0/6 = 131.5. Q5 rests on the IMF's flat 42.4%, C4 on the IMF's China path plus an unchanged OECD. A WEO path is a policies-unchanged, constant-real-exchange-rate projection, not a median, and every twenty-year window since 1970 holds a break.

**Anchoring and drag/pull asymmetry.** The brief's "2.15-2.85% in every window" became each seat's ceiling, though that band was an OECD slowdown offset by China's rising weight. The label "techno-abundance" made g >= 2.5% read as utopia; it is that band's midpoint. Fermi itemised drags (employment -0.25, climate -0.1) and gave AI a static +0.3.

**China.** The outside-view median (1.8%) needs Chinese GDP growth near 2.3% for twenty years, from 4.6% today, yet the resolver is the official series. Beijing's 2035 goal implies "average annual growth of at least 4.17% over the next decade" (Trivium's own calculation, not a number in the Proposals; 2020 dollars; https://triviumchina.com/?p=189785), against about 3.5% on my extension of fermi's IMF path. A requirement, not a forecast.

**Simulation closure.** The adapter's "identified" growth is world GDP times a renormalised regional share moved by hand-set residual-TFP wedges (`src/modules/demand.ts`); the US gets +2.90% because its wedge sits near the world average. China's +2.83% "matching" fermi's 2.9 is circular: that wedge was grid-fitted in 2026-11 to the same IMF path and an earlier panel's P50. The same allocator gave fermi's "no real drift" in Q5 (44.83 to 44.49); on the IMF real paths fermi quotes, the constant-price share falls to about 39% by 2045 (my arithmetic, world 2.7%), so prices and exchange rates must supply about 11 points, not 7.7. The safe rate is smoothed world growth plus 3.5 bp per debt point with z constant, so +0.04 pp is assumed; debt stabilises by an imposed Bohn reaction; DICE damage x 0.35 is no budget line.

**Strongest wrong world (20%): a US-China AI duopoly, the rest lagging.** There g >= 2.5% (0.85), US + China > 50% (0.4), R >= 2.00 (0.25). IMF `NGDPD` (https://www.imf.org/external/datamapper/api/v1/NGDPD, extraction tool): US + China outgrew the rest by about 1.5 points a year over 2000-2026 against 1.6 required, but on China's 12% dollar growth; the EU's share was flat over 2015-2026 (18.0%, 17.8%). Q5 = 0.10 x 0.4 = 4. HLW has not followed yields and may lapse to the realised-rate fallback (30%), which widens C2 both ways without lifting Q2 above 8.

**Opposite tail (20%): bust and sovereign stress.** A narrow capex boom (47% of H1 trade growth) unwinds, debt steps up, China's target lapses: C4 near 1.4, C3 above 160. Q6-C = credit events 11 (Italy 4, US technical default 3.5, France 2.5, UK and Japan 1.5 each, less overlap; ESM-only rescues excluded) + stagflation 2 = 13. Repression is the other debt tail, 110.

**Remaining.** g: centre 2.1, sigma 0.7, so P(g >= 2.5%) = 28. C1: P(E < 0.75) = 27; composite above 42% given that, 0.5 (the WTO's broad aggregate may not exist in 2046): Q1 = 13. Q3: two seats scaled private catastrophe losses; the errata's gross public level is near 0.35% of G7 GDP (my unverified estimate) and needs a fourfold rise: 7. Q4: one fiscal-dominance regime (12%) brings Japan, the US and a euro cap on Italy and France (0.15), plus an automation-tax path: 3.

**Coherence.** Q1 13 <= 27. C2 P90 1.90 < 2.00, Q2 8 < 10. A 26 <= 28; C4's 2.15 blends 2.3 then 2.1. Q4 counts Japan, the US and Italy, above 140% on my C3.

```json
{"c1": {"p10": 0.58, "p50": 0.92, "p90": 1.32},
 "q1": 13,
 "c2": {"p10": -0.15, "p50": 0.9, "p90": 1.9},
 "q2": 8,
 "c3": {"p10": 110, "p50": 135, "p90": 163},
 "q3": 7,
 "q4": 3,
 "c4": {"p10": 1.4, "p50": 2.15, "p90": 2.95},
 "q5": 4,
 "q6": {"A": 26, "B": 61, "C": 13}}
```
