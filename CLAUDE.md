# Overlapping Generations Energy Simulation

An interactive economic simulation exploring energy transitions and demographic shifts from 2025-2100.

## Project Structure

```
overlapping-generations/
├── energy-sim.js        # Standalone Node.js module (headless)
├── run-simulation.js    # CLI runner
├── forecast.js          # Twin-Engine forecast generator
├── test-energy-burden.js # Node.js tests for energy burden (Issue #7)
├── scenarios/           # Scenario configuration files
│   ├── baseline.json    # STEPS baseline (current policies)
│   ├── net-zero.json    # IEA NZE 2050 (aggressive)
│   ├── tech-stagnation.json # Pessimistic learning rates
│   ├── high-sensitivity.json # Climate sensitivity 4.5°C
│   └── README.md        # Scenario documentation
├── sources/             # Reference papers and data sources
│   └── README.md        # Links to Fernández-Villaverde papers, etc.
└── CLAUDE.md            # This file
```

## Architecture

The simulation is a Node.js module designed for programmatic and CLI use. No browser dependencies.

### Code Organization (in energy-sim.js)

The module is organized into clear sections:

1. **PRIMITIVES** - Core mathematical functions
   - `compound()` - Compound growth
   - `learningCurve()` - Wright's Law cost reduction
   - `depletion()` - EROEI decline for fossil fuels
   - `logistic()` - S-curve adoption
   - `poissonShock()` - Random event probability

2. **ENERGY SOURCES** - `energySources` object with parameters for solar, wind, gas, coal, nuclear, battery

3. **DISPATCH** - Merit order source allocation
   - `dispatchParams` object - Capacity factors and penetration limits per source
   - `getCapacities()` - Calculate GW capacity by year
   - `dispatch()` - Allocate demand to sources by LCOE merit order

4. **CLIMATE** - Emissions and damage calculations (DICE-2023 informed)
   - `climateParams` object - CO2, temperature, damage coefficients
   - `calculateEmissions()` - Compute Gt CO2 from dispatch + non-electric sectors
   - `updateClimate()` - CO2 ppm and temperature from cumulative emissions
   - `climateDamages()` - DICE-style quadratic damage function with regional variation

5. **DEMOGRAPHICS** - Fernández-Villaverde-informed population model
   - `demographics` object - 4 regions (OECD, China, EM, ROW)
   - `projectFertility()` - TFR convergence to floor
   - `birthRateFromTFR()` - Crude birth rate
   - `deathRate()` - Age-specific mortality
   - `ageCohorts()` - 3-cohort aging (young/working/old) with education splits
   - `runDemographics()` - Full 2025-2100 projection including education tracking

6. **EDUCATION** - Tertiary education and human capital
   - `educationParams` object - Enrollment rates, college shares, wage premiums by region
   - `projectEnrollmentRate()` - Enrollment rate convergence to target
   - `projectWagePremium()` - Wage premium decay as supply increases
   - `effectiveWorkers()` - Productivity-weighted worker count (nonCollege + college × premium)

7. **DEMAND MODEL** - GDP, energy intensity, electricity demand
   - `economicParams` object - Regional GDP, TFP growth, energy intensity, energy burden params
   - `demandParams` object - Electrification targets and rates
   - `runDemandModel()` - Calculate electricity demand from demographics + GDP

7b. **ENERGY BURDEN** - Supply-side energy cost constraint (Issue #7)
   - `economicParams.energyBurden` object - Threshold (8%), elasticity, persistence
   - `fuelPrices` object - Fuel prices for non-electric energy ($/MWh thermal)
   - `calculateEnergyCost()` - Total energy cost from dispatch × LCOE + fuel demand
   - `energyBurdenDamage()` - GDP damage when energy cost exceeds threshold

8. **CAPITAL** - Savings, investment, and automation
   - `capitalParams` object - Production, savings, stability, automation parameters
   - `aggregateSavingsRate()` - Demographic-weighted savings by region
   - `stabilityFactor()` - Galbraith/Chen investment stability (0-1)
   - `calculateInvestment()` - Investment = GDP × savingsRate × stability
   - `updateCapital()` - Capital accumulation K_{t+1} = (1-δ)K_t + I_t
   - `calculateInterestRate()` - Marginal product r = αY/K - δ
   - `robotsDensity()` - Robots per 1000 workers
   - `runCapitalModel()` - Full capital simulation with all outputs

9. **RESOURCES** - Minerals, food, and land demand (Phase 6)
   - `resourceParams` object - Mineral intensities, food parameters, land use
   - `recyclingRate()` - Dynamic recycling based on stock-in-use
   - `mineralDemand()` - Calculate mineral demand for energy infrastructure
   - `foodDemand()` - Bennett's Law protein curve + GLP-1 effects
   - `landDemand()` - Farmland, urban, forest projections
   - `runResourceModel()` - Full resource simulation with all outputs

10. **G/C EXPANSION** - Galbraith/Chen entropy economics (Phase 7a)
   - `expansionParams` object - Cost expansion and robot energy parameters
   - `calculateExpansionDemand()` - Calculate demand from cost expansion + automation

11. **CAPACITY STATE** - State-machine architecture for energy capacities (Phase 7b)
   - `capacityParams` object - Growth caps, penetration limits, CAPEX, lifetimes
   - `initializeCapacityState()` - Create initial state from 2025 values
   - `updateCapacityState()` - Update state with demand ceiling, growth cap, investment constraint
   - `calculateMaxUsefulCapacity()` - Max useful capacity based on demand
   - `calculateInvestmentCapacity()` - Max additions from investment budget
   - `calculateRetirement()` - Asset retirement based on lifetime
   - `getCapacityFromState()` - Extract capacity snapshot for dispatch

12. **SIMULATION ENGINE**
   - `runSimulation()` - Main loop, returns energy + demographics + climate + capital + resources + capacityState
   - `findCrossovers()` - Detect when clean energy beats fossil

### Node.js API

Access simulation data via `require('./energy-sim.js')`:

```javascript
// Quick scenario run (returns flat metrics + crossovers)
const m = energySim.runScenario({ carbonPrice: 100 });
m.warming2100              // °C
m.peakEmissionsYear        // year
m.solarCrossesGas          // year or null
m.chinaElecCrossesOECD     // year when China electricity > OECD
m.gridBelow100             // year when grid < 100 kg CO₂/MWh
m.elecPerCapita2050_china  // kWh/person
m.chinaCollegePeakYear     // year when China college workers peak (~2040)
m.collegeShare2050         // global college share of workforce
m.kY2025                   // K/Y ratio (capital-to-output)
m.interestRate2025         // Real interest rate
m.robotsDensity2050        // Robots per 1000 workers
m.savingsRate2025          // Aggregate savings rate
m.copperPeakYear           // Year of peak copper demand
m.lithiumReserveRatio2100  // Cumulative lithium / reserves
m.proteinShare2050         // Protein share of calories (Bennett's Law)
m.farmland2050             // Mha cropland
m.desert2025               // Mha desert/barren
m.desert2050               // Mha desert/barren
m.desert2100               // Mha desert/barren
m.netFlux2025              // Gt CO₂/year net LULUCF
m.netFlux2050              // Gt CO₂/year net LULUCF
m.netFlux2100              // Gt CO₂/year net LULUCF
m.cumulativeSequestration2100 // Gt CO₂ total forest sequestration
m.expansionMultiplier2100  // G/C cost expansion multiplier
m.robotLoadTWh2100         // Robot energy load (TWh)
m.adjustedDemand2100       // Demand with expansion (TWh)
m.finalEnergyPerCapitaDay2025  // kWh/person/day total final energy
m.finalEnergyPerCapitaDay2050
m.finalEnergyPerCapitaDay2100
m.transportElectrification2050 // Sector electrification rates
m.buildingsElectrification2050
m.industryElectrification2050
m.oilShareOfFinal2050      // Fuel shares of non-electric
m.gasShareOfFinal2050
m.energyBurden2025         // Energy cost as fraction of GDP
m.energyBurden2050         // Energy burden (should decline)
m.energyBurdenPeak         // Peak energy burden
m.energyBurdenPeakYear     // Year of peak burden
m.energyCost2025           // Total energy cost ($ trillions)
m.energyCost2050           // Energy cost by 2050
m.yieldDamageFactor2050    // Climate damage to yields (1 = no damage)
m.yieldDamageFactor2075    // Yield damage at 2075
m.yieldDamageFactor2100    // Yield damage at 2100

// Query helpers for custom analysis
const data = energySim.runSimulation({ carbonPrice: 100 });

energySim.query.firstYear({
  data,
  series: 'demand.regions.china.electricityDemand',
  gt: 'demand.regions.oecd.electricityDemand'
});  // Year when China electricity > OECD

energySim.query.crossover(data,
  'demand.regions.em.electricityDemand',
  'demand.regions.china.electricityDemand'
);  // { year, direction, values }

energySim.query.valueAt(data, 'climate.temperature', 2075);  // °C at 2075
energySim.query.perCapita(data, 'china', 'electricity');     // kWh/person array
energySim.query.gridIntensityBelow(data, 50);                // Year grid < 50 kg/MWh

// Derived series (per-capita metrics)
const derived = energySim.computeDerivedSeries(data);
derived.perCapita.electricity.china  // kWh/person by year
derived.global.gdpPerCapita          // $/person by year

// Units map
energySim.units.electricityDemand  // { unit: 'TWh', description: '...' }
energySim.units.gridIntensity      // { unit: 'kg CO₂/MWh', description: '...' }

// Config
energySim.defaults              // { carbonPrice: 35, solarAlpha: 0.36, ... }
energySim.config.quiet = true   // Suppress ALL console output

// Full simulation (returns all arrays)
const { years, results, demographics, demand, climate, dispatch, capital, resources, capacityState } = energySim.runSimulation({
  carbonPrice: 100,
  solarAlpha: 0.25,
  solarGrowth: 0.25,
  electrificationTarget: 0.70,
  efficiencyMultiplier: 1.2,
  climSensitivity: 3.0
});

// Capacity state (state-machine architecture)
capacityState.solar.installed[0]    // 2025 solar capacity: 1500 GW
capacityState.solar.installed[25]   // 2050 solar capacity
capacityState.solar.additions[25]   // 2050 solar additions
capacityState.solar.retirements[50] // 2075 solar retirements
capacityState.battery.installed[25] // 2050 battery capacity (GWh)

// Capital model data
capital.stock[0]           // 2025 capital stock: ~$420T
capital.interestRate[25]   // 2050 interest rate
capital.robotsDensity[50]  // 2075 robots per 1000 workers
capital.savingsRate[0]     // 2025 aggregate savings rate
capital.stability[50]      // 2075 Galbraith/Chen stability factor

// Resource model data
resources.minerals.copper.demand[0]     // 2025 copper demand (Mt/year)
resources.minerals.copper.cumulative[75] // Cumulative copper by 2100
resources.minerals.lithium.reserveRatio[25] // 2050 lithium reserve ratio
resources.food.proteinShare[25]         // 2050 protein share
resources.food.glp1Effect[25]           // 2050 GLP-1 calorie reduction effect
resources.land.farmland[50]             // 2075 farmland (Mha)
resources.land.desert[0]                // 2025 desert/barren (Mha)
resources.land.yieldDamageFactor[50]    // 2075 climate damage to yields (1 = no damage)
resources.land.forestChange[25]         // 2050 forest change (Mha/year)
resources.carbon.netFlux[0]             // 2025 net LULUCF (Gt CO₂/year)
resources.carbon.sequestration[25]      // 2050 sequestration (Gt CO₂/year)
resources.carbon.cumulativeSequestration[75] // Cumulative sequestration by 2100

// G/C expansion data (in dispatch object)
dispatch.robotLoadTWh[25]        // 2050 robot energy load (TWh)
dispatch.expansionMultiplier[50] // 2075 cost expansion multiplier
dispatch.adjustedDemand[75]      // 2100 total demand with expansion
dispatch.robotsPer1000[75]       // 2100 robots per 1000 workers

// Final energy data (in demand object)
demand.global.totalFinalEnergy[0]       // 2025 total final energy (TWh)
demand.global.nonElectricEnergy[25]     // 2050 non-electric energy (TWh)
demand.global.finalEnergyPerCapitaDay[0] // 2025 final energy per capita (kWh/day)
demand.global.sectors.transport.total[25]  // 2050 transport sector total (TWh)
demand.global.sectors.transport.electrificationRate[25] // 2050 transport elec rate
demand.global.sectors.buildings.nonElectric[25] // 2050 buildings non-electric (TWh)
demand.global.fuels.oil[0]              // 2025 oil consumption (TWh)
demand.global.fuels.hydrogen[75]        // 2100 hydrogen consumption (TWh)
demand.regions.china.fuels.gas[25]      // 2050 China gas consumption (TWh)

// Final energy helper functions
energySim.calculateSectorElectrification('transport', 25) // Transport elec rate at 2050
energySim.calculateFuelMix('industry', 50)  // Industry fuel mix at 2075 {gas, coal, ...}
energySim.finalEnergyParams.carbonIntensity // { oil: 267, gas: 202, ... } kg CO2/MWh

// Export full run as JSON
const json = energySim.exportJSON({ carbonPrice: 100 });

// === SCENARIO LOADING ===

// Load and run a scenario file
const data = await energySim.runWithScenario('scenarios/net-zero.json');

// Load scenario, apply overrides, then run
const scenario = await energySim.loadScenario('scenarios/baseline.json');
const applied = energySim.applyScenario(scenario);
const data = energySim.runSimulation({
  ...applied.params,
  carbonPrice: 200  // Override scenario value
});

// Deep merge utility for custom config
const merged = energySim.deepMerge(
  { a: 1, nested: { x: 1 } },
  { a: 2, nested: { y: 2 } }
);  // { a: 2, nested: { x: 1, y: 2 } }

// Tier 1 parameters (policy-relevant, ~25 total)
energySim.defaults.carbonPrice           // 35 $/ton
energySim.defaults.windAlpha             // null (use hardcoded 0.23)
energySim.defaults.fertilityFloorMultiplier  // null (use 1.0)

// Get full parameter schema
const schema = energySim.describeParameters();
schema.carbonPrice  // { type, default, min, max, unit, tier, description }
schema._scenarioFormat  // Scenario file format documentation
```

### Scenario CLI

```bash
# Run with a scenario file
node run-simulation.js --scenario=scenarios/net-zero.json

# Override scenario params from CLI
node run-simulation.js --scenario=scenarios/baseline.json --carbonPrice=100

# Generate forecast with scenario
node forecast.js --scenarioFile=scenarios/high-sensitivity.json

# Compare scenarios
node run-simulation.js --scenario=scenarios/baseline.json
node run-simulation.js --scenario=scenarios/net-zero.json
```

### Scenario File Format

```json
{
  "name": "Human-readable name",
  "description": "Description of the scenario",

  "params": {
    "carbonPrice": 150,
    "solarAlpha": 0.40
    // Tier 1 parameters (~25 policy-relevant)
  },

  "overrides": {
    "climateParams": { "tippingThreshold": 2.0 },
    "demographics": { "china": { "fertilityFloor": 0.8 } }
    // Tier 2 deep overrides (optional, 250+ params)
  }
}
```

### Tier 1 Parameters

| Category | Parameters |
|----------|------------|
| **Primary (6)** | carbonPrice, solarAlpha, solarGrowth, electrificationTarget, efficiencyMultiplier, climSensitivity |
| **Energy Tech (6)** | windAlpha, windGrowth, batteryAlpha, nuclearGrowth, nuclearCost0, hydroGrowth |
| **Climate (3)** | damageCoeff, tippingThreshold, nonElecEmissions2025 |
| **Capital (4)** | savingsWorking, automationGrowth, stabilityLambda, robotGrowthRate |
| **Demographics (3)** | fertilityFloorMultiplier, lifeExpectancyGrowth, migrationMultiplier |
| **Resources (5)** | mineralLearningMultiplier, glp1MaxPenetration, yieldGrowthRate, yieldDamageThreshold, yieldDamageCoeff |

### Units Reference

| Dataset | Unit |
|---------|------|
| LCOE | $/MWh |
| Battery cost | $/kWh |
| Electricity demand | TWh |
| Per-worker electricity | kWh/person |
| GDP (regional) | $ trillions |
| GDP (per-worker) | $ per person |
| Population | absolute counts |
| Emissions | Gt CO₂/year |
| Grid intensity | kg CO₂/MWh |
| Temperature | °C above preindustrial |
| Damages | % of GDP (0-100 scale) |
| Dependency ratio | fraction (0-1) |
| Electrification rate | fraction (0-1) |
| Capital stock | $ trillions |
| Investment | $ trillions |
| Savings rate | fraction (0-1) |
| Stability factor | fraction (0-1) |
| Interest rate | fraction |
| Robots density | robots/1000 workers |
| K per worker | $K per person |
| Mineral demand | Mt/year |
| Mineral cumulative | Mt |
| Reserve ratio | fraction (cumulative/reserves) |
| Calories per capita | kcal/person/day |
| Total calories | Pcal/year |
| Protein share | fraction (0-0.16) |
| Grain equivalent | Mt/year |
| GLP-1 adoption | fraction of population |
| Farmland | Mha (million hectares) |
| Urban area | Mha |
| Forest area | Mha |
| Desert/barren | Mha |
| Crop yield | t/ha |
| Forest change | Mha/year |
| Sequestration | Gt CO₂/year |
| Deforestation emissions | Gt CO₂/year |
| Net LULUCF flux | Gt CO₂/year |
| Cumulative sequestration | Gt CO₂ |
| Expansion multiplier | fraction (1.0+) |
| Robot load | TWh |
| Adjusted demand | TWh |
| Total final energy | TWh |
| Non-electric energy | TWh |
| Final energy per capita/day | kWh/person/day |
| Sector energy | TWh |
| Sector electrification | fraction (0-1) |
| Fuel demand | TWh |
| Carbon intensity | kg CO₂/MWh |
| Energy cost | $ trillions/year |
| Energy burden | fraction of GDP (0-1) |
| Energy burden damage | fraction (0-1) |
| Fuel prices | $/MWh thermal |
| Yield damage factor | fraction (0-1, 1 = no damage) |
| Yield damage threshold | °C above preindustrial |
| Yield damage coeff | quadratic coefficient |

## Key Models

### Energy (Phase 1)
- **Solar/Wind**: Wright's Law learning curves (cost falls with cumulative deployment)
- **Gas/Coal**: EROEI depletion + carbon pricing
- **Battery**: Learning curve, combined with solar for dispatchable clean energy
- **Hydro**: Mature technology (~1,400 GW), 1% growth, ~16% of global electricity, zero carbon

### Demographics (Phase 2)
- **Fertility**: Exponential convergence to regional floor (Fernández-Villaverde thesis: all regions converging faster than expected)
- **Mortality**: Age-specific rates with life expectancy improvement
- **Cohorts**: 3-cohort model (0-19, 20-64, 65+) with aging transitions
- **Dependency**: Old-age dependency = 65+ / 20-64

### Education (Phase 2.5)
- **Enrollment**: Tertiary enrollment rate with logistic convergence to regional target
- **Education Split**: Working-age population split into college/non-college at age 18-22
- **Wage Premium**: College premium (1.5-2.2×) decays as supply increases
- **Effective Workers**: Productivity-weighted count (nonCollege + college × premium)
- **Differential Mortality**: College-educated live 1-3 years longer (Chetty et al.)
- **China Paradox**: Total workers peak ~2025, but college workers peak ~2040 due to 60% enrollment
- **Elderly College Share**: Uses fixed 0.5× multiplier for all regions (known limitation; full fix requires cohort-specific historical data)

### Demand (Phase 3)
- **GDP Growth**: TFP + labor contribution + demographic adjustment (Fernández-Villaverde)
- **Energy Intensity**: Declining efficiency (MWh per $1000 GDP)
- **Electrification**: Logistic convergence to target (IEA Net Zero informed)
- **Per-Worker Metrics**: GDP and kWh per working-age adult (Ole Peters ergodicity)
- **Final Energy Tracking**: Total final energy = electricity + non-electric
  - Sector breakdown: transport (45%), buildings (30%), industry (25%)
  - Independent electrification curves per sector
  - Fuel composition: oil, gas, coal, biomass, hydrogen, biofuel
  - Carbon intensities: oil 267, gas 202, coal 341 kg CO₂/MWh
  - Emissions calculated from actual fuel consumption

### Energy Burden (Issue #7)
- **Supply-Side Constraint**: Energy availability/cost constrains GDP, not just the reverse
  - When energy costs exceed 8% of GDP, growth is constrained
  - Historical precedent: 1970s oil shocks (10-14% burden) caused stagflation
- **Energy Cost Calculation**: Total cost from electricity (dispatch × LCOE) + non-electric (fuel demand × prices)
  - Fuel prices: oil $50/MWh, gas $25/MWh, coal $15/MWh + carbon pricing
  - Carbon cost added to each fuel based on carbon intensity
- **Burden Damage Function**: Above threshold, damage = (excess burden) × elasticity (1.5)
  - Threshold: 8% of GDP (normal cheap energy)
  - Max burden: 14% (1970s crisis level)
  - Damage capped at 30% GDP reduction
- **Feedback Loop**: Lagged effect on GDP growth (persistent fraction 25%)
  - Similar to climate damages: year t-1 burden affects year t growth
  - Creates stagflation dynamics when energy costs spike
- **Jevons Integration**: G/C expansion still applies when burden is below threshold
  - Cheap energy enables growth AND unlocks new activities
  - High burden constrains growth AND suppresses expansion

### Climate (Phase 4)
- **Dispatch**: Merit order allocation by LCOE with capacity/penetration constraints
- **Emissions**: Computed from dispatch (electricity) + electrification-adjusted non-electric
- **Carbon Cycle**: Simplified cumulative CO2 → ppm → temperature with lag
  - CO2 derived from cumulative emissions (enables counterfactual analysis)
  - Uses constant 45% airborne fraction; real fraction varies 40-50% with cumulative emissions
  - 2025 baseline: 2400 Gt cumulative → ~418 ppm (close to observed 420 ppm)
- **Damages**: DICE-2023 quadratic function with regional multipliers and tipping threshold
- **Net GDP**: Gross GDP × (1 - damage fraction) as post-hoc adjustment

### Capital (Phase 5)
- **Capital Accumulation**: Standard K_{t+1} = (1-δ)K_t + I_t dynamics
- **OLG Savings**: Demographic-weighted savings rates (young 0%, working 45%, old -5%)
- **Regional Premiums**: China +15% savings, EM -5%, ROW -8%
- **Galbraith/Chen Uncertainty Premium**: Investment depends on interest rates AND uncertainty. Higher uncertainty raises equity risk premium, suppressing investment: Φ = 1/(1 + λ×u²). Currently u = climate damage; future: social unrest, endogenous volatility, etc.
- **Interest Rate**: Marginal product of capital r = αY/K - δ
- **Automation**: Robots per 1000 workers, growing from 2% to 20% share of capital
- **K per Worker**: Capital intensity per effective worker

### Resources (Phase 6)
- **Mineral Demand**: Driven by energy infrastructure (solar GW, wind GW, battery GWh)
  - Intensity declines via learning (2-3% per year)
  - Dynamic recycling: rate increases with stock-in-use
  - Tracks copper, lithium, rare earths, steel
- **Food Demand**: Bennett's Law + GLP-1 effects
  - Protein share rises with GDP per capita (logistic curve)
  - GLP-1 adoption reduces calorie demand 15-20% for users
  - Grain equivalent = direct consumption + feed conversion
- **Land Demand**: Farmland, urban, forest, desert
  - Farmland = grain demand / yield
  - Yield = tech improvement × climate damage factor
  - Tech baseline improves 1%/year
  - Climate damage: Schlenker/Roberts-inspired threshold (2°C), quadratic above
  - Urban grows with population and wealth
  - Forest: baseline loss + reforestation from abandoned farmland
  - Desert: residual from land budget (total - farm - urban - forest)
  - Desertification accelerates above 1.5°C warming
  - 50% of released farmland becomes forest (rewilding)
- **Climate-Yield Feedback (Issue #10)**: High warming → yield collapse → more farmland → deforestation
  - Below 2°C: yields grow normally with tech improvement
  - Above 2°C: quadratic damage, ~37% yield loss at 4°C
  - Creates bifurcation: green vs collapse scenarios diverge in land use
- **Forest Carbon**: CDR and emissions from land use change
  - Growing forest sequesters ~7.5 t CO₂/ha/year
  - Deforestation: 50% immediate emissions, 50% enters decay pool
  - Decay pool emits 5%/year (deferred emissions)
  - Net flux affects cumulative CO₂ and temperature

### Galbraith/Chen Expansion (Phase 7)
Implements G/C Entropy Economics: energy transitions are ADDITIVE, not substitutive.
When energy costs drop, released resources get reinvested into new activities.

- **Automation Energy (new species)**
  - Robots/AI are genuinely NEW energy consumers — ecological succession (Odum)
  - When cheap energy is available, new "species" evolve to fill the niche
  - ~10 MWh/robot-unit/year (datacenters + physical robots)
  - Grows 12%/year from ~50 TWh (2025) to ~10,000 TWh (2100)
  - Additive to base demand before any multipliers

- **Cost Expansion (unlocking new activities)**
  - Cost reduction releases resources → reinvested into activities that were too expensive
  - Continuous (no threshold) — every cost reduction matters
  - Uses log form: 25% expansion per cost halving (first halvings matter most)
  - Examples: desalination, direct air capture, synthetic fuels, electric steel, compute
  - Multiplicative: applied to (base + automation) demand

- **Infrastructure Growth Cap (endogenous)**
  - Base rate 2.5%/year scales with investment capacity
  - Higher savings rate → faster infrastructure buildout
  - G/C insight: growth constrained by capital, not arbitrary caps
  - As population ages and savings decline, infrastructure growth slows

- **Theory**: Galbraith/Chen Entropy Economics (2021), Odum Maximum Power Principle, Lotka (1922)

### Capacity State (Phase 7b)
- **Architecture**: State-machine replaces exogenous growth projections
  - `actualCapacity[t] = actualCapacity[t-1] + additions[t] - retirements[t]`
  - Capacity state propagates forward through timesteps
  - LCOE now depends on actual cumulative capacity (feedback loop)
- **Constraints on Additions**:
  1. **Demand ceiling**: Can't overbuild beyond useful capacity at penetration limits
  2. **Growth rate cap**: Manufacturing/supply chain limits (~30% for solar)
  3. **Investment constraint**: Clean energy share of investment × GDP × stability
- **Asset Retirement**: Assets retire based on lifetime (solar: 30y, battery: 15y, etc.)
- **Feedback Loop**: Constrained deployment → slower learning → higher LCOE
- **Effect**: Capacity growth matches economic reality; early constraints affect long-term costs

### Calibration Targets
| Metric | Value | Source |
|--------|-------|--------|
| Global Pop Peak | ~9B, 2053-2055 | Fernández-Villaverde |
| Pop 2100 | ~8.2B (declining) | Model projection |
| China 2100 | ~0.84B (40% decline) | Fernández-Villaverde |
| Dependency 2025→2075 | 20% → 44% | Model projection |
| Global electricity 2025 | ~30,000 TWh | IEA |
| Global electricity 2050 | 52,000-71,000 TWh | IEA, IRENA |
| Hydro capacity 2025 | ~1,400 GW | IEA |
| Hydro share 2025 | ~16% of electricity | IEA |
| Electrification 2050 | ~65% | IEA Net Zero |
| Asia-Pacific share 2050 | >50% | IEA |
| Total emissions 2025 | ~35 Gt CO2 | IEA |
| Electricity emissions 2025 | ~10 Gt CO2 | IEA |
| Grid intensity 2025 | ~340 kg CO2/MWh | Computed |
| Temperature 2025 | 1.2°C | NASA |
| Atmospheric CO2 2025 | 420 ppm | NOAA |
| China college share 2025 | ~22% | World Bank |
| Global college share 2050 | ~36% | Model projection |
| China college peak | ~2040 | Model projection |
| OECD wage premium 2025 | 1.5× | OECD |
| Global K/Y ratio | ~3.5 | Penn World Table |
| Global capital stock | ~$420T | Penn World Table |
| Global savings rate | ~22% | Model (demographic-weighted) |
| Real interest rate | ~4% | Model (r = αY/K - δ) |
| Robot density (global) | ~12/1000 | Model calibration |
| Global copper demand 2025 | ~26 Mt/year | ICSG |
| Solar copper intensity | 2.8 t/MW | IEA |
| Wind copper intensity | 3.5 t/MW | IEA |
| Global lithium demand 2025 | ~0.8 Mt LCE/year | Benchmark Minerals |
| Battery lithium intensity | 0.6 t LCE/GWh | BloombergNEF |
| Global calories 2025 | ~2800 kcal/capita/day | FAO |
| Protein share OECD | ~15% | FAO |
| Protein share global | ~11% | FAO |
| Cropland 2025 | 4.8 Bha | FAO |
| Urban area 2025 | ~50 Mha | UN |
| Forest area 2025 | 4.0 Bha | FAO |
| Desert/barren 2025 | ~4.1 Bha | Residual (13B - others) |
| Total land area | 13 Bha | FAO (ice-free) |
| Forest carbon density | 100-200 t C/ha | IPCC AR6 |
| Sequestration rate | 5-10 t CO₂/ha/yr | IPCC SRCCL |
| Global LULUCF 2025 | ~5-6 Gt CO₂/yr (net) | GCP |
| Robot baseline 2025 | 1/1000 workers (~50 TWh) | Datacenter + physical robots |
| Robot growth rate | 12%/year | AI/automation acceleration |
| Robot energy | 10 MWh/robot-unit/year | Datacenter + physical avg |
| Baseline LCOE | $50/MWh | 2025 grid-average |
| Expansion coefficient | 25% per halving | Log form (conservative) |
| Max demand growth | 2.5%/year | Infrastructure build rate cap |
| Total final energy 2025 | ~122,000 TWh | IEA |
| Final energy/capita/day 2025 | ~40 kWh | IEA-calibrated |
| Final energy/capita/day 2050 | ~50 kWh | Twin-Engine |
| Final energy/capita/day 2100 | ~56 kWh | Twin-Engine |
| Electrification 2025 | ~25% | IEA (30,000/122,000 TWh) |
| Transport electrification 2025 | ~2% | IEA/BNEF |
| Buildings electrification 2025 | ~35% | IEA |
| Industry electrification 2025 | ~30% | IEA |
| Transport electrification 2050 | ~66% | Model projection |
| Oil share of non-electric 2025 | ~40% | Model output |
| Non-electric emissions 2025 | ~25 Gt | IEA (fuel-based) |
| Energy burden 2025 | ~5-7% of GDP | IEA (energy cost / GDP) |
| 1970s crisis peak | 10-14% of GDP | Historical |
| Burden threshold | 8% of GDP | Midpoint (constraint activates) |
| Max sustainable burden | 14% of GDP | Historical max |
| Burden elasticity | 1.5 | GDP damage per % excess burden |
| Fuel price - oil | ~$50/MWh | ~$80/barrel equivalent |
| Fuel price - gas | ~$25/MWh | US/global blend |
| Fuel price - coal | ~$15/MWh | Before carbon pricing |
| Yield damage threshold | 2.0°C | Schlenker/Roberts (2009) proxy |
| Yield damage at 3°C | ~13% loss | Quadratic damage curve |
| Yield damage at 4°C | ~37% loss | Schlenker/Roberts: 30-46% |

### Validation Scenarios
1. **Business as Usual** (carbon $0): Emissions plateau ~2040, 3-4°C by 2100
2. **Paris-aligned** (carbon $100+): Peak 2030, <2°C achievable
3. **Aggressive** (carbon $150, high learning): Near-zero by 2070

## Model Architecture

This section provides a systems-level view of what's exogenous vs endogenous, key feedback loops, and what typically binds.

### Exogenous Inputs (Given)

**Energy Technology**
- Learning curve α (Wright's Law exponent) — Farmer/Way 2021, Naam 2020
- Initial costs and capacities (2025 baseline) — IEA, BloombergNEF
- Capacity factors and penetration limits — engineering constraints
- Asset lifetimes — industry data

**Climate Physics**
- Climate sensitivity (°C per CO₂ doubling) — IPCC AR6: 2.5-4.0°C
- Damage coefficients — Nordhaus DICE-2023, regional multipliers
- Airborne fraction (45%) — carbon cycle chemistry
- Tipping threshold — PNAS 2021

**Demographics**
- Initial population by region/cohort (2025) — UN WPP
- Fertility floor by region — Fernández-Villaverde 2023
- Mortality improvement rates — UN life tables
- College enrollment targets — World Bank

**Economics**
- Initial GDP by region (2025) — IMF
- TFP growth rates — historical extrapolation
- OLG savings rates by age — lifecycle theory
- Initial capital stock (~$420T) — Penn World Table

**Galbraith/Chen Entropy Economics**
The key theoretical anchor: energy transitions are ADDITIVE, not substitutive (G/C 2021, Odum 1971, Lotka 1922).

When energy costs drop:
- Released resources get reinvested into new activities
- New "species" emerge (robots, AI, datacenters) — ecological succession
- Total energy throughput expands rather than declining

This prevents the unrealistic "power down" scenario that pure efficiency models produce.

### Endogenous Variables (Computed)

**Energy System**
- LCOE by source (f: cumulative capacity, learning α, carbon price)
- Cumulative capacity (f: capacity state, additions, retirements)
- Dispatch mix (f: LCOE merit order, penetration limits, demand)
- Grid intensity (f: dispatch mix, emission factors)

**Demographics**
- Fertility rate (f: time, regional floor, convergence rate)
- Population by cohort (f: births, deaths, aging transitions)
- Effective workers (f: working-age pop, college share, wage premium)
- Dependency ratio (f: elderly / working-age)

**Economy**
- GDP by region (f: TFP growth, effective workers, lagged damages, lagged energy burden)
- Savings rate (f: demographic composition, regional premiums)
- Uncertainty premium Φ (f: uncertainty², λ=2.0) — G/C (currently climate, future: social unrest, etc.)
- Investment (f: GDP × savings × stability)
- Capital stock (f: prior capital, investment, depreciation)
- Interest rate (f: αY/K - δ) — marginal product of capital
- Energy cost (f: dispatch × LCOE + fuel demand × prices) — supply-side constraint
- Energy burden (f: energy cost / GDP) — threshold-based damage when >8%

**Climate**
- Emissions (f: dispatch, electrification rate, non-electric baseline)
- Cumulative CO₂ (f: prior cumulative + annual emissions)
- Temperature (f: CO₂ ppm, climate sensitivity, lag)
- Damages (f: temperature², regional multipliers, tipping threshold)

**Capacity State**
- Additions (f: min(demand ceiling, growth cap, investment budget))
- Retirements (f: installed capacity, asset lifetime)
- Installed capacity (f: prior + additions - retirements)

**G/C Expansion**
- Automation energy (f: robot density × 10 MWh/unit) — new species, additive
- Cost expansion (f: log(baseline/LCOE) × 0.25) — continuous, multiplicative
- Infrastructure cap (f: savings rate / baseline) — endogenous, scales with investment
- Adjusted demand (f: (base + automation) × expansion multiplier)

### Key Feedback Loops

1. **Learning → Cost → Deployment → Learning** (positive)
   - More deployment → lower costs → more deployment
   - Constrained by capacity state machine

2. **Damages → Stability → Investment → Capital → GDP → Damages** (negative)
   - Higher damages → lower stability Φ → less investment → lower GDP growth
   - Creates "damage trap" at high warming levels

3. **Efficiency → Demand ↓ → G/C Expansion → Demand ↑** (stabilizing)
   - Efficiency gains reduce demand per unit GDP
   - But cheap energy unlocks new activities + robots fill energy niche
   - G/C: released resources reinvested, not saved

4. **Population ↓ → Workers ↓ → Robots ↑ → Demand stable** (substitution)
   - Demographic decline reduces human workers
   - Automation fills labor gap
   - Robot energy demand prevents demand collapse

5. **Energy Cost → Burden → GDP → Energy Demand → Cost** (stabilizing/constraining)
   - High energy costs create burden on economy (1970s oil shocks)
   - When burden > 8% GDP, growth is constrained
   - Lower GDP → lower energy demand → lower costs
   - Creates stagflation dynamics when supply-constrained

### Binding Constraints

| Constraint | When Binding | Effect |
|------------|--------------|--------|
| Growth cap (30%) | 2025-2040 | Limits solar/wind deployment speed |
| Demand ceiling | 2050+ | Can't overbuild beyond useful capacity |
| Investment budget | High-damage scenarios | Climate uncertainty suppresses investment |
| Infrastructure cap (2.5%/yr) | 2025-2050 | Total demand growth limited by build rate |
| Penetration limits | Always | Nuclear ≤20%, wind ≤35%, solar ≤45% |
| Energy burden (8%) | High carbon + slow transition | GDP constrained when energy cost > 8% GDP |

### The G/C Thesis

The model's central insight: **energy transitions are ADDITIVE, not substitutive**.

G/C observe that historically:
- Coal didn't replace wood — it added to total energy
- Oil didn't replace coal — it added
- When energy costs drop, released resources get reinvested into new activities
- A system that voluntarily restricts growth while cheap energy is available is "evolutionarily disadvantaged"

In this model, when energy becomes cheap:
- Cost reduction unlocks new activities (desalination, DAC, e-fuels, compute)
- New "species" emerge (robots, AI, datacenters) — ecological succession
- Total energy throughput expands rather than declining

**Robots are the key mechanism**—the new species in the economic ecology:
- 2025: ~50 TWh (physical robots + datacenters)
- 2050: ~2,000 TWh (automation acceleration)
- 2100: ~20,000 TWh (25% of electricity)

Without G/C expansion, the model shows demand declining from 2060 onward. With expansion, demand stabilizes because cheap energy creates its own demand.

### Known Limitations

1. **No regional electricity markets** — global dispatch, can't model regional carbon taxes
2. **Elderly education uses fixed multiplier** — should track cohort-specific historical data
3. **No storage dispatch optimization** — battery treated as solar add-on
4. **Graceful decline assumption** — assumes aging economies follow Japan trajectory
5. **No technology breakthroughs** — fusion, advanced geothermal not modeled
6. **Deterministic** — no Monte Carlo uncertainty quantification

### Development Notes

- **Check object usages before adding keys** — Several param objects (`economicParams`, `demographics`) are iterated with `Object.entries()` assuming all keys are of a specific type (e.g., regions). Always grep for usages before adding new keys to avoid breaking iteration loops. Test immediately after each change.

## Adding New Features

### Adding a New Energy Source
1. Add parameters to `energySources` object
2. Add dispatch parameters to `dispatchParams` object
3. Add calculation logic in `runSimulation()` loop
4. Add to `results` object
5. Add chart dataset in `updateCharts()`
6. Add to era table row generation

### Adding a New Region
1. Add to `demographics` object with all required fields
2. Add to `regions` object in `runDemographics()`
3. Add regional damage multiplier to `climateParams.regionalDamage`
4. Add chart datasets in population/dependency/damages charts

## Programmatic Use

```javascript
const energySim = require('./energy-sim.js');

// Suppress console warnings for batch runs
energySim.config.quiet = true;

// Run multiple scenarios
const scenarios = [
  { carbonPrice: 0 },
  { carbonPrice: 50 },
  { carbonPrice: 100 },
  { carbonPrice: 150 }
];

for (const params of scenarios) {
  const m = energySim.runScenario(params);
  console.log(`Carbon $${params.carbonPrice}: ${m.warming2100.toFixed(1)}°C by 2100`);
}
```

## Testing

Run the Node.js test suite:
```bash
node test-energy-burden.js
```

Tests cover:
- Primitives (compound, learningCurve, depletion, logistic)
- Defaults and config
- Demographics model (population, dependency, fertility)
- Demand model (electricity, electrification, intensity)
- Dispatch (capacity, merit order)
- Climate functions (emissions, temperature, damages)
- Capital model (savings, investment, robots)
- Resource model (minerals, food, land)
- G/C expansion (cost expansion, robot energy)
- Full simulation (calibration targets, scenario validation)
- runScenario helper and exports

## Dependencies

- No external dependencies (pure Node.js)

## Planned Phases

- [x] Phase 1: Energy supply-side (LCOE, learning curves, EROEI)
- [x] Phase 2: Demographics (population, dependency ratios)
- [x] Phase 3: Demand model (GDP per working-age adult, electricity demand)
- [x] Phase 4: Climate module (emissions, warming, damages)
- [x] Phase 5: Capital/savings (OLG savings, investment, automation)
- [x] Phase 6: Resource demand (minerals, food, land)
- [x] Phase 7a: G/C Expansion (robot energy, cost expansion)
- [x] Phase 7b: Capacity State (state-machine architecture, investment constraint, retirement)
- [ ] Phase 8: Policy scenarios (carbon tax, immigration, retirement age)

## Academic Sources

### Climate Module
- [DICE-2023 (Nordhaus/Barrage)](https://www.pnas.org/doi/10.1073/pnas.2312030121) - Damage function coefficients
- [Weitzman Fat Tails](https://scholar.harvard.edu/files/weitzman/files/fattaileduncertaintyeconomics.pdf) - Bounded damages approach
- [Farmer/Way (INET Oxford)](https://www.doynefarmer.com/environmental-economics) - Technology learning curves
- [Tipping Points (PNAS)](https://www.pnas.org/doi/10.1073/pnas.2103081118) - Threshold damages
- [Schlenker/Roberts (2009)](sources/Schlenker-Roberts-Crop-Yields.md) - Nonlinear temperature-yield relationship for crops

### G/C Expansion / Entropy Economics
- [Galbraith/Chen Entropy Economics](sources/Galbraith-Chen-Entropy-Economics.md) - Energy transitions are additive, not substitutive
- [Odum Maximum Power Principle](sources/Odum-Maximum-Power-Principle.md) - Systems evolve to maximize energy throughput
- Lotka, A.J. (1922) "Contribution to the Energetics of Evolution" - Maximum power in biological systems
- Jevons, W.S. (1865) "The Coal Question" - Historical observation of efficiency-consumption relationship
- Garrett, T.J. (2011) "Are there basic physical constraints on future anthropogenic emissions of carbon dioxide?" - Economy-energy coupling

### Demographics
- [Fernández-Villaverde (2023)](https://www.sas.upenn.edu/~jesusfv/) - Fertility convergence thesis
- UN World Population Prospects - Initial population data

### Energy Technology
- [Farmer/Way (2021)](https://www.inet.ox.ac.uk/publications/empirically-grounded-technology-forecasts-and-the-energy-transition/) - Technology learning curves, solar cost projections
- [Naam (2020)](https://rameznaam.com/2020/05/14/solars-future-is-insanely-cheap-2020/) - Solar learning rates and cost trajectories
- IEA World Energy Outlook - Capacity and demand baselines

### Economics
- Penn World Table - Capital stock estimates
- OECD - Wage premiums and education returns
- Chetty et al. - Differential mortality by education
