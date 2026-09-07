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
import { useRoute, useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Button, MetricCard } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { ptService } from '../services/ptService';
import type {
  TrainingProgram,
  TrainingGoal,
  TrainerNote,
  PersonalTrainingSession,
  TrainingGoalCategory,
  TrainerNoteType,
  TrainerNoteVisibility,
  PTSessionType,
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

type TabType = 'overview' | 'goals' | 'program' | 'sessions' | 'notes';

export const TrainerClientDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const memberProfileId = route.params?.memberProfileId || 'cmtq4sgyf00awpo1eqvfo3zy8';
  const clientName = route.params?.clientName || 'Alex Mercer';
  const clientEmail = route.params?.clientEmail || 'member@secondwind.com.au';

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Domain State
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [sessions, setSessions] = useState<PersonalTrainingSession[]>([]);
  const [notes, setNotes] = useState<TrainerNote[]>([]);

  // Modals State
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<TrainingGoalCategory>('STRENGTH');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalBaseline, setNewGoalBaseline] = useState('');
  const [newGoalUnit, setNewGoalUnit] = useState('kg');

  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<TrainingGoal | null>(null);
  const [progressValue, setProgressValue] = useState('');
  const [progressNotes, setProgressNotes] = useState('');

  const [programModalVisible, setProgramModalVisible] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramDesc, setNewProgramDesc] = useState('');

  const [cancelProgramModalVisible, setCancelProgramModalVisible] = useState(false);
  const [programToCancel, setProgramToCancel] = useState<TrainingProgram | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<TrainerNoteType>('COACHING');
  const [newNoteVisibility, setNewNoteVisibility] = useState<TrainerNoteVisibility>('PRIVATE'); // Safe default

  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [sessionType, setSessionType] = useState<PTSessionType>('ONE_ON_ONE');
  const [sessionLocation, setSessionLocation] = useState('Weightlifting Platform 2');
  const [sessionNotes, setSessionNotes] = useState('');

  const [noteFilter, setNoteFilter] = useState<'ALL' | TrainerNoteVisibility>('ALL');

  const loadClientData = useCallback(async () => {
    try {
      setLoading(true);
      const [progData, goalData, noteData, sessData] = await Promise.all([
        ptService.getMemberPrograms(memberProfileId).catch(() => []),
        ptService.getMemberGoals(memberProfileId).catch(() => []),
        ptService.getMemberNotes(memberProfileId).catch(() => []),
        ptService.getPTSessions({ memberProfileId }).catch(() => []),
      ]);

      setPrograms(progData);
      setGoals(goalData);
      setNotes(noteData);
      setSessions(sessData);
    } catch (err: any) {
      Alert.alert('Load Error', err?.message || 'Failed to load client coaching profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [memberProfileId]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadClientData();
  };

  // Program Actions
  const activeProgram = programs.find((p) => p.status === 'ACTIVE') || programs[0];

  const handleActivateProgram = async (programId: string) => {
    try {
      const updated = await ptService.activateProgram(programId);
      setPrograms((prev) => prev.map((p) => (p.id === programId ? updated : p)));
      Alert.alert('Program Activated', `Program '${updated.name}' is now active.`);
    } catch (err: any) {
      Alert.alert('Activation Failed', err?.message || 'Could not activate program.');
    }
  };

  const handlePauseProgram = async (programId: string) => {
    try {
      const updated = await ptService.pauseProgram(programId, 'Trainer requested pause');
      setPrograms((prev) => prev.map((p) => (p.id === programId ? updated : p)));
      Alert.alert('Program Paused', `Program '${updated.name}' is paused.`);
    } catch (err: any) {
      Alert.alert('Pause Failed', err?.message || 'Could not pause program.');
    }
  };

  const handleCompleteProgram = async (programId: string) => {
    try {
      const updated = await ptService.completeProgram(programId);
      setPrograms((prev) => prev.map((p) => (p.id === programId ? updated : p)));
      Alert.alert('Program Completed', `Congratulations! Program marked completed.`);
    } catch (err: any) {
      Alert.alert('Completion Failed', err?.message || 'Could not complete program.');
    }
  };

  const handleCreateProgram = async () => {
    if (!newProgramName.trim()) {
      Alert.alert('Required', 'Program name is required.');
      return;
    }
    try {
      const created = await ptService.createProgram(memberProfileId, {
        name: newProgramName,
        description: newProgramDesc,
        startDate: new Date().toISOString(),
      });
      setPrograms((prev) => [created, ...prev]);
      setProgramModalVisible(false);
      setNewProgramName('');
      setNewProgramDesc('');
      Alert.alert('Program Created', `Program '${created.name}' created in DRAFT state.`);
    } catch (err: any) {
      Alert.alert('Creation Failed', err?.message || 'Could not create program.');
    }
  };

  const handleCancelProgramSubmit = async () => {
    if (!programToCancel || !cancelReason.trim()) {
      Alert.alert('Required', 'Please provide a valid cancellation reason.');
      return;
    }
    try {
      const updated = await ptService.cancelProgram(programToCancel.id, cancelReason);
      setPrograms((prev) => prev.map((p) => (p.id === programToCancel.id ? updated : p)));
      setCancelProgramModalVisible(false);
      setCancelReason('');
      setProgramToCancel(null);
      Alert.alert('Program Cancelled', 'Program has been cancelled.');
    } catch (err: any) {
      Alert.alert('Cancellation Failed', err?.message || 'Could not cancel program.');
    }
  };

  // Goal Actions
  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) {
      Alert.alert('Required', 'Goal title is required.');
      return;
    }
    try {
      const created = await ptService.createGoal(memberProfileId, {
        title: newGoalTitle,
        category: newGoalCategory,
        targetValue: parseFloat(newGoalTarget) || undefined,
        baselineValue: parseFloat(newGoalBaseline) || undefined,
        unit: newGoalUnit,
        priority: 1,
        trainingProgramId: activeProgram?.id,
      });
      setGoals((prev) => [created, ...prev]);
      setGoalModalVisible(false);
      setNewGoalTitle('');
      setNewGoalTarget('');
      setNewGoalBaseline('');
      Alert.alert('Goal Created', `Goal '${created.title}' added to member profile.`);
    } catch (err: any) {
      Alert.alert('Creation Failed', err?.message || 'Could not create goal.');
    }
  };

  const handleRecordProgress = async () => {
    if (!selectedGoal || !progressValue.trim()) {
      Alert.alert('Required', 'Please enter progress value.');
      return;
    }
    try {
      const val = parseFloat(progressValue);
      const isCompleted = selectedGoal.targetValue != null ? val >= selectedGoal.targetValue : false;
      const updated = await ptService.recordGoalProgress(selectedGoal.id, {
        currentValue: val,
        status: isCompleted ? 'COMPLETED' : 'ACTIVE',
        notes: progressNotes || 'Progress update from coaching console',
      });
      setGoals((prev) => prev.map((g) => (g.id === selectedGoal.id ? updated : g)));
      setProgressModalVisible(false);
      setSelectedGoal(null);
      setProgressValue('');
      setProgressNotes('');
      Alert.alert('Progress Recorded', `Updated value to ${val} ${selectedGoal.unit || ''}.`);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not record progress.');
    }
  };

  // Note Actions
  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) {
      Alert.alert('Required', 'Note content cannot be empty.');
      return;
    }
    try {
      const created = await ptService.createNote(memberProfileId, {
        content: newNoteContent,
        noteType: newNoteType,
        visibility: newNoteVisibility,
        trainingProgramId: activeProgram?.id,
      });
      setNotes((prev) => [created, ...prev]);
      setNoteModalVisible(false);
      setNewNoteContent('');
      setNewNoteVisibility('PRIVATE'); // Reset to safe default
      Alert.alert('Note Saved', `Coaching note saved with ${created.visibility} visibility.`);
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save note.');
    }
  };

  // Session Actions
  const handleScheduleSession = async () => {
    try {
      const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
      start.setHours(10, 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      const scheduled = await ptService.schedulePTSession({
        memberProfileId,
        trainingProgramId: activeProgram?.id,
        sessionType,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        location: sessionLocation,
        notes: sessionNotes || '1-on-1 technique & programming check',
      });
      setSessions((prev) => [scheduled, ...prev]);
      setSessionModalVisible(false);
      setSessionNotes('');
      Alert.alert('Session Scheduled', `PT session scheduled for tomorrow 10:00.`);
    } catch (err: any) {
      Alert.alert('Scheduling Error', err?.message || 'Schedule conflict detected. Please pick another slot.');
    }
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      const updated = await ptService.startPTSession(sessionId);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? updated : s)));
      Alert.alert('Session Started', 'PT session is now in progress.');
    } catch (err: any) {
      Alert.alert('Start Error', err?.message || 'Could not start session.');
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      const updated = await ptService.completePTSession(sessionId);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? updated : s)));
      Alert.alert('Session Completed', 'PT Session completed! Facility attendance record linked.');
    } catch (err: any) {
      Alert.alert('Completion Error', err?.message || 'Could not complete session.');
    }
  };

  const filteredNotes = notes.filter((n) => {
    if (noteFilter === 'ALL') return true;
    return n.visibility === noteFilter;
  });

  return (
    <Screen style={styles.screen}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerNameRow}>
            <Text style={styles.headerTitle}>{clientName}</Text>
            <Badge label="PRIMARY" variant="success" />
          </View>
          <Text style={styles.headerSubtitle}>{clientEmail}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['overview', 'goals', 'program', 'sessions', 'notes'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading client coaching profile...</Text>
          </View>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <View style={styles.sectionContainer}>
                {/* Metric Strip */}
                <View style={styles.metricGrid}>
                  <MetricCard
                    label="Active Goals"
                    value={String(goals.filter((g) => g.status === 'ACTIVE').length)}
                    trend="up"
                    style={styles.metricCard}
                  />
                  <MetricCard
                    label="Sessions"
                    value={String(sessions.length)}
                    trend="neutral"
                    style={styles.metricCard}
                  />
                </View>

                {/* Active Program Card */}
                {activeProgram ? (
                  <Card style={styles.summaryCard}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardSectionTitle}>Active Training Program</Text>
                      <Badge
                        label={activeProgram.status}
                        variant={activeProgram.status === 'ACTIVE' ? 'success' : 'warning'}
                      />
                    </View>
                    <Text style={styles.programTitle}>{activeProgram.name}</Text>
                    {activeProgram.description && (
                      <Text style={styles.programDesc}>{activeProgram.description}</Text>
                    )}
                    <View style={styles.dateRow}>
                      <Text style={styles.dateLabel}>
                        Started: {new Date(activeProgram.startDate).toLocaleDateString()}
                      </Text>
                      {activeProgram.endDate && (
                        <Text style={styles.dateLabel}>
                          Target: {new Date(activeProgram.endDate).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </Card>
                ) : (
                  <Card style={styles.summaryCard}>
                    <Text style={styles.emptyTitle}>No Active Training Program</Text>
                    <Text style={styles.emptyDesc}>Create a periodized training program for this client.</Text>
                    <Button
                      title="Create Program"
                      variant="primary"
                      size="sm"
                      onPress={() => setProgramModalVisible(true)}
                      style={styles.mtSm}
                    />
                  </Card>
                )}

                {/* Priority Goals Preview */}
                <Card style={styles.summaryCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardSectionTitle}>Priority Goals</Text>
                    <TouchableOpacity onPress={() => setActiveTab('goals')}>
                      <Text style={styles.viewAllText}>View All ({goals.length})</Text>
                    </TouchableOpacity>
                  </View>
                  {goals.slice(0, 2).map((goal) => (
                    <View key={goal.id} style={styles.goalPreviewItem}>
                      <View style={styles.goalHeaderRow}>
                        <Text style={styles.goalTitle}>{goal.title}</Text>
                        <Badge label={goal.category} variant="info" />
                      </View>
                      <Text style={styles.goalValues}>
                        Current: <Text style={styles.highlightText}>{goal.currentValue ?? '--'} {goal.unit}</Text> | Target: {goal.targetValue ?? '--'} {goal.unit}
                      </Text>
                    </View>
                  ))}
                  {goals.length === 0 && (
                    <Text style={styles.emptyText}>No goals established yet.</Text>
                  )}
                </Card>

                {/* Upcoming PT Session Preview */}
                <Card style={styles.summaryCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardSectionTitle}>Next 1-on-1 PT Session</Text>
                    <TouchableOpacity onPress={() => setActiveTab('sessions')}>
                      <Text style={styles.viewAllText}>Manage</Text>
                    </TouchableOpacity>
                  </View>
                  {sessions.find((s) => s.status === 'SCHEDULED') ? (
                    <View style={styles.sessionItem}>
                      <Text style={styles.sessionTime}>
                        {new Date(sessions.find((s) => s.status === 'SCHEDULED')!.scheduledStart).toLocaleString()}
                      </Text>
                      <Text style={styles.sessionLoc}>
                        📍 {sessions.find((s) => s.status === 'SCHEDULED')!.location || 'Weight Room'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>No scheduled sessions upcoming.</Text>
                  )}
                </Card>
              </View>
            )}

            {/* GOALS TAB */}
            {activeTab === 'goals' && (
              <View style={styles.sectionContainer}>
                <View style={styles.actionBar}>
                  <Text style={styles.sectionHeading}>Member Goals</Text>
                  <Button
                    title="+ Add Goal"
                    variant="primary"
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
                      <View style={styles.goalHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.goalTitle}>{goal.title}</Text>
                          <Text style={styles.goalCategoryText}>{goal.category}</Text>
                        </View>
                        <Badge
                          label={goal.status}
                          variant={goal.status === 'COMPLETED' ? 'success' : 'primary'}
                        />
                      </View>

                      {goal.description && <Text style={styles.goalDesc}>{goal.description}</Text>}

                      {/* Progress Bar */}
                      <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
                      </View>

                      <View style={styles.goalMetricsRow}>
                        <Text style={styles.metricItem}>
                          Baseline: <Text style={styles.whiteBold}>{goal.baselineValue ?? '--'} {goal.unit}</Text>
                        </Text>
                        <Text style={styles.metricItem}>
                          Current: <Text style={styles.cyanBold}>{goal.currentValue ?? '--'} {goal.unit}</Text>
                        </Text>
                        <Text style={styles.metricItem}>
                          Target: <Text style={styles.whiteBold}>{goal.targetValue ?? '--'} {goal.unit}</Text>
                        </Text>
                      </View>

                      {goal.targetDate && (
                        <Text style={styles.targetDateText}>
                          Target Date: {new Date(goal.targetDate).toLocaleDateString()}
                        </Text>
                      )}

                      {/* Record Progress Button */}
                      <Button
                        title="Record Progress Milestone"
                        variant="outline"
                        size="sm"
                        onPress={() => {
                          setSelectedGoal(goal);
                          setProgressValue(String(goal.currentValue ?? ''));
                          setProgressModalVisible(true);
                        }}
                        style={styles.mtSm}
                      />
                    </Card>
                  );
                })}

                {goals.length === 0 && (
                  <Card style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No Goals Set</Text>
                    <Text style={styles.emptyDesc}>Establish member fitness and performance goals.</Text>
                  </Card>
                )}
              </View>
            )}

            {/* PROGRAM TAB */}
            {activeTab === 'program' && (
              <View style={styles.sectionContainer}>
                <View style={styles.actionBar}>
                  <Text style={styles.sectionHeading}>Coaching Programs</Text>
                  <Button
                    title="+ New Program"
                    variant="primary"
                    size="sm"
                    onPress={() => setProgramModalVisible(true)}
                  />
                </View>

                {programs.map((prog) => (
                  <Card key={prog.id} style={styles.programCard}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.programTitle}>{prog.name}</Text>
                      <Badge
                        label={prog.status}
                        variant={
                          prog.status === 'ACTIVE'
                            ? 'success'
                            : prog.status === 'COMPLETED'
                            ? 'info'
                            : 'warning'
                        }
                      />
                    </View>

                    {prog.description && <Text style={styles.programDesc}>{prog.description}</Text>}

                    <View style={styles.dateRow}>
                      <Text style={styles.dateLabel}>
                        Starts: {new Date(prog.startDate).toLocaleDateString()}
                      </Text>
                      {prog.endDate && (
                        <Text style={styles.dateLabel}>
                          Ends: {new Date(prog.endDate).toLocaleDateString()}
                        </Text>
                      )}
                    </View>

                    {/* Program Lifecycle Action Controls */}
                    <View style={styles.lifecycleButtonsRow}>
                      {prog.status === 'DRAFT' && (
                        <Button
                          title="Activate Program"
                          variant="primary"
                          size="sm"
                          onPress={() => handleActivateProgram(prog.id)}
                          style={styles.flexBtn}
                        />
                      )}
                      {prog.status === 'ACTIVE' && (
                        <>
                          <Button
                            title="Pause"
                            variant="outline"
                            size="sm"
                            onPress={() => handlePauseProgram(prog.id)}
                            style={styles.flexBtn}
                          />
                          <Button
                            title="Complete"
                            variant="primary"
                            size="sm"
                            onPress={() => handleCompleteProgram(prog.id)}
                            style={styles.flexBtn}
                          />
                        </>
                      )}
                      {prog.status === 'PAUSED' && (
                        <Button
                          title="Resume"
                          variant="primary"
                          size="sm"
                          onPress={() => handleActivateProgram(prog.id)}
                          style={styles.flexBtn}
                        />
                      )}
                      {['DRAFT', 'ACTIVE', 'PAUSED'].includes(prog.status) && (
                        <Button
                          title="Cancel"
                          variant="danger"
                          size="sm"
                          onPress={() => {
                            setProgramToCancel(prog);
                            setCancelProgramModalVisible(true);
                          }}
                          style={styles.flexBtn}
                        />
                      )}
                    </View>
                  </Card>
                ))}

                {programs.length === 0 && (
                  <Card style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No Training Programs</Text>
                    <Text style={styles.emptyDesc}>Design a structured periodization program.</Text>
                  </Card>
                )}
              </View>
            )}

            {/* SESSIONS TAB */}
            {activeTab === 'sessions' && (
              <View style={styles.sectionContainer}>
                <View style={styles.actionBar}>
                  <Text style={styles.sectionHeading}>1-on-1 PT Sessions</Text>
                  <Button
                    title="+ Schedule"
                    variant="primary"
                    size="sm"
                    onPress={() => setSessionModalVisible(true)}
                  />
                </View>

                {sessions.map((sess) => (
                  <Card key={sess.id} style={styles.sessionCard}>
                    <View style={styles.cardHeaderRow}>
                      <View>
                        <Text style={styles.sessionType}>{sess.sessionType}</Text>
                        <Text style={styles.sessionDateTime}>
                          {new Date(sess.scheduledStart).toLocaleString()}
                        </Text>
                      </View>
                      <Badge
                        label={sess.status}
                        variant={
                          sess.status === 'COMPLETED'
                            ? 'success'
                            : sess.status === 'IN_PROGRESS'
                            ? 'warning'
                            : 'primary'
                        }
                      />
                    </View>

                    {sess.location && (
                      <Text style={styles.locationText}>📍 {sess.location}</Text>
                    )}

                    {sess.notes && <Text style={styles.sessionNotesText}>{sess.notes}</Text>}

                    {sess.attendanceRecordId && (
                      <View style={styles.attBadgeContainer}>
                        <Badge label="Attendance Verified" variant="success" />
                      </View>
                    )}

                    <View style={styles.sessionActionsRow}>
                      {sess.status === 'SCHEDULED' && (
                        <Button
                          title="Start Session"
                          variant="primary"
                          size="sm"
                          onPress={() => handleStartSession(sess.id)}
                          style={styles.flexBtn}
                        />
                      )}
                      {sess.status === 'IN_PROGRESS' && (
                        <Button
                          title="Complete Session"
                          variant="primary"
                          size="sm"
                          onPress={() => handleCompleteSession(sess.id)}
                          style={styles.flexBtn}
                        />
                      )}
                    </View>
                  </Card>
                ))}

                {sessions.length === 0 && (
                  <Card style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No PT Sessions</Text>
                    <Text style={styles.emptyDesc}>Schedule 1-on-1 training and assessment sessions.</Text>
                  </Card>
                )}
              </View>
            )}

            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <View style={styles.sectionContainer}>
                <View style={styles.actionBar}>
                  <Text style={styles.sectionHeading}>Trainer Notes</Text>
                  <Button
                    title="+ New Note"
                    variant="primary"
                    size="sm"
                    onPress={() => setNoteModalVisible(true)}
                  />
                </View>

                {/* Visibility Filter Chips */}
                <View style={styles.filterChipsRow}>
                  {(['ALL', 'PRIVATE', 'STAFF', 'MEMBER_VISIBLE'] as const).map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.filterChip, noteFilter === v && styles.filterChipActive]}
                      onPress={() => setNoteFilter(v)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          noteFilter === v && styles.filterChipTextActive,
                        ]}
                      >
                        {v === 'ALL'
                          ? 'All Notes'
                          : v === 'PRIVATE'
                          ? '🔒 Private'
                          : v === 'STAFF'
                          ? '🛡️ Staff'
                          : '👁️ Member'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {filteredNotes.map((note) => (
                  <Card key={note.id} style={styles.noteCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.noteHeaderLeft}>
                        <Badge
                          label={
                            note.visibility === 'PRIVATE'
                              ? '🔒 PRIVATE'
                              : note.visibility === 'STAFF'
                              ? '🛡️ STAFF ONLY'
                              : '👁️ MEMBER VISIBLE'
                          }
                          variant={
                            note.visibility === 'PRIVATE'
                              ? 'warning'
                              : note.visibility === 'STAFF'
                              ? 'info'
                              : 'success'
                          }
                        />
                        <Text style={styles.noteTypeText}>{note.noteType}</Text>
                      </View>
                      <Text style={styles.noteDate}>
                        {new Date(note.createdAt).toLocaleDateString()}
                      </Text>
                    </View>

                    <Text style={styles.noteContentText}>{note.content}</Text>
                  </Card>
                ))}

                {filteredNotes.length === 0 && (
                  <Card style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No Notes Found</Text>
                    <Text style={styles.emptyDesc}>Coaching observations, clinical screens, and member cues.</Text>
                  </Card>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* MODAL: ADD GOAL */}
      <Modal visible={goalModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Member Goal</Text>
            <TextInput
              style={styles.input}
              placeholder="Goal Title (e.g. Barbell Back Squat 140kg)"
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
                placeholder="Baseline (e.g. 115)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newGoalBaseline}
                onChangeText={setNewGoalBaseline}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Target (e.g. 140)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newGoalTarget}
                onChangeText={setNewGoalTarget}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Unit (e.g. kg, %, km)"
              placeholderTextColor={colors.textMuted}
              value={newGoalUnit}
              onChangeText={setNewGoalUnit}
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" size="sm" onPress={() => setGoalModalVisible(false)} style={styles.flexBtn} />
              <Button title="Save Goal" variant="primary" size="sm" onPress={handleCreateGoal} style={styles.flexBtn} />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: RECORD GOAL PROGRESS */}
      <Modal visible={progressModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Goal Progress</Text>
            <Text style={styles.modalSub}>{selectedGoal?.title}</Text>
            <TextInput
              style={styles.input}
              placeholder={`New Value in ${selectedGoal?.unit || 'units'}`}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={progressValue}
              onChangeText={setProgressValue}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Milestone notes (e.g. Hit clean double at RPE 8)"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={progressNotes}
              onChangeText={setProgressNotes}
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" size="sm" onPress={() => setProgressModalVisible(false)} style={styles.flexBtn} />
              <Button title="Save Progress" variant="primary" size="sm" onPress={handleRecordProgress} style={styles.flexBtn} />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: CREATE PROGRAM */}
      <Modal visible={programModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Training Program</Text>
            <TextInput
              style={styles.input}
              placeholder="Program Name (e.g. Hypertrophy Block 1)"
              placeholderTextColor={colors.textMuted}
              value={newProgramName}
              onChangeText={setNewProgramName}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Periodization description, volume, and objectives..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={newProgramDesc}
              onChangeText={setNewProgramDesc}
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" size="sm" onPress={() => setProgramModalVisible(false)} style={styles.flexBtn} />
              <Button title="Create Program" variant="primary" size="sm" onPress={handleCreateProgram} style={styles.flexBtn} />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: CANCEL PROGRAM */}
      <Modal visible={cancelProgramModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Training Program</Text>
            <Text style={styles.modalSub}>Cancellation reason is mandatory for compliance.</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="State reason for program termination..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={cancelReason}
              onChangeText={setCancelReason}
            />
            <View style={styles.modalActions}>
              <Button title="Back" variant="outline" size="sm" onPress={() => setCancelProgramModalVisible(false)} style={styles.flexBtn} />
              <Button title="Confirm Cancel" variant="danger" size="sm" onPress={handleCancelProgramSubmit} style={styles.flexBtn} />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: SCHEDULE SESSION */}
      <Modal visible={sessionModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Schedule PT Session</Text>
            <View style={styles.typeRow}>
              {(['ONE_ON_ONE', 'ASSESSMENT', 'CONSULTATION'] as PTSessionType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, sessionType === t && styles.typeBtnActive]}
                  onPress={() => setSessionType(t)}
                >
                  <Text style={[styles.typeBtnText, sessionType === t && styles.typeBtnTextActive]}>
                    {t.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Location (e.g. Weightlifting Platform 2)"
              placeholderTextColor={colors.textMuted}
              value={sessionLocation}
              onChangeText={setSessionLocation}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Session agenda or preparation notes..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
              value={sessionNotes}
              onChangeText={setSessionNotes}
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" size="sm" onPress={() => setSessionModalVisible(false)} style={styles.flexBtn} />
              <Button title="Schedule" variant="primary" size="sm" onPress={handleScheduleSession} style={styles.flexBtn} />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: NEW TRAINER NOTE */}
      <Modal visible={noteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Coaching Note</Text>

            {/* Visibility Selector with Safe Default */}
            <Text style={styles.inputLabel}>Visibility (Safe Default: Private)</Text>
            <View style={styles.visibilityRow}>
              {(['PRIVATE', 'STAFF', 'MEMBER_VISIBLE'] as TrainerNoteVisibility[]).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.visBtn, newNoteVisibility === v && styles.visBtnActive]}
                  onPress={() => setNewNoteVisibility(v)}
                >
                  <Text style={[styles.visBtnText, newNoteVisibility === v && styles.visBtnTextActive]}>
                    {v === 'PRIVATE' ? '🔒 Private' : v === 'STAFF' ? '🛡️ Staff' : '👁️ Member'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Note Type</Text>
            <View style={styles.typeRow}>
              {(['COACHING', 'SESSION', 'GOAL', 'GENERAL'] as TrainerNoteType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, newNoteType === t && styles.typeBtnActive]}
                  onPress={() => setNewNoteType(t)}
                >
                  <Text style={[styles.typeBtnText, newNoteType === t && styles.typeBtnTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter technical cues, observations, or member feedback..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={newNoteContent}
              onChangeText={setNewNoteContent}
            />

            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" size="sm" onPress={() => setNoteModalVisible(false)} style={styles.flexBtn} />
              <Button title="Save Note" variant="primary" size="sm" onPress={handleCreateNote} style={styles.flexBtn} />
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
  headerInfo: {
    marginTop: 2,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: sp.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  tabItem: {
    flex: 1,
    paddingVertical: sp.sm,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: sp.md,
    paddingBottom: sp.xl * 2,
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
  sectionContainer: {
    gap: sp.md,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: sp.md,
  },
  metricCard: {
    flex: 1,
  },
  summaryCard: {
    padding: sp.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.sm,
  },
  cardSectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  viewAllText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  programTitle: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: 4,
  },
  programDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: sp.sm,
  },
  dateRow: {
    flexDirection: 'row',
    gap: sp.lg,
    marginTop: 4,
  },
  dateLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  goalPreviewItem: {
    paddingVertical: sp.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  goalCategoryText: {
    ...typography.caption,
    color: colors.primary,
  },
  goalValues: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  highlightText: {
    color: colors.primary,
    fontWeight: '700',
  },
  sessionItem: {
    marginTop: 2,
  },
  sessionTime: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sessionLoc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
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
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.xs,
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
  goalDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: sp.xs,
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
  goalMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: sp.xs,
  },
  metricItem: {
    ...typography.caption,
    color: colors.textMuted,
  },
  whiteBold: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  cyanBold: {
    color: colors.primary,
    fontWeight: '700',
  },
  targetDateText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: sp.xs,
  },
  programCard: {
    padding: sp.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  lifecycleButtonsRow: {
    flexDirection: 'row',
    gap: sp.sm,
    marginTop: sp.md,
    paddingTop: sp.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  sessionCard: {
    padding: sp.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  sessionType: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  sessionDateTime: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  locationText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sessionNotesText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  attBadgeContainer: {
    marginTop: sp.sm,
  },
  sessionActionsRow: {
    flexDirection: 'row',
    gap: sp.sm,
    marginTop: sp.md,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: sp.xs,
    marginBottom: sp.xs,
  },
  filterChip: {
    paddingHorizontal: sp.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  noteCard: {
    padding: sp.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  noteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
  },
  noteTypeText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  noteDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  noteContentText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginTop: sp.sm,
    lineHeight: 18,
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
  modalSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: sp.xs,
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
  inputLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: sp.sm,
  },
  halfInput: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
  },
  typeRow: {
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
  visibilityRow: {
    flexDirection: 'row',
    gap: sp.xs,
  },
  visBtn: {
    flex: 1,
    paddingVertical: sp.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
  },
  visBtnActive: {
    backgroundColor: colors.primary,
  },
  visBtnText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  visBtnTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: sp.sm,
    marginTop: sp.sm,
  },
  flexBtn: {
    flex: 1,
  },
  mtSm: {
    marginTop: sp.sm,
  },
});
