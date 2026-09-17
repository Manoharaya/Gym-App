import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { TutorialSafetyGuideline } from '../services/exerciseService';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
};

export interface SafetyGuidanceSectionProps {
  guidelines: TutorialSafetyGuideline[];
}

export const SafetyGuidanceSection: React.FC<SafetyGuidanceSectionProps> = ({
  guidelines = [],
}) => {
  if (!guidelines || guidelines.length === 0) return null;

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="shield" size={18} color="#38BDF8" />
          <Text style={styles.title}>Safety & Injury Prevention</Text>
        </View>
        <Badge label="SAFETY PROTOCOL" variant="info" />
      </View>

      <View style={styles.list}>
        {guidelines.map((g, idx) => (
          <View key={g.id || idx} style={styles.guidelineCard}>
            <View style={styles.cardHeader}>
              <Icon
                name={g.severity === 'HIGH' ? 'alert-circle' : 'shield'}
                size={16}
                color={g.severity === 'HIGH' ? '#EF4444' : '#38BDF8'}
              />
              <Text style={styles.guidelineTitle}>
                {g.title || g.category.replace(/_/g, ' ')}
              </Text>
            </View>
            <Text style={styles.guidelineDesc}>{g.description}</Text>
          </View>
        ))}
      </View>

      {/* Non-diagnostic educational disclaimer */}
      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerText}>
          Non-diagnostic fitness guidance only. Immediately discontinue exercise if you experience joint pain, dizziness, or sharp discomfort.
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: sp.md,
    marginBottom: sp.md,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  list: {
    gap: sp.sm,
  },
  guidelineCard: {
    backgroundColor: '#0F141F',
    borderRadius: radius.md,
    padding: sp.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  guidelineTitle: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  guidelineDesc: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  disclaimerBox: {
    marginTop: sp.md,
    padding: 8,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  disclaimerText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
});
