import { REGIONS, type Region } from '../../domain-types.js';
import {
  hormuzDefaults,
  type HormuzModelParams,
  type HormuzScenario,
  type OilMarketParams,
  type TradedCommodityParams,
} from './hormuz-data.js';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const DAYS_PER_MONTH = 365.25 / 12;

export interface CommodityMonthResult {
  baselineDemandPerDay: number;
  normalHormuzFlowPerDay: number;
  blockedHormuzFlowPerDay: number;
  bypassFlowPerDay: number;
  alternativeSupplyPerDay: number;
  inventoryDrawPerDay: number;
  inventoryRemaining: number;
  physicalSupplyRatio: number;
  priceMultiple: number;
  demandRatio: number;
  rationingRatio: number;
  netPhysicalSupplyLossPerDay: number;
}

export interface FertilizerMonthResult {
  blockedTradeShare: number;
  alternativeSupplyShare: number;
  inventoryDrawShare: number;
  inventoryRemainingMonths: number;
  physicalSupplyRatio: number;
  priceMultiple: number;
  applicationRatio: number;
  cropYieldMultiplier: number;
  foodAvailabilityMultiplier: number;
}

export interface RegionalHormuzMonthResult {
  oilAvailability: number;
  gasAvailability: number;
  oilPriceMultiple: number;
  gasPriceMultiple: number;
  /** Terms-of-trade and stranded-export effect, before energy availability. */
  tradeIncomeFactor: number;
}

export interface HormuzMonthResult {
  index: number;
  year: number;
  month: number;
  throughput: number;
  oil: CommodityMonthResult;
  lng: CommodityMonthResult;
  fertilizer: FertilizerMonthResult;
  gulfCrudeShutInPerDay: number;
  gulfExportStorageRemainingMillionBarrels: number;
  regional: Readonly<Record<Region, RegionalHormuzMonthResult>>;
}

export interface AnnualRegionalHormuzShock {
  oilAvailability: number;
  gasAvailability: number;
  oilPriceMultiple: number;
  gasPriceMultiple: number;
  tradeIncomeFactor: number;
}

export interface AnnualHormuzShock {
  year: number;
  monthsModeled: number;
  oilPriceMultiple: number;
  gasPriceMultiple: number;
  fertilizerPriceMultiple: number;
  oilAvailability: number;
  lngAvailability: number;
  fertilizerApplicationRatio: number;
  cropYieldMultiplier: number;
  foodAvailabilityMultiplier: number;
  peakOilPriceMultiple: number;
  peakLngPriceMultiple: number;
  peakFertilizerPriceMultiple: number;
  peakGulfCrudeShutInPerDay: number;
  regional: Readonly<Record<Region, AnnualRegionalHormuzShock>>;
}

export interface HormuzSimulationResult {
  scenario: HormuzScenario;
  params: HormuzModelParams;
  months: readonly HormuzMonthResult[];
  annual: readonly AnnualHormuzShock[];
}

interface CommodityState {
  inventory: number;
  disruptionMonths: number;
}

interface CommodityStepOptions {
  throughput: number;
  bypassCapacityPerDay?: number;
  bypassAvailability?: number;
  bypassRampMonths?: number;
}

function stepCommodity(
  params: TradedCommodityParams,
  state: CommodityState,
  options: CommodityStepOptions,
): { state: CommodityState; result: CommodityMonthResult } {
  const throughput = clamp(options.throughput, 0, 1);
  const disrupted = throughput < 0.999;
  const disruptionMonths = disrupted ? state.disruptionMonths + 1 : 0;
  const blocked = params.hormuzFlowPerDay * (1 - throughput);
  const bypassRamp = disrupted
    ? clamp(disruptionMonths / Math.max(options.bypassRampMonths ?? 1, 1), 0, 1)
    : 0;
  const bypass = Math.min(
    blocked,
    (options.bypassCapacityPerDay ?? 0) *
      (options.bypassAvailability ?? 1) *
      bypassRamp,
  );
  const alternativeRamp = disrupted
    ? 1 - Math.exp(-disruptionMonths / Math.max(params.alternativeSupplyRampMonths, 0.1))
    : 0;
  const alternative = params.alternativeSupplyMaxPerDay * alternativeRamp;
  const supplyBeforeStocks = params.globalDemandPerDay - blocked + bypass + alternative;
  const gapBeforeStocks = Math.max(0, params.globalDemandPerDay - supplyBeforeStocks);
  const inventoryDraw = Math.min(
    gapBeforeStocks,
    params.maxInventoryDrawPerDay,
    state.inventory / DAYS_PER_MONTH,
  );
  const physicalSupply = Math.max(0, supplyBeforeStocks + inventoryDraw);
  const physicalSupplyRatio = clamp(physicalSupply / params.globalDemandPerDay, 0.01, 1.2);
  // The first month is governed by very inelastic installed equipment. Over
  // subsequent months conservation, fuel switching, and output adjustment
  // make demand more elastic, allowing prices to fall even before full repair.
  const elasticityRamp = disrupted
    ? 1 - Math.exp(
      -Math.max(0, disruptionMonths - 1) /
        Math.max(params.demandElasticityRampMonths, 0.1),
    )
    : 0;
  const effectiveDemandElasticity = params.demandElasticity +
    (params.mediumRunDemandElasticity - params.demandElasticity) * elasticityRamp;
  const scarcityPrice = physicalSupplyRatio < 1
    ? Math.pow(1 / physicalSupplyRatio, 1 / Math.max(effectiveDemandElasticity, 0.01))
    : 1;
  const riskPrice = 1 + params.routeRiskPremium * (1 - throughput);
  const priceMultiple = clamp(scarcityPrice * riskPrice, 1, params.maxPriceMultiple);
  const demandRatio = clamp(
    Math.pow(priceMultiple, -effectiveDemandElasticity),
    0,
    1,
  );
  const rationingRatio = Math.max(0, demandRatio - physicalSupplyRatio);

  return {
    state: {
      inventory: Math.max(0, state.inventory - inventoryDraw * DAYS_PER_MONTH),
      disruptionMonths,
    },
    result: {
      baselineDemandPerDay: params.globalDemandPerDay,
      normalHormuzFlowPerDay: params.hormuzFlowPerDay,
      blockedHormuzFlowPerDay: blocked,
      bypassFlowPerDay: bypass,
      alternativeSupplyPerDay: alternative,
      inventoryDrawPerDay: inventoryDraw,
      inventoryRemaining: Math.max(0, state.inventory - inventoryDraw * DAYS_PER_MONTH),
      physicalSupplyRatio,
      priceMultiple,
      demandRatio,
      rationingRatio,
      netPhysicalSupplyLossPerDay: Math.max(0, params.globalDemandPerDay - physicalSupply),
    },
  };
}

interface FertilizerState {
  inventory: number;
  disruptionMonths: number;
}

function stepFertilizer(
  params: HormuzModelParams['fertilizer'],
  state: FertilizerState,
  throughput: number,
  lngPriceMultiple: number,
): { state: FertilizerState; result: FertilizerMonthResult } {
  const disrupted = throughput < 0.999;
  const disruptionMonths = disrupted ? state.disruptionMonths + 1 : 0;
  const blockedTradeShare = params.hormuzTradeShare * (1 - throughput);
  const alternativeRamp = disrupted
    ? 1 - Math.exp(-disruptionMonths / Math.max(params.alternativeSupplyRampMonths, 0.1))
    : 0;
  const alternativeSupplyShare = Math.min(
    blockedTradeShare,
    params.alternativeSupplyMaxShare * alternativeRamp,
  );
  const supplyBeforeStocks = 1 - blockedTradeShare + alternativeSupplyShare;
  const gapBeforeStocks = Math.max(0, 1 - supplyBeforeStocks);
  const inventoryDrawShare = Math.min(
    gapBeforeStocks,
    params.maxInventoryDrawSharePerMonth,
    state.inventory,
  );
  const physicalSupplyRatio = clamp(supplyBeforeStocks + inventoryDrawShare, 0.1, 1);
  const scarcityPrice = Math.pow(
    1 / physicalSupplyRatio,
    1 / Math.max(params.demandElasticity, 0.01),
  );
  const priceMultiple = clamp(
    scarcityPrice * (1 + params.gasPricePassThrough * Math.max(0, lngPriceMultiple - 1)),
    1,
    params.maxPriceMultiple,
  );
  const priceRationedDemand = Math.pow(priceMultiple, -params.demandElasticity);
  const tradedApplicationRatio = clamp(
    Math.min(physicalSupplyRatio, priceRationedDemand),
    0,
    1,
  );
  // The price is set on the internationally traded margin. Crop yields depend
  // on total application, including domestic and otherwise non-traded supply.
  const applicationRatio = clamp(
    1 -
      params.tradedSupplyShareOfGlobalUse *
        (1 - tradedApplicationRatio),
    0,
    1,
  );
  const cropYieldMultiplier = clamp(
    1 - params.fertilizerYieldContribution * (1 - applicationRatio),
    0.5,
    1,
  );
  const foodAvailabilityMultiplier = clamp(
    1 - params.harvestPassThrough * (1 - cropYieldMultiplier),
    0.5,
    1,
  );

  return {
    state: {
      inventory: Math.max(0, state.inventory - inventoryDrawShare),
      disruptionMonths,
    },
    result: {
      blockedTradeShare,
      alternativeSupplyShare,
      inventoryDrawShare,
      inventoryRemainingMonths: Math.max(0, state.inventory - inventoryDrawShare),
      physicalSupplyRatio,
      priceMultiple,
      applicationRatio,
      cropYieldMultiplier,
      foodAvailabilityMultiplier,
    },
  };
}

function nextCalendarMonth(
  startYear: number,
  startMonth: number,
  index: number,
): { year: number; month: number } {
  const zeroBased = startMonth - 1 + index;
  return {
    year: startYear + Math.floor(zeroBased / 12),
    month: (zeroBased % 12) + 1,
  };
}

function averageWithNormal(
  rows: readonly HormuzMonthResult[],
  selector: (row: HormuzMonthResult) => number,
): number {
  const observed = rows.reduce((sum, row) => sum + selector(row), 0);
  return (observed + Math.max(0, 12 - rows.length)) / 12;
}

function summarizeAnnual(
  months: readonly HormuzMonthResult[],
  params: HormuzModelParams,
): AnnualHormuzShock[] {
  const byYear = new Map<number, HormuzMonthResult[]>();
  for (const month of months) {
    const rows = byYear.get(month.year) ?? [];
    rows.push(month);
    byYear.set(month.year, rows);
  }

  return [...byYear.entries()].map(([year, rows]) => {
    const regional = {} as Record<Region, AnnualRegionalHormuzShock>;
    for (const region of REGIONS) {
      regional[region] = {
        oilAvailability: averageWithNormal(rows, (row) => row.regional[region].oilAvailability),
        gasAvailability: averageWithNormal(rows, (row) => row.regional[region].gasAvailability),
        oilPriceMultiple: averageWithNormal(rows, (row) => row.regional[region].oilPriceMultiple),
        gasPriceMultiple: averageWithNormal(rows, (row) => row.regional[region].gasPriceMultiple),
        tradeIncomeFactor: averageWithNormal(rows, (row) => row.regional[region].tradeIncomeFactor),
      };
    }
    return {
      year,
      monthsModeled: rows.length,
      oilPriceMultiple: averageWithNormal(rows, (row) => row.oil.priceMultiple),
      gasPriceMultiple: averageWithNormal(
        rows,
        (row) => 1 + (row.lng.priceMultiple - 1) * params.globalLngPricePassThrough,
      ),
      fertilizerPriceMultiple: averageWithNormal(rows, (row) => row.fertilizer.priceMultiple),
      oilAvailability: averageWithNormal(rows, (row) => row.oil.physicalSupplyRatio),
      lngAvailability: averageWithNormal(rows, (row) => row.lng.physicalSupplyRatio),
      fertilizerApplicationRatio: averageWithNormal(rows, (row) => row.fertilizer.applicationRatio),
      cropYieldMultiplier: averageWithNormal(rows, (row) => row.fertilizer.cropYieldMultiplier),
      foodAvailabilityMultiplier: averageWithNormal(
        rows,
        (row) => row.fertilizer.foodAvailabilityMultiplier,
      ),
      peakOilPriceMultiple: Math.max(1, ...rows.map((row) => row.oil.priceMultiple)),
      peakLngPriceMultiple: Math.max(1, ...rows.map((row) => row.lng.priceMultiple)),
      peakFertilizerPriceMultiple: Math.max(
        1,
        ...rows.map((row) => row.fertilizer.priceMultiple),
      ),
      peakGulfCrudeShutInPerDay: Math.max(
        0,
        ...rows.map((row) => row.gulfCrudeShutInPerDay),
      ),
      regional,
    };
  });
}

function regionalMonth(
  params: HormuzModelParams,
  oil: CommodityMonthResult,
  lng: CommodityMonthResult,
  gulfCrudeShutInPerDay: number,
): Readonly<Record<Region, RegionalHormuzMonthResult>> {
  const result = {} as Record<Region, RegionalHormuzMonthResult>;
  const globalOilExposure = params.oil.hormuzFlowPerDay / params.oil.globalDemandPerDay;
  const globalLngExposure = params.lng.hormuzFlowPerDay / params.lng.globalDemandPerDay;
  let globalGasRouteExposure = 0;
  for (const region of REGIONS) {
    const exposure = params.regions[region];
    globalGasRouteExposure +=
      exposure.gasConsumptionWeight *
      exposure.lngShareOfGasUse *
      exposure.hormuzShareOfLng;
  }

  const globalOilLoss = Math.max(0, 1 - oil.physicalSupplyRatio);
  const globalLngLoss = Math.max(0, 1 - lng.physicalSupplyRatio);
  const broadGasPrice = 1 +
    (lng.priceMultiple - 1) * params.globalLngPricePassThrough;

  for (const region of REGIONS) {
    const exposure = params.regions[region];
    const oilLoss = globalOilExposure > 0
      ? globalOilLoss *
        (exposure.hormuzOilShareOfUse / globalOilExposure) *
        exposure.physicalVulnerability
      : 0;
    const regionGasRouteExposure =
      exposure.lngShareOfGasUse * exposure.hormuzShareOfLng;
    const gasLoss = globalGasRouteExposure > 0
      ? globalLngLoss *
        (regionGasRouteExposure / globalGasRouteExposure) *
        exposure.physicalVulnerability
      : 0;
    const oilAvailability = clamp(1 - oilLoss, 0.4, 1);
    const gasAvailability = clamp(1 - gasLoss, 0.4, 1);
    const oilScarcityGap = Math.max(
      0,
      (1 - oilAvailability) - globalOilLoss,
    );
    const gasScarcityGap = Math.max(
      0,
      (1 - gasAvailability) - globalLngLoss,
    );
    const oilPriceMultiple = clamp(
      oil.priceMultiple * (1 + params.regionalScarcityPricePremium * oilScarcityGap),
      1,
      params.oil.maxPriceMultiple * 1.5,
    );
    const gasPriceMultiple = clamp(
      broadGasPrice * (1 + params.regionalScarcityPricePremium * gasScarcityGap),
      1,
      params.lng.maxPriceMultiple,
    );
    const termsOfTrade =
      exposure.oilTermsOfTradeSensitivity * Math.max(0, oil.priceMultiple - 1);
    const strandedExportLoss =
      exposure.gulfShutInGdpSensitivity *
      (gulfCrudeShutInPerDay / Math.max(params.oil.crudeHormuzFlowPerDay, 0.1));
    result[region] = {
      oilAvailability,
      gasAvailability,
      oilPriceMultiple,
      gasPriceMultiple,
      tradeIncomeFactor: clamp(1 + termsOfTrade - strandedExportLoss, 0.75, 1.15),
    };
  }
  return result;
}

/**
 * Monthly stock-flow simulation. Oil and LNG clear through price-responsive
 * demand; fertilizer is a downstream physical/price channel. Export storage
 * is diagnostic: shut-ins are not subtracted twice from the already blocked
 * seaborne flow.
 */
export function simulateHormuzDisruption(
  scenario: HormuzScenario,
  params: HormuzModelParams = hormuzDefaults,
): HormuzSimulationResult {
  let oilState: CommodityState = {
    inventory: params.oil.globalDemandPerDay * params.oil.accessibleInventoryDays,
    disruptionMonths: 0,
  };
  let lngState: CommodityState = {
    inventory: params.lng.globalDemandPerDay * params.lng.accessibleInventoryDays,
    disruptionMonths: 0,
  };
  let fertilizerState: FertilizerState = {
    inventory: params.fertilizer.accessibleInventoryMonths,
    disruptionMonths: 0,
  };
  let exporterStorage = params.oil.exporterSpareStorageMillionBarrels;
  const months: HormuzMonthResult[] = [];

  for (let index = 0; index < scenario.throughputPath.length; index++) {
    const throughput = clamp(scenario.throughputPath[index] ?? 1, 0, 1);
    const bypassAvailability = clamp(
      scenario.bypassAvailabilityPath?.[index] ?? 1,
      0,
      1,
    );
    const oilStep = stepCommodity(params.oil, oilState, {
      throughput,
      bypassCapacityPerDay: params.oil.bypassCapacityPerDay,
      bypassAvailability,
      bypassRampMonths: params.oil.bypassRampMonths,
    });
    oilState = oilStep.state;
    const lngStep = stepCommodity(params.lng, lngState, { throughput });
    lngState = lngStep.state;
    const fertilizerStep = stepFertilizer(
      params.fertilizer,
      fertilizerState,
      throughput,
      lngStep.result.priceMultiple,
    );
    fertilizerState = fertilizerStep.state;

    const blockedCrude = params.oil.crudeHormuzFlowPerDay * (1 - throughput);
    const crudeBypass = Math.min(blockedCrude, oilStep.result.bypassFlowPerDay);
    const strandedCrude = Math.max(0, blockedCrude - crudeBypass);
    let gulfCrudeShutInPerDay = 0;
    if (strandedCrude > 0) {
      const storageRate = Math.min(strandedCrude, exporterStorage / DAYS_PER_MONTH);
      exporterStorage = Math.max(0, exporterStorage - storageRate * DAYS_PER_MONTH);
      gulfCrudeShutInPerDay = Math.max(0, strandedCrude - storageRate);
    } else if (exporterStorage < params.oil.exporterSpareStorageMillionBarrels) {
      const drainRate = Math.min(
        params.oil.exporterStorageDrainMaxPerDay,
        (params.oil.exporterSpareStorageMillionBarrels - exporterStorage) / DAYS_PER_MONTH,
      );
      exporterStorage = Math.min(
        params.oil.exporterSpareStorageMillionBarrels,
        exporterStorage + drainRate * DAYS_PER_MONTH,
      );
    }

    const calendar = nextCalendarMonth(scenario.startYear, scenario.startMonth, index);
    months.push({
      index,
      ...calendar,
      throughput,
      oil: oilStep.result,
      lng: lngStep.result,
      fertilizer: fertilizerStep.result,
      gulfCrudeShutInPerDay,
      gulfExportStorageRemainingMillionBarrels: exporterStorage,
      regional: regionalMonth(
        params,
        oilStep.result,
        lngStep.result,
        gulfCrudeShutInPerDay,
      ),
    });
  }

  return {
    scenario,
    params,
    months,
    annual: summarizeAnnual(months, params),
  };
}

export function withHormuzParams(
  base: HormuzModelParams,
  override: {
    oil?: Partial<OilMarketParams>;
    lng?: Partial<TradedCommodityParams>;
    fertilizer?: Partial<HormuzModelParams['fertilizer']>;
  },
): HormuzModelParams {
  return {
    ...base,
    oil: { ...base.oil, ...override.oil },
    lng: { ...base.lng, ...override.lng },
    fertilizer: { ...base.fertilizer, ...override.fertilizer },
  };
}
