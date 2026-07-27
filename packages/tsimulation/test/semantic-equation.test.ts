import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defineEstimand,
  defineSemanticDerivation,
  divideSemanticQuantities,
  multiplySemanticQuantities,
  semanticQuantity,
  sumSemanticQuantities,
} from '../src/index.js';

const scope = {
  population: {
    id: 'population.test',
    universe: 'Test population.',
  },
  geography: {
    id: 'geo.test',
    boundaryVersion: 'v1',
  },
  time: {
    kind: 'interval' as const,
    interval: 'simulation-step',
    aggregation: 'mean' as const,
    calendar: 'simulation-step',
  },
  vintage: {
    basis: 'current-period' as const,
    convention: 'Value applies to the current simulation step.',
  },
};

const power = defineEstimand({
  schemaVersion: 'tsimulation.estimand/v1',
  id: 'estimand.test.power',
  version: '1',
  quantityKind: 'electricity.power',
  measure: { kind: 'level', totality: 'incremental' },
  ...scope,
});
const hours = defineEstimand({
  schemaVersion: 'tsimulation.estimand/v1',
  id: 'estimand.test.hours',
  version: '1',
  quantityKind: 'calendar.hours',
  measure: { kind: 'count', totality: 'total' },
  ...scope,
});
const energy = defineEstimand({
  schemaVersion: 'tsimulation.estimand/v1',
  id: 'estimand.test.energy',
  version: '1',
  quantityKind: 'electricity.energy',
  measure: { kind: 'flow', totality: 'incremental' },
  ...scope,
});
const otherEnergy = defineEstimand({
  ...energy,
  id: 'estimand.test.other-energy',
  quantityKind: 'electricity.other-energy',
});
const powerTimesHours = defineSemanticDerivation({
  schemaVersion: 'tsimulation.derivation/v1',
  id: 'derivation.test.power-times-hours',
  version: '1',
  description: 'Integrate power over time.',
  inputEstimandIds: [power.id, hours.id],
  outputEstimand: energy,
  expression: 'energy = power * hours',
});
const energyPerHours = defineSemanticDerivation({
  schemaVersion: 'tsimulation.derivation/v1',
  id: 'derivation.test.energy-per-hours',
  version: '1',
  description: 'Recover average power from energy and time.',
  inputEstimandIds: [energy.id, hours.id],
  outputEstimand: power,
  expression: 'power = energy / hours',
});

test('semantic equations enforce both units and output meaning', () => {
  const result = multiplySemanticQuantities({
    quantities: [
      semanticQuantity(2, 'GW', power),
      semanticQuantity(1, 'hour', hours),
    ],
    outputEstimand: energy,
    derivation: powerTimesHours,
    targetUnit: 'GWh',
  });
  assert.equal(result.value, 2);
  assert.equal(result.unit, 'GWh');
  assert.equal(result.estimand.id, energy.id);

  const recovered = divideSemanticQuantities({
    numerator: result,
    denominator: semanticQuantity(1, 'hour', hours),
    outputEstimand: power,
    derivation: energyPerHours,
    targetUnit: 'GW',
  });
  assert.equal(recovered.value, 2);
});

test('same-unit values with different estimands cannot be added implicitly', () => {
  assert.throws(() => sumSemanticQuantities([
    semanticQuantity(1, 'GWh', energy),
    semanticQuantity(1, 'GWh', otherEnergy),
  ]), /different estimands/);
});

test('same-unit dimensionless inputs cannot impersonate one another in an equation', () => {
  const loadFactor = defineEstimand({
    schemaVersion: 'tsimulation.estimand/v1',
    id: 'estimand.test.load-factor',
    version: '1',
    quantityKind: 'electricity.load-factor',
    measure: { kind: 'share', totality: 'total' },
    ratio: { numerator: 'average load', denominator: 'maximum load' },
    ...scope,
  });
  const energyShare = defineEstimand({
    ...loadFactor,
    id: 'estimand.test.energy-share',
    quantityKind: 'electricity.energy-share',
    ratio: { numerator: 'selected energy', denominator: 'total energy' },
  });
  const realizedPower = defineEstimand({
    ...power,
    id: 'estimand.test.realized-power',
    quantityKind: 'electricity.realized-power',
  });
  const derivation = defineSemanticDerivation({
    schemaVersion: 'tsimulation.derivation/v1',
    id: 'derivation.test.realized-power',
    version: '1',
    description: 'Apply load factor to maximum power.',
    inputEstimandIds: [power.id, loadFactor.id],
    outputEstimand: realizedPower,
    expression: 'realizedPower = power * loadFactor',
  });
  assert.throws(
    () => multiplySemanticQuantities({
      quantities: [
        semanticQuantity(2, 'GW', power),
        semanticQuantity(0.5, 'fraction', energyShare),
      ],
      outputEstimand: realizedPower,
      derivation,
      targetUnit: 'GW',
    }),
    /does not declare input estimand 'estimand\.test\.energy-share'/,
  );
});
