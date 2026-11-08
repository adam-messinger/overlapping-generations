# Model review — November 2026: what moves the model, and what doesn't

Reviewed on `main` at `5bc18f9`, after #134 (leverage target on all capital),
#135 (revert of #130) and #136 (constant-returns production, debt at market
exchange rates, robot siting). Earlier runs: `e35ab16` (first), `32f03d2` (after
the datacenter fixes, #127 and #129); Sections 4.1, 4.2 and 4.5 record what
changed. No model code is changed by this review; `scripts/feedback-ablation.ts`
reproduces every number below.

The question was which parts are extraneous: feedbacks that never bind or
never move anything (candidates for reporting-only), and code that should go.
The answer comes from measurement, not reading:

- **Freeze ablation.** Each cross-module input is held at its converged 2025
  value for every later year (34 mechanisms). The receiving module still runs;
  only the feedback's variation is gone. Zero means the input is constant on
  every path. Freezing a growing flow also removes its growth, so a large
  number is not by itself proof of an interesting feedback.
- **Parameter ablation.** Each within-module mechanism is set to its neutral
  value (33 mechanisms).
- Both are run on 9 scenarios (default, net-zero, climate-cascade, ssp5-85,
  ssp3-70, ai-energy-boom, tech-stagnation, debt-populism, ssp1-19). The
  tables give the **largest** change across them.
- **Binding probe.** Every module output's range was recorded on all 21
  scenario files plus the default, to see which constraints ever leave their
  neutral value.

```bash
npx tsx scripts/feedback-ablation.ts            # ~15 min, both modes
npx tsx scripts/feedback-ablation.ts --mode=freeze --scenarios=default,net-zero
```

## Verdict

| Tier | Mechanism | Evidence (max across 9 scenarios) | Recommendation |
|---|---|---|---|
| Dead code | Capital's energy/general investment split (`baseEnergyInvestmentShare`, `energyInvestmentSensitivity`, the `energyBurden` input, `energyInvestment` output, energy's `availableInvestment` input) | exactly 0 on every output | **Remove** |
| Dead code | Capital's exogenous automation share (`automationShare2025`, `automationGrowth`, `automationShareCap`, `robotsPerCapitalUnit`, `robotsDensity`, `automationShare` outputs) | exactly 0; contradicts demand's endogenous fleet | **Remove**; report `robotsPer1000` |
| Dead code | Keen production function (`keenEnergyWeight` = 0, `keenEnergyExponent`, `keenEnergyGdp`, `productionFunctionGap`) | weight 0 in every scenario | Remove, or keep explicitly as a diagnostic |
| Never binds | Land-budget food stress -> production | `foodStress` = 0 in all 22 runs | Keep the shock hook only (see 2.1) |
| Never binds | Firm insolvency, early repayment, bank-equity shortfall, unfunded realized spend | all = 0 in all 22 runs | Keep insolvency as a sweep guard; check the rest against a sweep, then remove |
| Reporting only | Bank retention (`bankRetentionSpeed`) | exactly 0 on every real output | Already a ledger; say so and stop calibrating it |
| Reporting only | Mineral constraint -> energy build | binds in 3/22 runs; ≤0.02 on anything | **Make reporting-only** |
| Reporting only | Fossil-resource depletion (EROI) | ≤0.14% GDP, ≤0.7pp fossil share | Drop coal (2,400-year budget); consider gas |
| Reporting only | Target leverage (`leverageAdjustmentSpeed`) | ≤1.1% GDP | Keep as a ledger; no more calibration |
| Remove | Stability / "G/C uncertainty" (`stabilityLambda`) | ≤0.6% GDP; double-counts damages | **Remove** |
| Remove | Desertification (unsourced "Assumption" params) | ≤0.08% on anything | **Remove** |
| Small, keep | mining depletion exponent, `cleanShareFlex`, shortfall-led build, credit sensitivity, curtailment storage boost, regional burden + reliability, water yield | 0.1-2.7% | Keep; low priority for calibration |
| Load-bearing | Automation (labor share, income to capital), damages, adaptation, tipping, heat stress, energy-burden damage, LCOE-led electrification, regional clean budget, financing debits, ageing deficit share, debt pricing, idle fossil, site depletion | 8-307 | Keep — and see Section 4 |
| Scenario-specific | Financial repression | default +36pp public debt without it; debt-populism +794pp | Keep; see 4.1 |

## 1. Dead code: remove (bit-identical)

### 1.1 Capital's investment split does nothing

**Status:** removed, bit-identical (commit `cbe2351`).

`capital.ts` computes `energyShare` = 15% of orders, moved by the energy
burden. It is used only

- as a fallback when `energyCapexSpend` is absent — it is always present in
  the wired model; and
- for the reported `energyInvestment` = investment x energyShare, which the
  runner hands to energy as `availableInvestment`. Energy reads it only when
  `regionalInvestment` is absent (`energy.ts:1793`) — it never is.

Freezing the energy-burden input, freezing `availableInvestment`, and setting
`energyInvestmentSensitivity = 0` all change no output by any amount. The
reported number is also wrong: `energyInvestment` is **$23.3T in 2100**
against energy's realized `energyCapexSpend` of **$3.5T**.

What energy actually builds from is `regionalInvestment` — the region's share
of TOTAL investment, weighted by the lifecycle savings rate — times its clean
share (`energy.ts:2254`). Freezing that moves cumulative CO2 52% and 2100 GDP
5.6%. See 4.4.

Remove: `baseEnergyInvestmentShare`, `energyInvestmentSensitivity`, the
`energyBurden` input to capital, the `energyInvestment` and
`energyShareOfInvestment` outputs, energy's `availableInvestment` input, and
the `distributeByGDP` fallback.

### 1.2 Two robot densities that disagree

**Status:** removed, bit-identical apart from the two fields (commit `3d1fa3d`).
automation-boom and test-singularity set `automationGrowth`, a knob that
only ever moved this report; their robot levers were always demand's.

Capital carries an exogenous automation share (2% of K growing 3%/yr to a 20%
cap) and turns it into `robotsDensity`. Demand carries the endogenous fleet
(`robotsPer1000`, deployed while marginal value exceeds marginal cost) that
production and capital actually use. Nothing reads capital's version;
`automationGrowth = 0` changes nothing.

They disagree by 3x in the default run: in 2100 capital reports **1,092**
robots per 1,000 workers, demand **325**. CLAUDE.md's Key Outputs table lists
`robotsDensity` ("Robots per 1000 workers") — the exogenous one — while the
Automation section quotes demand's. Remove capital's four parameters and two
outputs and point the `robotsDensity` row, `scripts/wide-table.ts`,
`scripts/compare-forecast.ts` and `scripts/correlation-analysis.ts` at
`robotsPer1000`.

### 1.3 Keen production function

`keenEnergyWeight` is 0 by default and in every scenario, so production
computes a second GDP (`keenEnergyGdp`) only to report `productionFunctionGap`.
Used by `scripts/accounting-applicability-report.ts` and pinned in
`seed-year.test.ts`. Cheap, but it is a second model of GDP that no run uses.
Keep it only if that report is still wanted.

## 2. Never binds

From the probe across all 22 runs:

| Output | Range | Meaning |
|---|---|---|
| `foodStress` | 0 everywhere | farmland never hits the land budget |
| `unpaidPrivateInterest`, `loanWriteOffs` | 0 everywhere | firm insolvency never fires |
| `voluntaryPrincipalRepayments` | 0 everywhere | over-levered early repayment never fires |
| `bankEquityShortfall` | 0 everywhere | |
| `unfundedRealizedSpend` | 0 everywhere | |
| `unfundedInvestmentDemand` | 1.03 (2025) falling to 0 by 2035 | start-up years only |
| `mineralConstraintBySource` | < 1 only in ssp1-19, ssp1-26, test-hyper-tax | lithium -> battery (min 0.86); copper never binds the build |
| `heatStressLoss` | always 0 in us, oecd-ex-us, china, russia, latam | binds in india, ssa, mena, seasia |
| `stability` | 0.96-1 except test-doomer (0.81) | |

### 2.1 Food stress

Land-budget food stress is zero on every path, so `foodStressElasticity` is
inert. The only way it fires is `resources.foodSupplyShocks`, which only the
Hormuz bridge sets (`src/simulations/critical-materials/hormuz-bridge.ts`).
Keep the production channel as a shock hook; document it as such and stop
describing food stress as an endogenous feedback. The food submodel
(calories, protein, grain) matters only through farmland -> land-use carbon:
freezing temperature into resources moves 2100 GDP ≤1% and cumulative CO2
≤2.6%.

### 2.2 Insolvency and the other zeros

CLAUDE.md says insolvency "never binds on the default path" and was needed
because in-range sweeps crashed without it. It never binds in any scenario
either. Keep it as a guard, but the early-repayment branch, the bank-equity
shortfall and `unfundedRealizedSpend` should be checked against
`scripts/parameter-sweep.ts`; if they stay zero there too, remove them.

## 3. Feedbacks that exist but don't matter: make reporting-only

### 3.1 Mineral constraint -> energy build

Binds in 3 of 22 runs, all lithium. Freezing it at 1.0 moves every output by
≤0.02. The `mineralConstraintBySource` lag, the per-source throttle and its
`perMW_*` bookkeeping exist to deliver that. Make it reporting-only: keep the
supply ratios and the mineral ledger, drop the lag into energy. If
transition-mineral scarcity is a question the model should answer, the
constraint is too weak to answer it as built (no price, transition stream
served first by construction), and that is a redesign, not a parameter.

### 3.2 Stability (`stabilityLambda`) — remove

`stability = 1 / (1 + 2·D²)` with D = last year's climate damages, labelled
"uncertainty". It scales investment orders. Damages already cut GDP, profit
and so orders, so this is a second damage channel on investment. Effect: 0.1%
of 2100 GDP in the default, ≤0.6% anywhere (≤3% of cumulative CO2).
CLAUDE.md already says the Galbraith/Chen framework is not implemented; what
is left is one unsourced coefficient on a double count.

### 3.3 Bank retention

`bankRetentionSpeed = 0` changes no real output to the last digit: retained
interest moves household income to bank saving, and saving is ex post. It is
correct accounting and already documented as reporting. No change, other than
not spending more calibration effort on it.

### 3.4 Target leverage and the private-debt block

`leverageAdjustmentSpeed = 0` moves 2100 GDP ≤1.1% and cumulative CO2 ≤2.2% (private debt/GDP
in 2100: default 1.58 -> 1.57, ai-energy-boom 0.94 -> 0.75). Doubling
`baseCreditGrowth` moves 2100 GDP ≤4.1%. Private debt reaches the real economy
almost only through `debtRiskPremium` (12% of 2100 GDP). The block is a
well-built ledger; it is not a driver. Treat new private-debt mechanisms as
reporting unless they act on the risk premium or the investment cap.

### 3.5 Fossil-resource depletion

Removing depletion entirely (`recoverableResources` = 1e12) moves 2100 GDP
≤0.14% and 2050 fossil share ≤0.7pp. Coal's budget is 2,400 years of 2025
production, so coal depletion cannot matter before 2100. The mechanism earned
its place by replacing a proved-reserves version that blew up gas LCOE; at
resource-scale budgets it does very little. Remove the coal half; keep gas
only if a high-gas scenario is expected to approach 200 years of cumulative
use.

### 3.6 Desertification — remove

Two parameters marked "Assumption" (`desertificationRate`,
`desertificationClimateCoeff`), with no source, move every output ≤0.08%.
They tighten a land budget that never binds (2.1).

## 4. Load-bearing — and what that shows

### 4.1 Financial repression: decisive only where debt runs away

The first two runs found repression to be the de facto fiscal closure (without
it public debt rose ~850pp by 2100 in every scenario). After #136 measured
debt at market exchange rates and the safe rate's debt sensitivity moved to
3.5bp, default public debt crosses the 150% threshold around 2082 and levels
off at ~157%, with the safe rate held down ~1.2pp by 2100. Without repression,
default debt is 36pp higher and 2100 GDP 4% lower; in debt-populism, +794pp
and −29%. The Bohn reaction still saturates at `fiscalReactionMax` (4% of
GDP). `ageingCostDeficitShare` (−69pp) and `safeRateDebtSensitivity` (−34pp)
are the big debt dials.

### 4.2 Datacenters: fixed after the first run

The first run (`e35ab16`) found datacenters a pure cost: freezing their growth
**raised** 2100 GDP 7.8% in the default and **130%** in ai-energy-boom. Their
capex came out of the 3.8%-of-capital limit on net investment ahead of general
capital, while their growth was braked only on the power bill, ~1/16 of their
cost. In ai-energy-boom that froze general capital at exactly $967T from 2050
to 2100 while the return on capital rose to 37%. The scenario's description
("GDP ~$3,956T") had been stale since the Jul 28 monetary-circuit rewrite
(ff531bc), which cut it to $872T unnoticed because ai-energy-boom was not in
the regression baseline. Fixed since:

- #127: robot and datacenter fleets are capital stock; their capex is added to
  investment orders and competes only for finance. ai-energy-boom joined the
  regression baseline.
- #129: the datacenter brake reads total cost of ownership (power + capital at
  the return on capital + replacement; `dataCenterSpendCeiling`, 1.3% of GDP),
  capital cost re-calibrated $15B -> $45B per average GW (Dell'Oro 2025
  spend), and load sited by IEA's observed regional split.

Now: freezing datacenter growth moves default 2100 GDP −0.1%; in
ai-energy-boom, where the AI payoff is on, it costs 27% of 2050 GDP and 16.5%
of 2100 GDP. ai-energy-boom's ceiling is 10x the default, so its datacenters
run at ~13% of GDP by 2100; treat it as the stress test it says it is.

### 4.3 Automation is the largest mover

`automationIncomeToCapital = 0` (robot and AI income paid as wages) raises
2100 GDP 17% in the default, 32-36% in net-zero and ssp1-19, and 240% in
ai-energy-boom. Freezing the lagged labor share that robots price against
moves 2100 GDP up to 307%. With labor's production weight now 0.55 (#136),
the loop through augmented labor is stronger than before: robots value the
wage they displace, their income lowers the labor share, and the next robot
is worth less. Default 2100: 325 robots per 1,000 workers and a 40% labor
share; ai-energy-boom: 1,552 and 8%. It is the model's main late-century GDP
dial, ahead of climate damages (25%) and anything in energy.
`robotIntegrationExponent` remains its judgment parameter
(docs/SENSITIVITY.md).

### 4.4 Savings rates act only as a map

Saving is ex post in the monetary circuit, so the lifecycle savings machinery
(`savingsWorking`, `savingsPremium`, the life-expectancy and dependency
responses) cannot change total investment. It now moves 2100 GDP ≤1.6% and
cumulative CO2 3.4-3.8%, entirely through two geographic channels: the
regional allocation of total investment that sets each region's clean-energy
budget (1.1; freezing that allocation moves cumulative CO2 52%), and the
home-bias WACC drift. The model has a desired-saving theory whose only job is
a regional allocation weight. Either name it that, or tie the clean budget to
energy's own capex demand so the weight can go.

### 4.5 CDR and knife-edges

CDR no longer deploys at scale in the default run: 0.6 Gt/yr in 2100,
starting ~2085 (it was on its 15 Gt/yr cap by ~2090 before #136). It still
ends on the cap in ai-energy-boom, net-zero and ssp1-19, where removing it
raises 2100 warming up to 0.24°C. The debt-populism CDR knife-edge the earlier
runs found is gone (CDR ~0 there now).

A new knife-edge, found while #130 was reverted (#135): India's power build
has two stable outcomes from ~2058. India's 2100 coal fleet is 91 GW in one
and 1,076 GW in the other, +5.6 Gt CO2/yr, with India's GDP moving <0.25%.
A ±1e-4 nudge to India's TFP moves neither outcome, but #130's change to how
demand bills lock-in fuel to regions tipped it from one to the other. Any
change that touches Indian demand or fuel prices can flip it, so a regression
failure on peak emissions should be read as "which outcome did India land
in" before anything else.

### 4.6 ssp1-19 starts with an $800/t shock

ssp1-19 and ssp1-26 apply $800/t from 2025. Energy burden starts at 17% of
GDP; as fuels switch, its unwinding is a growth tailwind (GDP +4.2-5.9%/yr in
2026-30) and ssp1-19 ends with the highest 2100 GDP of any scenario ($2,350T,
2.65x the default's $886T). Freezing the burden damage at its 2025 level costs
up to 11.6% of 2100 GDP, which is the size of the artifact. A carbon-price
path that ramps from the 2025 regional mix would remove it.

### 4.7 Full ranking

Largest absolute change across the 9 scenarios; sorted from least to most.
GDP and emissions in %, temperature in °C, fossil share and public debt in pp.
Where a freeze row and a parameter row are identical (home bias, heat stress,
automation income), only the first is shown.

| Mechanism | GDP 2050 | GDP 2100 | T 2100 | cum CO2 | fossil 2050 | elec 2100 | pub debt |
|---|---:|---:|---:|---:|---:|---:|---:|
| freeze: food stress -> production | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| freeze: energy burden -> capital (investment split) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| freeze: energy-investment share -> energy | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| param: bankRetentionSpeed = 0 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| param: energyInvestmentSensitivity = 0 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| param: automationGrowth = 0 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| param: foodStressElasticity = 0 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| freeze: mineral constraint -> energy | -0.01 | -0.02 | 0.00 | 0.01 | -0.00 | -0.02 | 0.02 |
| freeze: non-electric fuels -> energy (depletion) | -0.00 | 0.01 | -0.00 | -0.05 | 0.00 | 0.01 | -0.01 |
| param: resources mining depletion exponent = 0 | 0.01 | 0.04 | -0.00 | -0.05 | 0.00 | 0.03 | -0.01 |
| freeze: shortfall -> energy | 0.00 | 0.03 | -0.00 | -0.08 | -0.00 | 0.04 | -0.14 |
| param: resources desertification off | 0.02 | 0.05 | -0.00 | -0.08 | -0.00 | 0.05 | -0.00 |
| param: cleanShareFlex = 1 | -0.01 | 0.08 | 0.00 | 0.15 | -0.11 | 0.01 | -0.02 |
| param: creditSensitivity = 0 | -0.00 | -0.13 | -0.00 | -0.00 | 0.00 | -0.19 | -0.03 |
| param: energy fossil depletion off | 0.04 | 0.14 | -0.00 | 0.13 | -0.70 | 0.15 | -0.26 |
| param: curtailmentStorageBoost = 0 | -0.02 | 0.49 | 0.03 | 1.07 | 1.11 | -0.72 | -0.17 |
| freeze: regional burden + reliability -> demand | -0.30 | -0.55 | -0.02 | -1.03 | -1.29 | -1.69 | -0.29 |
| param: leverageAdjustmentSpeed = 0 | 0.00 | 1.13 | -0.03 | -2.23 | -0.00 | 1.36 | 0.14 |
| freeze: return on capital -> energy (WACC equity) | -0.06 | 0.85 | -0.04 | -1.70 | 2.37 | 1.34 | 0.73 |
| freeze: temperature -> resources (yields, water, land) | 0.08 | -0.99 | 0.05 | 2.63 | -0.01 | -1.16 | 0.45 |
| param: resources water yield sensitivity = 0 | 0.06 | -1.06 | 0.06 | 2.69 | -0.01 | -1.21 | 0.45 |
| freeze: GDP -> resources (minerals, food, land) | 0.05 | -1.11 | 0.06 | 2.74 | -0.01 | -1.25 | 0.46 |
| freeze: resource energy -> production | 0.23 | -1.25 | 0.06 | 2.97 | -0.13 | -1.37 | 0.67 |
| freeze: climate damages -> capital (stability) | 0.07 | -0.64 | 0.06 | 2.98 | -0.01 | -0.85 | 0.41 |
| param: stabilityLambda = 0 | 0.08 | -0.62 | 0.06 | 2.99 | -0.01 | -0.83 | 0.40 |
| freeze: energy-system overhead -> production | 3.13 | 3.21 | 0.05 | 2.47 | 1.45 | 2.82 | -1.25 |
| param: savingsPremium = 0 | -0.05 | 1.50 | 0.07 | 3.40 | 0.50 | 1.81 | -2.53 |
| param: financingSpreadScale = 0 | -0.10 | 1.49 | -0.08 | -3.43 | 2.17 | 1.53 | 1.79 |
| freeze: safe rate -> energy (WACC debt) | 0.10 | -1.55 | 0.08 | 3.47 | -0.80 | -3.16 | 1.29 |
| freeze: climate damages -> demand (regional shares) | -0.14 | -1.53 | 0.08 | 3.47 | 1.19 | 1.27 | -0.87 |
| param: capital savings demography response = 0 | 0.03 | -1.58 | 0.08 | 3.77 | 1.94 | 1.74 | -1.97 |
| param: leverageDamping = 0 | 0.13 | -2.78 | -0.01 | -0.75 | 1.31 | -3.86 | 1.05 |
| freeze: net energy factor -> capital | 0.48 | 4.71 | 0.06 | 3.00 | -0.09 | 4.72 | -0.46 |
| param: heavyIndustryGdpElasticity = 1 | -0.04 | -0.85 | 0.11 | 4.76 | -0.12 | -0.73 | 0.65 |
| freeze: savings -> energy (home bias) | 0.07 | -2.11 | 0.11 | 4.84 | -1.25 | -2.26 | 0.77 |
| param: longStorage.growthRate = 0 | -0.02 | -2.74 | 0.15 | 6.79 | 1.44 | -6.59 | 0.88 |
| freeze: college share -> production (org. efficiency) | -5.11 | -8.18 | -0.07 | -2.79 | 2.34 | -7.79 | 0.48 |
| freeze: temperature -> demographics (heat stress) | 1.91 | 7.86 | 0.04 | 1.70 | -2.12 | 8.37 | -1.57 |
| freeze: curtailment -> energy | 0.41 | 1.60 | 0.12 | 5.28 | -8.75 | 2.03 | -1.32 |
| param: climate tipping off (threshold 99) | 2.68 | 9.55 | 0.03 | 1.48 | -0.89 | 8.67 | -0.97 |
| freeze: GDP per capita -> climate (adaptation) | -1.17 | -9.59 | -0.04 | -1.53 | 0.26 | -8.01 | 1.44 |
| param: energy site depletion off | 1.89 | 10.84 | -0.20 | -8.56 | -10.96 | 10.42 | 1.77 |
| freeze: life expectancy -> capital (retirement age) | -0.07 | 1.10 | 0.01 | 0.55 | 0.09 | -1.45 | 22.15 |
| param: retirementAgeResponse = 0 | -0.06 | 1.10 | 0.01 | 0.36 | 0.19 | -1.39 | 22.81 |
| freeze: idle fossil -> energy | -0.18 | 3.84 | -0.32 | -12.95 | -7.97 | 4.92 | 2.83 |
| param: adaptationRate = 0 | -2.82 | -14.96 | -0.05 | -2.20 | 0.73 | -11.91 | 1.91 |
| freeze: energy-burden damage -> production | -10.63 | -11.56 | 0.15 | 12.54 | 0.56 | -16.38 | -0.73 |
| param: safeRateDebtSensitivity = 0 | 0.75 | 7.73 | -0.03 | -1.29 | -0.53 | 18.68 | -33.92 |
| freeze: CDR energy -> production + demand | 0.01 | 0.98 | -0.02 | -0.91 | -0.02 | -20.77 | 0.78 |
| param: fiscalReactionCoeff = 0 | -1.21 | 5.60 | 0.10 | 6.65 | 2.42 | 6.62 | 45.08 |
| freeze: LCOE -> demand (electrification) | -3.36 | -8.80 | 0.18 | 7.96 | 0.97 | -22.95 | 3.87 |
| freeze: temperature -> cdr (deployment) | 0.01 | -4.85 | 0.24 | 10.60 | -0.02 | -23.96 | 0.88 |
| param: cdr.budgetFraction = 0 (no CDR) | 0.01 | -4.84 | 0.24 | 14.83 | -0.02 | -24.08 | 0.85 |
| freeze: climate damages -> production | 6.57 | 25.21 | 0.07 | 3.11 | -0.95 | 19.92 | -1.17 |
| freeze: financing debits -> capital | 4.28 | 29.55 | 0.10 | -5.30 | -2.25 | 29.97 | -1.28 |
| param: dataCenterBaseGrowth = 0 | -27.00 | -16.49 | -0.14 | -6.04 | 7.61 | -32.38 | -5.03 |
| param: ageingCostDeficitShare = 0 | 0.20 | 9.84 | -0.04 | -2.70 | 0.62 | 25.73 | -69.47 |
| param: debtRiskLambda = 0 | 0.52 | 11.79 | -0.09 | -4.24 | -2.92 | 49.56 | -3.21 |
| freeze: regional investment -> energy (clean budget) | -0.36 | -5.56 | 0.79 | 52.09 | 4.69 | -6.64 | 1.46 |
| freeze: return on capital -> demand (robots) | 1.51 | 38.78 | 0.19 | 8.87 | 0.64 | 53.78 | -3.74 |
| freeze: robots + datacenters -> production | -29.44 | -77.54 | -0.33 | -13.97 | 1.12 | -55.73 | 13.17 |
| freeze: automation labor share -> capital | -5.97 | 240.05 | 0.63 | 43.04 | 1.49 | 297.79 | -35.14 |
| param: repressionDebtThreshold = 10 (no repression) | -2.97 | -29.20 | 0.18 | 7.81 | 3.21 | -47.38 | 793.87 |
| freeze: labor share -> demand (robots) | 0.98 | 307.43 | 0.81 | 57.70 | 0.09 | 397.81 | -30.54 |

Population is unaffected by everything except migration and life-expectancy
growth (not shown): demographics takes only temperature as an input and heat
stress acts on productivity, not mortality.

## 5. Outside the model

The energy model is `src/modules` (~22,600 lines). The repository also holds:

| Path | Lines | Relation to the model |
|---|---:|---|
| `src/simulations/` (aviation, e-bike motors, drug supply, outbreak, trade, war settlement, news, heat, critical materials) | ~34,700 | separate models on the framework; only the Hormuz bridge feeds the energy model, through the three shock hooks |
| `aging-places/` | ~15,200 | separate project |
| `packages/forecast-workbench/` | ~10,000 | forecasting tooling |
| `scripts/headlines-2026-07-*.ts`, `forecast-*-replay.ts`, `news-war-ai.ts`, … | part of ~13,500 | dated one-off analyses |

None of this is model logic, but it is most of the code and most of what CI
runs. Moving the side simulations and `aging-places` to their own packages (or
repository), and archiving the dated one-off scripts, would leave the energy
model legible on its own.

Inside the model, 163 of the ~270 module outputs are reporting-only (no module,
transform or lag reads them). That is fine for a model meant to be inspected;
15 are not collected either (`eta`, `regionalAllocation`,
`regionalFuelAvailability`, `robotProfitability`, `dataCenterPowerSpendShare`,
`kPerWorker`, `unfundedRealizedSpend`, `energyShareOfInvestment`, the three
regional transfer components, `publicDebtStock`, `nextPublicDebtStock`,
`cumulativeCapacity`, `regionalCurtailment`) and are worth a check for
invariant or test use before removal. `generations` and `humanCapital` are
already diagnostic and skippable (`diagnostics: false`).

## 6. Suggested order of work

One mechanism per commit, as CLAUDE.md asks.

1. **Bit-identical removals**: capital's investment split (1.1) and its
   exogenous automation share (1.2) are done. Left: the Keen path (1.3), if
   the accounting-applicability report is no longer wanted.
2. **Doc fixes**: food stress as a shock-only channel; repression as
   scenario-specific (4.1). (The `robotsDensity` Key Outputs row is fixed.)
3. **Behavior-changing removals** (each re-blesses the baseline): stability
   (3.2), desertification (3.6), mineral constraint to reporting-only (3.1),
   coal depletion (3.5).
4. **Design questions, not removals**: the India power-build bistability
   (4.5); what the lifecycle savings rate is for (4.4); the ssp1 carbon-price
   ramp (4.6); desired investment saturating at a 4.8% profit rate
   (`investmentProfitRateCeiling`).
5. **Housekeeping**: move the side simulations and `aging-places` out (5).
