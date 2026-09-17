import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { TutorialCommonMistake } from '../services/exerciseService';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
};

export interface CommonMistakesSectionProps {
  mistakes: TutorialCommonMistake[];
}

export const CommonMistakesSection: React.FC<CommonMistakesSectionProps> = ({
  mistakes = [],
}) => {
  if (!mistakes || mistakes.length === 0) return null;

  const getSeverityBadge = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'SEVERE':
        return { color: '#EF4444', label: 'Severe' };
      case 'MODERATE':
        return { color: '#F59E0B', label: 'Moderate' };
      case 'MINOR':
      default:
        return { color: '#38BDF8', label: 'Minor' };
    }
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="alert-circle" size={18} color="#EF4444" />
          <Text style={styles.title}>Common Technique Mistakes</Text>
        </View>
        <Badge label={`${mistakes.length} FAULTS`} variant="danger" />
      </View>

      <View style={styles.list}>
        {mistakes.map((m, idx) => {
          const sev = getSeverityBadge(m.severity);
          return (
            <View key={m.id || idx} style={styles.mistakeCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.mistakeTitle}>
                  ❌ #{idx + 1}: {m.mistake}
                </Text>
                <View style={[styles.severityTag, { backgroundColor: `${sev.color}22` }]}>
                  <Text style={[styles.severityText, { color: sev.color }]}>
                    {sev.label}
                  </Text>
                </View>
              </View>

              {m.consequence && (
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionLabel}>What to watch for:</Text>
                  <Text style={styles.sectionText}>{m.consequence}</Text>
                </View>
              )}

              <View style={styles.correctionBox}>
                <Text style={styles.correctionLabel}>✓ Better Technique:</Text>
                <Text style={styles.correctionText}>{m.correction}</Text>
              </View>

              {m.mediaUrl && (
                <Image
                  source={{ uri: m.mediaUrl }}
                  style={styles.mediaPreview}
                  resizeMode="cover"
                />
              )}
            </View>
          );
        })}
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
  mistakeCard: {
    backgroundColor: '#0F141F',
    borderRadius: radius.md,
    padding: sp.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  mistakeTitle: {
    ...typography.bodyMd,
    color: themeColors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  severityTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionRow: {
    marginBottom: 6,
  },
  sectionLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '700',
    marginBottom: 2,
  },
  sectionText: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  correctionBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: radius.sm,
    padding: 8,
    marginTop: 4,
    borderLeftWidth: 2,
    borderLeftColor: themeColors.accent,
  },
  correctionLabel: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
    marginBottom: 2,
  },
  correctionText: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    lineHeight: 18,
  },
  mediaPreview: {
    width: '100%',
    height: 120,
    borderRadius: radius.sm,
    marginTop: 8,
  },
});
