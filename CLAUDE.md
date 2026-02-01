# Overlapping Generations Energy Simulation

An interactive economic simulation exploring energy transitions and demographic shifts from 2025-2100.

## Project Structure

```
overlapping-generations/
├── energy-sim.html      # Single-file simulation (HTML + JS + CSS)
├── sources/             # Reference papers and data sources
│   └── README.md        # Links to Fernández-Villaverde papers, etc.
└── CLAUDE.md            # This file
```

## Architecture

The simulation is a single HTML file with embedded JavaScript, designed for simplicity and portability. No build step required - just open in a browser.

### Code Organization (in energy-sim.html)

The `<script>` section is organized into clear modules:

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
   - `economicParams` object - Regional GDP, TFP growth, energy intensity
   - `demandParams` object - Electrification targets and rates
   - `runDemandModel()` - Calculate electricity demand from demographics + GDP

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

10. **SIMULATION ENGINE**
   - `runSimulation()` - Main loop, returns energy + demographics + climate + capital + resources data
   - `findCrossovers()` - Detect when clean energy beats fossil

11. **VISUALIZATION** - Chart.js-based charts and UI updates
   - `updateCharts()` - Redraws all charts on parameter change

### Console API

Access simulation data via `window.energySim`:

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
const { years, results, demographics, demand, climate, dispatch, capital, resources } = energySim.runSimulation({
  carbonPrice: 100,
  solarAlpha: 0.25,
  solarGrowth: 0.25,
  electrificationTarget: 0.70,
  efficiencyMultiplier: 1.2,
  climSensitivity: 3.0
});

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

// Export full run as JSON
const json = energySim.exportJSON({ carbonPrice: 100 });
```

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
| Crop yield | t/ha |

## Key Models

### Energy (Phase 1)
- **Solar/Wind**: Wright's Law learning curves (cost falls with cumulative deployment)
- **Gas/Coal**: EROEI depletion + carbon pricing
- **Battery**: Learning curve, combined with solar for dispatchable clean energy

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
- **Galbraith/Chen Stability**: Investment suppressed by climate uncertainty: Φ = 1/(1 + λ×damages²) with λ=2.0
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
- **Land Demand**: Farmland, urban, forest
  - Farmland = grain demand / yield (yield improves 1%/year)
  - Urban grows with population and wealth
  - Forest declines with baseline loss rate

### Calibration Targets
| Metric | Value | Source |
|--------|-------|--------|
| Global Pop Peak | ~9B, 2053-2055 | Fernández-Villaverde |
| Pop 2100 | ~8.2B (declining) | Model projection |
| China 2100 | ~0.84B (40% decline) | Fernández-Villaverde |
| Dependency 2025→2075 | 20% → 44% | Model projection |
| Global electricity 2025 | ~30,000 TWh | IEA |
| Global electricity 2050 | 52,000-71,000 TWh | IEA, IRENA |
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

### Validation Scenarios
1. **Business as Usual** (carbon $0): Emissions plateau ~2040, 3-4°C by 2100
2. **Paris-aligned** (carbon $100+): Peak 2030, <2°C achievable
3. **Aggressive** (carbon $150, high learning): Near-zero by 2070

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

### Adding a New Chart
1. Add `<canvas>` element in HTML
2. Declare chart variable (e.g., `let newChart = null`)
3. Add Chart.js initialization in `updateCharts()`
4. Remember to call `.destroy()` before recreating

## Headless / Programmatic Use

The simulation core has no DOM dependencies. UI code only runs in browser environments.

```javascript
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

Open `test.html` in a browser to run the test suite. Tests cover:
- Primitives (compound, learningCurve, depletion, logistic)
- Defaults and config
- Demographics model (population, dependency, fertility)
- Demand model (electricity, electrification, intensity)
- Dispatch (capacity, merit order)
- Climate functions (emissions, temperature, damages)
- Capital model (savings, investment, robots)
- Resource model (minerals, food, land)
- Full simulation (calibration targets, scenario validation)
- runScenario helper and exports

Tests run in-browser via iframe to access the full `energySim` API.

## Dependencies

- **Chart.js** (CDN): Visualization library
- No other external dependencies

## Planned Phases

- [x] Phase 1: Energy supply-side (LCOE, learning curves, EROEI)
- [x] Phase 2: Demographics (population, dependency ratios)
- [x] Phase 3: Demand model (GDP per working-age adult, electricity demand)
- [x] Phase 4: Climate module (emissions, warming, damages)
- [x] Phase 5: Capital/savings (OLG savings, investment, automation)
- [x] Phase 6: Resource demand (minerals, food, land)
- [ ] Phase 7: Policy scenarios (carbon tax, immigration, retirement age)

## Academic Sources

### Climate Module
- [DICE-2023 (Nordhaus/Barrage)](https://www.pnas.org/doi/10.1073/pnas.2312030121) - Damage function coefficients
- [Weitzman Fat Tails](https://scholar.harvard.edu/files/weitzman/files/fattaileduncertaintyeconomics.pdf) - Bounded damages approach
- [Farmer/Way (INET Oxford)](https://www.doynefarmer.com/environmental-economics) - Technology learning curves
- [Tipping Points (PNAS)](https://www.pnas.org/doi/10.1073/pnas.2103081118) - Threshold damages
