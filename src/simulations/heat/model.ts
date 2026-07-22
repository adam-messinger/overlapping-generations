import {
  HEAT_AGE_GROUPS,
  heatEvidence,
  type HeatAdaptation,
  type HeatAgeGroup,
  type HeatEvent,
} from './data.js';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const AGE_VULNERABILITY: Record<HeatAgeGroup, number> = Object.fromEntries(
  HEAT_AGE_GROUPS.map((age) => [
    age,
    heatEvidence.europe2022MortalityPerMillion[age] /
      heatEvidence.europe2022MortalityPerMillion.age65to79,
  ]),
) as Record<HeatAgeGroup, number>;

export interface HeatPowerResult {
  coolingDegreeDays: number;
  populationCoolingCoverage: number;
  coolingElectricityTwh: number;
  unmanagedCoolingPeakGw: number;
  managedCoolingPeakGw: number;
  totalPeakGw: number;
  firmCapacityGw: number;
  reserveMarginGw: number;
  overloadOutageFraction: number;
  effectiveGridUptime: number;
}

export interface HeatFoodResult {
  extremeDegreeDays: number;
  lossWithinExposedCrops: number;
  aggregateSeasonalYieldLoss: number;
  irrigatedDamageAvoided: number;
}

export interface HeatMortalityResult {
  thermalLoad: number;
  deathsByAge: Record<HeatAgeGroup, number>;
  totalDeaths: number;
  shareAge65Plus: number;
  averageRiskMultiplier: number;
}

export interface HeatSimulationResult {
  event: HeatEvent;
  adaptation: HeatAdaptation;
  mortalityScale: number;
  power: HeatPowerResult;
  food: HeatFoodResult;
  mortality: HeatMortalityResult;
}

function validateInputs(event: HeatEvent, adaptation: HeatAdaptation): void {
  const ageShare = HEAT_AGE_GROUPS.reduce((sum, age) => sum + event.ageShares[age], 0);
  if (Math.abs(ageShare - 1) > 1e-6) throw new Error('Heat-event age shares must sum to one');
  if (event.populationMillions <= 0 || event.heatDays <= 0) {
    throw new Error('Heat-event population and duration must be positive');
  }
  for (const age of HEAT_AGE_GROUPS) {
    if (event.ageShares[age] < 0) throw new Error(`Negative age share for ${age}`);
    if (adaptation.coolingAccess[age] < 0 || adaptation.coolingAccess[age] > 1) {
      throw new Error(`Cooling access for ${age} must be between zero and one`);
    }
  }
}

function simulatePower(event: HeatEvent, adaptation: HeatAdaptation): HeatPowerResult {
  const effectiveDay = event.meanDayMaximumC + event.urbanHeatIslandC - adaptation.passiveCoolingC;
  const effectiveNight = event.meanNightMinimumC + event.urbanHeatIslandC - adaptation.passiveCoolingC;
  const effectiveMean = 0.55 * effectiveDay + 0.45 * effectiveNight;
  const coolingDegreeDays = event.heatDays * Math.max(0, effectiveMean - 22);
  const populationCoolingCoverage = HEAT_AGE_GROUPS.reduce(
    (sum, age) => sum + event.ageShares[age] * adaptation.coolingAccess[age],
    0,
  );

  // 0.55 kWh/person/cooling-degree-day and 0.55 kW/person at the event peak
  // are engineering scenario coefficients. They are exposed for audit here
  // rather than inferred from the mortality fit.
  const coolingElectricityTwh =
    event.populationMillions * populationCoolingCoverage * coolingDegreeDays *
    0.55 * adaptation.coolingEfficiencyMultiplier / 1_000;
  const peakTemperatureMultiplier = clamp(
    1 + 0.06 * (effectiveDay - 37.55),
    0.65,
    1.50,
  );
  const unmanagedCoolingPeakGw =
    event.populationMillions * populationCoolingCoverage * 0.55 * peakTemperatureMultiplier;
  const managedCoolingPeakGw = unmanagedCoolingPeakGw *
    adaptation.coolingEfficiencyMultiplier * (1 - adaptation.demandResponseShare);
  const firmCapacityGw = event.firmPowerCapacityGw + adaptation.additionalFirmCapacityGw;
  const totalPeakGw = event.baseNonCoolingPeakGw + managedCoolingPeakGw;
  const reserveMarginGw = firmCapacityGw - totalPeakGw;
  const overloadOutageFraction = reserveMarginGw >= 0
    ? 0
    : clamp((-reserveMarginGw / Math.max(1, managedCoolingPeakGw)) * 0.8, 0, 0.35);
  const effectiveGridUptime = adaptation.mechanicalGridUptime * (1 - overloadOutageFraction);

  return {
    coolingDegreeDays,
    populationCoolingCoverage,
    coolingElectricityTwh,
    unmanagedCoolingPeakGw,
    managedCoolingPeakGw,
    totalPeakGw,
    firmCapacityGw,
    reserveMarginGw,
    overloadOutageFraction,
    effectiveGridUptime,
  };
}

function simulateFood(event: HeatEvent, adaptation: HeatAdaptation): HeatFoodResult {
  const effectiveCropTemperature = event.meanDayMaximumC + event.urbanHeatIslandC -
    adaptation.passiveCoolingC - adaptation.cropHeatToleranceC;
  const extremeDegreeDays = event.heatDays * event.cropHotHoursShare *
    Math.max(0, effectiveCropTemperature - event.cropThresholdC);
  const preIrrigationLoss = 1 - Math.exp(
    -heatEvidence.maizeLossPerExtremeDegreeDay * extremeDegreeDays,
  );
  const irrigatedDamageAvoided = preIrrigationLoss *
    adaptation.irrigatedCropShare * adaptation.irrigationDamageReduction;
  const lossWithinExposedCrops = clamp(preIrrigationLoss - irrigatedDamageAvoided, 0, 1);
  return {
    extremeDegreeDays,
    lossWithinExposedCrops,
    aggregateSeasonalYieldLoss: lossWithinExposedCrops * event.cropSensitiveOutputShare,
    irrigatedDamageAvoided,
  };
}

function mortalityThermalLoad(event: HeatEvent, adaptation: HeatAdaptation): number {
  const effectiveDay = event.meanDayMaximumC + event.urbanHeatIslandC - adaptation.passiveCoolingC;
  const effectiveNight = event.meanNightMinimumC + event.urbanHeatIslandC - adaptation.passiveCoolingC;
  const dayExcess = Math.max(0, effectiveDay - event.mortalityDayThresholdC);
  const nightExcess = Math.max(0, effectiveNight - event.mortalityNightThresholdC);
  const compoundNightMultiplier = 1 + 0.45 * event.compoundHotNightShare;
  return event.heatDays * (dayExcess + 0.70 * nightExcess) *
    compoundNightMultiplier * event.humidityRiskMultiplier;
}

function simulateMortality(
  event: HeatEvent,
  adaptation: HeatAdaptation,
  power: HeatPowerResult,
  mortalityScale: number,
): HeatMortalityResult {
  const thermalLoad = mortalityThermalLoad(event, adaptation);
  const deathsByAge = {} as Record<HeatAgeGroup, number>;
  let weightedRiskBeforeAdaptation = 0;
  let weightedRiskAfterAdaptation = 0;

  for (const age of HEAT_AGE_GROUPS) {
    const structuralFactor = 1 - adaptation.structuralMortalityRiskReduction;
    const warningFactor = 1 - adaptation.warningCoverage * adaptation.warningMortalityEfficacy;
    const outreachFactor = 1 - adaptation.outreachCoverage[age] *
      adaptation.outreachMortalityEfficacy;
    const coolingFactor = 1 - adaptation.coolingAccess[age] *
      adaptation.coolingMortalityEfficacy * power.effectiveGridUptime;
    const riskMultiplier = structuralFactor * warningFactor * outreachFactor * coolingFactor;
    const unadaptedWeight = event.ageShares[age] * AGE_VULNERABILITY[age];
    const adaptedWeight = unadaptedWeight * riskMultiplier;
    weightedRiskBeforeAdaptation += unadaptedWeight;
    weightedRiskAfterAdaptation += adaptedWeight;
    deathsByAge[age] = event.populationMillions * mortalityScale * thermalLoad * adaptedWeight;
  }

  const totalDeaths = HEAT_AGE_GROUPS.reduce((sum, age) => sum + deathsByAge[age], 0);
  return {
    thermalLoad,
    deathsByAge,
    totalDeaths,
    shareAge65Plus: totalDeaths > 0
      ? (deathsByAge.age65to79 + deathsByAge.age80plus) / totalDeaths
      : 0,
    averageRiskMultiplier: weightedRiskBeforeAdaptation > 0
      ? weightedRiskAfterAdaptation / weightedRiskBeforeAdaptation
      : 0,
  };
}

export function simulateHeatEvent(
  event: HeatEvent,
  adaptation: HeatAdaptation,
  mortalityScale: number,
): HeatSimulationResult {
  validateInputs(event, adaptation);
  if (!Number.isFinite(mortalityScale) || mortalityScale < 0) {
    throw new Error('Mortality scale must be finite and non-negative');
  }
  const power = simulatePower(event, adaptation);
  const food = simulateFood(event, adaptation);
  const mortality = simulateMortality(event, adaptation, power, mortalityScale);
  return { event, adaptation, mortalityScale, power, food, mortality };
}

export function fitMortalityScale(
  event: HeatEvent,
  adaptation: HeatAdaptation,
  observedDeaths: number,
): number {
  const unit = simulateHeatEvent(event, adaptation, 1).mortality.totalDeaths;
  if (unit <= 0) throw new Error('Cannot fit mortality scale to an event with zero modeled risk');
  return observedDeaths / unit;
}
