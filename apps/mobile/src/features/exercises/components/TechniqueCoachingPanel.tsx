import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { TechniqueCoachingDetails } from '../services/exerciseService';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

export interface TechniqueCoachingPanelProps {
  coaching: TechniqueCoachingDetails;
}

type CoachingTab = 'SETUP' | 'POSITION' | 'MOVEMENT' | 'BREATHING' | 'TEMPO';

export const TechniqueCoachingPanel: React.FC<TechniqueCoachingPanelProps> = ({
  coaching,
}) => {
  const [activeTab, setActiveTab] = useState<CoachingTab>('SETUP');

  const tabs: Array<{ id: CoachingTab; label: string; icon: any }> = [
    { id: 'SETUP', label: 'Setup', icon: 'settings' },
    { id: 'POSITION', label: 'Position', icon: 'user' },
    { id: 'MOVEMENT', label: 'Movement', icon: 'activity' },
    { id: 'BREATHING', label: 'Breathing', icon: 'flame' },
    { id: 'TEMPO', label: 'Tempo', icon: 'timer' },
  ];

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="award" size={18} color={themeColors.accent} />
          <Text style={styles.title}>Technique Coaching Panel</Text>
        </View>
        <Badge label="COACHING GUIDE" variant="accent" />
      </View>

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, activeTab === t.id && styles.tabBtnActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Icon
              name={t.icon}
              size={14}
              color={activeTab === t.id ? themeColors.accent : themeColors.textSecondary}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === t.id && styles.tabLabelActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'SETUP' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>Preparation & Environment</Text>
            {coaching.setup.map((item, idx) => (
              <View key={idx} style={styles.checkRow}>
                <Icon name="check-circle" size={16} color={themeColors.accent} />
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'POSITION' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>Body Region Alignment</Text>
            {coaching.position.feet && (
              <View style={styles.positionItem}>
                <Text style={styles.positionLabel}>Feet & Base:</Text>
                <Text style={styles.positionValue}>{coaching.position.feet}</Text>
              </View>
            )}
            {coaching.position.hands && (
              <View style={styles.positionItem}>
                <Text style={styles.positionLabel}>Hands & Grip:</Text>
                <Text style={styles.positionValue}>{coaching.position.hands}</Text>
              </View>
            )}
            {coaching.position.spine && (
              <View style={styles.positionItem}>
                <Text style={styles.positionLabel}>Spine & Pelvis:</Text>
                <Text style={styles.positionValue}>{coaching.position.spine}</Text>
              </View>
            )}
            {coaching.position.head && (
              <View style={styles.positionItem}>
                <Text style={styles.positionLabel}>Head & Gaze:</Text>
                <Text style={styles.positionValue}>{coaching.position.head}</Text>
              </View>
            )}
            {coaching.position.core && (
              <View style={styles.positionItem}>
                <Text style={styles.positionLabel}>Core & Bracing:</Text>
                <Text style={styles.positionValue}>{coaching.position.core}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'MOVEMENT' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>Kinematics & Trajectory</Text>
            <View style={styles.gridRow}>
              <View style={styles.gridBox}>
                <Text style={styles.gridLabel}>Pattern</Text>
                <Text style={styles.gridValue}>
                  {coaching.movement.movementPattern || 'Standard'}
                </Text>
              </View>
              <View style={styles.gridBox}>
                <Text style={styles.gridLabel}>Direction</Text>
                <Text style={styles.gridValue}>
                  {coaching.movement.direction || 'Controlled'}
                </Text>
              </View>
            </View>
            <View style={styles.positionItem}>
              <Text style={styles.positionLabel}>Active Range of Motion:</Text>
              <Text style={styles.positionValue}>
                {coaching.movement.rangeOfMotion || 'Complete controlled range'}
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'BREATHING' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>Breath Cadence & Intra-Abdominal Pressure</Text>
            <Text style={styles.breathingOverview}>
              {coaching.breathing.pattern ||
                'Inhale to brace on eccentric; exhale through the sticking point.'}
            </Text>
            {coaching.breathing.cues && coaching.breathing.cues.length > 0 && (
              <View style={styles.cuesList}>
                {coaching.breathing.cues.map((cue, idx) => (
                  <View key={idx} style={styles.checkRow}>
                    <Icon name="bolt" size={14} color="#38BDF8" />
                    <Text style={styles.itemText}>{cue}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'TEMPO' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>Tempo Cadence & Execution Timing</Text>
            <View style={styles.tempoPillBox}>
              <Text style={styles.tempoPillValue}>
                {coaching.tempo.value || '3 - 0 - 1 - 0'}
              </Text>
            </View>
            <Text style={styles.tempoExplanation}>
              {coaching.tempo.explanation ||
                'Eccentric (lower) -> Pause at bottom -> Concentric (drive) -> Pause at top'}
            </Text>
          </View>
        )}
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#0F141F',
    borderRadius: radius.md,
    padding: 3,
    marginBottom: sp.md,
    justifyContent: 'space-between',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: radius.sm,
    gap: 4,
  },
  tabBtnActive: {
    backgroundColor: themeColors.cardBackground,
  },
  tabLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 10,
  },
  tabLabelActive: {
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  contentContainer: {
    minHeight: 120,
  },
  tabContent: {
    paddingTop: 2,
  },
  sectionHeader: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: sp.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  itemText: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  positionItem: {
    marginBottom: 8,
  },
  positionLabel: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
    marginBottom: 2,
  },
  positionValue: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    lineHeight: 18,
  },
  gridRow: {
    flexDirection: 'row',
    gap: sp.sm,
    marginBottom: sp.sm,
  },
  gridBox: {
    flex: 1,
    backgroundColor: '#0F141F',
    padding: sp.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.cardBorder,
  },
  gridLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginBottom: 2,
  },
  gridValue: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  breathingOverview: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    marginBottom: sp.sm,
    lineHeight: 20,
  },
  cuesList: {
    marginTop: 4,
  },
  tempoPillBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: themeColors.accent,
    paddingVertical: sp.sm,
    paddingHorizontal: sp.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: sp.sm,
  },
  tempoPillValue: {
    ...typography.h2,
    color: themeColors.accent,
    letterSpacing: 2,
  },
  tempoExplanation: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
