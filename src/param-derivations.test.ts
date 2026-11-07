/**
 * Derived Parameter Tests
 *
 * A quantity two modules share is computed from its owner, so the pair cannot
 * drift. These pin that the runner applies every derivation in every scenario,
 * that splitting a pair takes an explicit `decouple`, and that tools can see
 * which parameters are derived.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { PARAM_DERIVATIONS } from './param-derivations.js';
import { deriveSimulationParams, runAutowiredSimulation } from './simulation-autowired.js';
import { describeParameters } from './introspection.js';
import { scenarioToParams, type Scenario } from './scenario.js';
import { cdrDefaults } from './modules/cdr.js';
import { climateModule } from './modules/climate.js';
import { demandModule, gdpWeightedIntensityDecline } from './modules/demand.js';
import { dispatchModule } from './modules/dispatch.js';
import { test, expect, printSummary } from './test-utils.js';

const scenarioFiles = readdirSync('scenarios').filter((file) => file.endsWith('.json')).sort();
const loadScenario = (file: string) =>
  JSON.parse(readFileSync(`scenarios/${file}`, 'utf-8')) as Scenario;

test('every scenario runs with each derived parameter equal to its source', () => {
  // The pins this replaces checked defaults only, which is how the efficiency
  // series re-split in exactly the scenarios that moved efficiencyMultiplier.
  for (const file of scenarioFiles) {
    const input = scenarioToParams(loadScenario(file));
    const { params } = deriveSimulationParams(input);
    const demand = demandModule.mergeParams(params.demand ?? {});
    const climate = climateModule.mergeParams(params.climate ?? {});
    const dispatch = dispatchModule.mergeParams(params.dispatch ?? {});
    expect(params.production!.serviceEfficiencyGrowth)
      .toBe(gdpWeightedIntensityDecline(demand.regions) * demand.efficiencyMultiplier);
    expect(params.production!.structuralEfficiencyShare).toBe(demand.structuralEfficiencyShare);
    expect(params.production!.structuralDecayHalfLife).toBe(demand.structuralDecayHalfLife);
    expect(params.cdr!.tcre).toBe(cdrDefaults.tcre * climate.sensitivity / 3.0);
    expect(params.energy!.gridLossFactor).toBe(dispatch.gridLossFactor);
  }
});

test('setting a derived parameter, even at its default, is refused without decouple', () => {
  // The ensemble wrapper's trap: passing the coupled value at its own default
  // bypassed the `??=` coupling and moved every metric with nothing failing.
  const atDefault = deriveSimulationParams({}).params.production!.serviceEfficiencyGrowth;
  expect(() => runAutowiredSimulation({ production: { serviceEfficiencyGrowth: atDefault } }))
    .toThrow("Parameter 'production.serviceEfficiencyGrowth' is derived from demand.regions, demand.efficiencyMultiplier");
  expect(() => runAutowiredSimulation({ cdr: { tcre: 0.001 } }))
    .toThrow("list 'cdr.tcre' in decouple");
});

test('decouple splits a pair deliberately, and the override is what runs', () => {
  const { params } = deriveSimulationParams({
    cdr: { tcre: 0.001 },
    climate: { sensitivity: 4.5 },
    decouple: ['cdr.tcre'],
  });
  expect(params.cdr!.tcre).toBe(0.001);
  expect(() => deriveSimulationParams({ decouple: ['cdr.alpha'] }))
    .toThrow("decouple names 'cdr.alpha', which is not a derived parameter");
});

test('a scenario file can carry decouple, and an unknown top-level key is still rejected', () => {
  const params = scenarioToParams({
    name: 'split', cdr: { tcre: 0.001 }, decouple: ['cdr.tcre'],
  } as unknown as Scenario);
  expect(params.decouple?.join(',')).toBe('cdr.tcre');
  expect(deriveSimulationParams(params).params.cdr!.tcre).toBe(0.001);
  expect(() => scenarioToParams({ name: 'typo', decoupel: [] } as unknown as Scenario))
    .toThrow('Unrecognized scenario key "decoupel"');
});

test('introspection marks every Tier-1 derived parameter with what it is derived from', () => {
  const schema = describeParameters();
  const targets = new Set(PARAM_DERIVATIONS.map((d) => d.target));
  for (const info of Object.values(schema)) {
    expect(Boolean(info.derivedFrom)).toBe(targets.has(info.path));
  }
  expect(schema.serviceEfficiencyGrowth.derivedFrom?.join(','))
    .toBe('demand.regions,demand.efficiencyMultiplier');
});

test('derivation sources count as read for parameter liveness', () => {
  // Overriding a source that only a derivation reads must not be reported dead
  const result = runAutowiredSimulation(
    { demand: { efficiencyMultiplier: 1.1 }, climate: { sensitivity: 3.5 } },
    { diagnostics: false, paramLiveness: 'report' },
  );
  const liveness = result.diagnostics?.parameterLiveness;
  expect(liveness?.demand.unreadOverridePaths.length).toBe(0);
  expect(liveness?.climate.unreadOverridePaths.length).toBe(0);
});

printSummary();
