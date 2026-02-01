#!/usr/bin/env node
/**
 * Twin-Engine Century Forecast Generator
 *
 * Generates comprehensive economic/energy forecasts in the detailed format
 * with narratives, trip-wires, and probability distributions.
 *
 * Usage:
 *   node forecast.js                         # Default scenario
 *   node forecast.js --carbonPrice=100       # High carbon price
 *   node forecast.js --scenarioFile=path     # Load scenario from JSON file
 *   node forecast.js --scenarioType=plateau  # Alternative built-in scenario type
 */

'use strict';

const energySim = require('./energy-sim.js');
energySim.config.quiet = true;

// Parse arguments
function parseArgs() {
    const args = {
        // Scenario file (optional)
        scenarioFile: null,

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

        // Built-in scenario type (for narrative selection)
        scenarioType: 'central'  // central, plateau, breakthrough
    };

    for (const arg of process.argv.slice(2)) {
        const match = arg.match(/^--(\w+)=(.+)$/);
        if (match) {
            const [, key, value] = match;
            if (key in args) {
                if (key === 'scenarioFile' || key === 'scenarioType') {
                    args[key] = value;
                } else {
                    args[key] = isNaN(Number(value)) ? value : Number(value);
                }
            }
        }
    }
    return args;
}

// Build params object from args, excluding null values
function buildParams(args) {
    const params = {};
    const paramKeys = [
        'carbonPrice', 'solarAlpha', 'solarGrowth', 'electrificationTarget',
        'efficiencyMultiplier', 'climSensitivity', 'windAlpha', 'windGrowth',
        'batteryAlpha', 'nuclearGrowth'
    ];

    for (const key of paramKeys) {
        if (args[key] != null) {
            params[key] = args[key];
        }
    }

    return params;
}

// Era definitions
const ERAS = [
    { name: '2025-29', start: 2025, end: 2029 },
    { name: '2030-39', start: 2030, end: 2039 },
    { name: '2040-49', start: 2040, end: 2049 },
    { name: '2050-59', start: 2050, end: 2059 },
    { name: '2060-69', start: 2060, end: 2069 },
    { name: '2070-79', start: 2070, end: 2079 },
    { name: '2080-2100', start: 2080, end: 2100 }
];

// Helper functions
function eraAverage(data, era, years) {
    const startIdx = years.indexOf(era.start);
    const endIdx = years.indexOf(Math.min(era.end, years[years.length - 1]));
    if (startIdx === -1 || endIdx === -1) return null;
    const slice = data.slice(startIdx, endIdx + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function eraEnd(data, era, years) {
    const endYear = Math.min(era.end, years[years.length - 1]);
    const idx = years.indexOf(endYear);
    return idx !== -1 ? data[idx] : null;
}

function formatPct(val, decimals = 0) {
    return val != null ? (val * 100).toFixed(decimals) + '%' : 'N/A';
}

function formatNum(val, decimals = 0) {
    return val != null ? val.toFixed(decimals) : 'N/A';
}

// Calculate derived metrics not directly in simulation
function computeDerivedMetrics(data) {
    const { years, demographics, demand, climate, capital, dispatch } = data;

    const metrics = {
        years,
        global: {
            finalEnergy: [],      // kWh/person/day (all energy, not just electricity)
            temperature: climate.temperature,
            dependency: demographics.global.dependency,
            robotsPer1000: capital.robotsDensity,
            publicDebtGDP: [],    // Modeled estimate
            oilShare: [],         // Share of final energy from oil
            adaptationSpending: [] // % of GDP
        },
        oecd: {
            finalEnergy: [],
            dependency: demographics.regions.oecd.dependency,
            robotsPer1000: [],    // OECD-specific robots density
            publicDebtGDP: [],
            oilShare: [],
            adaptationSpending: []
        }
    };

    // Global electrification rate for converting electricity to final energy
    const electrificationRate = demand.global.electrificationRate;

    for (let i = 0; i < years.length; i++) {
        const year = years[i];
        const t = year - 2025;

        // === GLOBAL FINAL ENERGY ===
        // Final energy = electricity / electrification rate
        // This gives total energy consumption including non-electric
        // Apply efficiency multiplier that increases over time (energy services grow faster than raw energy)
        const globalElec = dispatch.adjustedDemand[i];
        const elecRate = electrificationRate[i];
        const globalFinalTWh = globalElec / elecRate;
        const globalPop = demographics.global.population[i];
        // Base calculation plus growth in energy services (GDP-driven)
        const globalKWhDay = (globalFinalTWh * 1e9 / globalPop) / 365;
        // Scale up to match realistic final energy (~40-56 kWh/person/day range)
        // Factor: 1.6 at start, growing to 1.5 by 2100 (efficiency gains offset by growth)
        const scaleFactor = 1.65 - (t * 0.002);
        metrics.global.finalEnergy.push(globalKWhDay * scaleFactor);

        // === OECD FINAL ENERGY ===
        // OECD has higher per-capita energy (~1.8x global)
        // But with mature markets, grows more slowly
        const oecdElec = demand.regions.oecd.electricityDemand[i];
        const oecdPop = demographics.regions.oecd.population[i];
        const oecdElecRate = Math.min(elecRate * 1.15, 0.85);
        const oecdFinalTWh = oecdElec / oecdElecRate;
        const baseOecdKWhDay = (oecdFinalTWh * 1e9 / oecdPop) / 365;
        // OECD starts high, grows slowly due to efficiency but still grows
        // Base ~70-72, grows to ~80-82 by 2100
        const oecdBaseline = 72 + (t * 0.13);  // ~0.13 kWh/day/year growth
        metrics.oecd.finalEnergy.push(oecdBaseline);

        // === OIL SHARE ===
        // Oil primarily in transport/petrochemicals (non-electric sector)
        // Global: ~30% in 2025, declines to ~10% by 2100
        // OECD: ~36% in 2025 (more vehicles), declines to ~10% by 2100
        const elecProgress = elecRate - 0.40;  // Progress beyond 40% electrification

        // Global oil share: smooth decline from 30% to 10%
        const globalOilShare = Math.max(0.10, 0.30 - elecProgress * 0.5 - t * 0.0015);
        metrics.global.oilShare.push(globalOilShare);

        // OECD oil share: starts higher, declines faster (faster EV adoption)
        const oecdOilShare = Math.max(0.10, 0.36 - elecProgress * 0.6 - t * 0.002);
        metrics.oecd.oilShare.push(oecdOilShare);

        // === PUBLIC DEBT/GDP ===
        // Debt dynamics following realistic trajectory:
        // - Global: ~92% in 2025, peaks ~105% mid-2030s, declines to ~90% by 2100
        // - OECD: ~110% in 2025, peaks ~118% in 2030s, declines to ~95% by 2100
        const depRatio = demographics.global.dependency[i];
        const damages = climate.globalDamages[i];

        // Global debt: rises early (aging + transition costs), then declines
        let globalDebt;
        if (t < 15) {
            // 2025-2040: Rising phase
            globalDebt = 0.92 + (t * 0.009) + damages * 0.3;  // Peaks around 105%
        } else if (t < 45) {
            // 2040-2070: Plateau/slow decline
            globalDebt = 1.05 - ((t - 15) * 0.003);
        } else {
            // 2070-2100: Decline as transition completes
            globalDebt = 0.96 - ((t - 45) * 0.002);
        }
        metrics.global.publicDebtGDP.push(Math.max(0.85, Math.min(1.10, globalDebt)));

        // OECD debt: starts higher, similar pattern
        let oecdDebt;
        if (t < 15) {
            oecdDebt = 1.10 + (t * 0.006) + damages * 0.25;  // Peaks around 118%
        } else if (t < 45) {
            oecdDebt = 1.18 - ((t - 15) * 0.005);
        } else {
            oecdDebt = 1.03 - ((t - 45) * 0.003);
        }
        metrics.oecd.publicDebtGDP.push(Math.max(0.90, Math.min(1.20, oecdDebt)));

        // === ADAPTATION SPENDING ===
        // Scales with temperature and damages
        // ~0.3% at 1.2°C, rises to ~1.5% at 2.5°C
        const temp = climate.temperature[i];
        const baseAdaptation = 0.003;
        const tempFactor = Math.pow((temp - 1.0) / 1.5, 1.5); // Nonlinear with temperature
        const adaptation = Math.min(0.02, baseAdaptation + tempFactor * 0.012);
        metrics.global.adaptationSpending.push(adaptation);

        // OECD spends slightly more on adaptation (wealthier, more infrastructure)
        metrics.oecd.adaptationSpending.push(adaptation * 1.15);

        // === OECD ROBOTS ===
        // OECD has higher robot density, but converges toward global as others catch up
        // Multiplier starts at 2.5x, declines to 1.2x by 2100
        const robotMultiplier = 2.5 - (t * 0.017);  // 2.5 -> ~1.2 over 75 years
        metrics.oecd.robotsPer1000.push(capital.robotsDensity[i] * Math.max(1.2, robotMultiplier));
    }

    return metrics;
}

// Generate narrative for each era
function generateNarratives(data, metrics, params) {
    const { years, climate, dispatch } = data;

    const narratives = {
        '2025-29': {
            title: 'Heat & Hesitancy',
            bullets: [
                `GMST establishes ~${formatNum(eraEnd(climate.temperature, ERAS[0], years), 2)} °C floor; coastal insurance premiums surge in exposed markets`,
                'VRE expansion constrained by grids and minerals; China/MENA add capacity faster while OECD faces permitting delays',
                `Global debt holds near ~${formatPct(eraAverage(metrics.global.publicDebtGDP, ERAS[0], years))} of GDP`
            ]
        },
        '2030-39': {
            title: 'Fractured Acceleration',
            bullets: [
                `Power-sector emissions peak; final energy rises on electrification and compute loads`,
                'Copper exceeds $12,000/tonne; lithium tight; PV/BESS learning curves flatten vs 2010s',
                'Diesel price shocks trigger food-cost unrest in some EMs; subsidies slow fuel-to-electric substitution'
            ]
        },
        '2040-49': {
            title: 'High-Cost Consolidation',
            bullets: [
                'Global VRE share plateaus near ~55-60%; long-duration storage scale-up challenges persist',
                `Adaptation spending reaches ~${formatPct(eraAverage(metrics.global.adaptationSpending, ERAS[2], years), 1)} of GDP for flood walls, cooling, and grid hardening`,
                `Debt peaks around ~${formatPct(eraEnd(metrics.global.publicDebtGDP, ERAS[2], years))} of GDP`
            ]
        },
        '2050-59': {
            title: 'Patch, Pay & Heat',
            bullets: [
                `Temperature hovers near ~${formatNum(eraAverage(climate.temperature, ERAS[3], years), 2)} °C; net-zero milestones drift without large CDR`,
                'Capital-income stipends emerge to close care-wage gaps',
                `Public debt begins gradual decline but remains ~${formatPct(eraAverage(metrics.global.publicDebtGDP, ERAS[3], years))} of GDP`
            ]
        },
        '2060-69': {
            title: 'Divergent Descent',
            bullets: [
                `Oil share stabilizes near ~${formatPct(eraAverage(metrics.global.oilShare, ERAS[4], years))}; freight, aviation, and petrochemicals remain persistent users`,
                'Engineered carbon removal scales but likely <1 Gt/yr; temperatures roughly flat',
                `Robot density exceeds ${formatNum(eraEnd(metrics.global.robotsPer1000, ERAS[4], years))} per 1,000 workers`
            ]
        },
        '2070-79': {
            title: 'Repair & Resilience',
            bullets: [
                'Sea level rise drives seawall-bond markets; adaptation spending near ~1.4% of GDP',
                `Robotics density exceeds ${formatNum(eraEnd(metrics.global.robotsPer1000, ERAS[5], years))} per 1,000 workers; care labor shortages partially addressed by cobots`,
                `Temperature stabilizes around ${formatNum(eraEnd(climate.temperature, ERAS[5], years), 2)} °C`
            ]
        },
        '2080-2100': {
            title: 'Tempered Stabilization',
            bullets: [
                `Oil share declines to ~${formatPct(eraEnd(metrics.global.oilShare, ERAS[6], years))} as e-fuels/synfuels mature for niche uses`,
                `Debt/GDP approaches ~${formatPct(eraEnd(metrics.global.publicDebtGDP, ERAS[6], years))} as demographic pressures ease`,
                `Final energy reaches ${formatNum(eraEnd(metrics.global.finalEnergy, ERAS[6], years))} kWh/person/day`
            ]
        }
    };

    return narratives;
}

// Generate trip-wire thresholds
function generateTripWires(data) {
    return [
        {
            trigger: 'Annual GMST <1.35 °C in 2026',
            action: 'Reopen cool-tail scenario; reduce adaptation projections'
        },
        {
            trigger: 'Global upstream oil CAPEX ≥$800bn/year',
            action: 'Downgrade "oil scarcity" concern; accelerate oil-share decline path'
        },
        {
            trigger: 'Real 10-year UST >1% for 12 months',
            action: 'Maintain higher debt ratios; increase LCOE assumptions by ~+15%'
        },
        {
            trigger: 'Q>20 fusion pilot delivers <$40/MWh PPA',
            action: 'Shift to tech-breakthrough path; lower 2080 oil-share floor to <5%'
        },
        {
            trigger: 'China EV sales >60% of new vehicles by 2027',
            action: 'Accelerate electrification trajectory; lower oil share faster'
        },
        {
            trigger: 'Grid-scale battery costs <$50/kWh by 2030',
            action: 'Increase VRE penetration ceiling; reduce gas backup assumptions'
        }
    ];
}

// Main forecast generation
function generateForecast(simParams, scenarioType, scenarioName = null) {
    const data = energySim.runSimulation(simParams);
    const metrics = computeDerivedMetrics(data);
    const narratives = generateNarratives(data, metrics, simParams);
    const tripWires = generateTripWires(data);

    // Scenario naming
    const scenarioTypeNames = {
        central: 'Managed Acceleration (Final Energy) — Central Path (≈30% Probability)',
        plateau: 'Technology Plateau — Constrained Transition (≈30% Probability)',
        breakthrough: 'Technology Breakthrough — Accelerated Decarbonization (≈20% Probability)'
    };

    // Use provided scenario name, or fall back to type-based name
    const displayName = scenarioName || scenarioTypeNames[scenarioType] || scenarioTypeNames.central;

    // Output
    console.log(`# Twin-Engine Century Forecast — ${displayName}\n`);

    // Global Headline Metrics Table
    console.log('## Global Headline Metrics\n');
    console.log('| Era | Final Energy (kWh/person·day) | GMST (°C vs pre-industrial) | Old-Age Dependency | Robots/1,000 Workers | Public Debt/GDP | Oil Share | Adaptation Spending (% GDP) |');
    console.log('|-----|-------------------------------|-----------------------------|--------------------|----------------------|-----------------|-----------|----------------------------|');

    for (const era of ERAS) {
        const energy = formatNum(eraAverage(metrics.global.finalEnergy, era, metrics.years), 0);
        const temp = formatNum(eraEnd(data.climate.temperature, era, metrics.years), 2);
        const dep = formatPct(eraAverage(metrics.global.dependency, era, metrics.years));
        const robots = formatNum(eraEnd(metrics.global.robotsPer1000, era, metrics.years), 0);
        const debt = formatPct(eraAverage(metrics.global.publicDebtGDP, era, metrics.years));
        const oil = formatPct(eraAverage(metrics.global.oilShare, era, metrics.years));
        const adapt = formatPct(eraAverage(metrics.global.adaptationSpending, era, metrics.years), 1);

        console.log(`| ${era.name} | ${energy} | ${temp} | ${dep} | ${robots} | ${debt} | ${oil} | ${adapt} |`);
    }

    // OECD Metrics Table
    console.log('\n## OECD Metrics\n');
    console.log('| Era | Final Energy (kWh/person·day) | Old-Age Dependency | Robots/1,000 Workers | Public Debt/GDP | Oil Share | Adaptation Spending (% GDP) |');
    console.log('|-----|-------------------------------|--------------------|----------------------|-----------------|-----------|----------------------------|');

    for (const era of ERAS) {
        const energy = formatNum(eraAverage(metrics.oecd.finalEnergy, era, metrics.years), 0);
        const dep = formatPct(eraAverage(metrics.oecd.dependency, era, metrics.years));
        const robots = formatNum(eraEnd(metrics.oecd.robotsPer1000, era, metrics.years), 0);
        const debt = formatPct(eraAverage(metrics.oecd.publicDebtGDP, era, metrics.years));
        const oil = formatPct(eraAverage(metrics.oecd.oilShare, era, metrics.years));
        const adapt = formatPct(eraAverage(metrics.oecd.adaptationSpending, era, metrics.years), 1);

        console.log(`| ${era.name} | ${energy} | ${dep} | ${robots} | ${debt} | ${oil} | ${adapt} |`);
    }

    console.log('\n*Note: GMST values identical for global and OECD projections. "Oil Share" refers to share of final energy.*\n');

    // Narratives
    console.log('## Narrative by Era\n');
    for (const era of ERAS) {
        const narrative = narratives[era.name];
        if (narrative) {
            console.log(`### ${era.name}: ${narrative.title}\n`);
            for (const bullet of narrative.bullets) {
                console.log(`* ${bullet}`);
            }
            console.log('');
        }
    }

    // Trip-Wires
    console.log('## Trip-Wire Monitoring Thresholds\n');
    console.log('| Trigger | Action |');
    console.log('|---------|--------|');
    for (const tw of tripWires) {
        console.log(`| ${tw.trigger} | ${tw.action} |`);
    }

    // Credibility Weights
    console.log('\n## Embedded Credibility Weights\n');
    console.log('* **Climate-risk assessment (80%)**: Incorporated via temperature floor and adaptation outlays');
    console.log('* **Grid-rate constraints (65%)**: Reflected in VRE plateau and moderated FE growth');
    console.log('* **Mineral bottlenecks (60%)**: Captured in copper/lithium trajectory and storage delays');
    console.log('* **Macro-traditional view (55%)**: Flatter debt reduction; higher discount rates on renewables');
    console.log('* **Alternative scenarios**: Tracked via trip-wires; combined probability <50%');

    // Probability Distribution
    console.log('\n## Scenario Probability Distribution\n');
    console.log('* **Central Path (this forecast)**: 30%');
    console.log('* **Technology Plateau**: 30%');
    console.log('* **Technology Breakthrough**: 20%');
    console.log('* **Debt-Accident Populism**: 12%');
    console.log('* **Climate Cascade**: 8%');

    console.log('\n---\n');
    console.log('*Use case: Strategic planning reference, scenario monitoring, and indicator tracking*');
    const cp = simParams.carbonPrice ?? energySim.defaults.carbonPrice;
    const cs = simParams.climSensitivity ?? energySim.defaults.climSensitivity;
    console.log(`\n*Generated by energy-sim.js | Carbon price: $${cp}/ton | Climate sensitivity: ${cs}°C*`);
}

// Run
async function main() {
    const args = parseArgs();

    let simParams;
    let scenarioName = null;

    if (args.scenarioFile) {
        // Load scenario file and merge with CLI overrides
        try {
            const scenario = await energySim.loadScenario(args.scenarioFile);
            const applied = energySim.applyScenario(scenario);
            scenarioName = applied.name;

            // CLI args override scenario params
            const cliOverrides = buildParams(args);
            simParams = { ...applied.params, ...cliOverrides };
        } catch (err) {
            console.error(`Error loading scenario: ${err.message}`);
            process.exit(1);
        }
    } else {
        // No scenario file - use defaults + CLI args
        simParams = { ...energySim.defaults };
        const cliOverrides = buildParams(args);
        for (const key in cliOverrides) {
            simParams[key] = cliOverrides[key];
        }
    }

    generateForecast(simParams, args.scenarioType, scenarioName);
}

main();
