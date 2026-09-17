import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { Card, Icon, Badge } from '../../../components/primitives';

export interface LearningStreakCardProps {
  streakDays: number;
  lastActivityAt?: string | null;
}

export const LearningStreakCard: React.FC<LearningStreakCardProps> = ({
  streakDays,
  lastActivityAt,
}) => {
  return (
    <Card style={styles.card}>
      <View style={styles.contentRow}>
        <View style={styles.flameCircle}>
          <Icon name="flame" size={24} color="#FF6B00" />
        </View>

        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <Text style={styles.streakNumber}>
              {streakDays} {streakDays === 1 ? 'Day' : 'Days'}
            </Text>
            <Badge
              label={streakDays > 0 ? 'ACTIVE STREAK' : 'START TODAY'}
              variant={streakDays > 0 ? 'primary' : 'neutral'}
            />
          </View>
          <Text style={styles.streakSub}>
            {streakDays > 0
              ? `Consecutive daily fitness learning consistency${lastActivityAt ? ` · Last active ${new Date(lastActivityAt).toLocaleDateString()}` : ''}`
              : 'Complete a lesson today to ignite your learning streak'}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 107, 0, 0.06)',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.2)',
    marginBottom: spacing.md,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flameCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  streakNumber: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  streakSub: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.textSecondary,
    lineHeight: 16,
  },
});
