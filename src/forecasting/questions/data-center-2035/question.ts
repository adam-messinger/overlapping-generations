import {
  canonicalSha256Id,
  type ForecastQuestion,
  type Prediction,
} from 'forecast-workbench';

export const DATA_CENTER_2035_QUESTION_ID =
  'us-data-center-electricity-share-2035';
export const DATA_CENTER_2035_TARGET_ESTIMAND_ID =
  'estimand.forecast.us-data-center-site-electricity-share-calendar-2035';

const RESOLVER_IMPLEMENTATION = `
at 2038-12-31 cutoff, select the most recently published qualifying DOE, LBNL,
or EIA retrospective estimate of actual calendar-2035 full-site U.S.
data-center electricity consumption; prefer a published share, otherwise
divide by the matching latest EIA total U.S. consumption estimate; use an
interval midpoint; fall back to a materially equivalent IEA or congressional
retrospective; cancel rather than use a pre-2036 projection
`;

export const dataCenter2035Question: ForecastQuestion = {
  schemaVersion: 'forecast-workbench.question/v1',
  id: DATA_CENTER_2035_QUESTION_ID,
  version: '1.0.0',
  title: 'U.S. data-center share of electricity consumption in 2035',
  description:
    'What share of total U.S. electricity consumption in calendar 2035 will ' +
    'be consumed at data-center sites, including site infrastructure and ' +
    'behind-the-meter electricity?',
  decisionContext:
    'Inform generation, transmission, large-load financing, and ratepayer-protection decisions.',
  targetEstimandId: DATA_CENTER_2035_TARGET_ESTIMAND_ID,
  opensAt: '2026-07-23T00:00:00.000Z',
  closesAt: '2035-12-31T23:59:59.000Z',
  expectedResolutionAt: '2039-03-31T16:00:00.000Z',
  outcome: {
    kind: 'ordered-categorical',
    unit: 'fraction of total U.S. electricity consumption',
    bins: [
      { id: 'A', label: 'Below 10%', upper: 0.10 },
      { id: 'B', label: '10% to below 15%', lower: 0.10, upper: 0.15 },
      { id: 'C', label: '15% to below 20%', lower: 0.15, upper: 0.20 },
      { id: 'D', label: 'At least 20%', lower: 0.20 },
    ],
  },
  resolver: {
    id: 'doe-lbnl-eia-retrospective-data-center-share',
    version: '1.0.0',
    sourceId: 'doe.lbnl.eia.retrospective',
    description:
      'Apply the frozen hierarchy to a qualifying retrospective estimate of actual 2035 use.',
    implementationHash: canonicalSha256Id(RESOLVER_IMPLEMENTATION),
    queryDescription:
      'Latest qualifying retrospective published by 2038-12-31; explicit share ' +
      'preferred, otherwise full-site TWh divided by matching total U.S. TWh.',
    targetField: 'calendar-2035 full-site data-center electricity share',
    statistic: 'National calendar-year share',
    expectedPublicationAt: '2039-03-31T16:00:00.000Z',
    revisionRule: {
      kind: 'latest-at',
      cutoffAt: '2038-12-31T23:59:59.000Z',
    },
    fallback: {
      resolverId: 'iea-or-congressional-retrospective',
      rule:
        'Use the first materially equivalent IEA or congressionally commissioned ' +
        'national retrospective published by the cutoff.',
    },
    cancellationRule:
      'Cancel if no qualifying retrospective exists; never resolve from a pre-2036 projection.',
  },
  createdAt: '2026-07-23T13:00:00.000Z',
};

export const dataCenter2035Prior: Prediction = {
  kind: 'ordered-categorical',
  probabilities: { A: 0.12, B: 0.33, C: 0.33, D: 0.22 },
};

export const dataCenter2035PreModelForecast: Prediction = {
  kind: 'ordered-categorical',
  probabilities: { A: 0.20, B: 0.26, C: 0.29, D: 0.25 },
};

export const dataCenter2035FinalHumanForecast: Prediction = {
  kind: 'ordered-categorical',
  probabilities: { A: 0.18, B: 0.25, C: 0.29, D: 0.28 },
};
