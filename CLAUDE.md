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

3. **DEMOGRAPHICS** - Fernández-Villaverde-informed population model
   - `demographics` object - 4 regions (OECD, China, EM, ROW)
   - `projectFertility()` - TFR convergence to floor
   - `birthRateFromTFR()` - Crude birth rate
   - `deathRate()` - Age-specific mortality
   - `ageCohorts()` - 3-cohort aging (young/working/old)
   - `runDemographics()` - Full 2025-2100 projection

4. **SIMULATION ENGINE**
   - `runSimulation()` - Main loop, returns energy + demographics data
   - `findCrossovers()` - Detect when clean energy beats fossil

5. **VISUALIZATION** - Chart.js-based charts and UI updates
   - `updateCharts()` - Redraws all charts on parameter change

### Console API

Access simulation data via `window.energySim`:

```javascript
// Energy primitives
energySim.learningCurve(100, 2, 0.2)  // Cost after doubling capacity
energySim.compound(100, 0.05, 10)     // 5% growth over 10 years

// Demographics data (after page loads)
energySim.demographicsData.global.population[30]     // Global pop 2055
energySim.demographicsData.regions.china.working[50] // China working-age 2075
energySim.demographicsData.global.dependency[50]     // Global dependency 2075

// Run fresh simulation
const { years, results, demographics } = energySim.runSimulation({
  carbonPrice: 100,
  solarAlpha: 0.25,
  solarGrowth: 0.25
});
```

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

### Calibration Targets
| Metric | Value | Source |
|--------|-------|--------|
| Global Pop Peak | ~9B, 2053-2055 | Fernández-Villaverde |
| Pop 2100 | ~8.2B (declining) | Model projection |
| China 2100 | ~0.84B (40% decline) | Fernández-Villaverde |
| Dependency 2025→2075 | 20% → 44% | Model projection |

## Adding New Features

### Adding a New Energy Source
1. Add parameters to `energySources` object
2. Add calculation logic in `runSimulation()` loop
3. Add to `results` object
4. Add chart dataset in `updateCharts()`
5. Add to era table row generation

### Adding a New Region
1. Add to `demographics` object with all required fields
2. Add to `regions` object in `runDemographics()`
3. Add chart datasets in population/dependency charts

### Adding a New Chart
1. Add `<canvas>` element in HTML
2. Declare chart variable (e.g., `let newChart = null`)
3. Add Chart.js initialization in `updateCharts()`
4. Remember to call `.destroy()` before recreating

## Dependencies

- **Chart.js** (CDN): Visualization library
- No other external dependencies

## Planned Phases

- [x] Phase 1: Energy supply-side (LCOE, learning curves, EROEI)
- [x] Phase 2: Demographics (population, dependency ratios)
- [ ] Phase 3: Demand model (GDP per working-age adult)
- [ ] Phase 4: Capital/savings (OLG consumption smoothing)
- [ ] Phase 5: Policy scenarios (carbon tax, immigration, retirement age)
