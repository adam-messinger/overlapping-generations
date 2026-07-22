export type DefensePolicyId =
  | 'continued-waivers'
  | 'abrupt-cutoff'
  | 'stockpile-only'
  | 'staged-cutoff'
  | 'accelerated-qualification'
  | 'combined-resilience';

export interface DefenseCapacityProject {
  id: string;
  /** Capacity as a fraction of normal U.S. defense magnet demand. */
  capacity: number;
  /** Month when physical production is commissioned, relative to July 2026. */
  commissionMonth: number;
  /** Baseline months from commissioning to defense qualification. */
  qualificationMonths: number;
}

export interface DefenseSourcingParams {
  months: number;
  cutoffMonth: number;
  initialQualifiedCapacity: number;
  initialPhysicalUnqualifiedCapacity: number;
  initialUnqualifiedQualificationMonths: number;
  projects: readonly DefenseCapacityProject[];
  stockpileMonths: number;
  qualificationTimeMultiplier: number;
  projectTimeMultiplier: number;
  /** Waiver availability by month; one fills any compliant-capacity gap. */
  waiverPath: readonly number[];
  compliantCostPremium: number;
  emergencySpotPremium: number;
}

const months = 42;
const fill = (value: number): number[] => Array.from({ length: months }, () => value);
const cutoffMonth = 6;

/**
 * Publicly visible project timing is represented as capacity relative to the
 * much smaller defense market, not as a claim about global magnet output.
 * DOD said in 2024 that its mine-to-magnet investments were intended to cover
 * all defense requirements by 2027; qualification timing remains uncertain.
 */
export const defenseSourcingDefaults: DefenseSourcingParams = {
  months,
  cutoffMonth,
  initialQualifiedCapacity: 0.35,
  initialPhysicalUnqualifiedCapacity: 0.10,
  initialUnqualifiedQualificationMonths: 9,
  projects: [
    { id: 'project-a', capacity: 0.40, commissionMonth: 6, qualificationMonths: 12 },
    { id: 'project-b', capacity: 0.30, commissionMonth: 12, qualificationMonths: 18 },
  ],
  stockpileMonths: 2,
  qualificationTimeMultiplier: 1,
  projectTimeMultiplier: 1,
  waiverPath: fill(1),
  compliantCostPremium: 0.35,
  emergencySpotPremium: 1.0,
};

function stagedWaivers(endMonth: number): number[] {
  return Array.from({ length: months }, (_, month) => {
    if (month < cutoffMonth) return 1;
    if (month >= endMonth) return 0;
    return 1 - (month - cutoffMonth) / Math.max(1, endMonth - cutoffMonth);
  });
}

export const defensePolicies: Readonly<Record<DefensePolicyId, Partial<DefenseSourcingParams>>> = {
  'continued-waivers': {
    waiverPath: fill(1),
    stockpileMonths: 2,
  },
  'abrupt-cutoff': {
    waiverPath: Array.from({ length: months }, (_, month) => month < cutoffMonth ? 1 : 0),
    stockpileMonths: 2,
  },
  'stockpile-only': {
    waiverPath: Array.from({ length: months }, (_, month) => month < cutoffMonth ? 1 : 0),
    stockpileMonths: 6,
  },
  'staged-cutoff': {
    waiverPath: stagedWaivers(30),
    stockpileMonths: 2,
  },
  'accelerated-qualification': {
    waiverPath: Array.from({ length: months }, (_, month) => month < cutoffMonth ? 1 : 0),
    stockpileMonths: 2,
    qualificationTimeMultiplier: 0.5,
  },
  'combined-resilience': {
    waiverPath: stagedWaivers(24),
    stockpileMonths: 3,
    qualificationTimeMultiplier: 0.5,
    projectTimeMultiplier: 0.85,
  },
};
