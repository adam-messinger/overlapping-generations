/**
 * Frozen first-wave COVID-19 observations used by the outbreak toy-model
 * backtest. Counts are weekly reports, not occurrence-date estimates.
 *
 * Source: WHO COVID-19 dashboard, "Weekly COVID-19 cases and deaths by date
 * reported to WHO", downloaded 2026-07-22 (CC BY 4.0).
 * https://data.who.int/dashboards/covid19/data
 * https://srhdpeuwpubsa.blob.core.windows.net/whdh/COVID/WHO-COVID-19-global-data.csv
 *
 * WHO cautions that testing, definitions, completeness, reporting practice,
 * and reporting delays differ by country and over time. The model therefore
 * treats ascertainment as a fitted observation parameter and does not interpret
 * reported cases as infections.
 */

export interface WeeklyObservation {
  date: string;
  cases: number;
  deaths: number;
}

export interface OutbreakEpisode {
  id: string;
  label: string;
  population: number;
  trainWeeks: number;
  observations: readonly WeeklyObservation[];
}

const italy: readonly WeeklyObservation[] = [
  { date: '2020-02-16', cases: 0, deaths: 0 },
  { date: '2020-02-23', cases: 76, deaths: 2 },
  { date: '2020-03-01', cases: 1049, deaths: 27 },
  { date: '2020-03-08', cases: 4755, deaths: 204 },
  { date: '2020-03-15', cases: 15274, deaths: 1208 },
  { date: '2020-03-22', cases: 32421, deaths: 3384 },
  { date: '2020-03-29', cases: 38894, deaths: 5198 },
  { date: '2020-04-05', cases: 32160, deaths: 5339 },
  { date: '2020-04-12', cases: 27639, deaths: 4106 },
  { date: '2020-04-19', cases: 23654, deaths: 3759 },
  { date: '2020-04-26', cases: 19426, deaths: 3157 },
  { date: '2020-05-03', cases: 13977, deaths: 2326 },
  { date: '2020-05-10', cases: 8940, deaths: 1685 },
  { date: '2020-05-17', cases: 6492, deaths: 1368 },
  { date: '2020-05-24', cases: 4567, deaths: 972 },
  { date: '2020-05-31', cases: 3337, deaths: 605 },
  { date: '2020-06-07', cases: 2137, deaths: 506 },
  { date: '2020-06-14', cases: 1850, deaths: 455 },
  { date: '2020-06-21', cases: 2023, deaths: 309 },
  { date: '2020-06-28', cases: 1861, deaths: 106 },
  { date: '2020-07-05', cases: 1283, deaths: 138 },
  { date: '2020-07-12', cases: 1408, deaths: 91 },
  { date: '2020-07-19', cases: 1389, deaths: 97 },
  { date: '2020-07-26', cases: 1648, deaths: 60 },
  { date: '2020-08-02', cases: 1968, deaths: 44 },
];

const unitedKingdom: readonly WeeklyObservation[] = [
  { date: '2020-02-16', cases: 11, deaths: 0 },
  { date: '2020-02-23', cases: 3, deaths: 0 },
  { date: '2020-03-01', cases: 33, deaths: 1 },
  { date: '2020-03-08', cases: 311, deaths: 6 },
  { date: '2020-03-15', cases: 1901, deaths: 46 },
  { date: '2020-03-22', cases: 5455, deaths: 429 },
  { date: '2020-03-29', cases: 16046, deaths: 2005 },
  { date: '2020-04-05', cases: 28818, deaths: 5622 },
  { date: '2020-04-12', cases: 32630, deaths: 8974 },
  { date: '2020-04-19', cases: 30969, deaths: 9082 },
  { date: '2020-04-26', cases: 33506, deaths: 7693 },
  { date: '2020-05-03', cases: 31851, deaths: 5860 },
  { date: '2020-05-10', cases: 24027, deaths: 4508 },
  { date: '2020-05-17', cases: 20019, deaths: 3240 },
  { date: '2020-05-24', cases: 16906, deaths: 2569 },
  { date: '2020-05-31', cases: 11713, deaths: 1966 },
  { date: '2020-06-07', cases: 8884, deaths: 1416 },
  { date: '2020-06-14', cases: 7052, deaths: 1034 },
  { date: '2020-06-21', cases: 6892, deaths: 746 },
  { date: '2020-06-28', cases: 5270, deaths: 635 },
  { date: '2020-07-05', cases: 4275, deaths: 456 },
  { date: '2020-07-12', cases: 4283, deaths: 353 },
  { date: '2020-07-19', cases: 4340, deaths: 253 },
  { date: '2020-07-26', cases: 4969, deaths: 206 },
  { date: '2020-08-02', cases: 5524, deaths: 175 },
];

const korea: readonly WeeklyObservation[] = [
  { date: '2020-01-19', cases: 1, deaths: 0 },
  { date: '2020-01-26', cases: 2, deaths: 0 },
  { date: '2020-02-02', cases: 12, deaths: 0 },
  { date: '2020-02-09', cases: 12, deaths: 0 },
  { date: '2020-02-16', cases: 3, deaths: 0 },
  { date: '2020-02-23', cases: 526, deaths: 3 },
  { date: '2020-03-01', cases: 2970, deaths: 14 },
  { date: '2020-03-08', cases: 3608, deaths: 33 },
  { date: '2020-03-15', cases: 1028, deaths: 25 },
  { date: '2020-03-22', cases: 735, deaths: 29 },
  { date: '2020-03-29', cases: 686, deaths: 48 },
  { date: '2020-04-05', cases: 654, deaths: 31 },
  { date: '2020-04-12', cases: 275, deaths: 31 },
  { date: '2020-04-19', cases: 149, deaths: 20 },
  { date: '2020-04-26', cases: 67, deaths: 8 },
  { date: '2020-05-03', cases: 65, deaths: 8 },
  { date: '2020-05-10', cases: 81, deaths: 6 },
  { date: '2020-05-17', cases: 176, deaths: 6 },
  { date: '2020-05-24', cases: 140, deaths: 4 },
  { date: '2020-05-31', cases: 278, deaths: 4 },
  { date: '2020-06-07', cases: 308, deaths: 3 },
  { date: '2020-06-14', cases: 308, deaths: 4 },
  { date: '2020-06-21', cases: 337, deaths: 3 },
  { date: '2020-06-28', cases: 294, deaths: 2 },
  { date: '2020-07-05', cases: 374, deaths: 1 },
];

export const outbreakEpisodes: readonly OutbreakEpisode[] = [
  {
    id: 'italy-first-wave',
    label: 'Italy, first reported wave',
    population: 60_300_000,
    trainWeeks: 15,
    observations: italy,
  },
  {
    id: 'uk-first-wave',
    label: 'United Kingdom, first reported wave',
    population: 67_100_000,
    trainWeeks: 15,
    observations: unitedKingdom,
  },
  {
    id: 'korea-first-wave',
    label: 'Republic of Korea, first reported wave',
    population: 51_800_000,
    trainWeeks: 15,
    observations: korea,
  },
];
