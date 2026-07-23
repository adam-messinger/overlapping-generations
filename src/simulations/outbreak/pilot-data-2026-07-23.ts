/**
 * Frozen national COVID-19 rows used for the 2026-07-23 forecasting pilot.
 *
 * `operationalCovidContinuation` continues the committed historic
 * `mpgq-jmmr` series after 2025-05-31. That endpoint contains the complete
 * history needed by the rolling model and had a 2026-07-18 observation
 * available at the forecast origin.
 *
 * `fixedInitialCovidObservations` comes from the newer `vdzy-6i9v` dataset.
 * CDC says those values reflect initial reporting and are not revised or
 * backfilled. This is the dataset named in the pilot's resolution contract.
 *
 * Source queries and retrieval hashes are documented in
 * docs/forecasting-pilot/OUTBREAK_2026.md.
 */
export interface LiveCovidObservation {
  weekEnding: string;
  admissions: number;
  reportingPercent: number | null;
}

export const operationalCovidContinuation: readonly LiveCovidObservation[] = [
  { weekEnding: '2025-06-07', admissions: 3783, reportingPercent: 91.15 },
  { weekEnding: '2025-06-14', admissions: 3571, reportingPercent: 90.94 },
  { weekEnding: '2025-06-21', admissions: 3823, reportingPercent: 90.68 },
  { weekEnding: '2025-06-28', admissions: 3702, reportingPercent: 90.06 },
  { weekEnding: '2025-07-05', admissions: 3877, reportingPercent: 90.65 },
  { weekEnding: '2025-07-12', admissions: 4273, reportingPercent: 90.63 },
  { weekEnding: '2025-07-19', admissions: 4623, reportingPercent: 90.54 },
  { weekEnding: '2025-07-26', admissions: 5236, reportingPercent: 90.04 },
  { weekEnding: '2025-08-02', admissions: 6194, reportingPercent: 90.48 },
  { weekEnding: '2025-08-09', admissions: 7170, reportingPercent: 92.26 },
  { weekEnding: '2025-08-16', admissions: 8183, reportingPercent: 92.04 },
  { weekEnding: '2025-08-23', admissions: 9612, reportingPercent: 91.57 },
  { weekEnding: '2025-08-30', admissions: 10533, reportingPercent: 91 },
  { weekEnding: '2025-09-06', admissions: 11037, reportingPercent: 91.12 },
  { weekEnding: '2025-09-13', admissions: 10505, reportingPercent: 90.68 },
  { weekEnding: '2025-09-20', admissions: 9598, reportingPercent: 91.01 },
  { weekEnding: '2025-09-27', admissions: 7871, reportingPercent: 90.54 },
  { weekEnding: '2025-10-04', admissions: 6425, reportingPercent: 90.46 },
  { weekEnding: '2025-10-11', admissions: 5258, reportingPercent: 91.79 },
  { weekEnding: '2025-10-18', admissions: 4350, reportingPercent: 91.71 },
  { weekEnding: '2025-10-25', admissions: 3656, reportingPercent: 91.46 },
  { weekEnding: '2025-11-01', admissions: 3436, reportingPercent: 91.66 },
  { weekEnding: '2025-11-08', admissions: 3338, reportingPercent: 91.08 },
  { weekEnding: '2025-11-15', admissions: 3422, reportingPercent: 91.53 },
  { weekEnding: '2025-11-22', admissions: 3494, reportingPercent: 91.71 },
  { weekEnding: '2025-11-29', admissions: 3599, reportingPercent: 91.13 },
  { weekEnding: '2025-12-06', admissions: 4290, reportingPercent: 91.39 },
  { weekEnding: '2025-12-13', admissions: 4722, reportingPercent: 89.43 },
  { weekEnding: '2025-12-20', admissions: 5902, reportingPercent: 91.71 },
  { weekEnding: '2025-12-27', admissions: 7865, reportingPercent: 91.43 },
  { weekEnding: '2026-01-03', admissions: 9762, reportingPercent: 92.04 },
  { weekEnding: '2026-01-10', admissions: 9003, reportingPercent: 91.1 },
  { weekEnding: '2026-01-17', admissions: 7748, reportingPercent: 91.66 },
  { weekEnding: '2026-01-24', admissions: 6966, reportingPercent: 91.38 },
  { weekEnding: '2026-01-31', admissions: 6600, reportingPercent: 91.1 },
  { weekEnding: '2026-02-07', admissions: 6402, reportingPercent: 91.76 },
  { weekEnding: '2026-02-14', admissions: 6483, reportingPercent: 91.57 },
  { weekEnding: '2026-02-21', admissions: 6335, reportingPercent: 91 },
  { weekEnding: '2026-02-28', admissions: 5687, reportingPercent: 90.67 },
  { weekEnding: '2026-03-07', admissions: 4999, reportingPercent: 88.79 },
  { weekEnding: '2026-03-14', admissions: 4332, reportingPercent: 88.93 },
  { weekEnding: '2026-03-21', admissions: 3975, reportingPercent: 90.89 },
  { weekEnding: '2026-03-28', admissions: 2279, reportingPercent: 89.35 },
  { weekEnding: '2026-04-04', admissions: 1985, reportingPercent: 87.49 },
  { weekEnding: '2026-04-11', admissions: 1751, reportingPercent: 89.66 },
  { weekEnding: '2026-04-18', admissions: 1716, reportingPercent: 88.9 },
  { weekEnding: '2026-04-25', admissions: 1773, reportingPercent: 89.04 },
  { weekEnding: '2026-05-02', admissions: 1606, reportingPercent: 89.71 },
  { weekEnding: '2026-05-09', admissions: 1445, reportingPercent: 89.14 },
  { weekEnding: '2026-05-16', admissions: 1350, reportingPercent: 88.98 },
  { weekEnding: '2026-05-23', admissions: 1260, reportingPercent: 88.51 },
  { weekEnding: '2026-05-30', admissions: 1078, reportingPercent: 88.48 },
  { weekEnding: '2026-06-06', admissions: 1017, reportingPercent: 88.39 },
  { weekEnding: '2026-06-13', admissions: 980, reportingPercent: 88.03 },
  { weekEnding: '2026-06-20', admissions: 878, reportingPercent: 87.98 },
  { weekEnding: '2026-06-27', admissions: 912, reportingPercent: 87.13 },
  { weekEnding: '2026-07-04', admissions: 996, reportingPercent: 85.6 },
  { weekEnding: '2026-07-11', admissions: 1111, reportingPercent: 81.11 },
  { weekEnding: '2026-07-18', admissions: 1195, reportingPercent: 76.79 },
] as const;
export const fixedInitialCovidObservations: readonly LiveCovidObservation[] = [
  { weekEnding: '2026-04-18', admissions: 1585, reportingPercent: null },
  { weekEnding: '2026-04-25', admissions: 1629, reportingPercent: null },
  { weekEnding: '2026-05-02', admissions: 1539, reportingPercent: null },
  { weekEnding: '2026-05-09', admissions: 1402, reportingPercent: 81.34 },
  { weekEnding: '2026-05-16', admissions: 1274, reportingPercent: 80.31 },
  { weekEnding: '2026-05-23', admissions: 1175, reportingPercent: 79.17 },
  { weekEnding: '2026-05-30', admissions: 1003, reportingPercent: 81.14 },
  { weekEnding: '2026-06-06', admissions: 955, reportingPercent: 79.97 },
  { weekEnding: '2026-06-13', admissions: 904, reportingPercent: 79.59 },
  { weekEnding: '2026-06-20', admissions: 838, reportingPercent: 79.97 },
  { weekEnding: '2026-06-27', admissions: 867, reportingPercent: 81.13 },
  { weekEnding: '2026-07-04', admissions: 964, reportingPercent: 80.03 },
  { weekEnding: '2026-07-11', admissions: 1067, reportingPercent: 75.93 },
] as const;
