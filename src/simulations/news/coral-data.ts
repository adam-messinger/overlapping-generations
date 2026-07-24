export interface CoralHistoryRow {
  year: number;
  /** NOAA global-ocean annual temperature anomaly relative to 1901–2000. */
  oceanAnomalyC: number;
  /** Maximum NOAA Oceanic Niño Index three-month anomaly in the year. */
  maxOniC: number;
  /** Maximum 365-day share of reef pixels at Alert Level 1+ in the year. */
  observedBleachingExtent: number;
}

/**
 * Frozen annual view assembled from three public NOAA series. The bleaching
 * product is a rolling 365-day exposure measure, so a late-year ENSO pulse is
 * expected to appear most strongly in the following annual maximum.
 */
export const coralHistory: readonly CoralHistoryRow[] = [
  { year: 1986, oceanAnomalyC: 0.22, maxOniC: 1.22, observedBleachingExtent: 0.03480 },
  { year: 1987, oceanAnomalyC: 0.36, maxOniC: 1.70, observedBleachingExtent: 0.09177 },
  { year: 1988, oceanAnomalyC: 0.31, maxOniC: 0.81, observedBleachingExtent: 0.08420 },
  { year: 1989, oceanAnomalyC: 0.25, maxOniC: -0.05, observedBleachingExtent: 0.04433 },
  { year: 1990, oceanAnomalyC: 0.34, maxOniC: 0.41, observedBleachingExtent: 0.01546 },
  { year: 1991, oceanAnomalyC: 0.32, maxOniC: 1.53, observedBleachingExtent: 0.01987 },
  { year: 1992, oceanAnomalyC: 0.25, maxOniC: 1.71, observedBleachingExtent: 0.01442 },
  { year: 1993, oceanAnomalyC: 0.25, maxOniC: 0.70, observedBleachingExtent: 0.00949 },
  { year: 1994, oceanAnomalyC: 0.29, maxOniC: 1.09, observedBleachingExtent: 0.01421 },
  { year: 1995, oceanAnomalyC: 0.32, maxOniC: 0.96, observedBleachingExtent: 0.02213 },
  { year: 1996, oceanAnomalyC: 0.31, maxOniC: -0.27, observedBleachingExtent: 0.06475 },
  { year: 1997, oceanAnomalyC: 0.46, maxOniC: 2.40, observedBleachingExtent: 0.04944 },
  { year: 1998, oceanAnomalyC: 0.50, maxOniC: 2.24, observedBleachingExtent: 0.19868 },
  { year: 1999, oceanAnomalyC: 0.30, maxOniC: -0.98, observedBleachingExtent: 0.19966 },
  { year: 2000, oceanAnomalyC: 0.33, maxOniC: -0.51, observedBleachingExtent: 0.05074 },
  { year: 2001, oceanAnomalyC: 0.43, maxOniC: -0.08, observedBleachingExtent: 0.07206 },
  { year: 2002, oceanAnomalyC: 0.45, maxOniC: 1.31, observedBleachingExtent: 0.08336 },
  { year: 2003, oceanAnomalyC: 0.47, maxOniC: 0.92, observedBleachingExtent: 0.07613 },
  { year: 2004, oceanAnomalyC: 0.46, maxOniC: 0.70, observedBleachingExtent: 0.09719 },
  { year: 2005, oceanAnomalyC: 0.46, maxOniC: 0.64, observedBleachingExtent: 0.11877 },
  { year: 2006, oceanAnomalyC: 0.46, maxOniC: 0.94, observedBleachingExtent: 0.12580 },
  { year: 2007, oceanAnomalyC: 0.38, maxOniC: 0.66, observedBleachingExtent: 0.06948 },
  { year: 2008, oceanAnomalyC: 0.37, maxOniC: -0.23, observedBleachingExtent: 0.07600 },
  { year: 2009, oceanAnomalyC: 0.51, maxOniC: 1.56, observedBleachingExtent: 0.11827 },
  { year: 2010, oceanAnomalyC: 0.51, maxOniC: 1.50, observedBleachingExtent: 0.32692 },
  { year: 2011, oceanAnomalyC: 0.41, maxOniC: -0.37, observedBleachingExtent: 0.34760 },
  { year: 2012, oceanAnomalyC: 0.46, maxOniC: 0.41, observedBleachingExtent: 0.08939 },
  { year: 2013, oceanAnomalyC: 0.50, maxOniC: -0.10, observedBleachingExtent: 0.05631 },
  { year: 2014, oceanAnomalyC: 0.59, maxOniC: 0.77, observedBleachingExtent: 0.13879 },
  { year: 2015, oceanAnomalyC: 0.69, maxOniC: 2.75, observedBleachingExtent: 0.21599 },
  { year: 2016, oceanAnomalyC: 0.73, maxOniC: 2.63, observedBleachingExtent: 0.53090 },
  { year: 2017, oceanAnomalyC: 0.70, maxOniC: 0.40, observedBleachingExtent: 0.54885 },
  { year: 2018, oceanAnomalyC: 0.66, maxOniC: 0.97, observedBleachingExtent: 0.27483 },
  { year: 2019, oceanAnomalyC: 0.77, maxOniC: 0.89, observedBleachingExtent: 0.24138 },
  { year: 2020, oceanAnomalyC: 0.73, maxOniC: 0.64, observedBleachingExtent: 0.39246 },
  { year: 2021, oceanAnomalyC: 0.63, maxOniC: -0.30, observedBleachingExtent: 0.41644 },
  { year: 2022, oceanAnomalyC: 0.68, maxOniC: -0.71, observedBleachingExtent: 0.29650 },
  { year: 2023, oceanAnomalyC: 0.90, maxOniC: 2.06, observedBleachingExtent: 0.34537 },
  { year: 2024, oceanAnomalyC: 0.95, maxOniC: 1.92, observedBleachingExtent: 0.74664 },
  { year: 2025, oceanAnomalyC: 0.83, maxOniC: 0.02, observedBleachingExtent: 0.77171 },
] as const;

export const coralCurrentEvidence = {
  observed2026ThroughJuly22: 0.41369,
  maximum2026ThroughJuly22: 0.42235,
  fourthEvent2023To2025Extent: 0.844,
  thirdEvent2014To2017Extent: 0.682,
  sources: {
    bleachingExtent:
      'https://coralreefwatch.noaa.gov/data_current/5km/v3.1_op/daily/csv/5km-v3.1_stats-alert01_baa5-max-365d_dailyupdate.csv',
    bleachingStatus:
      'https://www.coralreefwatch.noaa.gov/satellite/research/coral_bleaching_report.php',
    methodology:
      'https://coralreefwatch.noaa.gov/product/5km/methodology.php',
    oceanTemperature:
      'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/globe/ocean/12/12/1986-2025.json',
    oni:
      'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt',
    currentOutlook:
      'https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/strengths/',
  },
} as const;
