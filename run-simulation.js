#!/usr/bin/env node
/**
 * Headless simulation runner for Overlapping Generations Energy Simulation
 *
 * Usage:
 *   node run-simulation.js                    # Run with defaults
 *   node run-simulation.js --carbonPrice=100  # Set carbon price
 *   node run-simulation.js --format=json      # Output JSON
 *   node run-simulation.js --format=forecast  # Twin-Engine Century Forecast
 *   node run-simulation.js --scenario=path    # Load scenario from JSON file
 *   node run-simulation.js --help             # Show help
 */

'use strict';

const energySim = require('./energy-sim.js');
energySim.config.quiet = true;

// Parse command line arguments
function parseArgs() {
    const args = {
        // Scenario file (optional)
        scenario: null,

        // Tier 1 params (can override scenario)
        carbonPrice: null,
        solarAlpha: null,
        solarGrowth: null,
        electrificationTarget: null,
        efficiencyMultiplier: null,
        climSensitivity: null,
        windAlpha: null,
        windGrowth: null,
        batteryAlpha: null,
        nuclearGrowth: null,
        nuclearCost0: null,
        hydroGrowth: null,
        damageCoeff: null,
        tippingThreshold: null,
        nonElecEmissions2025: null,
        savingsWorking: null,
        automationGrowth: null,
        stabilityLambda: null,
        robotGrowthRate: null,
        fertilityFloorMultiplier: null,
        lifeExpectancyGrowth: null,
        migrationMultiplier: null,
        mineralLearningMultiplier: null,
        glp1MaxPenetration: null,
        yieldGrowthRate: null,

        // Output format
        format: 'summary'  // summary, json, forecast, csv
    };

    for (const arg of process.argv.slice(2)) {
        if (arg === '--help' || arg === '-h') {
            showHelp();
            process.exit(0);
        }
        const match = arg.match(/^--(\w+)=(.+)$/);
        if (match) {
            const [, key, value] = match;
            if (key in args) {
                // Keep scenario as string path
                if (key === 'scenario' || key === 'format') {
                    args[key] = value;
                } else {
                    args[key] = isNaN(Number(value)) ? value : Number(value);
                }
            }
        }
    }

    return args;
}

function showHelp() {
    console.log(`
Overlapping Generations Energy Simulation - Headless Runner

Usage: node run-simulation.js [options]

Scenario Options:
  --scenario=PATH          Load scenario from JSON file

Primary Parameters:
  --carbonPrice=N          Carbon price in $/ton (default: 35)
  --solarAlpha=N           Solar learning rate exponent (default: 0.36)
  --solarGrowth=N          Solar capacity growth rate (default: 0.25)
  --electrificationTarget=N Target electrification by 2050 (default: 0.65)
  --efficiencyMultiplier=N Energy efficiency multiplier (default: 1.0)
  --climSensitivity=N      Climate sensitivity °C/doubling (default: 3.0)

Energy Tech Parameters:
  --windAlpha=N            Wind learning rate exponent
  --windGrowth=N           Wind capacity growth rate
  --batteryAlpha=N         Battery learning rate exponent
  --nuclearGrowth=N        Nuclear capacity growth rate
  --nuclearCost0=N         Nuclear LCOE in 2025 ($/MWh)
  --hydroGrowth=N          Hydro capacity growth rate

Climate Parameters:
  --damageCoeff=N          DICE damage coefficient
  --tippingThreshold=N     Tipping point temperature (°C)
  --nonElecEmissions2025=N Non-electricity emissions (Gt CO₂)

Capital Parameters:
  --savingsWorking=N       Working-age savings rate
  --automationGrowth=N     Automation share growth rate
  --stabilityLambda=N      Climate-investment sensitivity
  --robotGrowthRate=N      Robot density growth rate

Demographics Parameters:
  --fertilityFloorMultiplier=N  Multiplier on fertility floors
  --lifeExpectancyGrowth=N      Annual life expectancy gain
  --migrationMultiplier=N       Multiplier on migration rates

Resource Parameters:
  --mineralLearningMultiplier=N Multiplier on mineral intensity decline
  --glp1MaxPenetration=N        Max GLP-1 adoption fraction
  --yieldGrowthRate=N           Crop yield improvement rate

Output Options:
  --format=FORMAT          Output format: summary, json, forecast, csv

Examples:
  node run-simulation.js
  node run-simulation.js --carbonPrice=100 --format=json
  node run-simulation.js --scenario=scenarios/net-zero.json
  node run-simulation.js --scenario=scenarios/baseline.json --carbonPrice=150
  node run-simulation.js --format=forecast > forecast.md
`);
}

// Format helpers
function eraAverage(data, startYear, endYear, years) {
    const startIdx = years.indexOf(startYear);
    const endIdx = years.indexOf(endYear);
    if (startIdx === -1 || endIdx === -1) return null;
    const slice = data.slice(startIdx, endIdx + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function getEraValue(data, year, years) {
    const idx = years.indexOf(year);
    return idx !== -1 ? data[idx] : null;
}

// Output formatters
function formatSummary(metrics, scenarioName = 'Custom') {
    console.log(`\n=== Energy Simulation Results (${scenarioName}) ===\n`);
    console.log('Climate:');
    console.log(`  Warming by 2100:     ${metrics.warming2100.toFixed(2)}°C`);
    console.log(`  Peak emissions year: ${metrics.peakEmissionsYear}`);
    console.log(`  Grid zero-carbon:    ${metrics.gridBelow100 || 'Not reached'}`);

    console.log('\nEnergy Transitions:');
    console.log(`  Solar beats gas:     ${metrics.solarCrossesGas || 'Already'}`);
    console.log(`  Solar+battery beats gas: ${metrics.solarBatteryCrossesGas || 'Already'}`);
    console.log(`  Coal uneconomic:     ${metrics.coalUneconomic || 'Already'}`);

    console.log('\nDemographics:');
    console.log(`  Population peak:     ${metrics.popPeakYear}`);
    console.log(`  Population 2100:     ${(metrics.pop2100 / 1e9).toFixed(2)}B`);
    console.log(`  College share 2050:  ${(metrics.collegeShare2050 * 100).toFixed(1)}%`);
    console.log(`  Dependency 2075:     ${(metrics.dependency2075 * 100).toFixed(0)}%`);

    console.log('\nEconomy:');
    console.log(`  K/Y ratio 2025:      ${metrics.kY2025.toFixed(2)}`);
    console.log(`  Interest rate 2025:  ${(metrics.interestRate2025 * 100).toFixed(1)}%`);
    console.log(`  Robots/1000 (2050):  ${metrics.robotsDensity2050.toFixed(1)}`);

    console.log('\nResources:');
    console.log(`  Copper peak year:    ${metrics.copperPeakYear}`);
    console.log(`  Lithium reserves 2100: ${(metrics.lithiumReserveRatio2100 * 100).toFixed(0)}% consumed`);
    console.log(`  Farmland 2050:       ${metrics.farmland2050.toFixed(0)} Mha`);
    console.log('');
}

function formatJSON(data) {
    console.log(JSON.stringify(data, null, 2));
}

function formatForecast(data, params, scenarioName = 'Custom') {
    const { years, demographics, demand, climate, capital, dispatch } = data;

    // Era definitions
    const eras = [
        { name: '2025-29', start: 2025, end: 2029 },
        { name: '2030-39', start: 2030, end: 2039 },
        { name: '2040-49', start: 2040, end: 2049 },
        { name: '2050-59', start: 2050, end: 2059 },
        { name: '2060-69', start: 2060, end: 2069 },
        { name: '2070-79', start: 2070, end: 2079 },
        { name: '2080-2100', start: 2080, end: 2100 }
    ];

    // Calculate per-capita energy (kWh/person/day)
    const globalPop = demographics.global.population;
    const globalDemand = dispatch.adjustedDemand;
    const perCapitaKWhDay = years.map((_, i) =>
        (globalDemand[i] * 1e9 / globalPop[i]) / 365
    );

    // Dependency ratio
    const dependency = demographics.global.dependency;

    // Robots per 1000 workers
    const robotsPer1000 = capital.robotsDensity;

    // Temperature
    const temperature = climate.temperature;

    console.log(`
# Twin-Engine Century Forecast

**Scenario:** ${scenarioName}
**Parameters:** Carbon price $${params.carbonPrice ?? energySim.defaults.carbonPrice}/ton, Climate sensitivity ${params.climSensitivity ?? energySim.defaults.climSensitivity}°C

---

## Global Headline Metrics

| Era | Final Energy (kWh/person·day) | GMST (°C) | Old-Age Dependency | Robots/1000 Workers |
|-----|-------------------------------|-----------|-------------------|---------------------|`);

    for (const era of eras) {
        const energy = eraAverage(perCapitaKWhDay, era.start, Math.min(era.end, 2100), years);
        const temp = getEraValue(temperature, era.end, years);
        const dep = eraAverage(dependency, era.start, Math.min(era.end, 2100), years);
        const robots = getEraValue(robotsPer1000, Math.min(era.end, 2100), years);

        console.log(`| ${era.name} | ${energy ? energy.toFixed(1) : 'N/A'} | ${temp ? temp.toFixed(2) : 'N/A'} | ${dep ? (dep * 100).toFixed(0) + '%' : 'N/A'} | ${robots ? robots.toFixed(0) : 'N/A'} |`);
    }

    // Key crossover events
    const metrics = energySim.runScenario(params);

    console.log(`
---

## Key Transition Points

- **Solar beats gas LCOE:** ${metrics.solarCrossesGas || 'Already happened'}
- **Grid below 100 kg CO₂/MWh:** ${metrics.gridBelow100 || 'Not reached'}
- **Peak global emissions:** ${metrics.peakEmissionsYear}
- **Peak copper demand:** ${metrics.copperPeakYear}
- **Population peak:** ${metrics.popPeakYear}
- **China college workers peak:** ${metrics.chinaCollegePeakYear}

---

## End-of-Century Summary

- **Population:** ${(getEraValue(globalPop, 2100, years) / 1e9).toFixed(2)}B
- **Warming:** ${getEraValue(temperature, 2100, years).toFixed(2)}°C above preindustrial
- **Electricity demand:** ${getEraValue(globalDemand, 2100, years).toFixed(0)} TWh
- **Per-capita energy:** ${getEraValue(perCapitaKWhDay, 2100, years).toFixed(1)} kWh/person/day
- **Robots per 1000 workers:** ${getEraValue(robotsPer1000, 2100, years).toFixed(0)}
- **Dependency ratio:** ${(getEraValue(dependency, 2100, years) * 100).toFixed(0)}%

---

*Generated by energy-sim.js headless runner*
`);
}

function formatCSV(data) {
    const { years, demographics, demand, climate, capital, dispatch } = data;

    // Header
    const headers = [
        'year',
        'population',
        'electricity_twh',
        'temperature_c',
        'emissions_gt',
        'dependency_ratio',
        'robots_per_1000',
        'solar_lcoe',
        'gas_lcoe'
    ];

    console.log(headers.join(','));

    for (let i = 0; i < years.length; i++) {
        const row = [
            years[i],
            demographics.global.population[i],
            dispatch.adjustedDemand[i].toFixed(1),
            climate.temperature[i].toFixed(3),
            climate.emissions[i].toFixed(2),
            demographics.global.dependency[i].toFixed(4),
            capital.robotsDensity[i].toFixed(2),
            data.results.solar[i].toFixed(2),
            data.results.gas[i].toFixed(2)
        ];
        console.log(row.join(','));
    }
}

// Build params object from args, excluding null values
function buildParams(args) {
    const params = {};
    const paramKeys = [
        'carbonPrice', 'solarAlpha', 'solarGrowth', 'electrificationTarget',
        'efficiencyMultiplier', 'climSensitivity', 'windAlpha', 'windGrowth',
        'batteryAlpha', 'nuclearGrowth', 'nuclearCost0', 'hydroGrowth',
        'damageCoeff', 'tippingThreshold', 'nonElecEmissions2025',
        'savingsWorking', 'automationGrowth', 'stabilityLambda', 'robotGrowthRate',
        'fertilityFloorMultiplier', 'lifeExpectancyGrowth', 'migrationMultiplier',
        'mineralLearningMultiplier', 'glp1MaxPenetration', 'yieldGrowthRate'
    ];

    for (const key of paramKeys) {
        if (args[key] != null) {
            params[key] = args[key];
        }
    }

    return params;
}

// Main
async function main() {
    const args = parseArgs();

    let params;
    let scenarioName = 'Custom';

    if (args.scenario) {
        // Load scenario file and merge with CLI overrides
        try {
            const scenario = await energySim.loadScenario(args.scenario);
            const applied = energySim.applyScenario(scenario);
            scenarioName = applied.name;

            // CLI args override scenario params
            const cliOverrides = buildParams(args);
            params = { ...applied.params, ...cliOverrides };
        } catch (err) {
            console.error(`Error loading scenario: ${err.message}`);
            process.exit(1);
        }
    } else {
        // No scenario - use defaults + CLI args
        params = { ...energySim.defaults };
        const cliOverrides = buildParams(args);
        for (const key in cliOverrides) {
            params[key] = cliOverrides[key];
        }
    }

    const data = energySim.runSimulation(params);

    switch (args.format) {
        case 'json':
            formatJSON(data);
            break;
        case 'forecast':
            formatForecast(data, params, scenarioName);
            break;
        case 'csv':
            formatCSV(data);
            break;
        case 'summary':
        default:
            formatSummary(energySim.runScenario(params), scenarioName);
            break;
    }
}

main();
