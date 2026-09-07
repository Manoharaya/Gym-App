import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Button, Avatar } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { ptService } from '../services/ptService';
import { trainerService } from '../../trainer/services/trainerService';
import type {
  TrainingProgram,
  TrainingGoal,
  TrainerNote,
  PersonalTrainingSession,
  TrainerProfile,
  TrainingGoalCategory,
} from '@fitcore/types';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
};

const colors = {
  ...themeColors,
  surfaceHighlight: themeColors.surfaceElevated,
  borderSubtle: themeColors.border,
};

export const MyTrainerScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [trainer, setTrainer] = useState<TrainerProfile | null>(null);
  const [activeProgram, setActiveProgram] = useState<TrainingProgram | null>(null);
  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [sessions, setSessions] = useState<PersonalTrainingSession[]>([]);
  const [coachingNotes, setCoachingNotes] = useState<TrainerNote[]>([]);

  // Member Add Goal Modal
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<TrainingGoalCategory>('STRENGTH');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalBaseline, setNewGoalBaseline] = useState('');
  const [newGoalUnit, setNewGoalUnit] = useState('kg');

  const loadMemberCoachingData = useCallback(async () => {
    try {
      setLoading(true);
      // Hardcoded or dynamically resolved memberProfileId for Alex Mercer
      const memberProfileId = 'cmtq4sgyf00awpo1eqvfo3zy8';

      const [progs, gList, notesList, sessList, trainersList] = await Promise.all([
        ptService.getMemberPrograms(memberProfileId).catch(() => []),
        ptService.getMemberGoals(memberProfileId).catch(() => []),
        ptService.getMemberNotes(memberProfileId).catch(() => []),
        ptService.getPTSessions({ memberProfileId }).catch(() => []),
        trainerService.getAllTrainers().catch(() => []),
      ]);

      const primaryProg = progs.find((p) => p.status === 'ACTIVE') || progs[0] || null;
      setActiveProgram(primaryProg);
      setGoals(gList);
      // Member ONLY receives MEMBER_VISIBLE notes from backend
      setCoachingNotes(notesList.filter((n) => n.visibility === 'MEMBER_VISIBLE'));
      setSessions(sessList);

      const marcus = trainersList.find((t) => t.professionalName?.includes('Marcus')) || trainersList[0] || null;
      setTrainer(marcus);
    } catch (err: any) {
      Alert.alert('Load Error', err?.message || 'Failed to load coaching data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMemberCoachingData();
  }, [loadMemberCoachingData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMemberCoachingData();
  };

  const handleCreateMemberGoal = async () => {
    if (!newGoalTitle.trim()) {
      Alert.alert('Required', 'Goal title cannot be empty.');
      return;
    }
    try {
      const memberProfileId = 'cmtq4sgyf00awpo1eqvfo3zy8';
      const created = await ptService.createGoal(memberProfileId, {
        title: newGoalTitle,
        category: newGoalCategory,
        targetValue: parseFloat(newGoalTarget) || undefined,
        baselineValue: parseFloat(newGoalBaseline) || undefined,
        unit: newGoalUnit,
        priority: 1,
      });
      setGoals((prev) => [created, ...prev]);
      setGoalModalVisible(false);
      setNewGoalTitle('');
      setNewGoalTarget('');
      setNewGoalBaseline('');
      Alert.alert('Goal Created', 'Your new goal has been saved.');
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save goal.');
    }
  };

  const nextSession = sessions.find((s) => s.status === 'SCHEDULED');

  return (
    <Screen style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Coach & Training</Text>
        <Text style={styles.headerSubtitle}>1-on-1 athletic development & accountability</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading coaching dashboard...</Text>
          </View>
        ) : (
          <>
            {/* TRAINER PROFILE CARD */}
            {trainer ? (
              <Card style={styles.trainerCard}>
                <View style={styles.trainerHeaderRow}>
                  <Avatar name={trainer.professionalName} size="lg" />
                  <View style={styles.trainerMeta}>
                    <View style={styles.nameRow}>
                      <Text style={styles.trainerName}>{trainer.professionalName}</Text>
                      <Badge label="YOUR COACH" variant="success" />
                    </View>
                    <Text style={styles.trainerExp}>
                      {trainer.yearsExperience} Years Experience | High Performance
                    </Text>
                    {trainer.consultationAvailability && (
                      <Text style={styles.trainerAvail}>🕒 {trainer.consultationAvailability}</Text>
                    )}
                  </View>
                </View>

                {trainer.bio && <Text style={styles.trainerBio}>{trainer.bio}</Text>}

                {/* Specialties Chips */}
                <View style={styles.specialtiesRow}>
                  {trainer.specialties?.map((spec) => (
                    <View key={spec} style={styles.specialtyChip}>
                      <Text style={styles.specialtyChipText}>{spec}</Text>
                    </View>
                  ))}
                </View>

                {trainer.trainingApproach && (
                  <View style={styles.approachBox}>
                    <Text style={styles.approachLabel}>Coaching Approach:</Text>
                    <Text style={styles.approachText}>{trainer.trainingApproach}</Text>
                  </View>
                )}
              </Card>
            ) : (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Trainer Assigned</Text>
                <Text style={styles.emptyDesc}>Browse our trainer directory to match with a coach.</Text>
                <Button
                  title="Browse Trainers"
                  variant="primary"
                  size="sm"
                  onPress={() => navigation.navigate('TrainerDirectory')}
                  style={styles.mtSm}
                />
              </Card>
            )}

            {/* ACTIVE PROGRAM BANNER */}
            {activeProgram && (
              <Card style={styles.programCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardSectionHeading}>Active Program</Text>
                  <Badge label="IN PROGRESS" variant="success" />
                </View>

                <Text style={styles.programName}>{activeProgram.name}</Text>
                {activeProgram.description && (
                  <Text style={styles.programDesc}>{activeProgram.description}</Text>
                )}

                <View style={styles.programDatesRow}>
                  <Text style={styles.programDateText}>
                    Started: {new Date(activeProgram.startDate).toLocaleDateString()}
                  </Text>
                  {activeProgram.endDate && (
                    <Text style={styles.programDateText}>
                      Target: {new Date(activeProgram.endDate).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </Card>
            )}

            {/* NEXT PT SESSION */}
            <Card style={styles.sessionCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionHeading}>Next PT Session</Text>
                {nextSession ? (
                  <Badge label="SCHEDULED" variant="primary" />
                ) : (
                  <Badge label="NONE PLANNED" variant="warning" />
                )}
              </View>

              {nextSession ? (
                <View>
                  <Text style={styles.sessionDate}>
                    {new Date(nextSession.scheduledStart).toLocaleString()}
                  </Text>
                  <Text style={styles.sessionLoc}>📍 {nextSession.location || 'Weight Room'}</Text>
                  {nextSession.notes && <Text style={styles.sessionNotes}>Notes: {nextSession.notes}</Text>}
                </View>
              ) : (
                <Text style={styles.emptyDesc}>Reach out to your coach or front desk to book a session.</Text>
              )}
            </Card>

            {/* MEMBER GOALS */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>My Goals</Text>
              <Button
                title="+ Add Goal"
                variant="outline"
                size="sm"
                onPress={() => setGoalModalVisible(true)}
              />
            </View>

            {goals.map((goal) => {
              const progressPct =
                goal.baselineValue != null && goal.targetValue != null && goal.currentValue != null && goal.targetValue !== goal.baselineValue
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        Math.round(
                          ((goal.currentValue - goal.baselineValue) /
                            (goal.targetValue - goal.baselineValue)) *
                            100,
                        ),
                      ),
                    )
                  : 50;

              return (
                <Card key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                      <Text style={styles.goalCat}>{goal.category}</Text>
                    </View>
                    <Badge
                      label={goal.status}
                      variant={goal.status === 'COMPLETED' ? 'success' : 'primary'}
                    />
                  </View>

                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
                  </View>

                  <View style={styles.goalValuesRow}>
                    <Text style={styles.goalValText}>
                      Current: <Text style={styles.cyanBold}>{goal.currentValue ?? '--'} {goal.unit}</Text>
                    </Text>
                    <Text style={styles.goalValText}>
                      Target: <Text style={styles.whiteBold}>{goal.targetValue ?? '--'} {goal.unit}</Text>
                    </Text>
                  </View>
                </Card>
              );
            })}

            {/* COACH'S FEEDBACK & CUES (MEMBER VISIBLE ONLY) */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Coach's Feedback & Cues</Text>
            </View>

            {coachingNotes.map((note) => (
              <Card key={note.id} style={styles.noteCard}>
                <View style={styles.noteTopRow}>
                  <Badge label="COACHING CUE" variant="info" />
                  <Text style={styles.noteDate}>
                    {new Date(note.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.noteContent}>{note.content}</Text>
              </Card>
            ))}

            {coachingNotes.length === 0 && (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Feedback Notes Yet</Text>
                <Text style={styles.emptyDesc}>
                  Your coach will post form corrections and training cues after sessions.
                </Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>

      {/* MEMBER ADD GOAL MODAL */}
      <Modal visible={goalModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Personal Goal</Text>
            <TextInput
              style={styles.input}
              placeholder="Goal Title (e.g. 5km run under 22 min)"
              placeholderTextColor={colors.textMuted}
              value={newGoalTitle}
              onChangeText={setNewGoalTitle}
            />
            <View style={styles.categoryRow}>
              {(['STRENGTH', 'BODY_COMPOSITION', 'MOBILITY', 'CARDIOVASCULAR'] as TrainingGoalCategory[]).map(
                (c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.typeBtn, newGoalCategory === c && styles.typeBtnActive]}
                    onPress={() => setNewGoalCategory(c)}
                  >
                    <Text style={[styles.typeBtnText, newGoalCategory === c && styles.typeBtnTextActive]}>
                      {c.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Baseline (e.g. 25)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newGoalBaseline}
                onChangeText={setNewGoalBaseline}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Target (e.g. 22)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newGoalTarget}
                onChangeText={setNewGoalTarget}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Unit (e.g. kg, min, %)"
              placeholderTextColor={colors.textMuted}
              value={newGoalUnit}
              onChangeText={setNewGoalUnit}
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                onPress={() => setGoalModalVisible(false)}
                style={styles.flexBtn}
              />
              <Button
                title="Save Goal"
                variant="primary"
                size="sm"
                onPress={handleCreateMemberGoal}
                style={styles.flexBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: sp.md,
    paddingTop: sp.md,
    paddingBottom: sp.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: {
    marginBottom: sp.xs,
  },
  backBtnText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  scrollContent: {
    padding: sp.md,
    paddingBottom: sp.xl * 2,
    gap: sp.md,
  },
  loadingContainer: {
    padding: sp.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: sp.sm,
  },
  trainerCard: {
    padding: sp.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  trainerHeaderRow: {
    flexDirection: 'row',
    gap: sp.md,
    alignItems: 'center',
  },
  trainerMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainerName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  trainerExp: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
  trainerAvail: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  trainerBio: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: sp.sm,
    lineHeight: 18,
  },
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
    marginTop: sp.sm,
  },
  specialtyChip: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: sp.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  specialtyChipText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  approachBox: {
    marginTop: sp.sm,
    padding: sp.sm,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  approachLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  approachText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  programCard: {
    padding: sp.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.xs,
  },
  cardSectionHeading: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  programName: {
    ...typography.h2,
    color: colors.primary,
    marginTop: 2,
  },
  programDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
  },
  programDatesRow: {
    flexDirection: 'row',
    gap: sp.lg,
    marginTop: sp.sm,
  },
  programDateText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  sessionCard: {
    padding: sp.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  sessionDate: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 4,
  },
  sessionLoc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sessionNotes: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: sp.xs,
  },
  sectionHeading: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  goalCard: {
    padding: sp.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  goalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  goalCat: {
    ...typography.caption,
    color: colors.primary,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 3,
    marginVertical: sp.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  goalValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalValText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  cyanBold: {
    color: colors.primary,
    fontWeight: '700',
  },
  whiteBold: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  noteCard: {
    padding: sp.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  noteTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  noteContent: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginTop: sp.sm,
    lineHeight: 18,
  },
  emptyCard: {
    padding: sp.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  emptyDesc: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  mtSm: {
    marginTop: sp.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: sp.md,
  },
  modalCard: {
    backgroundColor: colors.modalBackground,
    borderRadius: radius.md,
    padding: sp.lg,
    gap: sp.sm,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.sm,
    padding: sp.sm,
    color: colors.textPrimary,
    ...typography.bodySmall,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
  },
  typeBtn: {
    paddingHorizontal: sp.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHighlight,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
  },
  typeBtnText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  typeBtnTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: sp.sm,
  },
  halfInput: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: sp.sm,
    marginTop: sp.sm,
  },
  flexBtn: {
    flex: 1,
  },
});
