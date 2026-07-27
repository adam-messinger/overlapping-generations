import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  createRunManifest,
  manifestToJson,
  runModel,
  type ModelDefinition,
  type ModelRun,
} from 'tsimulation';
import { loadScenario, scenarioToParams } from '../src/scenario.js';
import {
  aviationInfrastructureModel,
  bilateralTariffModel,
  defenseSourcingModel,
  ebikeMotorMarketModel,
  financialContagionModel,
  genericDrugModel,
  heatEventModel,
  hormuzDisruptionModel,
  maritimeNetworkModel,
  outbreakPreparednessModel,
  tradeNetworkTariffModel,
  warAiModel,
} from '../src/simulations/registry.js';
import {
  aviationInfrastructureScenarios,
} from '../src/simulations/aviation-infrastructure/data.js';
import {
  ebikeMotorScenarios,
} from '../src/simulations/e-bike-motors/data.js';
import {
  analyzeEntrantGeographicScope,
  backtestEbikeAdoption,
  evaluateSupplierVolumeCalibration,
} from '../src/simulations/e-bike-motors/calibration.js';
import {
  backtestConventionalTraffic,
  evaluateEarlyAamBenchmark,
  projectPaloAltoTraffic,
} from '../src/simulations/aviation-infrastructure/calibration.js';
import { outbreakEpisodes } from '../src/simulations/outbreak/data.js';
import { calibrateOutbreakV1, calibrateOutbreakV2 } from '../src/simulations/outbreak/calibration.js';
import { evaluatePanel } from '../src/simulations/outbreak/probabilistic.js';
import { respiratoryPanel } from '../src/simulations/outbreak/rolling-data.js';
import {
  evaluateCyclosporaNowcast,
  evaluateDataCenterRatepayerPledge,
  evaluateHeatMortalityNowcast,
} from '../src/simulations/news/headline-experiments-2026-07-26.js';
import { weberBenchmark } from '../src/simulations/critical-materials/data.js';
import { evaluateWeberPeriod, fitWeberModels } from '../src/simulations/critical-materials/price-network.js';
import { calibrateDisruptionModel } from '../src/simulations/critical-materials/event-backtest.js';
import { buildEmpiricalMaterialOverlay, simulateEmpiricalDominantProducerLoss } from '../src/simulations/critical-materials/empirical-network.js';
import { calibrateHormuzModel } from '../src/simulations/critical-materials/hormuz-calibration.js';
import { compareHormuzGlobalImpact } from '../src/simulations/critical-materials/hormuz-bridge.js';
import { hormuzScenarios } from '../src/simulations/critical-materials/hormuz-data.js';
import { calibrateMaritimeNetwork } from '../src/simulations/critical-materials/shipping-calibration.js';
import { maritimeScenarios } from '../src/simulations/critical-materials/shipping-data.js';
import type { DefensePolicyId } from '../src/simulations/critical-materials/defense-sourcing-data.js';
import { calibratedHeatMortalityScale } from '../src/simulations/heat/calibration.js';
import { france2026HeatEvent, france2035HotterEvent, heatAdaptationPackages } from '../src/simulations/heat/data.js';
import { genericDrugEconomicsScenarios } from '../src/simulations/drug-supply/data.js';
import { canadaJuly2026Tariff, brazilJuly2026Tariff } from '../src/simulations/trade/data.js';
import {
  deserializeTradeNetworkSnapshot,
  tradeNetworkCentralParameters,
  type SerializedTradeNetworkSnapshot,
} from '../src/simulations/trade/network-data.js';
import {
  contagionPolicies,
  leveragedFunds2026,
  sovereignMarkets2026,
  sovereignShockScenarios,
} from '../src/simulations/financial-contagion/data.js';

const tracked: Array<{
  id: string;
  model: ModelDefinition<any, any>;
  run: ModelRun<any, any>;
}> = [];

function runTracked<TInput, TOutput>(
  id: string,
  model: ModelDefinition<TInput, TOutput>,
  input: TInput,
): TOutput {
  const run = runModel(model, input, { runLabel: id, seed: 20260722 });
  tracked.push({ id, model, run });
  return run.output;
}

const mean = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const episodeRows = outbreakEpisodes.map((episode) => ({
  episode: episode.id,
  v1: calibrateOutbreakV1(episode),
  v2: calibrateOutbreakV2(episode),
}));
const rollingHoldout = evaluatePanel(respiratoryPanel, 'holdout');
const preparednessBase = {
  population: 10_000_000,
  weeks: 104,
  r0: 3,
  infectiousDays: 5,
  incubationDays: 5.2,
  initialInfectious: 10,
  initialExposed: 50,
  responseMultiplier: 0.32,
  responseRampDays: 14,
  easingStartDaysAfterResponse: 999,
  easedResponseMultiplier: 0.82,
  easingRampDays: 35,
  importedInfectionsPerMillionPerDay: 0.1,
  ascertainment: 0.25,
  infectionFatalityRatio: 0.007,
  caseReportDelayDays: 5,
  infectionToDeathDays: 22,
  hospitalizationRate: 0.04,
  hospitalStayDays: 10,
  staffedBedsPer100k: 30,
  overflowFatalitySlope: 0.35,
  severityDeclineStartDaysAfterResponse: 35,
  severityHalfLifeDays: 35,
  severityFloor: 0.2,
};
const preparedness = [15, 30, 45].map((responseStartDay) => {
  const result = runTracked(
    `outbreak-response-${responseStartDay}`,
    outbreakPreparednessModel,
    { ...preparednessBase, responseStartDay },
  );
  return {
    responseStartDay,
    totalInfections: result.totalInfections,
    totalDeaths: result.totalDeaths,
    peakHospitalLoad: result.peakHospitalLoad,
  };
});

const weberFit = fitWeberModels(weberBenchmark);
const disruptionV1 = calibrateDisruptionModel('cost-share-v1');
const disruptionV3 = calibrateDisruptionModel('physical-v3');
const dominantProducerLoss = buildEmpiricalMaterialOverlay().overlays.map((row) => ({
  material: row.material,
  dominantProducerShare: row.dominantProducerShare,
  residualSupplyShare: row.residualSupplyShare,
  outputMonthsLost: simulateEmpiricalDominantProducerLoss(row.material, {
    accessibleInventoryFraction: disruptionV3.parameters.accessibleInventoryFraction,
  }).result.cumulativeWeightedOutputLoss,
})).sort((a, b) => b.outputMonthsLost - a.outputMonthsLost);

const hormuzCalibration = calibrateHormuzModel();
const hormuzPhysical = runTracked('hormuz-partial-reopening', hormuzDisruptionModel, {
  scenario: hormuzScenarios['partial-reopening'],
  params: hormuzCalibration.params,
});
const hormuzMacro = compareHormuzGlobalImpact(hormuzPhysical);
const hormuzTrough = hormuzMacro.impacts.reduce((selected, row) =>
  row.gdpChangePct < selected.gdpChangePct ? row : selected,
);

const maritimeCalibration = calibrateMaritimeNetwork();
const maritime = runTracked('maritime-july-2026', maritimeNetworkModel, {
  scenario: maritimeScenarios['july-2026-escalation'],
  params: maritimeCalibration.params,
});

const defensePolicies: readonly DefensePolicyId[] = [
  'continued-waivers', 'abrupt-cutoff', 'stockpile-only',
  'staged-cutoff', 'accelerated-qualification', 'combined-resilience',
];
const defense = defensePolicies.map((policy) => {
  const result = runTracked(`defense-${policy}`, defenseSourcingModel, { policy });
  return {
    policy,
    minimumDefenseOutput: result.minimumDefenseOutput,
    outputMonthsLost: result.outputMonthsLost,
    monthsBelow95Pct: result.monthsBelow95Pct,
  };
});

const heat = ['none', 'current', 'outreach', 'targeted-cooling', 'passive-food', 'combined']
  .map((adaptation) => {
    const result = runTracked(`heat-2026-${adaptation}`, heatEventModel, {
      event: france2026HeatEvent,
      adaptation: heatAdaptationPackages[adaptation],
      mortalityScale: calibratedHeatMortalityScale,
    });
    return {
      adaptation,
      deaths: result.mortality.totalDeaths,
      coolingPeakGw: result.power.managedCoolingPeakGw,
      reserveMarginGw: result.power.reserveMarginGw,
      seasonalYieldLoss: result.food.aggregateSeasonalYieldLoss,
    };
  });
const heat2035 = ['current', 'combined'].map((adaptation) => {
  const result = runTracked(`heat-2035-${adaptation}`, heatEventModel, {
    event: france2035HotterEvent,
    adaptation: heatAdaptationPackages[adaptation],
    mortalityScale: calibratedHeatMortalityScale,
  });
  return {
    adaptation,
    deaths: result.mortality.totalDeaths,
    reserveMarginGw: result.power.reserveMarginGw,
  };
});

const drugs = Object.values(genericDrugEconomicsScenarios).map((scenario) => {
  const result = runTracked(`drug-${scenario.id}`, genericDrugModel, scenario);
  return {
    policy: scenario.id,
    minimumServiceLevel: result.minimumServiceLevel,
    cumulativeDoseShortfall: result.cumulativeDoseShortfall,
    averageOperatingMargin: result.averageOperatingMargin,
  };
});

const tariffCases = [
  { id: 'canada-actual', action: canadaJuly2026Tariff, scope: 'actual' as const },
  { id: 'canada-headline', action: canadaJuly2026Tariff, scope: 'naive-headline' as const },
  { id: 'brazil-actual', action: brazilJuly2026Tariff, scope: 'actual' as const },
];
const tariffs = tariffCases.map(({ id, action, scope }) => {
  const result = runTracked(`tariff-${id}`, bilateralTariffModel, { action, scope });
  return {
    id,
    coveredShare: result.coveredShareOfPartnerImports,
    usConsumerPriceChange: result.usConsumerPriceChange,
    usRealGdpChange: result.usRealGdpChange,
    partnerRealGdpChange: result.partnerRealGdpChange,
  };
});

const serializedTradeNetwork = JSON.parse(
  await readFile(
    new URL(
      '../data/trade/forced-labor-2026-network.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as SerializedTradeNetworkSnapshot;
const tradeNetworkSnapshot =
  deserializeTradeNetworkSnapshot(serializedTradeNetwork);
const tradeNetworkRuns = [
  'low-taxable',
  'central',
  'high-taxable',
] as const;
const tradeNetworkTariff = Object.fromEntries(
  tradeNetworkRuns.map((exemptionScopeCase) => {
    const result = runTracked(
      `trade-network-forced-labor-${exemptionScopeCase}`,
      tradeNetworkTariffModel,
      {
        id: `forced-labor-301-${exemptionScopeCase}`,
        label:
          'July 2026 Section 301 replacement for the expiring Section 122 tariff',
        snapshot: tradeNetworkSnapshot,
        parameters: {
          ...tradeNetworkCentralParameters,
          exemptionScopeCase,
        },
      },
    );
    return [
      exemptionScopeCase,
      {
        totalImportsBillion: result.totalImportsBillion,
        effectiveOldAdditionalTariffRate:
          result.effectiveOldAdditionalTariffRate,
        effectiveNewAdditionalTariffRate:
          result.effectiveNewAdditionalTariffRate,
        deliveredImportPriceChange:
          result.deliveredImportPriceChange,
        usConsumerPriceChange: result.usConsumerPriceChange,
        importsLostBillion: result.importsLostBillion,
        supplierReallocationBillion:
          result.supplierReallocationBillion,
        additionalTariffRevenueBillion:
          result.additionalTariffRevenueBillion,
        usRealGdpChange: result.usRealGdpChange,
      },
    ];
  }),
);

const finance = ['current', 'safeguards', 'thin-liquidity', 'backstop'].map((policy) => {
  const result = runTracked(`finance-global-200-${policy}`, financialContagionModel, {
    scenario: sovereignShockScenarios['global-200bp'],
    policy: contagionPolicies[policy],
    markets: sovereignMarkets2026,
    funds: leveragedFunds2026,
  });
  let resolutionThresholdBps: number | null = null;
  for (let bps = 50; bps <= 300; bps += 10) {
    const scan = runModel(financialContagionModel, {
      scenario: {
        id: `scan-${bps}`,
        label: `Synchronous ${bps}bp scan`,
        fundamentalYieldShockBps: { treasury: bps, gilt: bps, jgb: bps },
      },
      policy: contagionPolicies[policy],
      markets: sovereignMarkets2026,
      funds: leveragedFunds2026,
    }).output;
    if (scan.liquidationCapacityExhausted) {
      resolutionThresholdBps = bps;
      break;
    }
  }
  return {
    policy,
    forcedSalesBillion: result.totalForcedSalesBillion,
    bankTier1CapitalHit: result.bankTier1CapitalHit,
    liquidationCapacityExhausted: result.liquidationCapacityExhausted,
    resolutionThresholdBps,
  };
});

const aiScenario = await loadScenario('scenarios/ai-energy-boom.json');
const warAi = runTracked('war-ai-prolonged', warAiModel, {
  aiParams: scenarioToParams(aiScenario),
  hormuzScenario: 'prolonged-closure',
  endYear: 2035,
});
const warAiTrough = warAi.years.reduce((selected, row) =>
  row.warGdpEffectWithAiPct < selected.warGdpEffectWithAiPct ? row : selected,
);
const warAi2035 = warAi.years.find((row) => row.year === 2035)!;

const aviationRuns = Object.entries(aviationInfrastructureScenarios)
  .map(([id, scenario]) => ({
    id,
    result: runTracked(
      `aviation-${id}`,
      aviationInfrastructureModel,
      scenario,
    ),
  }));
const aviationCentral = aviationRuns
  .find((row) => row.id === 'central-mixed')!.result;
const aviationBacktest = backtestConventionalTraffic();
const aviationBenchmark = evaluateEarlyAamBenchmark();
const aviationPaloAlto = projectPaloAltoTraffic(aviationCentral)
  .filter((row) => [2030, 2035, 2040, 2045, 2050].includes(row.year));

const ebikeRuns = Object.entries(ebikeMotorScenarios).map(
  ([id, scenario]) => ({
    id,
    result: runTracked(
      `e-bike-motors-${id}`,
      ebikeMotorMarketModel,
      scenario,
    ),
  }),
);
const ebikeBacktest = backtestEbikeAdoption();
const ebikeSupplierCalibration = evaluateSupplierVolumeCalibration();
const ebikeGeographicScope = analyzeEntrantGeographicScope();
const july26Heat = evaluateHeatMortalityNowcast();
const july26Cyclospora = evaluateCyclosporaNowcast();
const july26DataCenters = evaluateDataCenterRatepayerPledge();

const summary = {
  schemaVersion: 'tsimulation.suite/v1',
  createdAt: new Date().toISOString(),
  outbreak: {
    episodeMeanHoldoutScoreV1: mean(episodeRows.map((row) => row.v1.evaluation.holdout.score)),
    episodeMeanHoldoutScoreV2: mean(episodeRows.map((row) => row.v2.evaluation.holdout.score)),
    rollingHoldoutWis: Object.fromEntries(Object.entries(rollingHoldout.macroAverage)
      .map(([model, score]) => [model, score.wis])),
    preparedness,
  },
  criticalMaterials: {
    weber: Object.fromEntries(['covid', 'ukraine'].map((period) => [period, {
      directMaePctPoints: evaluateWeberPeriod(weberBenchmark, period as 'covid' | 'ukraine', 'v1', weberFit).maePctPoints,
      networkMaePctPoints: evaluateWeberPeriod(weberBenchmark, period as 'covid' | 'ukraine', 'v2', weberFit).maePctPoints,
    }])),
    eventBacktest: {
      v1HoldoutScore: disruptionV1.holdout.meanScore,
      v3HoldoutScore: disruptionV3.holdout.meanScore,
    },
    dominantProducerLoss,
  },
  hormuz: {
    developmentScore: hormuzCalibration.development.meanLoss,
    holdoutScore: hormuzCalibration.holdout.meanLoss,
    annual: hormuzPhysical.annual,
    macroTrough: hormuzTrough,
  },
  maritime: {
    holdoutAbsoluteErrorMbd: maritimeCalibration.holdoutAbsoluteErrorMbd,
    annual: maritime.annual,
  },
  defense,
  heat: { france2026: heat, france2035: heat2035 },
  drugs,
  tariffs,
  tradeNetworkTariff,
  finance,
  warAi: {
    trough: warAiTrough,
    year2035: warAi2035,
  },
  aviationInfrastructure: {
    conventionalHoldout: {
      naiveMape: aviationBacktest.naiveMeanAbsolutePercentageError,
      segmentedMape:
        aviationBacktest.segmentedMeanAbsolutePercentageError,
    },
    earlyAamBenchmark: {
      vtolToAllUseFleetAbsoluteDifference:
        aviationBenchmark.meanVtolToAllUseFleetAbsolutePercentageDifference,
      modeledToUnconstrainedPassengerFlightRatio:
        aviationBenchmark.meanModeledToUnconstrainedPassengerFlightRatio,
    },
    scenarios: aviationRuns.map(({ id, result }) => ({
      id,
      firstMillionAamFlightsYear: result.firstMillionAamFlightsYear,
      firstTenMillionAamFlightsYear: result.firstTenMillionAamFlightsYear,
      endingAamFlights: result.endingAamFlights,
      endingAamPassengerTrips: result.endingAamPassengerTrips,
      endingVtolFlightShare: result.endingVtolFlightShare,
      endingRunwayFlightShare: result.endingRunwayFlightShare,
      endingFacilityAamOperations: result.endingFacilityAamOperations,
    })),
    centralPaloAltoIllustration: aviationPaloAlto,
  },
  ebikeMotorMarket: {
    adoptionBacktest: {
      naiveMape: ebikeBacktest.naiveMeanAbsolutePercentageError,
      stockReplacementMape:
        ebikeBacktest.stockReplacementMeanAbsolutePercentageError,
    },
    supplierComparableMape:
      ebikeSupplierCalibration.meanAbsolutePercentageError,
    scenarios: ebikeRuns.map(({ id, result }) => ({
      id,
      outcome: result.entrantOutcome,
      endingAnnualUnits: result.endingAnnualUnits,
      endingRevenueMillion: result.endingRevenueMillion,
      endingOperatingMargin: result.endingOperatingMargin,
      firstOperatingBreakevenYear: result.firstOperatingBreakevenYear,
      cashPaybackYear: result.cashPaybackYear,
      peakFundingNeedMillion: result.peakFundingNeedMillion,
      enterpriseNpvMillion: result.enterpriseNpvMillion,
    })),
    geographicScope: ebikeGeographicScope,
  },
  headlineExperiments20260726: {
    heatMortality: {
      provisionalHeatAttributedDeaths:
        july26Heat.case.provisionalHeatAttributedDeaths,
      centralExcessDeaths: july26Heat.revisedV2.centralExcessDeaths,
      lowerExcessDeaths: july26Heat.revisedV2.lowerExcessDeaths,
      upperExcessDeaths: july26Heat.revisedV2.upperExcessDeaths,
      leaveOneOutMape:
        july26Heat.revisedV2.leaveOneOutMeanAbsolutePercentageError,
    },
    cyclospora: {
      reportedCases: july26Cyclospora.case.currentReportedCases,
      centralFinalCases:
        july26Cyclospora.revisedV2.centralFinalOutbreakCases,
      lowerFinalCases:
        july26Cyclospora.revisedV2.lowerFinalOutbreakCases,
      upperFinalCases:
        july26Cyclospora.revisedV2.upperFinalOutbreakCases,
      reportingBacktestAbsolutePercentageError:
        july26Cyclospora.calibration
          .later2020AbsolutePercentageError,
    },
    dataCenterRatepayers: {
      centralProjectCoverage:
        july26DataCenters.case.enforceableProjectCoverage,
      centralBillImpact:
        july26DataCenters.revisedV2.central
          .netNonDataCenterBillImpact,
      noProtectionBillImpact:
        july26DataCenters.revisedV2.noProtection
          .netNonDataCenterBillImpact,
      literalFullPledgeBillImpact:
        july26DataCenters.revisedV2.literalFullPledge
          .netNonDataCenterBillImpact,
    },
  },
};

const outputArg = process.argv.find((arg) => arg.startsWith('--output='))?.slice('--output='.length);
if (outputArg) await writeFile(outputArg, `${JSON.stringify(summary, null, 2)}\n`);

const manifestDir = process.argv.find((arg) => arg.startsWith('--manifests='))?.slice('--manifests='.length);
if (manifestDir) {
  await mkdir(manifestDir, { recursive: true });
  const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;
  for (const entry of tracked) {
    const manifest = createRunManifest({
      run: entry.run,
      runId: entry.id,
      gitSha,
      dirty,
      evidence: entry.model.evidence,
      validationClaims: entry.model.validationClaims,
    });
    await writeFile(`${manifestDir}/${entry.id}.json`, `${manifestToJson(manifest, 2)}\n`);
  }
}

console.log(JSON.stringify(summary, null, 2));
