import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
};

export interface VisualCueItem {
  category: 'POSTURE' | 'ALIGNMENT' | 'BREATHING' | 'TEMPO' | 'RANGE_OF_MOTION' | 'SAFETY' | 'FOCUS' | string;
  cue: string;
}

export interface VisualCuesBannerProps {
  cues: VisualCueItem[];
}

export const VisualCuesBanner: React.FC<VisualCuesBannerProps> = ({ cues }) => {
  if (!cues || cues.length === 0) return null;

  const getCategoryConfig = (category: string) => {
    switch (category.toUpperCase()) {
      case 'POSTURE':
        return { color: '#F59E0B', icon: 'user' as const, label: 'Posture' };
      case 'ALIGNMENT':
        return { color: '#38BDF8', icon: 'activity' as const, label: 'Alignment' };
      case 'BREATHING':
        return { color: '#EC4899', icon: 'flame' as const, label: 'Breathing' };
      case 'TEMPO':
        return { color: '#10B981', icon: 'timer' as const, label: 'Tempo' };
      case 'RANGE_OF_MOTION':
        return { color: '#8B5CF6', icon: 'bolt' as const, label: 'Range of Motion' };
      case 'SAFETY':
        return { color: '#EF4444', icon: 'alert-circle' as const, label: 'Safety' };
      case 'FOCUS':
      default:
        return { color: themeColors.accent, icon: 'sparkles' as const, label: 'Focus' };
    }
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="sparkles" size={16} color={themeColors.accent} />
          <Text style={styles.title}>Visual Coaching Cues</Text>
        </View>
        <Badge label={`${cues.length} CUES`} variant="accent" />
      </View>

      <View style={styles.cuesList}>
        {cues.map((item, idx) => {
          const cfg = getCategoryConfig(item.category);
          return (
            <View key={idx} style={[styles.cueCard, { borderLeftColor: cfg.color }]}>
              <View style={styles.cueHeader}>
                <View style={[styles.categoryTag, { backgroundColor: `${cfg.color}22` }]}>
                  <Icon name={cfg.icon} size={12} color={cfg.color} />
                  <Text style={[styles.categoryText, { color: cfg.color }]}>
                    {cfg.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.cueText}>{item.cue}</Text>
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
    marginBottom: sp.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  cuesList: {
    gap: 8,
  },
  cueCard: {
    backgroundColor: '#0F141F',
    borderRadius: radius.md,
    padding: sp.sm,
    borderLeftWidth: 3,
  },
  cueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cueText: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    lineHeight: 18,
  },
});
