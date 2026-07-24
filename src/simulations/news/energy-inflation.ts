import { assertFiniteDeep, validateNumber } from 'tsimulation';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const halfLifeAdjustment = (halfLifeMonths: number): number =>
  1 - Math.pow(0.5, 1 / halfLifeMonths);

export interface EnergyInflationScenario {
  id: string;
  label: string;
  importEnergyPricePath: readonly number[];
  startingHeadlineInflationPct: number;
  startingCoreInflationPct: number;
  startingExpectedInflationPct: number;
  startingPolicyRatePct: number;
  startingOutputGapPct: number;
  inflationTargetPct: number;
  neutralPolicyRatePct: number;
  energyCpiWeight: number;
  directConsumerPassThrough: number;
  directAdjustmentHalfLifeMonths: number;
  indirectCorePassThrough: number;
  indirectAdjustmentHalfLifeMonths: number;
  largeShockNonlinearity: number;
  fiscalShieldingShare: number;
  exchangeRateAmplification: number;
  inflationAttention: number;
  wageFeedback: number;
  energyOutputSensitivity: number;
  policyOutputSensitivity: number;
  policyInflationResponse: number;
  policyOutputResponse: number;
  policySmoothing: number;
  supplyShockLookThrough: number;
}

/**
 * Network revision input. The Weber bridge supplies a target price-level gap
 * for the core subindex plus an already weighted contribution from affected
 * non-core/non-energy prices to the total CPI price level.
 */
export interface EnergyInflationNetworkScenario
  extends EnergyInflationScenario {
  coreCpiWeight: number;
  networkCorePriceGapPathPct: readonly number[];
  networkOtherCpiContributionPathPct: readonly number[];
}

export interface EnergyInflationMonth {
  month: number;
  importEnergyPriceMultiple: number;
  consumerEnergyPriceGapPct: number;
  corePriceGapPct: number;
  headlineInflationPct: number;
  coreInflationPct: number;
  expectedInflationPct: number;
  policyRatePct: number;
  outputGapPct: number;
}

export interface EnergyInflationNetworkMonth extends EnergyInflationMonth {
  networkCoreTargetPriceGapPct: number;
  networkOtherCpiContributionPct: number;
}

export interface EnergyInflationResult {
  scenario: EnergyInflationScenario;
  revision: 'direct-only-v1' | 'propagation-v2';
  months: EnergyInflationMonth[];
  peakHeadlineInflationPct: number;
  peakCoreInflationPct: number;
  peakPolicyRatePct: number;
  troughOutputGapPct: number;
  monthsHeadlineAboveTarget: number;
  monthsCoreAboveTarget: number;
}

export interface EnergyInflationNetworkResult {
  scenario: EnergyInflationNetworkScenario;
  revision: 'weber-network-v3';
  months: EnergyInflationNetworkMonth[];
  peakHeadlineInflationPct: number;
  peakCoreInflationPct: number;
  peakPolicyRatePct: number;
  troughOutputGapPct: number;
  monthsHeadlineAboveTarget: number;
  monthsCoreAboveTarget: number;
}

function validateScenario(scenario: EnergyInflationScenario): void {
  assertFiniteDeep(scenario, 'energy-inflation scenario');
  const errors = [
    ...validateNumber(scenario.importEnergyPricePath.length, 'importEnergyPricePath.length', {
      min: 12,
    }),
    ...validateNumber(scenario.energyCpiWeight, 'energyCpiWeight', { min: 0, max: 1 }),
    ...validateNumber(scenario.directConsumerPassThrough, 'directConsumerPassThrough', {
      min: 0,
      max: 1.5,
    }),
    ...validateNumber(
      scenario.directAdjustmentHalfLifeMonths,
      'directAdjustmentHalfLifeMonths',
      { min: 0, exclusiveMin: true },
    ),
    ...validateNumber(scenario.indirectCorePassThrough, 'indirectCorePassThrough', {
      min: 0,
      max: 1,
    }),
    ...validateNumber(
      scenario.indirectAdjustmentHalfLifeMonths,
      'indirectAdjustmentHalfLifeMonths',
      { min: 0, exclusiveMin: true },
    ),
    ...validateNumber(scenario.fiscalShieldingShare, 'fiscalShieldingShare', {
      min: 0,
      max: 1,
    }),
    ...validateNumber(scenario.policySmoothing, 'policySmoothing', { min: 0, max: 1 }),
    ...validateNumber(scenario.supplyShockLookThrough, 'supplyShockLookThrough', {
      min: 0,
      max: 1,
    }),
  ];
  scenario.importEnergyPricePath.forEach((value, index) => {
    errors.push(
      ...validateNumber(value, `importEnergyPricePath[${index}]`, {
        min: 0,
        exclusiveMin: true,
      }),
    );
  });
  if (errors.length > 0) {
    throw new Error(`Invalid energy-inflation scenario:\n  ${errors.join('\n  ')}`);
  }
}

function validateNetworkScenario(
  scenario: EnergyInflationNetworkScenario,
): void {
  validateScenario(scenario);
  const errors = [
    ...validateNumber(scenario.coreCpiWeight, 'coreCpiWeight', {
      min: 0,
      max: 1,
      exclusiveMin: true,
    }),
  ];
  if (scenario.energyCpiWeight + scenario.coreCpiWeight > 1) {
    errors.push('energyCpiWeight + coreCpiWeight must be at most 1');
  }
  for (const [name, path] of [
    ['networkCorePriceGapPathPct', scenario.networkCorePriceGapPathPct],
    [
      'networkOtherCpiContributionPathPct',
      scenario.networkOtherCpiContributionPathPct,
    ],
  ] as const) {
    if (path.length !== scenario.importEnergyPricePath.length) {
      errors.push(`${name} must have the same length as importEnergyPricePath`);
    }
    path.forEach((value, index) => {
      errors.push(
        ...validateNumber(value, `${name}[${index}]`, {
          min: -99,
          max: 100,
        }),
      );
    });
  }
  if (errors.length > 0) {
    throw new Error(
      `Invalid network energy-inflation scenario:\n  ${errors.join('\n  ')}`,
    );
  }
}

function summarize(
  scenario: EnergyInflationScenario,
  revision: EnergyInflationResult['revision'],
  months: EnergyInflationMonth[],
): EnergyInflationResult {
  const result: EnergyInflationResult = {
    scenario,
    revision,
    months,
    peakHeadlineInflationPct: Math.max(...months.map((row) => row.headlineInflationPct)),
    peakCoreInflationPct: Math.max(...months.map((row) => row.coreInflationPct)),
    peakPolicyRatePct: Math.max(...months.map((row) => row.policyRatePct)),
    troughOutputGapPct: Math.min(...months.map((row) => row.outputGapPct)),
    monthsHeadlineAboveTarget: months.filter(
      (row) => row.headlineInflationPct > scenario.inflationTargetPct,
    ).length,
    monthsCoreAboveTarget: months.filter(
      (row) => row.coreInflationPct > scenario.inflationTargetPct,
    ).length,
  };
  assertFiniteDeep(result, `energy-inflation ${revision} result`);
  return result;
}

function summarizeNetwork(
  scenario: EnergyInflationNetworkScenario,
  months: EnergyInflationNetworkMonth[],
): EnergyInflationNetworkResult {
  const result: EnergyInflationNetworkResult = {
    scenario,
    revision: 'weber-network-v3',
    months,
    peakHeadlineInflationPct: Math.max(
      ...months.map((row) => row.headlineInflationPct),
    ),
    peakCoreInflationPct: Math.max(
      ...months.map((row) => row.coreInflationPct),
    ),
    peakPolicyRatePct: Math.max(
      ...months.map((row) => row.policyRatePct),
    ),
    troughOutputGapPct: Math.min(...months.map((row) => row.outputGapPct)),
    monthsHeadlineAboveTarget: months.filter(
      (row) => row.headlineInflationPct > scenario.inflationTargetPct,
    ).length,
    monthsCoreAboveTarget: months.filter(
      (row) => row.coreInflationPct > scenario.inflationTargetPct,
    ).length,
  };
  assertFiniteDeep(result, 'energy-inflation weber-network-v3 result');
  return result;
}

/**
 * Initial toy model. Import-energy prices pass mechanically into the energy
 * component of CPI, while the policy rule reacts to headline inflation.
 *
 * This version is intentionally retained because its failure is informative:
 * it has no core-price propagation but still makes the central bank chase a
 * temporary relative-price shock.
 */
export function simulateEnergyInflationV1(
  scenario: EnergyInflationScenario,
): EnergyInflationResult {
  validateScenario(scenario);

  let consumerEnergyGapLog = 0;
  let policyRatePct = scenario.startingPolicyRatePct;
  const cpiGapHistory = Array<number>(12).fill(0);
  const adjustment = halfLifeAdjustment(
    scenario.directAdjustmentHalfLifeMonths,
  );
  const months: EnergyInflationMonth[] = [];

  scenario.importEnergyPricePath.forEach((importEnergyPriceMultiple, month) => {
    const targetConsumerEnergyGapLog = Math.log(
      1 +
        scenario.directConsumerPassThrough *
          (importEnergyPriceMultiple - 1) *
          scenario.exchangeRateAmplification,
    );
    consumerEnergyGapLog +=
      adjustment * (targetConsumerEnergyGapLog - consumerEnergyGapLog);

    const totalCpiGapLog = scenario.energyCpiWeight * consumerEnergyGapLog;
    const yearAgoCpiGapLog = cpiGapHistory.shift() ?? 0;
    cpiGapHistory.push(totalCpiGapLog);
    const headlineInflationPct =
      scenario.startingHeadlineInflationPct +
      100 * (totalCpiGapLog - yearAgoCpiGapLog);

    const outputGapPct =
      scenario.startingOutputGapPct -
      scenario.energyOutputSensitivity *
        100 *
        Math.log(importEnergyPriceMultiple) -
      scenario.policyOutputSensitivity *
        Math.max(0, policyRatePct - scenario.neutralPolicyRatePct);
    const desiredPolicyRatePct = Math.max(
      0,
      scenario.neutralPolicyRatePct +
        scenario.policyInflationResponse *
          (headlineInflationPct - scenario.inflationTargetPct) +
        scenario.policyOutputResponse * outputGapPct,
    );
    policyRatePct =
      scenario.policySmoothing * policyRatePct +
      (1 - scenario.policySmoothing) * desiredPolicyRatePct;

    months.push({
      month,
      importEnergyPriceMultiple,
      consumerEnergyPriceGapPct: 100 * (Math.exp(consumerEnergyGapLog) - 1),
      corePriceGapPct: 0,
      headlineInflationPct,
      coreInflationPct: scenario.startingCoreInflationPct,
      expectedInflationPct: scenario.startingExpectedInflationPct,
      policyRatePct,
      outputGapPct,
    });
  });

  return summarize(scenario, 'direct-only-v1', months);
}

/**
 * Revised model. It treats the energy shock as a price-level adjustment,
 * allows slower nonlinear propagation into core prices, makes propagation
 * conditional on the macro backdrop, and lets policy look through the
 * transitory headline component.
 */
export function simulateEnergyInflationV2(
  scenario: EnergyInflationScenario,
): EnergyInflationResult {
  validateScenario(scenario);

  let consumerEnergyGapLog = 0;
  let coreGapLog = 0;
  let expectedInflationPct = scenario.startingExpectedInflationPct;
  let policyRatePct = scenario.startingPolicyRatePct;
  const cpiGapHistory = Array<number>(12).fill(0);
  const coreGapHistory = Array<number>(12).fill(0);
  const directAdjustment = halfLifeAdjustment(
    scenario.directAdjustmentHalfLifeMonths,
  );
  const indirectAdjustment = halfLifeAdjustment(
    scenario.indirectAdjustmentHalfLifeMonths,
  );
  const months: EnergyInflationMonth[] = [];

  scenario.importEnergyPricePath.forEach((importEnergyPriceMultiple, month) => {
    const shieldedImportShock =
      (importEnergyPriceMultiple - 1) *
      (1 - scenario.fiscalShieldingShare) *
      scenario.exchangeRateAmplification;
    const targetConsumerEnergyGapLog = Math.log(
      Math.max(
        1e-9,
        1 + scenario.directConsumerPassThrough * shieldedImportShock,
      ),
    );
    consumerEnergyGapLog +=
      directAdjustment *
      (targetConsumerEnergyGapLog - consumerEnergyGapLog);

    const logImportShock = Math.max(0, Math.log(importEnergyPriceMultiple));
    const nonlinearLogShock =
      logImportShock *
      (
        1 +
        scenario.largeShockNonlinearity *
          Math.max(0, logImportShock - Math.log(1.2))
      );
    const provisionalOutputGapPct =
      scenario.startingOutputGapPct -
      scenario.energyOutputSensitivity *
        100 *
        Math.log(importEnergyPriceMultiple) -
      scenario.policyOutputSensitivity *
        Math.max(0, policyRatePct - scenario.neutralPolicyRatePct);
    const macroPropagation = Math.max(
      0.25,
      1 + 0.15 * provisionalOutputGapPct,
    );
    const wageTargetGapLog =
      scenario.wageFeedback *
      Math.max(0, expectedInflationPct - scenario.inflationTargetPct) /
      100;
    const targetCoreGapLog =
      scenario.indirectCorePassThrough *
        nonlinearLogShock *
        (1 - scenario.fiscalShieldingShare) *
        scenario.inflationAttention *
        macroPropagation +
      wageTargetGapLog;
    coreGapLog += indirectAdjustment * (targetCoreGapLog - coreGapLog);

    const totalCpiGapLog =
      scenario.energyCpiWeight * consumerEnergyGapLog +
      (1 - scenario.energyCpiWeight) * coreGapLog;
    const yearAgoCpiGapLog = cpiGapHistory.shift() ?? 0;
    cpiGapHistory.push(totalCpiGapLog);
    const yearAgoCoreGapLog = coreGapHistory.shift() ?? 0;
    coreGapHistory.push(coreGapLog);

    const headlineInflationPct =
      scenario.startingHeadlineInflationPct +
      100 * (totalCpiGapLog - yearAgoCpiGapLog);
    const coreInflationPct =
      scenario.startingCoreInflationPct +
      100 * (coreGapLog - yearAgoCoreGapLog);
    expectedInflationPct =
      0.8 * expectedInflationPct +
      0.2 * (0.65 * coreInflationPct + 0.35 * headlineInflationPct);

    const relevantInflationGapPct =
      coreInflationPct -
      scenario.inflationTargetPct +
      (1 - scenario.supplyShockLookThrough) *
        (headlineInflationPct - coreInflationPct);
    const desiredPolicyRatePct = Math.max(
      0,
      scenario.neutralPolicyRatePct +
        scenario.policyInflationResponse * relevantInflationGapPct +
        scenario.policyOutputResponse * provisionalOutputGapPct,
    );
    policyRatePct =
      scenario.policySmoothing * policyRatePct +
      (1 - scenario.policySmoothing) * desiredPolicyRatePct;

    months.push({
      month,
      importEnergyPriceMultiple,
      consumerEnergyPriceGapPct: 100 * (Math.exp(consumerEnergyGapLog) - 1),
      corePriceGapPct: 100 * (Math.exp(coreGapLog) - 1),
      headlineInflationPct,
      coreInflationPct,
      expectedInflationPct,
      policyRatePct,
      outputGapPct: provisionalOutputGapPct,
    });
  });

  return summarize(scenario, 'propagation-v2', months);
}

/**
 * Network revision. Direct household energy still adjusts as a price-level
 * shock, but indirect propagation is supplied by an upstream Weber
 * total-requirements calculation instead of the scalar
 * `indirectCorePassThrough` shortcut.
 */
export function simulateEnergyInflationV3(
  scenario: EnergyInflationNetworkScenario,
): EnergyInflationNetworkResult {
  validateNetworkScenario(scenario);

  let consumerEnergyGapLog = 0;
  let coreGapLog = 0;
  let otherCpiContributionLog = 0;
  let expectedInflationPct = scenario.startingExpectedInflationPct;
  let policyRatePct = scenario.startingPolicyRatePct;
  const cpiGapHistory = Array<number>(12).fill(0);
  const coreGapHistory = Array<number>(12).fill(0);
  const directAdjustment = halfLifeAdjustment(
    scenario.directAdjustmentHalfLifeMonths,
  );
  const indirectAdjustment = halfLifeAdjustment(
    scenario.indirectAdjustmentHalfLifeMonths,
  );
  const months: EnergyInflationNetworkMonth[] = [];

  scenario.importEnergyPricePath.forEach((importEnergyPriceMultiple, month) => {
    const shieldedImportShock =
      (importEnergyPriceMultiple - 1) *
      (1 - scenario.fiscalShieldingShare) *
      scenario.exchangeRateAmplification;
    const targetConsumerEnergyGapLog = Math.log(
      Math.max(
        1e-9,
        1 + scenario.directConsumerPassThrough * shieldedImportShock,
      ),
    );
    consumerEnergyGapLog +=
      directAdjustment *
      (targetConsumerEnergyGapLog - consumerEnergyGapLog);

    const provisionalOutputGapPct =
      scenario.startingOutputGapPct -
      scenario.energyOutputSensitivity *
        100 *
        Math.log(importEnergyPriceMultiple) -
      scenario.policyOutputSensitivity *
        Math.max(0, policyRatePct - scenario.neutralPolicyRatePct);
    const macroPropagation = Math.max(
      0.25,
      1 + 0.15 * provisionalOutputGapPct,
    );
    const propagationScale =
      (1 - scenario.fiscalShieldingShare) *
      scenario.exchangeRateAmplification *
      scenario.inflationAttention *
      macroPropagation;
    const networkCoreTargetPriceGapPct =
      (scenario.networkCorePriceGapPathPct[month] ?? 0) *
      propagationScale;
    const targetOtherCpiContributionPct =
      (scenario.networkOtherCpiContributionPathPct[month] ?? 0) *
      propagationScale;
    const wageTargetGapLog =
      scenario.wageFeedback *
      Math.max(0, expectedInflationPct - scenario.inflationTargetPct) /
      100;
    const targetCoreGapLog =
      Math.log(
        Math.max(1e-9, 1 + networkCoreTargetPriceGapPct / 100),
      ) + wageTargetGapLog;
    const targetOtherCpiContributionLog = Math.log(
      Math.max(1e-9, 1 + targetOtherCpiContributionPct / 100),
    );
    coreGapLog += indirectAdjustment * (targetCoreGapLog - coreGapLog);
    otherCpiContributionLog +=
      indirectAdjustment *
      (targetOtherCpiContributionLog - otherCpiContributionLog);

    const totalCpiGapLog =
      scenario.energyCpiWeight * consumerEnergyGapLog +
      scenario.coreCpiWeight * coreGapLog +
      otherCpiContributionLog;
    const yearAgoCpiGapLog = cpiGapHistory.shift() ?? 0;
    cpiGapHistory.push(totalCpiGapLog);
    const yearAgoCoreGapLog = coreGapHistory.shift() ?? 0;
    coreGapHistory.push(coreGapLog);

    const headlineInflationPct =
      scenario.startingHeadlineInflationPct +
      100 * (totalCpiGapLog - yearAgoCpiGapLog);
    const coreInflationPct =
      scenario.startingCoreInflationPct +
      100 * (coreGapLog - yearAgoCoreGapLog);
    expectedInflationPct =
      0.8 * expectedInflationPct +
      0.2 * (0.65 * coreInflationPct + 0.35 * headlineInflationPct);

    const relevantInflationGapPct =
      coreInflationPct -
      scenario.inflationTargetPct +
      (1 - scenario.supplyShockLookThrough) *
        (headlineInflationPct - coreInflationPct);
    const desiredPolicyRatePct = Math.max(
      0,
      scenario.neutralPolicyRatePct +
        scenario.policyInflationResponse * relevantInflationGapPct +
        scenario.policyOutputResponse * provisionalOutputGapPct,
    );
    policyRatePct =
      scenario.policySmoothing * policyRatePct +
      (1 - scenario.policySmoothing) * desiredPolicyRatePct;

    months.push({
      month,
      importEnergyPriceMultiple,
      consumerEnergyPriceGapPct: 100 * (Math.exp(consumerEnergyGapLog) - 1),
      corePriceGapPct: 100 * (Math.exp(coreGapLog) - 1),
      networkCoreTargetPriceGapPct,
      networkOtherCpiContributionPct:
        100 * (Math.exp(otherCpiContributionLog) - 1),
      headlineInflationPct,
      coreInflationPct,
      expectedInflationPct,
      policyRatePct,
      outputGapPct: provisionalOutputGapPct,
    });
  });

  return summarizeNetwork(scenario, months);
}

export function makeEnergyPricePath(options: {
  months: number;
  peakMultiple: number;
  monthsAtPeak: number;
  rampMonths?: number;
  decayHalfLifeMonths: number;
}): number[] {
  const rampMonths = options.rampMonths ?? 3;
  return Array.from({ length: options.months }, (_, month) => {
    if (month < rampMonths) {
      return 1 +
        (options.peakMultiple - 1) *
          clamp((month + 1) / rampMonths, 0, 1);
    }
    if (month < options.monthsAtPeak) return options.peakMultiple;
    return 1 +
      (options.peakMultiple - 1) *
        Math.pow(
          0.5,
          (month - options.monthsAtPeak + 1) /
            options.decayHalfLifeMonths,
        );
  });
}

const sharedPolicyMechanism = {
  inflationTargetPct: 2,
  energyCpiWeight: 0.10,
  directConsumerPassThrough: 0.75,
  directAdjustmentHalfLifeMonths: 2,
  indirectCorePassThrough: 0.025,
  indirectAdjustmentHalfLifeMonths: 5,
  largeShockNonlinearity: 0.4,
  wageFeedback: 0.03,
  energyOutputSensitivity: 0.01,
  policyOutputSensitivity: 0.12,
  policyInflationResponse: 0.5,
  policyOutputResponse: 0.1,
  policySmoothing: 0.75,
} as const;

export const energyInflationScenarios = {
  'euro-area-2022-backcast': {
    ...sharedPolicyMechanism,
    id: 'euro-area-2022-backcast',
    label: 'Euro-area 2022 energy shock reconstruction',
    importEnergyPricePath: makeEnergyPricePath({
      months: 36,
      peakMultiple: 1.8,
      monthsAtPeak: 10,
      decayHalfLifeMonths: 10,
    }),
    startingHeadlineInflationPct: 5.1,
    startingCoreInflationPct: 2.7,
    startingExpectedInflationPct: 2.7,
    startingPolicyRatePct: -0.5,
    startingOutputGapPct: 1.5,
    neutralPolicyRatePct: 1,
    fiscalShieldingShare: 0.25,
    exchangeRateAmplification: 1.1,
    inflationAttention: 1.25,
    supplyShockLookThrough: 0.35,
  },
  'euro-area-2026-current': {
    ...sharedPolicyMechanism,
    id: 'euro-area-2026-current',
    label: 'Current $100 oil and Gulf-gas disruption',
    importEnergyPricePath: makeEnergyPricePath({
      months: 36,
      peakMultiple: 1.55,
      monthsAtPeak: 6,
      decayHalfLifeMonths: 8,
    }),
    startingHeadlineInflationPct: 2,
    startingCoreInflationPct: 2.2,
    startingExpectedInflationPct: 2.1,
    startingPolicyRatePct: 2.25,
    startingOutputGapPct: -0.4,
    neutralPolicyRatePct: 2.25,
    fiscalShieldingShare: 0.15,
    exchangeRateAmplification: 1.05,
    inflationAttention: 0.7,
    supplyShockLookThrough: 0.85,
  },
  'euro-area-2026-persistent': {
    ...sharedPolicyMechanism,
    id: 'euro-area-2026-persistent',
    label: 'Persistent current energy shock',
    importEnergyPricePath: makeEnergyPricePath({
      months: 36,
      peakMultiple: 1.7,
      monthsAtPeak: 18,
      decayHalfLifeMonths: 16,
    }),
    startingHeadlineInflationPct: 2,
    startingCoreInflationPct: 2.2,
    startingExpectedInflationPct: 2.1,
    startingPolicyRatePct: 2.25,
    startingOutputGapPct: -0.4,
    neutralPolicyRatePct: 2.25,
    fiscalShieldingShare: 0.15,
    exchangeRateAmplification: 1.05,
    inflationAttention: 0.9,
    supplyShockLookThrough: 0.65,
  },
} as const satisfies Readonly<Record<string, EnergyInflationScenario>>;

export const energyInflationEvidence = {
  euroArea2022PeakHeadlineInflationPct: 10.6,
  euroArea2023PeakCoreInflationPct: 5.7,
  euroArea2023PeakDepositRatePct: 4.0,
  currentBrentUsdPerBarrel: 100.69,
  sources: {
    currentMarkets:
      'https://au.marketscreener.com/news/stocks-sink-on-big-tech-cash-burn-oil-hits-100-for-first-time-since-may-ce7f51dedf8afe22',
    ecbTransmission:
      'https://www.ecb.europa.eu/press/key/date/2026/html/ecb.sp260513~5b14c78806.en.html',
    ecbPolicy:
      'https://www.ecb.europa.eu/press/key/date/2026/html/ecb.sp260325~ac2916a211.cs.html',
  },
} as const;
