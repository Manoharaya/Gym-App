import { apiClient } from '../../../services/api';
import type {
  MemberEngagementProfile,
  EngagementEvent,
  Habit,
  MemberHabit,
  HabitCompletion,
  Challenge,
  LeaderboardEntry,
  Badge,
  MemberBadge,
  Reward,
  MemberReward,
  MemberEngagementContext,
} from '@fitcore/types';

export interface EngagementSummaryResponse {
  profile: MemberEngagementProfile;
  weeklySummary: {
    visits: number;
    workouts: number;
    classes: number;
  };
  counts: {
    activeHabits: number;
    activeChallenges: number;
    earnedBadges: number;
  };
}

export interface PaginatedEventsResponse {
  data: EngagementEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AchievementsResponse {
  badges: (MemberBadge & { badge: Badge })[];
  rewards: (MemberReward & { reward: Reward })[];
}

export const engagementService = {
  async getEngagementProfile(): Promise<MemberEngagementProfile> {
    const res = await apiClient.get<MemberEngagementProfile>('/engagement/me');
    return res.data;
  },

  async getEngagementSummary(): Promise<EngagementSummaryResponse> {
    const res = await apiClient.get<EngagementSummaryResponse>('/engagement/me/summary');
    return res.data;
  },

  async getEngagementHistory(params?: {
    page?: number;
    limit?: number;
    eventType?: string;
  }): Promise<PaginatedEventsResponse> {
    const res = await apiClient.get<PaginatedEventsResponse>('/engagement/me/history', { params });
    return res.data;
  },

  async getEngagementContext(): Promise<MemberEngagementContext> {
    const res = await apiClient.get<MemberEngagementContext>('/engagement/me/context');
    return res.data;
  },

  async recordEvent(data: {
    eventType: string;
    sourceType: string;
    sourceId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<EngagementEvent> {
    const res = await apiClient.post<EngagementEvent>('/engagement/events', data);
    return res.data;
  },

  // Habits
  async getHabitCatalog(category?: string): Promise<Habit[]> {
    const res = await apiClient.get<Habit[]>('/habits', { params: { category } });
    return res.data;
  },

  async getMyHabits(status?: string): Promise<(MemberHabit & { habit: Habit; completions: HabitCompletion[] })[]> {
    const res = await apiClient.get<any[]>('/habits/my', { params: { status } });
    return res.data;
  },

  async assignHabit(data: {
    habitId: string;
    startDate?: string;
    endDate?: string;
    target?: number;
    frequency?: string;
  }): Promise<MemberHabit> {
    const res = await apiClient.post<MemberHabit>('/habits', data);
    return res.data;
  },

  async completeHabit(
    memberHabitId: string,
    data: {
      date: string;
      value: number;
      unit?: string;
      notes?: string;
    },
  ): Promise<{ completion: HabitCompletion; streak: any }> {
    const res = await apiClient.post<{ completion: HabitCompletion; streak: any }>(
      `/habits/${memberHabitId}/complete`,
      data,
    );
    return res.data;
  },

  async pauseHabit(memberHabitId: string): Promise<MemberHabit> {
    const res = await apiClient.post<MemberHabit>(`/habits/${memberHabitId}/pause`);
    return res.data;
  },

  async resumeHabit(memberHabitId: string): Promise<MemberHabit> {
    const res = await apiClient.post<MemberHabit>(`/habits/${memberHabitId}/resume`);
    return res.data;
  },

  // Challenges
  async getChallenges(params?: {
    status?: string;
    challengeType?: string;
    joinedOnly?: boolean;
  }): Promise<(Challenge & { participantCount: number; isJoined: boolean; myProgress: any })[]> {
    const res = await apiClient.get<any[]>('/challenges', { params });
    return res.data;
  },

  async getChallengeById(id: string): Promise<Challenge & { participantCount: number; isJoined: boolean; myProgress: any }> {
    const res = await apiClient.get<any>(`/challenges/${id}`);
    return res.data;
  },

  async joinChallenge(challengeId: string): Promise<any> {
    const res = await apiClient.post<any>(`/challenges/${challengeId}/join`);
    return res.data;
  },

  async leaveChallenge(challengeId: string): Promise<any> {
    const res = await apiClient.post<any>(`/challenges/${challengeId}/leave`);
    return res.data;
  },

  async getLeaderboard(challengeId: string, limit?: number): Promise<LeaderboardEntry[]> {
    const res = await apiClient.get<LeaderboardEntry[]>(`/challenges/${challengeId}/leaderboard`, {
      params: { limit },
    });
    return res.data;
  },

  // Rewards & Achievements
  async getRewards(outletId?: string): Promise<Reward[]> {
    const res = await apiClient.get<Reward[]>('/rewards', { params: { outletId } });
    return res.data;
  },

  async redeemReward(memberRewardId: string, notes?: string): Promise<MemberReward> {
    const res = await apiClient.post<MemberReward>(`/rewards/${memberRewardId}/redeem`, {
      redemptionNotes: notes,
    });
    return res.data;
  },

  async getAchievements(): Promise<AchievementsResponse> {
    const res = await apiClient.get<AchievementsResponse>('/achievements');
    return res.data;
  },
};
