/**
 * FitCore Workload Distribution & User Mix Fixtures
 */

export interface WorkloadDistribution {
  memberAppPercent: number;
  classBookingPercent: number;
  accessCheckInPercent: number;
  trainingWorkoutPercent: number;
  nutritionProgressPercent: number;
  communicationPercent: number;
  salesReceptionistPercent: number;
  financePercent: number;
  aiPercent: number;
  adminAnalyticsPercent: number;
}

export const standardWorkloadDistribution: WorkloadDistribution = {
  memberAppPercent: 30,
  classBookingPercent: 15,
  accessCheckInPercent: 10,
  trainingWorkoutPercent: 10,
  nutritionProgressPercent: 10,
  communicationPercent: 5,
  salesReceptionistPercent: 5,
  financePercent: 5,
  aiPercent: 5,
  adminAnalyticsPercent: 5,
};

export const userRoleDistribution = {
  MEMBER: 75,
  TRAINER: 10,
  RECEPTION: 6,
  OUTLET_MANAGER: 4,
  FINANCE: 2,
  ORGANISATION_OWNER: 2,
  DEVELOPER_API: 0.8,
  SUPERADMIN: 0.2,
};
