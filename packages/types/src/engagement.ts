export enum EngagementEventType {
  APP_OPENED = 'APP_OPENED',
  PROFILE_COMPLETED = 'PROFILE_COMPLETED',
  MEMBERSHIP_ACTIVATED = 'MEMBERSHIP_ACTIVATED',
  GYM_CHECKED_IN = 'GYM_CHECKED_IN',
  CLASS_BOOKED = 'CLASS_BOOKED',
  CLASS_ATTENDED = 'CLASS_ATTENDED',
  CLASS_CANCELLED = 'CLASS_CANCELLED',
  CLASS_NO_SHOW = 'CLASS_NO_SHOW',
  WORKOUT_STARTED = 'WORKOUT_STARTED',
  WORKOUT_COMPLETED = 'WORKOUT_COMPLETED',
  TRAINING_PLAN_STARTED = 'TRAINING_PLAN_STARTED',
  TRAINING_PLAN_COMPLETED = 'TRAINING_PLAN_COMPLETED',
  GOAL_CREATED = 'GOAL_CREATED',
  GOAL_PROGRESS_UPDATED = 'GOAL_PROGRESS_UPDATED',
  GOAL_COMPLETED = 'GOAL_COMPLETED',
  MEAL_LOGGED = 'MEAL_LOGGED',
  MEAL_PLAN_VIEWED = 'MEAL_PLAN_VIEWED',
  NUTRITION_TARGET_REACHED = 'NUTRITION_TARGET_REACHED',
  PROGRESS_RECORDED = 'PROGRESS_RECORDED',
  ASSESSMENT_COMPLETED = 'ASSESSMENT_COMPLETED',
  CHALLENGE_JOINED = 'CHALLENGE_JOINED',
  CHALLENGE_COMPLETED = 'CHALLENGE_COMPLETED',
  REWARD_EARNED = 'REWARD_EARNED',
  REWARD_REDEEMED = 'REWARD_REDEEMED',
  NOTIFICATION_OPENED = 'NOTIFICATION_OPENED',
}

export enum EngagementSourceType {
  ATTENDANCE = 'ATTENDANCE',
  WORKOUT = 'WORKOUT',
  BOOKING = 'BOOKING',
  GOAL = 'GOAL',
  NUTRITION = 'NUTRITION',
  CHALLENGE = 'CHALLENGE',
  HABIT = 'HABIT',
  REWARD = 'REWARD',
  SYSTEM = 'SYSTEM',
}

export enum EngagementLevel {
  NEW = 'NEW',
  ACTIVE = 'ACTIVE',
  ENGAGED = 'ENGAGED',
  HIGHLY_ENGAGED = 'HIGHLY_ENGAGED',
  AT_RISK = 'AT_RISK',
  DORMANT = 'DORMANT',
}

export enum HabitCategory {
  ATTENDANCE = 'ATTENDANCE',
  WORKOUT = 'WORKOUT',
  NUTRITION = 'NUTRITION',
  HYDRATION = 'HYDRATION',
  MOBILITY = 'MOBILITY',
  RECOVERY = 'RECOVERY',
  SLEEP = 'SLEEP',
  GOAL = 'GOAL',
  CUSTOM = 'CUSTOM',
}

export enum HabitFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

export enum HabitStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ChallengeType {
  ATTENDANCE = 'ATTENDANCE',
  WORKOUT_COMPLETION = 'WORKOUT_COMPLETION',
  CLASS_ATTENDANCE = 'CLASS_ATTENDANCE',
  HABIT_COMPLETION = 'HABIT_COMPLETION',
  GOAL_PROGRESS = 'GOAL_PROGRESS',
  CUSTOM = 'CUSTOM',
}

export enum ChallengeStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum ParticipantStatus {
  JOINED = 'JOINED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
}

export enum RewardStatus {
  AVAILABLE = 'AVAILABLE',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum RewardCategory {
  ACHIEVEMENT_BADGE = 'ACHIEVEMENT_BADGE',
  FREE_CLASS = 'FREE_CLASS',
  GUEST_PASS = 'GUEST_PASS',
  MERCHANDISE_DISCOUNT = 'MERCHANDISE_DISCOUNT',
  RECOGNITION = 'RECOGNITION',
  PERK = 'PERK',
}

export enum EngagementSegment {
  NEW_MEMBER = 'NEW_MEMBER',
  ACTIVE_MEMBER = 'ACTIVE_MEMBER',
  HIGHLY_ENGAGED = 'HIGHLY_ENGAGED',
  LOW_ACTIVITY = 'LOW_ACTIVITY',
  AT_RISK = 'AT_RISK',
  DORMANT = 'DORMANT',
  CHALLENGE_PARTICIPANT = 'CHALLENGE_PARTICIPANT',
  CONSISTENT_WORKOUT_MEMBER = 'CONSISTENT_WORKOUT_MEMBER',
  CONSISTENT_ATTENDANCE_MEMBER = 'CONSISTENT_ATTENDANCE_MEMBER',
}

export interface EngagementEvent {
  id: string;
  organisationId: string;
  outletId?: string | null;
  memberId: string;
  eventType: EngagementEventType | string;
  sourceType: EngagementSourceType | string;
  sourceId?: string | null;
  metadata?: Record<string, any> | null;
  idempotencyKey?: string | null;
  occurredAt: string | Date;
  createdAt: string | Date;
}

export interface MemberEngagementProfile {
  id: string;
  organisationId: string;
  memberId: string;
  engagementLevel: EngagementLevel | string;
  engagementScore: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityAt?: string | Date | null;
  lastGymVisitAt?: string | Date | null;
  lastWorkoutAt?: string | Date | null;
  lastNutritionActivityAt?: string | Date | null;
  totalVisits: number;
  totalWorkouts: number;
  totalCompletedClasses: number;
  totalCompletedGoals: number;
  updatedAt: string | Date;
  createdAt: string | Date;
}

export interface EngagementScoreSnapshot {
  id: string;
  organisationId: string;
  memberId: string;
  score: number;
  engagementLevel: EngagementLevel | string;
  calculatedAt: string | Date;
  calculationVersion: number;
  scoreBreakdown?: {
    attendanceScore: number;
    workoutScore: number;
    goalScore: number;
    nutritionScore: number;
    challengeScore: number;
    recencyScore: number;
    decayMultiplier: number;
  } | null;
}

export interface Habit {
  id: string;
  organisationId?: string | null;
  name: string;
  description?: string | null;
  category: HabitCategory | string;
  frequency: HabitFrequency | string;
  target: number;
  unit?: string | null;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface MemberHabit {
  id: string;
  organisationId: string;
  memberId: string;
  habitId: string;
  habit?: Habit;
  startDate: string | Date;
  endDate?: string | Date | null;
  target: number;
  frequency: HabitFrequency | string;
  status: HabitStatus | string;
  currentStreak: number;
  longestStreak: number;
  createdById?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface HabitCompletion {
  id: string;
  memberHabitId: string;
  date: string | Date;
  value: number;
  unit?: string | null;
  completed: boolean;
  source: string;
  notes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Challenge {
  id: string;
  organisationId: string;
  outletId?: string | null;
  name: string;
  description?: string | null;
  challengeType: ChallengeType | string;
  metric: string;
  target: number;
  periodDays?: number | null;
  startDate: string | Date;
  endDate: string | Date;
  status: ChallengeStatus | string;
  participationLimit?: number | null;
  leaderboardEnabled: boolean;
  participantCount?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  memberId: string;
  organisationId: string;
  joinedAt: string | Date;
  completedAt?: string | Date | null;
  currentProgress: number;
  target: number;
  status: ParticipantStatus | string;
  rank?: number | null;
  updatedAt: string | Date;
}

export interface LeaderboardEntry {
  rank: number;
  memberId: string;
  displayName: string;
  avatarUrl?: string | null;
  progress: number;
  target: number;
  completed: boolean;
}

export interface Badge {
  id: string;
  organisationId?: string | null;
  code: string;
  name: string;
  description: string;
  category: string;
  iconUrl?: string | null;
  criteria: Record<string, any>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface MemberBadge {
  id: string;
  organisationId: string;
  memberId: string;
  badgeId: string;
  badge?: Badge;
  awardedAt: string | Date;
  metadata?: Record<string, any> | null;
}

export interface Reward {
  id: string;
  organisationId: string;
  outletId?: string | null;
  name: string;
  description: string;
  category: RewardCategory | string;
  pointsRequired: number;
  inventory?: number | null;
  active: boolean;
  validDays?: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface MemberReward {
  id: string;
  organisationId: string;
  memberId: string;
  rewardId: string;
  reward?: Reward;
  status: RewardStatus | string;
  earnedAt: string | Date;
  expiresAt?: string | Date | null;
  redeemedAt?: string | Date | null;
  redemptionNotes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Future AI Integration Data Contract (Slice 37).
 * Pure data contract with strictly zero LLM execution or AI logic on Day 18.
 */
export interface MemberEngagementContext {
  memberId: string;
  organisationId: string;
  engagementLevel: string;
  engagementScore: number;
  currentStreak: number;
  longestStreak: number;
  recentActivity: EngagementEvent[];
  workoutSummary: {
    totalCompleted: number;
    lastWorkoutAt?: string | Date | null;
    weeklyWorkouts: number;
  };
  attendanceSummary: {
    totalVisits: number;
    lastVisitAt?: string | Date | null;
    weeklyVisits: number;
  };
  goalSummary: {
    totalGoals: number;
    completedGoals: number;
    activeGoals: number;
  };
  nutritionSummary: {
    lastLoggedAt?: string | Date | null;
    weeklyLogs: number;
  };
  challengeSummary: {
    activeCount: number;
    completedCount: number;
  };
  habitSummary: {
    activeCount: number;
    weeklyCompletionRate: number;
  };
}
