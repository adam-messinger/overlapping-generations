/**
 * The six coupled questions of the Demographics x AI 2036 ensemble, frozen as
 * workbench contracts.
 *
 * The wording is the panel preamble's, verbatim where it defines the outcome.
 * Two drafting defects found during the exercise are DISCLOSED in the
 * contracts, not repaired: repairing them now would make the sealed forecasts
 * answer a question the panel never saw.
 *   - CQ5's "(or rises by >= 25bp)" is a strict subset of "fails to fall by
 *     >= 50bp" and adds nothing.
 *   - CQ6's literal regime bands overlap and leave gaps; the panel scored them
 *     under a lexical-priority lock, which the CQ6 resolver applies.
 * CQ1's wage conjunct has no published resolving series. Its resolver probe
 * therefore FAILS, and the workbench refuses to seal forecasts against it.
 */
import {
  canonicalSha256Id,
  type ForecastQuestion,
  type ResolverProbe,
} from 'forecast-workbench';

export const DEMOGRAPHICS_AI_2036_CREATED_AT = '2026-11-04T00:00:00.000Z';
const OPENS_AT = DEMOGRAPHICS_AI_2036_CREATED_AT;
const CLOSES_AT = '2036-12-31T23:59:59.000Z';
const RESOLUTION_CUTOFF = '2038-12-31T23:59:59.000Z';

export type CoupledQuestionKey = 'cq1' | 'cq2' | 'cq3' | 'cq4' | 'cq5' | 'cq6';

interface QuestionSpec {
  key: CoupledQuestionKey;
  question: ForecastQuestion;
  probe: ResolverProbe;
}

function binary() {
  return {
    kind: 'binary' as const,
    negative: { id: 'no', label: 'No' },
    positive: { id: 'yes', label: 'Yes' },
  };
}

function resolver(options: {
  id: string;
  sourceId: string;
  description: string;
  implementation: string;
  queryDescription: string;
  targetField: string;
  statistic: string;
  expectedPublicationAt: string;
  cancellationRule: string;
  fallback?: { resolverId: string; rule: string };
}) {
  return {
    id: options.id,
    version: '1.0.0',
    sourceId: options.sourceId,
    description: options.description,
    implementationHash: canonicalSha256Id(options.implementation.trim()),
    queryDescription: options.queryDescription,
    targetField: options.targetField,
    statistic: options.statistic,
    expectedPublicationAt: options.expectedPublicationAt,
    revisionRule: { kind: 'latest-at' as const, cutoffAt: RESOLUTION_CUTOFF },
    ...(options.fallback ? { fallback: options.fallback } : {}),
    cancellationRule: options.cancellationRule,
  };
}

function question(
  key: CoupledQuestionKey,
  fields: Pick<ForecastQuestion, 'title' | 'description' | 'outcome' | 'resolver'>,
): ForecastQuestion {
  return {
    schemaVersion: 'forecast-workbench.question/v1',
    id: `demographics-ai-2036-${key}`,
    version: '1.0.0',
    decisionContext:
      'Coupled Demographic Change x AI forecast for OECD-38 + China, constant 2025 USD PPP; ' +
      'inform the asset/sector regime matrix and falsification signposts.',
    targetEstimandId: `estimand.forecast.demographics-ai-2036.${key}`,
    opensAt: OPENS_AT,
    closesAt: CLOSES_AT,
    expectedResolutionAt: '2038-06-30T00:00:00.000Z',
    createdAt: DEMOGRAPHICS_AI_2036_CREATED_AT,
    ...fields,
  };
}

export const coupledQuestions: readonly QuestionSpec[] = [
  {
    key: 'cq1',
    question: question('cq1', {
      title: 'OECD-38 low unemployment AND physical/care wages outrun cognitive services',
      description:
        'Will OECD-38 harmonized unemployment average <= 5.5% over 2032-2036 AND cumulative ' +
        'real median hourly wage growth in physical construction + health/social care ' +
        '(ISIC F + Q) exceed that of cognitive/information services (ISIC J + K + M) by ' +
        '>= +10.0 percentage points between 2025 and 2036? Both conjuncts required.',
      outcome: binary(),
      resolver: resolver({
        id: 'oecd-harmonised-unemployment-and-sectoral-median-wages',
        sourceId: 'oecd.harmonised-unemployment+sectoral-median-hourly-wages',
        description:
          'Conjunct A from OECD harmonised unemployment rates; conjunct B from real median ' +
          'hourly wages by ISIC section for 2025 and 2036.',
        implementation: `
          A: mean of OECD-38 harmonised unemployment rate, annual 2032-2036, <= 5.5.
          B: (real median hourly wage F+Q, 2036/2025 - 1) - (same for J+K+M) >= 0.10.
          Resolve yes only if A and B.`,
        queryDescription:
          'OECD harmonised unemployment (all 38); real median hourly wages by ISIC Rev.4 section.',
        targetField: 'conjunction of unemployment average and sectoral median wage gap',
        statistic: 'Boolean conjunction',
        expectedPublicationAt: '2038-06-30T00:00:00.000Z',
        cancellationRule:
          'Cancel if no published series reports real median hourly wages by ISIC section for ' +
          'the OECD-38 at both 2025 and 2036.',
      }),
    }),
    probe: {
      ok: false,
      schemaRecognized: false,
      message:
        'Conjunct B has no published resolving series: Eurostat SES (the only cross-country ' +
        'median-wage-by-ISIC source) is quadrennial, EU/EFTA-only, and its 2034 reference year ' +
        'is the last vintage before the cutoff, so no 2036 value exists; OECD.Stat carries ' +
        'average annual wages, not sectoral real medians. Conjunct A is resolvable.',
    },
  },
  {
    key: 'cq2',
    question: question('cq2', {
      title: 'OECD-38 core inflation >= 2.50% while China CPI < 1.50% (2027-2036)',
      description:
        'Will GDP-weighted OECD-38 core CPI/PCE inflation average >= 2.50%/yr over 2027-2036 ' +
        'WHILE China headline CPI averages < 1.50%/yr over the same 10-year window? Both ' +
        'conjuncts required. The weights are GDP at PPP across all 38 members (Turkiye ' +
        'carries ~4-5%), as the panel priced it.',
      outcome: binary(),
      resolver: resolver({
        id: 'oecd-core-cpi-ppp-weighted-and-nbs-headline-cpi',
        sourceId: 'oecd.prices.cpi-ex-food-energy+nbs.cpi',
        description:
          'Conjunct A from OECD CPI all items less food and energy, all 38 members, ' +
          'PPP-GDP-weighted; conjunct B from NBS headline CPI.',
        implementation: `
          A: mean over 2027-2036 of the PPP-GDP-weighted average of OECD-38 annual core
             inflation (CPI less food and energy; US core PCE where CPI-core is absent),
             weights = IMF WEO PPP GDP shares of each year, >= 2.50.
          B: mean over 2027-2036 of NBS annual headline CPI inflation < 1.50.
          Resolve yes only if A and B.`,
        queryDescription: 'OECD Prices database core CPI by member; NBS annual CPI; IMF WEO PPP GDP.',
        targetField: 'conjunction of two ten-year inflation averages',
        statistic: 'Boolean conjunction',
        expectedPublicationAt: '2037-04-30T00:00:00.000Z',
        cancellationRule: 'Cancel if fewer than 36 OECD members publish core CPI for the window.',
      }),
    }),
    probe: {
      ok: true,
      schemaRecognized: true,
      message:
        'Both series are published annually. Composition note: the all-38 PPP construction ' +
        'carries Turkiye, Mexico, Poland, Chile, Colombia and Costa Rica, worth +0.25 to ' +
        '+0.81 pp against the 2.50% threshold.',
    },
  },
  {
    key: 'cq3',
    question: question('cq3', {
      title: 'OECD-38 + China real GDP growth, 2032-2036',
      description:
        'Annualized PPP-weighted real GDP growth across combined (OECD-38 + China) over ' +
        'Jan 1 2032 - Dec 31 2036, constant 2025 USD PPP.',
      outcome: { kind: 'continuous', unit: '%/yr' },
      resolver: resolver({
        id: 'oecd-nbs-real-gdp-ppp-weighted-growth',
        sourceId: 'oecd.national-accounts+nbs.gdp+imf.weo-ppp',
        description:
          'Annualized growth of the summed real GDP of the OECD-38 and China, in constant ' +
          '2025 USD PPP, from end-2031 to end-2036 annual levels.',
        implementation: `
          level(y) = sum over OECD-38 + China of real GDP(y) in constant 2025 USD PPP;
          value = 100 * ((level(2036) / level(2031))^(1/5) - 1).`,
        queryDescription: 'OECD annual real GDP by member; NBS real GDP index; IMF WEO 2025 PPP.',
        targetField: 'annualized growth of combined real GDP',
        statistic: 'Five-year compound annual growth rate',
        expectedPublicationAt: '2037-10-31T00:00:00.000Z',
        cancellationRule: 'Cancel if China NBS or more than two OECD members publish no 2036 real GDP.',
      }),
    }),
    probe: { ok: true, schemaRecognized: true, message: 'Annual national accounts are published for all 39 economies.' },
  },
  {
    key: 'cq4',
    question: question('cq4', {
      title: 'G7 10-year sovereign real yield, 2032-2036 average',
      description:
        'GDP-weighted G7 10-year sovereign REAL yield (10y nominal benchmark minus 10y ' +
        'inflation swap / TIPS breakeven) averaged over Jan 1 2032 - Dec 31 2036.',
      outcome: { kind: 'continuous', unit: '%' },
      resolver: resolver({
        id: 'g7-10y-nominal-less-inflation-compensation',
        sourceId: 'central-bank.10y-benchmark+10y-inflation-swap-or-breakeven',
        description:
          'Monthly 10y nominal benchmark yield minus 10y inflation compensation per G7 ' +
          'member, GDP-weighted, averaged over the 60 months.',
        implementation: `
          real(c, m) = 10y nominal benchmark(c, m) - 10y inflation compensation(c, m), where
          compensation = 10y zero-coupon inflation swap, else 10y linker breakeven;
          value = mean over 2032-01..2036-12 of the GDP-weighted average of real(c, m).`,
        queryDescription: 'G7 central-bank benchmark yields; inflation swap or breakeven series.',
        targetField: 'five-year average GDP-weighted G7 10y real yield',
        statistic: 'Mean of monthly values',
        expectedPublicationAt: '2037-01-31T00:00:00.000Z',
        cancellationRule: 'Cancel if inflation compensation is unavailable for two or more G7 members.',
        fallback: {
          resolverId: 'g7-10y-real-yield-ex-unavailable-members',
          rule: 'Drop a member lacking both swap and breakeven series and renormalize weights.',
        },
      }),
    }),
    probe: {
      ok: true,
      schemaRecognized: true,
      message:
        'Swap or breakeven series exist for all G7 members; Canada stopped issuing real-return ' +
        'bonds in 2022, so its leg rests on inflation swaps or the fallback.',
    },
  },
  {
    key: 'cq5',
    question: question('cq5', {
      title: 'Elevated rates volatility AND an equity crash without a bond rally (2027-2036)',
      description:
        'Between Jan 1 2027 and Dec 31 2036, will the ICE BofA MOVE Index average >= 105 AND ' +
        'at least one coupled macro-financial shock occur in which the MSCI World Index falls ' +
        '>= 25% peak-to-trough while G7 GDP-weighted 10y nominal sovereign yields FAIL to fall ' +
        'by >= 50 bps (or rise by >= 25 bps) during the equity drawdown window? Both ' +
        'conjuncts required. Disclosed defect: the parenthetical is a strict subset of ' +
        '"fail to fall by >= 50 bps" and does not change the outcome.',
      outcome: binary(),
      resolver: resolver({
        id: 'move-average-and-msci-world-drawdown-without-bond-rally',
        sourceId: 'ice.move+msci.world+g7-10y-benchmarks',
        description: 'MOVE daily average over the window; MSCI World drawdowns; G7 yield change.',
        implementation: `
          A: mean of daily ICE BofA MOVE closes, 2027-01-01..2036-12-31, >= 105.
          B: exists a peak-to-trough MSCI World (USD, price) drawdown >= 25% whose window
             has a GDP-weighted G7 10y nominal yield change > -50 bp (trough minus peak date).
          Resolve yes only if A and B.`,
        queryDescription: 'ICE BofA MOVE daily; MSCI World daily; G7 10y benchmark yields daily.',
        targetField: 'conjunction of volatility average and a drawdown event',
        statistic: 'Boolean conjunction',
        expectedPublicationAt: '2037-01-31T00:00:00.000Z',
        cancellationRule: 'Cancel if the MOVE index is discontinued with no published successor.',
      }),
    }),
    probe: { ok: true, schemaRecognized: true, message: 'MOVE, MSCI World and G7 benchmark yields are published daily.' },
  },
  {
    key: 'cq6',
    question: question('cq6', {
      title: 'End-state regime at Dec 31 2036 (lexical-priority lock)',
      description:
        'Which regime holds over 2032-2036, resolved by LEXICAL PRIORITY (first match wins) on ' +
        'the CQ3 growth measure and GDP-weighted OECD-38 core inflation over 2032-2036: ' +
        'A if growth >= 2.6%/yr; else C if core >= 2.7%/yr and growth < 2.0%/yr; else D if ' +
        'growth < 1.7%/yr and core < 2.0%/yr; else B (residual). The literal regime bands ' +
        'overlap and leave gaps; this lock is how the panel scored them.',
      outcome: {
        kind: 'categorical',
        outcomes: [
          { id: 'A', label: 'AI-Solvent Broad Productivity Renaissance' },
          { id: 'B', label: 'Bifurcated Barbell Equilibrium (residual)' },
          { id: 'C', label: 'Fiscal Dominance & Stagflationary Bottleneck Squeeze' },
          { id: 'D', label: 'Capital-Concentrated Secular Stagnation' },
        ],
      },
      resolver: resolver({
        id: 'cq6-lexical-priority-lock',
        sourceId: 'derived.cq3-growth+oecd-38-core-2032-2036',
        description: 'Apply the lexical-priority lock to the resolved CQ3 value and OECD-38 core.',
        implementation: `
          g = resolved CQ3 value; core = mean 2032-2036 of the CQ2 conjunct-A construction;
          A if g >= 2.6; else C if core >= 2.7 and g < 2.0; else D if g < 1.7 and core < 2.0;
          else B.`,
        queryDescription: 'Resolved CQ3 value; OECD-38 PPP-weighted core CPI 2032-2036.',
        targetField: 'regime label',
        statistic: 'Lexical classification',
        expectedPublicationAt: '2037-10-31T00:00:00.000Z',
        cancellationRule: 'Cancel if CQ3 cancels.',
      }),
    }),
    probe: {
      ok: true,
      schemaRecognized: true,
      message:
        'Derived from two resolvable series. Disclosed: about 34 pp of panel mass sits in ' +
        'cells the literal definitions do not cover, so B is partly a drafting residual.',
    },
  },
];
