import { runAutowiredSimulation } from '../src/simulation-autowired.js';
import { getOutputsAtYear } from 'tsimulation';
import { REGIONS, REGION_NAMES, REGION_NAME_WIDTH } from '../src/domain-types.js';
import { demographicsDefaults } from '../src/modules/demographics.js';

const aw = runAutowiredSimulation({});
const milestones = [2025, 2050, 2075, 2100];

console.log('Heat-stress labor loss (% of effective workers, baseline scenario)');
console.log('Year   ' + REGIONS.map(r => r.padStart(7)).join(' '));
for (const y of milestones) {
  const i = aw.years.indexOf(y);
  if (i < 0) continue;
  const o = getOutputsAtYear(aw, i);
  const hs: any = o.heatStressLoss ?? {};
  console.log(
    `${y}  ` +
    REGIONS.map(r => ((hs[r] ?? 0) * 100).toFixed(1).padStart(7)).join(' ')
  );
}
console.log('\nHeat-stress params: outdoor-worker fraction, baseline wet-bulb (°C, 2025), warming amplification');
for (const r of REGIONS) {
  const h = demographicsDefaults.heatStress[r];
  console.log(`  ${REGION_NAMES[r].padEnd(REGION_NAME_WIDTH)}  ${(h.outdoorFraction * 100).toFixed(0).padStart(3)}%  ${h.baselineWetBulb.toString().padStart(3)}  ${h.warmingAmplification.toFixed(1)}x`);
}
