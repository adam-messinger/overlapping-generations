/**
 * Predator–prey example.
 *
 * Two modules in mutual feedback (prey depend on predators, predators depend on
 * prey). A one-step lag breaks the cycle: prey react to *last* step's predator
 * count. Run with: `npm run example`.
 */

import { defineModule, runAutowired } from '../src/index.js';

const prey = defineModule({
  name: 'prey',
  description: 'Prey population with logistic growth, thinned by predators',
  defaults: { growth: 0.6, capacity: 120, predation: 0.02 },
  inputs: ['laggedPredators'] as const,
  outputs: ['prey'] as const,
  validate: () => ({ valid: true, errors: [], warnings: [] }),
  mergeParams: (p) => ({ growth: 0.6, capacity: 120, predation: 0.02, ...p }),
  init: () => ({ count: 40 }),
  step: (state, inputs, params) => {
    const born = params.growth * state.count * (1 - state.count / params.capacity);
    const eaten = params.predation * state.count * inputs.laggedPredators;
    const count = Math.max(0, state.count + born - eaten);
    return { state: { count }, outputs: { prey: count } };
  },
});

const predator = defineModule({
  name: 'predator',
  description: 'Predator population fed by prey, thinned by mortality',
  defaults: { efficiency: 0.012, mortality: 0.5 },
  inputs: ['prey'] as const,
  outputs: ['predators'] as const,
  validate: () => ({ valid: true, errors: [], warnings: [] }),
  mergeParams: (p) => ({ efficiency: 0.012, mortality: 0.5, ...p }),
  init: () => ({ count: 9 }),
  step: (state, inputs, params) => {
    const born = params.efficiency * inputs.prey * state.count;
    const died = params.mortality * state.count;
    const count = Math.max(0, state.count + born - died);
    return { state: { count }, outputs: { predators: count } };
  },
});

const result = runAutowired({
  modules: [predator, prey], // order doesn't matter — the engine sorts
  lags: {
    laggedPredators: { source: 'predators', delay: 1, initial: 9 },
  },
  startYear: 0,
  endYear: 40,
});

console.log('  t    prey  predators');
for (let i = 0; i < result.years.length; i++) {
  const t = String(result.years[i]).padStart(3);
  const p = result.outputs.prey.prey[i].toFixed(1).padStart(6);
  const q = result.outputs.predator.predators[i].toFixed(1).padStart(6);
  console.log(`${t}  ${p}  ${q}`);
}
