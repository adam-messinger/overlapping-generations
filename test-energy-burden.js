#!/usr/bin/env node
/**
 * Tests for Energy Burden Constraints (Issue #7)
 *
 * Run with: node test-energy-burden.js
 */

const e = require('./energy-sim.js');
e.config.quiet = true;

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        const result = fn();
        if (result === true) {
            console.log(`  ✓ ${name}`);
            passed++;
        } else {
            console.log(`  ✗ ${name}: Expected true, got ${result}`);
            failed++;
        }
    } catch (err) {
        console.log(`  ✗ ${name}: ${err.message}`);
        failed++;
    }
}

function approx(actual, expected, tolerance = 0.1) {
    const ratio = actual / expected;
    return ratio >= (1 - tolerance) && ratio <= (1 + tolerance);
}

function inRange(actual, min, max) {
    return actual >= min && actual <= max;
}

// =============================================================================
// ENERGY BURDEN FUNCTION TESTS
// =============================================================================

console.log('\n=== Energy Burden Functions ===\n');

test('energyBurdenDamage exists', () => {
    return typeof e.energyBurdenDamage === 'function';
});

test('calculateEnergyCost exists', () => {
    return typeof e.calculateEnergyCost === 'function';
});

test('fuelPrices constant exists', () => {
    return typeof e.fuelPrices === 'object' && e.fuelPrices.oil > 0;
});

test('economicParams.energyBurden exists', () => {
    return e.economicParams.energyBurden && e.economicParams.energyBurden.threshold === 0.08;
});

// Test energyBurdenDamage function
test('Burden below threshold returns no damage', () => {
    const result = e.energyBurdenDamage(5, 100);  // 5% burden
    return result.burden === 0.05 && result.damage === 0 && result.constrained === false;
});

test('Burden at threshold returns no damage', () => {
    const result = e.energyBurdenDamage(8, 100);  // Exactly 8% burden
    return result.burden === 0.08 && result.damage === 0 && result.constrained === false;
});

test('Burden above threshold returns damage', () => {
    const result = e.energyBurdenDamage(12, 100);  // 12% burden
    // 4% excess × 1.5 elasticity = 6% damage
    return result.burden === 0.12 &&
           result.constrained === true &&
           approx(result.damage, 0.06, 0.01);
});

test('Burden damage capped at 30%', () => {
    const result = e.energyBurdenDamage(50, 100);  // 50% burden - extreme
    return result.damage === 0.30;  // Capped at 30%
});

// Test calculateEnergyCost function
test('calculateEnergyCost calculates electricity cost', () => {
    const dispatch = { solar: 5000, wind: 3000, gas: 2500, coal: 0, nuclear: 2000, hydro: 4000 };
    const lcoes = { solar: 30, wind: 35, gas: 60, coal: 50, nuclear: 70 };
    const fuelDemand = { oil: 0, gas: 0, coal: 0, biomass: 0, hydrogen: 0, biofuel: 0 };
    const result = e.calculateEnergyCost(dispatch, lcoes, fuelDemand, 0);

    // Expected: (5000×30 + 3000×35 + 2500×60 + 0×50 + 2000×70 + 4000×40) / 1e6
    // = (150000 + 105000 + 150000 + 0 + 140000 + 160000) / 1e6 = 0.705T
    return approx(result.electricity, 0.705, 0.01) && result.nonElectric === 0;
});

test('calculateEnergyCost includes carbon cost on fuels', () => {
    const dispatch = { solar: 0, wind: 0, gas: 0, coal: 0, nuclear: 0, hydro: 0 };
    const lcoes = { solar: 30, wind: 35, gas: 60, coal: 50, nuclear: 70 };
    const fuelDemand = { oil: 10000, gas: 0, coal: 0, biomass: 0, hydrogen: 0, biofuel: 0 };

    const resultNoCO2 = e.calculateEnergyCost(dispatch, lcoes, fuelDemand, 0);
    const resultWithCO2 = e.calculateEnergyCost(dispatch, lcoes, fuelDemand, 100);

    // Carbon cost on oil: 267 kg/MWh × $100/ton = $26.7/MWh
    // 10000 TWh × $26.7/MWh = $267B extra
    return resultWithCO2.nonElectric > resultNoCO2.nonElectric;
});

// =============================================================================
// SIMULATION INTEGRATION TESTS
// =============================================================================

console.log('\n=== Simulation Integration ===\n');

test('Climate output includes energy burden arrays', () => {
    const result = e.runSimulation({ carbonPrice: 50 });
    return Array.isArray(result.climate.energyCost) &&
           Array.isArray(result.climate.energyBurden) &&
           Array.isArray(result.climate.energyBurdenDamage) &&
           result.climate.energyCost.length === 76;  // 2025-2100
});

test('Climate metrics include energy burden values', () => {
    const result = e.runSimulation({ carbonPrice: 50 });
    return typeof result.climate.metrics.energyBurden2025 === 'number' &&
           typeof result.climate.metrics.energyBurden2050 === 'number' &&
           typeof result.climate.metrics.energyBurdenPeak === 'number' &&
           typeof result.climate.metrics.energyBurdenPeakYear === 'number';
});

test('runScenario includes energy burden metrics', () => {
    const m = e.runScenario();
    return typeof m.energyBurden2025 === 'number' &&
           typeof m.energyBurden2050 === 'number' &&
           typeof m.energyBurdenPeak === 'number' &&
           typeof m.energyBurdenPeakYear === 'number' &&
           typeof m.energyCost2025 === 'number';
});

// =============================================================================
// CALIBRATION TESTS
// =============================================================================

console.log('\n=== Calibration Targets ===\n');

test('Energy burden 2025 is ~6-7% (IEA baseline)', () => {
    const m = e.runScenario({ carbonPrice: 35 });
    // Target: 6-7% energy burden in 2025
    return inRange(m.energyBurden2025, 0.04, 0.09);
});

test('Energy burden declines over time with clean energy', () => {
    const m = e.runScenario({ carbonPrice: 50 });
    // As clean energy gets cheaper, burden should decline
    return m.energyBurden2050 < m.energyBurden2025;
});

test('High carbon price increases burden near-term', () => {
    const m1 = e.runScenario({ carbonPrice: 50 });
    const m2 = e.runScenario({ carbonPrice: 300 });
    // $300 carbon should increase burden significantly
    return m2.energyBurden2025 > m1.energyBurden2025 || m2.energyBurdenPeak > m1.energyBurdenPeak;
});

test('High carbon price triggers constraint (burden > 8%)', () => {
    const result = e.runSimulation({ carbonPrice: 300 });
    // At $300 carbon, burden should exceed 8% at some point
    const maxBurden = Math.max(...result.climate.energyBurden);
    return maxBurden > 0.08;
});

test('Constrained scenario shows GDP damage', () => {
    const result = e.runSimulation({ carbonPrice: 300 });
    // If burden exceeds threshold, damage should be > 0
    const maxDamage = Math.max(...result.climate.energyBurdenDamage);
    return maxDamage > 0;
});

// =============================================================================
// FEEDBACK LOOP TESTS
// =============================================================================

console.log('\n=== Feedback Loops ===\n');

test('Energy burden affects GDP through feedback loop', () => {
    // Compare GDP with high vs low burden scenarios
    const lowBurden = e.runSimulation({ carbonPrice: 50 });
    const highBurden = e.runSimulation({ carbonPrice: 300 });

    // High burden scenario should have lower GDP by 2050
    // (not just from climate damages, but also energy burden)
    const gdp2050Low = lowBurden.demand.global.gdp[25];
    const gdp2050High = highBurden.demand.global.gdp[25];

    return gdp2050High < gdp2050Low;
});

test('Energy cost reflects LCOE learning curves', () => {
    const result = e.runSimulation({ carbonPrice: 50 });
    // Energy cost per unit should decline as clean energy gets cheaper
    const cost2025 = result.climate.energyCost[0];
    const cost2050 = result.climate.energyCost[25];
    const gdp2025 = result.demand.global.gdp[0];
    const gdp2050 = result.demand.global.gdp[25];

    // Energy cost as share of GDP should decline
    const burden2025 = cost2025 / gdp2025;
    const burden2050 = cost2050 / gdp2050;

    return burden2050 < burden2025;
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n=== Summary ===\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
    process.exit(1);
}
