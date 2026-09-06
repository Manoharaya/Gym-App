import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Card, Badge, Icon, MetricCard } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

type RouteProps = RouteProp<MemberStackParamList, 'ExerciseDetail'>;

export const ExerciseDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const exerciseName = route.params?.exerciseName ?? 'Barbell Bench Press';

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercise Library</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Title & Muscle Badges */}
        <View style={styles.titleSection}>
          <Text style={styles.exerciseTitle}>{exerciseName}</Text>
          <View style={styles.badgeRow}>
            <Badge label="CHEST" variant="accent" />
            <Badge label="COMPOUND" variant="primary" />
            <Badge label="BARBELL" variant="neutral" />
          </View>
        </View>

        {/* 1RM & History Metrics */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="ESTIMATED 1RM"
            value="102.5"
            unit="kg"
            change="+5 kg"
            trend="up"
            icon="trophy"
            accentColor={themeColors.accent}
            style={styles.flexMetric}
          />
          <MetricCard
            label="PERSONAL RECORD"
            value="90"
            unit="kg x 5"
            subtitle="Aug 28, 2026"
            icon="award"
            accentColor={themeColors.success}
            style={styles.flexMetric}
          />
        </View>

        {/* AI Form Cue Card */}
        <Card style={styles.aiCueCard}>
          <View style={styles.aiCueHeader}>
            <View style={styles.aiIconBadge}>
              <Icon name="sparkles" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.aiCueTitle}>AI BIOMECHANICAL CUE</Text>
          </View>
          <Text style={styles.aiCueText}>
            "Retract and depress your scapulae into the bench before unclipping. Maintain a 45° to
            60° elbow tuck on the eccentric descent to protect the anterior rotator cuff."
          </Text>
        </Card>

        {/* Step-by-Step Instructions */}
        <Card style={styles.instructionCard}>
          <Text style={styles.sectionHeading}>EXECUTION STEPS</Text>
          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Setup & Grip</Text>
                <Text style={styles.stepText}>
                  Lie flat with eyes directly below bar. Grip slightly wider than shoulder width with
                  thumbs wrapped securely.
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Controlled Descent</Text>
                <Text style={styles.stepText}>
                  Lower the barbell in a controlled tempo (2–3 seconds) until it gently contacts the
                  mid-sternum.
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Concentric Drive</Text>
                <Text style={styles.stepText}>
                  Press forcefully through your heels and chest, driving the bar upward along a slight
                  J-curve back over your shoulders.
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Common Mistakes */}
        <Card style={styles.mistakesCard}>
          <Text style={styles.sectionHeading}>COMMON MISTAKES TO AVOID</Text>
          <View style={styles.mistakeItem}>
            <Icon name="close" size={16} color={themeColors.danger} />
            <Text style={styles.mistakeText}>Flaring elbows 90° outwards from torso</Text>
          </View>
          <View style={styles.mistakeItem}>
            <Icon name="close" size={16} color={themeColors.danger} />
            <Text style={styles.mistakeText}>Bouncing the barbell off the ribcage</Text>
          </View>
          <View style={styles.mistakeItem}>
            <Icon name="close" size={16} color={themeColors.danger} />
            <Text style={styles.mistakeText}>Lifting glutes off the bench during drive</Text>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing[2],
    marginLeft: -spacing[2],
  },
  headerTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  container: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },
  titleSection: {
    gap: spacing[2],
  },
  exerciseTitle: {
    ...typography.h1,
    color: themeColors.textPrimary,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  flexMetric: {
    flex: 1,
  },
  aiCueCard: {
    backgroundColor: '#121624',
    borderColor: '#2D2254',
    borderWidth: 1,
    padding: spacing[4],
    gap: spacing[2],
  },
  aiCueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  aiIconBadge: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    backgroundColor: themeColors.aiPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCueTitle: {
    ...typography.caption,
    color: '#A78BFA',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiCueText: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  instructionCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stepsList: {
    gap: spacing[3],
  },
  stepItem: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: themeColors.surfaceActive,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  stepNumberText: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  stepText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  mistakesCard: {
    padding: spacing[4],
    gap: spacing[2.5],
  },
  mistakeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  mistakeText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    flex: 1,
  },
});
