import assert from 'node:assert/strict';
import test from 'node:test';

import { auditModelContracts } from 'tsimulation';
import { france2026HeatEvent, heatAdaptationPackages } from './heat/data.js';
import { genericDrugEconomicsScenarios } from './drug-supply/data.js';
import { canadaJuly2026Tariff } from './trade/data.js';
import {
  contagionPolicies,
  leveragedFunds2026,
  sovereignMarkets2026,
  sovereignShockScenarios,
} from './financial-contagion/data.js';
import { maritimeScenarios } from './critical-materials/shipping-data.js';
import { hormuzScenarios } from './critical-materials/hormuz-data.js';
import { SIMULATION_MODELS, simulationModelRegistry } from './registry.js';

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

test('representative standalone runs satisfy every nested runtime contract', () => {
  const runs = [
    simulationModelRegistry.run('acute-heat-event', {
      event: france2026HeatEvent,
      adaptation: heatAdaptationPackages.current,
      mortalityScale: 1,
    }),
    simulationModelRegistry.run('generic-drug-economics', genericDrugEconomicsScenarios['frozen-cap']),
    simulationModelRegistry.run('bilateral-tariff-io', { action: canadaJuly2026Tariff }),
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
  ];
  assert.equal(runs.length, 8);
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
