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
import { Screen, Card, Badge, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { ptService } from '../services/ptService';
import type { TrainingGoal } from '@fitcore/types';

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

export const GoalsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const memberProfileId = route.params?.memberProfileId || 'cmtq4sgyf00awpo1eqvfo3zy8';
  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Milestone Progress Modal
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<TrainingGoal | null>(null);
  const [progressVal, setProgressVal] = useState('');
  const [progressNotes, setProgressNotes] = useState('');

  // History Drawer Modal
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [activeGoalWithHistory, setActiveGoalWithHistory] = useState<any>(null);

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ptService.getMemberGoals(memberProfileId);
      setGoals(data);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load goals.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [memberProfileId]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGoals();
  };

  const handleRecordProgress = async () => {
    if (!selectedGoal || !progressVal.trim()) {
      Alert.alert('Required', 'Please enter progress value.');
      return;
    }
    try {
      const val = parseFloat(progressVal);
      const isCompleted = selectedGoal.targetValue ? val >= selectedGoal.targetValue : false;
      const updated = await ptService.recordGoalProgress(selectedGoal.id, {
        currentValue: val,
        status: isCompleted ? 'COMPLETED' : 'ACTIVE',
        notes: progressNotes || 'Progress update',
      });
      setGoals((prev) => prev.map((g) => (g.id === selectedGoal.id ? updated : g)));
      setProgressModalVisible(false);
      setSelectedGoal(null);
      setProgressVal('');
      setProgressNotes('');
      Alert.alert('Success', 'Progress recorded in GoalHistory.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to record progress.');
    }
  };

  const handleOpenHistory = async (goalId: string) => {
    try {
      const goalDetail = await ptService.getGoalById(goalId);
      setActiveGoalWithHistory(goalDetail);
      setHistoryModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not fetch history.');
    }
  };

  const filteredGoals = goals.filter((g) => {
    if (selectedCategory === 'ALL') return true;
    return g.category === selectedCategory;
  });

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Training Goals</Text>
        <Text style={styles.headerSubtitle}>Member-owned performance targets & milestones</Text>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {['ALL', 'STRENGTH', 'BODY_COMPOSITION', 'MOBILITY', 'CARDIOVASCULAR'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCategory === cat && styles.chipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                {cat.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredGoals.map((goal) => {
              const progressPct =
                goal.status === 'COMPLETED'
                  ? 100
                  : goal.baselineValue != null &&
                    goal.targetValue != null &&
                    goal.currentValue != null &&
                    goal.targetValue !== goal.baselineValue
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
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                      <Text style={styles.categoryBadgeText}>{goal.category}</Text>
                    </View>
                    <Badge
                      label={goal.status}
                      variant={goal.status === 'COMPLETED' ? 'success' : 'primary'}
                    />
                  </View>

                  {goal.description && <Text style={styles.desc}>{goal.description}</Text>}

                  {/* Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
                  </View>

                  <View style={styles.metricsRow}>
                    <Text style={styles.metricText}>
                      Baseline: <Text style={styles.bold}>{goal.baselineValue ?? '--'} {goal.unit}</Text>
                    </Text>
                    <Text style={styles.metricText}>
                      Current: <Text style={styles.cyanBold}>{goal.currentValue ?? '--'} {goal.unit}</Text>
                    </Text>
                    <Text style={styles.metricText}>
                      Target: <Text style={styles.bold}>{goal.targetValue ?? '--'} {goal.unit}</Text>
                    </Text>
                  </View>

                  <View style={styles.buttonRow}>
                    <Button
                      title="Update Progress"
                      variant="primary"
                      size="sm"
                      onPress={() => {
                        setSelectedGoal(goal);
                        setProgressVal(String(goal.currentValue ?? ''));
                        setProgressModalVisible(true);
                      }}
                      style={styles.flexBtn}
                    />
                    <Button
                      title="History"
                      variant="outline"
                      size="sm"
                      onPress={() => handleOpenHistory(goal.id)}
                      style={styles.flexBtn}
                    />
                  </View>
                </Card>
              );
            })}

            {filteredGoals.length === 0 && (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Goals Found</Text>
              </Card>
            )}
          </View>
        )}
      </ScrollView>

      {/* Progress Modal */}
      <Modal visible={progressModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Goal Progress</Text>
            <Text style={styles.modalSub}>{selectedGoal?.title}</Text>
            <TextInput
              style={styles.input}
              placeholder={`New value (${selectedGoal?.unit || 'units'})`}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={progressVal}
              onChangeText={setProgressVal}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Milestone notes..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={progressNotes}
              onChangeText={setProgressNotes}
            />
            <View style={styles.buttonRow}>
              <Button title="Cancel" variant="outline" size="sm" onPress={() => setProgressModalVisible(false)} style={styles.flexBtn} />
              <Button title="Save Milestone" variant="primary" size="sm" onPress={handleRecordProgress} style={styles.flexBtn} />
            </View>
          </View>
        </View>
      </Modal>

      {/* History Drawer Modal */}
      <Modal visible={historyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Goal History Milestones</Text>
            <Text style={styles.modalSub}>{activeGoalWithHistory?.title}</Text>

            <ScrollView style={styles.historyList}>
              {activeGoalWithHistory?.history?.map((h: any) => (
                <View key={h.id} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>
                      {new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString()}
                    </Text>
                    <Badge label={h.newStatus} variant="info" />
                  </View>
                  <Text style={styles.historyValues}>
                    {h.previousValue ?? '0'} → <Text style={styles.cyanBold}>{h.newValue}</Text> {activeGoalWithHistory?.unit}
                  </Text>
                  {h.notes && <Text style={styles.historyNotes}>"{h.notes}"</Text>}
                </View>
              ))}
            </ScrollView>

            <Button title="Close" variant="outline" size="sm" onPress={() => setHistoryModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: sp.md,
    paddingTop: sp.md,
    paddingBottom: sp.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: { marginBottom: sp.xs },
  backBtnText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSubtitle: { ...typography.caption, color: colors.textMuted },
  filterRow: { backgroundColor: colors.surface, paddingVertical: sp.xs },
  chipScroll: { paddingHorizontal: sp.md, gap: sp.xs },
  chip: {
    paddingHorizontal: sp.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textMuted },
  chipTextActive: { color: '#000', fontWeight: '700' },
  scrollContent: { padding: sp.md, gap: sp.md },
  loadingContainer: { padding: sp.xl, alignItems: 'center' },
  listContainer: { gap: sp.md },
  goalCard: { padding: sp.md, backgroundColor: colors.surface, borderColor: colors.borderSubtle },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalTitle: { ...typography.h3, color: colors.textPrimary },
  categoryBadgeText: { ...typography.caption, color: colors.primary },
  desc: { ...typography.caption, color: colors.textSecondary, marginTop: sp.xs },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 3,
    marginVertical: sp.sm,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: sp.sm },
  metricText: { ...typography.caption, color: colors.textMuted },
  bold: { color: colors.textPrimary, fontWeight: '700' },
  cyanBold: { color: colors.primary, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: sp.sm },
  flexBtn: { flex: 1 },
  emptyCard: { padding: sp.lg, alignItems: 'center' },
  emptyTitle: { ...typography.h3, color: colors.textPrimary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: sp.md },
  modalCard: { backgroundColor: colors.modalBackground, borderRadius: radius.md, padding: sp.lg, gap: sp.sm },
  modalTitle: { ...typography.h2, color: colors.textPrimary },
  modalSub: { ...typography.caption, color: colors.textMuted, marginBottom: sp.xs },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.sm,
    padding: sp.sm,
    color: colors.textPrimary,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  historyList: { maxHeight: 250, marginVertical: sp.sm },
  historyItem: {
    paddingVertical: sp.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: 2,
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyDate: { ...typography.caption, color: colors.textMuted },
  historyValues: { ...typography.bodySmall, color: colors.textPrimary },
  historyNotes: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' },
});
