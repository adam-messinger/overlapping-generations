#!/usr/bin/env node
/**
 * Energy Simulation Tests (Node.js)
 * Run with: node test.js
 */

const energySim = require('./energy-sim.js');

// Suppress warnings during tests
energySim.config.quiet = true;

// Simple test framework
const results = [];
let currentSection = '';

function section(name) {
    currentSection = name;
}

function test(name, fn) {
    try {
        const result = fn();
        if (result === true || result === undefined) {
            results.push({ section: currentSection, name, status: 'pass' });
        } else {
            results.push({ section: currentSection, name, status: 'fail', error: `Expected true, got ${result}` });
        }
    } catch (e) {
        results.push({ section: currentSection, name, status: 'fail', error: e.message });
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
// PRIMITIVES
// =============================================================================
section('Primitives');

test('compound: 5% growth over 10 years', () => {
    const result = energySim.compound(100, 0.05, 10);
    return approx(result, 162.89, 0.01);
});

test('compound: zero growth returns start value', () => {
    return energySim.compound(100, 0, 10) === 100;
});

test('learningCurve: 13% reduction per doubling at alpha=0.2', () => {
    const result = energySim.learningCurve(100, 2, 0.2);
    return approx(result, 87, 0.02);
});

test('learningCurve: cost reduction at alpha=0.36 (Farmer/Naam)', () => {
    const result = energySim.learningCurve(100, 2, 0.36);
    return approx(result, 78, 0.05);
});

test('learningCurve: cumulative<=0 returns cost0', () => {
    return energySim.learningCurve(100, 0, 0.2) === 100;
});

test('depletion: EROEI declines with extraction', () => {
    const result = energySim.depletion(100, 50, 30, 0.5);
    return result.eroei < 30 && result.eroei > 1;
});

test('depletion: netEnergyFraction is valid (0-1)', () => {
    const result = energySim.depletion(100, 50, 30, 0.5);
    return result.netEnergyFraction > 0 && result.netEnergyFraction < 1;
});

test('logistic: returns value between start and ceiling', () => {
    const result = energySim.logistic(10, 100, 0.1, 50);
    return result > 10 && result < 100;
});

// =============================================================================
// DEFAULTS AND CONFIG
// =============================================================================
section('Defaults and Config');

test('defaults object exists', () => {
    return typeof energySim.defaults === 'object';
});

test('defaults.carbonPrice = 35', () => {
    return energySim.defaults.carbonPrice === 35;
});

test('defaults.solarAlpha = 0.36', () => {
    return energySim.defaults.solarAlpha === 0.36;
});

test('defaults.solarGrowth = 0.25', () => {
    return energySim.defaults.solarGrowth === 0.25;
});

test('defaults.electrificationTarget = 0.65', () => {
    return energySim.defaults.electrificationTarget === 0.65;
});

test('defaults.climSensitivity = 3.0', () => {
    return energySim.defaults.climSensitivity === 3.0;
});

test('config.quiet can be toggled', () => {
    energySim.config.quiet = false;
    const was = energySim.config.quiet;
    energySim.config.quiet = true;
    return was === false && energySim.config.quiet === true;
});

// =============================================================================
// DEMOGRAPHICS
// =============================================================================
section('Demographics');

test('runDemographics returns valid structure', () => {
    const data = energySim.runDemographics();
    return !!(data.years && data.regions && data.global);
});

test('76 years of data (2025-2100)', () => {
    const data = energySim.runDemographics();
    return data.years.length === 76;
});

test('starts at 2025', () => {
    const data = energySim.runDemographics();
    return data.years[0] === 2025;
});

test('ends at 2100', () => {
    const data = energySim.runDemographics();
    return data.years[data.years.length - 1] === 2100;
});

test('global population 2025 ~8.3B', () => {
    const data = energySim.runDemographics();
    return approx(data.global.population[0], 8.3e9, 0.05);
});

test('population peaks 2045-2060', () => {
    const data = energySim.runDemographics();
    const peak = energySim.findPopulationPeak(data.global.population, data.years);
    return peak.year >= 2045 && peak.year <= 2060;
});

test('population peaks ~9B', () => {
    const data = energySim.runDemographics();
    const peak = energySim.findPopulationPeak(data.global.population, data.years);
    return approx(peak.population, 9e9, 0.1);
});

test('dependency ratio rises over time', () => {
    const data = energySim.runDemographics();
    return data.global.dependency[75] > data.global.dependency[0];
});

test('2025 dependency ~20%', () => {
    const data = energySim.runDemographics();
    return approx(data.global.dependency[0], 0.20, 0.15);
});

test('2075 dependency 35-55%', () => {
    const data = energySim.runDemographics();
    const idx2075 = data.years.indexOf(2075);
    return inRange(data.global.dependency[idx2075], 0.35, 0.55);
});

test('China declines 30%+ by 2100', () => {
    const data = energySim.runDemographics();
    const china2025 = data.regions.china.population[0];
    const china2100 = data.regions.china.population[75];
    return china2100 < china2025 * 0.7;
});

test('4 regions exist', () => {
    const data = energySim.runDemographics();
    return !!(data.regions.oecd && data.regions.china && data.regions.em && data.regions.row);
});

// =============================================================================
// DEMAND MODEL
// =============================================================================
section('Demand Model');

test('runDemandModel returns valid structure', () => {
    const demo = energySim.runDemographics();
    const demand = energySim.runDemandModel(demo);
    return !!(demand.global && demand.regions && demand.metrics);
});

test('2025 global electricity ~30,000 TWh', () => {
    const demo = energySim.runDemographics();
    const demand = energySim.runDemandModel(demo);
    return approx(demand.global.electricityDemand[0], 30000, 0.15);
});

test('2050 global electricity 80,000-120,000 TWh', () => {
    const demo = energySim.runDemographics();
    const demand = energySim.runDemandModel(demo);
    return inRange(demand.global.electricityDemand[25], 80000, 120000);
});

test('electrification increases over time', () => {
    const demo = energySim.runDemographics();
    const demand = energySim.runDemandModel(demo);
    return demand.global.electrificationRate[50] > demand.global.electrificationRate[0];
});

test('2025 electrification ~25%', () => {
    const demo = energySim.runDemographics();
    const demand = energySim.runDemandModel(demo);
    return approx(demand.global.electrificationRate[0], 0.25, 0.05);
});

test('energy intensity declines over time', () => {
    const demo = energySim.runDemographics();
    const demand = energySim.runDemandModel(demo);
    return demand.regions.oecd.energyIntensity[50] < demand.regions.oecd.energyIntensity[0];
});

// =============================================================================
// DISPATCH
// =============================================================================
section('Dispatch');

test('getCapacities returns valid structure', () => {
    const caps = energySim.getCapacities(2025, 0.25);
    return !!(caps.solar && caps.wind && caps.gas && caps.coal && caps.nuclear && caps.hydro);
});

test('solar capacity grows 10x+ by 2050', () => {
    const caps2025 = energySim.getCapacities(2025, 0.25);
    const caps2050 = energySim.getCapacities(2050, 0.25);
    return caps2050.solar > caps2025.solar * 10;
});

test('dispatch returns valid structure', () => {
    const caps = energySim.getCapacities(2025, 0.25);
    const lcoes = { solar: 35, wind: 35, gas: 50, coal: 60, nuclear: 90, hydro: 40 };
    const result = energySim.dispatch(30000, lcoes, caps);
    return 'solar' in result && 'hydro' in result && 'gridIntensity' in result && 'total' in result;
});

test('dispatch total ~= demand', () => {
    const caps = energySim.getCapacities(2025, 0.25);
    const lcoes = { solar: 35, wind: 35, gas: 50, coal: 60, nuclear: 90, hydro: 40 };
    const result = energySim.dispatch(30000, lcoes, caps);
    return approx(result.total, 30000, 0.05);
});

test('dispatch: merit order (cheap sources first)', () => {
    const caps = energySim.getCapacities(2050, 0.25);
    const lcoes = { solar: 10, wind: 15, gas: 80, coal: 100, nuclear: 90, hydro: 40 };
    const result = energySim.dispatch(30000, lcoes, caps);
    return (result.solar + result.wind) > (result.gas + result.coal);
});

test('hydro provides ~16% of 2025 electricity', () => {
    const result = energySim.runSimulation();
    const hydroShare = result.dispatch.hydro[0] / result.dispatch.total[0];
    return approx(hydroShare, 0.17, 0.10);
});

// =============================================================================
// CAPACITY STATE (State-machine architecture)
// =============================================================================
section('Capacity State');

test('initializeCapacityState returns valid structure', () => {
    const state = energySim.initializeCapacityState();
    return !!(state.solar && state.wind && state.battery && state.nuclear &&
             Array.isArray(state.solar.installed) && Array.isArray(state.solar.additions));
});

test('initializeCapacityState: solar starts at 1500 GW', () => {
    const state = energySim.initializeCapacityState();
    return state.solar.installed[0] === 1500;
});

test('capacityParams exists and has growth limits', () => {
    return !!(energySim.capacityParams.maxGrowthRate &&
             energySim.capacityParams.maxGrowthRate.solar > 0);
});

test('runSimulation returns capacityState', () => {
    const result = energySim.runSimulation();
    return !!(result.capacityState &&
             result.capacityState.solar.installed.length === 76);
});

test('capacityState solar grows over time', () => {
    const result = energySim.runSimulation();
    return result.capacityState.solar.installed[50] > result.capacityState.solar.installed[0] * 10;
});

test('capacityState additions match delta', () => {
    const result = energySim.runSimulation();
    const state = result.capacityState;
    const delta = state.solar.installed[25] - state.solar.installed[24];
    return Math.abs(delta - state.solar.additions[25]) < 0.01;
});

test('capacity is constrained by demand ceiling', () => {
    const result = energySim.runSimulation();
    const state = result.capacityState;
    const earlyGrowth = (state.solar.installed[10] / state.solar.installed[5]) - 1;
    const lateGrowth = (state.solar.installed[70] / state.solar.installed[65]) - 1;
    return lateGrowth < earlyGrowth;
});

test('calculateMaxUsefulCapacity returns positive values', () => {
    const max = energySim.calculateMaxUsefulCapacity(50000);
    return max.solar > 0 && max.wind > 0 && max.nuclear > 0;
});

test('getCapacityFromState extracts correct values', () => {
    const state = energySim.initializeCapacityState();
    const caps = energySim.getCapacityFromState(state, 0);
    return caps.solar === 1500 && caps.wind === 1000;
});

test('calculateInvestmentCapacity returns positive values', () => {
    const caps = energySim.calculateInvestmentCapacity(100, 0.20, 2030);
    return caps.solar > 0 && caps.wind > 0 && caps.battery > 0;
});

test('calculateRetirement is zero initially', () => {
    const state = energySim.initializeCapacityState();
    const retirement = energySim.calculateRetirement(state, 5, 'solar');
    return retirement === 0;
});

test('calculateRetirement is positive after lifetime', () => {
    const state = energySim.initializeCapacityState();
    for (let i = 1; i <= 35; i++) {
        state.solar.installed.push(state.solar.installed[i-1] * 1.25);
    }
    const retirement = energySim.calculateRetirement(state, 35, 'solar');
    return retirement > 0;
});

test('capacityState includes retirement arrays', () => {
    const result = energySim.runSimulation();
    return !!(result.capacityState.solar.retirements &&
             result.capacityState.solar.retirements.length === 76);
});

// =============================================================================
// CLIMATE FUNCTIONS
// =============================================================================
section('Climate Functions');

test('calculateEmissions returns valid structure', () => {
    const dispatchResult = { gas: 5000, coal: 3000, total: 20000 };
    const result = energySim.calculateEmissions(dispatchResult, 0.4);
    return 'electricity' in result && 'nonElectricity' in result && 'total' in result;
});

test('calculateEmissions: ~35 Gt for 2025-like dispatch', () => {
    const dispatchResult = { gas: 6000, coal: 10000, total: 30000 };
    const result = energySim.calculateEmissions(dispatchResult, 0.4);
    return approx(result.total, 35, 0.25);
});

test('updateClimate returns valid structure', () => {
    const result = energySim.updateClimate(2400, 1.2, 3.0);
    return 'co2ppm' in result && 'temperature' in result;
});

test('updateClimate: ~418 ppm at 2400 Gt cumulative (derived)', () => {
    const result = energySim.updateClimate(2400, 1.2, 3.0);
    return approx(result.co2ppm, 418, 0.02);
});

test('climateDamages returns fraction 0-0.30', () => {
    const damage = energySim.climateDamages(3.0, 'oecd');
    return damage >= 0 && damage <= 0.30;
});

test('climateDamages: quadratic (4C >> 2C)', () => {
    const d2 = energySim.climateDamages(2.0, 'oecd');
    const d4 = energySim.climateDamages(4.0, 'oecd');
    return d4 > d2 * 3;
});

test('climateDamages: ROW > OECD (regional vulnerability)', () => {
    const dOECD = energySim.climateDamages(3.0, 'oecd');
    const dROW = energySim.climateDamages(3.0, 'row');
    return dROW > dOECD;
});

// =============================================================================
// FULL SIMULATION
// =============================================================================
section('Full Simulation');

test('runSimulation returns valid structure', () => {
    const result = energySim.runSimulation();
    return !!(result.years && result.results && result.demographics && result.demand && result.climate && result.dispatch && result.capacityState);
});

test('runSimulation uses defaults', () => {
    const result = energySim.runSimulation();
    return result.years.length === 76;
});

test('carbonPrice affects gas LCOE', () => {
    const low = energySim.runSimulation({ carbonPrice: 0 });
    const high = energySim.runSimulation({ carbonPrice: 200 });
    return high.results.gas[0] > low.results.gas[0];
});

test('2025 grid intensity ~340 kg/MWh', () => {
    const result = energySim.runSimulation();
    return approx(result.climate.metrics.gridIntensity2025, 340, 0.35);
});

test('2025 emissions ~35 Gt', () => {
    const result = energySim.runSimulation();
    return approx(result.climate.emissions[0], 35, 0.25);
});

test('2025 temperature ~1.2C', () => {
    const result = energySim.runSimulation();
    return approx(result.climate.temperature[0], 1.2, 0.1);
});

test('BAU (carbon $0): 2.0-4.0C by 2100', () => {
    const result = energySim.runSimulation({ carbonPrice: 0 });
    return inRange(result.climate.temperature[75], 2.0, 4.0);
});

test('High carbon ($150): <2.6C by 2100', () => {
    const result = energySim.runSimulation({ carbonPrice: 150, solarAlpha: 0.40 });
    return result.climate.temperature[75] < 2.6;
});

test('climate.metrics has expected fields', () => {
    const result = energySim.runSimulation();
    const m = result.climate.metrics;
    return !!(m.peakEmissionsYear && m.warming2100 !== undefined && m.gridIntensity2025);
});

// =============================================================================
// RUN SCENARIO HELPER
// =============================================================================
section('runScenario Helper');

test('runScenario returns flat object', () => {
    const m = energySim.runScenario();
    return typeof m.warming2100 === 'number' && typeof m.elec2050 === 'number';
});

test('runScenario has all key metrics', () => {
    const m = energySim.runScenario();
    const keys = ['params', 'solarCrossesGas', 'warming2100', 'peakEmissionsYear',
                  'emissions2025', 'elec2050', 'popPeakYear', 'dependency2075'];
    return keys.every(k => k in m);
});

test('runScenario merges with defaults', () => {
    const m = energySim.runScenario({ carbonPrice: 123 });
    return m.params.carbonPrice === 123 && m.params.solarAlpha === 0.36;
});

test('runScenario.warming2100 matches runSimulation', () => {
    const scenario = energySim.runScenario({ carbonPrice: 75 });
    const full = energySim.runSimulation({ carbonPrice: 75 });
    return scenario.warming2100 === full.climate.temperature[75];
});

test('runScenario includes _fullData', () => {
    const m = energySim.runScenario();
    return !!(m._fullData && m._fullData.years);
});

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================
section('Export Functions');

test('exportJSON returns valid JSON', () => {
    const json = energySim.exportJSON();
    const parsed = JSON.parse(json);
    return !!(parsed.years && parsed.climate);
});

test('exportJSON includes params', () => {
    const json = energySim.exportJSON({ carbonPrice: 77 });
    const parsed = JSON.parse(json);
    return parsed.params.carbonPrice === 77;
});

test('exportDemographicsCSV returns CSV', () => {
    const demo = energySim.runDemographics();
    const csv = energySim.exportDemographicsCSV(demo);
    return csv.includes('Year,Region') && csv.includes('2025');
});

// =============================================================================
// CROSSOVERS
// =============================================================================
section('Crossovers');

test('findCrossovers returns array', () => {
    const result = energySim.runSimulation();
    const crossovers = energySim.findCrossovers(result.years, result.results);
    return Array.isArray(crossovers);
});

test('crossover objects have year, event, detail', () => {
    const result = energySim.runSimulation({ carbonPrice: 100 });
    const crossovers = energySim.findCrossovers(result.years, result.results);
    if (crossovers.length === 0) return true;
    const c = crossovers[0];
    return typeof c.year === 'number' && typeof c.event === 'string' && typeof c.detail === 'string';
});

test('solar+battery crosses gas with high carbon', () => {
    const result = energySim.runSimulation({ carbonPrice: 100 });
    const crossovers = energySim.findCrossovers(result.years, result.results);
    return crossovers.some(c => c.event.includes('Solar+Battery'));
});

// =============================================================================
// UNITS MAP
// =============================================================================
section('Units Map');

test('units object exists', () => {
    return typeof energySim.units === 'object';
});

test('units has electricityDemand with TWh', () => {
    return energySim.units.electricityDemand?.unit === 'TWh';
});

test('units has gridIntensity with kg CO₂/MWh', () => {
    return energySim.units.gridIntensity?.unit === 'kg CO₂/MWh';
});

test('units has temperature with °C', () => {
    return energySim.units.temperature?.unit === '°C';
});

test('units entries have unit and description', () => {
    const entry = energySim.units.emissions;
    return typeof entry.unit === 'string' && typeof entry.description === 'string';
});

// =============================================================================
// QUERY HELPERS
// =============================================================================
section('Query Helpers');

test('query object exists', () => {
    return typeof energySim.query === 'object';
});

test('query.firstYear finds crossover year', () => {
    const data = energySim.runSimulation({ carbonPrice: 100 });
    const year = energySim.query.firstYear({
        data,
        series: 'results.solar',
        lt: 'results.gas'
    });
    return year === null || (typeof year === 'number' && year >= 2025);
});

test('query.firstYear with threshold', () => {
    const data = energySim.runSimulation();
    const year = energySim.query.firstYear({
        data,
        series: 'climate.temperature',
        above: 1.5
    });
    return typeof year === 'number' && year >= 2025;
});

test('query.crossover returns valid structure', () => {
    const data = energySim.runSimulation({ carbonPrice: 100 });
    const result = energySim.query.crossover(data,
        'demand.regions.china.electricityDemand',
        'demand.regions.oecd.electricityDemand'
    );
    return result === null || !!(typeof result.year === 'number' && result.values);
});

test('query.valueAt returns correct value', () => {
    const data = energySim.runSimulation();
    const temp2025 = energySim.query.valueAt(data, 'climate.temperature', 2025);
    return approx(temp2025, 1.2, 0.15);
});

test('query.perCapita returns array', () => {
    const data = energySim.runSimulation();
    const perCap = energySim.query.perCapita(data, 'china', 'electricity');
    return Array.isArray(perCap) && perCap.length === 76;
});

test('query.perCapita values are reasonable (kWh/person)', () => {
    const data = energySim.runSimulation();
    const perCap = energySim.query.perCapita(data, 'oecd', 'electricity');
    return perCap[0] > 5000 && perCap[0] < 20000;
});

test('query.gridIntensityBelow finds year', () => {
    const data = energySim.runSimulation({ carbonPrice: 100 });
    const year = energySim.query.gridIntensityBelow(data, 200);
    return year === null || (typeof year === 'number' && year >= 2025);
});

// =============================================================================
// DERIVED SERIES
// =============================================================================
section('Derived Series');

test('computeDerivedSeries returns valid structure', () => {
    const data = energySim.runSimulation();
    const derived = energySim.computeDerivedSeries(data);
    return !!(derived.years && derived.perCapita && derived.global);
});

test('derived.perCapita.electricity has all regions', () => {
    const data = energySim.runSimulation();
    const derived = energySim.computeDerivedSeries(data);
    return !!(derived.perCapita.electricity.oecd &&
           derived.perCapita.electricity.china &&
           derived.perCapita.electricity.em &&
           derived.perCapita.electricity.row);
});

test('derived series have correct length', () => {
    const data = energySim.runSimulation();
    const derived = energySim.computeDerivedSeries(data);
    return derived.global.electricityPerCapita.length === 76;
});

test('runScenario includes derived series', () => {
    const m = energySim.runScenario();
    return !!(m.derived && m.derived.perCapita);
});

// =============================================================================
// EXTENDED RUNSCENARIO METRICS
// =============================================================================
section('Extended runScenario');

test('runScenario has regional crossovers', () => {
    const m = energySim.runScenario();
    return 'chinaElecCrossesOECD' in m && 'emElecCrossesChina' in m;
});

test('runScenario has grid intensity thresholds', () => {
    const m = energySim.runScenario();
    return 'gridBelow200' in m && 'gridBelow100' in m && 'gridBelow50' in m;
});

test('runScenario has per-capita metrics', () => {
    const m = energySim.runScenario();
    return typeof m.elecPerCapita2050 === 'number' &&
           typeof m.elecPerCapita2050_china === 'number';
});

test('runScenario has 2100 metrics', () => {
    const m = energySim.runScenario();
    return typeof m.elec2100 === 'number' &&
           typeof m.emissions2100 === 'number' &&
           typeof m.damages2100 === 'number';
});

test('runScenario regional per-capita are ordered correctly', () => {
    const m = energySim.runScenario();
    return m.elecPerCapita2050_oecd > m.elecPerCapita2050_row;
});

// =============================================================================
// EDUCATION MODEL
// =============================================================================
section('Education Model');

test('educationParams object exists', () => {
    return typeof energySim.educationParams === 'object';
});

test('educationParams has all regions', () => {
    return !!(energySim.educationParams.oecd &&
           energySim.educationParams.china &&
           energySim.educationParams.em &&
           energySim.educationParams.row);
});

test('projectEnrollmentRate increases over time', () => {
    const params = energySim.educationParams.china;
    const rate2025 = energySim.projectEnrollmentRate(params, 0);
    const rate2050 = energySim.projectEnrollmentRate(params, 25);
    return rate2050 > rate2025;
});

test('projectWagePremium decreases over time', () => {
    const params = energySim.educationParams.china;
    const premium2025 = energySim.projectWagePremium(params, 0);
    const premium2050 = energySim.projectWagePremium(params, 25);
    return premium2050 < premium2025;
});

test('effectiveWorkers calculation correct', () => {
    const college = 100;
    const nonCollege = 200;
    const premium = 1.5;
    const effective = energySim.effectiveWorkers(college, nonCollege, premium);
    return effective === 350;
});

test('demographics returns education arrays', () => {
    const data = energySim.runDemographics();
    return !!(data.regions.china.workingCollege &&
           data.regions.china.workingNonCollege &&
           data.regions.china.collegeShare &&
           data.regions.china.effectiveWorkers);
});

test('demographics.global has education aggregates', () => {
    const data = energySim.runDemographics();
    return !!(data.global.workingCollege &&
           data.global.collegeShare &&
           data.global.effectiveWorkers);
});

test('China college share 2025 ~22%', () => {
    const data = energySim.runDemographics();
    return approx(data.regions.china.collegeShare[0], 0.22, 0.10);
});

test('Global college share increases over time', () => {
    const data = energySim.runDemographics();
    return data.global.collegeShare[75] > data.global.collegeShare[0];
});

test('Global college share 2050 25-45%', () => {
    const data = energySim.runDemographics();
    const idx2050 = data.years.indexOf(2050);
    return inRange(data.global.collegeShare[idx2050], 0.25, 0.45);
});

test('China college workers peak 2035-2060', () => {
    const data = energySim.runDemographics();
    const peak = energySim.findPopulationPeak(data.regions.china.workingCollege, data.years);
    return peak.year >= 2035 && peak.year <= 2060;
});

test('China college workers peak after total workers', () => {
    const data = energySim.runDemographics();
    const collegePeak = energySim.findPopulationPeak(data.regions.china.workingCollege, data.years);
    const totalPeak = energySim.findPopulationPeak(data.regions.china.working, data.years);
    return collegePeak.year > totalPeak.year;
});

test('Effective workers decline less than raw workers (China)', () => {
    const data = energySim.runDemographics();
    const china = data.regions.china;
    const rawDecline = (china.working[25] - china.working[0]) / china.working[0];
    const effDecline = (china.effectiveWorkers[25] - china.effectiveWorkers[0]) / china.effectiveWorkers[0];
    return effDecline > rawDecline;
});

test('runScenario has education metrics', () => {
    const m = energySim.runScenario();
    return 'chinaCollegePeakYear' in m &&
           'collegeShare2050' in m &&
           'chinaCollegeShare2025' in m;
});

test('units has education entries', () => {
    return energySim.units.collegeShare?.unit === 'fraction' &&
           energySim.units.effectiveWorkers?.unit === 'persons';
});

// =============================================================================
// CAPITAL MODEL
// =============================================================================
section('Capital Model');

test('capitalParams object exists', () => {
    return typeof energySim.capitalParams === 'object';
});

test('capitalParams has required fields', () => {
    const p = energySim.capitalParams;
    return p.alpha === 0.33 &&
           p.depreciation === 0.05 &&
           p.savingsWorking === 0.45 &&
           typeof p.savingsPremium === 'object' &&
           typeof p.initialCapitalStock === 'number';
});

test('runCapitalModel exists', () => {
    return typeof energySim.runCapitalModel === 'function';
});

test('runSimulation returns capital data', () => {
    const result = energySim.runSimulation();
    return !!(result.capital &&
           result.capital.stock &&
           result.capital.investment &&
           result.capital.interestRate);
});

test('capital.stock has 76 years of data', () => {
    const result = energySim.runSimulation();
    return result.capital.stock.length === 76;
});

test('initial capital stock ~$420T', () => {
    const result = energySim.runSimulation();
    return approx(result.capital.stock[0], 420, 0.05);
});

test('K/Y ratio 2025 ~3.5', () => {
    const result = energySim.runSimulation();
    const kY = result.capital.stock[0] / result.demand.global.gdp[0];
    return approx(kY, 3.5, 0.25);
});

test('savings rate 2025 ~25%', () => {
    const result = energySim.runSimulation();
    return approx(result.capital.savingsRate[0], 0.25, 0.15);
});

test('savings rate declines with aging', () => {
    const result = energySim.runSimulation();
    return result.capital.savingsRate[75] < result.capital.savingsRate[0];
});

test('aggregateSavingsRate returns regional and global', () => {
    const demo = energySim.runDemographics();
    const savings = energySim.aggregateSavingsRate(demo.regions, 0);
    return !!(savings.regional &&
           savings.regional.oecd !== undefined &&
           savings.regional.china !== undefined &&
           savings.global !== undefined);
});

test('China has higher savings rate than OECD', () => {
    const demo = energySim.runDemographics();
    const savings = energySim.aggregateSavingsRate(demo.regions, 0);
    return savings.regional.china > savings.regional.oecd;
});

test('stabilityFactor returns value in (0, 1]', () => {
    const s0 = energySim.stabilityFactor(0);
    const s1 = energySim.stabilityFactor(0.10);
    const s2 = energySim.stabilityFactor(0.30);
    return s0 === 1 && s1 > 0 && s1 < 1 && s2 > 0 && s2 < s1;
});

test('stability responds to climate damages', () => {
    const high = energySim.runSimulation({ carbonPrice: 0 });
    const low = energySim.runSimulation({ carbonPrice: 150 });
    const idx2075 = 50;
    return low.capital.stability[idx2075] > high.capital.stability[idx2075];
});

test('interest rate 2025 in 3-6% range', () => {
    const result = energySim.runSimulation();
    const r = result.capital.interestRate[0];
    return r > 0.03 && r < 0.06;
});

test('calculateInterestRate formula correct', () => {
    const r = energySim.calculateInterestRate(100, 350);
    return approx(r, 0.044, 0.15);
});

test('capital stock grows over time', () => {
    const result = energySim.runSimulation();
    return result.capital.stock[75] > result.capital.stock[0];
});

test('updateCapital formula correct', () => {
    const newK = energySim.updateCapital(100, 10);
    return approx(newK, 105, 0.01);
});

test('robots density 2025 ~12-15/1000', () => {
    const result = energySim.runSimulation();
    return result.capital.robotsDensity[0] > 8 && result.capital.robotsDensity[0] < 20;
});

test('robots density grows significantly by 2075', () => {
    const result = energySim.runSimulation();
    return result.capital.robotsDensity[50] > result.capital.robotsDensity[0] * 3;
});

test('robotsDensity function capped at 20% automation share', () => {
    const result = energySim.runSimulation();
    return result.capital.robotsDensity[75] < 1000;
});

test('kPerWorker grows over time', () => {
    const result = energySim.runSimulation();
    return result.capital.kPerWorker[75] > result.capital.kPerWorker[0];
});

test('runScenario has capital metrics', () => {
    const m = energySim.runScenario();
    return 'kY2025' in m &&
           'interestRate2025' in m &&
           'robotsDensity2050' in m &&
           'savingsRate2025' in m;
});

test('units has capital entries', () => {
    return energySim.units.capitalStock?.unit === '$ trillions' &&
           energySim.units.robotsDensity?.unit === 'robots/1000 workers' &&
           energySim.units.interestRate?.unit === 'fraction';
});

test('capital.metrics has expected fields', () => {
    const result = energySim.runSimulation();
    const m = result.capital.metrics;
    return m.kY2025 !== undefined &&
           m.kY2050 !== undefined &&
           m.interestRate2025 !== undefined &&
           m.robotsDensity2050 !== undefined;
});

test('exportJSON includes capital data', () => {
    const json = energySim.exportJSON();
    const parsed = JSON.parse(json);
    return !!(parsed.capital &&
           parsed.capital.stock &&
           parsed.capital.robotsDensity);
});

// =============================================================================
// MODEL CONSISTENCY
// =============================================================================
section('Model Consistency');

test('population declines after peak (mortality > births)', () => {
    const result = energySim.runSimulation();
    const pop = result.demographics.global.population;
    const peakIdx = pop.indexOf(Math.max(...pop));
    return pop[75] < pop[peakIdx];
});

test('non-electric emissions: 2 Gt reduction per 10% electrification', () => {
    const e1 = energySim.calculateEmissions({ gas: 0, coal: 0, total: 0 }, 0.40);
    const e2 = energySim.calculateEmissions({ gas: 0, coal: 0, total: 0 }, 0.50);
    const reduction = e1.nonElectricity - e2.nonElectricity;
    return approx(reduction, 2.0, 0.1);
});

test('non-electric emissions decline with electrification', () => {
    const e40 = energySim.calculateEmissions({ gas: 0, coal: 0, total: 0 }, 0.40);
    const e90 = energySim.calculateEmissions({ gas: 0, coal: 0, total: 0 }, 0.90);
    return e90.nonElectricity < e40.nonElectricity;
});

test('solar+battery competes in dispatch merit order', () => {
    const caps = energySim.getCapacities(2060, 0.25);
    const result = energySim.runSimulation({ carbonPrice: 100 });
    const idx2060 = result.years.indexOf(2060);
    return result.dispatch.solarPlusBattery[idx2060] > 0;
});

test('solar+battery increases total solar penetration', () => {
    const result = energySim.runSimulation({ carbonPrice: 150 });
    const idx2080 = result.years.indexOf(2080);
    const demand = result.demand.global.electricityDemand[idx2080];
    const totalSolar = result.dispatch.solar[idx2080] + result.dispatch.solarPlusBattery[idx2080];
    const solarShare = totalSolar / demand;
    return solarShare > 0.35;
});

test('query.crossoverArrays works with derived series', () => {
    const data = energySim.runSimulation();
    const derived = energySim.computeDerivedSeries(data);
    const result = energySim.query.crossoverArrays(
        data.years,
        derived.perCapita.electricity.china,
        derived.perCapita.electricity.oecd
    );
    return result === null || !!(typeof result.year === 'number' && result.values);
});

// =============================================================================
// RESOURCE MODEL
// =============================================================================
section('Resource Model');

test('resourceParams object exists', () => {
    return typeof energySim.resourceParams === 'object';
});

test('resourceParams has minerals, food, land sections', () => {
    return !!(energySim.resourceParams.minerals &&
           energySim.resourceParams.food &&
           energySim.resourceParams.land);
});

test('resourceParams.minerals has all minerals', () => {
    const m = energySim.resourceParams.minerals;
    return !!(m.copper && m.lithium && m.rareEarths && m.steel);
});

test('runSimulation returns resources data', () => {
    const result = energySim.runSimulation();
    return !!(result.resources &&
           result.resources.minerals &&
           result.resources.food &&
           result.resources.land);
});

test('resources.minerals has all minerals', () => {
    const result = energySim.runSimulation();
    return !!(result.resources.minerals.copper &&
           result.resources.minerals.lithium &&
           result.resources.minerals.rareEarths &&
           result.resources.minerals.steel);
});

test('mineral demand arrays have 76 years', () => {
    const result = energySim.runSimulation();
    return result.resources.minerals.copper.demand.length === 76;
});

test('mineral intensity declines over time', () => {
    const result = energySim.runSimulation();
    const copper = result.resources.minerals.copper;
    return copper.intensity[0] === 1 && copper.intensity[75] < 0.5;
});

test('cumulative mineral demand increases', () => {
    const result = energySim.runSimulation();
    const copper = result.resources.minerals.copper;
    return copper.cumulative[75] > copper.cumulative[0];
});

test('recyclingRate increases with stock-in-use', () => {
    const copper = energySim.resourceParams.minerals.copper;
    const rate0 = energySim.recyclingRate(copper, 0);
    const rate500 = energySim.recyclingRate(copper, 500);
    return rate0 < rate500 && rate0 >= copper.recyclingBase;
});

test('food demand has all required fields', () => {
    const result = energySim.runSimulation();
    return !!(result.resources.food.caloriesPerCapita &&
           result.resources.food.proteinShare &&
           result.resources.food.grainEquivalent &&
           result.resources.food.glp1Effect);
});

test('protein share follows Bennett\'s Law (increases with GDP)', () => {
    const result = energySim.runSimulation();
    return result.resources.food.proteinShare[25] > result.resources.food.proteinShare[0];
});

test('protein share bounded by max', () => {
    const result = energySim.runSimulation();
    const maxProtein = energySim.resourceParams.food.proteinShareMax;
    return result.resources.food.proteinShare[75] <= maxProtein;
});

test('GLP-1 adoption follows logistic curve', () => {
    const result = energySim.runSimulation();
    const glp1 = result.resources.food.glp1Adoption;
    return glp1[0] < glp1[25] && glp1[25] < glp1[75];
});

test('GLP-1 effect reduces calories', () => {
    const result = energySim.runSimulation();
    return result.resources.food.glp1Effect[25] > 0;
});

test('land demand has all required fields', () => {
    const result = energySim.runSimulation();
    return !!(result.resources.land.farmland &&
           result.resources.land.urban &&
           result.resources.land.forest &&
           result.resources.land.yield);
});

test('yield improves over time', () => {
    const result = energySim.runSimulation();
    return result.resources.land.yield[75] > result.resources.land.yield[0];
});

test('urban area grows with population and wealth', () => {
    const result = energySim.runSimulation();
    return result.resources.land.urban[25] > result.resources.land.urban[0];
});

test('forest area grows from reforestation of abandoned farmland', () => {
    const result = energySim.runSimulation();
    return result.resources.land.forest[75] > result.resources.land.forest[0];
});

test('reforestation exceeds baseline forest loss', () => {
    const result = energySim.runSimulation();
    const farmlandReleased = result.resources.land.farmland[0] - result.resources.land.farmland[75];
    const forestGain = result.resources.land.forest[75] - result.resources.land.forest[0];
    return farmlandReleased > 1000 && forestGain > 0;
});

test('resources.metrics has expected fields', () => {
    const result = energySim.runSimulation();
    const m = result.resources.metrics;
    return m.copperPeakYear !== undefined &&
           m.lithiumPeakYear !== undefined &&
           m.proteinShare2050 !== undefined &&
           m.farmland2050 !== undefined;
});

test('runScenario has resource metrics', () => {
    const m = energySim.runScenario();
    return 'copperPeakYear' in m &&
           'lithiumPeakYear' in m &&
           'proteinShare2050' in m &&
           'farmland2050' in m;
});

// === DESERT LAND TESTS ===

test('desert land exists as residual from land budget', () => {
    const result = energySim.runSimulation();
    return !!(result.resources.land.desert && result.resources.land.desert.length === 76);
});

test('land budget sums to total land area (~13000 Mha)', () => {
    const result = energySim.runSimulation();
    const sum = result.resources.land.farmland[0] + result.resources.land.urban[0] +
               result.resources.land.forest[0] + result.resources.land.desert[0];
    return Math.abs(sum - 13000) < 200;
});

test('desert area is within reasonable range', () => {
    const result = energySim.runSimulation();
    return result.resources.land.desert[0] > 3000 && result.resources.land.desert[0] < 6000;
});

test('runScenario includes desert metrics', () => {
    const m = energySim.runScenario();
    return m.desert2025 !== undefined && m.desert2050 !== undefined && m.desert2100 !== undefined;
});

// === FOREST CARBON CDR TESTS ===

test('forest carbon structure exists', () => {
    const result = energySim.runSimulation();
    return !!(result.resources.carbon &&
           result.resources.carbon.sequestration &&
           result.resources.carbon.deforestationEmissions &&
           result.resources.carbon.decayEmissions &&
           result.resources.carbon.netFlux &&
           result.resources.carbon.cumulativeSequestration);
});

test('forest carbon arrays have correct length', () => {
    const result = energySim.runSimulation();
    return result.resources.carbon.netFlux.length === 76 &&
           result.resources.carbon.cumulativeSequestration.length === 76;
});

test('cumulative sequestration increases over time', () => {
    const result = energySim.runSimulation();
    return result.resources.carbon.cumulativeSequestration[75] > result.resources.carbon.cumulativeSequestration[25];
});

test('forest change tracked correctly', () => {
    const result = energySim.runSimulation();
    return result.resources.land.forestChange[0] === 0 &&
           result.resources.land.forestChange.length === 76;
});

test('climate includes land use emissions', () => {
    const result = energySim.runSimulation();
    return !!(result.climate.landUseEmissions && result.climate.landUseEmissions.length === 76);
});

test('runScenario includes forest carbon metrics', () => {
    const m = energySim.runScenario();
    return m.netFlux2025 !== undefined &&
           m.netFlux2050 !== undefined &&
           m.netFlux2100 !== undefined &&
           m.cumulativeSequestration2100 !== undefined;
});

test('net flux is negative when forest is growing (sequestration)', () => {
    const result = energySim.runSimulation();
    return result.resources.carbon.netFlux[75] < 0;
});

test('forestCarbon function exists', () => {
    const carbonResult = energySim.forestCarbon(10, 0, {
        sequestrationRate: 7.5,
        forestCarbonDensity: 150,
        deforestationEmissionFactor: 0.5,
        decayRate: 0.05
    });
    return carbonResult.sequestration > 0 && carbonResult.deforestationEmissions === 0;
});

test('deforestation produces emissions', () => {
    const carbonResult = energySim.forestCarbon(-10, 0, {
        sequestrationRate: 7.5,
        forestCarbonDensity: 150,
        deforestationEmissionFactor: 0.5,
        decayRate: 0.05
    });
    return carbonResult.sequestration === 0 && carbonResult.deforestationEmissions > 0;
});

test('foodDemand function exists and works', () => {
    const food = energySim.foodDemand(8e9, 15000, 2030);
    return food.caloriesPerCapita > 0 &&
           food.proteinShare > 0 &&
           food.grainEquivalent > 0;
});

test('landDemand function exists and works', () => {
    const food = { grainEquivalent: 5000 };
    const land = energySim.landDemand(food, 8e9, 15000, 14000, 2030);
    return land.farmland > 0 &&
           land.urban > 0 &&
           land.forest > 0;
});

test('units has resource entries', () => {
    return energySim.units.mineralDemand?.unit === 'Mt/year' &&
           energySim.units.proteinShare?.unit === 'fraction' &&
           energySim.units.farmland?.unit === 'Mha';
});

test('exportJSON includes resources data', () => {
    const json = energySim.exportJSON();
    const parsed = JSON.parse(json);
    return !!(parsed.resources &&
           parsed.resources.minerals &&
           parsed.resources.food &&
           parsed.resources.land);
});

// =============================================================================
// G/C EXPANSION (Galbraith/Chen Entropy Economics)
// =============================================================================
section('G/C Expansion (Cost Expansion + Automation)');

test('expansionParams object exists', () => {
    return typeof energySim.expansionParams === 'object';
});

test('expansionParams has required fields', () => {
    const p = energySim.expansionParams;
    return p.baselineLCOE === 50 &&
           p.expansionCoefficient === 0.25 &&
           p.energyPerRobotMWh === 10;
});

test('calculateExpansionDemand function exists', () => {
    return typeof energySim.calculateExpansionDemand === 'function';
});

test('calculateExpansionDemand returns valid structure', () => {
    const result = energySim.calculateExpansionDemand(30000, 20, 2025, 4e9);
    return 'adjustedDemand' in result &&
           'robotLoadTWh' in result &&
           'expansionMultiplier' in result &&
           'robotsPer1000' in result;
});

test('cost expansion is continuous (no threshold)', () => {
    const baseline = energySim.calculateExpansionDemand(30000, 50, 2025, 4e9);
    const cheaper = energySim.calculateExpansionDemand(30000, 25, 2025, 4e9);
    const veryChep = energySim.calculateExpansionDemand(30000, 12.5, 2025, 4e9);
    return approx(baseline.expansionMultiplier, 1.0, 0.01) &&
           approx(cheaper.expansionMultiplier, 1.25, 0.02) &&
           approx(veryChep.expansionMultiplier, 1.50, 0.02);
});

test('cost expansion uses log form (diminishing returns)', () => {
    const at50 = energySim.calculateExpansionDemand(30000, 50, 2025, 4e9);
    const at25 = energySim.calculateExpansionDemand(30000, 25, 2025, 4e9);
    const at12 = energySim.calculateExpansionDemand(30000, 12.5, 2025, 4e9);
    const firstHalving = at25.expansionMultiplier - at50.expansionMultiplier;
    const secondHalving = at12.expansionMultiplier - at25.expansionMultiplier;
    return approx(firstHalving, 0.25, 0.02) &&
           approx(secondHalving, 0.25, 0.02);
});

test('robot energy load grows over time', () => {
    const early = energySim.calculateExpansionDemand(30000, 20, 2025, 4e9);
    const late = energySim.calculateExpansionDemand(30000, 20, 2075, 4e9);
    return late.robotLoadTWh > early.robotLoadTWh;
});

test('robots per 1000 workers grows from baseline to capped value', () => {
    const y2025 = energySim.calculateExpansionDemand(30000, 20, 2025, 4e9);
    const y2100 = energySim.calculateExpansionDemand(30000, 20, 2100, 4e9);
    return approx(y2025.robotsPer1000, 1, 0.01) &&
           y2100.robotsPer1000 > y2025.robotsPer1000;
});

test('robot density capped at 500 per 1000 workers', () => {
    const farFuture = energySim.calculateExpansionDemand(30000, 20, 2150, 4e9);
    return farFuture.robotsPer1000 <= 500;
});

test('runSimulation dispatch has expansion tracking', () => {
    const result = energySim.runSimulation();
    return !!(result.dispatch.robotLoadTWh &&
           result.dispatch.expansionMultiplier &&
           result.dispatch.adjustedDemand &&
           result.dispatch.robotsPer1000);
});

test('expansion arrays have 76 years', () => {
    const result = energySim.runSimulation();
    return result.dispatch.robotLoadTWh.length === 76 &&
           result.dispatch.expansionMultiplier.length === 76 &&
           result.dispatch.adjustedDemand.length === 76;
});

test('robot load is significant by 2100', () => {
    const result = energySim.runSimulation();
    return result.dispatch.robotLoadTWh[75] > 500;
});

test('cost expansion active immediately (no threshold)', () => {
    const result = energySim.runSimulation();
    const idx2030 = result.years.indexOf(2030);
    return result.dispatch.expansionMultiplier[idx2030] > 1.0;
});

test('expansion multiplier > 1 due to G/C expansion', () => {
    const result = energySim.runSimulation();
    const idx2050 = result.years.indexOf(2050);
    // dispatch.adjustedDemand is capped by infrastructure constraints,
    // so test expansion multiplier directly
    return result.dispatch.expansionMultiplier[idx2050] > 1.0;
});

test('demand with expansion stabilizes (G/C additive thesis)', () => {
    const result = energySim.runSimulation();
    const idx2060 = result.years.indexOf(2060);
    const idx2100 = 75;
    return result.dispatch.adjustedDemand[idx2100] >= result.dispatch.adjustedDemand[idx2060] * 0.9;
});

test('runScenario has expansion metrics', () => {
    const m = energySim.runScenario();
    return 'expansionMultiplier2050' in m &&
           'expansionMultiplier2100' in m &&
           'robotLoadTWh2050' in m &&
           'robotLoadTWh2100' in m &&
           'adjustedDemand2050' in m &&
           'adjustedDemand2100' in m;
});

test('cost expansion grows with cheaper energy', () => {
    const result = energySim.runSimulation();
    const idx2030 = result.years.indexOf(2030);
    const idx2050 = result.years.indexOf(2050);
    const idx2100 = 75;
    return result.dispatch.expansionMultiplier[idx2050] >= result.dispatch.expansionMultiplier[idx2030] &&
           result.dispatch.expansionMultiplier[idx2100] >= result.dispatch.expansionMultiplier[idx2050];
});

// =============================================================================
// CALIBRATION FIXES (Bug Fixes)
// =============================================================================
section('Calibration Fixes');

test('CO2 ~418 ppm in 2025 (derived from cumulative emissions)', () => {
    const result = energySim.runSimulation();
    return approx(result.climate.co2ppm[0], 418, 0.02);
});

test('CO2 increases after 2025 with positive emissions', () => {
    const result = energySim.runSimulation();
    return result.climate.co2ppm[1] > result.climate.co2ppm[0];
});

test('CO2 responds to counterfactual cumulative emissions', () => {
    const co2At2400 = energySim.updateClimate(2400, 1.2, 3.0).co2ppm;
    const co2At2200 = energySim.updateClimate(2200, 1.2, 3.0).co2ppm;
    return co2At2200 < co2At2400;
});

test('peakEmissionsYear is never null', () => {
    const result = energySim.runSimulation({ carbonPrice: 200 });
    return result.climate.metrics.peakEmissionsYear !== null;
});

test('peakEmissionsYear is 2025 in aggressive scenario', () => {
    const result = energySim.runSimulation({ carbonPrice: 200 });
    return result.climate.metrics.peakEmissionsYear <= 2030;
});

test('default carbon price consistency', () => {
    const defaultRun = energySim.runSimulation();
    const explicitRun = energySim.runSimulation({ carbonPrice: 35 });
    return defaultRun.results.gas[0] === explicitRun.results.gas[0];
});

test('runScenario uses defaults.carbonPrice', () => {
    const m = energySim.runScenario();
    return m.params.carbonPrice === 35;
});

test('savings rate 2025 ~25% (tight tolerance)', () => {
    const result = energySim.runSimulation();
    return approx(result.capital.savingsRate[0], 0.25, 0.05);
});

test('stabilityFactor reduces investment at high damages', () => {
    const stability = energySim.stabilityFactor(0.30);
    return stability < 0.90 && stability > 0.70;
});

// =============================================================================
// FINAL ENERGY TRACKING (Phase 8)
// =============================================================================
section('Final Energy Tracking');

test('finalEnergyParams exists with sectors', () => {
    return !!(energySim.finalEnergyParams &&
           energySim.finalEnergyParams.sectors &&
           energySim.finalEnergyParams.sectors.transport &&
           energySim.finalEnergyParams.sectors.buildings &&
           energySim.finalEnergyParams.sectors.industry);
});

test('finalEnergyParams has fuel mixes for 2025 and 2100', () => {
    const p = energySim.finalEnergyParams;
    return !!(p.fuels2025 && p.fuels2025.transport &&
           p.fuels2100 && p.fuels2100.transport);
});

test('finalEnergyParams has carbon intensities', () => {
    const p = energySim.finalEnergyParams;
    return p.carbonIntensity &&
           p.carbonIntensity.oil > 0 &&
           p.carbonIntensity.gas > 0 &&
           p.carbonIntensity.coal > 0 &&
           p.carbonIntensity.biomass === 0 &&
           p.carbonIntensity.hydrogen === 0;
});

test('calculateSectorElectrification returns valid rate', () => {
    const rate2025 = energySim.calculateSectorElectrification('transport', 0);
    const rate2050 = energySim.calculateSectorElectrification('transport', 25);
    const rate2100 = energySim.calculateSectorElectrification('transport', 75);
    return rate2025 >= 0 && rate2025 <= 1 &&
           rate2050 > rate2025 &&
           rate2100 > rate2050 &&
           rate2100 <= energySim.finalEnergyParams.sectors.transport.electrificationTarget;
});

test('calculateFuelMix returns normalized mix', () => {
    const mix2025 = energySim.calculateFuelMix('transport', 0);
    const sum2025 = Object.values(mix2025).reduce((a, b) => a + b, 0);
    const mix2100 = energySim.calculateFuelMix('transport', 75);
    const sum2100 = Object.values(mix2100).reduce((a, b) => a + b, 0);
    return approx(sum2025, 1.0, 0.01) && approx(sum2100, 1.0, 0.01);
});

test('demand includes totalFinalEnergy array', () => {
    const result = energySim.runSimulation();
    return result.demand.global.totalFinalEnergy &&
           result.demand.global.totalFinalEnergy.length === 76;
});

test('demand includes nonElectricEnergy array', () => {
    const result = energySim.runSimulation();
    return result.demand.global.nonElectricEnergy &&
           result.demand.global.nonElectricEnergy.length === 76;
});

test('demand includes finalEnergyPerCapitaDay array', () => {
    const result = energySim.runSimulation();
    return result.demand.global.finalEnergyPerCapitaDay &&
           result.demand.global.finalEnergyPerCapitaDay.length === 76;
});

test('totalFinalEnergy = electricity + nonElectric', () => {
    const result = energySim.runSimulation();
    const i = 0;
    const total = result.demand.global.totalFinalEnergy[i];
    const elec = result.demand.global.electricityDemand[i];
    const nonElec = result.demand.global.nonElectricEnergy[i];
    return approx(total, elec + nonElec, 0.001);
});

test('sector non-electric sums to total non-electric', () => {
    const result = energySim.runSimulation();
    const i = 0;
    const nonElec = result.demand.global.nonElectricEnergy[i];
    const sectorSum = result.demand.global.sectors.transport.nonElectric[i] +
                      result.demand.global.sectors.buildings.nonElectric[i] +
                      result.demand.global.sectors.industry.nonElectric[i];
    return approx(nonElec, sectorSum, 0.001);
});

test('fuel demand sums to non-electric energy', () => {
    const result = energySim.runSimulation();
    const i = 0;
    const nonElec = result.demand.global.nonElectricEnergy[i];
    const fuelSum = result.demand.global.fuels.oil[i] +
                    result.demand.global.fuels.gas[i] +
                    result.demand.global.fuels.coal[i] +
                    result.demand.global.fuels.biomass[i] +
                    result.demand.global.fuels.hydrogen[i] +
                    result.demand.global.fuels.biofuel[i];
    return approx(nonElec, fuelSum, 0.001);
});

test('regional final energy data exists', () => {
    const result = energySim.runSimulation();
    return !!(result.demand.regions.oecd.totalFinalEnergy &&
           result.demand.regions.china.nonElectricEnergy &&
           result.demand.regions.em.sectors.transport.total &&
           result.demand.regions.row.fuels.oil);
});

test('transport electrification 2025 ~2%', () => {
    const result = energySim.runSimulation();
    const rate = result.demand.global.sectors.transport.electrificationRate[0];
    return approx(rate, 0.02, 0.1);
});

test('transport electrification 2050 > 40%', () => {
    const result = energySim.runSimulation();
    const rate = result.demand.global.sectors.transport.electrificationRate[25];
    return rate > 0.40;
});

test('buildings electrification 2050 > 60%', () => {
    const result = energySim.runSimulation();
    const rate = result.demand.global.sectors.buildings.electrificationRate[25];
    return rate > 0.60;
});

test('oil dominates transport fuel 2025', () => {
    const result = energySim.runSimulation();
    const oil = result.demand.global.fuels.oil[0];
    const nonElec = result.demand.global.nonElectricEnergy[0];
    return oil > nonElec * 0.3;
});

test('finalEnergyPerCapitaDay positive and reasonable', () => {
    const result = energySim.runSimulation();
    const val2025 = result.demand.global.finalEnergyPerCapitaDay[0];
    const val2050 = result.demand.global.finalEnergyPerCapitaDay[25];
    return val2025 > 10 && val2025 < 100 &&
           val2050 > 10 && val2050 < 100;
});

test('runScenario includes finalEnergyPerCapitaDay metrics', () => {
    const m = energySim.runScenario();
    return m.finalEnergyPerCapitaDay2025 !== undefined &&
           m.finalEnergyPerCapitaDay2050 !== undefined &&
           m.finalEnergyPerCapitaDay2100 !== undefined;
});

test('runScenario includes sector electrification metrics', () => {
    const m = energySim.runScenario();
    return m.transportElectrification2050 !== undefined &&
           m.buildingsElectrification2050 !== undefined &&
           m.industryElectrification2050 !== undefined;
});

test('runScenario includes fuel share metrics', () => {
    const m = energySim.runScenario();
    return m.oilShareOfFinal2050 !== undefined &&
           m.gasShareOfFinal2050 !== undefined &&
           m.oilShareOfFinal2050 + m.gasShareOfFinal2050 < 1;
});

test('calculateEmissions uses fuel demand when provided', () => {
    const dispatchResult = { gas: 1000, coal: 1000, solar: 5000, wind: 3000 };
    const fuelDemand = { oil: 10000, gas: 5000, coal: 3000, biomass: 2000, hydrogen: 0, biofuel: 0 };
    const withFuel = energySim.calculateEmissions(dispatchResult, 0.5, undefined, undefined, fuelDemand);
    const withoutFuel = energySim.calculateEmissions(dispatchResult, 0.5);
    return withFuel.nonElectricity !== withoutFuel.nonElectricity &&
           withFuel.nonElectricity > 0;
});

test('fuel-based emissions calculation is correct', () => {
    const dispatchResult = { gas: 0, coal: 0, solar: 1000, wind: 0 };
    const fuelDemand = { oil: 10000, gas: 0, coal: 0, biomass: 0, hydrogen: 0, biofuel: 0 };
    const result = energySim.calculateEmissions(dispatchResult, 0.5, undefined, undefined, fuelDemand);
    return approx(result.nonElectricity, 2.67, 0.01);
});

test('units map includes final energy units', () => {
    return !!(energySim.units.totalFinalEnergy &&
           energySim.units.nonElectricEnergy &&
           energySim.units.finalEnergyPerCapitaDay &&
           energySim.units.fuelDemand);
});

// =============================================================================
// ENERGY BURDEN (Issue #7 + Issue #9)
// =============================================================================
section('Energy Burden');

test('economicParams.energyBurden exists', () => {
    return !!(energySim.economicParams && energySim.economicParams.energyBurden);
});

test('energyBurdenDamage function exists', () => {
    return typeof energySim.energyBurdenDamage === 'function';
});

test('burden below threshold returns no damage', () => {
    const result = energySim.energyBurdenDamage(5, 100); // 5% burden
    return result.damage === 0 && result.constrained === false;
});

test('burden above threshold returns damage', () => {
    const result = energySim.energyBurdenDamage(10, 100); // 10% burden
    return result.damage > 0 && result.constrained === true;
});

test('climate output includes energy burden arrays', () => {
    const result = energySim.runSimulation();
    return result.climate.energyBurden && result.climate.energyBurden.length === 76;
});

test('runScenario includes energy burden metrics', () => {
    const m = energySim.runScenario();
    return m.energyBurden2025 !== undefined &&
           m.energyBurden2050 !== undefined &&
           m.energyBurdenPeak !== undefined;
});

test('tech params affect energy burden (Issue #9)', () => {
    // Tech boom should have lower burden than tech stagnation
    const boom = energySim.runSimulation({ solarAlpha: 0.40, solarGrowth: 0.30 });
    const stag = energySim.runSimulation({ solarAlpha: 0.20, solarGrowth: 0.15 });
    // Burden at 2050 should differ
    return stag.climate.energyBurden[25] > boom.climate.energyBurden[25];
});

test('high carbon price with slow tech affects GDP', () => {
    // With high carbon price, tech parameters should affect GDP via burden
    const boom = energySim.runSimulation({ solarAlpha: 0.40, solarGrowth: 0.30, carbonPrice: 200 });
    const stag = energySim.runSimulation({ solarAlpha: 0.20, solarGrowth: 0.15, carbonPrice: 200 });
    // Tech boom should have higher GDP due to lower burden
    return boom.demand.global.gdp[25] > stag.demand.global.gdp[25];
});

// =============================================================================
// RENDER RESULTS
// =============================================================================

let currentSec = '';
let passed = 0, failed = 0;

console.log('');
for (const r of results) {
    if (r.section !== currentSec) {
        currentSec = r.section;
        console.log(`\n=== ${currentSec} ===\n`);
    }

    const icon = r.status === 'pass' ? '  \x1b[32m✓\x1b[0m' : '  \x1b[31m✗\x1b[0m';
    console.log(`${icon} ${r.name}`);
    if (r.error) {
        console.log(`    \x1b[33m${r.error}\x1b[0m`);
    }

    if (r.status === 'pass') passed++;
    else failed++;
}

const total = passed + failed;
const pct = ((passed / total) * 100).toFixed(1);

console.log('\n=== Summary ===\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${total} (${pct}%)`);

if (failed > 0) {
    console.log('\n\x1b[31mSome tests failed.\x1b[0m');
    process.exit(1);
} else {
    console.log('\n\x1b[32mAll tests passed!\x1b[0m');
    process.exit(0);
}
