import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Card, Button, Icon, ProgressRing, Badge } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { dailyCheckInService } from '../services/dailyCheckInService';
import type { DailyCheckInDto } from '@fitcore/types';

type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;

export const DailyCheckInHomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkIn, setCheckIn] = useState<DailyCheckInDto | null>(null);

  const loadTodayCheckIn = async () => {
    try {
      const data = await dailyCheckInService.getTodayCheckIn();
      setCheckIn(data);
    } catch {
      // Gracefully handle if not yet started
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTodayCheckIn();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadTodayCheckIn();
  };

  const isCompleted = checkIn?.status === 'COMPLETED';
  const isFlagged = checkIn?.safetyFlagged;

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-left" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Intelligence</Text>
        <TouchableOpacity
          onPress={() => (navigation as any).navigate('DailyCheckInHistory')}
          style={styles.historyBtn}
          accessibilityLabel="View history"
        >
          <Icon name="timer" size={20} color={themeColors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.accent} />
        }
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={themeColors.accent} />
            <Text style={styles.loadingText}>Loading today's status...</Text>
          </View>
        ) : isCompleted ? (
          /* State A: Completed for today */
          <View style={styles.completedContainer}>
            <Card style={styles.statusCard}>
              <View style={styles.statusBadgeRow}>
                <Badge
                  label={isFlagged ? 'SAFETY ATTENTION' : 'CHECK-IN COMPLETE'}
                  variant={isFlagged ? 'danger' : 'success'}
                />
                <Text style={styles.dateText}>{checkIn?.checkInDate}</Text>
              </View>

              <View style={styles.readinessHeroRow}>
                <ProgressRing
                  progress={checkIn?.readinessScore ?? 75}
                  size={90}
                  strokeWidth={9}
                  color={
                    checkIn?.readinessCategory === 'OPTIMAL'
                      ? themeColors.success
                      : checkIn?.readinessCategory === 'MODERATE'
                      ? themeColors.accent
                      : themeColors.warning
                  }
                  valueText={`${checkIn?.readinessScore ?? 75}%`}
                  label="SCORE"
                />
                <View style={styles.readinessTextCol}>
                  <Text style={styles.readinessCategoryTitle}>
                    {checkIn?.readinessCategory === 'OPTIMAL'
                      ? 'Optimal Planning Window'
                      : checkIn?.readinessCategory === 'MODERATE'
                      ? 'Moderate Planning Capacity'
                      : 'Recovery-Focused Day'}
                  </Text>
                  <Text style={styles.readinessDisclaimerText}>
                    FitCore training-planning indicator (non-clinical)
                  </Text>
                </View>
              </View>

              {checkIn?.aiTodayFocus ? (
                <View style={styles.todayFocusBox}>
                  <Text style={styles.focusLabel}>TODAY'S FOCUS</Text>
                  <Text style={styles.focusText}>{checkIn.aiTodayFocus}</Text>
                </View>
              ) : null}

              <Button
                title="View Full Daily Insight"
                onPress={() =>
                  (navigation as any).navigate('DailyCheckInResult', { checkInId: checkIn?.id })
                }
                variant="accent"
                rightIcon={<Icon name="chevron-right" size={18} color="#FFFFFF" />}
                style={styles.actionBtn}
              />
            </Card>

            {/* Quick action shortcuts */}
            <View style={styles.shortcutRow}>
              <TouchableOpacity
                style={styles.shortcutCard}
                onPress={() => (navigation as any).navigate('DailyCheckInHistory')}
              >
                <Icon name="calendar" size={20} color={themeColors.accent} />
                <Text style={styles.shortcutTitle}>History & Trends</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shortcutCard}
                onPress={() =>
                  (navigation as any).navigate('DailyCheckInQuestion')
                }
              >
                <Icon name="refresh" size={20} color={themeColors.textSecondary} />
                <Text style={styles.shortcutTitle}>Update Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* State B: Not completed for today */
          <View style={styles.uncompletedContainer}>
            <View style={styles.welcomeBanner}>
              <Text style={styles.greetingTitle}>Good morning. Let's check in.</Text>
              <Text style={styles.greetingSubtitle}>
                A quick 30–60 second pulse check to align your scheduled training with how you feel today.
              </Text>
            </View>

            <Card style={styles.promptCard}>
              <View style={styles.timeBadgeRow}>
                <View style={styles.timePill}>
                  <Icon name="timer" size={14} color={themeColors.accent} />
                  <Text style={styles.timePillText}>30–60 Seconds</Text>
                </View>
                <Text style={styles.safeTag}>Private & Non-Medical</Text>
              </View>

              <Text style={styles.promptHeading}>What we evaluate together:</Text>
              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Icon name="bolt" size={16} color={themeColors.accent} />
                  <Text style={styles.bulletText}>Energy & Motivation</Text>
                </View>
                <View style={styles.bulletItem}>
                  <Icon name="clock" size={16} color={themeColors.accent} />
                  <Text style={styles.bulletText}>Sleep Quality & Restfulness</Text>
                </View>
                <View style={styles.bulletItem}>
                  <Icon name="flame" size={16} color={themeColors.accent} />
                  <Text style={styles.bulletText}>Muscle Soreness & Perceived Stress</Text>
                </View>
                <View style={styles.bulletItem}>
                  <Icon name="dumbbell" size={16} color={themeColors.accent} />
                  <Text style={styles.bulletText}>Training Consistency & Today's Schedule</Text>
                </View>
              </View>

              <Button
                title="Start Check-In"
                onPress={() => (navigation as any).navigate('DailyCheckInQuestion')}
                variant="accent"
                leftIcon={<Icon name="sparkles" size={18} color="#FFFFFF" />}
                style={styles.startBtn}
              />
            </Card>

            <TouchableOpacity
              style={styles.privacyLink}
              onPress={() => {
                if (checkIn?.id) {
                  (navigation as any).navigate('DailyCheckInDetail', { checkInId: checkIn.id });
                }
              }}
            >
              <Icon name="shield" size={14} color={themeColors.textTertiary} />
              <Text style={styles.privacyLinkText}>
                FitCore Privacy: No medical diagnoses or financial data accessed.
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  historyBtn: {
    padding: spacing.xs,
  },
  centerContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    marginTop: spacing.md,
  },
  completedContainer: {
    gap: spacing.lg,
  },
  statusCard: {
    padding: spacing.lg,
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.md,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  readinessHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  readinessTextCol: {
    flex: 1,
  },
  readinessCategoryTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginBottom: spacing.xs,
  },
  readinessDisclaimerText: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  todayFocusBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: themeColors.accent,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  focusLabel: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  focusText: {
    ...typography.body,
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  actionBtn: {
    marginTop: spacing.sm,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  shortcutCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  shortcutTitle: {
    ...typography.bodySecondary,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  uncompletedContainer: {
    gap: spacing.lg,
  },
  welcomeBanner: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  greetingTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
  },
  greetingSubtitle: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    lineHeight: 20,
  },
  promptCard: {
    padding: spacing.xl,
    backgroundColor: themeColors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.md,
  },
  timeBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  timePillText: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
  },
  safeTag: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  promptHeading: {
    ...typography.body,
    color: themeColors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  bulletList: {
    gap: spacing.sm,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bulletText: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
  },
  startBtn: {
    marginTop: spacing.md,
  },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  privacyLinkText: {
    ...typography.caption,
    color: themeColors.textTertiary,
    textAlign: 'center',
  },
});
