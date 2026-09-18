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

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
};

export interface TechniqueCheckpoint {
  title: string;
  frontViewCue: string;
  sideViewCue: string;
  idealBiomechanicalMarker: string;
}

export interface MistakeComparisonItem {
  id: string;
  mistakeName: string;
  severity: 'MILD' | 'MODERATE' | 'CRITICAL';
  incorrectDescription: string;
  correctDescription: string;
  anatomicalRisk: string;
  correctiveCue: string;
  incorrectImageUrl?: string;
  correctImageUrl?: string;
}

export interface TechniqueComparisonProps {
  exerciseName: string;
  movementPattern?: string;
  checkpoints?: TechniqueCheckpoint[];
  commonMistakes?: MistakeComparisonItem[];
  frontImageUrl?: string;
  sideImageUrl?: string;
}

const DEFAULT_CHECKPOINTS: TechniqueCheckpoint[] = [
  {
    title: 'Stance & Joint Tracking',
    frontViewCue: 'Feet shoulder-width apart, knees tracking over 2nd & 3rd toes without inward collapse.',
    sideViewCue: 'Weight centered over midfoot, shins remain parallel to torso angle through descent.',
    idealBiomechanicalMarker: 'Patellar vector matches foot progression angle within 5° tolerance.',
  },
  {
    title: 'Spine & Pelvic Neutrality',
    frontViewCue: 'Level pelvis with bilateral symmetry; shoulders square and scapulae retracted.',
    sideViewCue: 'Neutral lumbar curve maintained; avoid excessive anterior pelvic tilt or lumbar flexion.',
    idealBiomechanicalMarker: 'Spinal columns remain in natural lordotic and kyphotic curves under axial load.',
  },
  {
    title: 'Range of Motion & Turnaround Depth',
    frontViewCue: 'Symmetrical hip descent without lateral shift or hip hike.',
    sideViewCue: 'Hip crease descends parallel with or below the top of patella; bar travels vertically.',
    idealBiomechanicalMarker: 'Full active joint range utilized while preserving tension in stabilizing musculature.',
  },
];

const DEFAULT_MISTAKES: MistakeComparisonItem[] = [
  {
    id: 'valgus_knee',
    mistakeName: 'Knee Valgus (Inward Buckle)',
    severity: 'MODERATE',
    incorrectDescription: 'Knees collapse medially towards each other during the concentric ascent phase.',
    correctDescription: 'Knees actively track in line with the middle toes throughout the entire movement.',
    anatomicalRisk: 'Excessive shear forces on ACL and patellofemoral cartilage.',
    correctiveCue: '"Screw feet into the ground and push knees out against an imaginary band."',
  },
  {
    id: 'lumbar_rounding',
    mistakeName: 'Spinal Flexion (Lumbar Rounding)',
    severity: 'CRITICAL',
    incorrectDescription: 'Lower back rounds into flexion near bottom turnaround position (butt wink).',
    correctDescription: 'Lats and deep abdominal core braced, preserving the natural neutral lumbar lordosis.',
    anatomicalRisk: 'Posterior disc herniation and excessive ligamentous stress under compressive load.',
    correctiveCue: '"Pull the chest up, lock ribcage to pelvis, and hinge from hips instead of waist."',
  },
  {
    id: 'heel_lift',
    mistakeName: 'Heel Elevation / Forefoot Shifting',
    severity: 'MILD',
    incorrectDescription: 'Heels lift off the platform with weight drifting entirely onto the balls of feet.',
    correctDescription: 'Tripod foot contact maintained (heel, 1st metatarsal, 5th metatarsal) firmly planted.',
    anatomicalRisk: 'Overload on patellar tendon and compromised base of balance.',
    correctiveCue: '"Root down into three points of contact on your soles like suction cups."',
  },
];

const CUE_LEGEND = [
  {
    category: 'ALIGNMENT',
    color: '#10B981',
    label: 'Alignment & Tracking',
    description: 'Symmetry, limb trajectories, and joint tracking planes.',
  },
  {
    category: 'POSTURE',
    color: '#3B82F6',
    label: 'Postural Neutrality',
    description: 'Spine, ribcage, scapular, and pelvic positioning.',
  },
  {
    category: 'BREATHING',
    color: '#F59E0B',
    label: 'Breathing Cadence',
    description: 'Intra-abdominal pressure, eccentric inhale, concentric exhale.',
  },
  {
    category: 'RANGE_OF_MOTION',
    color: '#8B5CF6',
    label: 'Range of Motion',
    description: 'Depth standards, turnaround points, and full joint extension.',
  },
  {
    category: 'SAFETY',
    color: '#EF4444',
    label: 'Safety & Protection',
    description: 'Critical anatomical limits to avoid strain and injury.',
  },
];

export const TechniqueComparison: React.FC<TechniqueComparisonProps> = ({
  exerciseName,
  movementPattern = 'COMPOUND',
  checkpoints = DEFAULT_CHECKPOINTS,
  commonMistakes = DEFAULT_MISTAKES,
  frontImageUrl,
  sideImageUrl,
}) => {
  const [selectedView, setSelectedView] = useState<'CROSS_ANGLE' | 'MISTAKES' | 'LEGEND'>('CROSS_ANGLE');
  const [activeMistakeIndex, setActiveMistakeIndex] = useState(0);

  const currentMistake = commonMistakes[activeMistakeIndex] || commonMistakes[0];

  return (
    <Card style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="activity" size={20} color={themeColors.primary} />
          <View>
            <Text style={styles.title}>Visual Technique Comparison</Text>
            <Text style={styles.subtitle}>
              Biomechanical standards & cross-angle visual coaching for {exerciseName} ({movementPattern})
            </Text>
          </View>
        </View>
      </View>

      {/* Segmented Navigation Tabs */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, selectedView === 'CROSS_ANGLE' && styles.navBtnActive]}
          onPress={() => setSelectedView('CROSS_ANGLE')}
        >
          <Icon
            name="activity"
            size={14}
            color={selectedView === 'CROSS_ANGLE' ? themeColors.primary : themeColors.textSecondary}
          />
          <Text
            style={[
              styles.navBtnText,
              selectedView === 'CROSS_ANGLE' && styles.navBtnTextActive,
            ]}
          >
            Cross-Angle Analysis
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, selectedView === 'MISTAKES' && styles.navBtnActive]}
          onPress={() => setSelectedView('MISTAKES')}
        >
          <Icon
            name="alert-circle"
            size={14}
            color={selectedView === 'MISTAKES' ? themeColors.accent : themeColors.textSecondary}
          />
          <Text
            style={[
              styles.navBtnText,
              selectedView === 'MISTAKES' && styles.navBtnTextActive,
            ]}
          >
            Correct vs Mistake
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, selectedView === 'LEGEND' && styles.navBtnActive]}
          onPress={() => setSelectedView('LEGEND')}
        >
          <Icon
            name="alert-circle"
            size={14}
            color={selectedView === 'LEGEND' ? themeColors.primary : themeColors.textSecondary}
          />
          <Text
            style={[
              styles.navBtnText,
              selectedView === 'LEGEND' && styles.navBtnTextActive,
            ]}
          >
            Visual Cue Legend
          </Text>
        </TouchableOpacity>
      </View>

      {/* VIEW 1: CROSS-ANGLE BIOMECHANICAL ANALYSIS */}
      {selectedView === 'CROSS_ANGLE' && (
        <View style={styles.contentSection}>
          <View style={styles.angleIntroCard}>
            <Text style={styles.angleIntroTitle}>FRONT VIEW vs SIDE VIEW</Text>
            <Text style={styles.angleIntroText}>
              Different view angles reveal unique biomechanical details that cannot be observed from a single perspective. Compare alignment cues side-by-side:
            </Text>
          </View>

          {/* Side-by-Side Angle Preview Images if available */}
          {(frontImageUrl || sideImageUrl) && (
            <View style={styles.previewImageRow}>
              <View style={styles.previewBox}>
                {frontImageUrl ? (
                  <Image source={{ uri: frontImageUrl }} style={styles.previewImg} resizeMode="cover" />
                ) : (
                  <View style={styles.previewPlaceholder}>
                    <Icon name="activity" size={24} color={themeColors.textMuted} />
                    <Text style={styles.previewPlaceholderText}>Front Angle</Text>
                  </View>
                )}
                <Badge label="FRONT VIEW" variant="primary" style={styles.previewBadge} />
              </View>

              <View style={styles.previewBox}>
                {sideImageUrl ? (
                  <Image source={{ uri: sideImageUrl }} style={styles.previewImg} resizeMode="cover" />
                ) : (
                  <View style={styles.previewPlaceholder}>
                    <Icon name="activity" size={24} color={themeColors.textMuted} />
                    <Text style={styles.previewPlaceholderText}>Side Angle</Text>
                  </View>
                )}
                <Badge label="SIDE VIEW" variant="accent" style={styles.previewBadge} />
              </View>
            </View>
          )}

          {/* Checkpoint Cards */}
          <View style={styles.checkpointsContainer}>
            {checkpoints.map((cp, idx) => (
              <View key={idx} style={styles.checkpointCard}>
                <View style={styles.checkpointHeader}>
                  <View style={styles.cpNumber}>
                    <Text style={styles.cpNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.checkpointTitle}>{cp.title}</Text>
                </View>

                {/* Front View Cue */}
                <View style={styles.cueRow}>
                  <View style={[styles.angleIndicator, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.angleIndicatorText}>FRONT</Text>
                  </View>
                  <Text style={styles.cueText}>{cp.frontViewCue}</Text>
                </View>

                {/* Side View Cue */}
                <View style={styles.cueRow}>
                  <View style={[styles.angleIndicator, { backgroundColor: '#3B82F6' }]}>
                    <Text style={styles.angleIndicatorText}>SIDE</Text>
                  </View>
                  <Text style={styles.cueText}>{cp.sideViewCue}</Text>
                </View>

                {/* Biomechanical Standard */}
                <View style={styles.standardBox}>
                  <Icon name="check" size={12} color={themeColors.accent} />
                  <Text style={styles.standardText}>
                    Standard: {cp.idealBiomechanicalMarker}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* VIEW 2: CORRECT VS COMMON MISTAKE */}
      {selectedView === 'MISTAKES' && currentMistake && (
        <View style={styles.contentSection}>
          {/* Mistake Selector Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mistakeTabs}>
            {commonMistakes.map((m, idx) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.mistakeTab,
                  activeMistakeIndex === idx && styles.mistakeTabActive,
                ]}
                onPress={() => setActiveMistakeIndex(idx)}
              >
                <Text
                  style={[
                    styles.mistakeTabText,
                    activeMistakeIndex === idx && styles.mistakeTabTextActive,
                  ]}
                >
                  {m.mistakeName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Comparison Cards: Correct Form vs Common Deviation */}
          <View style={styles.comparisonPair}>
            {/* Correct Technique (Green Accent) */}
            <View style={styles.techniqueBoxCorrect}>
              <View style={styles.techniqueHeader}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.correctHeaderTitle}>CORRECT TECHNIQUE</Text>
              </View>
              <Text style={styles.techniqueBodyText}>{currentMistake.correctDescription}</Text>
              <View style={styles.cueHighlight}>
                <Text style={styles.cueHighlightLabel}>Mental Cue:</Text>
                <Text style={styles.cueHighlightText}>{currentMistake.correctiveCue}</Text>
              </View>
            </View>

            {/* Common Deviation (Warning Amber/Red) */}
            <View style={styles.techniqueBoxMistake}>
              <View style={styles.techniqueHeader}>
                <Icon name="alert-circle" size={16} color="#F59E0B" />
                <Text style={styles.mistakeHeaderTitle}>COMMON DEVIATION</Text>
                <Badge
                  label={currentMistake.severity}
                  variant={currentMistake.severity === 'CRITICAL' ? 'accent' : 'primary'}
                  style={styles.severityBadge}
                />
              </View>
              <Text style={styles.techniqueBodyText}>{currentMistake.incorrectDescription}</Text>
              <View style={styles.riskHighlight}>
                <Text style={styles.riskHighlightLabel}>Biomechanical Concern:</Text>
                <Text style={styles.riskHighlightText}>{currentMistake.anatomicalRisk}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* VIEW 3: VISUAL CUE LEGEND */}
      {selectedView === 'LEGEND' && (
        <View style={styles.contentSection}>
          <Text style={styles.legendIntro}>
            Visual demonstration cues overlay key technique markers onto the exercise video to guide your attention:
          </Text>

          <View style={styles.legendList}>
            {CUE_LEGEND.map((item) => (
              <View key={item.category} style={styles.legendItem}>
                <View style={[styles.legendColorBar, { backgroundColor: item.color }]} />
                <View style={styles.legendDetails}>
                  <Text style={[styles.legendLabel, { color: item.color }]}>
                    {item.label}
                  </Text>
                  <Text style={styles.legendDesc}>{item.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: sp.lg,
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginVertical: sp.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  navRow: {
    flexDirection: 'row',
    gap: sp.xs,
    backgroundColor: themeColors.background,
    padding: 4,
    borderRadius: radius.md,
    marginBottom: sp.lg,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: sp.sm,
    borderRadius: radius.sm,
  },
  navBtnActive: {
    backgroundColor: themeColors.surfaceElevated,
  },
  navBtnText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  navBtnTextActive: {
    color: themeColors.textPrimary,
  },
  contentSection: {
    gap: sp.md,
  },
  angleIntroCard: {
    backgroundColor: themeColors.background,
    padding: sp.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  angleIntroTitle: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  angleIntroText: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  previewImageRow: {
    flexDirection: 'row',
    gap: sp.md,
  },
  previewBox: {
    flex: 1,
    height: 120,
    backgroundColor: themeColors.background,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  previewPlaceholderText: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  previewBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  checkpointsContainer: {
    gap: sp.md,
  },
  checkpointCard: {
    backgroundColor: themeColors.background,
    padding: sp.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: sp.sm,
  },
  checkpointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
  },
  cpNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: themeColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cpNumberText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '700',
  },
  checkpointTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sp.sm,
  },
  angleIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  angleIndicatorText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cueText: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  standardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${themeColors.accent}10`,
    padding: sp.sm,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  standardText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    flex: 1,
  },
  mistakeTabs: {
    gap: sp.sm,
    paddingBottom: sp.xs,
  },
  mistakeTab: {
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.background,
  },
  mistakeTabActive: {
    borderColor: themeColors.accent,
    backgroundColor: `${themeColors.accent}15`,
  },
  mistakeTabText: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
  },
  mistakeTabTextActive: {
    color: themeColors.accent,
    fontWeight: '700',
  },
  comparisonPair: {
    gap: sp.md,
  },
  techniqueBoxCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: radius.md,
    padding: sp.md,
    gap: sp.sm,
  },
  techniqueBoxMistake: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: radius.md,
    padding: sp.md,
    gap: sp.sm,
  },
  techniqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
  },
  correctHeaderTitle: {
    ...typography.caption,
    color: '#10B981',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  mistakeHeaderTitle: {
    ...typography.caption,
    color: '#F59E0B',
    fontWeight: '800',
    letterSpacing: 0.8,
    flex: 1,
  },
  severityBadge: {
    marginLeft: 'auto',
  },
  techniqueBodyText: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    lineHeight: 19,
  },
  cueHighlight: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    padding: sp.sm,
    borderRadius: radius.sm,
    marginTop: 2,
  },
  cueHighlightLabel: {
    ...typography.caption,
    color: '#10B981',
    fontWeight: '700',
  },
  cueHighlightText: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  riskHighlight: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: sp.sm,
    borderRadius: radius.sm,
    marginTop: 2,
  },
  riskHighlightLabel: {
    ...typography.caption,
    color: '#F59E0B',
    fontWeight: '700',
  },
  riskHighlightText: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    marginTop: 2,
  },
  legendIntro: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    marginBottom: sp.xs,
  },
  legendList: {
    gap: sp.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    overflow: 'hidden',
  },
  legendColorBar: {
    width: 6,
    alignSelf: 'stretch',
  },
  legendDetails: {
    padding: sp.md,
    flex: 1,
  },
  legendLabel: {
    ...typography.bodySm,
    fontWeight: '700',
    marginBottom: 2,
  },
  legendDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
});
