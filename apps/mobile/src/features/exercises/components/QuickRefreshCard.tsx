import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { themeColors, radius, spacing } from '../../../theme';
import { Icon, Badge } from '../../../components/primitives';
import { QuickRefreshData } from '../services/exerciseService';

interface QuickRefreshCardProps {
  data: QuickRefreshData;
  onComplete?: () => void;
}

export const QuickRefreshCard: React.FC<QuickRefreshCardProps> = ({
  data,
  onComplete,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);

  const activePhase = data.movementPhases[activePhaseIndex];

  return (
    <>
      <View
        style={[
          styles.cardContainer,
          {
            backgroundColor: themeColors.cardBackground,
            borderColor: themeColors.border,
            borderRadius: radius.md,
            padding: spacing.md,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Icon name="bolt" size={18} color={themeColors.primary} />
            <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
              Quick Refresh
            </Text>
          </View>
          <Badge label={`${data.estimatedDurationSeconds}s`} variant="accent" />
        </View>

        <Text style={[styles.exerciseName, { color: themeColors.textSecondary }]}>
          {data.exerciseName}
        </Text>

        <Text style={[styles.cardDescription, { color: themeColors.textTertiary }]}>
          Rapid technique tune-up covering setup, phase cues, tempo, and breathing cadence.
        </Text>

        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: themeColors.primary, borderRadius: radius.sm }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Icon name="bolt" size={14} color="#FFFFFF" />
          <Text style={styles.startButtonText}>Start Quick Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Interactive Quick Refresh Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                {data.exerciseName}
              </Text>
              <Text style={[styles.modalSubtitle, { color: themeColors.textSecondary }]}>
                {data.estimatedDurationSeconds}s Technique Refresher
              </Text>
            </View>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={20} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Setup & Baseline */}
            <View style={[styles.sectionCard, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border, borderRadius: radius.md }]}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="check-circle" size={16} color={themeColors.primary} />
                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Setup & Stance</Text>
              </View>
              {data.setup.keyNotes.map((note, idx) => (
                <Text key={idx} style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
                  • {note}
                </Text>
              ))}
            </View>

            {/* Movement Phase Carousel */}
            {data.movementPhases.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border, borderRadius: radius.md }]}>
                <View style={styles.sectionHeaderRow}>
                  <Icon name="activity" size={16} color={themeColors.primary} />
                  <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                    Movement Phase ({activePhaseIndex + 1}/{data.movementPhases.length})
                  </Text>
                </View>

                {activePhase && (
                  <View style={styles.phaseBody}>
                    <Text style={[styles.phaseName, { color: themeColors.textPrimary }]}>
                      {activePhase.name}
                    </Text>
                    <View style={[styles.cueBox, { backgroundColor: themeColors.elevatedBackground, borderRadius: radius.sm }]}>
                      <Text style={[styles.cueLabel, { color: themeColors.primary }]}>FOCUS CUE</Text>
                      <Text style={[styles.cueText, { color: themeColors.textPrimary }]}>
                        {activePhase.focusCue}
                      </Text>
                    </View>

                    <View style={styles.specsRow}>
                      <View style={styles.specItem}>
                        <Text style={[styles.specLabel, { color: themeColors.textTertiary }]}>TEMPO</Text>
                        <Text style={[styles.specValue, { color: themeColors.textSecondary }]}>{activePhase.tempo}</Text>
                      </View>
                      <View style={styles.specItem}>
                        <Text style={[styles.specLabel, { color: themeColors.textTertiary }]}>BREATHING</Text>
                        <Text style={[styles.specValue, { color: themeColors.textSecondary }]}>{activePhase.breathing}</Text>
                      </View>
                    </View>

                    {activePhase.keyMistakeToAvoid && (
                      <View style={[styles.mistakeBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: radius.sm }]}>
                        <Icon name="alert-circle" size={14} color="#EF4444" />
                        <Text style={styles.mistakeText}>
                          Avoid: {activePhase.keyMistakeToAvoid}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Phase Stepper Buttons */}
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    disabled={activePhaseIndex === 0}
                    onPress={() => setActivePhaseIndex((prev) => Math.max(0, prev - 1))}
                    style={[styles.stepperButton, { opacity: activePhaseIndex === 0 ? 0.3 : 1 }]}
                  >
                    <Icon name="chevron-left" size={16} color={themeColors.textPrimary} />
                    <Text style={[styles.stepperText, { color: themeColors.textPrimary }]}>Previous</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={activePhaseIndex === data.movementPhases.length - 1}
                    onPress={() => setActivePhaseIndex((prev) => Math.min(data.movementPhases.length - 1, prev + 1))}
                    style={[styles.stepperButton, { opacity: activePhaseIndex === data.movementPhases.length - 1 ? 0.3 : 1 }]}
                  >
                    <Text style={[styles.stepperText, { color: themeColors.textPrimary }]}>Next Phase</Text>
                    <Icon name="chevron-right" size={16} color={themeColors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Cadence & Rhythm */}
            <View style={[styles.sectionCard, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border, borderRadius: radius.md }]}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="timer" size={16} color={themeColors.primary} />
                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Rhythm & Cadence</Text>
              </View>
              <Text style={[styles.cadenceNote, { color: themeColors.textSecondary }]}>
                Tempo: {data.cadenceSummary.tempo}
              </Text>
              <Text style={[styles.cadenceNote, { color: themeColors.textSecondary }]}>
                Breathing: {data.cadenceSummary.breathingPattern}
              </Text>
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={[styles.modalFooter, { borderTopColor: themeColors.border, backgroundColor: themeColors.background }]}>
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: themeColors.primary, borderRadius: radius.sm }]}
              onPress={() => {
                setModalVisible(false);
                if (onComplete) onComplete();
              }}
            >
              <Icon name="check-circle" size={16} color="#FFFFFF" />
              <Text style={styles.doneButtonText}>Completed Refresher</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderWidth: 1,
    marginVertical: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    gap: 6,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalContent: {
    padding: 16,
    gap: 12,
  },
  sectionCard: {
    padding: 14,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bulletPoint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  phaseBody: {
    marginTop: 4,
  },
  phaseName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  cueBox: {
    padding: 10,
    marginBottom: 8,
  },
  cueLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  cueText: {
    fontSize: 13,
    lineHeight: 18,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  specItem: {
    flex: 1,
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  specValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  mistakeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 6,
    marginTop: 6,
  },
  mistakeText: {
    color: '#EF4444',
    fontSize: 12,
    flex: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  stepperButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepperText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cadenceNote: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
