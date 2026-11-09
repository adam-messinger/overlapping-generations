# Five megatrends including physical climate change, 2026-2045: Tetlock panel report

**Forecast origin 2026-11-09.** K = 4 efforts x 6 single-skill seats (24), per
`.claude/skills/tetlock-ensemble-forecasting`. This panel reforecasts the ten questions of
an external ensemble report of the same date, "Two Engines Against Three Headwinds" (the
"source report"; its numbers are in `source-report.json`). Questions and locks:
`questions.md`, `errata.md`. Seats: `seats/`. Pooled numbers: `aggregate/aggregate.md`.
Side-by-side: `comparison.md`. A plain-language narrative of the forecast: `NARRATIVE.md`.
Raw mean and median lead; the d = 1.35 column is a labelled sensitivity only.

## BLUF

The panel prices every one of the source report's five yes/no questions far lower, and
puts growth higher and the neutral rate lower. Its picture is continuity with fat tails:
regime B (neither boom nor crisis) at 67%, a G7 credit event or decade of stagflation at
12.5%, a productivity boom at 20.5%.

| Question | Source report (raw mean) | This panel (raw mean / median) | Effort range |
|---|---|---|---|
| Q1 trade elasticity < 0.75 and digital + AI goods + minerals > 42% of trade | 36.0% | **10.4%** / 10.0% | 9-13% |
| Q2 neutral real rate >= 2.00%, 2036-2045 | 24.5% | **9.4%** / 8.5% | 7-12% |
| Q3 G7 climate fiscal cost >= 1.5% of GDP a year, 2040-2045 | 37.8% | **5.9%** / 6.0% | 6-9% |
| Q4 at least three G7 countries: automation tax >= 2% of GDP or formal yield-curve control | 68.8% | **2.8%** / 2.0% | 2-4% |
| Q5 US + China > 50% and EU-27 < 11.5% of world nominal GDP, 2045 | 42.0% | **4.3%** / 4.0% | 3-5% |
| C1 world trade-to-GDP volume elasticity, 2026-2045 (P10 / P50 / P90) | 0.48 / 0.81 / 1.15 | **0.65 / 0.96 / 1.32** | P50 0.89-0.97 |
| C2 neutral real rate, 2036-2045 average, % | -0.06 / 1.27 / 2.46 | **-0.05 / 0.89 / 1.97** | P50 0.75-0.97 |
| C3 advanced-economy gross public debt, 2045, % of GDP | 126 / 161 / 201 | **111 / 136 / 164** | P50 134-140 |
| C4 OECD + China real GDP per capita, 2026-2045, % a year | 0.68 / 1.48 / 2.45 | **1.56 / 2.19 / 2.84** | P50 2.15-2.30 |
| Q6 regimes A boom / B bloc capitalism and repression / C climate-debt crisis | 17.4 / 51.0 / 31.6 | **20.5 / 67.0 / 12.5** | A 17-26, B 62-70, C 10-13 |

Two limits on reading that table:

- **The source report published no resolvers.** Each question was a phrase. This panel's
  definitions are in `questions.md`, so a gap mixes a difference of judgment with a
  difference of definition. The next section separates them question by question.
- **This run has one arm.** The source report's headline was a *delta*: what adding climate
  did to a four-megatrend baseline. This panel forecast the five-megatrend world only. It
  says nothing about that delta, for or against.

## Where the gaps come from

**Mostly definition (the two ensembles may not disagree).**

- **C3 debt.** The question names the IMF's advanced-economy group, which is 108.2% of GDP in
  2025 and 115.2% in the IMF's 2031 projection. The source report's text speaks of "G7
  debt", and the G7 aggregate is 123.1% and 134.6% on the same dates. Extending the IMF's G7
  slope (1.9 points a year) from 2031 gives 161 in 2045, the source report's median exactly.
  This panel's 136 for the wider group is the IMF's slope for that group (1.2 a year) plus
  an allowance for forecast error and one crisis-sized step. On a G7 basis it would sit at
  roughly 155-165. (The slope arithmetic is the orchestrator's; the reading of the source
  report is an inference.)
- **C4 growth, about half.** The lock is one aggregate: OECD plus China GDP over OECD plus
  China population. That aggregate grew 2.15-2.85% a year in every ten-year window since
  1990, because China is about a third of its GDP and half its people. Feeding the source
  report's own country rates (US 1.59%, EU 0.87%, China 2.92%) into it gives about 1.85%,
  not 1.48% (orchestrator's arithmetic, with the OECD rate inferred from the US and EU
  figures). The remaining gap, roughly 0.35 points, is judgment: the calibrators put the
  OECD near 1.3% and China near 3.0-3.2%.
- **C2 and Q2, in part.** No "G7 r*" series exists. The lock uses the New York Fed's HLW
  estimates for the US, euro area and Canada, which stand at 1.01%, 0.09% and 1.76%
  (composite 0.73%) and have not followed bond yields up. The source report's 1.27% and its
  24.5% for 2% or more look like a market-implied or Laubach-Williams-type level (press
  reports 1.65% for the US, probably from that model). On the HLW composite no ten-year
  window starting after 2001 has averaged 2%.
- **Q6, the levels.** The three regimes were labels in the source report. Here C needs a G7
  default, restructuring or IMF programme, or a decade of inflation at 4% with growth under
  1%. A softer definition of "crisis" would move mass from B to C. Both ensembles make B the
  modal regime.

**Mostly judgment (the ensembles do disagree).**

- **Q5 shares, 42% against 4%.** The thresholds and the series are the source report's own.
  US plus China is 42.3% of world nominal GDP in 2026 and the IMF has it at 42.4% in 2031;
  by the seats' reading the sum has not exceeded 44% since 1960. The EU-27 is 17.8%. Yes
  needs +7.7 points on one leg (priced at 7-9%) and -6.3 on the other (about 0.4-0.6 given
  the first).
- **Q4 policy, 69% against 3%.** Only Japan and the US clearly pass the 140% debt gate on
  any seat's path; Italy is at it (137.9% now, 135.6% projected for 2031) and France below.
  The UK, Canada and Germany are far under. So a third country needs an ECB numerical yield
  cap with Italy above 140%, or an automation levy of 2% of GDP, and no G7 country has any
  automation tax. The calibrators' chains put Japan at 9-30%, the US at 9-25% and a third
  country at 12-20% given the first two. That holds under any reading that keeps the
  question's own ">140%" and "formal".
- **Q3 climate fiscal cost, 38% against 6%.** On the most generous reading (the gross level
  of adaptation, relief, backstops, support and attributed revenue losses), the seats count
  about 0.3% of G7 GDP today (their own estimate, unverified) and build to 0.6-0.9% for
  2040-2045, 1.0% if a resolver counts macro revenue losses. The 1.5% bar is about five times today's level. The source report's
  own build summed to 1.58%.
- **C1 and Q1 trade.** WTO: merchandise trade grew 2.5% a year against GDP's 2.7% over
  2010-2023 (0.93), and the window opens with two forecast years near 1.45. For the twenty
  years to finish under 0.75 the remaining eighteen must average about 0.67, close to what
  the 2018-2024 tariff years delivered (0.71, a seat's arithmetic on the WTO series). The
  calibrators put that at 18-26% and the
  composition leg near a coin flip, hence 10%. The source report's 36% with a 0.81 median
  implies it treated the composition leg as near-certain.

## What moved between waves

| Wave | Q1 | Q2 | Q3 | Q4 | Q5 | C1 P50 | C2 P50 | C3 P50 | C4 P50 | Q6 A / B / C |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 (12 seats) | 9.3% | 8.5% | 4.4% | 2.6% | 4.2% | 0.98 | 0.89 | 134 | 2.19 | 20 / 68 / 12 |
| 2 (8 seats) | 12.1% | 10.6% | 7.3% | 3.2% | 4.6% | 0.95 | 0.88 | 137 | 2.18 | 21 / 66 / 13 |
| 3 (4 calibrators) | 10.5% | 9.5% | 7.5% | 2.5% | 4.0% | 0.94 | 0.87 | 137 | 2.20 | 21 / 67 / 12 |

Waves 2-3 *amplified* Wave 1 on Q3 (4.4% to 7.5%) and C3 (134 to 137). Every other question
ended within about a point, or 0.04 on a median, of its Wave-1 mean, with a narrower spread
between seats. Both amplifications trace to the errata, not to new argument: the gross-level
reading of Q3 (the largest single update of three of the four calibrators) and the corrected
IMF debt vintage. The premortems' other real hits were that three Wave-1 debt medians were
one IMF line drawn three times, that the "0.9-1.0 elasticity regime" depends on its
endpoints, and that the HLW series may not outlive its author's tenure (E2 gives 30% to the
realized-rate fallback, which is why its Q2 is 12 and not 6-8). Extremizing at d = 1.35
pushes every binary further toward zero (Q4 to 0.8%); that is the borrowed constant acting
on already-low numbers, not evidence.

| Effort (calibrator) | Q1 | Q2 | Q3 | Q4 | Q5 | C1 P50 (P10-P90) | C2 P50 (P10-P90) | C3 P50 (P10-P90) | C4 P50 (P10-P90) | Q6 A / B / C |
|---|---|---|---|---|---|---|---|---|---|---|
| E1 trade-chokepoints | 13 | 9 | 7 | 2 | 4 | 0.89 (0.62-1.22) | 0.85 (-0.10-1.95) | 135 (111-160) | 2.20 (1.55-2.85) | 20 / 70 / 10 |
| E2 neutral-rate-capital | 10 | 12 | 9 | 2 | 4 | 0.95 (0.67-1.25) | 0.75 (-0.55-2.10) | 140 (113-171) | 2.15 (1.55-2.75) | 17 / 70 / 13 |
| E3 sovereign-debt-fiscal | 9 | 10 | 8 | 4 | 5 | 0.94 (0.66-1.30) | 0.90 (0.05-2.00) | 139 (114-166) | 2.30 (1.65-3.00) | 26 / 62 / 12 |
| E4 gdp-divergence | 10 | 7 | 6 | 2 | 3 | 0.97 (0.66-1.30) | 0.97 (0.10-1.90) | 134 (110-163) | 2.15 (1.45-2.85) | 21 / 67 / 12 |

## The simulation's part

Only the four Fermi seats ran `scripts/tetlock-sim-adapter.ts` (spec `adapter-spec.json`,
output `adapter-output.md`, model at commit `c904ac2`). The adapter refused C1, Q1 and Q4,
gave direction only for C2, Q2, C3, Q3 and Q5, and identified C4 and Q6's growth leg.

- **The model contradicts history on C4 and no seat adopted it.** Its ten runs give 2.64-3.98%
  a year for OECD + China per capita (2.95% at the defaults), all above every realized
  ten-year window (2.15-2.85%). The Fermi seats landed at 2.03-2.3 from their own component
  arithmetic, and the calibrators ruled the runs "not a tail to borrow". E4's premortem
  attacked the closure directly: regional growth is a renormalised share allocator and
  China's wedge is fitted to the same IMF path the Fermi seat used.
- **The only climate delta in this run is the model's, and it is directional.** Against the
  default run, the high-sensitivity and climate-cascade scenarios lower OECD + China growth
  by 0.12-0.16 points a year, lower the world safe real rate by 0.11-0.16 points and add
  1.0-1.4 points to world public debt by 2045. That compares harsher climate with the
  default climate, not climate with none. The signs match the source report's; the debt
  effect is a tenth of its +12 points.

## What the audit found in the locks

The signals seats doubled as resolution auditors. `errata.md` records what they found and
the one reading chosen per ambiguity; `questions.md` was left frozen. The twelve Wave-1 seats
answered before the errata.

- **A stale baseline.** The preamble's advanced-economy debt row was the October 2025
  vintage (110.1%); the current one is 108.2% in 2025, and the US figure was mislabelled.
  Re-read from the IMF series by the orchestrator.
- **Two WTO "AI-enabling goods" aggregates in 2026**, about 3-4 points of Q1's composite
  apart. The broad one was chosen because the preamble's baseline was built on it. The
  fuels-and-mining share was never verified by any seat.
- **Q3 has no resolver today.** No official estimate uses its accounting, and several seats
  expect it to be cancelled. Treat its 5.9% as a judgment on an unscoreable quantity.
- **Defects left in place:** Q6-C misses a euro-area G7 member rescued by the ESM alone;
  C4's PPP series is vintage-dependent if the ICP is rebased; C2 rests on the New York Fed
  continuing HLW to 2046.

## Caveats

- LLM seats share priors and corpora, so their errors are correlated. That is why the
  unextremized mean leads and why agreement between efforts is weak evidence.
- Binary answers are integers from 1 to 99, so Q4 and Q5 cannot be pooled below 1%.
- Baseline rows marked (S) in `questions.md` came from secondary press; the IMF debt and GDP
  rows and the HLW and World Bank rows were read from the primary source.
- Staging is for auditability. Nothing here shows that six seats per effort forecast better
  than one.
- Process deviations, none affecting a number: two Fermi seats read the whole of
  `efforts.md` (other mandates and lenses, no forecasts); two seats ran a read-only
  `git status`; eight seats were interrupted by a usage limit and resumed from their own
  transcripts, none restarted.
- Not sealed through `packages/forecast-workbench`. The locks were committed before any seat
  ran (`8a0c0f8`), which is a timestamp and not a seal. Questions resolve in 2046-2048.
