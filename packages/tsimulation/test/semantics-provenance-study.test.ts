import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  auditConnectorContracts,
  auditModelContracts,
  assertMeasurementsCompatible,
  captureDataSnapshot,
  compareEstimands,
  createRunManifest,
  defineAdapter,
  defineEstimand,
  defineExperiment,
  defineMeasurement,
  defineMeasurementCrosswalk,
  defineModel,
  defineModule,
  defineSemanticCrosswalk,
  defineSemanticDerivation,
  inlineDataResolver,
  manifestToJson,
  measurementPort,
  measurementPort,
  observationPort,
  parseRunManifest,
  runAdapter,
  runEnsemble,
  runModel,
  runNestedEnsemble,
  validateDataRequest,
  validatePortCompatibility,
} from '../src/index.js';
import { okValidate } from './helpers.js';

const totalSiteEnergy = defineEstimand({
  schemaVersion: 'tsimulation.estimand/v1',
  id: 'energy.us-data-centers.full-site.total',
  version: '1',
  quantityKind: 'electricity-consumption',
  measure: { kind: 'flow', totality: 'total' },
  population: {
    id: 'facilities.us-data-centers',
    inclusion: ['servers', 'cooling', 'power conversion'],
  },
  geography: { id: 'geo.us', boundaryVersion: '2020' },
  time: {
    kind: 'interval',
    interval: 'calendar-year',
    aggregation: 'sum',
    calendar: 'gregorian',
  },
});

const incrementalServerEnergy = defineEstimand({
  schemaVersion: 'tsimulation.estimand/v1',
  id: 'energy.us-data-centers.servers.incremental',
  version: '1',
  quantityKind: 'electricity-consumption',
  measure: { kind: 'flow', totality: 'incremental' },
  population: {
    id: 'facilities.us-data-centers',
    inclusion: ['servers'],
    exclusion: ['cooling', 'power conversion'],
  },
  geography: { id: 'geo.us', boundaryVersion: '2020' },
  time: {
    kind: 'interval',
    interval: 'calendar-year',
    aggregation: 'sum',
    calendar: 'gregorian',
  },
});

const siteToServer = defineSemanticCrosswalk({
  schemaVersion: 'tsimulation.crosswalk/v1',
  id: 'full-site-to-incremental-server-energy',
  version: '1',
  description: 'Apply an empirically supported server share and subtract baseline load.',
  source: totalSiteEnergy,
  target: incrementalServerEnergy,
  method: 'server-share multiplied by full-site total, less baseline server load',
  assumptions: ['Power-usage effectiveness and baseline load are supplied by the adapter.'],
  uncertainty: { kind: 'relative-error', fraction: 0.15 },
});

test('same-unit ports reject different estimands unless a matching crosswalk is explicit', () => {
  const comparison = compareEstimands(totalSiteEnergy, incrementalServerEnergy);
  assert.equal(comparison.compatible, false);
  assert.ok(comparison.differences.some((difference) => difference.path === 'measure.totality'));
  assert.throws(
    () => validatePortCompatibility(
      measurementPort('TWh/year', totalSiteEnergy),
      measurementPort('TWh/year', incrementalServerEnergy),
      'data-center electricity',
    ),
    /semantic mismatch.*measure\.totality/,
  );
  assert.doesNotThrow(() => validatePortCompatibility(
    measurementPort('TWh/year', totalSiteEnergy),
    measurementPort('TWh/year', incrementalServerEnergy),
    'data-center electricity',
    { crosswalk: siteToServer },
  ));
});

test('semantic validation propagates through connectors and adapters', () => {
  const producer = defineModule({
    name: 'semantic-producer',
    description: 'Produces full-site electricity.',
    defaults: {},
    inputs: [] as const,
    outputs: ['electricity'] as const,
    connectorTypes: {
      inputs: {},
      outputs: {
        electricity: measurementPort('TWh/year', totalSiteEnergy),
      },
    },
    validate: okValidate,
    mergeParams: (params) => params,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { electricity: 100 } }),
  });
  const consumer = defineModule({
    name: 'semantic-consumer',
    description: 'Consumes incremental server electricity.',
    defaults: {},
    inputs: ['electricity'] as const,
    outputs: ['seen'] as const,
    connectorTypes: {
      inputs: {
        electricity: measurementPort('TWh/year', incrementalServerEnergy),
      },
      outputs: {
        seen: measurementPort('TWh/year', incrementalServerEnergy),
      },
    },
    validate: okValidate,
    mergeParams: (params) => params,
    init: () => ({}),
    step: (_state, inputs) => ({ state: {}, outputs: { seen: inputs.electricity } }),
  });
  const audit = auditConnectorContracts(
    [producer, consumer],
    {},
    {},
    'required',
  );
  assert.equal(audit.valid, false);
  assert.match(audit.errors.join('\n'), /semantic mismatch/);
  assert.equal(audit.semanticContracts, 3);

  const adapter = defineAdapter<{ value: number }, { value: number }>({
    id: 'site-to-server',
    version: '1',
    description: 'Crosswalk full-site to incremental server energy.',
    sourceModel: 'site',
    targetModel: 'server',
    sourceTimeScale: { kind: 'annual' },
    targetTimeScale: { kind: 'annual' },
    semanticValidation: 'required',
    sourcePorts: { value: measurementPort('TWh/year', totalSiteEnergy) },
    targetPorts: { value: measurementPort('TWh/year', incrementalServerEnergy) },
    portMappings: [{
      source: 'value',
      target: 'value',
      conversion: {
        kind: 'custom',
        description: 'Apply a 0.7 server share and subtract 10 TWh baseline.',
        convert: (value) => Number(value) * 0.7 - 10,
      },
      aggregation: { kind: 'none' },
      crosswalk: siteToServer,
    }],
    adapt: ({ value }) => ({ value: value * 0.7 - 10 }),
  });
  const adapted = runAdapter(adapter, { value: 100 });
  assert.equal(adapted.target.value, 60);
  assert.deepEqual(adapted.crosswalks, [{
    id: 'full-site-to-incremental-server-energy',
    version: '1',
  }]);
});

test('strict model audits expose semantic coverage without weakening unit coverage', () => {
  const model = {
    id: 'coverage',
    inputPorts: {
      observed: measurementPort('TWh/year', totalSiteEnergy),
      coefficient: { unit: 'fraction' },
    },
    outputPorts: {
      result: measurementPort('TWh/year', totalSiteEnergy),
    },
  };
  const audit = auditModelContracts([model], 'required');
  assert.equal(audit.valid, false);
  assert.equal(audit.semanticContracts, 2);
  assert.deepEqual(audit.missingSemanticPaths, ['model coverage.input.coefficient']);
});

test('measurements distinguish phenomenon time, publication time, and revision policy', () => {
  const measurement = defineMeasurement({
    schemaVersion: 'tsimulation.measurement/v1',
    id: 'annual-data-center-electricity.first-release',
    version: '1',
    estimand: totalSiteEnergy,
    dataset: { id: 'example.energy', field: 'data_center_twh' },
    procedure: { description: 'Survey-weighted annual facility electricity.' },
    phenomenonTime: { start: '2030-01-01', end: '2030-12-31' },
    resultTime: '2031-03-01T00:00:00.000Z',
    revisionPolicy: 'first-release',
    release: 'first',
    coverage: { fraction: 0.92 },
  });
  assert.equal(measurement.phenomenonTime?.start, '2030-01-01');
  assert.equal(measurement.resultTime, '2031-03-01T00:00:00.000Z');
});

test('measurement-regime mismatches require their own explicit crosswalk', () => {
  const operational = defineMeasurement({
    schemaVersion: 'tsimulation.measurement/v1',
    id: 'operational',
    version: '1',
    estimand: totalSiteEnergy,
    dataset: { id: 'energy.operational', field: 'twh' },
    procedure: { description: 'Backfill late facility reports.' },
    revisionPolicy: 'backfilled',
    release: 'revised',
  });
  const firstRelease = defineMeasurement({
    schemaVersion: 'tsimulation.measurement/v1',
    id: 'first-release',
    version: '1',
    estimand: totalSiteEnergy,
    dataset: { id: 'energy.first-release', field: 'twh' },
    procedure: { description: 'Freeze the first published facility total.' },
    revisionPolicy: 'first-release',
    release: 'first',
  });
  const crosswalk = defineMeasurementCrosswalk({
    schemaVersion: 'tsimulation.measurement-crosswalk/v1',
    id: 'operational-to-first-release',
    version: '1',
    description: 'Estimate first-release values from revised operational data.',
    source: operational,
    target: firstRelease,
    method: 'Multiply by the mean overlap ratio.',
    uncertainty: { kind: 'relative-error', fraction: 0.05 },
  });
  assert.throws(
    () => assertMeasurementsCompatible(operational, firstRelease, 'release bridge'),
    /measurement-regime mismatch.*revisionPolicy/,
  );
  assert.doesNotThrow(() =>
    assertMeasurementsCompatible(
      operational,
      firstRelease,
      'release bridge',
      { crosswalk },
    )
  );
  assert.throws(
    () => validatePortCompatibility(
      observationPort('TWh/year', operational),
      observationPort('TWh/year', firstRelease),
      'observed port bridge',
    ),
    /measurement-regime mismatch/,
  );
  assert.doesNotThrow(() => validatePortCompatibility(
    observationPort('TWh/year', operational),
    observationPort('TWh/year', firstRelease),
    'observed port bridge',
    { measurementCrosswalk: crosswalk },
  ));
});

test('data snapshots preserve exact bytes and distinguish retrieval vintages', async () => {
  const source = {
    id: 'example.energy',
    title: 'Example energy data',
    revisionPolicy: 'revisable' as const,
  };
  const resolver = inlineDataResolver({
    id: 'example-inline',
    version: '1',
    source,
    value: [{ year: 2030, value: 100 }],
    raw: '[{"year":2030,"value":100}]',
    mediaType: 'application/json',
  });
  const first = await captureDataSnapshot({
    resolver,
    request: { id: 'release' },
    context: { requestedAt: '2031-03-01T00:00:00.000Z' },
  });
  const repeated = await captureDataSnapshot({
    resolver,
    request: { id: 'release' },
    context: { requestedAt: '2031-03-01T00:00:00.000Z' },
  });
  const later = await captureDataSnapshot({
    resolver,
    request: { id: 'release' },
    context: { requestedAt: '2031-04-01T00:00:00.000Z' },
  });
  assert.equal(first.snapshot.id, repeated.snapshot.id);
  assert.equal(first.snapshot.artifact.id, later.snapshot.artifact.id);
  assert.notEqual(first.snapshot.id, later.snapshot.id);
  assert.match(first.snapshot.artifact.id, /^sha256:[a-f0-9]{64}$/);
  assert.throws(() => validateDataRequest({
    uri: 'https://example.com/data',
    query: { api_key: 'secret' },
  }), /appears secret/);
  assert.throws(() => validateDataRequest({
    uri: 'https://example.com/data?access_token=secret',
  }), /appears secret/);
  assert.throws(() => validateDataRequest({
    uri: 'https://user:password@example.com/data',
  }), /must not embed credentials/);
});

test('manifest v2 records snapshot lineage and upgrades v1 records explicitly', async () => {
  const measurement = defineMeasurement({
    schemaVersion: 'tsimulation.measurement/v1',
    id: 'manifest-measurement',
    version: '1',
    estimand: totalSiteEnergy,
    dataset: { id: 'manifest.data', field: 'value' },
    procedure: { description: 'Read the inline test value.' },
    revisionPolicy: 'immutable-release',
  });
  const model = defineModel<{ x: number }, { y: number }>({
    id: 'manifest-semantic',
    version: '1',
    description: 'Manifest test model.',
    inputPorts: { x: measurementPort('TWh/year', totalSiteEnergy) },
    outputPorts: { y: measurementPort('TWh/year', incrementalServerEnergy) },
    semanticValidation: 'required',
    semanticDerivations: [defineSemanticDerivation({
      schemaVersion: 'tsimulation.derivation/v1',
      id: 'manifest-test-derivation',
      version: '1',
      description: 'Apply a server share and remove baseline server load.',
      inputEstimandIds: [totalSiteEnergy.id],
      outputEstimand: incrementalServerEnergy,
      expression: 'y = 0.7 * x - 10',
    })],
    run: ({ x }) => ({ y: x * 0.7 - 10 }),
  });
  const resolver = inlineDataResolver({
    id: 'manifest-inline',
    version: '1',
    source: {
      id: 'manifest.data',
      title: 'Manifest data',
      revisionPolicy: 'immutable-release',
    },
    value: 2,
    measurement,
  });
  const captured = await captureDataSnapshot({
    resolver,
    request: {},
    context: { requestedAt: '2026-07-23T00:00:00.000Z' },
  });
  const manifest = createRunManifest({
    run: runModel(model, { x: 2 }),
    runId: 'semantic-run',
    createdAt: '2026-07-23T00:00:00.000Z',
    snapshots: [captured.snapshot],
    evidence: [{
      id: 'manifest-observation',
      label: 'Manifest observation',
      kind: 'observed',
      role: 'development',
      value: 2,
      unit: 'TWh/year',
      measurement: captured.snapshot.measurement,
      snapshotIds: [captured.snapshot.id],
    }],
  });
  assert.equal(manifest.schemaVersion, 'tsimulation.run/v2');
  assert.equal(manifest.dataLineage.snapshots[0].id, captured.snapshot.id);
  assert.ok(manifest.contractHashes.input);
  assert.deepEqual(manifest.semanticLineage.derivations, [{
    id: 'manifest-test-derivation',
    version: '1',
  }]);
  assert.equal(
    manifest.evidence[0].measurement?.snapshotId,
    captured.snapshot.id,
  );

  const legacy = {
    ...manifest,
    schemaVersion: 'tsimulation.run/v1' as const,
    dataLineage: undefined,
    dataLineageHash: undefined,
    contractHashes: undefined,
  };
  const legacyJson = JSON.stringify(Object.fromEntries(
    Object.entries(legacy).filter(([, value]) => value !== undefined),
  ));
  const upgraded = parseRunManifest(legacyJson);
  assert.equal(upgraded.schemaVersion, 'tsimulation.run/v2');
  assert.deepEqual(upgraded.semanticLineage, {
    derivations: [],
    crosswalks: [],
    measurementCrosswalks: [],
  });
  assert.equal(manifestToJson(manifest), manifestToJson(manifest));
});

const squareModel = defineModel<{ x: number }, { y: number }>({
  id: 'study-square',
  version: '1',
  description: 'Study semantics test model.',
  inputPorts: { x: { unit: '1' } },
  outputPorts: { y: { unit: '1' } },
  run: ({ x }) => ({ y: x * x }),
});

test('ensemble summaries reflect study meaning rather than sampling algorithm', () => {
  const stress = defineExperiment({
    schemaVersion: 'tsimulation.experiment/v1',
    id: 'stress',
    version: '1',
    description: 'Unweighted stress range.',
    intent: 'stress-test',
    variables: [{ id: 'x', role: 'structural', domain: { kind: 'interval', lower: 0, upper: 1 } }],
  });
  const stressResult = runEnsemble({
    model: squareModel,
    draws: 10,
    seed: 1,
    experiment: stress,
    sample: (random) => {
      const x = random();
      return { input: { x }, parameters: { x } };
    },
    metrics: { y: (output) => output.y },
  });
  assert.equal(stressResult.metrics.y.kind, 'design-sample');
  assert.equal('quantiles' in stressResult.metrics.y, false);
  assert.equal('empiricalPercentiles' in stressResult.metrics.y, true);

  const aleatory = defineExperiment({
    schemaVersion: 'tsimulation.experiment/v1',
    id: 'aleatory',
    version: '1',
    description: 'Objective variability.',
    intent: 'aleatory-uncertainty',
    variables: [{
      id: 'x',
      role: 'aleatory',
      domain: { kind: 'distribution', family: 'uniform', parameters: { lower: 0, upper: 1 } },
    }],
  });
  const probabilityResult = runEnsemble({
    model: squareModel,
    draws: 10,
    seed: 1,
    experiment: aleatory,
    sample: (random) => {
      const x = random();
      return { input: { x }, parameters: { x } };
    },
    metrics: { y: (output) => output.y },
  });
  assert.equal(probabilityResult.metrics.y.kind, 'probability');
  assert.equal('quantiles' in probabilityResult.metrics.y, true);

  assert.throws(() => defineExperiment({
    schemaVersion: 'tsimulation.experiment/v1',
    id: 'bad-epistemic',
    version: '1',
    description: 'Incorrectly probabilized ignorance.',
    intent: 'epistemic-uncertainty',
    variables: [{
      id: 'x',
      role: 'epistemic',
      domain: { kind: 'distribution', family: 'uniform', parameters: { lower: 0, upper: 1 } },
    }],
  }), /must use an interval, set, or explicit subjective-distribution/);

  assert.throws(() => defineExperiment({
    schemaVersion: 'tsimulation.experiment/v1',
    id: 'invalid-correlation',
    version: '1',
    description: 'Invalid three-variable correlation.',
    intent: 'aleatory-uncertainty',
    variables: ['x', 'y', 'z'].map((id) => ({
      id,
      role: 'aleatory' as const,
      domain: {
        kind: 'distribution' as const,
        family: 'normal',
        parameters: { mean: 0, standardDeviation: 1 },
      },
    })),
    dependence: {
      kind: 'correlation',
      variables: ['x', 'y', 'z'],
      matrix: [
        [1, 0.9, 0.9],
        [0.9, 1, -0.9],
        [0.9, -0.9, 1],
      ],
    },
  }), /not positive semidefinite/);
});

test('mixed uncertainty remains nested instead of becoming one false CDF', () => {
  const mixed = defineExperiment({
    schemaVersion: 'tsimulation.experiment/v1',
    id: 'mixed',
    version: '1',
    description: 'Structural possibilities outside objective variability.',
    intent: 'mixed-uncertainty',
    variables: [
      { id: 'structure', role: 'structural', domain: { kind: 'set', values: [1, 2] } },
      {
        id: 'noise',
        role: 'aleatory',
        domain: { kind: 'distribution', family: 'uniform', parameters: { lower: 0, upper: 1 } },
      },
    ],
  });
  assert.throws(() => runEnsemble({
    model: squareModel,
    draws: 2,
    seed: 1,
    experiment: mixed,
    sample: () => ({ input: { x: 1 } }),
    metrics: { y: (output) => output.y },
  }), /flat ensemble cannot represent mixed/);
  const nested = runNestedEnsemble({
    model: squareModel,
    experiment: mixed,
    epistemicCases: [
      { id: 'low', context: 1 },
      { id: 'high', context: 2 },
    ],
    aleatoryDrawsPerCase: 5,
    seed: 7,
    sample: (epistemic, random) => {
      const noise = random();
      return {
        input: { x: epistemic.context + noise },
        variables: { structure: epistemic.context, noise },
      };
    },
    metrics: { y: (output) => output.y },
  });
  assert.equal(nested.metrics.y.kind, 'nested-aleatory-epistemic');
  assert.deepEqual(Object.keys(nested.metrics.y.byEpistemicCase), ['low', 'high']);
  assert.ok(nested.metrics.y.meanRange.upper > nested.metrics.y.meanRange.lower);
});
