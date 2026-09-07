import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Screen, Card, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { engagementService } from '../services/engagementService';
import type { LeaderboardEntry } from '@fitcore/types';

export const ChallengesScreen: React.FC = () => {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<{
    challengeName: string;
    entries: LeaderboardEntry[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchChallenges = useCallback(async () => {
    try {
      const data = await engagementService.getChallenges();
      setChallenges(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load challenges');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChallenges();
  };

  const handleJoin = async (id: string) => {
    try {
      await engagementService.joinChallenge(id);
      Alert.alert('Success', 'Joined challenge! Workouts and attendance will now automatically count toward this goal.');
      fetchChallenges();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join challenge');
    }
  };

  const handleLeave = async (id: string) => {
    try {
      await engagementService.leaveChallenge(id);
      fetchChallenges();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to leave challenge');
    }
  };

  const handleViewLeaderboard = async (challengeId: string, challengeName: string) => {
    try {
      const entries = await engagementService.getLeaderboard(challengeId);
      setSelectedLeaderboard({ challengeName, entries });
    } catch (err: any) {
      Alert.alert('Leaderboard', err.message || 'Failed to load leaderboard');
    }
  };

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Gym Challenges</Text>
          <Text style={styles.subtitle}>Compete with yourself and fellow athletes in structured fitness challenges</Text>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 40 }} />
        ) : challenges.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Active Challenges</Text>
            <Text style={styles.emptyText}>Check back soon for new gym-wide and outlet challenges!</Text>
          </Card>
        ) : (
          challenges.map((c) => {
            const isJoined = c.isJoined;
            const progress = c.myProgress?.currentProgress || 0;
            const target = c.target || 1;
            const progressPct = Math.min(100, Math.round((progress / target) * 100));
            const isCompleted = c.myProgress?.status === 'COMPLETED';

            return (
              <Card key={c.id} style={styles.challengeCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.challengeName}>{c.name}</Text>
                    {c.description ? <Text style={styles.challengeDesc}>{c.description}</Text> : null}
                    <Text style={styles.metricText}>
                      Metric: {c.metric} • Target: {c.target}
                    </Text>
                  </View>
                  {isCompleted ? (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>Completed 🏆</Text>
                    </View>
                  ) : isJoined ? (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Joined</Text>
                    </View>
                  ) : null}
                </View>

                {/* Progress Bar if joined */}
                {isJoined ? (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressText}>
                        Progress: {progress} / {target}
                      </Text>
                      <Text style={styles.progressPercent}>{progressPct}%</Text>
                    </View>
                    <View style={styles.progressBarBackground}>
                      <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
                    </View>
                  </View>
                ) : null}

                {/* Card Actions */}
                <View style={styles.actionRow}>
                  {c.leaderboardEnabled ? (
                    <TouchableOpacity
                      style={styles.leaderboardButton}
                      onPress={() => handleViewLeaderboard(c.id, c.name)}
                    >
                      <Text style={styles.leaderboardButtonText}>Leaderboard</Text>
                    </TouchableOpacity>
                  ) : null}

                  {isJoined ? (
                    <TouchableOpacity style={styles.leaveButton} onPress={() => handleLeave(c.id)}>
                      <Text style={styles.leaveButtonText}>Withdraw</Text>
                    </TouchableOpacity>
                  ) : (
                    <Button
                      title="Join Challenge"
                      onPress={() => handleJoin(c.id)}
                      size="sm"
                      style={{ flex: 1 }}
                    />
                  )}
                </View>
              </Card>
            );
          })
        )}

        {/* Modal-like inline section for Leaderboard */}
        {selectedLeaderboard ? (
          <Card style={styles.leaderboardCard}>
            <View style={styles.leaderboardHeader}>
              <Text style={styles.leaderboardTitle}>🏆 {selectedLeaderboard.challengeName} Leaderboard</Text>
              <TouchableOpacity onPress={() => setSelectedLeaderboard(null)}>
                <Text style={styles.closeText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            {selectedLeaderboard.entries.length === 0 ? (
              <Text style={styles.emptyLeaderboardText}>No participant progress recorded yet.</Text>
            ) : (
              selectedLeaderboard.entries.map((entry) => (
                <View key={entry.memberId} style={styles.leaderboardRow}>
                  <Text style={styles.rankText}>#{entry.rank}</Text>
                  <Text style={styles.displayNameText}>{entry.displayName}</Text>
                  <Text style={styles.scoreText}>
                    {entry.progress} / {entry.target} {entry.completed ? '🏆' : ''}
                  </Text>
                </View>
              ))
            )}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  contentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[8] * 2,
  },
  header: {
    marginBottom: spacing[4],
  },
  title: {
    ...typography.heading2,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySmall,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    padding: spacing[6],
    alignItems: 'center',
    borderColor: '#334155',
    borderWidth: 1,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 16,
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    fontSize: 13,
  },
  challengeCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderColor: '#334155',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  challengeName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  challengeDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  metricText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  completedBadgeText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 11,
  },
  activeBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  activeBadgeText: {
    color: '#3B82F6',
    fontWeight: '700',
    fontSize: 11,
  },
  progressContainer: {
    marginTop: spacing[4],
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  progressPercent: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: radius.full,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[4],
    gap: spacing[2],
  },
  leaderboardButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#475569',
  },
  leaderboardButtonText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  leaveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leaveButtonText: {
    color: '#EF4444',
    fontSize: 12,
  },
  leaderboardCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.lg,
    padding: spacing[4],
    marginTop: spacing[2],
    borderColor: '#3B82F6',
    borderWidth: 1,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  leaderboardTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  emptyLeaderboardText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    padding: spacing[4],
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  rankText: {
    width: 30,
    color: themeColors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  displayNameText: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  scoreText: {
    color: '#94A3B8',
    fontSize: 12,
  },
});
