/**
 * News-driven experiments for 2026-08-10.
 *
 * Two headlines from the day's cycle, both about whether electricity is the
 * binding constraint on the AI buildout:
 *
 *   1. Bloomberg, 2026-08-06: "Data Centers Are Being Damaged by AI's Volatile
 *      Power Demand" — batteries, generators and cooling systems wearing out
 *      far sooner than expected because AI training load swings hundreds of MW
 *      in seconds.
 *   2. LBNL "Queued Up: 2026 Edition" plus the FERC interconnection docket:
 *      ~2,600 GW sitting in US interconnection queues against a 745 GW peak
 *      load, five-year-plus waits, and a data-center load growing ~27%/yr.
 *
 * Both are modelled V1 (the arithmetic implied by the reporting) then V2 (the
 * same arithmetic with the physical and queueing constraints that the headline
 * framing leaves out).
 */

import { assertFiniteDeep } from 'tsimulation';

import { demandDefaults } from '../../modules/demand.js';
import { runSimulation, type YearResult } from '../../simulation.js';

const SECONDS_PER_YEAR = 31_536_000;
const HOURS_PER_YEAR = 8_760;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Capital recovery factor: annualizes a capex over `years` at rate `rate`. */
function capitalRecoveryFactor(rate: number, years: number): number {
  if (years <= 0) throw new Error('capitalRecoveryFactor needs a positive life');
  if (rate === 0) return 1 / years;
  return rate / (1 - Math.pow(1 + rate, -years));
}

// ---------------------------------------------------------------------------
// 1. The volatility tax on AI compute
// ---------------------------------------------------------------------------

/**
 * One band of the data-center load spectrum. AI load is not a single "swing":
 * it is a superposition of oscillations at wildly different timescales, and the
 * economics of each band are completely different because the buffer energy
 * scales with the period while the cycle count scales with its inverse.
 */
export interface LoadBand {
  id: string;
  label: string;
  /** Oscillation period in seconds. */
  periodSeconds: number;
  /**
   * Peak-to-peak amplitude as a share of IT load, measured at the level of a
   * single synchronized training cluster.
   */
  clusterPeakToPeakShare: number;
  /**
   * Share of the cluster amplitude that survives aggregation to campus scale.
   * 1.0 means every cluster on the campus swings in lockstep.
   */
  campusCorrelation: number;
  /** Share of the year during which the band is active. */
  dutyShareOfYear: number;
}

export interface SmoothingTechnology {
  id: string;
  label: string;
  /** Power-conversion capex, USD per kW of swing power. */
  powerCapexPerKw: number;
  /** Storage-medium capex, USD per kWh of rated energy. */
  energyCapexPerKwh: number;
  /** Maximum continuous discharge rate, rated power over rated energy (1/h). */
  maxCRate: number;
  /** Full-power response time in seconds. */
  responseTimeSeconds: number;
  /** Rated full-depth cycles to end of life. */
  ratedFullCycles: number;
  calendarLifeYears: number;
  roundTripEfficiency: number;
  /**
   * Wöhler exponent k in N(DoD) = N_rated x DoD^-k. Shallow cycles are far
   * gentler per cycle than the rated full-depth cycle; k = 0 reproduces naive
   * cycle counting.
   */
  dodStressExponent: number;
  fixedOmShareOfCapex: number;
}

export interface AiCampusCase {
  itLoadMw: number;
  pue: number;
  utilization: number;
  /** Annualized all-in cost of ownership, USD per MW of IT load per year. */
  annualizedTcoPerMwYear: number;
  electricityPricePerMwh: number;
  discountRate: number;
  /** Installed UPS ride-through at full load, in minutes. */
  legacyUpsRideThroughMinutes: number;
  /** Cooling-plant capex, USD per MW of IT load. */
  coolingCapexPerMw: number;
  coolingDesignLifeYears: number;
  /** First-order thermal time constant of the cooling loop, seconds. */
  coolingThermalTimeConstantSeconds: number;
  /** Coffin-Manson style fatigue exponent for thermal cycling. */
  coolingFatigueExponent: number;
  /**
   * Throughput lost per unit of power shaved by GPU power capping. Measured at
   * 6.7% slower inference for a 30% power cut.
   */
  powerCapThroughputElasticity: number;
  /** Grid-side stabilization capex (synchronous condensers), USD per kW. */
  gridStabilizationCapexPerKw: number;
  gridStabilizationLifeYears: number;
  /** Chilled-water thermal store, USD per kWh of thermal capacity. */
  thermalStorageCapexPerKwhThermal: number;
  /** Heat exchangers and pumping for the thermal store, USD per MW thermal. */
  thermalStorageCapexPerMwThermal: number;
  thermalStorageLifeYears: number;
  thermalStorageOmShareOfCapex: number;
}

/**
 * Load spectrum for a gigawatt-scale AI training campus.
 *
 * Timescales and amplitudes: SemiAnalysis, "AI Training Load Fluctuations at
 * Gigawatt-scale" (2026) and the NERC Large Loads white paper — tens of
 * thousands of GPUs step in lockstep, alternating compute and collective-
 * communication phases every 3-10 s, with checkpointing dropping power "near
 * zero" for milliseconds and job transitions moving the whole cluster. Google
 * Cloud telemetry cited in the same piece puts AI-site swings ~10x the ~1.5 MW
 * typical of cloud sites.
 *
 * campusCorrelation is the parameter the reporting never states: Meta's
 * "tens of megawatts" was measured on a 24k-H100, 30 MW cluster, so cluster-
 * level amplitudes near 1.0 are real. Calibrated here so campus-level swings
 * land at "hundreds of MW on a GW campus", the magnitude NERC describes.
 */
export const aiLoadSpectrum: readonly LoadBand[] = [
  {
    id: 'intra-batch',
    label: 'intra-batch spikes and dips',
    periodSeconds: 0.1,
    clusterPeakToPeakShare: 0.20,
    campusCorrelation: 0.25,
    dutyShareOfYear: 0.6,
  },
  {
    id: 'collective-sync',
    label: 'compute / collective-communication alternation',
    periodSeconds: 5,
    clusterPeakToPeakShare: 0.45,
    campusCorrelation: 0.55,
    dutyShareOfYear: 0.6,
  },
  {
    id: 'checkpoint',
    label: 'checkpoint write and resume',
    periodSeconds: 600,
    clusterPeakToPeakShare: 0.70,
    campusCorrelation: 0.36,
    dutyShareOfYear: 0.6,
  },
  {
    id: 'job-transition',
    label: 'job start, stop and run completion',
    periodSeconds: 14_400,
    clusterPeakToPeakShare: 0.90,
    campusCorrelation: 0.39,
    dutyShareOfYear: 1.0,
  },
];

/**
 * The design basis: a conventional cloud site's load spectrum, against which
 * every wear number in V2 is expressed as a ratio. Using a ratio avoids having
 * to pin down absolute fatigue constants for chillers and battery strings.
 */
export const cloudLoadSpectrum: readonly LoadBand[] = [
  {
    id: 'diurnal',
    label: 'diurnal demand cycle',
    periodSeconds: 86_400,
    clusterPeakToPeakShare: 0.30,
    campusCorrelation: 1.0,
    dutyShareOfYear: 1.0,
  },
  {
    id: 'minutes',
    label: 'request-rate variation',
    periodSeconds: 300,
    clusterPeakToPeakShare: 0.03,
    campusCorrelation: 1.0,
    dutyShareOfYear: 1.0,
  },
  {
    id: 'seconds',
    label: 'per-request jitter',
    periodSeconds: 5,
    clusterPeakToPeakShare: 0.015,
    campusCorrelation: 1.0,
    dutyShareOfYear: 1.0,
  },
];

/**
 * Cost, life and response envelopes for the buffer technologies. Power/energy
 * capex splits and cycle lives from the DOE Storage Innovations 2030
 * supercapacitor assessment (2023), NREL/DOE grid-storage cost benchmarks, and
 * the 100 MW BESS quotes in the SemiAnalysis piece ($38-80M for 2 h, i.e.
 * ~$190-400/kWh installed).
 */
export const smoothingTechnologies: readonly SmoothingTechnology[] = [
  {
    id: 'supercapacitor',
    label: 'supercapacitor bank',
    powerCapexPerKw: 150,
    energyCapexPerKwh: 15_000,
    maxCRate: 600,
    responseTimeSeconds: 0.001,
    ratedFullCycles: 1_000_000,
    calendarLifeYears: 15,
    roundTripEfficiency: 0.95,
    dodStressExponent: 1.0,
    fixedOmShareOfCapex: 0.02,
  },
  {
    id: 'flywheel',
    label: 'flywheel array',
    powerCapexPerKw: 400,
    energyCapexPerKwh: 3_000,
    maxCRate: 12,
    responseTimeSeconds: 0.005,
    ratedFullCycles: 5_000_000,
    calendarLifeYears: 20,
    roundTripEfficiency: 0.86,
    dodStressExponent: 1.0,
    fixedOmShareOfCapex: 0.03,
  },
  {
    id: 'lto',
    label: 'lithium-titanate battery',
    powerCapexPerKw: 150,
    energyCapexPerKwh: 900,
    maxCRate: 6,
    responseTimeSeconds: 0.02,
    ratedFullCycles: 20_000,
    calendarLifeYears: 20,
    roundTripEfficiency: 0.94,
    dodStressExponent: 1.2,
    fixedOmShareOfCapex: 0.02,
  },
  {
    id: 'lfp',
    label: 'utility LFP battery (2 h grid BESS)',
    powerCapexPerKw: 150,
    energyCapexPerKwh: 240,
    maxCRate: 1,
    responseTimeSeconds: 0.05,
    ratedFullCycles: 6_000,
    calendarLifeYears: 15,
    roundTripEfficiency: 0.88,
    dodStressExponent: 1.5,
    fixedOmShareOfCapex: 0.02,
  },
  {
    id: 'legacy-ups',
    label: 'installed standby UPS string',
    powerCapexPerKw: 250,
    energyCapexPerKwh: 400,
    maxCRate: 3,
    responseTimeSeconds: 0.005,
    ratedFullCycles: 500,
    calendarLifeYears: 8,
    roundTripEfficiency: 0.85,
    dodStressExponent: 1.5,
    fixedOmShareOfCapex: 0.03,
  },
];

/**
 * 1 GW hyperscaler AI campus. TCO, capex and utilization from Epoch AI's
 * gigawatt data-center cost breakdown (2026): $38M/MW upfront, $8.5M/MW/yr
 * annualized, servers 60% of annualized TCO, energy ~7%, PUE 1.14, 71%
 * utilization, five-year IT life and fourteen-year facility life.
 */
export const gigawattAiCampus: AiCampusCase = {
  itLoadMw: 1_000,
  pue: 1.14,
  utilization: 0.71,
  annualizedTcoPerMwYear: 8_500_000,
  // US weighted-average industrial rate used in the same Epoch breakdown.
  electricityPricePerMwh: 83.4,
  discountRate: 0.08,
  // Uptime Institute typical Tier III design point.
  legacyUpsRideThroughMinutes: 5,
  // Mechanical plant runs ~20-25% of a ~$12M/MW facility shell-and-power capex.
  coolingCapexPerMw: 2_500_000,
  coolingDesignLifeYears: 20,
  // Chilled-water loop plus plant thermal mass; swept in the sensitivity grid.
  coolingThermalTimeConstantSeconds: 1_800,
  coolingFatigueExponent: 2.0,
  // 6.7% slower LLaMA-65B inference for a 30% power cut (Microsoft Research,
  // "Characterizing Power Management Opportunities for LLMs in the Cloud").
  powerCapThroughputElasticity: 6.7 / 30,
  // Synchronous condensers at $30-60k/MVAr, ~$10-20M for a 1 GW site.
  gridStabilizationCapexPerKw: 15,
  gridStabilizationLifeYears: 30,
  // Chilled-water TES at roughly $140 per ton-hour, i.e. ~$40/kWh thermal.
  thermalStorageCapexPerKwhThermal: 40,
  thermalStorageCapexPerMwThermal: 50_000,
  thermalStorageLifeYears: 30,
  thermalStorageOmShareOfCapex: 0.02,
};

export interface BandPhysics {
  band: LoadBand;
  /** Campus-level peak-to-peak amplitude as a share of IT load. */
  campusPeakToPeakShare: number;
  /** Half-amplitude: the power the buffer must source or sink, MW. */
  swingPowerMw: number;
  /** Energy moved in one half cycle, MWh. Scales with the period. */
  bufferEnergyMwh: number;
  cyclesPerYear: number;
  /** One-way energy through the buffer per year, MWh. */
  throughputMwhPerYear: number;
}

/**
 * For a sinusoidal deviation of half-amplitude A*P/2 and period T, the energy
 * displaced in a half cycle is A*P*T/(2*pi). Note the consequence that makes
 * this problem counterintuitive: annual throughput is A*P*duty/(2*pi) times
 * seconds-per-year and is therefore INDEPENDENT of the period, while the
 * buffer sizing scales with T and the cycle count with 1/T.
 */
export function bandPhysics(band: LoadBand, itLoadMw: number): BandPhysics {
  const campusPeakToPeakShare =
    band.clusterPeakToPeakShare * band.campusCorrelation;
  const swingPowerMw = (campusPeakToPeakShare * itLoadMw) / 2;
  const bufferEnergyMwh =
    (campusPeakToPeakShare * itLoadMw * band.periodSeconds) /
    (2 * Math.PI) /
    3_600;
  const cyclesPerYear =
    (band.dutyShareOfYear * SECONDS_PER_YEAR) / band.periodSeconds;
  return {
    band,
    campusPeakToPeakShare,
    swingPowerMw,
    bufferEnergyMwh,
    cyclesPerYear,
    throughputMwhPerYear: cyclesPerYear * bufferEnergyMwh,
  };
}

export interface BufferOption {
  technologyId: string;
  label: string;
  feasible: boolean;
  infeasibleReason?: string;
  ratedEnergyMwh: number;
  /** Rated energy over the band's swing energy. The C-rate limit forces this. */
  oversizeFactor: number;
  depthOfDischarge: number;
  cycleLimitedLifeYears: number;
  effectiveLifeYears: number;
  capexUsd: number;
  annualizedCapexUsd: number;
  efficiencyLossUsdPerYear: number;
  totalAnnualUsd: number;
}

/**
 * Prices one technology against one band. Two constraints do the work:
 *
 *   - the C-rate limit forces rated energy up to swingPower / maxCRate, which
 *     for the fast bands means oversizing by two to three orders of magnitude;
 *   - the Wöhler DoD scaling then makes the resulting micro-cycles nearly
 *     free in wear terms, because cycles available scale as oversize^k.
 */
export function priceBufferOption(
  physics: BandPhysics,
  technology: SmoothingTechnology,
  campus: AiCampusCase,
  options: { applyDodStress: boolean; applyCRateSizing: boolean },
): BufferOption {
  const cRateFloorMwh = options.applyCRateSizing
    ? physics.swingPowerMw / technology.maxCRate
    : 0;
  const ratedEnergyMwh = Math.max(physics.bufferEnergyMwh, cRateFloorMwh);
  const oversizeFactor = ratedEnergyMwh / physics.bufferEnergyMwh;
  const depthOfDischarge = 1 / oversizeFactor;
  const stressBonus = options.applyDodStress
    ? Math.pow(oversizeFactor, technology.dodStressExponent)
    : 1;
  const cyclesAvailable = technology.ratedFullCycles * stressBonus;
  const cycleLimitedLifeYears = cyclesAvailable / physics.cyclesPerYear;
  const effectiveLifeYears = Math.min(
    technology.calendarLifeYears,
    cycleLimitedLifeYears,
  );
  const capexUsd =
    physics.swingPowerMw * 1_000 * technology.powerCapexPerKw +
    ratedEnergyMwh * 1_000 * technology.energyCapexPerKwh;
  // Replacement-inclusive annualization: a sub-year life annualizes as
  // capex / life, which is what the CRF converges to as life goes to zero.
  const annualizedCapexUsd =
    capexUsd *
    (effectiveLifeYears >= 1
      ? capitalRecoveryFactor(campus.discountRate, effectiveLifeYears)
      : 1 / effectiveLifeYears) +
    capexUsd * technology.fixedOmShareOfCapex;
  const efficiencyLossUsdPerYear =
    physics.throughputMwhPerYear *
    (1 / technology.roundTripEfficiency - 1) *
    campus.electricityPricePerMwh *
    campus.pue;
  const responseFeasible =
    technology.responseTimeSeconds <= physics.band.periodSeconds / 10;
  return {
    technologyId: technology.id,
    label: technology.label,
    feasible: responseFeasible,
    infeasibleReason: responseFeasible
      ? undefined
      : `response ${technology.responseTimeSeconds}s exceeds one tenth of the ${physics.band.periodSeconds}s period`,
    ratedEnergyMwh,
    oversizeFactor,
    depthOfDischarge,
    cycleLimitedLifeYears,
    effectiveLifeYears,
    capexUsd,
    annualizedCapexUsd,
    efficiencyLossUsdPerYear,
    totalAnnualUsd: annualizedCapexUsd + efficiencyLossUsdPerYear,
  };
}

/**
 * Software smoothing: fill the troughs with a dummy workload so the grid sees
 * a flat draw. Cost is the wasted energy, which for a sinusoid is the half
 * amplitude sustained continuously. Meta shipped exactly this as
 * `pytorch_no_powerplant_blowup=1`.
 */
export function priceDummyWorkload(
  physics: BandPhysics,
  campus: AiCampusCase,
): number {
  return (
    physics.swingPowerMw *
    HOURS_PER_YEAR *
    physics.band.dutyShareOfYear *
    campus.pue *
    campus.electricityPricePerMwh
  );
}

/**
 * GPU power capping: shave the peak instead of buffering it. Cost is lost
 * compute throughput, charged at the full annualized TCO because the campus
 * cost is overwhelmingly fixed.
 */
export function priceGpuPowerCap(
  physics: BandPhysics,
  campus: AiCampusCase,
): number {
  const powerReductionShare = physics.campusPeakToPeakShare / 2;
  const throughputLossShare =
    powerReductionShare *
    campus.powerCapThroughputElasticity *
    physics.band.dutyShareOfYear;
  return (
    throughputLossShare * campus.annualizedTcoPerMwYear * campus.itLoadMw
  );
}

/**
 * Damage-weighted cycle load on the mechanical (cooling) plant.
 *
 * Two physical facts the headline framing omits: a chilled-water loop is a
 * first-order low-pass with a time constant of minutes, so it simply does not
 * see the seconds-band oscillation; and fatigue damage goes as amplitude to a
 * power, so small residual swings contribute almost nothing.
 */
export function mechanicalWearIndex(
  spectrum: readonly LoadBand[],
  itLoadMw: number,
  timeConstantSeconds: number,
  fatigueExponent: number,
  options: { applyLowPass: boolean },
): number {
  let wear = 0;
  for (const band of spectrum) {
    const physics = bandPhysics(band, itLoadMw);
    const omega = (2 * Math.PI) / band.periodSeconds;
    const attenuation = options.applyLowPass
      ? 1 / Math.sqrt(1 + Math.pow(omega * timeConstantSeconds, 2))
      : 1;
    const effectiveAmplitude = physics.campusPeakToPeakShare * attenuation;
    wear +=
      physics.cyclesPerYear * Math.pow(effectiveAmplitude, fatigueExponent);
  }
  return wear;
}

export interface CoolingWearResult {
  wearMultiplier: number;
  effectiveLifeYears: number;
  annualizedCostAtDesignLifeUsd: number;
  annualizedCostAtEffectiveLifeUsd: number;
  incrementalAnnualCostUsd: number;
}

export function evaluateCoolingWear(
  campus: AiCampusCase,
  options: { applyLowPass: boolean },
  timeConstantSeconds = campus.coolingThermalTimeConstantSeconds,
  fatigueExponent = campus.coolingFatigueExponent,
): CoolingWearResult {
  const aiWear = mechanicalWearIndex(
    aiLoadSpectrum,
    campus.itLoadMw,
    timeConstantSeconds,
    fatigueExponent,
    options,
  );
  const cloudWear = mechanicalWearIndex(
    cloudLoadSpectrum,
    campus.itLoadMw,
    timeConstantSeconds,
    fatigueExponent,
    options,
  );
  const wearMultiplier = aiWear / cloudWear;
  const effectiveLifeYears = clamp(
    campus.coolingDesignLifeYears / wearMultiplier,
    0.05,
    campus.coolingDesignLifeYears,
  );
  const capex = campus.coolingCapexPerMw * campus.itLoadMw;
  const annualizedCostAtDesignLifeUsd =
    capex * capitalRecoveryFactor(campus.discountRate, campus.coolingDesignLifeYears);
  const annualizedCostAtEffectiveLifeUsd =
    capex *
    (effectiveLifeYears >= 1
      ? capitalRecoveryFactor(campus.discountRate, effectiveLifeYears)
      : 1 / effectiveLifeYears);
  return {
    wearMultiplier,
    effectiveLifeYears,
    annualizedCostAtDesignLifeUsd,
    annualizedCostAtEffectiveLifeUsd,
    incrementalAnnualCostUsd:
      annualizedCostAtEffectiveLifeUsd - annualizedCostAtDesignLifeUsd,
  };
}

export interface BandMitigation {
  bandId: string;
  label: string;
  periodSeconds: number;
  campusPeakToPeakShare: number;
  swingPowerMw: number;
  bufferEnergyMwh: number;
  cyclesPerYear: number;
  throughputMwhPerYear: number;
  cheapestOptionId: string;
  cheapestOptionLabel: string;
  bufferAnnualUsd: number;
  dummyWorkloadAnnualUsd: number;
  powerCapAnnualUsd: number;
  chosenStrategy: 'buffer' | 'dummy-workload' | 'power-cap';
  chosenAnnualUsd: number;
  options: readonly BufferOption[];
}

export interface AiPowerVolatilityResult {
  campus: AiCampusCase;
  annualTcoUsd: number;
  annualElectricityMwh: number;
  initialV1: {
    /** Legacy UPS string aged by raw cycle count, no DoD scaling. */
    legacyUpsLifeYears: number;
    legacyUpsReplacementCostPerYearUsd: number;
    coolingWearMultiplier: number;
    coolingLifeYears: number;
    coolingIncrementalAnnualUsd: number;
    totalAnnualUsd: number;
    shareOfTco: number;
    perMwhUsd: number;
    flaw: string;
  };
  revisedV2: {
    bands: readonly BandMitigation[];
    gridSmoothingAnnualUsd: number;
    /** Cooling-plant wear if the thermal swing is simply absorbed. */
    coolingWearMultiplier: number;
    coolingLifeYears: number;
    unmitigatedCoolingAnnualUsd: number;
    /** Chilled-water store sized to the unflattened thermal bands. */
    thermalStorageCapexUsd: number;
    thermalStorageAnnualUsd: number;
    coolingStrategy: 'thermal-storage' | 'absorb-wear';
    coolingAnnualUsd: number;
    gridStabilizationAnnualUsd: number;
    totalAnnualUsd: number;
    shareOfTco: number;
    perMwhUsd: number;
    /** Cooling wear avoided per dollar of thermal storage. */
    thermalStoragePaybackRatio: number;
    interpretation: string;
  };
  sensitivity: readonly {
    timeConstantSeconds: number;
    fatigueExponent: number;
    coolingWearMultiplier: number;
    coolingIncrementalAnnualUsd: number;
    totalShareOfTco: number;
  }[];
}

export function evaluateAiPowerVolatility(
  campus: AiCampusCase = gigawattAiCampus,
): AiPowerVolatilityResult {
  assertFiniteDeep(campus, 'AI campus case');
  const annualTcoUsd = campus.annualizedTcoPerMwYear * campus.itLoadMw;
  const annualElectricityMwh =
    campus.itLoadMw * campus.pue * campus.utilization * HOURS_PER_YEAR;

  // -- V1: the arithmetic the headline implies -----------------------------
  // Every oscillation in the spectrum is charged against the installed UPS
  // string's rated cycle life, and every oscillation is charged against the
  // cooling plant's fatigue life with no thermal filtering.
  const legacyUps = smoothingTechnologies.find((t) => t.id === 'legacy-ups');
  if (!legacyUps) throw new Error('legacy UPS technology missing');
  const legacyUpsEnergyMwh =
    (campus.itLoadMw * campus.pue * campus.legacyUpsRideThroughMinutes) / 60;
  const totalCyclesPerYear = aiLoadSpectrum.reduce(
    (sum, band) => sum + bandPhysics(band, campus.itLoadMw).cyclesPerYear,
    0,
  );
  const legacyUpsLifeYears = legacyUps.ratedFullCycles / totalCyclesPerYear;
  const legacyUpsCapex = legacyUpsEnergyMwh * 1_000 * legacyUps.energyCapexPerKwh;
  const legacyUpsReplacementCostPerYearUsd =
    legacyUpsCapex / legacyUpsLifeYears;
  const coolingV1 = evaluateCoolingWear(campus, { applyLowPass: false });
  const v1Total =
    legacyUpsReplacementCostPerYearUsd + coolingV1.incrementalAnnualCostUsd;

  // -- V2: the same spectrum with the physics and the cheapest fix ---------
  const bands: BandMitigation[] = aiLoadSpectrum.map((band) => {
    const physics = bandPhysics(band, campus.itLoadMw);
    const options = smoothingTechnologies
      .filter((technology) => technology.id !== 'legacy-ups')
      .map((technology) =>
        priceBufferOption(physics, technology, campus, {
          applyDodStress: true,
          applyCRateSizing: true,
        }),
      );
    const feasible = options.filter((option) => option.feasible);
    if (feasible.length === 0) {
      throw new Error(`no feasible buffer technology for band ${band.id}`);
    }
    const cheapest = feasible.reduce((best, option) =>
      option.totalAnnualUsd < best.totalAnnualUsd ? option : best,
    );
    const dummyWorkloadAnnualUsd = priceDummyWorkload(physics, campus);
    const powerCapAnnualUsd = priceGpuPowerCap(physics, campus);
    const candidates: readonly [BandMitigation['chosenStrategy'], number][] = [
      ['buffer', cheapest.totalAnnualUsd],
      ['dummy-workload', dummyWorkloadAnnualUsd],
      ['power-cap', powerCapAnnualUsd],
    ];
    const [chosenStrategy, chosenAnnualUsd] = candidates.reduce((best, entry) =>
      entry[1] < best[1] ? entry : best,
    );
    return {
      bandId: band.id,
      label: band.label,
      periodSeconds: band.periodSeconds,
      campusPeakToPeakShare: physics.campusPeakToPeakShare,
      swingPowerMw: physics.swingPowerMw,
      bufferEnergyMwh: physics.bufferEnergyMwh,
      cyclesPerYear: physics.cyclesPerYear,
      throughputMwhPerYear: physics.throughputMwhPerYear,
      cheapestOptionId: cheapest.technologyId,
      cheapestOptionLabel: cheapest.label,
      bufferAnnualUsd: cheapest.totalAnnualUsd,
      dummyWorkloadAnnualUsd,
      powerCapAnnualUsd,
      chosenStrategy,
      chosenAnnualUsd,
      options,
    };
  });

  const gridSmoothingAnnualUsd = bands.reduce(
    (sum, band) => sum + band.chosenAnnualUsd,
    0,
  );

  // The cooling channel is a SEPARATE constraint, and this is where the naive
  // reading goes wrong in the other direction. An electrical buffer decouples
  // the grid from the swing, but every watt the GPUs draw still lands in the
  // chilled-water loop whether it came from the substation or from a battery.
  // Only measures that flatten IT power at the source (dummy-workload fill,
  // power capping) or that buffer heat (thermal storage) touch chiller wear.
  const thermallyFlattenedBandIds = new Set(
    bands
      .filter((band) => band.chosenStrategy !== 'buffer')
      .map((band) => band.bandId),
  );
  const thermalSpectrum = aiLoadSpectrum.filter(
    (band) => !thermallyFlattenedBandIds.has(band.id),
  );
  const thermalWear = mechanicalWearIndex(
    thermalSpectrum,
    campus.itLoadMw,
    campus.coolingThermalTimeConstantSeconds,
    campus.coolingFatigueExponent,
    { applyLowPass: true },
  );
  const cloudWear = mechanicalWearIndex(
    cloudLoadSpectrum,
    campus.itLoadMw,
    campus.coolingThermalTimeConstantSeconds,
    campus.coolingFatigueExponent,
    { applyLowPass: true },
  );
  const coolingWearMultiplier = Math.max(thermalWear / cloudWear, 1);
  const coolingCapex = campus.coolingCapexPerMw * campus.itLoadMw;
  const coolingLifeYears = clamp(
    campus.coolingDesignLifeYears / coolingWearMultiplier,
    0.05,
    campus.coolingDesignLifeYears,
  );
  const coolingCostAtDesignLife =
    coolingCapex *
    capitalRecoveryFactor(campus.discountRate, campus.coolingDesignLifeYears);
  const unmitigatedCoolingAnnualUsd =
    coolingCapex *
      (coolingLifeYears >= 1
        ? capitalRecoveryFactor(campus.discountRate, coolingLifeYears)
        : 1 / coolingLifeYears) -
    coolingCostAtDesignLife;

  // Thermal store sized to the largest unflattened band: all IT power becomes
  // heat, so the thermal swing energy equals the electrical swing energy.
  const thermalBandPhysics = thermalSpectrum.map((band) =>
    bandPhysics(band, campus.itLoadMw),
  );
  const thermalStorageEnergyMwh = thermalBandPhysics.reduce(
    (max, physics) => Math.max(max, physics.bufferEnergyMwh),
    0,
  );
  const thermalStoragePowerMw = thermalBandPhysics.reduce(
    (max, physics) => Math.max(max, physics.swingPowerMw),
    0,
  );
  const thermalStorageCapexUsd =
    thermalStorageEnergyMwh * 1_000 * campus.thermalStorageCapexPerKwhThermal +
    thermalStoragePowerMw * campus.thermalStorageCapexPerMwThermal;
  const thermalStorageAnnualUsd =
    thermalStorageCapexUsd *
    (capitalRecoveryFactor(campus.discountRate, campus.thermalStorageLifeYears) +
      campus.thermalStorageOmShareOfCapex);
  const coolingStrategy =
    thermalStorageAnnualUsd < unmitigatedCoolingAnnualUsd
      ? 'thermal-storage'
      : 'absorb-wear';
  const coolingAnnualUsd = Math.min(
    thermalStorageAnnualUsd,
    unmitigatedCoolingAnnualUsd,
  );

  const gridStabilizationAnnualUsd =
    campus.itLoadMw *
    1_000 *
    campus.gridStabilizationCapexPerKw *
    capitalRecoveryFactor(campus.discountRate, campus.gridStabilizationLifeYears);
  const v2Total =
    gridSmoothingAnnualUsd + coolingAnnualUsd + gridStabilizationAnnualUsd;

  // The cooling fatigue exponent and the loop time constant are the two least
  // identified parameters in the model. The point of the grid is not that they
  // are known but that the mitigation caps the exposure: buying the thermal
  // store is cheaper than absorbing the wear across the whole grid, so the
  // volatility tax is bounded even where the fatigue physics is not.
  const sensitivity = [1_800, 600, 300].flatMap((timeConstantSeconds) =>
    [1.0, 1.5, 2.0].map((fatigueExponent) => {
      const result = evaluateCoolingWear(
        campus,
        { applyLowPass: true },
        timeConstantSeconds,
        fatigueExponent,
      );
      const mitigatedCooling = Math.min(
        thermalStorageAnnualUsd,
        result.incrementalAnnualCostUsd,
      );
      return {
        timeConstantSeconds,
        fatigueExponent,
        coolingWearMultiplier: result.wearMultiplier,
        coolingIncrementalAnnualUsd: result.incrementalAnnualCostUsd,
        totalShareOfTco:
          (gridSmoothingAnnualUsd +
            gridStabilizationAnnualUsd +
            mitigatedCooling) /
          annualTcoUsd,
      };
    }),
  );

  return {
    campus,
    annualTcoUsd,
    annualElectricityMwh,
    initialV1: {
      legacyUpsLifeYears,
      legacyUpsReplacementCostPerYearUsd,
      coolingWearMultiplier: coolingV1.wearMultiplier,
      coolingLifeYears: coolingV1.effectiveLifeYears,
      coolingIncrementalAnnualUsd: coolingV1.incrementalAnnualCostUsd,
      totalAnnualUsd: v1Total,
      shareOfTco: v1Total / annualTcoUsd,
      perMwhUsd: v1Total / annualElectricityMwh,
      flaw:
        'Charges every oscillation in the spectrum against rated full-cycle life and against ' +
        'undamped thermal fatigue. Ignores that shallow micro-cycles are orders of magnitude ' +
        'gentler than rated cycles, that the C-rate limit forces massive energy oversizing ' +
        'anyway, that a chilled-water loop low-passes anything faster than minutes, and that ' +
        'an operator buys the cheapest fix rather than absorbing the damage.',
    },
    revisedV2: {
      bands,
      gridSmoothingAnnualUsd,
      coolingWearMultiplier,
      coolingLifeYears,
      unmitigatedCoolingAnnualUsd,
      thermalStorageCapexUsd,
      thermalStorageAnnualUsd,
      coolingStrategy,
      coolingAnnualUsd,
      gridStabilizationAnnualUsd,
      totalAnnualUsd: v2Total,
      shareOfTco: v2Total / annualTcoUsd,
      perMwhUsd: v2Total / annualElectricityMwh,
      thermalStoragePaybackRatio:
        thermalStorageAnnualUsd > 0
          ? unmitigatedCoolingAnnualUsd / thermalStorageAnnualUsd
          : 0,
      interpretation:
        'Volatility is a real engineering cost and a real grid-stability hazard, but as a ' +
        'share of the cost of owning AI compute it is small, and the cheapest mitigation is ' +
        'the one that touches compute throughput least. The electrical and thermal problems ' +
        'are separate: a battery fixes the grid-side swing and does nothing for the chillers.',
    },
    sensitivity,
  };
}

// ---------------------------------------------------------------------------
// 2. What the interconnection queue actually delivers
// ---------------------------------------------------------------------------

export interface InterconnectionQueueCase {
  /** Active capacity in US interconnection queues, GW. */
  activeQueueGw: number;
  activeProjects: number;
  /** Capacity-weighted completion share for the 2000-2020 request cohorts. */
  historicalCompletionShare: number;
  historicalWithdrawalShare: number;
  meanYearsToCompletion: number;
  meanYearsToWithdrawal: number;
  meanYearsCensored: number;
  /** Observed US utility-scale capacity additions, GW per year. */
  observedAnnualAdditionsGw: number;
  usPeakLoadGw: number;
  usAnnualGenerationTwh: number;
  dataCenterAverageLoadGw2023: number;
  dataCenterAverageLoadGw2026: number;
  dataCenterLoadGrowthRate: number;
  /** Capacity factor of the marginal generation portfolio serving new load. */
  newPortfolioCapacityFactor: number;
  /** Average filings per real project (speculative multi-siting). */
  siteMultiplicity: number;
  /** Service-capacity drag as the queue grows: restudies, staff, equipment. */
  congestionDrag: number;
  /** Elasticity of the withdrawal hazard to expected wait. */
  withdrawalWaitElasticity: number;
  horizonYears: number;
}

/**
 * Queue data: LBNL "Queued Up: 2026 Edition" (June 2026) — ~2,600 GW active at
 * end-2025 across ~8,200 projects; 13% of 2000-2020 request capacity had
 * reached commercial operation by end-2025 with 75% withdrawn and 10% still
 * active. US peak load and additions from EIA. Data-center load path from the
 * 2026 reporting: 23 GW (2023) to 42 GW (2026), world capacity 104 GW (2025)
 * to 132 GW (2026), i.e. ~27%/yr.
 *
 * siteMultiplicity is the parameter nobody publishes. ERCOT's own large-load
 * queue is reported at 108 GW "including duplicates" against a 745 GW national
 * peak, which is only coherent at a multiplicity well above one; 3.0 is the
 * midpoint of what utilities describe informally.
 */
export const usInterconnectionQueue: InterconnectionQueueCase = {
  activeQueueGw: 2_600,
  activeProjects: 8_200,
  historicalCompletionShare: 0.13,
  historicalWithdrawalShare: 0.75,
  meanYearsToCompletion: 5.0,
  meanYearsToWithdrawal: 3.0,
  meanYearsCensored: 5.0,
  observedAnnualAdditionsGw: 62,
  usPeakLoadGw: 745,
  usAnnualGenerationTwh: 4_200,
  dataCenterAverageLoadGw2023: 23,
  dataCenterAverageLoadGw2026: 42,
  dataCenterLoadGrowthRate: 0.27,
  newPortfolioCapacityFactor: 0.45,
  siteMultiplicity: 3.0,
  congestionDrag: 0.25,
  withdrawalWaitElasticity: 1.0,
  horizonYears: 4,
};

export interface QueueSteadyState {
  queueGw: number;
  serviceCapacityGw: number;
  expectedWaitYears: number;
  withdrawalHazard: number;
  completionShare: number;
}

/**
 * Steady state of a congested service system: arrivals equal completions plus
 * withdrawals, service capacity degrades with queue length (restudies), and the
 * withdrawal hazard rises with the expected wait.
 *
 *   lambda = S(L) + h(L / S(L)) * L
 */
export function solveQueueSteadyState(
  arrivalsGwPerYear: number,
  referenceServiceGw: number,
  input: InterconnectionQueueCase,
  hazardScale: number,
  referenceQueueGw: number,
  referenceWaitYears: number,
): QueueSteadyState {
  const serviceAt = (queueGw: number): number =>
    referenceServiceGw /
    (1 + input.congestionDrag * (queueGw / referenceQueueGw - 1));
  const balance = (queueGw: number): number => {
    const service = serviceAt(queueGw);
    const wait = queueGw / service;
    const hazard =
      hazardScale * Math.pow(wait / referenceWaitYears, input.withdrawalWaitElasticity);
    return service + hazard * queueGw - arrivalsGwPerYear;
  };
  let low = 1e-6;
  let high = referenceQueueGw * 10;
  if (balance(low) > 0) {
    // Arrivals below the uncongested service rate: no standing queue.
    const service = serviceAt(low);
    return {
      queueGw: 0,
      serviceCapacityGw: Math.min(service, arrivalsGwPerYear),
      expectedWaitYears: 0,
      withdrawalHazard: 0,
      completionShare: 1,
    };
  }
  for (let i = 0; i < 200; i += 1) {
    const mid = 0.5 * (low + high);
    if (balance(mid) > 0) high = mid;
    else low = mid;
  }
  const queueGw = 0.5 * (low + high);
  const serviceCapacityGw = serviceAt(queueGw);
  const wait = queueGw / serviceCapacityGw;
  return {
    queueGw,
    serviceCapacityGw,
    expectedWaitYears: wait,
    withdrawalHazard:
      hazardScale * Math.pow(wait / referenceWaitYears, input.withdrawalWaitElasticity),
    completionShare: serviceCapacityGw / arrivalsGwPerYear,
  };
}

export interface QueuePolicyScenario {
  id: string;
  label: string;
  queueGw: number;
  serviceCapacityGw: number;
  expectedWaitYears: number;
  completionShare: number;
  queueChangeVsBase: number;
  completionsChangeVsBase: number;
}

export interface InterconnectionQueueResult {
  case: InterconnectionQueueCase;
  initialV1: {
    queueToPeakLoadRatio: number;
    naiveDeliverableGw: number;
    naiveDeliverableAsShareOfPeak: number;
    yearsToClearQueueAtObservedRate: number;
    flaw: string;
  };
  revisedV2: {
    meanResidenceYears: number;
    impliedArrivalsGwPerYear: number;
    impliedCompletionsGwPerYear: number;
    observedAnnualAdditionsGw: number;
    completionShareConsistentWithAdditions: number;
    completionOverstatementRatio: number;
    baseSteadyState: QueueSteadyState;
    dataCenterLoadGw2030: number;
    dataCenterIncrementalLoadGw: number;
    dataCenterNameplateRequiredGw: number;
    dataCenterShareOfAnnualAdditions: number;
    interpretation: string;
  };
  policies: readonly QueuePolicyScenario[];
}

export function evaluateInterconnectionQueue(
  input: InterconnectionQueueCase = usInterconnectionQueue,
): InterconnectionQueueResult {
  assertFiniteDeep(input, 'interconnection queue case');
  const stillActiveShare = Math.max(
    0,
    1 - input.historicalCompletionShare - input.historicalWithdrawalShare,
  );

  // -- V1: the queue as a pipeline ----------------------------------------
  const naiveDeliverableGw =
    input.activeQueueGw * input.historicalCompletionShare;
  const v1 = {
    queueToPeakLoadRatio: input.activeQueueGw / input.usPeakLoadGw,
    naiveDeliverableGw,
    naiveDeliverableAsShareOfPeak: naiveDeliverableGw / input.usPeakLoadGw,
    yearsToClearQueueAtObservedRate:
      input.activeQueueGw / input.observedAnnualAdditionsGw,
    flaw:
      'Treats the queue as a stock that drains at a historical completion rate. It has no ' +
      'time dimension, no service capacity, and no account of the fact that the completion ' +
      'rate is itself produced by congestion: developers withdraw because the wait is long, ' +
      'and the wait is long because the queue is deep.',
  };

  // -- V2: Little's Law, then an endogenous-withdrawal steady state --------
  const meanResidenceYears =
    input.historicalCompletionShare * input.meanYearsToCompletion +
    input.historicalWithdrawalShare * input.meanYearsToWithdrawal +
    stillActiveShare * input.meanYearsCensored;
  const impliedArrivalsGwPerYear = input.activeQueueGw / meanResidenceYears;
  const impliedCompletionsGwPerYear =
    impliedArrivalsGwPerYear * input.historicalCompletionShare;
  const completionShareConsistentWithAdditions =
    input.observedAnnualAdditionsGw / impliedArrivalsGwPerYear;

  const referenceServiceGw = input.observedAnnualAdditionsGw;
  const referenceQueueGw = input.activeQueueGw;
  const referenceWaitYears = referenceQueueGw / referenceServiceGw;
  const hazardScale =
    (impliedArrivalsGwPerYear - referenceServiceGw) / referenceQueueGw;
  const baseSteadyState = solveQueueSteadyState(
    impliedArrivalsGwPerYear,
    referenceServiceGw,
    input,
    hazardScale,
    referenceQueueGw,
    referenceWaitYears,
  );

  const dataCenterLoadGw2030 =
    input.dataCenterAverageLoadGw2026 *
    Math.pow(1 + input.dataCenterLoadGrowthRate, input.horizonYears);
  const dataCenterIncrementalLoadGw =
    dataCenterLoadGw2030 - input.dataCenterAverageLoadGw2026;
  const dataCenterNameplateRequiredGw =
    dataCenterIncrementalLoadGw / input.newPortfolioCapacityFactor;
  const dataCenterShareOfAnnualAdditions =
    dataCenterNameplateRequiredGw /
    input.horizonYears /
    baseSteadyState.serviceCapacityGw;

  const policyDefinitions = [
    {
      id: 'cull-duplicates',
      label: 'readiness deposits halve speculative multi-siting',
      arrivals: impliedArrivalsGwPerYear * (1.5 / input.siteMultiplicity),
      service: referenceServiceGw,
    },
    {
      id: 'faster-service',
      label: 'study and construction throughput up 50%',
      arrivals: impliedArrivalsGwPerYear,
      service: referenceServiceGw * 1.5,
    },
    {
      id: 'both',
      label: 'both reforms together',
      arrivals: impliedArrivalsGwPerYear * (1.5 / input.siteMultiplicity),
      service: referenceServiceGw * 1.5,
    },
  ];
  const policies: QueuePolicyScenario[] = policyDefinitions.map((definition) => {
    const state = solveQueueSteadyState(
      definition.arrivals,
      definition.service,
      input,
      hazardScale,
      referenceQueueGw,
      referenceWaitYears,
    );
    return {
      id: definition.id,
      label: definition.label,
      queueGw: state.queueGw,
      serviceCapacityGw: state.serviceCapacityGw,
      expectedWaitYears: state.expectedWaitYears,
      completionShare: state.completionShare,
      queueChangeVsBase: state.queueGw / baseSteadyState.queueGw - 1,
      completionsChangeVsBase:
        state.serviceCapacityGw / baseSteadyState.serviceCapacityGw - 1,
    };
  });

  return {
    case: input,
    initialV1: v1,
    revisedV2: {
      meanResidenceYears,
      impliedArrivalsGwPerYear,
      impliedCompletionsGwPerYear,
      observedAnnualAdditionsGw: input.observedAnnualAdditionsGw,
      completionShareConsistentWithAdditions,
      completionOverstatementRatio:
        impliedCompletionsGwPerYear / input.observedAnnualAdditionsGw,
      baseSteadyState,
      dataCenterLoadGw2030,
      dataCenterIncrementalLoadGw,
      dataCenterNameplateRequiredGw,
      dataCenterShareOfAnnualAdditions,
      interpretation:
        'Completions are set by service capacity, not by queue depth. The queue is the ' +
        'rationing device that absorbs the difference, so its headline size carries almost ' +
        'no information about how much capacity will be delivered.',
    },
    policies,
  };
}

// ---------------------------------------------------------------------------
// 3. Does any of this reach the macro path?
// ---------------------------------------------------------------------------

/**
 * The repository's demand module rations data-center load with a
 * willingness-to-pay ceiling on the electricity-bill share of GDP: equilibrium
 * load is ceiling x GDP / LCOE. A volatility tax raises the all-in cost of
 * owning AI compute without raising the electricity bill, so it shrinks the
 * budget left for electricity by tax/(1 + tax). That maps one-for-one onto an
 * effective ceiling of ceiling/(1 + tax), which is how the tax is injected into
 * the full 2025-2100 run here.
 */
export interface VolatilityMacroCase {
  id: string;
  label: string;
  /** Volatility tax as a share of annualized AI cost of ownership. */
  volatilityTax: number;
}

export interface VolatilityMacroRow {
  id: string;
  label: string;
  volatilityTax: number;
  effectiveSpendCeiling: number;
  dataCenterLoad2050TWh: number;
  dataCenterLoad2100TWh: number;
  electricityDemand2100TWh: number;
  gdp2100: number;
  temperature2100: number;
  dataCenterLoadChange2100: number;
  gdpChange2100: number;
  temperatureChange2100: number;
}

export interface VolatilityMacroResult {
  rows: readonly VolatilityMacroRow[];
  /** d ln(2100 data-center load) / d ln(1 + tax). */
  loadElasticityToTax: number;
  interpretation: string;
}

function rowAt(results: readonly YearResult[], year: number): YearResult {
  const row = results.find((candidate) => candidate.year === year);
  if (!row) throw new Error(`Missing simulation row for ${year}`);
  return row;
}

export function evaluateVolatilityMacroLinkage(
  cases: readonly VolatilityMacroCase[] = [
    { id: 'none', label: 'no volatility tax', volatilityTax: 0 },
    {
      id: 'mitigated',
      label: 'V2 least-cost mitigation',
      volatilityTax: 0.0078,
    },
    {
      id: 'unmitigated-cooling',
      label: 'chillers absorb the thermal swing (no retrofit)',
      volatilityTax: 0.064,
    },
    {
      id: 'binding',
      label: 'hypothetical binding volatility tax',
      volatilityTax: 0.25,
    },
  ],
): VolatilityMacroResult {
  const baseCeiling = demandDefaults.dataCenterPowerSpendCeiling;
  const rows: VolatilityMacroRow[] = [];
  let reference: VolatilityMacroRow | undefined;
  for (const entry of cases) {
    const effectiveSpendCeiling = baseCeiling / (1 + entry.volatilityTax);
    const result = runSimulation({
      demand: { dataCenterPowerSpendCeiling: effectiveSpendCeiling },
    });
    const y2050 = rowAt(result.results, 2050);
    const y2100 = rowAt(result.results, 2100);
    const row: VolatilityMacroRow = {
      id: entry.id,
      label: entry.label,
      volatilityTax: entry.volatilityTax,
      effectiveSpendCeiling,
      dataCenterLoad2050TWh: y2050.dataCenterLoadTWh,
      dataCenterLoad2100TWh: y2100.dataCenterLoadTWh,
      electricityDemand2100TWh: y2100.electricityDemand,
      gdp2100: y2100.gdp,
      temperature2100: y2100.temperature,
      dataCenterLoadChange2100: reference
        ? y2100.dataCenterLoadTWh / reference.dataCenterLoad2100TWh - 1
        : 0,
      gdpChange2100: reference ? y2100.gdp / reference.gdp2100 - 1 : 0,
      temperatureChange2100: reference
        ? y2100.temperature - reference.temperature2100
        : 0,
    };
    if (!reference) reference = row;
    rows.push(row);
  }
  const base = rows[0];
  const strongest = rows[rows.length - 1];
  const loadElasticityToTax =
    Math.log(strongest.dataCenterLoad2100TWh / base.dataCenterLoad2100TWh) /
    Math.log(1 + strongest.volatilityTax);
  return {
    rows,
    loadElasticityToTax,
    interpretation:
      'The volatility channel enters the macro model only through the willingness-to-pay ' +
      'ceiling on data-center electricity, where the near-unit elasticity is a budget ' +
      'identity rather than a result. At the mitigated tax the 2100 path moves by well under ' +
      'a percent. Data-center load is a GDP-neutral electricity sink in this model with the ' +
      'AI payoff off by default, so shrinking it frees useful energy for production and 2100 ' +
      'GDP edges up: the sign is a property of that assumption, not evidence that volatility ' +
      'is good for growth.',
  };
}
