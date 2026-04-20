# Learning × Damage Sensitivity Sweep

_Generated 2026-04-20T13:55:27.231Z_

## Grid

- **Solar Wright's Law exponent**: 0.25, 0.3, 0.36, 0.4, 0.45 (central 0.36)
- **Wind Wright's Law exponent**: 0.15, 0.2, 0.23, 0.27, 0.3 (central 0.23)
- **Damage coefficient ω**: 0.003, 0.004, 0.00536, 0.007, 0.009 (central 0.00536)
- **Scenarios**: baseline, net-zero, high-sensitivity, climate-cascade
- **Runs**: 500

## Elasticities (evaluated at central ± 1 grid step)

Elasticity = (ΔM / M) / (ΔP / P), finite-differenced around the central point. 
Positive ⇒ metric rises with parameter. Magnitude > ~0.5 indicates strong sensitivity.

### baseline

Central-point values:
- **warming2100**: 1.89°C
- **gdp2100**: $702T
- **fossilShare2100**: 0.0%
- **cdrCumulative2100**: 674.6

| Metric | Solar α elasticity | Wind α elasticity | Damage ω elasticity |
|---|---:|---:|---:|
| warming2100 | 0.001 | -0.002 | -0.006 |
| gdp2100 | 0.075 | 0.006 | -0.081 |
| fossilShare2100 | -0.081 | -0.007 | 0.072 |
| cdrCumulative2100 | 0.047 | 0.009 | -0.014 |

### net-zero

Central-point values:
- **warming2100**: 1.75°C
- **gdp2100**: $687T
- **fossilShare2100**: 0.0%
- **cdrCumulative2100**: 689.9

| Metric | Solar α elasticity | Wind α elasticity | Damage ω elasticity |
|---|---:|---:|---:|
| warming2100 | -0.005 | -0.003 | -0.002 |
| gdp2100 | 0.084 | 0.010 | -0.063 |
| fossilShare2100 | -0.090 | -0.012 | 0.051 |
| cdrCumulative2100 | 0.037 | 0.007 | -0.009 |

### high-sensitivity

Central-point values:
- **warming2100**: 2.19°C
- **gdp2100**: $678T
- **fossilShare2100**: 0.0%
- **cdrCumulative2100**: 672.2

| Metric | Solar α elasticity | Wind α elasticity | Damage ω elasticity |
|---|---:|---:|---:|
| warming2100 | 0.000 | -0.002 | -0.007 |
| gdp2100 | 0.075 | 0.006 | -0.104 |
| fossilShare2100 | -0.081 | -0.007 | 0.094 |
| cdrCumulative2100 | 0.049 | 0.010 | -0.018 |

### climate-cascade

Central-point values:
- **warming2100**: 2.19°C
- **gdp2100**: $680T
- **fossilShare2100**: 0.0%
- **cdrCumulative2100**: 671.5

| Metric | Solar α elasticity | Wind α elasticity | Damage ω elasticity |
|---|---:|---:|---:|
| warming2100 | 0.001 | -0.002 | -0.007 |
| gdp2100 | 0.077 | 0.006 | -0.105 |
| fossilShare2100 | -0.082 | -0.007 | 0.092 |
| cdrCumulative2100 | 0.050 | 0.010 | -0.018 |

## Tornado plots (full-range deltas)

#### Tornado — baseline

Metric deltas (high − low across the full parameter range, other two axes at central):

```
warming2100 (central = 1.89°C)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -0.01C
  wind   ▒▒▒▒▒▒▒▒                                 -0.00C
  solar  ▒▒▒                                      -0.00C

gdp2100 (central = $702T)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -65T
  solar  ████████████████                         +27T
  wind   ██                                       +3T

fossilShare2100 (central = 0.0%)
  damage ████████████████████████████████████████ +0.0%
  solar  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                      -0.0%
  wind   ▒▒▒▒▒▒▒▒▒▒▒                              -0.0%

cdrCumulative2100 (central = 674.6)
  solar  ████████████████████████████████████████ +17.1
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                -10.6
  wind   ██████████                               +4.2

```

#### Tornado — net-zero

Metric deltas (high − low across the full parameter range, other two axes at central):

```
warming2100 (central = 1.75°C)
  solar  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -0.01C
  wind   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                    -0.00C
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                    -0.00C

gdp2100 (central = $687T)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -50T
  solar  ███████████████████████                  +29T
  wind   ████                                     +5T

fossilShare2100 (central = 0.0%)
  damage ████████████████████████████████████████ +0.0%
  solar  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒            -0.0%
  wind   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                        -0.0%

cdrCumulative2100 (central = 689.9)
  solar  ████████████████████████████████████████ +13.7
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                     -6.7
  wind   ██████████                               +3.3

```

#### Tornado — high-sensitivity

Metric deltas (high − low across the full parameter range, other two axes at central):

```
warming2100 (central = 2.19°C)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -0.02C
  wind   ▒▒▒▒▒▒▒                                  -0.00C
  solar  ▒▒▒▒                                     -0.00C

gdp2100 (central = $678T)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -81T
  solar  █████████████                            +26T
  wind   █                                        +3T

fossilShare2100 (central = 0.0%)
  damage ████████████████████████████████████████ +0.0%
  solar  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                          -0.0%
  wind   ▒▒▒▒▒▒▒▒                                 -0.0%

cdrCumulative2100 (central = 672.2)
  solar  ████████████████████████████████████████ +17.9
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒           -13.4
  wind   ██████████                               +4.3

```

#### Tornado — climate-cascade

Metric deltas (high − low across the full parameter range, other two axes at central):

```
warming2100 (central = 2.19°C)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -0.02C
  wind   ▒▒▒▒▒▒▒                                  -0.00C
  solar  ▒▒▒                                      -0.00C

gdp2100 (central = $680T)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -80T
  solar  █████████████                            +26T
  wind   █                                        +3T

fossilShare2100 (central = 0.0%)
  damage ████████████████████████████████████████ +0.0%
  solar  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                         -0.0%
  wind   ▒▒▒▒▒▒▒▒▒                                -0.0%

cdrCumulative2100 (central = 671.5)
  solar  ████████████████████████████████████████ +18.4
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒           -13.8
  wind   ██████████                               +4.4

```

## Cross-scenario interactions

Elasticities that shift substantially between scenarios indicate non-linearity worth reporting.

- **warming2100 vs solar**: elasticity spread 94% across scenarios — baseline=0.00, net-zero=-0.01, high-sensitivity=0.00, climate-cascade=0.00
- **warming2100 vs wind**: elasticity spread 34% across scenarios — baseline=-0.00, net-zero=-0.00, high-sensitivity=-0.00, climate-cascade=-0.00
- **warming2100 vs damage**: elasticity spread 76% across scenarios — baseline=-0.01, net-zero=-0.00, high-sensitivity=-0.01, climate-cascade=-0.01
- **gdp2100 vs wind**: elasticity spread 41% across scenarios — baseline=0.01, net-zero=0.01, high-sensitivity=0.01, climate-cascade=0.01
- **gdp2100 vs damage**: elasticity spread 40% across scenarios — baseline=-0.08, net-zero=-0.06, high-sensitivity=-0.10, climate-cascade=-0.10
- **fossilShare2100 vs wind**: elasticity spread 44% across scenarios — baseline=-0.01, net-zero=-0.01, high-sensitivity=-0.01, climate-cascade=-0.01
- **fossilShare2100 vs damage**: elasticity spread 46% across scenarios — baseline=0.07, net-zero=0.05, high-sensitivity=0.09, climate-cascade=0.09
- **cdrCumulative2100 vs damage**: elasticity spread 51% across scenarios — baseline=-0.01, net-zero=-0.01, high-sensitivity=-0.02, climate-cascade=-0.02

## Caveats

- Solar and wind learning rates are correlated in reality (shared supply chain, financing, interconnect queues). The `(high-solar, low-wind)` corner is lightly populated empirically — read corner cells with skepticism.
- Damage coefficient elasticity is emissions-path dependent; per-scenario tables (not pooled).
- Warming responds primarily to emissions, not damages. Expect |damage elasticity on warming| ≪ 1 — non-zero here reflects indirect feedback (damages → GDP → energy demand → emissions).
- Local sensitivities at 5-point resolution — adequate for curvature detection within the grid range, not for full uncertainty quantification.
- The central (0.36 / 0.23 / 0.00536) reproduces the calibrated defaults; sanity-check by comparing `centralMetrics` with a plain `npm start` run.
