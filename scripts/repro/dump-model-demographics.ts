/**
 * Dump this repository's own demographics output for the §5.3 diagnostics of
 * docs/HUMAN_CAPITAL_REPRODUCTION.md.  The independent reproduction is driven
 * entirely by UN WPP; these two CSVs are the one place it reads a study
 * artefact, and only to test whether the model's population path (levels) or
 * its cohort dynamics (shape) explain the divergence.
 *
 *   npx tsx scripts/repro/dump-model-demographics.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { REGIONS } from '../../src/domain-types.js';
import { demographicsModule, demographicsDefaults } from '../../src/modules/demographics.js';

const OUT = 'data/human-capital-repro';
mkdirSync(OUT, { recursive: true });

const params = demographicsDefaults;
let state = demographicsModule.init(params);
const pop: string[] = ['region,year,population'];
const coh: string[] = ['region,year,young,working,entrants'];

for (let i = 0; i < 76; i++) {
  const year = 2025 + i;
  const { state: next, outputs } = demographicsModule.step(state, {} as never, params, year, i);
  state = next;
  for (const r of REGIONS) {
    pop.push(`${r},${year},${outputs.regionalPopulation[r].toFixed(1)}`);
    coh.push(`${r},${year},${outputs.regionalYoung[r].toFixed(1)},` +
             `${outputs.regionalWorking[r].toFixed(1)},` +
             `${outputs.regionalWorkforceEntrants[r].toFixed(1)}`);
  }
}

writeFileSync(`${OUT}/model_population.csv`, pop.join('\n') + '\n');
writeFileSync(`${OUT}/model_cohorts.csv`, coh.join('\n') + '\n');
console.log(`wrote ${OUT}/model_population.csv and ${OUT}/model_cohorts.csv`);
