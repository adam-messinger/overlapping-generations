# Lessons from the 1950--2025 Historical Backcast

**Adam Messinger**
*Research Note, February 2026*

---

## Abstract

We attempted to run the overlapping-generations simulation backward from 1950 to 2025, comparing outputs against observed historical data for population, GDP, electricity generation, electrification, CO2 concentration, and temperature. The exercise surfaced four structural issues in the model's forward-running architecture, identified a missing credit/debt channel as the binding constraint on historical GDP reproduction, and generated calibration lessons that apply to the 2025--2100 baseline.

---

## 1. The Experiment

The backcast used a `historical-1950.json` scenario file with 1950 initial conditions: 2.5 billion people, $5 trillion GDP, 152 GW of coal capacity, negligible renewables, 5% electrification. Demographics used exogenous population (UN DESA decadal data, linearly interpolated) to eliminate population as a source of error. Energy, demand, and production parameters were recalibrated to 1950 conditions.

### Best-achieved fit (R-squared)

| Metric | R-squared | Sim 2025 | Observed 2025 | Gap |
|--------|-----------|----------|---------------|-----|
| Population | 1.00 | 8.10B | 8.10B | 0% |
| CO2 | 0.76 | 463 ppm | 425 ppm | +9% |
| Temperature | 0.62 | 1.42 C | 1.45 C | -2% |
| Electricity | 0.19 | 12,630 TWh | 30,000 TWh | -58% |
| GDP | -0.33 | $27T | $158T | -83% |

Population matches by construction (exogenous). CO2 and temperature are reasonable. Electricity and GDP are far off. The GDP gap is the central failure.

---

## 2. Structural Issues Discovered

### 2.1 The GDP--Energy Death Spiral

The model's most important circular dependency is: Production uses lagged useful energy to compute GDP. Demand uses GDP to compute energy demand. When GDP is low (as in 1950), demand computes low energy. Low energy feeds back to production, keeping GDP low. This is a stable low-level equilibrium trap, not a crash -- GDP sticks at $5--6T for 75 years.

In the forward simulation (starting 2025), this trap doesn't bite because GDP starts high ($158T) and useful energy is abundant. The circular dependency reinforces growth. But running backward from a low base, the same feedback loop reinforces stagnation.

**Root cause**: Non-electric energy (oil, gas, coal for transport, heating, industry) is purely demand-driven in the model. It's computed as `GDP x intensity x (1 - electrificationRate)`. There is no supply-side model for fossil fuel production. In reality, the 1950--2000 fossil fuel build-out was supply-driven: oil companies invested in exploration and drilling, expanding supply, which *enabled* economic growth rather than responding to it. Under Ayres-Warr, this distinction matters: energy supply drives GDP, not vice versa.

### 2.2 Fossil Capacity Additions Were Fixed-Rate, Not Demand-Driven

The energy module originally used different targeting logic for fossil versus clean sources. Clean sources (solar, wind) saw the demand gap and raced to fill it. Fossil sources (coal, gas) grew at a fixed rate (`prevInstalled x growthRate`), ignoring the demand gap entirely. This meant that even when electricity demand grew, fossil capacity didn't respond -- only solar and wind did.

We unified all sources to use demand-gap targeting: every source competes to fill the gap between demand and existing generation. Fossil sources still self-finance from fuel revenue (bypassing the clean investment budget), but they now respond to demand signals. Clean sources benchmark against the cheapest fossil LCOE; fossil sources benchmark against the cheapest clean LCOE.

This change improved backcast electricity from 710 TWh to 12,630 TWh at 2025 (target: 30,000). The remaining gap is likely from the electrification overshoot (47% sim vs 25% real), which redirects too much demand to electricity.

### 2.3 Electrification Overshoots by ~2x

The model's cost-driven electrification mechanism produces 47% electrification by 2025 versus the observed 25%. The overshoot persists even with 1950-appropriate efficiency multipliers (1.5x for electric rail vs 3.5x for modern EVs) and reduced transition parameters (lower `basePressure`, `costSensitivity`, `maxAnnualChange`).

The fundamental issue: the model treats electrification as a cost optimization. If electricity is cheaper per unit of useful work, the sector electrifies. But real-world transitions are infrastructure-limited, not cost-limited. Electricity was cost-competitive for many applications by the 1970s, yet electrification only reached 25% by 2025 -- a 50-year delay.

The overshoot implication for the forward model: the baseline's 88% electrification by 2100 may be optimistic by the same ~2x factor. If the model's cost-driven mechanism overpredicts by 2x historically, real 2100 electrification might be closer to 50--60%.

### 2.4 Capital Accumulation Is the Binding Constraint

Even with energy supply growing at 4--5%/yr (matching historical primary energy growth), GDP only reached $27--44T by 2025 versus the observed $158T. The missing factor is capital stock growth.

In the model, capital stock grew from $18T to $25T over 75 years. In reality, it grew from roughly $20T to $550T -- a 27x increase. The model funds investment purely from savings:

```
Investment = GDP x (1 - transferBurden) x savingsRate x stability x netEnergyFactor
```

With GDP stuck at $10--20T and savings rate at 20%, annual investment is $2--4T. Capital depreciates at 5%/yr, so net capital growth is minimal.

In the real world, the post-war period saw massive debt-financed capital accumulation:

- **Government debt**: Marshall Plan, interstate highways, rural electrification, space program -- all deficit-financed
- **Corporate leverage**: Debt-to-equity ratios expanded as firms borrowed to build factories, refineries, power plants
- **Consumer credit**: Mortgage debt enabled suburbanization, auto loans enabled mass motorization
- **Developing-world borrowing**: World Bank, IMF, bilateral development aid -- external credit flowing to capital-poor economies

Global debt-to-GDP grew from roughly 100% in 1950 to 350% by 2025. That extra 250% of GDP in credit creation funded capital accumulation far beyond what savings alone could provide. The Solow/Ayres-Warr framework's identity Investment = Savings fundamentally cannot reproduce this.

**This is the single most important finding of the backcast exercise.** The GDP gap is not an energy calibration problem. Even with perfectly calibrated energy supply, the model produces ~$40T GDP versus $158T, because capital -- a 0.25 elasticity input to the production function -- barely grows without a credit channel.

---

## 3. Supply-Side Inertia Mechanism (Attempted)

We implemented a supply-push mechanism for non-electric energy:

```
supplyPush = prevNonElec x (1 + popGrowthRate + growthFloor) x elecAdjust
elecAdjust = (1 - elecRate_new) / (1 - elecRate_prev)
```

The electrification adjustment telescopes: the product of year-over-year adjustments equals `(1 - elecFinal) / (1 - elecInitial)`, so the supply push correctly tracks the overall electrification trajectory. Population growth provides the main floor; `nonElectricGrowthFloor` (a scenario parameter) adds per-capita energy growth for developing-economy backcasts.

Key implementation lesson: `previousNonElectricEnergy` must be stored *before* the fossil stock lock-in adjustment. Otherwise the lock-in (which adds TWh to represent installed equipment) ratchets up the supply push base, creating a compounding divergence.

This mechanism broke the death spiral (GDP grew from $5T to $27T) but cannot solve the capital constraint. It will be re-implemented after a debt/credit channel is added to the capital module.

---

## 4. Exogenous Population

The `exogenousPopulation` parameter on the demographics module works correctly and should be retained in the codebase. It linearly interpolates between provided `{year, total}` data points and uniformly scales all cohorts (young, working, old, college-educated, etc.) to hit the target. This preserves the model's internal age structure and regional distribution while matching historical population exactly.

The mechanism is clean and useful beyond backcasting -- it enables demographic sensitivity analysis (e.g., "what if population peaks at 9.5B instead of 8.9B?") without rewriting fertility assumptions.

---

## 5. Recommendations for the Baseline Model

Several findings from the backcast effort apply to the forward-running model and should be incorporated independently of the backcast.

### 5.1 Demand-Driven Fossil Additions (KEEP)

The original fossil targeting mechanism (`prevInstalled x growthRate`) was structurally wrong. It made fossil capacity growth independent of demand, while clean capacity responded to demand. This created an asymmetry where clean sources always outcompeted fossil -- not because they were cheaper, but because they were the only ones trying to fill the demand gap.

The unified demand-gap targeting, where all sources compete to fill the gap with separate competitiveness benchmarks (clean vs cheapest fossil, fossil vs cheapest clean), is more physical and produces more realistic fuel mix evolution. The baseline changed minimally (GDP $502T vs $567T, 1.98 C vs 1.97 C) because solar dominates on cost by 2025 anyway.

**Recommendation**: Keep demand-driven fossil additions. The ~$65T GDP reduction is correct -- it reflects fossil sources now having agency to compete rather than passively retiring.

### 5.2 Exogenous Population (KEEP)

Useful for scenario analysis. Zero impact on the baseline when the parameter is absent.

### 5.3 Capital Validation Range (KEEP)

Widening `initialCapitalStock` validation from `[100, 1000]` to `[1, 1000]` is independently correct. It allows legitimate scenarios with low initial capital without triggering false warnings.

### 5.4 Electrification Speed Calibration (CONSIDER)

The 2x overshoot in backcast electrification suggests the forward model's sector electrification parameters (`basePressure`, `maxAnnualChange`) may be too aggressive. Consider halving `maxAnnualChange` for transport (from 0.04 to 0.02) and buildings (from 0.03 to 0.015). This would produce slower but more realistic electrification trajectories.

However, this should wait until the forward model is validated against 2020--2025 observed data. The backcast's efficiency multipliers (1.5x rail, 1.0x resistive heat) were deliberately conservative for 1950. The modern multipliers (3.5x EV, 3.0x heat pump) may justify faster transition rates.

### 5.5 Historical Backcast Infrastructure (KEEP SCENARIO + SCRIPT)

The `historical-1950.json` scenario file and `historical-backcast.ts` script are independently useful as diagnostic tools. They should be retained (after the debt mechanism is added) for ongoing model validation.

### 5.6 CLI Display Improvements (KEEP)

The `makeSampleYears()` function for dynamic year selection and startYear/endYear label support in the CLI make the simulation runner work for any time period, not just 2025--2100. These are general-purpose improvements.

### 5.7 `buildLags()` Deriving from Params (KEEP)

The change to `buildLags()` that derives era-appropriate initial lag values from merged module params (instead of hardcoded 2025 values) is independently correct. It means that scenarios with different startYear conditions automatically get appropriate lag initialization.

---

## 6. The Debt Channel: Design Notes

The binding constraint on the backcast is capital accumulation. The model needs a credit/debt mechanism where investment can exceed savings. Key design considerations:

### What debt does in a growth model

1. **Pulls demand forward**: Credit creation allows investment today against future income. This is essential for infrastructure that pays off over decades (power plants, highways, housing).

2. **Creates money**: In a fractional reserve system, bank lending creates deposits. This is how most money enters the economy. The model's current implicit assumption -- that investment equals savings -- corresponds to a gold-standard or commodity-money regime, not the post-Bretton Woods credit economy.

3. **Amplifies both growth and contraction**: Debt enables faster capital accumulation during expansions but creates deleveraging pressure during contractions. The asymmetry between borrowing (voluntary) and deleveraging (forced) is a key source of business cycle dynamics.

### Minimum viable debt model

```
Investment = Savings + NetNewCredit
NetNewCredit = CreditGrowthRate x ExistingDebt
DebtService = InterestRate x TotalDebt
```

Where:
- `CreditGrowthRate` responds to: interest rate (lower = more borrowing), GDP growth (higher = more optimism), debt/GDP ratio (higher = less willing to lend)
- `DebtService` subtracts from consumption (or government spending), creating a fiscal drag
- Debt-to-GDP ratio is a key state variable, tracked alongside capital stock

The debt channel connects naturally to the existing WACC channel: higher debt levels → higher risk premiums → higher WACC → higher LCOE for capital-intensive sources (solar, nuclear). This creates a feedback from fiscal dynamics to energy transition speed.

### Historical calibration targets

| Year | Global Debt/GDP | Annual Credit Growth |
|------|-----------------|---------------------|
| 1950 | ~100% | ~5% |
| 1970 | ~120% | ~8% |
| 1990 | ~180% | ~6% |
| 2008 | ~300% | ~10% (bubble) |
| 2025 | ~350% | ~4% |

A logistic credit growth model that peaks around 8%/yr and declines as debt/GDP approaches saturation (~400%) would roughly match this trajectory.

---

## 7. Conclusion

The historical backcast is a powerful diagnostic but not a calibration target -- the model lacks the financial machinery to reproduce post-war growth. The energy-GDP feedback, electrification dynamics, and climate system all behave reasonably. The structural gap is capital accumulation without credit.

The exercise validates the Ayres-Warr framing: energy supply genuinely drives GDP. When we forced non-electric energy to grow via supply push, GDP grew. When we let it be demand-driven from a low GDP base, GDP stagnated. This is precisely the dynamic the model is designed to capture for the forward simulation -- cheap solar → more useful energy → more GDP → more investment → more solar. The backcast shows this loop also works in reverse, as a trap.

The forward-running baseline is sound for its purpose. The recommended changes (demand-driven fossil, exogenous population support, wider validation ranges, param-derived lag initialization, CLI improvements) are independent improvements that make the model more general without affecting its core results.

---

## Appendix: Key Parameters for 1950 Scenario

| Parameter | 1950 Value | 2025 Default | Rationale |
|-----------|------------|--------------|-----------|
| `production.initialGDP` | 5 | 158 | World Bank historical |
| `production.tfpGrowth` | 0.012 | 0.004 | Higher catch-up growth 1950--2000 |
| `demand.electrification2025` | 0.05 | 0.25 | IEA historical |
| `demand.nonElectricGrowthFloor` | 0.02 | 0 | Supply-push for backcast |
| `capital.initialCapitalStock` | 17.5 | 553 | Historical estimate |
| `energy.carbonPrice` | 0 | 35 | No carbon pricing pre-2000 |
| `climate.currentTemp` | 0.1 | 1.47 | GISTEMP historical |
| `climate.cumulativeCO2_2025` | 500 | 2440 | Carbon budget consumed by 1950 |
| Coal capacity | 152 GW | 2110 GW | Historical installed base |
| Solar/Wind capacity | ~0 GW | ~2400 GW | Pre-PV era |
| Transport efficiency multiplier | 1.5 | 3.5 | Electric rail only (no EVs) |
| Buildings efficiency multiplier | 1.0 | 3.0 | Resistive heating (no heat pumps) |
