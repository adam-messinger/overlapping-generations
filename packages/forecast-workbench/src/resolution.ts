import {
  mapNumericOutcome,
  questionHash,
  type ForecastQuestion,
  type ResolutionStatus,
  type ResolutionVersion,
} from './contracts.js';
import type { Clock } from './canonical.js';

export function resolveNumericQuestion(options: {
  question: ForecastQuestion;
  clock: Clock;
  status?: ResolutionStatus;
  resolverImplementationHash: string;
  value: number;
  snapshotIds: readonly string[];
  observationVersionIds?: readonly string[];
  mappingExplanation: string;
  fallbackInvoked?: string;
  adjudication?: string;
  supersedesResolutionId?: string;
}): ResolutionVersion {
  const outcomeId = mapNumericOutcome(options.question.outcome, options.value);
  return {
    schemaVersion: 'forecast-workbench.resolution/v1',
    questionHash: questionHash(options.question),
    status: options.status ?? 'final',
    resolvedAt: options.clock.now().toISOString(),
    resolverId: options.question.resolver.id,
    resolverVersion: options.question.resolver.version,
    resolverImplementationHash: options.resolverImplementationHash,
    snapshotIds: [...options.snapshotIds],
    observationVersionIds: [...(options.observationVersionIds ?? [])],
    derivedValue: options.value,
    ...(outcomeId ? { outcomeId } : {}),
    mappingExplanation: options.mappingExplanation,
    ...(options.fallbackInvoked ? { fallbackInvoked: options.fallbackInvoked } : {}),
    ...(options.adjudication ? { adjudication: options.adjudication } : {}),
    ...(options.supersedesResolutionId
      ? { supersedesResolutionId: options.supersedesResolutionId }
      : {}),
  };
}
