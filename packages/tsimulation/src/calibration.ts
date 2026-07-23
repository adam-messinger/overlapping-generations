import type { EvidenceRole } from './evidence.js';
import { validateDataSnapshot, type DataSnapshot } from './data.js';
import { validateMeasurement, type MeasurementBinding } from './semantics.js';
import { stableHash } from './serialization.js';

export interface CalibrationObservation<T> {
  id: string;
  role: Extract<EvidenceRole, 'development' | 'validation' | 'holdout' | 'diagnostic'>;
  value: T;
  weight?: number;
  evidenceId?: string;
  snapshotIds?: readonly string[];
  measurement?: MeasurementBinding;
}

export interface CalibrationProblem<TParams, TObservation, TPrediction> {
  id: string;
  candidates: Iterable<TParams> | (() => Iterable<TParams>);
  observations: readonly CalibrationObservation<TObservation>[];
  snapshots?: readonly DataSnapshot[];
  predict: (
    params: TParams,
    observation: CalibrationObservation<TObservation>,
  ) => TPrediction;
  loss: (
    prediction: TPrediction,
    observation: CalibrationObservation<TObservation>,
  ) => number;
  priorPenalty?: (params: TParams) => number;
}

export interface CalibrationScore {
  role: CalibrationObservation<unknown>['role'];
  count: number;
  weightedMeanLoss: number | null;
  totalWeight: number;
}

export interface CalibrationPrediction<TPrediction> {
  observationId: string;
  role: CalibrationObservation<unknown>['role'];
  prediction: TPrediction;
  loss: number;
  weight: number;
}

export interface CalibrationResult<TParams, TPrediction> {
  id: string;
  params: TParams;
  candidateCount: number;
  developmentObjective: number;
  scores: Record<CalibrationObservation<unknown>['role'], CalibrationScore>;
  predictions: readonly CalibrationPrediction<TPrediction>[];
  splitHash: string;
  snapshotIds: readonly string[];
}

const ROLES: CalibrationObservation<unknown>['role'][] = [
  'development',
  'validation',
  'holdout',
  'diagnostic',
];

export function calibrate<TParams, TObservation, TPrediction>(
  problem: CalibrationProblem<TParams, TObservation, TPrediction>,
): CalibrationResult<TParams, TPrediction> {
  if (!problem.id) throw new Error('Calibration ID must not be empty');
  const ids = new Set<string>();
  const snapshots = problem.snapshots ?? [];
  const snapshotById = new Map<string, DataSnapshot>();
  for (const snapshot of snapshots) {
    validateDataSnapshot(snapshot, `Calibration '${problem.id}' snapshot '${snapshot.id}'`);
    if (snapshotById.has(snapshot.id)) {
      throw new Error(`Calibration '${problem.id}' has duplicate snapshot '${snapshot.id}'`);
    }
    snapshotById.set(snapshot.id, snapshot);
  }
  for (const observation of problem.observations) {
    if (ids.has(observation.id)) throw new Error(`Duplicate calibration observation '${observation.id}'`);
    ids.add(observation.id);
    if (observation.weight !== undefined &&
        (!Number.isFinite(observation.weight) || observation.weight <= 0)) {
      throw new Error(`Observation '${observation.id}' weight must be finite and positive`);
    }
    if (observation.measurement) {
      validateMeasurement(
        observation.measurement,
        `Calibration observation '${observation.id}' measurement`,
      );
      if (observation.measurement.snapshotId &&
          snapshots.length > 0 &&
          !snapshotById.has(observation.measurement.snapshotId)) {
        throw new Error(
          `Calibration observation '${observation.id}' measurement references unknown ` +
          `snapshot '${observation.measurement.snapshotId}'`,
        );
      }
      if (observation.measurement.snapshotId &&
          !(observation.snapshotIds ?? []).includes(observation.measurement.snapshotId)) {
        throw new Error(
          `Calibration observation '${observation.id}' measurement snapshot is absent ` +
          'from snapshotIds',
        );
      }
    }
    for (const snapshotId of observation.snapshotIds ?? []) {
      if (snapshots.length > 0 && !snapshotById.has(snapshotId)) {
        throw new Error(
          `Calibration observation '${observation.id}' references unknown snapshot '${snapshotId}'`,
        );
      }
    }
  }
  const development = problem.observations.filter((row) => row.role === 'development');
  if (development.length === 0) throw new Error(`Calibration '${problem.id}' has no development observations`);
  const candidates = typeof problem.candidates === 'function'
    ? problem.candidates()
    : problem.candidates;
  let bestParams: TParams | undefined;
  let bestObjective = Number.POSITIVE_INFINITY;
  let candidateCount = 0;
  for (const candidate of candidates) {
    candidateCount++;
    let weightedLoss = 0;
    let totalWeight = 0;
    for (const observation of development) {
      const prediction = problem.predict(candidate, observation);
      const loss = problem.loss(prediction, observation);
      if (!Number.isFinite(loss) || loss < 0) {
        throw new Error(`Calibration '${problem.id}' produced invalid loss for '${observation.id}'`);
      }
      const weight = observation.weight ?? 1;
      weightedLoss += weight * loss;
      totalWeight += weight;
    }
    const objective = weightedLoss / totalWeight + (problem.priorPenalty?.(candidate) ?? 0);
    if (!Number.isFinite(objective)) throw new Error(`Calibration '${problem.id}' objective is non-finite`);
    if (objective < bestObjective) {
      bestObjective = objective;
      bestParams = candidate;
    }
  }
  if (bestParams === undefined || candidateCount === 0) {
    throw new Error(`Calibration '${problem.id}' has no candidates`);
  }

  // Holdouts become visible only after the development-only selection above.
  const predictions: CalibrationPrediction<TPrediction>[] = problem.observations.map((observation) => {
    const prediction = problem.predict(bestParams!, observation);
    const loss = problem.loss(prediction, observation);
    if (!Number.isFinite(loss) || loss < 0) {
      throw new Error(`Calibration '${problem.id}' produced invalid final loss for '${observation.id}'`);
    }
    return {
      observationId: observation.id,
      role: observation.role,
      prediction,
      loss,
      weight: observation.weight ?? 1,
    };
  });
  const scores = Object.fromEntries(ROLES.map((role) => {
    const rows = predictions.filter((row) => row.role === role);
    const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
    return [role, {
      role,
      count: rows.length,
      weightedMeanLoss: totalWeight > 0
        ? rows.reduce((sum, row) => sum + row.loss * row.weight, 0) / totalWeight
        : null,
      totalWeight,
    } satisfies CalibrationScore];
  })) as Record<CalibrationObservation<unknown>['role'], CalibrationScore>;
  const usedSnapshotIds = [...new Set(
    problem.observations.flatMap((observation) => observation.snapshotIds ?? []),
  )].sort();
  return {
    id: problem.id,
    params: bestParams,
    candidateCount,
    developmentObjective: bestObjective,
    scores,
    predictions,
    splitHash: stableHash(problem.observations.map(({
      id,
      role,
      weight,
      evidenceId,
      snapshotIds,
      measurement,
    }) => ({
      id,
      role,
      weight,
      evidenceId,
      snapshotIds: [...(snapshotIds ?? [])].sort(),
      measurement,
      snapshots: [...(snapshotIds ?? [])]
        .sort()
        .map((snapshotId) => {
          const snapshot = snapshotById.get(snapshotId);
          return snapshot
            ? {
                id: snapshot.id,
                artifact: snapshot.artifact.digest,
                normalizedDigest: snapshot.normalizedDigest,
              }
            : { id: snapshotId };
        }),
    }))),
    snapshotIds: usedSnapshotIds,
  };
}
