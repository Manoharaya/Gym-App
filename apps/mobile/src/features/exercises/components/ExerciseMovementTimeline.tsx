import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { ExerciseMovementPhase } from '@fitcore/types';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
};

export interface ExerciseMovementTimelineProps {
  phases: ExerciseMovementPhase[];
  exerciseName?: string;
  tempoStructure?: any;
  repetitionType?: string;
  onEditPhase?: (phase: ExerciseMovementPhase) => void;
  canEdit?: boolean;
}

export const ExerciseMovementTimeline: React.FC<ExerciseMovementTimelineProps> = ({
  phases = [],
  exerciseName = 'Exercise',
  tempoStructure,
  repetitionType = 'REPETITION',
  onEditPhase,
  canEdit = false,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!phases || phases.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Icon name="activity" size={36} color={themeColors.textMuted} />
        <Text style={styles.emptyTitle}>No Movement Phases Defined</Text>
        <Text style={styles.emptySubtitle}>
          The movement lifecycle for {exerciseName} has not been broken down into biomechanical phases yet.
        </Text>
      </Card>
    );
  }

  const currentPhase = (phases[activeIndex] || phases[0])!;
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === phases.length - 1;

  const handlePrev = () => {
    if (!isFirst) setActiveIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    if (!isLast) setActiveIndex((prev) => prev + 1);
  };

  const mediaSourceUrl =
    (currentPhase as any).media?.signedUrl ||
    (currentPhase as any).media?.url ||
    currentPhase.mediaUrl ||
    null;

  const jointAlignments = Array.isArray(currentPhase.jointAlignments)
    ? currentPhase.jointAlignments
    : [];
  const checkpoints = Array.isArray(currentPhase.keyCheckpoints)
    ? currentPhase.keyCheckpoints
    : [];
  const visualCues = Array.isArray(currentPhase.visualCues)
    ? currentPhase.visualCues
    : [];
  const commonMistakes = Array.isArray(currentPhase.commonMistakes)
    ? currentPhase.commonMistakes
    : [];

  return (
    <View style={styles.wrapper}>
      {/* Top Architecture Summary Strip */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>MOVEMENT LIFECYCLE</Text>
          <Text style={styles.summaryValue}>{phases.length} Phases</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>REP TYPE</Text>
          <Text style={styles.summaryValue}>{repetitionType.replace('_', ' ')}</Text>
        </View>
        {tempoStructure && (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>TEMPO BLUEPRINT</Text>
              <Text style={styles.summaryValue}>
                {tempoStructure.eccentricSeconds ?? 0}-{tempoStructure.bottomHoldSeconds ?? 0}-
                {tempoStructure.concentricSeconds ?? 0}-{tempoStructure.topHoldSeconds ?? 0}s
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Horizontal Phase Lifecycle Stepper */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stepperContainer}
      >
        {phases.map((phase, idx) => {
          const isActive = idx === activeIndex;
          return (
            <TouchableOpacity
              key={phase.id || idx}
              style={[styles.stepperNode, isActive && styles.stepperNodeActive]}
              onPress={() => setActiveIndex(idx)}
              activeOpacity={0.8}
            >
              <View style={[styles.nodeIndexCircle, isActive && styles.nodeIndexCircleActive]}>
                <Text style={[styles.nodeIndexText, isActive && styles.nodeIndexTextActive]}>
                  {idx + 1}
                </Text>
              </View>
              <View style={styles.nodeMeta}>
                <Text
                  style={[styles.nodeName, isActive && styles.nodeNameActive]}
                  numberOfLines={1}
                >
                  {phase.phaseName}
                </Text>
                <Text style={styles.nodeType} numberOfLines={1}>
                  {phase.phaseType || 'PHASE'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Active Phase Deep Dive Card */}
      <Card style={styles.activePhaseCard}>
        {/* Phase Header */}
        <View style={styles.phaseHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeCluster}>
              <Badge
                label={`Phase ${activeIndex + 1} of ${phases.length}`}
                variant="primary"
              />
              {currentPhase.phaseType && (
                <Badge
                  label={currentPhase.phaseType.replace('_', ' ')}
                  variant="accent"
                />
              )}
              {currentPhase.rangeOfMotionType && (
                <Badge
                  label={`ROM: ${currentPhase.rangeOfMotionType}`}
                  variant="neutral"
                />
              )}
            </View>
            <Text style={styles.phaseTitle}>
              {currentPhase.title || currentPhase.phaseName}
            </Text>
            {currentPhase.description ? (
              <Text style={styles.phaseDescription}>{currentPhase.description}</Text>
            ) : null}
          </View>

          {canEdit && onEditPhase && (
            <TouchableOpacity
              style={styles.editPhaseButton}
              onPress={() => onEditPhase(currentPhase)}
            >
              <Icon name="settings" size={14} color={themeColors.primary} />
              <Text style={styles.editPhaseButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Real-Time Verbal Coaching Cue Callout */}
        {currentPhase.cueText && (
          <View style={styles.cueCallout}>
            <Icon name="sparkles" size={16} color={themeColors.primary} />
            <Text style={styles.cueText}>"{currentPhase.cueText}"</Text>
          </View>
        )}

        {/* Media & Sub-Second Loop Preview */}
        {mediaSourceUrl && (
          <View style={styles.mediaContainer}>
            <Image
              source={{ uri: mediaSourceUrl }}
              style={styles.mediaPreview}
              resizeMode="cover"
            />
            {(currentPhase.videoStartTimeSeconds != null ||
              currentPhase.videoEndTimeSeconds != null) && (
              <View style={styles.loopBadgeContainer}>
                <Icon name="timer" size={12} color="#FFFFFF" />
                <Text style={styles.loopBadgeText}>
                  Loop: {currentPhase.videoStartTimeSeconds ?? 0}s –{' '}
                  {currentPhase.videoEndTimeSeconds ?? 'end'}s
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Biomechanical Position & Cadence Row */}
        <View style={styles.metricGrid}>
          {currentPhase.bodyPosition && (
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>BODY POSITION</Text>
              <Text style={styles.metricCardValue}>{currentPhase.bodyPosition}</Text>
              {currentPhase.bodyOrientation && (
                <Text style={styles.metricCardSub}>{currentPhase.bodyOrientation}</Text>
              )}
            </View>
          )}

          {currentPhase.breathingPattern && (
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>BREATHING CADENCE</Text>
              <Text style={styles.metricCardValue}>
                {currentPhase.breathingPattern.replace('_', ' ')}
              </Text>
              {currentPhase.breathingNotes ? (
                <Text style={styles.metricCardSub} numberOfLines={2}>
                  {currentPhase.breathingNotes}
                </Text>
              ) : null}
            </View>
          )}

          {(currentPhase.tempoSeconds != null || currentPhase.holdDurationSeconds != null) && (
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>PHASE TEMPO</Text>
              <Text style={styles.metricCardValue}>
                {currentPhase.tempoSeconds != null ? `${currentPhase.tempoSeconds}s Active` : ''}
                {currentPhase.holdDurationSeconds != null
                  ? ` + ${currentPhase.holdDurationSeconds}s Hold`
                  : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Biomechanical Joint Alignment Matrix */}
        {jointAlignments.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderWithIcon}>
              <Icon name="shield" size={14} color={themeColors.accent} />
              <Text style={styles.sectionHeading}>JOINT & SKELETAL ALIGNMENT</Text>
            </View>
            <View style={styles.jointAlignmentsList}>
              {jointAlignments.map((ja: any, jIdx: number) => {
                const status = ja.status || 'OPTIMAL';
                const statusVariant =
                  status === 'OPTIMAL' ? 'accent' : status === 'FAULT' ? 'danger' : 'neutral';

                return (
                  <View key={jIdx} style={styles.jointCard}>
                    <View style={styles.jointCardHeader}>
                      <Text style={styles.jointName}>{ja.joint}</Text>
                      <Badge label={status} variant={statusVariant as any} />
                    </View>
                    <Text style={styles.jointAlignmentText}>{ja.alignment}</Text>
                    {ja.cue && (
                      <View style={styles.jointCueRow}>
                        <Icon name="sparkles" size={10} color={themeColors.textMuted} />
                        <Text style={styles.jointCueText}>Cue: "{ja.cue}"</Text>
                      </View>
                    )}
                    {ja.angleDegrees != null && (
                      <Text style={styles.jointAngleText}>
                        Target Angle: ~{ja.angleDegrees}°
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Visual Cues & Checkpoints */}
        {(visualCues.length > 0 || checkpoints.length > 0) && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderWithIcon}>
              <Icon name="check" size={14} color={themeColors.primary} />
              <Text style={styles.sectionHeading}>KEY CHECKPOINTS & VISUAL CUES</Text>
            </View>
            <View style={styles.cuesList}>
              {checkpoints.map((cp: string, cIdx: number) => (
                <View key={`cp-${cIdx}`} style={styles.cueRow}>
                  <Icon name="check" size={12} color={themeColors.primary} />
                  <Text style={styles.cueItemText}>{cp}</Text>
                </View>
              ))}
              {visualCues.map((vc: any, vIdx: number) => (
                <View key={`vc-${vIdx}`} style={styles.cueRow}>
                  <Icon name="bolt" size={12} color={themeColors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cueItemText}>{vc.text}</Text>
                    {vc.category && (
                      <Text style={styles.cueCategoryText}>Category: {vc.category}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Phase-Specific Common Mistakes */}
        {commonMistakes.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderWithIcon}>
              <Icon name="alert-circle" size={14} color="#EF4444" />
              <Text style={[styles.sectionHeading, { color: '#EF4444' }]}>
                PITFALLS TO AVOID IN THIS PHASE
              </Text>
            </View>
            {commonMistakes.map((cm: any, mIdx: number) => (
              <View key={mIdx} style={styles.mistakeCard}>
                <Text style={styles.mistakeTitle}>⚠️ {cm.mistake}</Text>
                {cm.consequence && (
                  <Text style={styles.mistakeConsequence}>Risk: {cm.consequence}</Text>
                )}
                <View style={styles.correctionRow}>
                  <Text style={styles.correctionLabel}>Fix:</Text>
                  <Text style={styles.correctionText}>{cm.correction}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Safety Notes */}
        {currentPhase.safetyNotes && (
          <View style={styles.safetyBox}>
            <Icon name="alert-circle" size={14} color="#F59E0B" />
            <Text style={styles.safetyText}>{currentPhase.safetyNotes}</Text>
          </View>
        )}

        {/* Phase Navigation Controls */}
        <View style={styles.navigationControlsRow}>
          <TouchableOpacity
            style={[styles.navBtn, isFirst && styles.navBtnDisabled]}
            onPress={handlePrev}
            disabled={isFirst}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={isFirst ? themeColors.textMuted : themeColors.textPrimary}
            />
            <Text style={[styles.navBtnText, isFirst && styles.navBtnTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          <View style={styles.navCounter}>
            <Text style={styles.navCounterText}>
              {activeIndex + 1} / {phases.length}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.navBtn, isLast && styles.navBtnDisabled]}
            onPress={handleNext}
            disabled={isLast}
          >
            <Text style={[styles.navBtnText, isLast && styles.navBtnTextDisabled]}>
              Next
            </Text>
            <Icon
              name="chevron-right"
              size={16}
              color={isLast ? themeColors.textMuted : themeColors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: sp.sm,
  },
  emptyCard: {
    padding: sp.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.surface,
  },
  emptyTitle: {
    ...typography.h4,
    color: themeColors.textPrimary,
    marginTop: sp.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: themeColors.textMuted,
    marginTop: sp.xs,
    textAlign: 'center',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.md,
    paddingVertical: sp.sm,
    paddingHorizontal: sp.md,
    marginBottom: sp.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summaryValue: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: themeColors.border,
  },
  stepperContainer: {
    flexDirection: 'row',
    paddingVertical: sp.xs,
    marginBottom: sp.md,
  },
  stepperNode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surface,
    paddingVertical: sp.sm,
    paddingHorizontal: sp.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginRight: sp.sm,
  },
  stepperNodeActive: {
    backgroundColor: themeColors.surfaceElevated,
    borderColor: themeColors.primary,
  },
  nodeIndexCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: themeColors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sp.xs,
  },
  nodeIndexCircleActive: {
    backgroundColor: themeColors.primary,
  },
  nodeIndexText: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
  },
  nodeIndexTextActive: {
    color: '#000000',
  },
  nodeMeta: {
    flexDirection: 'column',
  },
  nodeName: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  nodeNameActive: {
    color: themeColors.textPrimary,
  },
  nodeType: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontSize: 9,
  },
  activePhaseCard: {
    backgroundColor: themeColors.surface,
    padding: sp.lg,
    borderRadius: radius.lg,
  },
  phaseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: sp.md,
  },
  badgeCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
    marginBottom: sp.xs,
  },
  phaseTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  phaseDescription: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    marginTop: sp.xs,
    lineHeight: 20,
  },
  editPhaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp.xs,
    paddingHorizontal: sp.sm,
    borderRadius: radius.sm,
    backgroundColor: themeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: 4,
  },
  editPhaseButtonText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '600',
  },
  cueCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: themeColors.primary,
    padding: sp.md,
    borderRadius: radius.sm,
    marginBottom: sp.md,
    gap: sp.sm,
  },
  cueText: {
    ...typography.body,
    color: themeColors.primary,
    fontStyle: 'italic',
    fontWeight: '600',
    flex: 1,
  },
  mediaContainer: {
    position: 'relative',
    height: 180,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: sp.md,
    backgroundColor: '#000000',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  loopBadgeContainer: {
    position: 'absolute',
    bottom: sp.sm,
    right: sp.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    gap: 4,
  },
  loopBadgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 10,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.sm,
    marginBottom: sp.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.sm,
    padding: sp.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  metricCardLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  metricCardValue: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  metricCardSub: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  sectionBlock: {
    marginTop: sp.md,
    paddingTop: sp.md,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    marginBottom: sp.sm,
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  jointAlignmentsList: {
    gap: sp.sm,
  },
  jointCard: {
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.sm,
    padding: sp.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  jointCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jointName: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  jointAlignmentText: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
  },
  jointCueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  jointCueText: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontStyle: 'italic',
  },
  jointAngleText: {
    ...typography.caption,
    color: themeColors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  cuesList: {
    gap: sp.xs,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sp.xs,
    paddingVertical: 2,
  },
  cueItemText: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    flex: 1,
  },
  cueCategoryText: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontSize: 10,
  },
  mistakeCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: radius.sm,
    padding: sp.sm,
    marginBottom: sp.xs,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  mistakeTitle: {
    ...typography.bodySm,
    color: '#F87171',
    fontWeight: '600',
  },
  mistakeConsequence: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  correctionRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  correctionLabel: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  correctionText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    flex: 1,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    padding: sp.sm,
    borderRadius: radius.sm,
    marginTop: sp.md,
    gap: sp.sm,
  },
  safetyText: {
    ...typography.caption,
    color: '#FBBF24',
    flex: 1,
  },
  navigationControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: sp.lg,
    paddingTop: sp.md,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp.sm,
    paddingHorizontal: sp.md,
    borderRadius: radius.sm,
    backgroundColor: themeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: 4,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  navBtnTextDisabled: {
    color: themeColors.textMuted,
  },
  navCounter: {
    alignItems: 'center',
  },
  navCounterText: {
    ...typography.bodySm,
    color: themeColors.textMuted,
    fontWeight: '600',
  },
});
