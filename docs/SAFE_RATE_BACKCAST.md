# Safe-rate backcast and the Tetlock-panel match

> **Update (2026-11-07, later):** `safeRateDebtSensitivity` is now **3.5bp**, not 6.5bp. The
> 6.5bp calibration below was above every published estimate (Dallas Fed WP 2513: 3.47bp on
> the 5y5y real yield, 1.01bp of it to the short rate; Laubach 2009: 3-4bp). Its panel match
> (section 2) used gamma = 0.08 with alpha and beta unchanged, so factor weights summed to 0.48
> and the growth path had decreasing returns to scale; and the US 2019-26 rise is mostly term
> premium. See `docs/forecasts/bloc-capitalism-2045/README.md`. The analysis below is kept as run.

Exploratory, 2026-11-07. Outcome: `safeRateDebtSensitivity` raised from 3bp to
6.5bp per pp, with the debt term now pricing a 3-year exponential smooth of
debt/GDP (`safeRateDebtSmoothingYears`). Without the smoothing, 6.5bp turned the
model's low-growth 2026 (debt/GDP +1.5pp, then flat) into a one-year safe-rate
spike that `src/seed-year.test.ts` rejects. Smoothing keeps 96% of the US
2019 -> 2024-26 debt change, so the 6.5bp calibration still sits under that
check's upper bound (8.2bp with smoothing). The analysis below was run at 3bp
with no smoothing, the default at the time. Reproduce with
`scripts/safe-rate-backcast.py` (history) and `scripts/safe-rate-forecast-match.ts`
(forward grid).

The equation under test (`capital.ts`):

```
safeRate = neutralSafeRate                                   (z, 1.0%)
         + c * (trendGrowth - 3.4%)                          (safeRateGrowthPassThrough, 1.0)
         + s * (publicDebt/GDP - 2025 level)                 (safeRateDebtSensitivity, 3bp/pp)
trendGrowth = 10-year exponential smoother of realized growth (trendGrowthSmoothingYears)
```

## 1. History: what backcasts?

Data: Jorda-Schularick-Taylor Macrohistory R6 (18 advanced economies,
1870-2020), PPP-weighted (Maddison GDP x population; JST nominal GDP is in
mixed units across countries and cannot weight). Real long rate = long-term
government yield less trailing 3-year CPI inflation. Derived aggregate:
`data/rates/ae-aggregate.csv`.

| Decade | Real long rate | Growth | Trend growth | Debt/GDP |
|---|---|---|---|---|
| 1950s | 0.76% | 4.77% | 3.93% | 0.64 |
| 1960s | 2.83% | 5.34% | 4.61% | 0.41 |
| 1970s | 0.32% | 3.65% | 4.53% | 0.33 |
| 1980s | 4.25% | 2.97% | 3.51% | 0.47 |
| 1990s | 3.95% | 2.80% | 3.23% | 0.66 |
| 2000s | 2.06% | 1.49% | 2.69% | 0.75 |
| 2010s | 0.62% | 1.92% | 1.87% | 1.09 |

**Growth pass-through `c` is not identified by history.** Every reasonable
specification gives a different answer:

| Test | c | Note |
|---|---|---|
| Aggregate levels, 1960-2019 | +0.28 (se 0.23) | R2 0.02: growth explains nothing |
| Aggregate levels, 1980-2019 | +2.19 (se 0.21) | R2 0.75, but residual autocorrelation 0.62; one shared downtrend |
| Same, ex-post inflation | -0.3 to +2.8 | sign flips with the inflation measure and window |
| Panel, country + year fixed effects, 1980-2019 | +0.09 (se 0.12) | a country's OWN growth does not move its rate |
| Panel, country + year fixed effects, 1950-2019 | -0.24 (se 0.09) | |
| Old-age dependency alone, 1980-2019 | (R2 0.78) | fits as well as growth: the two trends are collinear |

**The model's equation, anchored at 2019 and run backward** (the way the model
anchors at 2025 and runs forward):

| c (N=10, s=3bp) | RMSE 1960-2019 | RMSE 1980-2019 | RMSE 1990-2019 |
|---|---|---|---|
| 0 | 4.18pp | 4.27pp | 3.50pp |
| 0.5 | 3.45 | 3.73 | 3.06 |
| **1 (default)** | **2.81** | **3.19** | **2.62** |
| 2 | 2.18 | 2.14 | 1.78 |
| 3 | 2.83 | 1.23 | 1.06 |

The default under-predicts 1980s-90s rates by 2-3pp: real rates fell ~3.6pp
from the 1980s to the 2010s while trend growth fell ~1.6pp and debt ROSE
(which the +3bp term reads as pushing rates up). A growth-only equation needs
c ~2-3 to close that gap; it is borrowing the explanatory power of everything
else that trended down together (ageing, safe-asset demand, the fall in
inflation risk, the global saving glut). Over 1960-2019 no setting beats a
constant (the 1950-80 repression era, low real rates with high growth, sits
outside every specification).

**Debt sensitivity `s`.** History is ambiguous (-0.2 to +10bp/pp across
specifications). The one out-of-sample test points up: US 10-year real rate
(Cleveland Fed) rose **+1.28pp** from 2019 to the 2024-26 average while trend
growth moved +0.08pp and federal debt rose 16pp of GDP. c=1, s=3bp predicts
+0.57pp; matching it with debt alone takes **~8bp per pp**. Part of the
2022-26 rise is QT, inflation-risk and term premium, which the model does not
separate, so ~8bp is an upper bound on the r* channel. The panel's own source
(Dallas Fed WP 2513) splits ~2.4bp into term premium and ~1bp into r*.

**Reading.** c = 1 is neither supported nor rejected. It is a convention
(Holston-Laubach-Williams impose it). Going below 1 makes the backcast worse,
not better, because the model has no other channel to carry the secular
decline. The defensible conclusion is structural: the safe rate has drivers
the equation omits, and the debt term is probably too small.

## 2. Forward: what reproduces the panel?

Targets (panel medians, 2026-2045): G7 r* 1.18% averaged over 2036-45
(P10-P90 -0.05..2.30); advanced-economy debt 110% -> 147% by 2045, read as a
x1.34 ratio on the model's world 0.90 (P10-P90 x1.05..x1.66); OECD+China real
GDP per capita +1.60%/yr (P10-P90 0.81..2.57). Grid: 1,080 runs over energy
weight `gamma` {0.55, 0.30, 0.15, 0.08} x `serviceEfficiencyGrowth`
{1.29%, 0.9%} x c {0, 0.5, 1, 2, 3} x s {3, 6.5, 10bp} x z {1.0, 1.5, 2.0%} x
`ageingCostDeficitShare` {0.25, 0.5, 1.0}. Distance = root sum of squared
z-scores, sigma = (P90 - P10)/2.56.

**Growth is the gate.** Growth with the safe-rate block at its defaults:

| gamma | efficiency growth | OECD+CN per capita | safe 2036-45 | debt 2045 (x2025) |
|---|---|---|---|---|
| 0.55 (default) | 1.29% (default) | 3.71%/yr | 1.23% | 0.92 (x1.02) |
| 0.30 | 1.29% | 2.80 | 0.76 | 1.00 (x1.11) |
| 0.08 (mainstream) | 1.29% | 2.30 | 0.50 | 1.04 (x1.16) |
| 0.08 | 0.9% | 1.88 | 0.26 | 1.07 (x1.19) |

- **None of the 135 runs at the model's default growth lands in the panel's
  80% range.** The closest borrows 100% of rising ageing costs: rate 1.56%,
  debt x1.24 (1.12), but growth 3.69%/yr (distance 3.1 sigma).
- **206 of 1,080 runs land inside it on all three**, all with gamma <= 0.30;
  gamma = 0.30 qualifies only with slower efficiency growth. The slowest run in
  the grid still grows 1.65%/yr, so the panel's 1.60% is at the edge of what
  these levers can produce.

**Best matches holding the 2026 rate at its observed level (z = 1%):**

| gamma | eff | c | s | ageing share | safe 2036-45 | debt 2045 | debt 2060 | per capita | distance |
|---|---|---|---|---|---|---|---|---|---|
| 0.08 | 0.9% | **1.0** | **6.5bp** | 0.25 | 1.22% | 1.18 (x1.31) | 1.61 | 1.84% | 0.36 |
| 0.08 | 0.9% | 0.5 | 3bp | 0.50 | 1.16 | 1.24 (x1.37) | 1.63 | 1.84 | 0.38 |
| 0.08 | 0.9% | 0.5 | 3bp | 0.25 | 1.02 | 1.16 (x1.29) | 1.50 | 1.85 | 0.45 |
| 0.15 | 0.9% | 0.5 | 3bp | 0.50 | 1.17 | 1.22 (x1.36) | 1.63 | 1.94 | 0.50 |

The best match keeps the default pass-through c = 1 and doubles the debt
sensitivity to 6.5bp, the setting section 1's US out-of-sample check also
points to. Raising z instead (1.5-2%) also fits, but it starts 2026 at
1.6-2.1%, above the panel's own 0.95% G7 starting point.

**Once growth is mainstream, c and s trade off** (gamma 0.08, eff 1.29%,
z 1%, ageing 0.25; safe rate 2036-45 / debt x2045):

| c \\ s | 3bp | 6.5bp | 10bp |
|---|---|---|---|
| 0 | 1.62% / x1.29 | 2.90 / x1.45 | 4.69 / x1.77 |
| 0.5 | 1.05 / x1.22 | 2.05 / x1.34 | 4.06 / x1.60 |
| 1 | 0.50 / x1.16 | 1.27 / x1.25 | 2.80 / x1.43 |
| 2 | -0.53 / x1.05 | -0.15 / x1.09 | 0.66 / x1.18 |
| 3 | -1.49 / x0.96 | -1.41 / x0.97 | -1.12 / x1.00 |

The 2-3 pass-through that backcasts 1980-2019 best fails forward: when growth
slows it drives the safe rate negative and debt flat. High s with low c is a
debt-rate spiral (10bp, c = 0: 4.7% and x1.77).

**Repression (panel Q4, 59.5%).** No matching run triggers the 150%
fiscal-dominance cap by 2045 (at most 1 year); the median matching run hits it
for 7 years by 2060. The model reaches the panel's financial-repression
regime about 15 years late, because world debt (~1.2) stays below the
advanced-economy debt (~1.47) that the panel's 140% YCC threshold is set
against.

## 3. Conclusions

1. The model-panel gap is mostly **growth**, not rate parameters. With the
   model's energy-driven growth (~3.7%/yr) no safe-rate or ageing setting
   reproduces the panel; with mainstream growth (gamma ~0.08-0.15) several
   do, close to the current rate block.
2. The current **c = 1 is defensible** (best-fitting forward match; history
   can't reject it). Lowering it does not improve the backcast.
3. The **debt sensitivity looks low.** 6.5bp fits both the US 2019-26 rise and
   the panel; 3bp is the bottom of the cited Laubach / CBO range (2-4bp) and
   omits the term premium.
4. The backcast's real message is **missing drivers**: the 1980-2019 decline
   (~3.6pp) is twice what trend growth explains. A demographic term
   (old-age dependency, already a model output) fits as well as growth but
   extrapolates to deeply negative rates as ageing continues, so it is not a
   drop-in fix.

Caveats: the model's rate is a world rate anchored to world growth (3.4%),
while the panel's is G7; JST debt is central or general government as each
country reports it; real rates use adaptive inflation expectations, and the
1980-2019 estimates are sensitive to that choice.
