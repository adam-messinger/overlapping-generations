import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditModelContracts } from 'tsimulation';
import { france2026HeatEvent, heatAdaptationPackages } from './heat/data.js';
import { genericDrugEconomicsScenarios } from './drug-supply/data.js';
import { genericTariffScenarios } from './drug-supply/generic-tariff.js';
import { dataCenterGridScenarios } from './news/data-center-grid.js';
import { centralAviationScenario } from './aviation-infrastructure/data.js';
import { canadaJuly2026Tariff } from './trade/data.js';
import {
  contagionPolicies,
  leveragedFunds2026,
  sovereignMarkets2026,
  sovereignShockScenarios,
} from './financial-contagion/data.js';
import { maritimeScenarios } from './critical-materials/shipping-data.js';
import { hormuzScenarios } from './critical-materials/hormuz-data.js';
import { hormuzGlobalAdapter } from './critical-materials/hormuz-bridge.js';
import { criticalMaterialNetwork } from './critical-materials/data.js';
import {
  SIMULATION_MODELS,
  dataCenterGridModel,
  outbreakForecastModel,
  simulationModelRegistry,
} from './registry.js';
import {
  cdcFixedInitialAdmissionsMeasurement,
  cdcOperationalAdmissionsMeasurement,
} from './outbreak/measurement-contracts.js';
import { outbreakResolutionAdapter } from './outbreak/forecast-bridge.js';
import {
  COMPOSITION_ENTRYPOINT_COVERAGE,
  SIMULATION_ENTRYPOINT_COVERAGE,
} from './entrypoint-coverage.js';

function discoverSimulationEntrypoints(directory: string): string[] {
  const names = new Set<string>();
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const name of discoverSimulationEntrypoints(path)) names.add(name);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      const source = readFileSync(path, 'utf8');
      const pattern =
        /export function\s+(simulate[A-Z][A-Za-z0-9]*|makeForecast|run[A-Z][A-Za-z0-9]*(?:Simulation|Experiment))\s*\(/g;
      for (const match of source.matchAll(pattern)) names.add(match[1]);
    }
  }
  return [...names].sort();
}

test('standalone model registry has recursive dimensional coverage', () => {
  const audit = auditModelContracts(SIMULATION_MODELS);
  assert.equal(audit.valid, true, audit.errors.join('\n'));
  assert.ok(audit.unitBearingContracts > 300);
  assert.ok(audit.structuredContracts > 50);
  assert.ok(audit.metadataContracts > 20);
  assert.deepEqual(audit.opaquePaths, [
    'model war-ai-factorial.input.baseParams',
    'model war-ai-factorial.input.aiParams',
    'model war-ai-factorial.output.paths',
  ]);
  assert.equal(audit.opaqueContracts, 3);
});

test('migrated forecasting boundaries have complete semantic contracts', () => {
  const audit = auditModelContracts(
    [dataCenterGridModel, outbreakForecastModel],
    'required',
  );
  assert.equal(audit.valid, true, audit.errors.join('\n'));
  assert.deepEqual(audit.missingSemanticPaths, []);
  assert.ok(audit.semanticContracts > 60);
  assert.equal(audit.measurementContracts, 1);
  assert.equal(
    dataCenterGridModel.evidence?.[0].semanticDerivations?.[0].id,
    'derivation.data-center.bnef-total-to-incremental-load',
  );
  assert.equal(outbreakResolutionAdapter.measurementValidation, 'required');
  assert.equal(
    outbreakResolutionAdapter.portMappings[0].measurementCrosswalk?.id,
    'measurement-crosswalk.outbreak.operational-to-fixed-initial-admissions',
  );
  assert.equal(hormuzGlobalAdapter.semanticValidation, 'required');
  assert.deepEqual(
    hormuzGlobalAdapter.portMappings
      .flatMap((mapping) => mapping.crosswalk?.id ?? []),
    [
      'crosswalk.hormuz.oil-availability-to-non-electric-energy',
      'crosswalk.hormuz.gas-availability-to-non-electric-energy',
    ],
  );
});

test('CDC operational and fixed-initial series share an estimand but not a measurement regime', () => {
  assert.equal(
    cdcOperationalAdmissionsMeasurement.estimand,
    cdcFixedInitialAdmissionsMeasurement.estimand,
  );
  assert.equal(cdcOperationalAdmissionsMeasurement.revisionPolicy, 'backfilled');
  assert.equal(cdcFixedInitialAdmissionsMeasurement.revisionPolicy, 'first-release');
  assert.notEqual(
    cdcOperationalAdmissionsMeasurement.dataset.id,
    cdcFixedInitialAdmissionsMeasurement.dataset.id,
  );
});

test('every exported simulation entry point is registered or explicitly classified', () => {
  const directory = dirname(fileURLToPath(import.meta.url));
  assert.deepEqual(
    discoverSimulationEntrypoints(directory),
    Object.keys(SIMULATION_ENTRYPOINT_COVERAGE).sort(),
  );
  const registeredIds = new Set(simulationModelRegistry.list().map((model) => model.id));
  for (const [name, coverage] of Object.entries(SIMULATION_ENTRYPOINT_COVERAGE)) {
    if (coverage.status === 'registered') {
      assert.ok(registeredIds.has(coverage.modelId), `${name} references missing ${coverage.modelId}`);
    } else {
      assert.ok(coverage.reason.length > 20, `${name} needs a substantive exclusion reason`);
      assert.ok(registeredIds.has(coverage.coveredBy), `${name} has unknown covering model`);
    }
  }
  assert.deepEqual(Object.keys(COMPOSITION_ENTRYPOINT_COVERAGE).sort(), [
    'runAgingSim',
    'runAutowiredSimulation',
    'runGlobalCitySimulation',
    'runSimulation',
  ]);
});

test('representative standalone runs satisfy every nested runtime contract', () => {
  const runs = [
    simulationModelRegistry.run('acute-heat-event', {
      event: france2026HeatEvent,
      adaptation: heatAdaptationPackages.current,
      mortalityScale: 1,
    }),
    simulationModelRegistry.run('generic-drug-economics', genericDrugEconomicsScenarios['frozen-cap']),
    simulationModelRegistry.run(
      'generic-drug-tariff-transition',
      genericTariffScenarios.announced,
    ),
    simulationModelRegistry.run(
      'data-center-grid-cost-allocation',
      dataCenterGridScenarios['full-pledge-clean-flex'],
    ),
    simulationModelRegistry.run('bilateral-tariff-io', { action: canadaJuly2026Tariff }),
    simulationModelRegistry.run('critical-material-price-network', {
      nodes: criticalMaterialNetwork,
      shockedNodeId: 'rare-earths',
      shockFraction: 1,
    }),
    simulationModelRegistry.run('critical-material-flow-network', {
      nodes: criticalMaterialNetwork,
      options: {
        months: 3,
        supplyPaths: { 'rare-earths': [0.5, 0.75, 1] },
        revision: 'v3',
        priceElasticity: 2.75,
        pricePassThrough: 0.85,
      },
    }),
    simulationModelRegistry.run('sovereign-nbfi-contagion', {
      scenario: sovereignShockScenarios['uk-100bp'],
      policy: contagionPolicies.current,
      markets: sovereignMarkets2026,
      funds: leveragedFunds2026,
    }),
    simulationModelRegistry.run('multi-chokepoint-maritime', {
      scenario: maritimeScenarios['red-sea-2024-development'],
    }),
    simulationModelRegistry.run('defense-magnet-sourcing', { policy: 'continued-waivers' }),
    simulationModelRegistry.run('hormuz-stock-flow', {
      scenario: hormuzScenarios['short-disruption'],
    }),
    simulationModelRegistry.run('outbreak-preparedness', {
      population: 10_000_000,
      weeks: 12,
      r0: 3,
      infectiousDays: 5,
      incubationDays: 5.2,
      initialInfectious: 10,
      initialExposed: 50,
      responseStartDay: 30,
      responseMultiplier: 0.5,
      responseRampDays: 14,
      easingStartDaysAfterResponse: 70,
      easedResponseMultiplier: 0.85,
      easingRampDays: 35,
      importedInfectionsPerMillionPerDay: 0.1,
      ascertainment: 0.25,
      infectionFatalityRatio: 0.007,
      caseReportDelayDays: 5,
      infectionToDeathDays: 22,
      hospitalizationRate: 0.04,
      hospitalStayDays: 10,
      staffedBedsPer100k: 30,
      overflowFatalitySlope: 0.35,
      severityDeclineStartDaysAfterResponse: 35,
      severityHalfLifeDays: 35,
      severityFloor: 0.2,
    }),
    simulationModelRegistry.run('outbreak-probabilistic-forecast', {
      values: Array.from({ length: 20 }, (_, index) => 100 + index * 5),
      model: 'adaptive-ensemble',
      originIndex: 14,
      horizon: 4,
    }),
    simulationModelRegistry.run(
      'aviation-infrastructure-traffic',
      centralAviationScenario,
    ),
  ];
  assert.equal(runs.length, 14);
});

test('war-AI annual rows satisfy their recursive contract', () => {
  const run = simulationModelRegistry.run('war-ai-factorial', {
    endYear: 2026,
    aiParams: {
      demand: { dataCenterBaseGrowth: 0.15, dataCenterPowerSpendCeiling: 0.005 },
      production: { aiWorkerEquivalentPerTWh: 100_000 },
    },
  });
  assert.equal((run.output as { years: unknown[] }).years.length, 2);
});
