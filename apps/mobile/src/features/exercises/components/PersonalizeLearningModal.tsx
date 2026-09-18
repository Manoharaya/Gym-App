import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Icon, Button } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type {
  LearningDepth,
  PersonalizedTutorialMode,
  LearningPreferencesResponse,
  UpdateLearningPreferencesPayload,
} from '../services/exerciseService';

interface PersonalizeLearningModalProps {
  visible: boolean;
  preferences: LearningPreferencesResponse | null;
  onClose: () => void;
  onSave: (payload: UpdateLearningPreferencesPayload) => Promise<void>;
  onReset: () => Promise<void>;
}

const DEPTH_OPTIONS: Array<{
  id: LearningDepth;
  label: string;
  desc: string;
  badgeColor: string;
}> = [
  {
    id: 'BASIC',
    label: 'Basic',
    desc: 'Essential visual demo, primary setup, and simple safety cues.',
    badgeColor: '#38BDF8',
  },
  {
    id: 'STANDARD',
    label: 'Standard',
    desc: 'Balanced walkthrough across all phases, key cues, and practice.',
    badgeColor: '#4ADE80',
  },
  {
    id: 'DETAILED',
    label: 'Detailed',
    desc: 'Deep breakdown of tempo, joint alignment, and common mistakes.',
    badgeColor: '#FBBF24',
  },
  {
    id: 'ADVANCED',
    label: 'Advanced',
    desc: 'In-depth biomechanics, muscle engagement, and multi-angle nuance.',
    badgeColor: '#A855F7',
  },
];

const MODE_OPTIONS: Array<{
  id: PersonalizedTutorialMode;
  label: string;
  desc: string;
}> = [
  {
    id: 'PERSONALIZED',
    label: 'Adaptive (Recommended)',
    desc: 'Dynamically adapts depth and focus to your experience with this exercise.',
  },
  {
    id: 'QUICK_LEARN',
    label: 'Quick Learn',
    desc: 'Concise summary for rapid review before hitting the gym floor.',
  },
  {
    id: 'STEP_BY_STEP',
    label: 'Step-by-Step',
    desc: 'Guided step progression through preparation, descent, and drive.',
  },
  {
    id: 'MOVEMENT_BREAKDOWN',
    label: 'Movement Breakdown',
    desc: 'Phase-by-phase anatomical and mechanical decomposition.',
  },
  {
    id: 'TECHNIQUE_CHECKLIST',
    label: 'Technique Checklist',
    desc: 'Self-audit checklist of critical technique checkpoints.',
  },
];

const VIEW_ANGLE_OPTIONS = [
  { id: 'AUTO', label: 'Adaptive Auto' },
  { id: 'FRONT', label: 'Front' },
  { id: 'SIDE', label: 'Side' },
  { id: 'REAR', label: 'Rear' },
  { id: 'THREE_QUARTER', label: '3/4 Angle' },
  { id: 'CLOSE_UP', label: 'Close-Up' },
];

const PLAYBACK_SPEEDS = [0.75, 1.0, 1.25, 1.5];

export const PersonalizeLearningModal: React.FC<PersonalizeLearningModalProps> = ({
  visible,
  preferences,
  onClose,
  onSave,
  onReset,
}) => {
  const [depth, setDepth] = useState<LearningDepth>('STANDARD');
  const [mode, setMode] = useState<PersonalizedTutorialMode>('PERSONALIZED');
  const [viewAngle, setViewAngle] = useState<string>('AUTO');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showDetailedInstructions, setShowDetailedInstructions] = useState<boolean>(true);
  const [showAnatomyDetails, setShowAnatomyDetails] = useState<boolean>(true);
  const [showTechniqueDetails, setShowTechniqueDetails] = useState<boolean>(true);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(false);

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (preferences) {
      setDepth(preferences.preferredLearningDepth || 'STANDARD');
      setMode(preferences.preferredTutorialMode || 'PERSONALIZED');
      setViewAngle(preferences.preferredViewAngle || 'AUTO');
      setPlaybackSpeed(preferences.playbackSpeed || 1.0);
      setShowDetailedInstructions(preferences.showDetailedInstructions ?? true);
      setShowAnatomyDetails(preferences.showAnatomyDetails ?? true);
      setShowTechniqueDetails(preferences.showTechniqueDetails ?? true);
      setAutoAdvance(preferences.autoAdvancePreference ?? false);
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave({
        preferredLearningDepth: depth,
        preferredTutorialMode: mode,
        preferredViewAngle: viewAngle,
        playbackSpeed,
        showDetailedInstructions,
        showAnatomyDetails,
        showTechniqueDetails,
        autoAdvancePreference: autoAdvance,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save learning preferences', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setResetting(true);
      await onReset();
      onClose();
    } catch (err) {
      console.error('Failed to reset learning preferences', err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Icon name="sparkles" size={20} color="#F59E0B" />
              <Text style={styles.headerTitle}>Customize Learning</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Section 1: Learning Depth */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Learning Depth</Text>
              <Text style={styles.sectionDescription}>
                Controls how much coaching detail, biomechanical explanation, and checklist items are displayed.
              </Text>
              <View style={styles.optionsList}>
                {DEPTH_OPTIONS.map((opt) => {
                  const selected = depth === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.optionCard, selected && styles.optionCardSelected]}
                      onPress={() => setDepth(opt.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.optionHeader}>
                        <View style={styles.optionTitleRow}>
                          <View
                            style={[
                              styles.radioCircle,
                              selected && { borderColor: opt.badgeColor },
                            ]}
                          >
                            {selected && (
                              <View
                                style={[styles.radioFill, { backgroundColor: opt.badgeColor }]}
                              />
                            )}
                          </View>
                          <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                            {opt.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.optionDesc}>{opt.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 2: Preferred Tutorial Mode */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferred Tutorial Mode</Text>
              <Text style={styles.sectionDescription}>
                Choose your default style for new exercise tutorials.
              </Text>
              <View style={styles.optionsList}>
                {MODE_OPTIONS.map((opt) => {
                  const selected = mode === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.optionCard, selected && styles.optionCardSelected]}
                      onPress={() => setMode(opt.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.optionHeader}>
                        <View style={styles.optionTitleRow}>
                          <View
                            style={[
                              styles.radioCircle,
                              selected && { borderColor: themeColors.primary },
                            ]}
                          >
                            {selected && (
                              <View
                                style={[
                                  styles.radioFill,
                                  { backgroundColor: themeColors.primary },
                                ]}
                              />
                            )}
                          </View>
                          <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                            {opt.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.optionDesc}>{opt.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 3: Camera Angle & Video Speed */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Demonstration Angle</Text>
              <View style={styles.chipsRow}>
                {VIEW_ANGLE_OPTIONS.map((opt) => {
                  const selected = viewAngle === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setViewAngle(opt.id)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 4: Video Playback Speed */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Demonstration Speed</Text>
              <View style={styles.chipsRow}>
                {PLAYBACK_SPEEDS.map((spd) => {
                  const selected = playbackSpeed === spd;
                  return (
                    <TouchableOpacity
                      key={spd}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setPlaybackSpeed(spd)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {spd}x
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 5: Educational Toggles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Content Visibility</Text>

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>Detailed Phase Instructions</Text>
                  <Text style={styles.toggleSub}>Show multi-step execution breakdown</Text>
                </View>
                <Switch
                  value={showDetailedInstructions}
                  onValueChange={setShowDetailedInstructions}
                  trackColor={{ false: '#334155', true: themeColors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>Muscle & Anatomy Visuals</Text>
                  <Text style={styles.toggleSub}>Highlight prime movers and synergists</Text>
                </View>
                <Switch
                  value={showAnatomyDetails}
                  onValueChange={setShowAnatomyDetails}
                  trackColor={{ false: '#334155', true: themeColors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>Technique Coaching & Cues</Text>
                  <Text style={styles.toggleSub}>Display posture, tempo & joint alignments</Text>
                </View>
                <Switch
                  value={showTechniqueDetails}
                  onValueChange={setShowTechniqueDetails}
                  trackColor={{ false: '#334155', true: themeColors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>Auto-Advance Steps</Text>
                  <Text style={styles.toggleSub}>Proceed automatically as video loops complete</Text>
                </View>
                <Switch
                  value={autoAdvance}
                  onValueChange={setAutoAdvance}
                  trackColor={{ false: '#334155', true: themeColors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              disabled={saving || resetting}
            >
              {resetting ? (
                <ActivityIndicator size="small" color="#94A3B8" />
              ) : (
                <Text style={styles.resetButtonText}>Reset to Recommended</Text>
              )}
            </TouchableOpacity>

            <Button
              title={saving ? 'Saving...' : 'Save Preferences'}
              variant="primary"
              onPress={handleSave}
              disabled={saving || resetting}
              style={styles.saveButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerTitle: {
    ...typography.subtitle1,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  closeBtn: {
    padding: spacing[1],
  },
  scrollArea: {
    padding: spacing[4],
  },
  section: {
    marginBottom: spacing[5],
  },
  sectionTitle: {
    ...typography.subtitle2,
    color: '#F8FAFC',
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  sectionDescription: {
    ...typography.caption,
    color: '#94A3B8',
    marginBottom: spacing[3],
    lineHeight: 18,
  },
  optionsList: {
    gap: spacing[2],
  },
  optionCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  optionCardSelected: {
    borderColor: themeColors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioFill: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionLabel: {
    ...typography.body1,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  optionLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  optionDesc: {
    ...typography.caption,
    color: '#94A3B8',
    paddingLeft: 26,
    lineHeight: 17,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipSelected: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  chipText: {
    ...typography.caption,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  toggleTextCol: {
    flex: 1,
    marginRight: spacing[2],
  },
  toggleTitle: {
    ...typography.body2,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  toggleSub: {
    ...typography.caption,
    color: '#94A3B8',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
    gap: spacing[3],
  },
  resetButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  resetButtonText: {
    ...typography.button,
    color: '#94A3B8',
    fontSize: 13,
  },
  saveButton: {
    flex: 1,
  },
});
