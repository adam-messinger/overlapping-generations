import {
  canonicalSha256Id,
  type ForecastQuestion,
  type Prediction,
} from 'forecast-workbench';
import { usCovidWeeklyAdmissions } from '../../../simulations/semantic-contracts.js';

export const OUTBREAK_2026_QUESTION_ID = 'us-covid-admissions-2026-08-15';

const RESOLVER_IMPLEMENTATION = `
select USA row from cdc.socrata.vdzy-6i9v where weekendingdate=2026-08-15;
retrieve at 2026-09-30T16:00:00Z; map totalconfc19newadm to ordered bins;
fallback during the next seven days; cancel if absent by 2026-10-07
`;

export const outbreak2026Question: ForecastQuestion = {
  schemaVersion: 'forecast-workbench.question/v1',
  id: OUTBREAK_2026_QUESTION_ID,
  version: '1.0.0',
  title: 'U.S. COVID-19 hospital admissions for the week ending 2026-08-15',
  description:
    'How many new U.S. hospital admissions with laboratory-confirmed COVID-19 ' +
    'will CDC report for the seven-day period ending 2026-08-15?',
  decisionContext:
    'Test a short-horizon public-health forecast workflow and provide a calibrated ' +
    'view of a possible U.S. summer admission wave.',
  targetEstimandId: usCovidWeeklyAdmissions.id,
  opensAt: '2026-07-23T00:00:00.000Z',
  closesAt: '2026-08-15T00:00:00.000Z',
  expectedResolutionAt: '2026-09-30T16:00:00.000Z',
  outcome: {
    kind: 'ordered-categorical',
    unit: 'people/week',
    bins: [
      { id: 'A', label: 'Below 4,000', upper: 4_000 },
      { id: 'B', label: '4,000 to below 6,000', lower: 4_000, upper: 6_000 },
      { id: 'C', label: '6,000 to below 9,000', lower: 6_000, upper: 9_000 },
      { id: 'D', label: '9,000 to below 14,000', lower: 9_000, upper: 14_000 },
      { id: 'E', label: 'At least 14,000', lower: 14_000 },
    ],
  },
  resolver: {
    id: 'cdc-fixed-initial-us-covid-admissions',
    version: '1.0.0',
    sourceId: 'cdc.socrata.vdzy-6i9v',
    description:
      'Read the fixed-initial national COVID-19 admission row at the precommitted vintage.',
    implementationHash: canonicalSha256Id(RESOLVER_IMPLEMENTATION),
    queryDescription:
      'USA row with weekendingdate=2026-08-15, retrieved at 12:00 America/New_York ' +
      'on 2026-09-30.',
    targetField: 'totalconfc19newadm',
    statistic: 'National seven-day count',
    expectedPublicationAt: '2026-09-30T16:00:00.000Z',
    revisionRule: {
      kind: 'latest-at',
      cutoffAt: '2026-09-30T16:00:00.000Z',
    },
    fallback: {
      resolverId: 'cdc-archived-national-weekly-admissions',
      rule:
        'Use the first successful query through 2026-10-07; if the endpoint is retired, ' +
        'use the corresponding archived CDC national release nearest the cutoff.',
    },
    cancellationRule:
      'Cancel if CDC has not published the target week by 2026-10-07; do not infer it ' +
      'from another surveillance signal.',
  },
  createdAt: '2026-07-23T12:00:00.000Z',
};

export const outbreak2026Prior: Prediction = {
  kind: 'ordered-categorical',
  probabilities: {
    A: 0.20,
    B: 0.35,
    C: 0.25,
    D: 0.15,
    E: 0.05,
  },
};

export const outbreak2026FinalHumanForecast: Prediction = {
  kind: 'ordered-categorical',
  probabilities: {
    A: 0.91,
    B: 0.05,
    C: 0.025,
    D: 0.01,
    E: 0.005,
  },
};
