import { readFileSync } from 'fs';

// Read the HTML file and extract the script
const html = readFileSync('energy-sim.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const script = scriptMatch[1];

// Replace browser-only code
const modifiedScript = script
  .replace(/const isBrowser = .*/, 'const isBrowser = false;')
  .replace(/window\.energySim = /, 'globalThis.energySim = ');

// Run the script
eval(modifiedScript);

// Now run scenarios
const sim = globalThis.energySim;
sim.config.quiet = true;

// Run central scenario (STEPS-aligned baseline, $35/ton)
const central = sim.runScenario({ carbonPrice: 35 });

// Get full data for era calculations
const data = sim.runSimulation({ carbonPrice: 35 });

// Helper to average over era indices
function eraAvg(arr, startIdx, endIdx) {
  let sum = 0;
  for (let i = startIdx; i <= endIdx; i++) sum += arr[i];
  return sum / (endIdx - startIdx + 1);
}

// Era definitions (indices into arrays, 0 = 2025)
const eras = [
  { name: '2025-29', start: 0, end: 4 },
  { name: '2030-39', start: 5, end: 14 },
  { name: '2040-49', start: 15, end: 24 },
  { name: '2050-59', start: 25, end: 34 },
  { name: '2060-69', start: 35, end: 44 },
  { name: '2070-79', start: 45, end: 54 },
  { name: '2080-2100', start: 55, end: 75 }
];

// Calculate TOTAL FINAL ENERGY per capita per day (not just electricity)
// Total energy = electricity / electrification rate
const totalFinalEnergyPerCapitaDay = data.demand.global.electricityDemand.map((elecTwh, i) => {
  const electrificationRate = data.demand.global.electrificationRate[i];
  const totalEnergyTwh = elecTwh / electrificationRate;  // Total final energy in TWh
  const pop = data.demographics.global.population[i];
  // TWh to kWh per person per day
  return (totalEnergyTwh * 1e9 / pop) / 365;
});

// OECD total final energy per capita
const oecdTotalEnergyPerCapitaDay = data.demand.regions.oecd.electricityDemand.map((elecTwh, i) => {
  const electrificationRate = data.demand.global.electrificationRate[i];  // Use global rate
  const totalEnergyTwh = elecTwh / electrificationRate;
  const pop = data.demographics.regions.oecd.population[i];
  return (totalEnergyTwh * 1e9 / pop) / 365;
});

// China total final energy per capita
const chinaTotalEnergyPerCapitaDay = data.demand.regions.china.electricityDemand.map((elecTwh, i) => {
  const electrificationRate = data.demand.global.electrificationRate[i];
  const totalEnergyTwh = elecTwh / electrificationRate;
  const pop = data.demographics.regions.china.population[i];
  return (totalEnergyTwh * 1e9 / pop) / 365;
});

console.log('\n# Twin-Engine Century Forecast — Current Policies Baseline (STEPS-Aligned)\n');

console.log('## Global Headline Metrics\n');
console.log('| Era | Final Energy (kWh/person·day) | GMST (°C) | Old-Age Dependency | Robots/1,000 Workers | Savings Rate | Interest Rate |');
console.log('|-----|-------------------------------|-----------|-------------------|---------------------|--------------|---------------|');

for (const era of eras) {
  const energy = eraAvg(totalFinalEnergyPerCapitaDay, era.start, era.end);
  const temp = eraAvg(data.climate.temperature, era.start, era.end);
  const dep = eraAvg(data.demographics.global.dependency, era.start, era.end) * 100;
  const robots = eraAvg(data.capital.robotsDensity, era.start, era.end);
  const savings = eraAvg(data.capital.savingsRate, era.start, era.end) * 100;
  const interest = eraAvg(data.capital.interestRate, era.start, era.end) * 100;

  console.log(`| ${era.name} | ${energy.toFixed(0)} | ${temp.toFixed(2)} | ${dep.toFixed(0)}% | ${robots.toFixed(0)} | ${savings.toFixed(1)}% | ${interest.toFixed(1)}% |`);
}

console.log('\n## OECD Metrics\n');
console.log('| Era | Final Energy (kWh/person·day) | Old-Age Dependency | Robots/1,000 Workers | College Share |');
console.log('|-----|-------------------------------|-------------------|---------------------|---------------|');

// OECD robots density (scale by relative GDP per capita - OECD is richer)
const oecdGdpRatio = data.demand.regions.oecd.gdp.map((g, i) => {
  const oecdPop = data.demographics.regions.oecd.population[i];
  const globalPop = data.demographics.global.population[i];
  const globalGdp = data.demand.global.gdp[i];
  return (g / oecdPop) / (globalGdp / globalPop);
});

for (const era of eras) {
  const energy = eraAvg(oecdTotalEnergyPerCapitaDay, era.start, era.end);
  const dep = eraAvg(data.demographics.regions.oecd.dependency, era.start, era.end) * 100;
  const globalRobots = eraAvg(data.capital.robotsDensity, era.start, era.end);
  const gdpRatio = eraAvg(oecdGdpRatio, era.start, era.end);
  const oecdRobots = globalRobots * Math.min(gdpRatio, 2.5);
  const college = eraAvg(data.demographics.regions.oecd.collegeShare, era.start, era.end) * 100;

  console.log(`| ${era.name} | ${energy.toFixed(0)} | ${dep.toFixed(0)}% | ${oecdRobots.toFixed(0)} | ${college.toFixed(0)}% |`);
}

console.log('\n## China Metrics\n');
console.log('| Era | Final Energy (kWh/person·day) | Old-Age Dependency | College Share | Effective Workers (B) |');
console.log('|-----|-------------------------------|-------------------|---------------|----------------------|');

for (const era of eras) {
  const energy = eraAvg(chinaTotalEnergyPerCapitaDay, era.start, era.end);
  const dep = eraAvg(data.demographics.regions.china.dependency, era.start, era.end) * 100;
  const college = eraAvg(data.demographics.regions.china.collegeShare, era.start, era.end) * 100;
  const effWorkers = eraAvg(data.demographics.regions.china.effectiveWorkers, era.start, era.end) / 1e9;

  console.log(`| ${era.name} | ${energy.toFixed(0)} | ${dep.toFixed(0)}% | ${college.toFixed(0)}% | ${effWorkers.toFixed(2)} |`);
}

console.log('\n## Climate & Energy Transition\n');
console.log('| Era | Emissions (Gt CO₂) | Grid Intensity (kg/MWh) | Solar Share | Clean Share | Damages (% GDP) |');
console.log('|-----|-------------------|------------------------|-------------|-------------|-----------------|');

for (const era of eras) {
  const emissions = eraAvg(data.climate.emissions, era.start, era.end);
  const intensity = eraAvg(data.dispatch.gridIntensity, era.start, era.end);

  const solar = eraAvg(data.dispatch.solar, era.start, era.end) + eraAvg(data.dispatch.solarPlusBattery, era.start, era.end);
  const wind = eraAvg(data.dispatch.wind, era.start, era.end);
  const nuclear = eraAvg(data.dispatch.nuclear, era.start, era.end);
  const gas = eraAvg(data.dispatch.gas, era.start, era.end);
  const coal = eraAvg(data.dispatch.coal, era.start, era.end);
  const total = solar + wind + nuclear + gas + coal;

  const solarShare = (solar / total) * 100;
  const cleanShare = ((solar + wind + nuclear) / total) * 100;
  const damages = eraAvg(data.climate.globalDamages, era.start, era.end);

  console.log(`| ${era.name} | ${emissions.toFixed(1)} | ${intensity.toFixed(0)} | ${solarShare.toFixed(0)}% | ${cleanShare.toFixed(0)}% | ${damages.toFixed(1)}% |`);
}

console.log('\n## Capital Dynamics\n');
console.log('| Era | Capital Stock ($T) | K/Y Ratio | Investment ($T/yr) | Stability Factor |');
console.log('|-----|-------------------|-----------|-------------------|------------------|');

for (const era of eras) {
  const stock = eraAvg(data.capital.stock, era.start, era.end);
  const gdp = eraAvg(data.demand.global.gdp, era.start, era.end);
  const ky = stock / gdp;
  const invest = eraAvg(data.capital.investment, era.start, era.end);
  const stability = eraAvg(data.capital.stability, era.start, era.end);

  console.log(`| ${era.name} | ${stock.toFixed(0)} | ${ky.toFixed(2)} | ${invest.toFixed(1)} | ${stability.toFixed(3)} |`);
}

// Key milestones
console.log('\n## Key Milestones\n');
console.log(`| Milestone | Year |`);
console.log(`|-----------|------|`);
console.log(`| Solar crosses gas LCOE | ${central.solarCrossesGas || 'Already'} |`);
console.log(`| Solar+Battery < Gas | ${central.solarBatteryCrossesGas || 'Already'} |`);
console.log(`| Coal uneconomic | ${central.coalUneconomic || 'Already'} |`);
console.log(`| Grid < 200 kg CO₂/MWh | ${central.gridBelow200 || 'N/A'} |`);
console.log(`| Grid < 100 kg CO₂/MWh | ${central.gridBelow100 || 'N/A'} |`);
console.log(`| Peak emissions | ${central.peakEmissionsYear} (${central.peakEmissionsGt.toFixed(1)} Gt) |`);
console.log(`| Global population peak | ${central.popPeakYear} |`);
console.log(`| China college workers peak | ${central.chinaCollegePeakYear} |`);

// Summary metrics
console.log('\n## Summary Metrics\n');
console.log(`| Metric | 2025 | 2050 | 2100 |`);
console.log(`|--------|------|------|------|`);
console.log(`| Global Population (B) | ${(data.demographics.global.population[0]/1e9).toFixed(2)} | ${(data.demographics.global.population[25]/1e9).toFixed(2)} | ${(data.demographics.global.population[75]/1e9).toFixed(2)} |`);
console.log(`| Final Energy (kWh/day) | ${totalFinalEnergyPerCapitaDay[0].toFixed(0)} | ${totalFinalEnergyPerCapitaDay[25].toFixed(0)} | ${totalFinalEnergyPerCapitaDay[75].toFixed(0)} |`);
console.log(`| Electricity (TWh) | ${data.demand.global.electricityDemand[0].toFixed(0)} | ${data.demand.global.electricityDemand[25].toFixed(0)} | ${data.demand.global.electricityDemand[75].toFixed(0)} |`);
console.log(`| Electrification Rate | ${(data.demand.global.electrificationRate[0]*100).toFixed(0)}% | ${(data.demand.global.electrificationRate[25]*100).toFixed(0)}% | ${(data.demand.global.electrificationRate[75]*100).toFixed(0)}% |`);
console.log(`| Emissions (Gt CO₂) | ${data.climate.emissions[0].toFixed(1)} | ${data.climate.emissions[25].toFixed(1)} | ${data.climate.emissions[75].toFixed(1)} |`);
console.log(`| Temperature (°C) | ${data.climate.temperature[0].toFixed(2)} | ${data.climate.temperature[25].toFixed(2)} | ${data.climate.temperature[75].toFixed(2)} |`);
console.log(`| Capital Stock ($T) | ${data.capital.stock[0].toFixed(0)} | ${data.capital.stock[25].toFixed(0)} | ${data.capital.stock[75].toFixed(0)} |`);
console.log(`| Robots/1000 Workers | ${data.capital.robotsDensity[0].toFixed(0)} | ${data.capital.robotsDensity[25].toFixed(0)} | ${data.capital.robotsDensity[75].toFixed(0)} |`);
console.log(`| College Share | ${(data.demographics.global.collegeShare[0]*100).toFixed(0)}% | ${(data.demographics.global.collegeShare[25]*100).toFixed(0)}% | ${(data.demographics.global.collegeShare[75]*100).toFixed(0)}% |`);
console.log(`| Warming 2100 | — | — | ${central.warming2100.toFixed(2)}°C |`);

// Narrative
console.log('\n## Narrative by Era\n');

console.log('### 2025-29: Transition Foundations');
console.log(`- Temperature at ${data.climate.temperature[0].toFixed(2)}°C, rising toward ${data.climate.temperature[4].toFixed(2)}°C`);
console.log(`- Grid intensity ${data.dispatch.gridIntensity[0].toFixed(0)} kg/MWh; solar learning curves accelerating`);
console.log(`- Electrification at ${(data.demand.global.electrificationRate[0]*100).toFixed(0)}%; transport/heating still fossil-dominated`);
console.log(`- Robots density ${data.capital.robotsDensity[0].toFixed(0)}/1000; automation share nascent (2%)`);

console.log('\n### 2030-39: Accelerating Electrification');
console.log(`- Emissions decline from peak; grid intensity drops to ${data.dispatch.gridIntensity[14].toFixed(0)} kg/MWh by 2039`);
console.log(`- Solar+Battery crosses gas LCOE (${central.solarBatteryCrossesGas}); dispatchable clean becomes default`);
console.log(`- Electrification reaches ${(data.demand.global.electrificationRate[14]*100).toFixed(0)}%; EVs gain mass adoption`);
console.log(`- China college workers approach peak; effective labor partially offsets demographic decline`);

console.log('\n### 2040-49: Demographic Inflection');
console.log(`- Global population peaks (~${central.popPeakYear}); dependency ratios accelerate`);
console.log(`- Savings rates decline as populations age: ${(data.capital.savingsRate[24]*100).toFixed(1)}% by 2049`);
console.log(`- Clean energy share reaches ${((data.dispatch.solar[24] + data.dispatch.solarPlusBattery[24] + data.dispatch.wind[24] + data.dispatch.nuclear[24]) / (data.dispatch.solar[24] + data.dispatch.solarPlusBattery[24] + data.dispatch.wind[24] + data.dispatch.nuclear[24] + data.dispatch.gas[24] + data.dispatch.coal[24]) * 100).toFixed(0)}%`);
console.log(`- Robots density ${data.capital.robotsDensity[24].toFixed(0)}/1000; automation intensifies`);

console.log('\n### 2050-59: Energy Transition Matures');
console.log(`- Grid intensity ${data.dispatch.gridIntensity[30].toFixed(0)} kg/MWh; residual fossil for dispatchability`);
console.log(`- Temperature at ${data.climate.temperature[30].toFixed(2)}°C; approaching 2°C threshold`);
console.log(`- Final energy per capita peaks near ${totalFinalEnergyPerCapitaDay[30].toFixed(0)} kWh/day`);
console.log(`- Climate damages ${data.climate.globalDamages[30].toFixed(1)}% of GDP; adaptation spending rises`);

console.log('\n### 2060-79: Demographic Pressure Peak');
console.log(`- Old-age dependency reaches ${(data.demographics.global.dependency[50]*100).toFixed(0)}% by 2075`);
console.log(`- Robots density ${data.capital.robotsDensity[50].toFixed(0)}/1000 workers; cobots address care labor gaps`);
console.log(`- Grid fully decarbonized; emissions plateau at ${data.climate.emissions[50].toFixed(1)} Gt (non-electric residual)`);
console.log(`- Temperature ${data.climate.temperature[50].toFixed(2)}°C; damages ${data.climate.globalDamages[50].toFixed(1)}% GDP`);

console.log('\n### 2080-2100: Stabilization');
console.log(`- Temperature ${data.climate.temperature[75].toFixed(2)}°C; emissions ${data.climate.emissions[75].toFixed(1)} Gt/year`);
console.log(`- Population ${(data.demographics.global.population[75]/1e9).toFixed(2)}B (declining from ${central.popPeakYear} peak)`);
console.log(`- Capital stock $${data.capital.stock[75].toFixed(0)}T; robots ${data.capital.robotsDensity[75].toFixed(0)}/1000 workers`);
console.log(`- Final energy declines to ${totalFinalEnergyPerCapitaDay[75].toFixed(0)} kWh/day as efficiency gains dominate`);

// Trip-wire thresholds
console.log('\n## Trip-Wire Monitoring Thresholds\n');
console.log('| Trigger | Action |');
console.log('|---------|--------|');
console.log('| Annual GMST >2.0°C before 2040 | Accelerate adaptation projections; raise damage coefficients |');
console.log('| Grid intensity <50 kg/MWh by 2040 | Shift to tech-breakthrough path; lower residual emissions |');
console.log('| China dependency >60% by 2050 | Accelerate automation assumptions; raise care labor costs |');
console.log('| Global savings rate <15% | Increase interest rate projections; slow capital accumulation |');
console.log('| Robots >100/1000 by 2060 | Shift to automation-dominant path; model labor displacement |');

// =============================================================================
// RESOURCE DEMAND (Phase 6)
// =============================================================================

console.log('\n## Critical Mineral Demand\n');
console.log('| Era | Copper (Mt/yr) | Lithium (Mt/yr) | Rare Earths (Mt/yr) | Steel (Mt/yr) |');
console.log('|-----|---------------|-----------------|---------------------|---------------|');

for (const era of eras) {
  const copper = eraAvg(data.resources.minerals.copper.demand, era.start, era.end);
  const lithium = eraAvg(data.resources.minerals.lithium.demand, era.start, era.end);
  const rareEarths = eraAvg(data.resources.minerals.rareEarths.demand, era.start, era.end);
  const steel = eraAvg(data.resources.minerals.steel.demand, era.start, era.end);

  console.log(`| ${era.name} | ${copper.toFixed(2)} | ${lithium.toFixed(3)} | ${rareEarths.toFixed(3)} | ${steel.toFixed(0)} |`);
}

console.log('\n## Mineral Cumulative Demand & Reserve Ratios\n');
console.log('| Mineral | Cumulative 2050 (Mt) | Cumulative 2100 (Mt) | Reserve Ratio 2050 | Reserve Ratio 2100 |');
console.log('|---------|---------------------|---------------------|-------------------|-------------------|');

const mineralNames = { copper: 'Copper', lithium: 'Lithium', rareEarths: 'Rare Earths' };
for (const [key, name] of Object.entries(mineralNames)) {
  const cum2050 = data.resources.minerals[key].cumulative[25];
  const cum2100 = data.resources.minerals[key].cumulative[75];
  const rr2050 = data.resources.minerals[key].reserveRatio[25];
  const rr2100 = data.resources.minerals[key].reserveRatio[75];
  const flag2050 = rr2050 > 0.5 ? ' ⚠️' : '';
  const flag2100 = rr2100 > 0.5 ? ' ⚠️' : '';
  console.log(`| ${name} | ${cum2050.toFixed(1)} | ${cum2100.toFixed(1)} | ${(rr2050*100).toFixed(0)}%${flag2050} | ${(rr2100*100).toFixed(0)}%${flag2100} |`);
}

console.log('\n## Food & Protein Demand\n');
console.log('| Era | Calories/day | Protein Share | Grain Equiv (Mt) | GLP-1 Effect |');
console.log('|-----|--------------|---------------|------------------|--------------|');

for (const era of eras) {
  const calories = eraAvg(data.resources.food.caloriesPerCapita, era.start, era.end);
  const protein = eraAvg(data.resources.food.proteinShare, era.start, era.end) * 100;
  const grain = eraAvg(data.resources.food.grainEquivalent, era.start, era.end);
  const glp1 = eraAvg(data.resources.food.glp1Effect, era.start, era.end) * 100;

  console.log(`| ${era.name} | ${calories.toFixed(0)} | ${protein.toFixed(1)}% | ${grain.toFixed(0)} | ${glp1.toFixed(1)}% |`);
}

console.log('\n## Land Use\n');
console.log('| Era | Farmland (Mha) | Urban (Mha) | Forest (Mha) | Yield (t/ha) |');
console.log('|-----|---------------|-------------|--------------|--------------|');

for (const era of eras) {
  const farmland = eraAvg(data.resources.land.farmland, era.start, era.end);
  const urban = eraAvg(data.resources.land.urban, era.start, era.end);
  const forest = eraAvg(data.resources.land.forest, era.start, era.end);
  const yieldVal = eraAvg(data.resources.land.yield, era.start, era.end);

  console.log(`| ${era.name} | ${farmland.toFixed(0)} | ${urban.toFixed(0)} | ${forest.toFixed(0)} | ${yieldVal.toFixed(2)} |`);
}

console.log('\n## Resource Milestones\n');
console.log(`| Milestone | Value |`);
console.log(`|-----------|-------|`);
console.log(`| Copper demand peak | ${central.copperPeakYear} (${central.copperPeakDemand.toFixed(2)} Mt/yr) |`);
console.log(`| Lithium demand peak | ${central.lithiumPeakYear} (${central.lithiumPeakDemand.toFixed(3)} Mt/yr) |`);
console.log(`| Copper reserve ratio 2100 | ${(central.copperReserveRatio2100*100).toFixed(0)}% |`);
console.log(`| Lithium reserve ratio 2100 | ${(central.lithiumReserveRatio2100*100).toFixed(0)}% |`);
console.log(`| Protein share 2050 | ${(central.proteinShare2050*100).toFixed(1)}% |`);
console.log(`| GLP-1 calorie reduction 2050 | ${(central.glp1Effect2050*100).toFixed(1)}% |`);
console.log(`| Farmland change 2025→2100 | ${(central.farmlandChange*100).toFixed(1)}% |`);
console.log(`| Forest loss 2025→2100 | ${(central.forestLoss*100).toFixed(1)}% |`);

console.log('\n## Scenario Parameters Used\n');
console.log('```');
console.log(`carbonPrice: $${central.params.carbonPrice}/ton CO₂`);
console.log(`solarAlpha: ${central.params.solarAlpha} (learning rate)`);
console.log(`solarGrowth: ${(central.params.solarGrowth * 100).toFixed(0)}%/year`);
console.log(`electrificationTarget: ${(central.params.electrificationTarget * 100).toFixed(0)}%`);
console.log(`climSensitivity: ${central.params.climSensitivity}°C per CO₂ doubling`);
console.log('```');
