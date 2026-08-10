import {
  evaluateAiPowerVolatility,
  evaluateInterconnectionQueue,
  evaluateVolatilityMacroLinkage,
} from '../src/simulations/news/headline-experiments-2026-08-10.js';

const pct = (value: number, digits = 2): string =>
  `${(100 * value).toFixed(digits)}%`;
const money = (usd: number): string => {
  const abs = Math.abs(usd);
  if (abs >= 1e12) return `$${(usd / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(usd / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
  return `$${(usd / 1e3).toFixed(0)}k`;
};
const sci = (value: number): string => value.toExponential(2);
const years = (value: number): string =>
  value >= 1
    ? `${value.toFixed(1)} yr`
    : value >= 1 / 365
      ? `${(value * 365).toFixed(1)} d`
      : `${(value * 365 * 24 * 3600).toFixed(0)} s`;

console.log('=== News-driven simulations: 2026-08-10 ===\n');
console.log('Selected questions');
console.table([
  {
    headline: "Data centers damaged by AI's volatile power demand",
    estimand: 'volatility cost as a share of AI cost of ownership',
    mechanism: 'load spectrum -> asset wear -> least-cost mitigation',
  },
  {
    headline: '2,600 GW stuck in US interconnection queues',
    estimand: 'deliverable generation capacity per year',
    mechanism: 'service capacity + endogenous withdrawal',
  },
]);

// ---------------------------------------------------------------------------
const volatility = evaluateAiPowerVolatility();
console.log('\n1. The volatility tax on AI compute (1 GW campus)');
console.log(
  `   Annualized cost of ownership ${money(volatility.annualTcoUsd)}/yr on ` +
    `${(volatility.annualElectricityMwh / 1e6).toFixed(2)} TWh/yr of electricity.`,
);

console.log('\n   Load spectrum and the buffer it implies');
console.table(
  volatility.revisedV2.bands.map((band) => ({
    band: band.bandId,
    period: `${band.periodSeconds} s`,
    campus_swing: `${(100 * band.campusPeakToPeakShare).toFixed(1)}% p-p`,
    buffer_power: `${band.swingPowerMw.toFixed(0)} MW`,
    buffer_energy: `${sci(band.bufferEnergyMwh)} MWh`,
    cycles_per_yr: sci(band.cyclesPerYear),
    throughput: `${(band.throughputMwhPerYear / 1e3).toFixed(1)} GWh/yr`,
  })),
);

console.log('\n   Mitigation options priced per band (annual cost)');
console.table(
  volatility.revisedV2.bands.map((band) => ({
    band: band.bandId,
    cheapest_buffer: band.cheapestOptionId,
    buffer: money(band.bufferAnnualUsd),
    dummy_workload: money(band.dummyWorkloadAnnualUsd),
    gpu_power_cap: money(band.powerCapAnnualUsd),
    chosen: band.chosenStrategy,
  })),
);

console.log('\n   V1 versus V2');
console.table([
  {
    version: 'V1 raw cycle counting',
    ups_life: years(volatility.initialV1.legacyUpsLifeYears),
    cooling_wear: `${volatility.initialV1.coolingWearMultiplier.toFixed(0)}x`,
    annual_cost: money(volatility.initialV1.totalAnnualUsd),
    share_of_tco: pct(volatility.initialV1.shareOfTco, 0),
  },
  {
    version: 'V2 constrained + least-cost fix',
    ups_life: 'n/a (purpose-built buffer)',
    cooling_wear: `${volatility.revisedV2.coolingWearMultiplier.toFixed(1)}x`,
    annual_cost: money(volatility.revisedV2.totalAnnualUsd),
    share_of_tco: pct(volatility.revisedV2.shareOfTco),
  },
]);
console.log(`   V1 flaw: ${volatility.initialV1.flaw}`);

console.log('\n   V2 cost stack');
console.table([
  {
    item: 'grid-side smoothing (buffers)',
    annual: money(volatility.revisedV2.gridSmoothingAnnualUsd),
  },
  {
    item: 'cooling: absorb the thermal swing',
    annual: money(volatility.revisedV2.unmitigatedCoolingAnnualUsd),
  },
  {
    item: `cooling: chilled-water store (${money(volatility.revisedV2.thermalStorageCapexUsd)} capex)`,
    annual: money(volatility.revisedV2.thermalStorageAnnualUsd),
  },
  {
    item: 'grid stabilization (synchronous condensers)',
    annual: money(volatility.revisedV2.gridStabilizationAnnualUsd),
  },
  {
    item: `TOTAL at the least-cost fix (${volatility.revisedV2.coolingStrategy})`,
    annual: `${money(volatility.revisedV2.totalAnnualUsd)} = $${volatility.revisedV2.perMwhUsd.toFixed(2)}/MWh`,
  },
]);
console.log(
  `   Chiller life without a thermal store: ${volatility.revisedV2.coolingLifeYears.toFixed(1)} yr ` +
    `against a ${volatility.campus.coolingDesignLifeYears} yr design life; the store pays back ` +
    `${volatility.revisedV2.thermalStoragePaybackRatio.toFixed(0)}x.`,
);

console.log(
  '\n   Sensitivity: the two least-identified parameters (thermal time constant, fatigue exponent)',
);
console.table(
  volatility.sensitivity.map((row) => ({
    tau_s: row.timeConstantSeconds,
    fatigue_n: row.fatigueExponent,
    wear_multiplier: `${row.coolingWearMultiplier.toFixed(1)}x`,
    if_absorbed: money(row.coolingIncrementalAnnualUsd),
    total_share_of_tco: pct(row.totalShareOfTco),
  })),
);

// ---------------------------------------------------------------------------
const queue = evaluateInterconnectionQueue();
console.log('\n2. What the interconnection queue actually delivers');
console.table([
  {
    version: 'V1 queue as pipeline',
    queue_vs_peak: `${queue.initialV1.queueToPeakLoadRatio.toFixed(2)}x`,
    deliverable: `${queue.initialV1.naiveDeliverableGw.toFixed(0)} GW`,
    clearing_time: `${queue.initialV1.yearsToClearQueueAtObservedRate.toFixed(0)} yr`,
  },
  {
    version: 'V2 congested service system',
    queue_vs_peak: `${queue.initialV1.queueToPeakLoadRatio.toFixed(2)}x`,
    deliverable: `${queue.revisedV2.baseSteadyState.serviceCapacityGw.toFixed(0)} GW/yr`,
    clearing_time: `${queue.revisedV2.baseSteadyState.expectedWaitYears.toFixed(0)} yr expected wait`,
  },
]);
console.log(`   V1 flaw: ${queue.initialV1.flaw}`);

console.table([
  {
    quantity: "Little's Law arrivals implied by the standing queue",
    value: `${queue.revisedV2.impliedArrivalsGwPerYear.toFixed(0)} GW/yr`,
  },
  {
    quantity: 'completions implied by the 13% historical completion share',
    value: `${queue.revisedV2.impliedCompletionsGwPerYear.toFixed(0)} GW/yr`,
  },
  {
    quantity: 'observed US capacity additions',
    value: `${queue.revisedV2.observedAnnualAdditionsGw.toFixed(0)} GW/yr`,
  },
  {
    quantity: 'completion share consistent with observed additions',
    value: pct(queue.revisedV2.completionShareConsistentWithAdditions, 1),
  },
  {
    quantity: 'overstatement from using the historical completion share',
    value: `${queue.revisedV2.completionOverstatementRatio.toFixed(2)}x`,
  },
]);

console.log('\n   Reform comparative statics');
console.table(
  queue.policies.map((policy) => ({
    policy: policy.id,
    queue: `${policy.queueGw.toFixed(0)} GW`,
    queue_change: pct(policy.queueChangeVsBase, 1),
    completions: `${policy.serviceCapacityGw.toFixed(0)} GW/yr`,
    completions_change: pct(policy.completionsChangeVsBase, 1),
    wait: `${policy.expectedWaitYears.toFixed(0)} yr`,
  })),
);

console.log('\n   What data centers need from that buildout');
console.table([
  {
    quantity: '2030 US data-center average load at 27%/yr',
    value: `${queue.revisedV2.dataCenterLoadGw2030.toFixed(0)} GW`,
  },
  {
    quantity: 'incremental load versus 2026',
    value: `${queue.revisedV2.dataCenterIncrementalLoadGw.toFixed(0)} GW`,
  },
  {
    quantity: 'nameplate capacity required',
    value: `${queue.revisedV2.dataCenterNameplateRequiredGw.toFixed(0)} GW`,
  },
  {
    quantity: 'share of ALL achievable US additions through 2030',
    value: pct(queue.revisedV2.dataCenterShareOfAnnualAdditions, 0),
  },
]);

// ---------------------------------------------------------------------------
console.log('\n3. Does the volatility channel reach the 2025-2100 macro path?');
const macro = evaluateVolatilityMacroLinkage();
console.table(
  macro.rows.map((row) => ({
    case: row.id,
    volatility_tax: pct(row.volatilityTax),
    dc_load_2050: `${row.dataCenterLoad2050TWh.toFixed(0)} TWh`,
    dc_load_2100: `${row.dataCenterLoad2100TWh.toFixed(0)} TWh`,
    dc_change_2100: pct(row.dataCenterLoadChange2100, 2),
    gdp_2100: `$${row.gdp2100.toFixed(0)}T`,
    temp_2100: `${row.temperature2100.toFixed(3)}C`,
    temp_change: `${row.temperatureChange2100 >= 0 ? '+' : ''}${row.temperatureChange2100.toFixed(4)}C`,
  })),
);
console.log(
  `   Elasticity of 2100 data-center load to the volatility tax: ${macro.loadElasticityToTax.toFixed(2)}.`,
);
console.log(`   ${macro.interpretation}`);

console.log('\nBottom line versus the conventional wisdom');
console.table([
  {
    conventional: "AI's volatile power demand is damaging data centers",
    model:
      `Real, and the cooling plant is where it bites (life ${volatility.revisedV2.coolingLifeYears.toFixed(1)} yr ` +
      `versus ${volatility.campus.coolingDesignLifeYears} yr design), but the fix costs ` +
      `${pct(volatility.revisedV2.shareOfTco)} of cost of ownership`,
  },
  {
    conventional: 'volatility is a brake on the AI buildout',
    model: `No: $${volatility.revisedV2.perMwhUsd.toFixed(2)}/MWh, macro-invisible at the mitigated tax`,
  },
  {
    conventional: '2,600 GW of generation is coming',
    model: `${queue.revisedV2.baseSteadyState.serviceCapacityGw.toFixed(0)} GW/yr is coming; queue depth is the rationing device`,
  },
  {
    conventional: 'the grid is the binding constraint on AI',
    model: `Yes, but as a share-of-buildout constraint: ${pct(queue.revisedV2.dataCenterShareOfAnnualAdditions, 0)} of all US additions`,
  },
]);
