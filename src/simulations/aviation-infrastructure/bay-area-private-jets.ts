import {
  assertFiniteDeep,
  validateNumber,
} from 'tsimulation';
import type {
  AviationInfrastructureResult,
} from './model.js';

export const BAY_AREA_PRIVATE_JET_AIRPORT_CODES = [
  'SFO',
  'OAK',
  'SJC',
  'HWD',
  'CCR',
  'LVK',
  'APC',
  'STS',
  'SQL',
  'PAO',
  'RHV',
  'HAF',
  'DVO',
] as const;

export type BayAreaPrivateJetAirportCode =
  (typeof BAY_AREA_PRIVATE_JET_AIRPORT_CODES)[number];

export type BayAreaAirportRole =
  | 'major-gateway'
  | 'business-reliever'
  | 'limited-business-jet';

export interface BayAreaTafTrafficKnot {
  year: number;
  itinerantGaOperations: number;
  airTaxiOperations: number;
}

export interface BayAreaPrivateJetAirportProfile {
  code: BayAreaPrivateJetAirportCode;
  name: string;
  subregion: string;
  role: BayAreaAirportRole;
  basedJets2024: number;
  totalBasedAircraft2024: number;
  /**
   * Share of the TAF air-taxi category treated as a business-jet allocation
   * signal. At airline airports most air-taxi operations are scheduled
   * commuter traffic; at GA relievers they are more likely to be charter.
   * This is an allocation weight, not a measured airport business-jet share.
   */
  airTaxiBusinessJetProxyShare: number;
  fboHandledOperationShare: number;
  tafTraffic: readonly BayAreaTafTrafficKnot[];
}

const traffic = (
  rows: readonly [
    year: number,
    itinerantGaOperations: number,
    airTaxiOperations: number,
  ][],
): readonly BayAreaTafTrafficKnot[] =>
  rows.map(([year, itinerantGaOperations, airTaxiOperations]) => ({
    year,
    itinerantGaOperations,
    airTaxiOperations,
  }));

/**
 * Fixed airport cohort and 2025 TAF paths. Historical 2024 based-aircraft
 * counts and the 2025–2050 operation forecasts come from the pinned FAA TAF
 * archive recorded in data.ts.
 */
export const bayAreaPrivateJetAirportProfiles =
  [
    {
      code: 'SFO',
      name: 'San Francisco International',
      subregion: 'Peninsula gateway',
      role: 'major-gateway',
      basedJets2024: 7,
      totalBasedAircraft2024: 12,
      airTaxiBusinessJetProxyShare: 0.10,
      fboHandledOperationShare: 0.90,
      tafTraffic: traffic([
        [2025, 7_243, 25_930],
        [2030, 9_393, 28_050],
        [2035, 9_629, 29_520],
        [2040, 9_871, 31_059],
        [2045, 10_119, 32_666],
        [2050, 10_373, 34_346],
      ]),
    },
    {
      code: 'OAK',
      name: 'Oakland San Francisco Bay',
      subregion: 'East Bay gateway',
      role: 'major-gateway',
      basedJets2024: 71,
      totalBasedAircraft2024: 264,
      airTaxiBusinessJetProxyShare: 0.15,
      fboHandledOperationShare: 0.90,
      tafTraffic: traffic([
        [2025, 28_954, 25_187],
        [2030, 31_630, 25_858],
        [2035, 31_630, 27_228],
        [2040, 31_630, 28_675],
        [2045, 31_630, 30_206],
        [2050, 31_630, 31_827],
      ]),
    },
    {
      code: 'SJC',
      name: 'Norman Y. Mineta San Jose International',
      subregion: 'South Bay gateway',
      role: 'major-gateway',
      basedJets2024: 53,
      totalBasedAircraft2024: 142,
      airTaxiBusinessJetProxyShare: 0.15,
      fboHandledOperationShare: 0.90,
      tafTraffic: traffic([
        [2025, 26_301, 24_423],
        [2030, 30_156, 25_783],
        [2035, 30_658, 27_098],
        [2040, 31_169, 28_480],
        [2045, 31_689, 29_933],
        [2050, 32_217, 31_458],
      ]),
    },
    {
      code: 'HWD',
      name: 'Hayward Executive',
      subregion: 'Inner East Bay reliever',
      role: 'business-reliever',
      basedJets2024: 46,
      totalBasedAircraft2024: 446,
      airTaxiBusinessJetProxyShare: 0.85,
      fboHandledOperationShare: 0.95,
      tafTraffic: traffic([
        [2025, 37_141, 2_133],
        [2030, 42_622, 2_238],
        [2035, 42_941, 2_340],
        [2040, 43_263, 2_429],
        [2045, 43_587, 2_507],
        [2050, 43_913, 2_578],
      ]),
    },
    {
      code: 'CCR',
      name: 'Buchanan Field',
      subregion: 'Central Contra Costa reliever',
      role: 'business-reliever',
      basedJets2024: 24,
      totalBasedAircraft2024: 362,
      airTaxiBusinessJetProxyShare: 0.85,
      fboHandledOperationShare: 0.95,
      tafTraffic: traffic([
        [2025, 39_796, 5_654],
        [2030, 45_229, 5_844],
        [2035, 45_678, 6_104],
        [2040, 46_131, 6_339],
        [2045, 46_589, 6_553],
        [2050, 47_051, 6_751],
      ]),
    },
    {
      code: 'LVK',
      name: 'Livermore Municipal',
      subregion: 'Tri-Valley reliever',
      role: 'business-reliever',
      basedJets2024: 8,
      totalBasedAircraft2024: 408,
      airTaxiBusinessJetProxyShare: 0.85,
      fboHandledOperationShare: 0.95,
      tafTraffic: traffic([
        [2025, 59_275, 4_642],
        [2030, 63_843, 5_341],
        [2035, 64_053, 5_341],
        [2040, 64_265, 5_341],
        [2045, 64_477, 5_341],
        [2050, 64_689, 5_341],
      ]),
    },
    {
      code: 'APC',
      name: 'Napa County',
      subregion: 'Wine Country reliever',
      role: 'business-reliever',
      basedJets2024: 12,
      totalBasedAircraft2024: 168,
      airTaxiBusinessJetProxyShare: 0.85,
      fboHandledOperationShare: 0.95,
      tafTraffic: traffic([
        [2025, 28_186, 11_181],
        [2030, 28_541, 12_162],
        [2035, 28_901, 13_179],
        [2040, 29_265, 14_035],
        [2045, 29_634, 14_781],
        [2050, 30_008, 15_446],
      ]),
    },
    {
      code: 'STS',
      name: 'Charles M. Schulz–Sonoma County',
      subregion: 'North Bay regional',
      role: 'business-reliever',
      basedJets2024: 22,
      totalBasedAircraft2024: 356,
      airTaxiBusinessJetProxyShare: 0.30,
      fboHandledOperationShare: 0.95,
      tafTraffic: traffic([
        [2025, 31_444, 10_487],
        [2030, 37_422, 10_642],
        [2035, 38_367, 11_185],
        [2040, 39_336, 11_755],
        [2045, 40_330, 12_355],
        [2050, 41_348, 12_986],
      ]),
    },
    {
      code: 'SQL',
      name: 'San Carlos',
      subregion: 'Mid-Peninsula limited-service airport',
      role: 'limited-business-jet',
      basedJets2024: 2,
      totalBasedAircraft2024: 260,
      airTaxiBusinessJetProxyShare: 0.05,
      fboHandledOperationShare: 0.75,
      tafTraffic: traffic([
        [2025, 42_913, 2_486],
        [2030, 47_064, 2_252],
        [2035, 47_903, 2_252],
        [2040, 48_758, 2_252],
        [2045, 49_628, 2_252],
        [2050, 50_513, 2_252],
      ]),
    },
    {
      code: 'PAO',
      name: 'Palo Alto',
      subregion: 'Mid-Peninsula limited-service airport',
      role: 'limited-business-jet',
      basedJets2024: 0,
      totalBasedAircraft2024: 331,
      airTaxiBusinessJetProxyShare: 0.05,
      fboHandledOperationShare: 0.75,
      tafTraffic: traffic([
        [2025, 56_096, 669],
        [2030, 57_485, 666],
        [2035, 58_909, 666],
        [2040, 60_368, 666],
        [2045, 61_863, 666],
        [2050, 63_395, 666],
      ]),
    },
    {
      code: 'RHV',
      name: 'Reid-Hillview',
      subregion: 'South Bay limited-service airport',
      role: 'limited-business-jet',
      basedJets2024: 1,
      totalBasedAircraft2024: 330,
      airTaxiBusinessJetProxyShare: 0.05,
      fboHandledOperationShare: 0.75,
      tafTraffic: traffic([
        [2025, 65_470, 317],
        [2030, 74_401, 283],
        [2035, 76_133, 283],
        [2040, 77_905, 283],
        [2045, 79_718, 283],
        [2050, 81_573, 283],
      ]),
    },
    {
      code: 'HAF',
      name: 'Half Moon Bay',
      subregion: 'Coastside limited-service airport',
      role: 'limited-business-jet',
      basedJets2024: 1,
      totalBasedAircraft2024: 36,
      airTaxiBusinessJetProxyShare: 0.05,
      fboHandledOperationShare: 0.75,
      tafTraffic: traffic([
        [2025, 26_132, 150],
        [2030, 26_132, 150],
        [2035, 26_132, 150],
        [2040, 26_132, 150],
        [2045, 26_132, 150],
        [2050, 26_132, 150],
      ]),
    },
    {
      code: 'DVO',
      name: 'Gnoss Field',
      subregion: 'Marin limited-service airport',
      role: 'limited-business-jet',
      basedJets2024: 5,
      totalBasedAircraft2024: 179,
      airTaxiBusinessJetProxyShare: 0.05,
      fboHandledOperationShare: 0.75,
      tafTraffic: traffic([
        [2025, 23_500, 2_000],
        [2030, 23_500, 2_000],
        [2035, 23_500, 2_000],
        [2040, 23_500, 2_000],
        [2045, 23_500, 2_000],
        [2050, 23_500, 2_000],
      ]),
    },
  ] as const satisfies readonly BayAreaPrivateJetAirportProfile[];

export interface BayAreaPrivateJetScenario {
  id: string;
  label: string;
  baseYear: number;
  endYear: number;
  bayAreaShareOfUsBusinessJetOperations: number;
  annualBayAreaShareDrift: number;
  gatewayAccessRetentionAtEnd: Partial<
    Record<BayAreaPrivateJetAirportCode, number>
  >;
}

export const bayAreaPrivateJetScenarios = {
  lower: {
    id: 'bay-area-private-jets-lower',
    label: 'Lower regional demand',
    baseYear: 2025,
    endYear: 2050,
    bayAreaShareOfUsBusinessJetOperations: 0.025,
    annualBayAreaShareDrift: -0.003,
    gatewayAccessRetentionAtEnd: {},
  },
  central: {
    id: 'bay-area-private-jets-central',
    label: 'FAA TAF relative allocation with central regional demand',
    baseYear: 2025,
    endYear: 2050,
    bayAreaShareOfUsBusinessJetOperations: 0.030,
    annualBayAreaShareDrift: 0,
    gatewayAccessRetentionAtEnd: {},
  },
  upper: {
    id: 'bay-area-private-jets-upper',
    label: 'Upper regional demand',
    baseYear: 2025,
    endYear: 2050,
    bayAreaShareOfUsBusinessJetOperations: 0.035,
    annualBayAreaShareDrift: 0.003,
    gatewayAccessRetentionAtEnd: {},
  },
  'gateway-constrained': {
    id: 'bay-area-private-jets-gateway-constrained',
    label: 'Central demand with tightening major-airport access',
    baseYear: 2025,
    endYear: 2050,
    bayAreaShareOfUsBusinessJetOperations: 0.030,
    annualBayAreaShareDrift: 0,
    gatewayAccessRetentionAtEnd: {
      SFO: 0.65,
      OAK: 0.90,
      SJC: 0.85,
    },
  },
} as const satisfies Record<string, BayAreaPrivateJetScenario>;

export interface BayAreaAirportPrivateJetYear {
  code: BayAreaPrivateJetAirportCode;
  privateJetOperations: number;
  fboHandledOperations: number;
  shareOfBayAreaPrivateJetOperations: number;
  tafPrivateJetAllocationProxy: number;
  gatewayAccessFactor: number;
}

export interface BayAreaPrivateJetYear {
  year: number;
  nationalBusinessJetOperations: number;
  bayAreaShareOfUsBusinessJetOperations: number;
  bayAreaPrivateJetOperations: number;
  bayAreaFboHandledOperations: number;
  airports: Record<
    BayAreaPrivateJetAirportCode,
    BayAreaAirportPrivateJetYear
  >;
}

export interface BayAreaPrivateJetResult {
  scenario: BayAreaPrivateJetScenario;
  autonomousFlightIncluded: false;
  advancedAirMobilityIncluded: false;
  allocationStatus: 'scenario-proxy-not-airport-level-etmsc-observation';
  years: readonly BayAreaPrivateJetYear[];
  endingPrivateJetOperations: number;
  endingFboHandledOperations: number;
}

function validateScenario(scenario: BayAreaPrivateJetScenario): void {
  const errors = [
    ...validateNumber(scenario.baseYear, 'scenario.baseYear', {
      integer: true,
      min: 2000,
    }),
    ...validateNumber(scenario.endYear, 'scenario.endYear', {
      integer: true,
      min: scenario.baseYear,
    }),
    ...validateNumber(
      scenario.bayAreaShareOfUsBusinessJetOperations,
      'scenario.bayAreaShareOfUsBusinessJetOperations',
      { min: 0, max: 1 },
    ),
    ...validateNumber(
      scenario.annualBayAreaShareDrift,
      'scenario.annualBayAreaShareDrift',
      { min: -1, exclusiveMin: true },
    ),
  ];
  for (
    const [code, retention] of
      Object.entries(scenario.gatewayAccessRetentionAtEnd)
  ) {
    errors.push(
      ...validateNumber(
        retention,
        `scenario.gatewayAccessRetentionAtEnd.${code}`,
        { min: 0, max: 1 },
      ),
    );
  }
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
}

function gaBusinessJetProxyShare(
  profile: BayAreaPrivateJetAirportProfile,
): number {
  const basedJetShare =
    profile.totalBasedAircraft2024 > 0
      ? profile.basedJets2024 / profile.totalBasedAircraft2024
      : 0;
  if (profile.role === 'major-gateway') {
    return Math.min(0.95, 0.55 + basedJetShare);
  }
  if (profile.role === 'business-reliever') {
    return Math.min(0.55, 0.08 + 2.2 * basedJetShare);
  }
  // At these airports a large piston-aircraft traffic count is not evidence
  // of PJ compatibility. Transient GA therefore receives only a 0.2% weight;
  // activity by the small observed based-jet stock is added separately.
  return 0.002;
}

function interpolateTraffic(
  profile: BayAreaPrivateJetAirportProfile,
  year: number,
): BayAreaTafTrafficKnot {
  const exact = profile.tafTraffic.find((row) => row.year === year);
  if (exact) return exact;
  const lower = [...profile.tafTraffic]
    .reverse()
    .find((row) => row.year < year);
  const upper = profile.tafTraffic.find((row) => row.year > year);
  if (!lower || !upper) {
    throw new Error(
      `${profile.code} TAF path does not bracket forecast year ${year}`,
    );
  }
  const share = (year - lower.year) / (upper.year - lower.year);
  return {
    year,
    itinerantGaOperations:
      lower.itinerantGaOperations +
      share * (upper.itinerantGaOperations - lower.itinerantGaOperations),
    airTaxiOperations:
      lower.airTaxiOperations +
      share * (upper.airTaxiOperations - lower.airTaxiOperations),
  };
}

function accessFactor(
  scenario: BayAreaPrivateJetScenario,
  code: BayAreaPrivateJetAirportCode,
  year: number,
): number {
  const ending = scenario.gatewayAccessRetentionAtEnd[code] ?? 1;
  const progress =
    scenario.endYear === scenario.baseYear
      ? 1
      : (year - scenario.baseYear) /
        (scenario.endYear - scenario.baseYear);
  return 1 + Math.max(0, Math.min(1, progress)) * (ending - 1);
}

function airportAllocationProxy(
  profile: BayAreaPrivateJetAirportProfile,
  scenario: BayAreaPrivateJetScenario,
  year: number,
): { proxy: number; gatewayAccessFactor: number } {
  const taf = interpolateTraffic(profile, year);
  const gatewayAccessFactor = accessFactor(scenario, profile.code, year);
  // A fixed 200-operation signal per based jet keeps the limited-airport
  // allocation tied to observed aircraft capable of using the field rather
  // than to its much larger piston fleet. It is normalized with the other
  // allocation signals and is not asserted to be an observed operation count.
  const limitedBasedJetOperationProxy =
    profile.role === 'limited-business-jet'
      ? profile.basedJets2024 * 200
      : 0;
  const proxy =
    (
      taf.itinerantGaOperations * gaBusinessJetProxyShare(profile) +
      taf.airTaxiOperations * profile.airTaxiBusinessJetProxyShare +
      limitedBasedJetOperationProxy
    ) * gatewayAccessFactor;
  return { proxy, gatewayAccessFactor };
}

/**
 * Allocate the conventional business-jet path from the national continuity
 * scenario across a fixed Bay Area airport cohort. This deliberately rejects
 * any national run containing AAM traffic so the resulting view cannot be
 * mistaken for an autonomous-air-taxi forecast.
 */
export function projectBayAreaPrivateJetTraffic(
  nationalContinuity: AviationInfrastructureResult,
  scenario: BayAreaPrivateJetScenario =
    bayAreaPrivateJetScenarios.central,
): BayAreaPrivateJetResult {
  validateScenario(scenario);
  if (
    nationalContinuity.years.some(
      (row) => row.totalAamFlights > 1e-9 || row.autonomyShare > 1e-9,
    )
  ) {
    throw new Error(
      'Bay Area private-jet projection requires a continuity run with AAM and autonomy disabled',
    );
  }
  const nationalYears = nationalContinuity.years.filter(
    (row) => row.year >= scenario.baseYear && row.year <= scenario.endYear,
  );
  if (
    nationalYears.at(0)?.year !== scenario.baseYear ||
    nationalYears.at(-1)?.year !== scenario.endYear
  ) {
    throw new Error(
      `National continuity run must cover ${scenario.baseYear}–${scenario.endYear}`,
    );
  }

  const years = nationalYears.map((national) => {
    const horizon = national.year - scenario.baseYear;
    const bayAreaShareOfUsBusinessJetOperations =
      scenario.bayAreaShareOfUsBusinessJetOperations *
      Math.pow(1 + scenario.annualBayAreaShareDrift, horizon);
    const bayAreaPrivateJetOperations =
      national.conventionalBusinessJetOperations *
      bayAreaShareOfUsBusinessJetOperations;
    const allocation = bayAreaPrivateJetAirportProfiles.map((profile) => ({
      profile,
      ...airportAllocationProxy(profile, scenario, national.year),
    }));
    const allocationTotal = allocation.reduce(
      (sum, row) => sum + row.proxy,
      0,
    );
    if (allocationTotal <= 0) {
      throw new Error(`Bay Area allocation proxy is zero in ${national.year}`);
    }
    let bayAreaFboHandledOperations = 0;
    const airports = Object.fromEntries(
      allocation.map(({ profile, proxy, gatewayAccessFactor }) => {
        const shareOfBayAreaPrivateJetOperations = proxy / allocationTotal;
        const privateJetOperations =
          bayAreaPrivateJetOperations *
          shareOfBayAreaPrivateJetOperations;
        const fboHandledOperations =
          privateJetOperations * profile.fboHandledOperationShare;
        bayAreaFboHandledOperations += fboHandledOperations;
        return [
          profile.code,
          {
            code: profile.code,
            privateJetOperations,
            fboHandledOperations,
            shareOfBayAreaPrivateJetOperations,
            tafPrivateJetAllocationProxy: proxy,
            gatewayAccessFactor,
          },
        ];
      }),
    ) as Record<
      BayAreaPrivateJetAirportCode,
      BayAreaAirportPrivateJetYear
    >;
    const airportTotal = Object.values(airports).reduce(
      (sum, airport) => sum + airport.privateJetOperations,
      0,
    );
    if (
      Math.abs(airportTotal - bayAreaPrivateJetOperations) >
      Math.max(1e-6, bayAreaPrivateJetOperations * 1e-10)
    ) {
      throw new Error(
        `Bay Area private-jet operation ledger failed in ${national.year}`,
      );
    }
    const row: BayAreaPrivateJetYear = {
      year: national.year,
      nationalBusinessJetOperations:
        national.conventionalBusinessJetOperations,
      bayAreaShareOfUsBusinessJetOperations,
      bayAreaPrivateJetOperations,
      bayAreaFboHandledOperations,
      airports,
    };
    assertFiniteDeep(row, `Bay Area private-jet result ${national.year}`);
    return row;
  });
  const ending = years.at(-1)!;
  return {
    scenario,
    autonomousFlightIncluded: false,
    advancedAirMobilityIncluded: false,
    allocationStatus:
      'scenario-proxy-not-airport-level-etmsc-observation',
    years,
    endingPrivateJetOperations: ending.bayAreaPrivateJetOperations,
    endingFboHandledOperations: ending.bayAreaFboHandledOperations,
  };
}
