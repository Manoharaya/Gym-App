import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Card, Badge, Icon, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { GuidedSessionDetail } from '../services/exerciseService';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

interface GuidedSessionCompletionViewProps {
  sessionDetail: GuidedSessionDetail;
  timeSpentSeconds?: number;
  onReturnToDashboard: () => void;
  onBrowseMoreSessions: () => void;
}

export const GuidedSessionCompletionView: React.FC<GuidedSessionCompletionViewProps> = ({
  sessionDetail,
  timeSpentSeconds = 600,
  onReturnToDashboard,
  onBrowseMoreSessions,
}) => {
  const { session, items, movementPatterns, primeMuscles } = sessionDetail;

  const exerciseItems = items.filter((i) => i.itemType === 'EXERCISE_TUTORIAL');
  const practiceItems = items.filter((i) => i.itemType === 'PRACTICE');

  const minutesSpent = Math.max(1, Math.round(timeSpentSeconds / 60));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Celebration Card */}
      <Card style={styles.heroCard}>
        <View style={styles.trophyBox}>
          <Icon name="award" size={44} color="#F59E0B" />
        </View>

        <Badge label="SESSION COMPLETED" variant="success" />

        <Text style={styles.heroTitle}>{session.title}</Text>
        <Text style={styles.heroSubtitle}>
          You have successfully completed this guided learning program!
        </Text>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{items.length}</Text>
            <Text style={styles.statLbl}>Learning Steps</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statVal}>{exerciseItems.length}</Text>
            <Text style={styles.statLbl}>Tutorials</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statVal}>{practiceItems.length}</Text>
            <Text style={styles.statLbl}>Practice Sets</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statVal}>{minutesSpent}m</Text>
            <Text style={styles.statLbl}>Study Time</Text>
          </View>
        </View>
      </Card>

      {/* Exercises Learned */}
      {exerciseItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="check-circle" size={20} color={themeColors.accent} />
            <Text style={styles.sectionTitle}>Exercises Learned</Text>
          </View>

          <Card style={styles.card}>
            {exerciseItems.map((item, idx) => (
              <View
                key={item.id}
                style={[
                  styles.exerciseRow,
                  idx === exerciseItems.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.exerciseIndexBadge}>
                  <Text style={styles.exerciseIndexText}>{idx + 1}</Text>
                </View>

                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>
                    {item.exercise?.name || item.title}
                  </Text>
                  <Text style={styles.exerciseSub}>
                    {item.exercise?.movementPattern || 'Movement fundamentals'} •{' '}
                    {item.exercise?.primaryMuscleGroup || 'Prime drivers'}
                  </Text>
                </View>

                <Badge label="100%" variant="success" />
              </View>
            ))}
          </Card>
        </View>
      )}

      {/* Concepts Learned */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="sparkles" size={20} color={themeColors.accent} />
          <Text style={styles.sectionTitle}>Concepts & Mechanics Mastered</Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.conceptRow}>
            <Icon name="check" size={16} color="#10B981" />
            <Text style={styles.conceptText}>
              Movement Patterns: {movementPatterns.join(', ') || 'Functional multi-joint kinematics'}
            </Text>
          </View>

          <View style={styles.conceptRow}>
            <Icon name="check" size={16} color="#10B981" />
            <Text style={styles.conceptText}>
              Prime Muscular Drivers: {primeMuscles.join(', ') || 'Core and compound musculature'}
            </Text>
          </View>

          <View style={styles.conceptRow}>
            <Icon name="check" size={16} color="#10B981" />
            <Text style={styles.conceptText}>
              Tempo Control and Controlled Descent Mechanics
            </Text>
          </View>

          <View style={styles.conceptRow}>
            <Icon name="check" size={16} color="#10B981" />
            <Text style={styles.conceptText}>
              Valsalva & Exhale Cadence for Biomechanical Safety
            </Text>
          </View>
        </Card>
      </View>

      {/* Continue Learning Recommendations */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="chevron-right" size={20} color={themeColors.accent} />
          <Text style={styles.sectionTitle}>Continue Learning</Text>
        </View>

        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.relatedLink}
            onPress={onBrowseMoreSessions}
            activeOpacity={0.8}
          >
            <View style={styles.relatedIconBox}>
              <Icon name="dumbbell" size={20} color={themeColors.accent} />
            </View>
            <View style={styles.relatedInfo}>
              <Text style={styles.relatedTitle}>Intermediate Movement Paths</Text>
              <Text style={styles.relatedSubtitle}>
                Progress to compound barbell and free-weight sequences
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={themeColors.textMuted} />
          </TouchableOpacity>
        </Card>
      </View>

      {/* Primary Actions */}
      <View style={styles.actionsContainer}>
        <Button
          title="Back to Dashboard"
          variant="primary"
          onPress={onReturnToDashboard}
          leftIcon={<Icon name="home" size={16} color="#FFFFFF" />}
          style={styles.actionBtn}
        />
        <Button
          title="Browse Guided Sessions"
          variant="outline"
          onPress={onBrowseMoreSessions}
          leftIcon={<Icon name="activity" size={16} color={themeColors.textPrimary} />}
          style={styles.actionBtn}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  content: {
    padding: sp.md,
    paddingBottom: sp.lg * 2,
  },
  heroCard: {
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.lg,
    padding: sp.lg,
    alignItems: 'center',
    marginBottom: sp.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  trophyBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  heroTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
    textAlign: 'center',
    marginTop: sp.sm,
    marginBottom: 4,
  },
  heroSubtitle: {
    ...typography.body,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: sp.lg,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingTop: sp.md,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 22,
    fontWeight: '800',
    color: themeColors.textPrimary,
    marginBottom: 2,
  },
  statLbl: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  section: {
    marginBottom: sp.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    marginBottom: sp.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  card: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    padding: sp.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2638',
    gap: sp.sm,
  },
  exerciseIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1E2638',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseIndexText: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  exerciseSub: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  conceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    marginBottom: sp.sm,
  },
  conceptText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    flex: 1,
  },
  relatedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
  },
  relatedIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: '#1E2638',
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedInfo: {
    flex: 1,
  },
  relatedTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  relatedSubtitle: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  actionsContainer: {
    gap: sp.sm,
    marginTop: sp.sm,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 14,
  },
});
