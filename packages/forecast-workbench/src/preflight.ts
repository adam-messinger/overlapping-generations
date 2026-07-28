import {
  mapNumericOutcome,
  questionHash,
  validateForecastQuestion,
  type ForecastQuestion,
  type PreflightCheck,
  type QuestionPreflight,
} from './contracts.js';
import type { Clock } from './canonical.js';

export interface ResolverProbe {
  ok: boolean;
  schemaRecognized: boolean;
  message: string;
  artifactId?: string;
  expectedPublicationAt?: string;
}

export interface PreflightOptions {
  question: ForecastQuestion;
  designerId: string;
  clock: Clock;
  resolverProbe: ResolverProbe;
  historicalValues?: readonly number[];
  disclosedPacketIds?: readonly string[];
  designerOnlyPacketIds?: readonly string[];
  soloWorkflow?: boolean;
  alreadySeenNotes?: string;
  degeneracyThreshold?: number;
}

export function runQuestionPreflight(options: PreflightOptions): QuestionPreflight {
  const checks: PreflightCheck[] = [];
  try {
    validateForecastQuestion(options.question);
    checks.push({
      id: 'question-contract',
      status: 'pass',
      message: 'Question, outcome, timing, and resolution contracts are structurally valid.',
    });
  } catch (error) {
    checks.push({
      id: 'question-contract',
      status: 'fail',
      message: error instanceof Error ? error.message : String(error),
    });
  }
  checks.push({
    id: 'resolver-probe',
    status: options.resolverProbe.ok ? 'pass' : 'fail',
    message: options.resolverProbe.message,
  });
  checks.push({
    id: 'resolver-schema',
    status: options.resolverProbe.schemaRecognized ? 'pass' : 'fail',
    message: options.resolverProbe.schemaRecognized
      ? 'Resolver response schema matches the pinned parser contract.'
      : 'Resolver response schema does not match the pinned parser contract.',
  });
  const expectedPublication =
    options.resolverProbe.expectedPublicationAt ??
    options.question.resolver.expectedPublicationAt ??
    options.question.expectedResolutionAt;
  checks.push({
    id: 'publication-time',
    status: expectedPublication ? 'pass' : 'warning',
    message: expectedPublication
      ? `Expected publication is pinned at ${expectedPublication}.`
      : 'Expected publication time is not pinned.',
  });
  checks.push({
    id: 'cancellation-fallback',
    status: options.question.resolver.cancellationRule.trim() ? 'pass' : 'fail',
    message: options.question.resolver.fallback
      ? 'Cancellation and fallback rules are present.'
      : 'Cancellation rule is present; no fallback resolver is defined.',
  });

  if (options.historicalValues && options.historicalValues.length > 0 &&
      options.question.outcome.kind === 'ordered-categorical') {
    const counts = Object.fromEntries(
      options.question.outcome.bins.map(({ id }) => [id, 0]),
    ) as Record<string, number>;
    for (const value of options.historicalValues) {
      const id = mapNumericOutcome(options.question.outcome, value);
      if (id) counts[id]++;
    }
    const maximum = Math.max(...Object.values(counts)) / options.historicalValues.length;
    const threshold = options.degeneracyThreshold ?? 0.8;
    checks.push({
      id: 'historical-bin-occupancy',
      status: maximum > threshold ? 'warning' : 'pass',
      message: maximum > threshold
        ? `One bin contains ${(100 * maximum).toFixed(1)}% of the supplied preflight sample.`
        : 'No bin dominates the supplied preflight sample.',
      details: {
        observations: options.historicalValues.length,
        counts,
        maximumFraction: maximum,
        threshold,
      },
    });
  } else {
    checks.push({
      id: 'historical-bin-occupancy',
      status: 'warning',
      message: 'Historical bin occupancy was not evaluated.',
    });
  }

  return {
    schemaVersion: 'forecast-workbench.preflight/v1',
    questionHash: questionHash(options.question),
    checkedAt: options.clock.now().toISOString(),
    designerId: options.designerId,
    ...(options.resolverProbe.artifactId
      ? { resolverProbeArtifactId: options.resolverProbe.artifactId }
      : {}),
    checks,
    disclosedPacketIds: [...(options.disclosedPacketIds ?? [])],
    designerOnlyPacketIds: [...(options.designerOnlyPacketIds ?? [])],
    soloWorkflow: options.soloWorkflow ?? false,
    ...(options.alreadySeenNotes ? { alreadySeenNotes: options.alreadySeenNotes } : {}),
  };
}
