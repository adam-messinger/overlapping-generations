/**
 * Simple runner to test the framework
 *
 * Run with: npx ts-node --esm src/run.ts
 * Or after npm install: npm start
 */

import { demographicsModule } from './modules/demographics.js';
import { climateModule } from './modules/climate.js';

console.log('=== tsimulation Framework Demo ===\n');

// =============================================================================
// DEMO 1: Run demographics module standalone
// =============================================================================

console.log('--- Demographics Module (standalone) ---\n');

// Initialize
const demoParams = demographicsModule.mergeParams({});
const validation = demographicsModule.validate(demoParams);

if (!validation.valid) {
  console.error('Validation failed:', validation.errors);
  process.exit(1);
}

let demoState = demographicsModule.init(demoParams);

// Run for select years
const sampleYears = [2025, 2030, 2040, 2050, 2075, 2100];

console.log('Year    Population    Working    Dependency    CollegeShare');
console.log('----    ----------    -------    ----------    ------------');

for (let year = 2025; year <= 2100; year++) {
  const yearIndex = year - 2025;

  const { state: newState, outputs } = demographicsModule.step(
    demoState,
    {}, // No inputs needed
    demoParams,
    year,
    yearIndex
  );

  demoState = newState;

  if (sampleYears.includes(year)) {
    console.log(
      `${year}    ${(outputs.population / 1e9).toFixed(2)}B         ` +
      `${(outputs.working / 1e9).toFixed(2)}B      ` +
      `${(outputs.dependency * 100).toFixed(1)}%          ` +
      `${(outputs.collegeShare * 100).toFixed(1)}%`
    );
  }
}

// =============================================================================
// DEMO 2: Run climate module with synthetic emissions
// =============================================================================

console.log('\n--- Climate Module (with synthetic emissions) ---\n');

const climateParams = climateModule.mergeParams({});
let climateState = climateModule.init(climateParams);

// Simulate different emission scenarios
const scenarios = [
  { name: 'BAU', emissions: (year: number) => 40 - (year - 2025) * 0.1 }, // Slow decline
  { name: 'Net Zero', emissions: (year: number) => Math.max(0, 40 - (year - 2025) * 0.8) }, // Fast decline
];

for (const scenario of scenarios) {
  console.log(`\nScenario: ${scenario.name}`);
  console.log('Year    Emissions    CO2 ppm    Temperature    Damages');
  console.log('----    ---------    -------    -----------    -------');

  climateState = climateModule.init(climateParams);

  for (let year = 2025; year <= 2100; year++) {
    const yearIndex = year - 2025;
    const emissions = scenario.emissions(year);

    const { state: newState, outputs } = climateModule.step(
      climateState,
      { emissions },
      climateParams,
      year,
      yearIndex
    );

    climateState = newState;

    if (sampleYears.includes(year)) {
      console.log(
        `${year}    ${emissions.toFixed(1)} Gt       ` +
        `${outputs.co2ppm.toFixed(0)}        ` +
        `${outputs.temperature.toFixed(2)}°C         ` +
        `${(outputs.damages * 100).toFixed(1)}%`
      );
    }
  }
}

// =============================================================================
// DEMO 3: Simple wired simulation (demographics → climate)
// =============================================================================

console.log('\n--- Simple Coupled Simulation ---\n');
console.log('Demographics provides population, which scales emissions\n');

// Reset states
demoState = demographicsModule.init(demoParams);
climateState = climateModule.init(climateParams);

console.log('Year    Population    Per-Capita    Total Emissions    Temperature');
console.log('----    ----------    ----------    ---------------    -----------');

for (let year = 2025; year <= 2100; year++) {
  const yearIndex = year - 2025;

  // Step 1: Demographics (no inputs)
  const demoResult = demographicsModule.step(
    demoState,
    {},
    demoParams,
    year,
    yearIndex
  );
  demoState = demoResult.state;

  // Step 2: Calculate emissions from population
  // (In real simulation, this would come from demand + dispatch modules)
  const popBillions = demoResult.outputs.population / 1e9;
  const perCapitaEmissions = 4.5 * Math.exp(-yearIndex * 0.02); // Declining per-capita
  const totalEmissions = popBillions * perCapitaEmissions;

  // Step 3: Climate (takes emissions as input)
  const climateResult = climateModule.step(
    climateState,
    { emissions: totalEmissions },
    climateParams,
    year,
    yearIndex
  );
  climateState = climateResult.state;

  if (sampleYears.includes(year)) {
    console.log(
      `${year}    ${popBillions.toFixed(2)}B         ` +
      `${perCapitaEmissions.toFixed(2)} t        ` +
      `${totalEmissions.toFixed(1)} Gt            ` +
      `${climateResult.outputs.temperature.toFixed(2)}°C`
    );
  }
}

console.log('\n=== Demo Complete ===');
console.log('\nThis demonstrates:');
console.log('1. Modules can run standalone with no dependencies');
console.log('2. Modules can run with synthetic inputs for testing');
console.log('3. Modules can be manually wired for simple coupling');
console.log('\nNext step: Use the Simulation class for automatic dependency resolution');
