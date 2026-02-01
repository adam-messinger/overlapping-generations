# Scenario Configuration Files

This directory contains scenario configuration files for the Overlapping Generations Energy Simulation.

## File Format

Scenario files are JSON with the following structure:

```json
{
  "name": "Human-readable scenario name",
  "description": "Description of the scenario",

  "params": {
    "carbonPrice": 35,
    "solarAlpha": 0.36,
    // ... Tier 1 parameters
  },

  "overrides": {
    "climateParams": { "tippingThreshold": 2.0 },
    "demographics": { "china": { "fertilityFloor": 0.8 } }
    // ... Tier 2 deep overrides (optional)
  }
}
```

## Parameter Tiers

### Tier 1: Policy-Relevant Parameters (~25)

These are exposed via `params` and can be set directly:

| Category | Parameters |
|----------|------------|
| **Primary (6)** | carbonPrice, solarAlpha, solarGrowth, electrificationTarget, efficiencyMultiplier, climSensitivity |
| **Energy Tech (6)** | windAlpha, windGrowth, batteryAlpha, nuclearGrowth, nuclearCost0, hydroGrowth |
| **Climate (3)** | damageCoeff, tippingThreshold, nonElecEmissions2025 |
| **Capital (4)** | savingsWorking, automationGrowth, stabilityLambda, robotGrowthRate |
| **Demographics (3)** | fertilityFloorMultiplier, lifeExpectancyGrowth, migrationMultiplier |
| **Resources (3)** | mineralLearningMultiplier, glp1MaxPenetration, yieldGrowthRate |

### Tier 2: Deep Configuration (250+)

For power users, the `overrides` object allows deep-merge of any parameter object:

- `energySources` - Cost, learning, capacity parameters per source
- `climateParams` - Damage coefficients, tipping points
- `capitalParams` - Savings rates, depreciation, automation
- `demographics` - Regional fertility, mortality, migration
- `resourceParams` - Mineral intensities, food parameters
- `expansionParams` - G/C cost expansion, robot energy

## Twin-Engine Scenario Suite

These scenarios correspond to the Twin-Engine Century Forecast probability distribution:

| Scenario | Probability | Key Drivers |
|----------|-------------|-------------|
| central-path.json | 30% | Baseline managed acceleration |
| tech-plateau.json | 30% | Learning curves flatten, VRE ~55-60% |
| tech-breakthrough.json | 20% | Faster learning, fusion/<$40 MWh |
| debt-populism.json | 12% | Financial crisis, policy instability |
| climate-cascade.json | 8% | High sensitivity, tipping points |

### central-path.json
**Central Path (30%)** - Twin-Engine baseline. Gradual decarbonization, VRE expansion constrained by grids/minerals, temperature stabilizing near 2°C.

### tech-plateau.json
**Technology Plateau (30%)** - Learning curves flatten earlier than expected. VRE share plateaus at 55-60%. Mineral bottlenecks persist. Long-duration storage delayed.

### tech-breakthrough.json
**Technology Breakthrough (20%)** - Faster-than-expected learning. Fusion or advanced geothermal delivers <$40/MWh by 2040s. Battery costs below $50/kWh by 2030. Net-zero by 2060s.

### debt-populism.json
**Debt-Accident Populism (12%)** - Financial crisis triggers policy instability. Uses G/C stability mechanism as proxy for investment suppression. Carbon pricing collapses.

*Note: Model lacks explicit debt/GDP tracking. See "Missing Dynamics" below.*

### climate-cascade.json
**Climate Cascade (8%)** - High climate sensitivity (4.5°C ECS). Tipping points trigger at 1.8°C. Ice sheet and permafrost feedbacks. Higher damages.

## Legacy Scenarios

### baseline.json
**STEPS Baseline** - IEA Stated Policies Scenario aligned. Current policy trajectory without additional climate action.

### net-zero.json
**IEA Net Zero 2050** - Aggressive decarbonization with high carbon pricing ($150/ton), accelerated solar (30% growth), and 80% electrification target.

### tech-stagnation.json
**Technology Stagnation** - Pessimistic learning rates. Solar alpha 0.20 (vs 0.36), slower deployment, mineral supply constraints.

### high-sensitivity.json
**High Climate Sensitivity** - 4.5°C ECS (vs 3.0°C default), higher damage coefficient, lower tipping threshold (2.0°C).

## Missing Dynamics

The following forecast metrics are NOT currently modeled:

| Metric | Status | Needed For |
|--------|--------|------------|
| Public Debt/GDP | ❌ Missing | Debt-Populism scenario |
| Adaptation Spending | ❌ Missing | All scenarios (damage response) |
| Government Interest Rates | ❌ Missing | Debt dynamics |
| Fusion/Breakthrough Tech | ❌ Missing | Tech-Breakthrough (uses nuclear proxy) |

To fully capture the Twin-Engine scenarios, the model would need:
1. **Debt dynamics**: Government borrowing, interest payments, debt/GDP ratios
2. **Adaptation function**: Spending that reduces damage (trade-off with mitigation)
3. **Policy stability index**: Beyond G/C stability, track political risk directly

## Usage

### Command Line

```bash
# Run with a scenario
node run-simulation.js --scenario=scenarios/net-zero.json

# Override scenario params
node run-simulation.js --scenario=scenarios/baseline.json --carbonPrice=100

# Generate forecast with scenario
node forecast.js --scenarioFile=scenarios/high-sensitivity.json
```

### Programmatic

```javascript
const energySim = require('./energy-sim.js');

// Load and run
const data = await energySim.runWithScenario('scenarios/net-zero.json');

// Load, apply, then customize
const scenario = await energySim.loadScenario('scenarios/baseline.json');
const applied = energySim.applyScenario(scenario);
const data = energySim.runSimulation({
  ...applied.params,
  carbonPrice: 200  // Override
});
```

## Creating Custom Scenarios

1. Copy `baseline.json` as a starting point
2. Modify `params` for Tier 1 changes
3. Add `overrides` for deep configuration (optional)
4. Run and compare: `node run-simulation.js --scenario=your-scenario.json`

## Comparing Scenarios

```bash
# Quick comparison
node run-simulation.js --scenario=scenarios/baseline.json
node run-simulation.js --scenario=scenarios/net-zero.json

# Detailed forecast comparison
node forecast.js --scenarioFile=scenarios/baseline.json > baseline.md
node forecast.js --scenarioFile=scenarios/net-zero.json > net-zero.md
```

## Parameter Reference

Use `energySim.describeParameters()` to get full documentation:

```javascript
const energySim = require('./energy-sim.js');
const params = energySim.describeParameters();
console.log(params.carbonPrice);
// { type: 'number', default: 35, min: 0, max: 200, tier: 1, ... }
```
