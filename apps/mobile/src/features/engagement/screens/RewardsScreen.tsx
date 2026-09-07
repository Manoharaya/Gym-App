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
import { engagementService, AchievementsResponse } from '../services/engagementService';
import type { Reward } from '@fitcore/types';

export const RewardsScreen: React.FC = () => {
  const [achievements, setAchievements] = useState<AchievementsResponse | null>(null);
  const [rewardsCatalog, setRewardsCatalog] = useState<Reward[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'badges' | 'rewards'>('badges');

  const fetchRewards = useCallback(async () => {
    try {
      const [achieveData, catData] = await Promise.all([
        engagementService.getAchievements(),
        engagementService.getRewards(),
      ]);
      setAchievements(achieveData);
      setRewardsCatalog(catData);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRewards();
  };

  const handleRedeem = async (memberRewardId: string, rewardName: string) => {
    Alert.alert('Redeem Reward', `Are you sure you want to redeem '${rewardName}' now?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Redeem',
        onPress: async () => {
          try {
            await engagementService.redeemReward(memberRewardId);
            Alert.alert('Redeemed!', `You have successfully redeemed '${rewardName}'. Show this confirmation to gym staff.`);
            fetchRewards();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to redeem reward');
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Badges & Rewards</Text>
          <Text style={styles.subtitle}>Celebrate your milestones and redeem hard-earned fitness perks</Text>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'badges' && styles.tabButtonActive]}
            onPress={() => setActiveTab('badges')}
          >
            <Text style={[styles.tabText, activeTab === 'badges' && styles.tabTextActive]}>
              🎖️ Earned Badges ({achievements?.badges.length || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'rewards' && styles.tabButtonActive]}
            onPress={() => setActiveTab('rewards')}
          >
            <Text style={[styles.tabText, activeTab === 'rewards' && styles.tabTextActive]}>
              🎁 Member Perks ({achievements?.rewards.length || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 40 }} />
        ) : activeTab === 'badges' ? (
          !achievements?.badges || achievements.badges.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Badges Earned Yet</Text>
              <Text style={styles.emptyText}>
                Complete workouts, maintain your daily streak, and attend classes to unlock achievement badges!
              </Text>
            </Card>
          ) : (
            <View style={styles.badgeGrid}>
              {achievements.badges.map((mb) => (
                <Card key={mb.id} style={styles.badgeCard}>
                  <Text style={styles.badgeEmoji}>🏆</Text>
                  <Text style={styles.badgeName}>{mb.badge?.name || 'Milestone'}</Text>
                  <Text style={styles.badgeDesc}>{mb.badge?.description || ''}</Text>
                  <Text style={styles.awardedDate}>
                    Earned {new Date(mb.awardedAt).toLocaleDateString()}
                  </Text>
                </Card>
              ))}
            </View>
          )
        ) : (
          /* Rewards Tab */
          <>
            {/* My Assigned / Available Rewards */}
            <Text style={styles.sectionHeader}>My Available Rewards</Text>
            {!achievements?.rewards || achievements.rewards.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Rewards Currently Assigned</Text>
                <Text style={styles.emptyText}>
                  Earn perks through gym challenges, workout milestones, and streaks.
                </Text>
              </Card>
            ) : (
              achievements.rewards.map((mr) => {
                const isAvailable = mr.status === 'AVAILABLE';
                return (
                  <Card key={mr.id} style={styles.rewardCard}>
                    <View style={styles.rewardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rewardName}>{mr.reward?.name || 'Perk'}</Text>
                        <Text style={styles.rewardDesc}>{mr.reward?.description || ''}</Text>
                        {mr.expiresAt ? (
                          <Text style={styles.expiryText}>
                            Expires: {new Date(mr.expiresAt).toLocaleDateString()}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              mr.status === 'REDEEMED'
                                ? 'rgba(100, 116, 139, 0.2)'
                                : isAvailable
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color:
                                mr.status === 'REDEEMED'
                                  ? '#94A3B8'
                                  : isAvailable
                                  ? '#10B981'
                                  : '#EF4444',
                            },
                          ]}
                        >
                          {mr.status}
                        </Text>
                      </View>
                    </View>

                    {isAvailable ? (
                      <Button
                        title="Redeem Voucher"
                        onPress={() => handleRedeem(mr.id, mr.reward?.name || 'Perk')}
                        size="sm"
                        style={{ marginTop: 12 }}
                      />
                    ) : mr.redeemedAt ? (
                      <Text style={styles.redeemedDateText}>
                        Redeemed on {new Date(mr.redeemedAt).toLocaleDateString()}
                      </Text>
                    ) : null}
                  </Card>
                );
              })
            )}

            {/* General Reward Catalog */}
            <Text style={[styles.sectionHeader, { marginTop: spacing[6] }]}>Perks Catalog</Text>
            {rewardsCatalog.map((rc) => (
              <Card key={rc.id} style={styles.catalogRewardCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.catalogRewardName}>{rc.name}</Text>
                  <Text style={styles.catalogRewardDesc}>{rc.description}</Text>
                  <Text style={styles.catalogCategory}>
                    Category: {rc.category} {rc.inventory ? `• Remaining: ${rc.inventory}` : ''}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing[4],
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: themeColors.primary,
  },
  tabText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#FFFFFF',
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
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  badgeCard: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    padding: spacing[4],
    alignItems: 'center',
    borderColor: '#334155',
    borderWidth: 1,
  },
  badgeEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  badgeName: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  badgeDesc: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  awardedDate: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 8,
  },
  sectionHeader: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  rewardCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[2],
    borderColor: '#334155',
    borderWidth: 1,
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rewardName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  rewardDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  expiryText: {
    color: '#F59E0B',
    fontSize: 11,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  redeemedDateText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  catalogRewardCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[1],
    borderColor: '#334155',
    borderWidth: 1,
  },
  catalogRewardName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  catalogRewardDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  catalogCategory: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
});
