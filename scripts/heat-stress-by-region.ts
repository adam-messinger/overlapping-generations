import { runAutowiredSimulation } from '../src/simulation-autowired.js';
import { getOutputsAtYear } from '../src/framework/autowire.js';
import { REGIONS } from '../src/domain-types.js';

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
console.log('\nBaseline outdoor-worker fractions (param):');
console.log('  OECD 15%, China 25%, India 40%, LATAM 25%, SE Asia 35%, Russia 20%, MENA 30%, SSA 45%');
console.log('\nBaseline wet-bulb (°C, 2025) and warming amplification:');
console.log('  OECD 24/0.8x, China 28/1.0x, India 31/1.2x, LATAM 28/1.0x, SE Asia 30/1.1x, Russia 18/0.6x, MENA 30/1.2x, SSA 31/1.2x');
