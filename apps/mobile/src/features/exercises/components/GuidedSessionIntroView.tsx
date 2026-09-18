import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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

interface GuidedSessionIntroViewProps {
  sessionDetail: GuidedSessionDetail;
  onStartSession: () => void;
}

export const GuidedSessionIntroView: React.FC<GuidedSessionIntroViewProps> = ({
  sessionDetail,
  onStartSession,
}) => {
  const { session, equipmentNeededSummary, structureBreakdown, movementPatterns } =
    sessionDetail;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Welcome Card */}
      <Card style={styles.heroCard}>
        <View style={styles.badgeRow}>
          <Badge
            label={session.difficulty}
            variant={
              session.difficulty === 'ADVANCED'
                ? 'danger'
                : session.difficulty === 'INTERMEDIATE'
                ? 'warning'
                : 'success'
            }
          />
          {session.category && (
            <Badge label={session.category} variant="accent" />
          )}
        </View>

        <Text style={styles.heroTitle}>{session.title}</Text>

        {session.description ? (
          <Text style={styles.heroDesc}>{session.description}</Text>
        ) : null}

        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <Icon name="clock" size={16} color={themeColors.accent} />
            <Text style={styles.quickStatText}>
              ~{session.estimatedDurationMinutes} min
            </Text>
          </View>

          <View style={styles.quickStat}>
            <Icon name="activity" size={16} color={themeColors.accent} />
            <Text style={styles.quickStatText}>
              {structureBreakdown.totalItems} steps
            </Text>
          </View>

          {movementPatterns.length > 0 && (
            <View style={styles.quickStat}>
              <Icon name="sparkles" size={16} color={themeColors.accent} />
              <Text style={styles.quickStatText}>
                {movementPatterns.join(', ')}
              </Text>
            </View>
          )}
        </View>
      </Card>

      {/* What You'll Learn Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="activity" size={20} color={themeColors.accent} />
          <Text style={styles.sectionTitle}>What You'll Learn</Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.checkItem}>
            <View style={styles.checkIconBox}>
              <Icon name="check" size={14} color="#10B981" />
            </View>
            <Text style={styles.checkText}>
              Movement fundamentals and joint alignment principles
            </Text>
          </View>

          <View style={styles.checkItem}>
            <View style={styles.checkIconBox}>
              <Icon name="check" size={14} color="#10B981" />
            </View>
            <Text style={styles.checkText}>
              Kinematic breakdown across eccentric, bottom transition, and drive phases
            </Text>
          </View>

          <View style={styles.checkItem}>
            <View style={styles.checkIconBox}>
              <Icon name="check" size={14} color="#10B981" />
            </View>
            <Text style={styles.checkText}>
              Breathing coordination and tempo cadence for spinal stability
            </Text>
          </View>

          <View style={styles.checkItem}>
            <View style={styles.checkIconBox}>
              <Icon name="check" size={14} color="#10B981" />
            </View>
            <Text style={styles.checkText}>
              Common mechanical faults and non-diagnostic self-correction cues
            </Text>
          </View>
        </Card>
      </View>

      {/* What You'll Need (Equipment) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="dumbbell" size={20} color={themeColors.accent} />
          <Text style={styles.sectionTitle}>What You'll Need</Text>
        </View>

        <Card style={styles.card}>
          {equipmentNeededSummary.length > 0 ? (
            <View style={styles.equipmentGrid}>
              {equipmentNeededSummary.map((eq, idx) => (
                <View key={idx} style={styles.equipmentChip}>
                  <Icon name="check-circle" size={14} color={themeColors.accent} />
                  <Text style={styles.equipmentText}>{eq.replace('_', ' ')}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.equipmentChip}>
              <Icon name="check-circle" size={14} color="#10B981" />
              <Text style={styles.equipmentText}>
                No special equipment required (Bodyweight friendly)
              </Text>
            </View>
          )}
        </Card>
      </View>

      {/* Session Structure Breakdown */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="dumbbell" size={20} color={themeColors.accent} />
          <Text style={styles.sectionTitle}>Session Structure</Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.structureRow}>
            <View style={styles.structureCol}>
              <Text style={styles.structureLabel}>Warm-Up</Text>
              <Text style={styles.structureVal}>
                {structureBreakdown.warmupMinutes || 3} min
              </Text>
            </View>

            <View style={styles.structureDivider} />

            <View style={styles.structureCol}>
              <Text style={styles.structureLabel}>Tutorials</Text>
              <Text style={styles.structureVal}>
                {structureBreakdown.tutorialMinutes || 10} min
              </Text>
            </View>

            <View style={styles.structureDivider} />

            <View style={styles.structureCol}>
              <Text style={styles.structureLabel}>Practice</Text>
              <Text style={styles.structureVal}>
                {structureBreakdown.practiceMinutes || 8} min
              </Text>
            </View>

            <View style={styles.structureDivider} />

            <View style={styles.structureCol}>
              <Text style={styles.structureLabel}>Cooldown</Text>
              <Text style={styles.structureVal}>
                {structureBreakdown.cooldownMinutes || 2} min
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Start Button */}
      <View style={styles.ctaContainer}>
        <Button
          title="Start Guided Session"
          variant="primary"
          onPress={onStartSession}
          leftIcon={<Icon name="timer" size={18} color="#FFFFFF" />}
          style={styles.ctaButton}
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
    marginBottom: sp.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: sp.xs,
    marginBottom: sp.sm,
  },
  heroTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
    marginBottom: sp.xs,
  },
  heroDesc: {
    ...typography.body,
    color: themeColors.textSecondary,
    marginBottom: sp.md,
    lineHeight: 22,
  },
  quickStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.md,
    paddingTop: sp.sm,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickStatText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  section: {
    marginBottom: sp.lg,
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
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sp.sm,
    marginBottom: sp.sm,
  },
  checkIconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.sm,
  },
  equipmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: sp.sm,
    backgroundColor: '#1E2638',
    borderRadius: radius.sm,
  },
  equipmentText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  structureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  structureCol: {
    alignItems: 'center',
    flex: 1,
  },
  structureLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginBottom: 4,
  },
  structureVal: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  structureDivider: {
    width: 1,
    height: 24,
    backgroundColor: themeColors.border,
  },
  ctaContainer: {
    marginTop: sp.md,
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 14,
  },
});
