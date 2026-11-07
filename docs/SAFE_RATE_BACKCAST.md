# Safe-rate backcast and the Tetlock-panel match

Exploratory, 2026-11-07. No model default was changed. Reproduce with
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

_Filled in from the 1,080-run grid; see section 2 below._
