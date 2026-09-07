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

export const HabitsScreen: React.FC = () => {
  const [habits, setHabits] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'my' | 'catalog'>('my');

  const fetchHabits = useCallback(async () => {
    try {
      const [myHabits, catalogHabits] = await Promise.all([
        engagementService.getMyHabits(),
        engagementService.getHabitCatalog(),
      ]);
      setHabits(myHabits);
      setCatalog(catalogHabits);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load habits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHabits();
  };

  const handleComplete = async (habitId: string, targetVal: number, unit?: string) => {
    try {
      const todayIso = new Date().toISOString().split('T')[0]!;
      await engagementService.completeHabit(habitId, {
        date: todayIso,
        value: targetVal,
        unit: unit || undefined,
      });
      fetchHabits();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete habit');
    }
  };

  const handleTogglePause = async (habitId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'ACTIVE') {
        await engagementService.pauseHabit(habitId);
      } else {
        await engagementService.resumeHabit(habitId);
      }
      fetchHabits();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update habit status');
    }
  };

  const handleAssignCatalogHabit = async (catalogHabitId: string) => {
    try {
      await engagementService.assignHabit({ habitId: catalogHabitId });
      Alert.alert('Success', 'Habit added to your routine!');
      setActiveTab('my');
      fetchHabits();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to assign habit');
    }
  };

  const isCompletedToday = (completions: any[]) => {
    if (!completions || completions.length === 0) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return completions.some((c) => {
      const cDate = new Date(c.date).toISOString().split('T')[0];
      return cDate === todayStr && c.completed;
    });
  };

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Daily Habits</Text>
          <Text style={styles.subtitle}>Small daily disciplines create extraordinary long-term momentum</Text>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'my' && styles.tabButtonActive]}
            onPress={() => setActiveTab('my')}
          >
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
              My Habits ({habits.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'catalog' && styles.tabButtonActive]}
            onPress={() => setActiveTab('catalog')}
          >
            <Text style={[styles.tabText, activeTab === 'catalog' && styles.tabTextActive]}>
              Habit Catalog ({catalog.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 40 }} />
        ) : activeTab === 'my' ? (
          habits.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Active Habits Yet</Text>
              <Text style={styles.emptyText}>
                Pick a habit from our catalog to start building your daily streak.
              </Text>
              <Button
                title="Browse Catalog"
                onPress={() => setActiveTab('catalog')}
                size="sm"
                style={{ marginTop: 12 }}
              />
            </Card>
          ) : (
            habits.map((h) => {
              const doneToday = isCompletedToday(h.completions);
              return (
                <Card key={h.id} style={styles.habitCard}>
                  <View style={styles.habitHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.habitName}>{h.habit?.name || 'Habit'}</Text>
                      <Text style={styles.habitTarget}>
                        Target: {h.target} {h.habit?.unit || 'times'} ({h.frequency})
                      </Text>
                    </View>
                    <View style={styles.streakBadge}>
                      <Text style={styles.streakBadgeText}>🔥 {h.currentStreak}d</Text>
                    </View>
                  </View>

                  <View style={styles.habitActions}>
                    <TouchableOpacity
                      style={[
                        styles.completeButton,
                        doneToday && styles.completeButtonDone,
                      ]}
                      onPress={() => handleComplete(h.id, h.target, h.habit?.unit)}
                      disabled={doneToday}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.completeButtonText}>
                        {doneToday ? '✓ Completed Today' : 'Mark as Done'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.pauseButton}
                      onPress={() => handleTogglePause(h.id, h.status)}
                    >
                      <Text style={styles.pauseButtonText}>
                        {h.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })
          )
        ) : (
          catalog.map((cat) => (
            <Card key={cat.id} style={styles.catalogCard}>
              <View style={styles.catalogInfo}>
                <Text style={styles.catalogName}>{cat.name}</Text>
                {cat.description ? <Text style={styles.catalogDesc}>{cat.description}</Text> : null}
                <Text style={styles.catalogCategory}>
                  Category: {cat.category} • Target: {cat.target} {cat.unit || 'times'}
                </Text>
              </View>
              <Button
                title="+ Add"
                onPress={() => handleAssignCatalogHabit(cat.id)}
                size="sm"
                variant="outline"
              />
            </Card>
          ))
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
  habitCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[2],
    borderColor: '#334155',
    borderWidth: 1,
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  habitName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  habitTarget: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  streakBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  streakBadgeText: {
    color: '#F97316',
    fontWeight: '700',
    fontSize: 12,
  },
  habitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[4],
    gap: spacing[2],
  },
  completeButton: {
    flex: 1,
    backgroundColor: themeColors.primary,
    borderRadius: radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  completeButtonDone: {
    backgroundColor: '#10B981',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  pauseButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#475569',
  },
  pauseButtonText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  catalogCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#334155',
    borderWidth: 1,
  },
  catalogInfo: {
    flex: 1,
    paddingRight: spacing[2],
  },
  catalogName: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 15,
  },
  catalogDesc: {
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
