import {
  canonicalSha256Id,
  type ForecastQuestion,
  type Prediction,
} from 'forecast-workbench';

export const HORMUZ_2026_QUESTION_ID =
  'hormuz-portwatch-transit-recovery-december-2026';
export const HORMUZ_2026_TARGET_ESTIMAND_ID =
  'estimand.forecast.hormuz-portwatch-total-transit-calls-december-1-21-2026';

const RESOLVER_IMPLEMENTATION = `
after 2026-12-28, take the first complete IMF PortWatch daily chokepoint
release for portid=chokepoint6; calculate the unrounded arithmetic mean of
n_total for UTC dates 2026-12-01 through 2026-12-21 inclusive; yes if mean is
at least 62; use the IEA PortWatch-derived monitor if IMF permanently omits
dates; after 2027-02-28 use available days only when at least 17 of 21 exist,
otherwise cancel; ignore revisions first published after 2027-02-28
`;

export const hormuz2026Question: ForecastQuestion = {
  schemaVersion: 'forecast-workbench.question/v1',
  id: HORMUZ_2026_QUESTION_ID,
  version: '1.0.0',
  title: 'Strait of Hormuz transit recovery during December 1–21, 2026',
  description:
    'Will the arithmetic mean of IMF PortWatch daily n_total transit calls ' +
    'for the Strait of Hormuz be at least 62 per UTC day over December 1–21, 2026?',
  decisionContext:
    'Bridge physical reopening into energy, shipping, fertilizer, and macro-risk decisions.',
  targetEstimandId: HORMUZ_2026_TARGET_ESTIMAND_ID,
  opensAt: '2026-07-23T00:00:00.000Z',
  closesAt: '2026-12-21T23:59:00.000Z',
  expectedResolutionAt: '2026-12-29T12:00:00.000Z',
  outcome: {
    kind: 'binary',
    negative: { id: 'no', label: 'Mean below 62 calls/day' },
    positive: { id: 'yes', label: 'Mean at least 62 calls/day' },
  },
  resolver: {
    id: 'imf-portwatch-hormuz-daily-total-calls',
    version: '1.0.0',
    sourceId: 'imf.portwatch.daily-chokepoint',
    description:
      'Compute a fixed-window mean from the first complete post-December PortWatch vintage.',
    implementationHash: canonicalSha256Id(RESOLVER_IMPLEMENTATION),
    queryDescription:
      'portid=chokepoint6; n_total; UTC dates 2026-12-01 through 2026-12-21.',
    targetField: 'n_total',
    statistic: 'Unrounded arithmetic mean across the 21 fixed UTC days',
    expectedPublicationAt: '2026-12-29T12:00:00.000Z',
    revisionRule: {
      kind: 'latest-at',
      cutoffAt: '2027-02-28T23:59:59.000Z',
    },
    fallback: {
      resolverId: 'iea-middle-east-maritime-chokepoints-portwatch',
      rule:
        'Use the IEA PortWatch-derived series; after the cutoff, use available ' +
        'days only if at least 17 of 21 are present.',
    },
    cancellationRule:
      'Cancel if fewer than 17 target days are available from both named sources by 2027-02-28.',
  },
  createdAt: '2026-07-23T13:00:00.000Z',
};

export function hormuzBinaryPrediction(probabilityYes: number): Prediction {
  return {
    kind: 'binary',
    positiveOutcomeId: 'yes',
    probability: probabilityYes,
  };
}

export const hormuz2026Prior = hormuzBinaryPrediction(0.58);
export const hormuz2026FinalHumanForecast = hormuzBinaryPrediction(0.39);
