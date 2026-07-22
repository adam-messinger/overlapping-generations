import { runAutowiredSimulation } from '../src/simulation-autowired.js';
import { getOutputsAtYear } from '../src/framework/autowire.js';

const aw = runAutowiredSimulation({});
const years = [2025, 2030, 2035, 2040, 2045, 2050, 2060, 2075, 2100];
console.log('Year  Solar$  Wind$  Gas$  Coal$  Nuke$  System$  GridInt  Curtail');
for (const y of years) {
  const i = aw.years.indexOf(y);
  if (i < 0) continue;
  const o = getOutputsAtYear(aw, i);
  const lcoes: any = o.lcoes ?? {};
  const sys = (o.systemLCOE as number) ?? 0;
  const grid = (o.gridIntensity as number) ?? 0;
  const curt = (o.curtailmentRate as number) ?? 0;
  console.log(
    `${y}  ${(lcoes.solar ?? 0).toFixed(0).padStart(6)}  ${(lcoes.wind ?? 0).toFixed(0).padStart(5)}  ${(lcoes.gas ?? 0).toFixed(0).padStart(4)}  ${(lcoes.coal ?? 0).toFixed(0).padStart(5)}  ${(lcoes.nuclear ?? 0).toFixed(0).padStart(5)}  ${sys.toFixed(0).padStart(7)}  ${grid.toFixed(0).padStart(6)}  ${(curt * 100).toFixed(1).padStart(6)}%`
  );
}
console.log();
console.log('Year  SolarGW  WindGW  BattGWh  ElecTWh  Fossil  ElecRate  RenewSh');
for (const y of years) {
  const i = aw.years.indexOf(y);
  if (i < 0) continue;
  const o = getOutputsAtYear(aw, i);
  const c: any = o.capacities ?? {};
  console.log(
    `${y}  ${(c.solar ?? 0).toFixed(0).padStart(7)}  ${(c.wind ?? 0).toFixed(0).padStart(6)}  ${(c.battery ?? 0).toFixed(0).padStart(7)}  ${((o.electricityDemand as number) ?? 0).toFixed(0).padStart(7)}  ${(((o.fossilShare as number) ?? 0) * 100).toFixed(0).padStart(5)}%  ${(((o.electrificationRate as number) ?? 0) * 100).toFixed(0).padStart(7)}%  ${(((o.renewableShare as number) ?? 0) * 100).toFixed(0).padStart(6)}%`
  );
}

// Sample mid-day vs evening (already aggregated annual; show solar share + curtail)
console.log();
console.log('Region 2050 Grid Intensity & Solar Share:');
const i50 = aw.years.indexOf(2050);
if (i50 >= 0) {
  const o = getOutputsAtYear(aw, i50);
  const gen: any = o.regionalGeneration ?? {};
  const grid: any = o.regionalGridIntensity ?? {};
  for (const r of ['oecd', 'china', 'india', 'latam', 'seasia', 'russia', 'mena', 'ssa']) {
    const g = gen[r] ?? {};
    const total = Object.values(g).reduce((s: number, v: any) => s + (v ?? 0), 0) as number;
    const solar = (g.solar ?? 0) + (g.wind ?? 0);
    console.log(`  ${r.padEnd(8)} grid=${(grid[r] ?? 0).toFixed(0)} kg/MWh  VRE share=${total > 0 ? ((solar / total) * 100).toFixed(0) : 0}%`);
  }
}
