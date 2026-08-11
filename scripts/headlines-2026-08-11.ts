import {
  basePeriodCpiWeights,
  cpiWeights,
  crudeImpliedRetail,
  crudePath,
  energyWeight,
  evaluateGuardDeployment,
  evaluateOilCpiPassThrough,
  totalEnergyWeight,
} from '../src/simulations/news/headline-experiments-2026-08-11.js';

const pp = (value: number, digits = 2): string =>
  `${value >= 0 ? '+' : ''}${value.toFixed(digits)}pp`;
const pct = (value: number, digits = 2): string =>
  `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
const money = (usd: number): string => {
  const abs = Math.abs(usd);
  if (abs >= 1e9) return `$${(usd / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(usd / 1e3).toFixed(0)}k`;
  return `$${usd.toFixed(0)}`;
};

console.log('=== News-driven simulations: 2026-08-11 ===\n');
console.log('Selected questions');
console.table([
  {
    headline: "Markets into CPI with 'inflation anxiety back in the driving seat'",
    estimand: 'July CPI m/m, released 2026-08-12 08:30 ET',
    mechanism: 'crude -> pump pass-through -> CPI weights',
  },
  {
    headline: 'DC National Guard extended to 2029, "cost in the billions"',
    estimand: 'benefit-cost ratio and break-even crime effect',
    mechanism: 'measured effects x social cost of crime vs run rate',
  },
]);

// ---------------------------------------------------------------------------
const cpi = evaluateOilCpiPassThrough();
console.log('\n1. What an oil surge can and cannot do to a CPI print');

console.log('\n   The crude path the print actually sits on');
console.table(
  crudePath.map((row) => ({
    month: row.month,
    brent: `$${row.brent.toFixed(2)}`,
    crude_implied_pump: `$${crudeImpliedRetail(row.brent).toFixed(3)}`,
    actual_pump: `$${row.retailGasoline!.toFixed(3)}`,
    margin_overhang: `$${(row.retailGasoline! - crudeImpliedRetail(row.brent)).toFixed(3)}`,
  })),
);

console.log('\n   V1: the arithmetic behind the market commentary');
console.table([
  {
    step: 'Brent, four sessions ($83 -> $88)',
    value: pct(cpi.initialV1.brentFourSessionChange),
  },
  {
    step: 'passed straight through to the pump',
    value: pct(cpi.initialV1.impliedGasolineChange),
  },
  {
    step: 'contribution to headline',
    value: pp(cpi.initialV1.impliedHeadlineContribution),
  },
  {
    step: 'implied July print',
    value: pct(cpi.initialV1.impliedHeadlineChange),
  },
]);
console.log(`   V1 flaw: ${cpi.initialV1.flaw}`);

console.log('\n   Validation: reconstruct the June print from its own components');
console.table([
  {
    weights: `base period (energy ${totalEnergyWeight(basePeriodCpiWeights).toFixed(1)}%)`,
    reconstructed: pct(cpi.validation.reconstructedJuneHeadlineBaseWeights),
    reported: pct(cpi.validation.reportedJuneHeadline, 1),
    error: `${cpi.validation.baseWeightError.toFixed(3)}pp`,
  },
  {
    weights: `price-drift adjusted (energy ${energyWeight.toFixed(1)}%)`,
    reconstructed: pct(cpi.validation.reconstructedJuneHeadlineDriftWeights),
    reported: pct(cpi.validation.reportedJuneHeadline, 1),
    error: `${cpi.validation.driftWeightError.toFixed(3)}pp`,
  },
]);
console.log(
  `   Non-gasoline energy implied by the June release: ${pct(cpi.validation.impliedNonGasolineEnergy)} m/m ` +
    `(backed out, not assumed).`,
);
console.log(`   ${cpi.validation.note}`);

console.log('\n   V2 forecast for the July print');
console.table([
  {
    component: `gasoline (weight ${cpiWeights.gasoline}%)`,
    change: pct(cpi.revisedV2.julyGasolineSaChange),
    contribution: pp(
      (cpiWeights.gasoline / 100) * cpi.revisedV2.julyGasolineSaChange,
    ),
  },
  {
    component: `energy total (weight ${energyWeight.toFixed(1)}%)`,
    change: pct(cpi.revisedV2.julyDecomposition.energyIndexChange),
    contribution: pp(cpi.revisedV2.julyDecomposition.energyContribution),
  },
  {
    component: `food (weight ${cpiWeights.food}%)`,
    change: pct(cpi.case.julyFood),
    contribution: pp(cpi.revisedV2.julyDecomposition.foodContribution),
  },
  {
    component: 'core (consensus input)',
    change: pct(cpi.case.consensusCore),
    contribution: pp(cpi.revisedV2.julyDecomposition.coreContribution),
  },
]);
console.table([
  {
    measure: 'headline m/m',
    model: pct(cpi.revisedV2.headlineForecast),
    rounded: `${cpi.revisedV2.headlineForecastRounded.toFixed(1)}%`,
    consensus: `${cpi.case.consensusHeadline.toFixed(1)}%`,
    surprise: pp(cpi.revisedV2.surpriseVersusConsensus),
  },
  {
    measure: 'headline y/y',
    model: `${cpi.revisedV2.headlineYoYForecast.toFixed(2)}%`,
    rounded: `${(Math.round(cpi.revisedV2.headlineYoYForecast * 10) / 10).toFixed(1)}%`,
    consensus: `${cpi.case.consensusHeadlineYoY.toFixed(1)}%`,
    surprise: pp(
      cpi.revisedV2.headlineYoYForecast - cpi.case.consensusHeadlineYoY,
    ),
  },
]);
console.log(
  `   Band from sweeping the gasoline seasonal factor and the Cleveland Fed core nowcast: ` +
    `${pct(cpi.revisedV2.headlineLow)} to ${pct(cpi.revisedV2.headlineHigh)}.`,
);
console.log(`   ${cpi.revisedV2.interpretation}`);

console.log('\n   August scenarios: where the surge does land');
console.table(
  cpi.augustScenarios.map((scenario) => ({
    scenario: scenario.id,
    august_brent: `$${scenario.augustBrent.toFixed(1)}`,
    crude_implied_pump: `$${scenario.crudeImpliedRetail.toFixed(3)}`,
    modelled_pump: `$${scenario.modelledRetail.toFixed(3)}`,
    pump_change: pct(scenario.retailChangePct),
    headline_contribution: pp(scenario.headlineEnergyContribution),
  })),
);

console.log(
  '\n   Base effects: the war spike leaving the y/y window, Brent held at the August average',
);
console.table(
  cpi.baseEffects.map((row) => ({
    month: row.month,
    year_ago_pump: `$${row.yearAgoRetail.toFixed(3)}`,
    projected_pump: `$${row.projectedRetail.toFixed(3)}`,
    gasoline_yoy: pct(row.gasolineYoY, 1),
    energy_yoy_contribution: pp(row.energyYoYContribution),
    shift_vs_june: pp(row.headlineYoYShiftFromJune),
  })),
);

// ---------------------------------------------------------------------------
const guard = evaluateGuardDeployment();
console.log('\n2. What the DC National Guard deployment buys');
console.table([
  { quantity: 'troops', value: guard.case.troops.toLocaleString('en-US') },
  { quantity: 'CBO run rate', value: `${money(guard.case.costPerDay)}/day` },
  { quantity: 'annualized', value: `${money(guard.annualCost)}/yr` },
  {
    quantity: 'remaining to Inauguration Day 2029',
    value: money(guard.remainingCost),
  },
  {
    quantity: 'POGO published range',
    value: `${money(guard.case.pogoTotalLow)} - ${money(guard.case.pogoTotalHigh)}`,
  },
]);

console.log('\n   V1: cost per averted offence');
console.table([
  {
    step: 'property offences averted per year (24% effect)',
    value: Math.round(guard.initialV1.propertyOffencesAverted).toLocaleString('en-US'),
  },
  {
    step: 'cost per property offence averted',
    value: money(guard.initialV1.costPerPropertyOffenceAverted),
  },
  {
    step: 'officers the same money would fund',
    value: `${Math.round(guard.initialV1.naiveOfficerEquivalent).toLocaleString('en-US')} (${guard.initialV1.naiveOfficerMultipleOfMpd.toFixed(2)}x MPD)`,
  },
]);
console.log(`   V1 flaw: ${guard.initialV1.flaw}`);

console.log('\n   V2: monetize every measured effect, then invert');
console.table([
  {
    line: 'property crime, -24% (measured)',
    value: `${money(guard.revisedV2.propertyBenefit)}/yr`,
  },
  {
    line: 'violent crime, no measured effect',
    value: `${money(guard.revisedV2.violentBenefit)}/yr`,
  },
  {
    line: 'homicide, no measured effect',
    value: `${money(guard.revisedV2.homicideBenefit)}/yr`,
  },
  {
    line: 'total benefit vs cost',
    value: `${money(guard.revisedV2.totalBenefit)} vs ${money(guard.annualCost)} = ${guard.revisedV2.benefitCostRatio.toFixed(3)}`,
  },
]);
console.table([
  {
    break_even: 'property offences that must be averted per year',
    value: Math.round(guard.revisedV2.breakEvenPropertyOffences).toLocaleString('en-US'),
    versus: `${guard.revisedV2.breakEvenPropertyMultipleOfStock.toFixed(1)}x the District's entire annual count`,
  },
  {
    break_even: 'homicides that must be averted per year',
    value: guard.revisedV2.breakEvenHomicides.toFixed(0),
    versus: `${(100 * guard.revisedV2.breakEvenHomicideShare).toFixed(0)}% of all DC homicides`,
  },
]);
console.log(`   ${guard.revisedV2.interpretation}`);

console.log('\n   Opportunity cost: the "hire officers instead" comparison');
console.table([
  {
    version: 'unconstrained (the version that circulates)',
    officers: Math.round(guard.opportunityCost.unconstrainedOfficers).toLocaleString('en-US'),
    force_increase: pct(100 * guard.opportunityCost.unconstrainedForceIncrease, 0),
    homicides_averted: guard.opportunityCost.unconstrainedHomicidesAverted.toFixed(0),
    valid: guard.opportunityCost.unconstrainedOutOfSample ? 'OUT OF SAMPLE' : 'in range',
  },
  {
    version: 'constrained by what MPD can actually recruit',
    officers: Math.round(guard.opportunityCost.constrainedOfficers).toLocaleString('en-US'),
    force_increase: pct(100 * guard.opportunityCost.constrainedForceIncrease, 0),
    homicides_averted: guard.opportunityCost.constrainedHomicidesAverted.toFixed(1),
    valid: 'in range',
  },
]);
console.log(
  `   Return per dollar of police spending: ${guard.opportunityCost.benefitCostRatioPerDollar.toFixed(2)} ` +
    `(scale-invariant), against ${guard.revisedV2.benefitCostRatio.toFixed(3)} for the deployment — ` +
    `but only ${(100 * guard.opportunityCost.constrainedSpendShare).toFixed(1)}% of the budget can be redeployed, ` +
    `leaving ${money(guard.opportunityCost.unallocatedRemainder)} with no identified use.`,
);
console.log(`   ${guard.opportunityCost.note}`);

console.log('\n   Sensitivity: the homicide valuation');
console.table(
  guard.homicideValueSensitivity.map((row) => ({
    value_per_homicide: money(row.homicideCost),
    break_even_homicides: row.breakEvenHomicides.toFixed(0),
    share_of_dc_homicides: `${(100 * row.breakEvenHomicideShare).toFixed(0)}%`,
    police_benefit_cost_ratio: row.constrainedBenefitCostRatio.toFixed(2),
  })),
);

// ---------------------------------------------------------------------------
console.log('\nBottom line versus the conventional wisdom');
console.table([
  {
    conventional: "Inflation anxiety back in the driving seat ahead of CPI",
    model: `The July print carries an energy DRAG of ${pp(cpi.revisedV2.julyDecomposition.energyContribution)}; model says ${pct(cpi.revisedV2.headlineForecast)} vs ${cpi.case.consensusHeadline.toFixed(1)}% consensus`,
  },
  {
    conventional: "Brent's four-day surge forces a rethink",
    model: 'The surge is an August event and cannot enter a July reference period',
  },
  {
    conventional: 'Oil at $88 makes the Fed less comfortable',
    model: `Pump rises ${pct(cpi.augustScenarios[1].retailChangePct)} in August at that level: a fat post-collapse margin absorbs most of it`,
  },
  {
    conventional: 'The war means sustained inflation pressure',
    model: `Opposite sign by spring: base effects take up to ${pp(Math.min(...cpi.baseEffects.map((r) => r.headlineYoYShiftFromJune)))} off headline y/y`,
  },
  {
    conventional: 'Guard deployment: "no effect on crime" / "cost in the billions"',
    model: `A real 24% property-crime win worth ${money(guard.revisedV2.totalBenefit)}/yr against ${money(guard.annualCost)}/yr — ratio ${guard.revisedV2.benefitCostRatio.toFixed(3)}`,
  },
  {
    conventional: 'That money should fund police instead',
    model: `Right on return (${guard.opportunityCost.benefitCostRatioPerDollar.toFixed(2)}x), wrong on scale: only ${(100 * guard.opportunityCost.constrainedSpendShare).toFixed(1)}% is redeployable`,
  },
]);
