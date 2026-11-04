# Calibration panel: China catch-up and the solar build (to 2035)

A 24-seat Tetlock ensemble (4 orthogonal efforts x 6 single-skill seats, 3
waves; the repo skill `.claude/skills/tetlock-ensemble-forecasting`), run
2026-11-04 to set the model parameters that govern China's catch-up growth
and the pace of the global solar build. No seat could see or run the
simulation: the model is the object being calibrated, so reading it would
make the calibration circular.

Efforts: `china-convergence`, `china-headwinds`, `solar-supply`,
`solar-integration`. Seats: historian, fermi, scout (wave 1); bayes,
premortem (wave 2); reconciler (wave 3).

## Questions (identical for every seat)

| | Question | Resolves on |
|---|---|---|
| Q1 | China minus world real GDP growth, mean of 2026-30 annual rates, pp | IMF WEO Apr 2032 |
| Q2 | Same gap, 2031-35 | IMF WEO Apr 2037 |
| Q3 | Global solar net capacity added in calendar 2030, GW (IRENA basis, AC-dominant) | IRENA RCS |
| Q4 | Same, calendar 2035 | IRENA RCS |
| Q5 | Any year 2027-35 with IRENA solar net additions >= 5% below the prior year? | IRENA RCS |
| Q6 | Regime of R = Q4/Q3: A >= 1.5, B 1.1-1.5, C 0.9-1.1, D < 0.9 | derived |

Baselines given to every seat: China ~5.0% growth in 2025; IMF WEO Oct 2026
China 4.5% (2026), 4.0% (2027), ~3.3% by 2029; world ~3.1-3.3%. IRENA 2025
solar net additions 511 GW (452 in 2024, 346 in 2023); IEA PVPS ~690-698 GWdc.

## Result

Headline is the unextremized pool over all 24 seats: Vincentized mean of each
quantile (no extremization of quantiles), raw mean for the binary. Full output
in `aggregate.json`; regenerate with `python3 -I aggregate.py`.

| | P10 | P50 | P90 | seat P50 range |
|---|---|---|---|---|
| Q1 China-world gap 2026-30 (pp) | 0.18 | **0.87** | 1.54 | 0.70-1.15 |
| Q2 China-world gap 2031-35 (pp) | -0.69 | **0.28** | 1.09 | -0.20-0.65 |
| Q3 solar net additions 2030 (GW) | 411 | **555** | 765 | 500-640 |
| Q4 solar net additions 2035 (GW) | 440 | **676** | 1,039 | 590-780 |

- Q5 (a >= 5% dip in 2027-35): **61%** raw mean (seats 45-80%; d=1.35
  secondary 66%).
- Q6 regimes: A 19 / **B 44** / C 23 / D 14. The pooled P50s imply R = 1.22, regime B.
- The panel's solar path: ~1.7%/yr growth in additions 2025-30 from IRENA's
  511 GW, then ~4%/yr 2030-35. Additions keep rising, but slowly.

## What the model said before calibration

| | Panel P50 | Model (pre) |
|---|---|---|
| Q1 gap 2026-30 | 0.87 | 1.03 |
| Q2 gap 2031-35 | 0.28 | 0.84 |
| Q3 solar 2030 (GW) | 555 | 1,787 |
| Q4 solar 2035 (GW) | 676 | 2,090 |

The model's China catch-up half-life was ~46 years, so it held the gap almost
flat through 2035. Its solar build compounded at the 30%/yr growth cap to
~3x the panel's 2030 median.

`panel-output.json` holds every seat's payload, reasoning, drivers and
falsification signposts.

## What was changed

**China: fitted.** `tfpGrowth` 0.028, `tfpDecay` 0.115, and a new `tfpFloor`
of 0.007 (the OECD-ex-US residual) give a model gap of 0.86 / 0.28 pp. The
floor keeps the near-term fit from implying a collapse after 2035. Without
it, China would grow 0.9 pp below world over 2050-2100.

**Solar: not fitted. This needs a modelling decision.**
- The solar cap is a share of the installed fleet (`maxGrowthRate.solar`,
  30%/yr), so annual additions compound at the same rate as the fleet. The
  panel's additions grow ~2-4%/yr.
- No constant rate fits both points. IRENA 2025 (511 GW) needs ~27%; the
  2030 median (555 GW) needs ~15.5%.
- A prototype build-momentum cap (addition_t <= addition_{t-1} x (1+g),
  seeded with IRENA 2024 regional additions summing to 453 GW) fits the
  panel at g ~ 4%/yr. The cost:

| | Current | g = 3.5% | g = 5% |
|---|---|---|---|
| Solar additions 2030 / 2035 (GW) | 1,816 / 2,061 | 530 / 630 | 573 / 732 |
| Solar fleet 2050 (GW) | 50,447 | 18,693 | 23,177 |
| GDP 2050 / 2100 ($T) | 338 / 1,753 | 290 / 818 | 296 / 744 |
| Fossil share 2050 | 9.9% | 14.5% | 13.5% |
| Warming 2100 (C) | 2.63 | 2.64 | 2.64 |

Under the gamma = 0.55 useful-energy production function, the solar build is
the model's late-century growth engine. Matching the panel through 2035 and
extending the same momentum to 2100 more than halves 2100 GDP. That tail is
an extrapolation; the panel says nothing past 2035. 2100 GDP is also
non-monotonic in g (818 / 744 / 799 at 3.5 / 5 / 8%), which needs tracing
before any version of this lands.
