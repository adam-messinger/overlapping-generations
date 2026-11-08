# The Commanding Heights, 2026-2031: Tetlock panel report

**Forecast origin 2026-11-08.** K = 4 efforts x 6 single-skill seats (24), per
`.claude/skills/tetlock-ensemble-forecasting`. Questions and locks: `questions.md`.
Seats: `seats/`. Pooled numbers: `aggregate/aggregate.md` (raw mean and median are the
headline; the d = 1.35 column is a labelled sensitivity only).

## BLUF

The panel gives the essay's *direction* real weight and its *magnitudes* very little. Capex
most likely keeps rising, but slower than the essay says. The US labor share most likely
keeps falling. Only the US and China likely hold the frontier. Every quantitative milestone
the essay names on this horizon prices well below even odds:

| Essay claim | Question | Panel (raw mean / median) |
|---|---|---|
| "Soon over $1T and trillions yet to come"; no signal to stop | Q1 Big-4 capex 2030 vs 2026 | broken (<1x) **30%**, plateau (1-2x) **41%**, sustained (2-4x) **25%**, essay's line (>=4x) **4%** |
| Training cost x3.5/yr: "$10B the year after" | Q2 Epoch-costed >= $10B run published by end-2028 | **24%** / 22% |
| Only the US and China can sustain the frontier | Q3 LMArena top-10 orgs all US/PRC, end-2028 | **70%** / 76% (calibrators 74-80%) |
| "Near-unlimited" Neo-Dollar demand | Q4 stablecoin supply 31 Dec 2028 (~$308B today) | P10/P50/P90 **$230B / $377B / $669B** |
| Washington reverses the 1951 Accord and pegs yields | Q5 Fed numerical yield cap before 2031 | **5.7%** / 6% |
| A decade moves as much labor share to capital as forty years did (~-6 pp) | Q6 BLS labor share, 2030 average (52.8% in 2026Q2) | P10/P50/P90 **49.6 / 51.9 / 54.2%** |
| Back offices in India go first | Q7 Indian IT big-5 headcount -10% (Mar 2026 -> Mar 2029) | **11%** / 11% |

## What drove the numbers

- **Q1.** Every effort's posterior is a plateau-led barbell: a 25-30% chance the funding loop
  breaks (capex +70%/yr vs operating cash flow +23%/yr is the essay's own evidence) against a
  25-29% chance of sustained 2-4x growth. The essay's >=4x line is a 3-4% tail in every effort.
- **Q2.** A $10B run on Epoch's own amortized cost metric needs a GW-scale run lasting months.
  Epoch has also not costed a closed frontier model since July 2025, so resolution risk cuts
  against Yes (E2).
- **Q3** was the largest single update in three of four efforts: from wide reference-class
  priors (30-45%) up to 74-80%. The resolving board is observable now. The first ~18-20 distinct
  organizations are US/PRC, ~48 rating points clear of the nearest outsider. The premortems'
  hit was that slot 10 is won by post-training, not compute, so it is not locked.
- **Q4/Q5.** Stablecoins grow (median ~+22%) but nowhere near "near-unlimited". A US yield peg
  needs a trigger that the June 2020 FOMC deliberation and the RBA/BoJ exits argue against (E3).
- **Q6.** The panel expects the 2026 record low to extend about 1 pp by 2030: a 4-year fall
  of ~1 pp, not the ~2.5 pp a straight-line "-6 pp per decade" would imply. About a quarter
  point of the fall is a scheduled BEA definitional change (data capitalization in 2028), not
  the economy (E4 premortem, spot-checked).
- **Q7.** The binding limit on how fast these firms can shrink is attrition and the pyramid,
  not the historical record. The big-5 were still net hiring in Jul-Sep 2026 (+13,918).

Wave audit: Waves 2-3 *amplified* the US/PRC concentration view (Q3 68% -> 78%) and *moderated*
the funding-break regime after the Wave-2 dip (Q1:A 27% -> 35% -> 26%). The other questions
moved by under 2 pp.

## Caveats

LLM seats share priors and corpora, so their errors are correlated. That is why the
unextremized mean leads. The four Fermi seats read the model at its panel-origin vintage
(commit 46df211), before the datacenter capex and siting fixes. All four treated its readings
as directional or refused, and none adopted a model number. The adapter spec names the pre-#129 brake
parameter (`dataCenterPowerSpendCeiling`), so re-running it as written needs that commit. Nothing here is sealed through
`packages/forecast-workbench` yet. Resolution dates run from 2028-12-31 (Q2-Q4) to 2031 (Q1, Q5, Q6).
