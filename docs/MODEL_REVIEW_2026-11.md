# Model review — November 2026: what moves the model, and what doesn't

Reviewed commit `e35ab16`. No model code is changed by this review; it adds
`scripts/feedback-ablation.ts`, which reproduces every number below.

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
npx tsx scripts/feedback-ablation.ts            # ~13 min, both modes
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
| Reporting only | Mineral constraint -> energy build | binds in 4/22 runs; ≤0.06 on anything | **Make reporting-only** |
| Reporting only | Target leverage (`leverageAdjustmentSpeed`) | ≤0.5% GDP; private debt/GDP 1.19 -> 1.14 | Keep as a ledger; no more calibration |
| Reporting only | Fossil-resource depletion (EROI) | ≤0.1% GDP except debt-populism 1.4% | Drop coal (2,400-year budget); consider gas |
| Remove | Stability / "G/C uncertainty" (`stabilityLambda`) | ≤2.4% GDP; double-counts damages | **Remove** |
| Remove | Desertification (unsourced "Assumption" params) | ≤0.8% cumulative CO2 | **Remove** |
| Small, keep | mining depletion exponent, `cleanShareFlex`, shortfall-led build, regional damage shares, water yield, home bias, curtailment storage boost | 0.3-2.8% | Keep; low priority for calibration |
| Load-bearing | Financial repression, financing debits, WACC equity, datacenters, automation labor share, damages, adaptation, tipping, ageing deficit share | 10-850 | Keep — and see Section 4 |

## 1. Dead code: remove (bit-identical)

### 1.1 Capital's investment split does nothing

`capital.ts:1605-1611` computes `energyShare` = 15% of orders, moved by the
energy burden. It is used only

- as a fallback when `energyCapexSpend` is absent (`capital.ts:1617, 1635`) —
  it is always present in the wired model; and
- for the reported `energyInvestment` = investment x energyShare
  (`capital.ts:1951`), which the runner hands to energy as
  `availableInvestment` (`simulation-autowired.ts:195`). Energy reads it only
  when `regionalInvestment` is absent (`energy.ts:1793`) — it never is.

Freezing the energy-burden input, freezing `availableInvestment`, and setting
`energyInvestmentSensitivity = 0` all change no output by any amount. The
reported number is also wrong: `energyInvestment` is **$39.7T in 2100**
against energy's realized `energyCapexSpend` of **$8.1T**.

What energy actually builds from is `regionalInvestment` — the region's share
of TOTAL investment, weighted by the lifecycle savings rate — times its clean
share (`energy.ts:2254`). Freezing that moves 2100 GDP 12.7%. See 4.4.

Remove: `baseEnergyInvestmentShare`, `energyInvestmentSensitivity`, the
`energyBurden` input to capital, the `energyInvestment` and
`energyShareOfInvestment` outputs, energy's `availableInvestment` input, and
the `distributeByGDP` fallback.

### 1.2 Two robot densities that disagree

Capital carries an exogenous automation share (2% of K growing 3%/yr to a 20%
cap) and turns it into `robotsDensity` (`capital.ts:1971-1978`). Demand
carries the endogenous fleet (`robotsPer1000`, deployed while marginal value
exceeds marginal cost) that production and capital actually use. Nothing
reads capital's version; `automationGrowth = 0` changes nothing.

They disagree by 3x: in 2100 capital reports **1,623** robots per 1,000
workers, demand **542**. CLAUDE.md's Key Outputs table lists `robotsDensity`
("Robots per 1000 workers") — the exogenous one — while the Automation section
quotes demand's ~580. Remove capital's four parameters and two outputs and
point the `robotsDensity` row, `scripts/wide-table.ts`,
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
| `unfundedInvestmentDemand` | 0.46 (2025), 0.20 (2026), then 0 | seed-year only |
| `mineralConstraintBySource` | < 1 only in net-zero, ssp1-19, ssp1-26, test-hyper-tax | lithium -> battery (min 0.69), copper -> solar/wind (min 0.91) |
| `heatStressLoss` | always 0 in us, oecd-ex-us, china, russia, latam | binds in india, ssa, mena, seasia |
| `stability` | 0.996-1 except test-doomer (0.83) | |

### 2.1 Food stress

Land-budget food stress is zero on every path, so `foodStressElasticity` is
inert. The only way it fires is `resources.foodSupplyShocks`, which only the
Hormuz bridge sets (`src/simulations/critical-materials/hormuz-bridge.ts`).
Keep the production channel as a shock hook; document it as such and stop
describing food stress as an endogenous feedback. The food submodel
(calories, protein, grain) still matters through farmland -> land-use carbon:
freezing temperature into resources moves 2100 GDP ≤1.9%.

### 2.2 Insolvency and the other zeros

CLAUDE.md says insolvency "never binds on the default path" and was needed
because in-range sweeps crashed without it. It never binds in any scenario
either. Keep it as a guard, but the early-repayment branch, the bank-equity
shortfall and `unfundedRealizedSpend` should be checked against
`scripts/parameter-sweep.ts`; if they stay zero there too, remove them.

## 3. Feedbacks that exist but don't matter: make reporting-only

### 3.1 Mineral constraint -> energy build

Binds in 4 of 22 runs. Where it binds, freezing it at 1.0 moves fossil share
by ≤0.05pp and every other output by ≤0.06%. The `mineralConstraintBySource`
lag, the per-source throttle and its `perMW_*` bookkeeping exist to deliver
that. Make it reporting-only: keep the supply ratios and the mineral ledger,
drop the lag into energy. If transition-mineral scarcity is a question the
model should answer, the constraint is too weak to answer it as built (no
price, transition stream served first by construction), and that is a
redesign, not a parameter.

### 3.2 Stability (`stabilityLambda`) — remove

`stability = 1 / (1 + 2·D²)` with D = last year's climate damages
(`capital.ts:673, 1437`), labelled "uncertainty". It scales investment orders.
Damages already cut GDP, profit and so orders, so this is a second damage
channel on investment. Effect: 0.3% of 2100 GDP in the default, ≤2.4% in
climate-cascade and debt-populism. CLAUDE.md already says the Galbraith/Chen
framework is not implemented; what is left is one unsourced coefficient on a
double count.

### 3.3 Bank retention

`bankRetentionSpeed = 0` changes no real output to the last digit: retained
interest moves household income to bank saving, and saving is ex post. It is
correct accounting and already documented as reporting. No change, other than
not spending more calibration effort on it.

### 3.4 Target leverage and the private-debt block

`leverageAdjustmentSpeed = 0` moves private debt/GDP from 1.19 to 1.14 in
2100 and real outputs by ≤0.5%. Doubling `baseCreditGrowth` moves GDP ≤2.6%.
Private debt reaches the real economy almost only through `debtRiskPremium`
(which matters: 12% of 2100 GDP). The block is a well-built ledger; it is not
a driver. Treat new private-debt mechanisms as reporting unless they act on
the risk premium or the investment cap.

### 3.5 Fossil-resource depletion

Removing depletion entirely (`recoverableResources` = 1e12) moves 2100 GDP
≤0.12% in every scenario except debt-populism (1.4%, through a CDR knife-edge,
see 4.3). Coal's budget is 2,400 years of 2025 production, so coal depletion
cannot matter before 2100. The mechanism earned its place by replacing a
proved-reserves version that blew up gas LCOE; at resource-scale budgets it
does very little. Remove the coal half; keep gas only if a high-gas scenario
is expected to approach 200 years of cumulative use.

### 3.6 Desertification — remove

Two parameters marked "Assumption" (`desertificationRate`,
`desertificationClimateCoeff`), with no source, move cumulative CO2 ≤0.8%.
They tighten a land budget that never binds (2.1).

## 4. Load-bearing — and what that shows

### 4.1 Financial repression is the fiscal closure

With repression disabled (threshold 10), public debt/GDP in 2100 rises
**+855pp** and 2100 GDP falls 27-40%. The Bohn fiscal reaction saturates at
`fiscalReactionMax` (4% of GDP) and cannot hold debt. In the default run
public debt crosses the 150% threshold around 2072 and then sits on it
(1.58 -> 1.62 for 2075-2100) because repression caps the safe rate. So the
model's headline debt path is set by `repressionDebtThreshold` — a judgment
parameter. Keep the mechanism; state in CLAUDE.md that it is the closure, not
an add-on. `ageingCostDeficitShare` (−75pp) and `safeRateDebtSensitivity`
(−35pp) are the other two big debt dials.

### 4.2 Datacenters are a cost sink, not "GDP-neutral"

CLAUDE.md calls datacenters a "GDP-neutral electricity sink". They are not:
their load is subtracted from productive useful energy
(`production.ts:430-434`) and their capex is debited from the investment pool,
with no output unless `aiWorkerEquivalentPerTWh` > 0. Freezing their growth
**raises** 2100 GDP 7.8% (default), 18% (ssp1-19) and **130%**
(ai-energy-boom, where the AI payoff is on). `docs/SENSITIVITY.md` already
says they are no longer GDP-neutral; CLAUDE.md is stale. Either give them a
default payoff (their services are in measured GDP) or say plainly that the
default treats compute as pure cost.

The ai-energy-boom description is also stale: it says GDP "~$3,956T" in 2100;
the current model gives **$1,204T**.

### 4.3 CDR sits on its cap, and is knife-edged in debt-populism

CDR ramps from ~2065 and hits `maxDeployRate` (15 Gt/yr) by 2100 in most
scenarios, so the NPV/SCC deployment rule mostly decides the start date and
the cap decides the level. In debt-populism, 2100 CDR is 11.9 Gt in the base
run and 0, 5.2 or 6.7 Gt under perturbations that move GDP by 1-2% (stability
off, depletion off, credit growth doubled). Any debt-populism comparison that
reads 2100 CDR or warming is reading that knife-edge.

### 4.4 Savings rates act only as a map

Saving is ex post in the monetary circuit, so the lifecycle savings machinery
(`savingsWorking`, `savingsPremium`, the life-expectancy and dependency
responses) cannot change total investment. It still moves 2100 GDP 6-7%,
entirely through two geographic channels: the regional allocation of total
investment that sets each region's clean-energy budget (1.1), and the
home-bias WACC drift. The model has a desired-saving theory whose only job is
a regional allocation weight. Either name it that, or tie the clean budget to
energy's own capex demand so the weight can go.

### 4.5 ssp1-19 starts with an $800/t shock

ssp1-19 and ssp1-26 apply $800/t from 2025. Energy burden starts at 17% of
GDP and the burden damage at 9%; as fuels switch, its unwinding is a growth
tailwind (GDP +5.6-7%/yr in 2026-30) and ssp1-19 ends with the highest 2100
GDP of any scenario ($3,720T vs $1,951T default). A carbon-price path that
ramps from the 2025 regional mix would remove the artifact.

### 4.6 Full ranking

Largest absolute change across the 9 scenarios; sorted from least to most.
GDP and emissions in %, temperature in °C, fossil share and public debt in pp.

| Mechanism | GDP 2050 | GDP 2100 | T 2100 | cum CO2 | fossil 2050 | elec 2100 | pub debt |
|---|---:|---:|---:|---:|---:|---:|---:|
| freeze: food stress -> production | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| freeze: energy burden -> capital (investment split) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| freeze: energy-investment share -> energy | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| param: bankRetentionSpeed = 0 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| param: energyInvestmentSensitivity = 0 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| param: capital automationGrowth = 0 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| param: foodStressElasticity = 0 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| freeze: mineral constraint -> energy | 0.03 | -0.04 | -0.00 | -0.03 | -0.05 | -0.04 | -0.06 |
| freeze: non-electric fuels -> depletion | 0.00 | 0.39 | 0.00 | 0.19 | 0.00 | 0.24 | -0.26 |
| param: leverageAdjustmentSpeed = 0 | 0.02 | 0.41 | -0.01 | -0.46 | -0.03 | 0.47 | -0.25 |
| param: mining depletion exponent = 0 | 0.05 | 0.52 | 0.01 | 0.23 | -0.00 | 0.34 | -0.29 |
| freeze: shortfall -> energy | -0.24 | -0.64 | 0.01 | 0.50 | 0.04 | -0.30 | -0.21 |
| param: desertification off | 0.07 | 0.26 | -0.01 | -0.80 | -0.00 | 0.25 | -0.08 |
| param: cleanShareFlex = 1 | -0.08 | -0.30 | -0.02 | -1.30 | -0.01 | -0.38 | 0.07 |
| freeze: climate damages -> demand (regional shares) | 0.82 | 1.00 | 0.02 | 1.02 | -0.76 | 1.80 | -1.33 |
| freeze: resource energy -> production | 1.81 | 0.82 | 0.02 | 1.08 | -0.79 | 0.75 | -0.59 |
| param: curtailmentStorageBoost = 0 | 0.71 | 0.30 | 0.04 | 1.90 | 1.49 | 0.63 | -0.69 |
| param: stabilityLambda = 0 | 0.18 | 2.41 | 0.01 | 0.58 | -0.01 | -2.36 | -1.69 |
| freeze: temperature -> resources | 0.21 | 1.88 | -0.02 | -0.56 | -0.10 | -2.68 | -1.73 |
| param: water yield sensitivity = 0 | 0.16 | 1.86 | -0.01 | -0.85 | -0.02 | -2.72 | -2.03 |
| param: financingHomeBias = 0 | 0.59 | 1.57 | 0.05 | 2.41 | -1.16 | -2.84 | -1.84 |
| freeze: GDP -> resources | 0.15 | 1.43 | -0.02 | -1.22 | -0.10 | -3.06 | -1.81 |
| freeze: regional burden + reliability -> demand | -0.79 | -2.70 | -0.03 | 1.42 | 1.91 | -3.33 | 3.40 |
| param: heavyIndustryGdpElasticity = 1 | -0.05 | -0.94 | 0.08 | 3.38 | 0.02 | -1.12 | 0.48 |
| param: fossil depletion off | 0.01 | 1.41 | 0.01 | 0.78 | 0.67 | -3.87 | -1.40 |
| param: creditSensitivity = 0 | -0.02 | 1.35 | 0.01 | 0.53 | 0.01 | -3.98 | -1.94 |
| param: financingSpreadScale = 0 | 0.72 | 1.42 | -0.10 | -4.02 | 3.55 | -3.98 | 2.15 |
| param: leverageDamping = 0 | -0.10 | -1.59 | -0.02 | -1.00 | 0.17 | -4.09 | -1.98 |
| param: heat stress off | 0.88 | 4.43 | 0.02 | 1.22 | 0.64 | 4.67 | -1.68 |
| freeze: net energy factor -> capital | 0.64 | 5.14 | -0.06 | -2.25 | 0.65 | 4.99 | -2.37 |
| freeze: safe rate -> energy (WACC debt) | 0.74 | -1.81 | -0.08 | -4.24 | 2.49 | -5.33 | -1.42 |
| param: savingsPremium = 0 | 0.23 | 6.07 | -0.04 | 2.40 | 1.47 | 1.87 | -6.28 |
| param: savings demography response = 0 | 0.68 | 6.58 | -0.04 | -1.75 | 1.12 | 1.31 | -7.08 |
| freeze: temperature -> cdr | 0.25 | 2.30 | 0.13 | 7.34 | 0.03 | -10.72 | -3.35 |
| freeze: CDR energy -> production + demand | 0.27 | 2.36 | -0.05 | -2.14 | 0.03 | -10.86 | -3.44 |
| freeze: return on capital -> demand (robots) | 0.17 | 9.51 | 0.05 | 2.02 | -0.02 | 11.26 | -2.81 |
| param: retirementAgeResponse = 0 | -0.12 | 2.71 | 0.02 | 0.83 | 0.59 | -4.72 | 23.65 |
| freeze: curtailment -> energy | 1.19 | 2.57 | -0.10 | -3.80 | -11.49 | 3.84 | 1.92 |
| freeze: regional investment -> energy (clean budget) | -0.53 | -12.66 | 0.20 | 9.18 | 4.71 | -12.21 | -5.17 |
| param: site depletion off | 5.20 | 13.58 | -0.19 | -9.19 | -10.93 | 12.96 | -3.74 |
| param: no CDR | 0.28 | -4.06 | 0.26 | 10.20 | 0.03 | -13.95 | -3.37 |
| param: long storage growth = 0 | -0.07 | -5.11 | 0.22 | 14.07 | 0.37 | -8.52 | -4.77 |
| freeze: college share -> production | -8.80 | -14.70 | -0.15 | -5.74 | 2.54 | -15.47 | -1.05 |
| freeze: energy-burden damage -> production | -15.51 | -13.63 | -0.15 | -10.73 | 0.46 | -11.47 | -1.01 |
| freeze: GDP per capita -> climate (adaptation) | -1.95 | -15.79 | -0.06 | -3.35 | 3.61 | -13.82 | 3.53 |
| freeze: energy-system overhead -> production | 16.33 | 12.40 | 0.15 | 6.81 | 3.52 | 12.69 | -3.72 |
| param: tipping off | 4.04 | 17.29 | 0.08 | 3.73 | -0.83 | 18.15 | 2.47 |
| param: fiscalReactionCoeff = 0 | -2.53 | 8.66 | 0.05 | 2.58 | 5.41 | 16.70 | 39.15 |
| freeze: idle fossil -> energy | 1.77 | 3.41 | -0.51 | -20.56 | -9.81 | 3.52 | 2.54 |
| param: adaptationRate = 0 | -4.36 | -24.56 | -0.13 | -5.09 | 3.78 | -21.36 | 5.31 |
| param: debtRiskLambda = 0 | 1.33 | 11.90 | -0.11 | -5.64 | -2.13 | 35.27 | -7.36 |
| freeze: LCOE -> demand (electrification) | -4.10 | 26.28 | -0.13 | -5.68 | 2.99 | -35.29 | 4.59 |
| param: safeRateDebtSensitivity = 0 | 3.59 | 11.94 | -0.11 | -5.35 | -1.07 | 36.32 | -35.38 |
| freeze: climate damages -> production | 9.49 | 35.07 | 0.17 | 7.41 | 1.14 | 36.90 | -4.05 |
| param: ageingCostDeficitShare = 0 | 0.86 | 5.64 | -0.12 | -5.01 | -0.86 | 28.17 | -74.68 |
| freeze: robots + datacenters -> production | 20.95 | 25.11 | 0.24 | 11.52 | -1.04 | 51.90 | 2.98 |
| param: automationIncomeToCapital = 0 | 0.99 | 33.62 | 0.12 | 5.47 | -0.80 | 59.10 | -9.58 |
| freeze: labor share -> demand (robots) | 1.00 | 33.53 | 0.14 | 6.57 | -0.80 | 59.91 | -9.69 |
| freeze: return on capital -> energy (WACC equity) | -0.15 | 33.98 | -0.05 | -2.62 | -0.64 | 85.14 | -2.46 |
| param: dataCenterBaseGrowth = 0 | -8.94 | 130.46 | -0.15 | -5.38 | 1.48 | 51.32 | -3.95 |
| freeze: financing debits -> capital | 12.28 | 353.69 | 0.70 | 46.72 | 1.11 | 409.48 | -4.70 |
| param: no repression (threshold 10) | -8.19 | -40.36 | 0.13 | 7.10 | 5.15 | -60.06 | 855.25 |

Population is unaffected by everything except migration and life-expectancy
growth (not shown): demographics takes only temperature as an input and heat
stress acts on productivity, not mortality. Some freeze rows duplicate their
parameter row exactly (home bias, heat stress, automation labor share); those
duplicates are omitted.

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

1. **Bit-identical removals** (regression baseline unchanged apart from
   removed fields): capital's investment split and energy's
   `availableInvestment` (1.1); capital's exogenous automation share,
   repointing `robotsDensity` users to `robotsPer1000` (1.2); optionally the
   Keen path (1.3).
2. **Doc fixes**: CLAUDE.md's "GDP-neutral" datacenter line and the
   `robotsDensity` Key Outputs row; the ai-energy-boom description; state that
   financial repression is the fiscal closure; food stress as a shock-only
   channel.
3. **Behavior-changing removals** (each re-blesses the baseline): stability
   (3.2), desertification (3.6), mineral constraint to reporting-only (3.1),
   coal depletion (3.5).
4. **Design questions, not removals**: a default datacenter payoff (4.2); what
   the lifecycle savings rate is for (4.4); the ssp1 carbon-price ramp (4.5).
5. **Housekeeping**: move the side simulations and `aging-places` out (5).
