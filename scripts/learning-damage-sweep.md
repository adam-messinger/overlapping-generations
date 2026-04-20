# Learning × Damage Sensitivity Sweep

_Generated 2026-04-20T13:23:46.038Z_

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
- **warming2100**: 2.04°C
- **gdp2100**: $246T
- **fossilShare2100**: 0.0%
- **cdrCumulative2100**: 268.6

| Metric | Solar α elasticity | Wind α elasticity | Damage ω elasticity |
|---|---:|---:|---:|
| warming2100 | 0.004 | -0.001 | -0.006 |
| gdp2100 | 0.077 | 0.004 | -0.107 |
| fossilShare2100 | -0.110 | -0.010 | 0.088 |
| cdrCumulative2100 | 0.155 | 0.020 | -0.111 |

### net-zero

Central-point values:
- **warming2100**: 1.96°C
- **gdp2100**: $251T
- **fossilShare2100**: 0.0%
- **cdrCumulative2100**: 286.6

| Metric | Solar α elasticity | Wind α elasticity | Damage ω elasticity |
|---|---:|---:|---:|
| warming2100 | 0.000 | -0.001 | -0.003 |
| gdp2100 | 0.060 | 0.004 | -0.098 |
| fossilShare2100 | -0.086 | -0.010 | 0.081 |
| cdrCumulative2100 | 0.151 | 0.021 | -0.107 |

### high-sensitivity

Central-point values:
- **warming2100**: 2.38°C
- **gdp2100**: $236T
- **fossilShare2100**: 0.0%
- **cdrCumulative2100**: 260.8

| Metric | Solar α elasticity | Wind α elasticity | Damage ω elasticity |
|---|---:|---:|---:|
| warming2100 | 0.004 | -0.001 | -0.006 |
| gdp2100 | 0.076 | 0.004 | -0.135 |
| fossilShare2100 | -0.109 | -0.011 | 0.107 |
| cdrCumulative2100 | 0.154 | 0.020 | -0.133 |

### climate-cascade

Central-point values:
- **warming2100**: 2.37°C
- **gdp2100**: $234T
- **fossilShare2100**: 0.0%
- **cdrCumulative2100**: 255.9

| Metric | Solar α elasticity | Wind α elasticity | Damage ω elasticity |
|---|---:|---:|---:|
| warming2100 | 0.004 | -0.001 | -0.006 |
| gdp2100 | 0.077 | 0.004 | -0.141 |
| fossilShare2100 | -0.111 | -0.011 | 0.110 |
| cdrCumulative2100 | 0.155 | 0.020 | -0.144 |

## Tornado plots (full-range deltas)

#### Tornado — baseline

Metric deltas (high − low across the full parameter range, other two axes at central):

```
warming2100 (central = 2.04°C)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -0.01C
  solar  ███████                                  +0.00C
  wind   ▒▒▒▒                                     -0.00C

gdp2100 (central = $246T)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -29T
  solar  ███████████                              +8T
  wind   █                                        +1T

fossilShare2100 (central = 0.0%)
  damage ████████████████████████████████████████ +0.0%
  solar  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                     -0.0%
  wind   ▒▒▒▒▒▒▒▒▒▒                               -0.0%

cdrCumulative2100 (central = 268.6)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -32.8
  solar  ████████████████████████                 +19.7
  wind   ████                                     +3.5

```

#### Tornado — net-zero

Metric deltas (high − low across the full parameter range, other two axes at central):

```
warming2100 (central = 1.96°C)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -0.01C
  wind   ▒▒▒▒▒▒▒▒▒                                -0.00C
  solar  ▒▒▒▒▒                                    -0.00C

gdp2100 (central = $251T)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -27T
  solar  █████████                                +6T
  wind   █                                        +1T

fossilShare2100 (central = 0.0%)
  damage ████████████████████████████████████████ +0.0%
  solar  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                        -0.0%
  wind   ▒▒▒▒▒▒▒▒▒▒▒                              -0.0%

cdrCumulative2100 (central = 286.6)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -33.6
  solar  ████████████████████████                 +20.5
  wind   █████                                    +4.0

```

#### Tornado — high-sensitivity

Metric deltas (high − low across the full parameter range, other two axes at central):

```
warming2100 (central = 2.38°C)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -0.02C
  solar  ██████                                   +0.00C
  wind   ▒▒▒▒                                     -0.00C

gdp2100 (central = $236T)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -36T
  solar  ████████                                 +8T
  wind   █                                        +1T

fossilShare2100 (central = 0.0%)
  damage ████████████████████████████████████████ +0.0%
  solar  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                         -0.0%
  wind   ▒▒▒▒▒▒▒▒                                 -0.0%

cdrCumulative2100 (central = 260.8)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -38.4
  solar  ████████████████████                     +18.9
  wind   ████                                     +3.4

```

#### Tornado — climate-cascade

Metric deltas (high − low across the full parameter range, other two axes at central):

```
warming2100 (central = 2.37°C)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -0.02C
  solar  ███████                                  +0.00C
  wind   ▒▒▒                                      -0.00C

gdp2100 (central = $234T)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -37T
  solar  ████████                                 +8T
  wind   █                                        +1T

fossilShare2100 (central = 0.0%)
  damage ████████████████████████████████████████ +0.0%
  solar  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                         -0.0%
  wind   ▒▒▒▒▒▒▒▒                                 -0.0%

cdrCumulative2100 (central = 255.9)
  damage ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ -41.0
  solar  ██████████████████                       +18.7
  wind   ███                                      +3.3

```

## Cross-scenario interactions

Elasticities that shift substantially between scenarios indicate non-linearity worth reporting.

- **warming2100 vs solar**: elasticity spread 92% across scenarios — baseline=0.00, net-zero=0.00, high-sensitivity=0.00, climate-cascade=0.00
- **warming2100 vs damage**: elasticity spread 52% across scenarios — baseline=-0.01, net-zero=-0.00, high-sensitivity=-0.01, climate-cascade=-0.01
- **gdp2100 vs damage**: elasticity spread 31% across scenarios — baseline=-0.11, net-zero=-0.10, high-sensitivity=-0.13, climate-cascade=-0.14

## Caveats

- Solar and wind learning rates are correlated in reality (shared supply chain, financing, interconnect queues). The `(high-solar, low-wind)` corner is lightly populated empirically — read corner cells with skepticism.
- Damage coefficient elasticity is emissions-path dependent; per-scenario tables (not pooled).
- Warming responds primarily to emissions, not damages. Expect |damage elasticity on warming| ≪ 1 — non-zero here reflects indirect feedback (damages → GDP → energy demand → emissions).
- Local sensitivities at 5-point resolution — adequate for curvature detection within the grid range, not for full uncertainty quantification.
- The central (0.36 / 0.23 / 0.00536) reproduces the calibrated defaults; sanity-check by comparing `centralMetrics` with a plain `npm start` run.
