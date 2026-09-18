import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { themeColors, radius, spacing } from '../../../theme';
import { Icon, Badge } from '../../../components/primitives';

interface AdaptivePracticePlanCardProps {
  exerciseName: string;
  suggestedSequence: string[];
  gapsCount: number;
  onStartPractice: () => void;
  loading?: boolean;
}

export const AdaptivePracticePlanCard: React.FC<AdaptivePracticePlanCardProps> = ({
  exerciseName,
  suggestedSequence,
  gapsCount,
  onStartPractice,
  loading = false,
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.cardBackground,
          borderColor: themeColors.border,
          borderRadius: radius.md,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Badge label="TARGETED REHEARSAL" variant="accent" />
          <Badge label={`${gapsCount} TOPICS`} variant="neutral" />
        </View>
        <Icon name="sparkles" size={16} color={themeColors.primary} />
      </View>

      <Text style={[styles.title, { color: themeColors.textPrimary }]}>
        Practice What You Need to Review
      </Text>
      <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
        Personalized rehearsal flow for {exerciseName} addressing your specific learning needs.
      </Text>

      <View style={[styles.sequenceContainer, { backgroundColor: themeColors.elevatedBackground, borderRadius: radius.sm }]}>
        {suggestedSequence.map((step, idx) => (
          <View key={idx} style={styles.stepRow}>
            <View style={[styles.stepNumberBadge, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border }]}>
              <Text style={[styles.stepNumberText, { color: themeColors.primary }]}>{idx + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: themeColors.textPrimary }]}>{step}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.actionButton,
          {
            backgroundColor: themeColors.primary,
            borderRadius: radius.sm,
            opacity: loading ? 0.7 : 1,
          },
        ]}
        onPress={onStartPractice}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Icon name="dumbbell" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Start Targeted Practice</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  sequenceContainer: {
    padding: 10,
    gap: 8,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
