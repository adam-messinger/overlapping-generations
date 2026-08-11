/**
 * News-driven experiments for 2026-08-11.
 *
 *   1. "Markets are heading into US CPI with inflation anxiety back in the
 *      driving seat, as Brent's four-day surge forces investors to rethink
 *      last week's post-payrolls relief" (Tickmill daily outlook, 2026-08-11).
 *      Brent closed on $88 from ~$83 at the end of last week as the Hormuz
 *      reopening talks stalled; the July CPI print lands 2026-08-12 08:30 ET
 *      with consensus at +0.2% m/m headline and 3.4% y/y.
 *
 *   2. The DC National Guard deployment, quietly extended to Inauguration Day
 *      2029, "expected to cost in the billions" — CBO puts the run rate above
 *      $3M/day, POGO the total at $2.5-3.4B, and the Niskanen Center finds a
 *      24% cut in property crime with no measurable effect on violent crime.
 *
 * Both are modelled V1 (the arithmetic the reporting implies) then V2 (the same
 * arithmetic with the timing, pass-through and accounting constraints the
 * headline framing leaves out). The CPI model produces a point forecast that
 * resolves the morning after this file was written.
 */

import { assertFiniteDeep } from 'tsimulation';

// ---------------------------------------------------------------------------
// 1. What an oil surge can and cannot do to a CPI print
// ---------------------------------------------------------------------------

export interface CrudeMonth {
  month: string;
  /** Monthly average Brent, USD per barrel. */
  brent: number;
  /** EIA US regular retail gasoline monthly average, USD per gallon, NSA. */
  retailGasoline?: number;
}

/**
 * Monthly Brent averages and EIA retail gasoline. The 2026 path is dominated by
 * the war: Brent ran from $69 in February to $117 in April, then unwound to $80
 * by July. August is a partial month, running ~$83 at the end of last week and
 * closing on $88 on the 11th.
 *
 * Retail gasoline for May is reconstructed from the June CPI gasoline index
 * (-9.7% m/m) applied to the observed June level; it is flagged as derived.
 */
export const crudePath: readonly CrudeMonth[] = [
  { month: '2026-04', brent: 117.29, retailGasoline: 4.35 },
  { month: '2026-05', brent: 103.94, retailGasoline: 4.485 },
  { month: '2026-06', brent: 84.42, retailGasoline: 4.05 },
  { month: '2026-07', brent: 79.99, retailGasoline: 3.93 },
];

export interface PassThroughParams {
  /**
   * Crude cost per gallon of product: 1/42 barrels per gallon. A dollar on
   * Brent is 2.38 cents of crude input per gallon.
   */
  crudeDollarsPerGallon: number;
  /** Taxes, refining, distribution and marketing wedge, USD per gallon. */
  taxAndMarginWedge: number;
  /** Contemporaneous pass-through of a rising crude target. */
  betaUp: number;
  /** Contemporaneous pass-through of a falling crude target. */
  betaDown: number;
  /** Error-correction speed when the pump sits BELOW the crude-implied level. */
  alphaUp: number;
  /** Error-correction speed when the pump sits ABOVE it, i.e. margins compress. */
  alphaDown: number;
}

/**
 * Rockets and feathers: retail gasoline tracks crude up faster than down
 * (Bacon 1991; Borenstein, Cameron and Gilbert 1997). The up-direction
 * coefficients are literature values. alphaDown is the single free parameter,
 * pinned to the observed June-to-July move (retail -$0.12 against a crude
 * target that fell $0.105 from a level already $0.29 above the pump).
 */
export const gasolinePassThrough: PassThroughParams = {
  crudeDollarsPerGallon: 1 / 42,
  // Federal plus average state tax ~$0.55, refining and marketing ~$1.20.
  taxAndMarginWedge: 1.75,
  betaUp: 0.9,
  betaDown: 0.6,
  alphaUp: 0.5,
  alphaDown: 0.196,
};

export function crudeImpliedRetail(
  brent: number,
  params: PassThroughParams = gasolinePassThrough,
): number {
  return params.taxAndMarginWedge + params.crudeDollarsPerGallon * brent;
}

/**
 * One month of the error-correction model:
 *
 *   dRetail = beta * dTarget + alpha * (target[t-1] - retail[t-1])
 *
 * with direction-dependent beta and alpha. The gap term is what makes the
 * August forecast counterintuitive: the pump is still sitting above the
 * crude-implied level left over from the April-to-July collapse, so a rising
 * crude target is partly absorbed by margin compression rather than pushed
 * through to the consumer.
 */
export function stepRetailGasoline(
  previousRetail: number,
  previousBrent: number,
  currentBrent: number,
  params: PassThroughParams = gasolinePassThrough,
): { retail: number; target: number; gap: number; rising: boolean } {
  const previousTarget = crudeImpliedRetail(previousBrent, params);
  const target = crudeImpliedRetail(currentBrent, params);
  const rising = target >= previousTarget;
  // Beta keys on the direction of the cost shock: increases are passed through
  // fast. Alpha keys on the direction the pump has to move to close the gap:
  // margins expand quickly and compress slowly, which is the "feathers" side.
  const beta = rising ? params.betaUp : params.betaDown;
  const gap = previousTarget - previousRetail;
  const alpha = gap >= 0 ? params.alphaUp : params.alphaDown;
  return {
    retail: previousRetail + beta * (target - previousTarget) + alpha * gap,
    target,
    gap,
    rising,
  };
}

export interface CpiWeights {
  /** Relative importance in the CPI-U, percent. */
  gasoline: number;
  electricity: number;
  utilityGas: number;
  fuelOil: number;
  food: number;
}

/**
 * CPI-U relative importance. BLS weights are set annually but relative
 * importance drifts with the price level between updates, and the war has
 * pushed gasoline well above its base-period share: at ~$4.00/gal against a
 * ~$3.20 base, energy carries ~7.3% of the index rather than the ~6.4% the
 * base-period table shows. Using base-period weights is what leaves the June
 * reconstruction 0.1pp short of the reported print (see `validation`).
 */
export const cpiWeights: CpiWeights = {
  gasoline: 3.7,
  electricity: 2.7,
  utilityGas: 0.8,
  fuelOil: 0.1,
  food: 13.6,
};

/** The base-period table, retained to show what the drift is worth. */
export const basePeriodCpiWeights: CpiWeights = {
  gasoline: 3.1,
  electricity: 2.5,
  utilityGas: 0.7,
  fuelOil: 0.1,
  food: 13.6,
};

export const totalEnergyWeight = (weights: CpiWeights): number =>
  weights.gasoline + weights.electricity + weights.utilityGas + weights.fuelOil;

export const energyWeight = totalEnergyWeight(cpiWeights);
export const coreWeight = 100 - energyWeight - cpiWeights.food;

export interface CpiMonthInputs {
  /** Seasonally adjusted m/m percent changes. */
  gasoline: number;
  electricity: number;
  utilityGas: number;
  fuelOil: number;
  food: number;
  core: number;
}

export interface CpiDecomposition {
  energyIndexChange: number;
  energyContribution: number;
  foodContribution: number;
  coreContribution: number;
  headlineChange: number;
}

export function decomposeCpi(
  inputs: CpiMonthInputs,
  weights: CpiWeights = cpiWeights,
): CpiDecomposition {
  const energy = totalEnergyWeight(weights);
  const core = 100 - energy - weights.food;
  const energyIndexChange =
    (weights.gasoline * inputs.gasoline +
      weights.electricity * inputs.electricity +
      weights.utilityGas * inputs.utilityGas +
      weights.fuelOil * inputs.fuelOil) /
    energy;
  const energyContribution = (energy / 100) * energyIndexChange;
  const foodContribution = (weights.food / 100) * inputs.food;
  const coreContribution = (core / 100) * inputs.core;
  return {
    energyIndexChange,
    energyContribution,
    foodContribution,
    coreContribution,
    headlineChange: energyContribution + foodContribution + coreContribution,
  };
}

export interface CpiCase {
  /** Brent at the end of last week, before the four-session run. */
  brentPriorClose: number;
  /** Brent on the morning of 2026-08-11. */
  brentCurrent: number;
  /** Average Brent so far in August. */
  brentAugustToDate: number;
  /** Consensus for the July print, m/m percent. */
  consensusHeadline: number;
  consensusCore: number;
  consensusHeadlineYoY: number;
  /** June actuals used to validate the decomposition. */
  juneHeadline: number;
  juneCore: number;
  juneFood: number;
  juneGasoline: number;
  juneEnergy: number;
  juneHeadlineYoY: number;
  juneEnergyYoY: number;
  juneGasolineYoY: number;
  /** Seasonal factor added to the NSA gasoline change to reach the SA change. */
  julyGasolineSeasonalFactor: number;
  julyElectricity: number;
  julyUtilityGas: number;
  julyFuelOil: number;
  julyFood: number;
  /** Cleveland Fed nowcast range for July core, m/m percent. */
  coreNowcastLow: number;
  coreNowcastHigh: number;
}

/**
 * June 2026 actuals from the BLS CPI release of 2026-07-14: headline -0.4% m/m
 * seasonally adjusted, energy -5.7% (largest monthly drop since April 2020),
 * gasoline -9.7%, core flat, headline +3.5% y/y with energy +15.7% and gasoline
 * +26.7%. July consensus and the Cleveland Fed core nowcast band as reported
 * ahead of the 2026-08-12 release.
 */
export const julyCpiCase: CpiCase = {
  brentPriorClose: 83.0,
  brentCurrent: 88.0,
  brentAugustToDate: 85.5,
  consensusHeadline: 0.2,
  consensusCore: 0.2,
  consensusHeadlineYoY: 3.4,
  juneHeadline: -0.4,
  juneCore: 0.0,
  juneFood: 0.0,
  juneGasoline: -9.7,
  juneEnergy: -5.7,
  juneHeadlineYoY: 3.5,
  juneEnergyYoY: 15.7,
  juneGasolineYoY: 26.7,
  // Gasoline normally eases slightly in July, so the SA change sits a touch
  // above the NSA change. Swept in the sensitivity band.
  julyGasolineSeasonalFactor: 0.5,
  // Electricity has been the firm side of the energy basket through the
  // data-center load build.
  julyElectricity: 0.4,
  julyUtilityGas: 0.5,
  julyFuelOil: -2.0,
  julyFood: 0.15,
  coreNowcastLow: 0.09,
  coreNowcastHigh: 0.21,
};

export interface BrentScenario {
  id: string;
  label: string;
  augustBrent: number;
}

export interface CpiForecastResult {
  case: CpiCase;
  initialV1: {
    brentFourSessionChange: number;
    /** Contemporaneous full pass-through of the crude move to the pump. */
    impliedGasolineChange: number;
    impliedHeadlineContribution: number;
    impliedHeadlineChange: number;
    flaw: string;
  };
  validation: {
    juneGasolineNsaChange: number;
    /** Non-gasoline energy m/m implied by the reported gasoline and energy indexes. */
    impliedNonGasolineEnergy: number;
    reconstructedJuneHeadlineBaseWeights: number;
    reconstructedJuneHeadlineDriftWeights: number;
    reportedJuneHeadline: number;
    baseWeightError: number;
    driftWeightError: number;
    note: string;
  };
  revisedV2: {
    julyGasolineNsaChange: number;
    julyGasolineSaChange: number;
    julyDecomposition: CpiDecomposition;
    headlineForecast: number;
    headlineForecastRounded: number;
    headlineYoYForecast: number;
    consensusHeadline: number;
    surpriseVersusConsensus: number;
    /** Range from sweeping the gasoline seasonal factor and the core nowcast. */
    headlineLow: number;
    headlineHigh: number;
    interpretation: string;
  };
  augustScenarios: readonly {
    id: string;
    label: string;
    augustBrent: number;
    crudeImpliedRetail: number;
    modelledRetail: number;
    retailChangePct: number;
    marginOverhang: number;
    headlineEnergyContribution: number;
  }[];
  baseEffects: readonly {
    month: string;
    yearAgoRetail: number;
    projectedRetail: number;
    gasolineYoY: number;
    energyYoYContribution: number;
    headlineYoYShiftFromJune: number;
  }[];
}

/**
 * Decomposes the July CPI print due the morning after this model was written,
 * validates the decomposition against the June release, then projects the
 * energy contribution forward.
 */
export function evaluateOilCpiPassThrough(
  input: CpiCase = julyCpiCase,
  params: PassThroughParams = gasolinePassThrough,
): CpiForecastResult {
  assertFiniteDeep(input, 'July CPI case');
  const byMonth = new Map(crudePath.map((row) => [row.month, row]));
  const may = byMonth.get('2026-05');
  const june = byMonth.get('2026-06');
  const july = byMonth.get('2026-07');
  if (!may?.retailGasoline || !june?.retailGasoline || !july?.retailGasoline) {
    throw new Error('crude path is missing the retail gasoline anchors');
  }

  // -- V1: the arithmetic the market commentary implies --------------------
  // Take the four-session crude move, pass it straight through to the pump,
  // and read it into the print that is about to be released.
  const brentFourSessionChange =
    (100 * (input.brentCurrent - input.brentPriorClose)) / input.brentPriorClose;
  const impliedGasolineChange = brentFourSessionChange;
  const impliedHeadlineContribution =
    (cpiWeights.gasoline / 100) * impliedGasolineChange;
  const v1 = {
    brentFourSessionChange,
    impliedGasolineChange,
    impliedHeadlineContribution,
    impliedHeadlineChange:
      input.consensusHeadline + impliedHeadlineContribution,
    flaw:
      'Reads an August spot move into a July reference period, passes crude through to the ' +
      'pump contemporaneously and symmetrically, and ignores that the pump is still above ' +
      'the crude-implied level left over from the April-to-July collapse.',
  };

  // -- Validation: reconstruct the June print ------------------------------
  const juneGasolineNsaChange =
    (100 * (june.retailGasoline - may.retailGasoline)) / may.retailGasoline;
  // Rather than guessing the non-gasoline energy components, back them out of
  // the two figures BLS published: gasoline -9.7% and the energy index -5.7%.
  const impliedNonGasolineEnergy = (weights: CpiWeights): number => {
    const energy = totalEnergyWeight(weights);
    return (
      (energy * input.juneEnergy - weights.gasoline * input.juneGasoline) /
      (energy - weights.gasoline)
    );
  };
  const juneHeadlineUnder = (weights: CpiWeights): number => {
    const nonGasoline = impliedNonGasolineEnergy(weights);
    return decomposeCpi(
      {
        gasoline: input.juneGasoline,
        electricity: nonGasoline,
        utilityGas: nonGasoline,
        fuelOil: nonGasoline,
        food: input.juneFood,
        core: input.juneCore,
      },
      weights,
    ).headlineChange;
  };
  const baseHeadline = juneHeadlineUnder(basePeriodCpiWeights);
  const driftHeadline = juneHeadlineUnder(cpiWeights);
  const validation = {
    juneGasolineNsaChange,
    impliedNonGasolineEnergy: impliedNonGasolineEnergy(cpiWeights),
    reconstructedJuneHeadlineBaseWeights: baseHeadline,
    reconstructedJuneHeadlineDriftWeights: driftHeadline,
    reportedJuneHeadline: input.juneHeadline,
    baseWeightError: Math.abs(baseHeadline - input.juneHeadline),
    driftWeightError: Math.abs(driftHeadline - input.juneHeadline),
    note:
      'Base-period weights leave the June print unexplained by about a tenth of a point. ' +
      'Marking energy up for the price drift the war produced closes it, and the same ' +
      'markup makes the July energy drag correspondingly larger.',
  };

  // -- V2: the July print, on July prices ----------------------------------
  const julyGasolineNsaChange =
    (100 * (july.retailGasoline - june.retailGasoline)) / june.retailGasoline;
  const julyGasolineSaChange =
    julyGasolineNsaChange + input.julyGasolineSeasonalFactor;
  const julyInputs: CpiMonthInputs = {
    gasoline: julyGasolineSaChange,
    electricity: input.julyElectricity,
    utilityGas: input.julyUtilityGas,
    fuelOil: input.julyFuelOil,
    food: input.julyFood,
    core: input.consensusCore,
  };
  const julyDecomposition = decomposeCpi(julyInputs);
  // The consensus y/y implies the July 2025 m/m that drops out of the window.
  const juneToJulyYearAgo =
    input.juneHeadlineYoY + input.consensusHeadline - input.consensusHeadlineYoY;
  const headlineYoYForecast =
    input.juneHeadlineYoY + julyDecomposition.headlineChange - juneToJulyYearAgo;

  const bandLow = decomposeCpi({
    ...julyInputs,
    gasoline: julyGasolineNsaChange - 0.5,
    core: input.coreNowcastLow,
  }).headlineChange;
  const bandHigh = decomposeCpi({
    ...julyInputs,
    gasoline: julyGasolineNsaChange + 1.5,
    core: input.coreNowcastHigh,
  }).headlineChange;

  // -- August scenarios ----------------------------------------------------
  const scenarios: readonly BrentScenario[] = [
    { id: 'unwind', label: 'Hormuz route agreed, Brent back to $78', augustBrent: 78 },
    { id: 'hold', label: 'stalemate holds, Brent averages $85.5', augustBrent: input.brentAugustToDate },
    { id: 'escalate', label: 'talks collapse, Brent averages $100', augustBrent: 100 },
    { id: 'closure', label: 'full Hormuz closure, Brent averages $115', augustBrent: 115 },
  ];
  const augustScenarios = scenarios.map((scenario) => {
    const step = stepRetailGasoline(
      july.retailGasoline!,
      july.brent,
      scenario.augustBrent,
      params,
    );
    const retailChangePct =
      (100 * (step.retail - july.retailGasoline!)) / july.retailGasoline!;
    return {
      id: scenario.id,
      label: scenario.label,
      augustBrent: scenario.augustBrent,
      crudeImpliedRetail: step.target,
      modelledRetail: step.retail,
      retailChangePct,
      marginOverhang: july.retailGasoline! - crudeImpliedRetail(july.brent, params),
      headlineEnergyContribution: (cpiWeights.gasoline / 100) * retailChangePct,
    };
  });

  // -- Base effects: the war spike unwinding out of the y/y window ---------
  const holdBrent = input.brentAugustToDate;
  const settledRetail = crudeImpliedRetail(holdBrent, params);
  const baseEffects = crudePath.map((row) => {
    const yearAgoRetail = row.retailGasoline!;
    const gasolineYoY = 100 * (settledRetail / yearAgoRetail - 1);
    // Hold every non-gasoline energy component at its June y/y contribution.
    const nonGasolineEnergyYoY =
      (energyWeight * input.juneEnergyYoY -
        cpiWeights.gasoline * input.juneGasolineYoY) /
      (energyWeight - cpiWeights.gasoline);
    const energyYoY =
      (cpiWeights.gasoline * gasolineYoY +
        (energyWeight - cpiWeights.gasoline) * nonGasolineEnergyYoY) /
      energyWeight;
    const energyYoYContribution = (energyWeight / 100) * energyYoY;
    return {
      month: `${Number(row.month.slice(0, 4)) + 1}${row.month.slice(4)}`,
      yearAgoRetail,
      projectedRetail: settledRetail,
      gasolineYoY,
      energyYoYContribution,
      headlineYoYShiftFromJune:
        energyYoYContribution - (energyWeight / 100) * input.juneEnergyYoY,
    };
  });

  return {
    case: input,
    initialV1: v1,
    validation,
    revisedV2: {
      julyGasolineNsaChange,
      julyGasolineSaChange,
      julyDecomposition,
      headlineForecast: julyDecomposition.headlineChange,
      headlineForecastRounded:
        Math.round(julyDecomposition.headlineChange * 10) / 10,
      headlineYoYForecast,
      consensusHeadline: input.consensusHeadline,
      surpriseVersusConsensus:
        julyDecomposition.headlineChange - input.consensusHeadline,
      headlineLow: Math.min(bandLow, bandHigh),
      headlineHigh: Math.max(bandLow, bandHigh),
      interpretation:
        'The July print measures July prices. Brent averaged $79.99 in July, down 5.2% from ' +
        'June, and the pump followed it down. The energy basket is a drag on the print the ' +
        'market is nervous about, and the four-session August surge cannot appear in it at all.',
    },
    augustScenarios,
    baseEffects,
  };
}

// ---------------------------------------------------------------------------
// 2. What the DC National Guard deployment buys
// ---------------------------------------------------------------------------

export interface GuardDeploymentCase {
  troops: number;
  /** CBO run-rate estimate, USD per day. */
  costPerDay: number;
  deploymentStart: string;
  deploymentEnd: string;
  remainingYears: number;
  /** POGO total-cost range for the extension, USD. */
  pogoTotalLow: number;
  pogoTotalHigh: number;
  /** Measured effects: Niskanen Center evaluation. */
  propertyCrimeEffect: number;
  violentCrimeEffect: number;
  homicideEffect: number;
  /** Annual DC offence counts. */
  annualPropertyOffences: number;
  annualViolentOffences: number;
  annualHomicides: number;
  /** Social cost per offence, USD, willingness-to-pay basis. */
  propertyOffenceCost: number;
  violentOffenceCost: number;
  homicideCost: number;
  /** MPD sworn strength and fully loaded annual cost per officer. */
  mpdOfficers: number;
  officerAnnualCost: number;
  /** Elasticity of violent crime to sworn strength. */
  policeViolentElasticity: number;
  /** Net sworn officers MPD can actually add per year. */
  maxNetHiresPerYear: number;
}

/**
 * Deployment facts: ~5,000 troops from more than 20 states after the May
 * "summer surge", extended to Inauguration Day 2029; CBO run rate above $3M/day;
 * POGO total $2.5-3.4B. Effects from the Niskanen Center evaluation (a 24% cut
 * in property crime, no measurable effect on violent crime, homicides or gun
 * crimes), consistent with the Center for American Progress finding across
 * cities.
 *
 * MPD sworn strength 3,144 as of early 2026, down from ~4,000 in 2013. Social
 * costs per offence follow the standard willingness-to-pay literature
 * (Cohen and Piquero) inflated to 2026 dollars; the homicide figure is a
 * value-of-statistical-life anchor and does the most work, so it is swept.
 * The police elasticity is the mid-range of the quasi-experimental estimates
 * (Chalfin and McCrary; Mello).
 */
export const dcGuardDeployment: GuardDeploymentCase = {
  troops: 5_000,
  costPerDay: 3_000_000,
  deploymentStart: '2025-08-11',
  deploymentEnd: '2029-01-20',
  remainingYears: 2.44,
  pogoTotalLow: 2.5e9,
  pogoTotalHigh: 3.4e9,
  propertyCrimeEffect: -0.24,
  violentCrimeEffect: 0.0,
  homicideEffect: 0.0,
  annualPropertyOffences: 27_000,
  annualViolentOffences: 3_400,
  annualHomicides: 160,
  propertyOffenceCost: 5_500,
  violentOffenceCost: 90_000,
  homicideCost: 11_000_000,
  mpdOfficers: 3_144,
  officerAnnualCost: 180_000,
  policeViolentElasticity: -0.35,
  maxNetHiresPerYear: 150,
};

export interface GuardDeploymentResult {
  case: GuardDeploymentCase;
  annualCost: number;
  remainingCost: number;
  initialV1: {
    /** Property offences averted per year at the measured effect. */
    propertyOffencesAverted: number;
    costPerPropertyOffenceAverted: number;
    naiveOfficerEquivalent: number;
    naiveOfficerMultipleOfMpd: number;
    flaw: string;
  };
  revisedV2: {
    propertyBenefit: number;
    violentBenefit: number;
    homicideBenefit: number;
    totalBenefit: number;
    benefitCostRatio: number;
    /** Property-crime reduction that would make the deployment break even. */
    breakEvenPropertyOffences: number;
    breakEvenPropertyMultipleOfStock: number;
    /** Homicide reduction that would make it break even. */
    breakEvenHomicides: number;
    breakEvenHomicideShare: number;
    interpretation: string;
  };
  opportunityCost: {
    /** Return per dollar of police spending. Scale-invariant by construction. */
    benefitCostRatioPerDollar: number;
    unconstrainedOfficers: number;
    unconstrainedForceIncrease: number;
    unconstrainedViolentReduction: number;
    unconstrainedHomicidesAverted: number;
    unconstrainedBenefit: number;
    /** True when the implied force increase is outside the estimated range. */
    unconstrainedOutOfSample: boolean;
    constrainedOfficers: number;
    constrainedForceIncrease: number;
    constrainedViolentReduction: number;
    constrainedHomicidesAverted: number;
    constrainedBenefit: number;
    constrainedSpendShare: number;
    /** Budget with no higher-return use identified, USD. */
    unallocatedRemainder: number;
    note: string;
  };
  homicideValueSensitivity: readonly {
    homicideCost: number;
    breakEvenHomicides: number;
    breakEvenHomicideShare: number;
    constrainedBenefitCostRatio: number;
  }[];
}

export function evaluateGuardDeployment(
  input: GuardDeploymentCase = dcGuardDeployment,
): GuardDeploymentResult {
  assertFiniteDeep(input, 'DC Guard deployment case');
  const annualCost = input.costPerDay * 365;
  const remainingCost = annualCost * input.remainingYears;

  // -- V1: cost per averted offence, money treated as instantly fungible ---
  const propertyOffencesAverted =
    -input.propertyCrimeEffect * input.annualPropertyOffences;
  const naiveOfficerEquivalent = annualCost / input.officerAnnualCost;
  const v1 = {
    propertyOffencesAverted,
    costPerPropertyOffenceAverted: annualCost / propertyOffencesAverted,
    naiveOfficerEquivalent,
    naiveOfficerMultipleOfMpd: naiveOfficerEquivalent / input.mpdOfficers,
    flaw:
      'Divides the whole bill by the one effect that was measured, and treats the same money ' +
      'as instantly convertible into sworn officers. MPD cannot absorb thousands of hires: it ' +
      'has been shedding officers for a decade and nets on the order of a hundred a year.',
  };

  // -- V2: monetize every measured effect, then invert for break-even ------
  const propertyBenefit = propertyOffencesAverted * input.propertyOffenceCost;
  const violentBenefit =
    -input.violentCrimeEffect *
    input.annualViolentOffences *
    input.violentOffenceCost;
  const homicideBenefit =
    -input.homicideEffect * input.annualHomicides * input.homicideCost;
  const totalBenefit = propertyBenefit + violentBenefit + homicideBenefit;
  const breakEvenPropertyOffences = annualCost / input.propertyOffenceCost;
  const breakEvenHomicides = annualCost / input.homicideCost;

  // -- Opportunity cost, with and without the hiring constraint ------------
  const violentReduction = (officers: number): number =>
    input.policeViolentElasticity * (officers / input.mpdOfficers);
  const benefitFromOfficers = (officers: number): number => {
    const reduction = -violentReduction(officers);
    return (
      reduction * input.annualViolentOffences * input.violentOffenceCost +
      reduction * input.annualHomicides * input.homicideCost
    );
  };
  const unconstrainedOfficers = naiveOfficerEquivalent;
  const constrainedOfficers =
    input.maxNetHiresPerYear * input.remainingYears;
  const constrainedSpend = constrainedOfficers * input.officerAnnualCost;

  const homicideValueSensitivity = [6e6, 11e6, 20e6].map((homicideCost) => {
    const reduction = -violentReduction(constrainedOfficers);
    const benefit =
      reduction * input.annualViolentOffences * input.violentOffenceCost +
      reduction * input.annualHomicides * homicideCost;
    return {
      homicideCost,
      breakEvenHomicides: annualCost / homicideCost,
      breakEvenHomicideShare: annualCost / homicideCost / input.annualHomicides,
      constrainedBenefitCostRatio: benefit / constrainedSpend,
    };
  });

  return {
    case: input,
    annualCost,
    remainingCost,
    initialV1: v1,
    revisedV2: {
      propertyBenefit,
      violentBenefit,
      homicideBenefit,
      totalBenefit,
      benefitCostRatio: totalBenefit / annualCost,
      breakEvenPropertyOffences,
      breakEvenPropertyMultipleOfStock:
        breakEvenPropertyOffences / input.annualPropertyOffences,
      breakEvenHomicides,
      breakEvenHomicideShare: breakEvenHomicides / input.annualHomicides,
      interpretation:
        'The measured win is real and the coverage understates it by reporting only the null. ' +
        'It is also two orders of magnitude too small to justify the bill: no attainable ' +
        'property-crime effect can, because the entire annual stock of property offences in ' +
        'the District is worth about a seventh of one year of the deployment.',
    },
    opportunityCost: {
      benefitCostRatioPerDollar:
        benefitFromOfficers(constrainedOfficers) / constrainedSpend,
      unconstrainedOfficers,
      unconstrainedForceIncrease: unconstrainedOfficers / input.mpdOfficers,
      unconstrainedViolentReduction: violentReduction(unconstrainedOfficers),
      unconstrainedHomicidesAverted:
        -violentReduction(unconstrainedOfficers) * input.annualHomicides,
      unconstrainedBenefit: benefitFromOfficers(unconstrainedOfficers),
      // The quasi-experimental police elasticities are estimated over force
      // changes of a few percent. Extrapolating one to a 194% increase is not
      // a forecast, and the model says so rather than printing the number bare.
      unconstrainedOutOfSample: unconstrainedOfficers / input.mpdOfficers > 0.25,
      constrainedOfficers,
      constrainedForceIncrease: constrainedOfficers / input.mpdOfficers,
      constrainedViolentReduction: violentReduction(constrainedOfficers),
      constrainedHomicidesAverted:
        -violentReduction(constrainedOfficers) * input.annualHomicides,
      constrainedBenefit: benefitFromOfficers(constrainedOfficers),
      constrainedSpendShare: constrainedSpend / remainingCost,
      unallocatedRemainder: remainingCost - constrainedSpend,
      note:
        'A constant elasticity makes the return per dollar the same at any scale, so the ' +
        'constraint does not change what a police dollar buys — it changes how many dollars ' +
        'can buy it. MPD has shed officers for a decade and nets on the order of 150 a year, ' +
        'so only a small share of this budget can be redeployed into policing at all. The ' +
        '"just hire officers instead" comparison that circulates is arithmetically true and ' +
        'operationally unavailable, and the remainder needs a different use argued on its own.',
    },
    homicideValueSensitivity,
  };
}
