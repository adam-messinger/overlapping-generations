/**
 * US total nonfarm payrolls, seasonally adjusted over-the-month change, by
 * release vintage, thousands: [1st, 2nd, 3rd] estimate for each reference
 * month, January 2022 to October 2026. `null` is a vintage not yet published,
 * or never published (the October–November 2025 appropriations lapse: no
 * first print for October 2025, no second for September 2025).
 *
 * Source: BLS, "CES National Benchmark and Revisions: Total nonfarm",
 * https://www.bls.gov/web/empsit/cesnaicsrev.htm , read 8 November 2026.
 * September 2026 (29 -> 60) and October 2026 (165) from the November 6
 * Employment Situation release. These are the monthly revisions only; annual
 * benchmark revisions are not included.
 */
export type PayrollVintage = readonly [first: number | null, second: number | null, third: number | null];

export const PAYROLL_VINTAGE_START = { year: 2022, month: 1 } as const;

export const PAYROLL_VINTAGES: readonly PayrollVintage[] = [
  // 2022
  [467, 481, 504], [678, 750, 714], [431, 428, 398], [428, 436, 368],
  [390, 384, 386], [372, 398, 293], [528, 526, 537], [315, 315, 292],
  [263, 315, 269], [261, 284, 263], [263, 256, 290], [223, 260, 239],
  // 2023
  [517, 504, 472], [311, 326, 248], [236, 165, 217], [253, 294, 217],
  [339, 306, 281], [209, 185, 105], [187, 157, 236], [187, 227, 165],
  [336, 297, 262], [150, 150, 105], [199, 173, 182], [216, 333, 290],
  // 2024
  [353, 229, 256], [275, 270, 236], [303, 315, 310], [175, 165, 108],
  [272, 218, 216], [206, 179, 118], [114, 89, 144], [142, 159, 78],
  [254, 223, 255], [12, 36, 43], [227, 212, 261], [256, 307, 323],
  // 2025
  [143, 125, 111], [151, 117, 102], [228, 185, 120], [177, 147, 158],
  [139, 144, 19], [147, 14, -13], [73, 79, 72], [22, -4, -26],
  [119, null, 108], [null, -105, -173], [64, 56, 41], [50, 48, -17],
  // 2026
  [130, 126, 160], [-92, -133, -156], [178, 185, 214], [115, 179, 148],
  [172, 129, 63], [57, 20, 31], [-23, 21, -10], [162, 133, 186],
  [29, 60, null], [165, null, null],
];
