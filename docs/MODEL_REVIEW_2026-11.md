# Model review — November 2026: what moves the model, and what doesn't

Reviewed on `main` at `32f03d2`, after the datacenter fixes this review
prompted (#127, #129). First run on `e35ab16`; Section 4.2 records what
changed between the two. No model code is changed by this review; it adds
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
| Reporting only | Mineral constraint -> energy build | binds in 4/22 runs; ≤0.4 on anything | **Make reporting-only** |
| Reporting only | Target leverage (`leverageAdjustmentSpeed`) | ≤1% GDP; private debt/GDP 1.14 -> 1.13 | Keep as a ledger; no more calibration |
| Reporting only | Fossil-resource depletion (EROI) | ≤0.4% GDP, ≤2.1% cumulative CO2 | Drop coal (2,400-year budget); consider gas |
| Remove | Stability / "G/C uncertainty" (`stabilityLambda`) | ≤2.0% GDP; double-counts damages | **Remove** |
| Remove | Desertification (unsourced "Assumption" params) | ≤0.8% cumulative CO2 | **Remove** |
| Small, keep | mining depletion exponent, `cleanShareFlex`, shortfall-led build, water yield, credit sensitivity, curtailment storage boost, regional damage shares | 0.2-2.2% | Keep; low priority for calibration |
| Load-bearing | Financial repression, automation (labor share, income to capital), financing debits, damages, adaptation, tipping, LCOE-led electrification, regional clean budget, ageing deficit share, debt pricing | 10-860 | Keep — and see Section 4 |

## 1. Dead code: remove (bit-identical)

### 1.1 Capital's investment split does nothing

`capital.ts:1714-1721` computes `energyShare` = 15% of orders, moved by the
energy burden. It is used only

- as a fallback when `energyCapexSpend` is absent (`capital.ts:1726, 2071`) —
  it is always present in the wired model; and
- for the reported `energyInvestment` = investment x energyShare
  (`capital.ts:2070`), which the runner hands to energy as
  `availableInvestment` (`simulation-autowired.ts:195`). Energy reads it only
  when `regionalInvestment` is absent (`energy.ts:1793`) — it never is.

Freezing the energy-burden input, freezing `availableInvestment`, and setting
`energyInvestmentSensitivity = 0` all change no output by any amount. The
reported number is also wrong: `energyInvestment` is **$47.7T in 2100**
against energy's realized `energyCapexSpend` of **$7.9T**.

What energy actually builds from is `regionalInvestment` — the region's share
of TOTAL investment, weighted by the lifecycle savings rate — times its clean
share (`energy.ts:2254`). Freezing that moves 2100 GDP 16% and cumulative CO2
47%. See 4.4.

Remove: `baseEnergyInvestmentShare`, `energyInvestmentSensitivity`, the
`energyBurden` input to capital, the `energyInvestment` and
`energyShareOfInvestment` outputs, energy's `availableInvestment` input, and
the `distributeByGDP` fallback.

### 1.2 Two robot densities that disagree

Capital carries an exogenous automation share (2% of K growing 3%/yr to a 20%
cap) and turns it into `robotsDensity` (`capital.ts:2089-2093`). Demand
carries the endogenous fleet (`robotsPer1000`, deployed while marginal value
exceeds marginal cost) that production and capital actually use. Nothing
reads capital's version; `automationGrowth = 0` changes nothing.

They disagree by 3x in the default run: in 2100 capital reports **1,850**
robots per 1,000 workers, demand **596**. CLAUDE.md's Key Outputs table lists
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
| `unfundedInvestmentDemand` | 1.05 (2025) falling to 0 by 2030 | start-up years only |
| `mineralConstraintBySource` | < 1 only in net-zero, ssp1-19, ssp1-26, test-hyper-tax | lithium -> battery (min 0.80), copper -> solar/wind in ssp1-19 (min 0.90) |
| `heatStressLoss` | always 0 in us, oecd-ex-us, china, russia, latam | binds in india, ssa, mena, seasia |
| `stability` | 0.96-1 except test-doomer (0.83) | |

### 2.1 Food stress

Land-budget food stress is zero on every path, so `foodStressElasticity` is
inert. The only way it fires is `resources.foodSupplyShocks`, which only the
Hormuz bridge sets (`src/simulations/critical-materials/hormuz-bridge.ts`).
Keep the production channel as a shock hook; document it as such and stop
describing food stress as an endogenous feedback. The food submodel
(calories, protein, grain) matters only through farmland -> land-use carbon:
freezing temperature into resources moves 2100 GDP ≤0.4%.

### 2.2 Insolvency and the other zeros

CLAUDE.md says insolvency "never binds on the default path" and was needed
because in-range sweeps crashed without it. It never binds in any scenario
either. Keep it as a guard, but the early-repayment branch, the bank-equity
shortfall and `unfundedRealizedSpend` should be checked against
`scripts/parameter-sweep.ts`; if they stay zero there too, remove them.

## 3. Feedbacks that exist but don't matter: make reporting-only

### 3.1 Mineral constraint -> energy build

Binds in 4 of 22 runs. Freezing it at 1.0 moves cumulative CO2 by ≤0.3%,
public debt by ≤0.4pp and everything else by ≤0.1. The
`mineralConstraintBySource` lag, the per-source throttle and its `perMW_*`
bookkeeping exist to deliver that. Make it reporting-only: keep the supply
ratios and the mineral ledger, drop the lag into energy. If
transition-mineral scarcity is a question the model should answer, the
constraint is too weak to answer it as built (no price, transition stream
served first by construction), and that is a redesign, not a parameter.

### 3.2 Stability (`stabilityLambda`) — remove

`stability = 1 / (1 + 2·D²)` with D = last year's climate damages
(`capital.ts:697, 1547`), labelled "uncertainty". It scales investment orders.
Damages already cut GDP, profit and so orders, so this is a second damage
channel on investment. Effect: 0.3% of 2100 GDP in the default, ≤2.0% in
climate-cascade. CLAUDE.md already says the Galbraith/Chen framework is not
implemented; what is left is one unsourced coefficient on a double count.

### 3.3 Bank retention

`bankRetentionSpeed = 0` changes no real output to the last digit: retained
interest moves household income to bank saving, and saving is ex post. It is
correct accounting and already documented as reporting. No change, other than
not spending more calibration effort on it.

### 3.4 Target leverage and the private-debt block

`leverageAdjustmentSpeed = 0` moves default private debt/GDP from 1.14 to
1.13 in 2100 and real outputs by ≤1%. Doubling `baseCreditGrowth` moves 2100
GDP ≤3.2%. Private debt reaches the real economy almost only through
`debtRiskPremium` (which matters: 13% of 2100 GDP). The block is a well-built
ledger; it is not a driver. Treat new private-debt mechanisms as reporting
unless they act on the risk premium or the investment cap. (Known limitation,
per the session that built #127: the leverage target covers general capital
only, not the robot and datacenter stocks.)

### 3.5 Fossil-resource depletion

Removing depletion entirely (`recoverableResources` = 1e12) moves 2100 GDP
≤0.4% and cumulative CO2 ≤2.1%. Coal's budget is 2,400 years of 2025
production, so coal depletion cannot matter before 2100. The mechanism earned
its place by replacing a proved-reserves version that blew up gas LCOE; at
resource-scale budgets it does very little. Remove the coal half; keep gas
only if a high-gas scenario is expected to approach 200 years of cumulative
use.

### 3.6 Desertification — remove

Two parameters marked "Assumption" (`desertificationRate`,
`desertificationClimateCoeff`), with no source, move cumulative CO2 ≤0.8%.
They tighten a land budget that never binds (2.1).

## 4. Load-bearing — and what that shows

### 4.1 Financial repression is the fiscal closure

With repression disabled (threshold 10), public debt/GDP in 2100 rises
**+857pp** and 2100 GDP falls 6-41% (default −28%). The Bohn fiscal reaction
saturates at `fiscalReactionMax` (4% of GDP) and cannot hold debt. In the
default run public debt crosses the 150% threshold around 2072 and then sits
on it (1.57 -> 1.64 for 2075-2100) because repression caps the safe rate. So
the model's headline debt path is set by `repressionDebtThreshold` — a
judgment parameter. Keep the mechanism; state in CLAUDE.md that it is the
closure, not an add-on. `ageingCostDeficitShare` (−78pp) and
`safeRateDebtSensitivity` (−35pp) are the other two big debt dials.

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

Now: freezing datacenter growth moves default 2100 GDP −0.3%, and in
ai-energy-boom −12% in 2050 and −3% in 2100 (the AI payoff is on there).
Financing debits fell from 354% to 33% on the freeze test, and the
return-on-capital -> energy WACC channel from 34% to 1.9%: both had been
carrying the lock-in. ai-energy-boom's ceiling is 10x the default, so its
datacenters run at ~13% of GDP by 2100; treat it as the stress test it says
it is.

### 4.3 Automation is now the largest mover

`automationIncomeToCapital = 0` (robot and AI income paid as wages) raises
2100 GDP 12-14% in the default, net-zero and ssp1-19, and 48% in
ai-energy-boom (electricity +163%). Freezing the lagged labor share that robots
price against moves 2100 GDP up to 59%. The automation loop (robots value the
wage they displace; their income lowers the labor share; the next robot is
worth less) is the model's main late-century GDP dial alongside climate
damages, ahead of anything in energy. `robotIntegrationExponent` remains its
judgment parameter (docs/SENSITIVITY.md).

### 4.4 Savings rates act only as a map

Saving is ex post in the monetary circuit, so the lifecycle savings machinery
(`savingsWorking`, `savingsPremium`, the life-expectancy and dependency
responses) cannot change total investment. It still moves 2100 GDP ~7%,
entirely through two geographic channels: the regional allocation of total
investment that sets each region's clean-energy budget (1.1; freezing that
allocation moves cumulative CO2 47%), and the home-bias WACC drift. The model
has a desired-saving theory whose only job is a regional allocation weight.
Either name it that, or tie the clean budget to energy's own capex demand so
the weight can go.

### 4.5 CDR sits on its cap, and is knife-edged in debt-populism

Default CDR ramps from ~2050 and reaches `maxDeployRate` (15 Gt/yr) by ~2090;
most scenarios end on the cap, so the NPV/SCC deployment rule mostly decides
the start date and the cap decides the level. Removing CDR raises 2100
warming up to 0.26°C. In debt-populism, 2100 CDR is 12.9 Gt in the base run,
10.6 Gt with depletion off (GDP +0.4%) and 5.2 Gt with credit growth doubled
(GDP −1.9%). Any debt-populism comparison that reads 2100 CDR or warming is
reading that sensitivity.

### 4.6 ssp1-19 starts with an $800/t shock

ssp1-19 and ssp1-26 apply $800/t from 2025. Energy burden starts at 17% of
GDP; as fuels switch, its unwinding is a growth tailwind (GDP +5.6-7%/yr in
2026-30) and ssp1-19 ends with the highest 2100 GDP of any scenario ($4,540T
vs $2,147T default). Freezing the burden damage at its 2025 level costs
ssp1-19 15% of 2100 GDP, which is the size of the artifact. A carbon-price
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
| freeze: non-electric fuels -> energy (depletion) | 0.00 | 0.07 | 0.00 | 0.04 | 0.00 | 0.13 | 0.12 |
| freeze: mineral constraint -> energy | 0.02 | -0.11 | -0.00 | -0.32 | -0.02 | 0.02 | 0.36 |
| freeze: shortfall -> energy | -0.01 | -0.41 | -0.00 | -0.31 | -0.00 | -0.38 | 0.40 |
| param: cleanShareFlex = 1 | -0.05 | -0.36 | -0.01 | -0.44 | -0.00 | -0.36 | 0.55 |
| freeze: temperature -> resources (yields, water, land) | 0.22 | 0.38 | -0.02 | -0.51 | -0.01 | 0.35 | 0.41 |
| param: resources mining depletion exponent = 0 | 0.04 | 0.43 | -0.01 | 0.63 | 0.00 | 0.25 | -0.87 |
| param: resources water yield sensitivity = 0 | 0.17 | 0.27 | -0.01 | -0.77 | -0.01 | 0.25 | 0.38 |
| param: resources desertification off | 0.07 | 0.22 | -0.02 | -0.83 | -0.00 | 0.21 | 0.39 |
| param: creditSensitivity = 0 | -0.01 | -0.22 | 0.01 | 0.55 | 0.01 | -0.90 | 0.14 |
| param: leverageAdjustmentSpeed = 0 | 0.01 | 0.98 | -0.01 | -0.13 | 0.03 | 0.68 | -1.52 |
| freeze: GDP -> resources (minerals, food, land) | 0.15 | 0.63 | -0.02 | -1.15 | -0.01 | 0.30 | -1.23 |
| param: curtailmentStorageBoost = 0 | -0.39 | 0.69 | 0.03 | 1.15 | 0.62 | 0.29 | 0.61 |
| freeze: resource energy -> production | 0.94 | 1.24 | 0.02 | 0.83 | 0.11 | 1.11 | -1.20 |
| freeze: climate damages -> capital (stability) | 0.14 | 1.84 | 0.00 | 0.22 | -0.01 | 1.71 | -1.46 |
| param: stabilityLambda = 0 | 0.16 | 1.95 | 0.00 | 0.24 | -0.01 | 1.81 | -1.67 |
| freeze: climate damages -> demand (regional shares) | -0.18 | 0.87 | 0.04 | 2.17 | 0.27 | 1.68 | -1.53 |
| param: energy fossil depletion off | 0.02 | 0.39 | 0.04 | 2.09 | 0.03 | -2.20 | -0.32 |
| param: leverageDamping = 0 | 0.38 | 1.15 | 0.04 | 1.71 | -0.92 | -2.33 | -2.00 |
| freeze: return on capital -> energy (WACC equity) | 0.16 | 1.91 | -0.04 | -2.84 | -1.29 | 2.71 | -1.61 |
| freeze: safe rate -> energy (WACC debt) | 0.63 | 1.39 | -0.06 | -2.81 | -1.85 | -3.98 | -1.08 |
| freeze: regional burden + reliability -> demand | -0.88 | -3.68 | 0.06 | 4.12 | -2.04 | -3.98 | 4.35 |
| freeze: savings -> energy (home bias) | -0.12 | 1.22 | 0.07 | 4.28 | 0.75 | -3.05 | -1.28 |
| param: heavyIndustryGdpElasticity = 1 | -0.05 | -1.35 | 0.11 | 4.49 | 0.02 | -3.25 | -0.61 |
| freeze: temperature -> demographics (heat stress) | 0.81 | 4.72 | 0.02 | 1.17 | -0.54 | 4.41 | -1.66 |
| freeze: net energy factor -> capital | 0.64 | 4.84 | 0.04 | 1.73 | 0.05 | 4.64 | -1.11 |
| param: financingSpreadScale = 0 | -0.70 | 1.52 | 0.09 | 5.36 | 4.16 | -3.84 | -1.55 |
| param: capital savings demography response = 0 | -0.04 | 6.66 | 0.04 | 2.15 | -0.27 | 4.94 | -5.55 |
| param: savingsPremium = 0 | 0.38 | 6.86 | 0.04 | 2.71 | -0.87 | 6.10 | -6.21 |
| freeze: temperature -> cdr (deployment) | 0.17 | -2.42 | 0.14 | 7.85 | -0.02 | -10.68 | -2.30 |
| freeze: CDR energy -> production + demand | 0.23 | 2.07 | -0.05 | -1.88 | 0.09 | -11.56 | -2.43 |
| freeze: life expectancy -> capital (retirement age) | -0.12 | 2.45 | 0.02 | 1.31 | 0.09 | 3.84 | 24.60 |
| param: retirementAgeResponse = 0 | -0.12 | 2.44 | 0.02 | 1.16 | 0.09 | 3.86 | 26.30 |
| freeze: curtailment -> energy | 1.16 | 4.16 | 0.15 | 6.51 | -13.19 | 5.07 | -2.64 |
| param: longStorage.growthRate = 0 | -0.05 | -3.61 | 0.21 | 13.54 | 0.65 | -4.73 | -4.64 |
| freeze: energy-system overhead -> production | 13.22 | 13.90 | 0.19 | 9.49 | 1.71 | 13.48 | -5.18 |
| param: energy site depletion off | 5.29 | 14.22 | -0.17 | -8.30 | -11.79 | 12.41 | -5.50 |
| freeze: energy-burden damage -> production | -15.67 | -15.27 | -0.11 | -7.88 | 0.32 | -13.39 | -1.21 |
| freeze: college share -> production (org. efficiency) | -9.02 | -15.35 | -0.19 | -7.42 | 5.34 | -15.90 | -1.99 |
| param: cdr.budgetFraction = 0 (no CDR) | 0.26 | -6.78 | 0.26 | 15.54 | 0.09 | -16.67 | -2.35 |
| freeze: idle fossil -> energy | 2.37 | 3.38 | -0.41 | -16.88 | -10.75 | 3.37 | -1.04 |
| param: climate tipping off (threshold 99) | 4.06 | 17.35 | 0.07 | 4.18 | -0.95 | 17.52 | -2.46 |
| freeze: GDP per capita -> climate (adaptation) | -2.14 | -17.54 | -0.09 | -3.56 | -0.91 | -15.51 | 5.38 |
| param: fiscalReactionCoeff = 0 | -2.89 | 7.92 | 0.15 | 6.27 | 6.16 | 17.17 | 40.97 |
| param: dataCenterBaseGrowth = 0 | -11.72 | -3.29 | -0.07 | -2.52 | 4.74 | -24.02 | -1.89 |
| param: adaptationRate = 0 | -4.70 | -27.83 | -0.13 | -4.97 | -0.91 | -24.37 | 5.08 |
| freeze: return on capital -> demand (robots) | 0.35 | 13.22 | 0.09 | 3.82 | 0.14 | 28.76 | -1.12 |
| freeze: LCOE -> demand (electrification) | -3.48 | -16.98 | 0.16 | 7.85 | -2.09 | -32.88 | 4.44 |
| freeze: financing debits -> capital | 7.23 | 33.17 | 0.13 | 5.74 | -1.08 | 32.40 | -1.10 |
| param: safeRateDebtSensitivity = 0 | 3.57 | 11.85 | -0.05 | -2.52 | -3.24 | 35.99 | -34.71 |
| freeze: climate damages -> production | 9.42 | 34.77 | 0.17 | 8.43 | -0.74 | 36.17 | -7.28 |
| param: ageingCostDeficitShare = 0 | 0.43 | 8.13 | -0.05 | -2.34 | -1.33 | 30.57 | -78.49 |
| param: debtRiskLambda = 0 | 1.36 | 12.83 | -0.09 | -5.24 | -3.20 | 40.59 | -7.23 |
| freeze: regional investment -> energy (clean budget) | -1.25 | -16.13 | 0.71 | 46.84 | 3.75 | -16.77 | -6.11 |
| freeze: robots + datacenters -> production | 9.23 | 24.25 | 0.18 | 9.26 | -2.04 | 149.07 | 5.09 |
| freeze: automation labor share -> capital | -6.74 | 48.02 | 0.27 | 15.85 | -1.59 | 163.33 | -8.72 |
| freeze: labor share -> demand (robots) | 0.34 | 59.08 | 0.44 | 27.97 | 0.09 | 223.41 | 9.35 |
| param: repressionDebtThreshold = 10 (no repression) | -8.18 | -40.86 | 0.14 | 7.71 | 4.82 | -60.16 | 857.17 |

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

1. **Bit-identical removals** (regression baseline unchanged apart from
   removed fields): capital's investment split and energy's
   `availableInvestment` (1.1); capital's exogenous automation share,
   repointing `robotsDensity` users to `robotsPer1000` (1.2); optionally the
   Keen path (1.3).
2. **Doc fixes**: the `robotsDensity` Key Outputs row in CLAUDE.md; state
   that financial repression is the fiscal closure; food stress as a
   shock-only channel. (The datacenter doc fixes landed with #127 and #129.)
3. **Behavior-changing removals** (each re-blesses the baseline): stability
   (3.2), desertification (3.6), mineral constraint to reporting-only (3.1),
   coal depletion (3.5).
4. **Design questions, not removals**: what the lifecycle savings rate is for
   (4.4); the ssp1 carbon-price ramp (4.6); desired investment saturating at
   a 4.8% profit rate (`investmentProfitRateCeiling`), so capital cannot
   respond to very high returns in any scenario; the leverage target covering
   general capital only (3.4).
5. **Housekeeping**: move the side simulations and `aging-places` out (5).
