import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Badge, Button, Card, Icon } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type { DiscoveryMuscleItem } from '../services/exerciseService';

export interface MuscleRoleHighlight {
  code: string;
  role: 'PRIMARY' | 'SECONDARY' | 'STABILIZER';
}

interface BodyMapVisualizerProps {
  muscles: DiscoveryMuscleItem[];
  selectedMuscle?: string;
  onSelectMuscle: (muscleCode: string) => void;
  onExploreMuscle?: (muscleCode: string) => void;
  highlightedMuscles?: MuscleRoleHighlight[];
}

export const BodyMapVisualizer: React.FC<BodyMapVisualizerProps> = ({
  muscles,
  selectedMuscle,
  onSelectMuscle,
  onExploreMuscle,
  highlightedMuscles,
}) => {
  const [viewRegion, setViewRegion] = useState<'ANTERIOR' | 'POSTERIOR'>('ANTERIOR');
  const [displayMode, setDisplayMode] = useState<'VISUAL' | 'LIST'>('VISUAL');

  // Filter muscles for current view
  const currentViewMuscles = muscles.filter((m) => m.region === viewRegion);
  const selectedMuscleItem = muscles.find((m) => m.code === selectedMuscle);

  const getMuscleCount = (code: string): number => {
    const item = muscles.find((m) => m.code === code);
    return item?.count || 0;
  };

  const isSelected = (code: string) => selectedMuscle === code;

  const getHighlightRole = (code: string): 'PRIMARY' | 'SECONDARY' | 'STABILIZER' | null => {
    if (!highlightedMuscles) return null;
    const match = highlightedMuscles.find((h) => h.code.toUpperCase() === code.toUpperCase());
    return match ? match.role : null;
  };

  const renderMuscleButton = (
    code: string,
    label: string,
    widthPercent: number | string = '46%',
    customStyle?: any
  ) => {
    const selected = isSelected(code);
    const count = getMuscleCount(code);
    const highlightRole = getHighlightRole(code);

    return (
      <TouchableOpacity
        key={code}
        accessibilityRole="button"
        accessibilityLabel={`${label}${highlightRole ? `, ${highlightRole} muscle` : ''}, ${count} exercises available`}
        accessibilityState={{ selected }}
        activeOpacity={0.7}
        onPress={() => onSelectMuscle(code)}
        style={[
          styles.anatomicalRegion,
          { width: widthPercent as any },
          selected && styles.anatomicalRegionSelected,
          highlightRole === 'PRIMARY' && styles.highlightPrimary,
          highlightRole === 'SECONDARY' && styles.highlightSecondary,
          highlightRole === 'STABILIZER' && styles.highlightStabilizer,
          customStyle,
        ]}
      >
        <View style={styles.regionHeader}>
          <Text
            style={[
              styles.regionLabel,
              selected && styles.regionLabelSelected,
              highlightRole === 'PRIMARY' && styles.labelPrimary,
              highlightRole === 'SECONDARY' && styles.labelSecondary,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {highlightRole ? (
            <Badge
              label={highlightRole === 'PRIMARY' ? 'PRI' : highlightRole === 'SECONDARY' ? 'SEC' : 'STAB'}
              variant={highlightRole === 'PRIMARY' ? 'primary' : highlightRole === 'SECONDARY' ? 'accent' : 'neutral'}
            />
          ) : count > 0 ? (
            <Badge
              label={String(count)}
              variant={selected ? 'primary' : 'neutral'}
            />
          ) : null}
        </View>
        {selected && (
          <View style={styles.activeDot} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Card style={styles.container}>
      {/* Header with Anatomical View Toggle & Display Mode */}
      <View style={styles.headerRow}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityLabel="Front Anterior View"
            accessibilityState={{ selected: viewRegion === 'ANTERIOR' }}
            onPress={() => setViewRegion('ANTERIOR')}
            style={[
              styles.segmentBtn,
              viewRegion === 'ANTERIOR' && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                viewRegion === 'ANTERIOR' && styles.segmentTextActive,
              ]}
            >
              Anterior (Front)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityLabel="Back Posterior View"
            accessibilityState={{ selected: viewRegion === 'POSTERIOR' }}
            onPress={() => setViewRegion('POSTERIOR')}
            style={[
              styles.segmentBtn,
              viewRegion === 'POSTERIOR' && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                viewRegion === 'POSTERIOR' && styles.segmentTextActive,
              ]}
            >
              Posterior (Back)
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={displayMode === 'VISUAL' ? 'Switch to accessible list view' : 'Switch to visual body map'}
          onPress={() => setDisplayMode(displayMode === 'VISUAL' ? 'LIST' : 'VISUAL')}
          style={styles.modeToggle}
        >
          <Icon
            name={displayMode === 'VISUAL' ? 'filter' : 'activity'}
            size={16}
            color={themeColors.textSecondary}
          />
          <Text style={styles.modeToggleText}>
            {displayMode === 'VISUAL' ? 'List View' : 'Visual Map'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Visual Anatomical Diagram Map */}
      {displayMode === 'VISUAL' ? (
        <View style={styles.bodyCanvasContainer}>
          <Text style={styles.diagramHint}>
            Tap a muscle region on the {viewRegion.toLowerCase()} body map to explore exercises
          </Text>

          {viewRegion === 'ANTERIOR' ? (
            /* Anterior (Front) Anatomical Regions */
            <View style={styles.anatomicalFigure}>
              {/* Shoulders / Deltoids Top Band */}
              <View style={styles.torsoRow}>
                {renderMuscleButton('SHOULDERS', 'Shoulders (Delts)', '96%', styles.shouldersBand)}
              </View>

              {/* Chest Layer */}
              <View style={styles.torsoRow}>
                {renderMuscleButton('CHEST', 'Chest (Pectorals)', '96%', styles.chestBlock)}
              </View>

              {/* Arms + Upper Core Row */}
              <View style={styles.torsoRow}>
                {renderMuscleButton('BICEPS', 'Biceps (Left)', '30%')}
                {renderMuscleButton('ABDOMINALS', 'Abdominals', '36%')}
                {renderMuscleButton('BICEPS', 'Biceps (Right)', '30%')}
              </View>

              {/* Forearms + Obliques Row */}
              <View style={styles.torsoRow}>
                {renderMuscleButton('FOREARMS', 'Forearms', '30%')}
                {renderMuscleButton('OBLIQUES', 'Obliques', '36%')}
                {renderMuscleButton('FOREARMS', 'Grip/Arms', '30%')}
              </View>

              {/* Hips & Pelvis Row */}
              <View style={styles.torsoRow}>
                {renderMuscleButton('HIP_FLEXORS', 'Hip Flexors', '47%')}
                {renderMuscleButton('ADDUCTORS', 'Adductors (Inner)', '47%')}
              </View>

              {/* Quadriceps */}
              <View style={styles.torsoRow}>
                {renderMuscleButton('QUADRICEPS', 'Quadriceps', '96%', styles.quadsBlock)}
              </View>

              {/* Anterior Calves / Tibialis */}
              <View style={styles.torsoRow}>
                {renderMuscleButton('CALVES', 'Calves & Lower Leg', '96%')}
              </View>
            </View>
          ) : (
            /* Posterior (Back) Anatomical Regions */
            <View style={styles.anatomicalFigure}>
              {/* Traps & Neck */}
              <View style={styles.torsoRow}>
                {renderMuscleButton('TRAPS', 'Traps (Trapezius)', '96%', styles.trapsBand)}
              </View>

              {/* Upper Back & Rhomboids */}
              <View style={styles.torsoRow}>
                {renderMuscleButton('UPPER_BACK', 'Upper Back & Rhomboids', '96%')}
              </View>

              {/* Triceps & Lats Row */}
              <View style={styles.torsoRow}>
                {renderMuscleButton('TRICEPS', 'Triceps (L)', '28%')}
                {renderMuscleButton('LATS', 'Lats (Latissimus)', '40%')}
                {renderMuscleButton('TRICEPS', 'Triceps (R)', '28%')}
              </View>

              {/* Lower Back (Erector Spinae) */}
              <View style={styles.torsoRow}>
                {renderMuscleButton('LOWER_BACK', 'Lower Back (Erectors)', '96%')}
              </View>

              {/* Glutes */}
              <View style={styles.torsoRow}>
                {renderMuscleButton('GLUTES', 'Glutes (Maximus/Medius)', '96%', styles.glutesBlock)}
              </View>

              {/* Hamstrings */}
              <View style={styles.torsoRow}>
                {renderMuscleButton('HAMSTRINGS', 'Hamstrings', '96%', styles.hamsBlock)}
              </View>

              {/* Calves (Gastrocnemius & Soleus) */}
              <View style={styles.torsoRow}>
                {renderMuscleButton('CALVES', 'Calves (Gastrocs)', '96%')}
              </View>
            </View>
          )}
        </View>
      ) : (
        /* Accessible List / Grid View (WCAG 2.1 AA Compliant) */
        <View style={styles.listViewContainer}>
          <Text style={styles.listHint}>
            Select from the complete list of {viewRegion.toLowerCase()} muscle groups:
          </Text>
          <View style={styles.muscleGrid}>
            {currentViewMuscles.map((m) => {
              const selected = isSelected(m.code);
              const highlightRole = getHighlightRole(m.code);
              return (
                <TouchableOpacity
                  key={m.code}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.name}${highlightRole ? `, ${highlightRole} muscle` : ''}, ${m.count} exercises`}
                  accessibilityState={{ selected }}
                  onPress={() => onSelectMuscle(m.code)}
                  style={[
                    styles.listMuscleChip,
                    selected && styles.listMuscleChipSelected,
                    highlightRole === 'PRIMARY' && styles.highlightPrimary,
                    highlightRole === 'SECONDARY' && styles.highlightSecondary,
                    highlightRole === 'STABILIZER' && styles.highlightStabilizer,
                  ]}
                >
                  <View style={styles.chipInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          styles.chipName,
                          selected && styles.chipNameSelected,
                        ]}
                      >
                        {m.name}
                      </Text>
                      {highlightRole && (
                        <Badge
                          label={highlightRole}
                          variant={highlightRole === 'PRIMARY' ? 'primary' : highlightRole === 'SECONDARY' ? 'accent' : 'neutral'}
                        />
                      )}
                    </View>
                    <Text style={styles.chipSub}>
                      {m.group.replace('_', ' ')} • {m.primaryCount} primary
                    </Text>
                  </View>
                  <Badge
                    label={String(m.count)}
                    variant={selected ? 'primary' : 'neutral'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Selected Muscle Action Bar */}
      {selectedMuscleItem && (
        <View style={styles.selectedActionBar}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedMuscleTitle}>
              {selectedMuscleItem.name}
            </Text>
            <Text style={styles.selectedMuscleMeta}>
              {selectedMuscleItem.count} exercises available • {selectedMuscleItem.primaryCount} primary target
            </Text>
          </View>
          {onExploreMuscle && (
            <Button
              title="Explore Muscle"
              variant="primary"
              size="sm"
              onPress={() => onExploreMuscle(selectedMuscleItem.code)}
              rightIcon={<Icon name="chevron-right" size={16} color="#000000" />}
            />
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  segmentBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  segmentBtnActive: {
    backgroundColor: themeColors.primary,
  },
  segmentText: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  segmentTextActive: {
    color: '#000000',
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  modeToggleText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '500',
  },
  bodyCanvasContainer: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  diagramHint: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  anatomicalFigure: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  torsoRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  anatomicalRegion: {
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  anatomicalRegionSelected: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: themeColors.primary,
    borderWidth: 1.5,
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  regionLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textPrimary,
    flex: 1,
  },
  regionLabelSelected: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  activeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: themeColors.primary,
  },
  shouldersBand: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  trapsBand: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  chestBlock: {
    paddingVertical: spacing.sm,
  },
  quadsBlock: {
    paddingVertical: spacing.sm,
  },
  glutesBlock: {
    paddingVertical: spacing.sm,
  },
  hamsBlock: {
    paddingVertical: spacing.sm,
  },
  listViewContainer: {
    paddingVertical: spacing.xs,
  },
  listHint: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginBottom: spacing.sm,
  },
  muscleGrid: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  listMuscleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themeColors.cardBackground,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  listMuscleChipSelected: {
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    borderColor: themeColors.primary,
    borderWidth: 1.5,
  },
  chipInfo: {
    flex: 1,
  },
  chipName: {
    ...typography.body2,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  chipNameSelected: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  chipSub: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  selectedActionBar: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectedInfo: {
    flex: 1,
    minWidth: 150,
  },
  selectedMuscleTitle: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  selectedMuscleMeta: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  highlightPrimary: {
    borderColor: themeColors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderWidth: 1.5,
  },
  highlightSecondary: {
    borderColor: themeColors.accent,
    backgroundColor: 'rgba(20, 184, 166, 0.18)',
    borderWidth: 1.5,
  },
  highlightStabilizer: {
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
  },
  labelPrimary: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  labelSecondary: {
    color: themeColors.accent,
    fontWeight: '700',
  },
});
