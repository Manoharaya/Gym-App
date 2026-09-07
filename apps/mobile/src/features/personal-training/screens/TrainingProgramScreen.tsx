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
import type { TrainingProgram } from '@fitcore/types';

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

export const TrainingProgramScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const programId = route.params?.programId || 'prog_alex_strength_001';
  const [program, setProgram] = useState<TrainingProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const loadProgram = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ptService.getProgramById(programId);
      setProgram(data);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load program.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [programId]);

  useEffect(() => {
    loadProgram();
  }, [loadProgram]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProgram();
  };

  const handleActivate = async () => {
    try {
      const updated = await ptService.activateProgram(programId);
      setProgram(updated);
      Alert.alert('Success', 'Program is now ACTIVE.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not activate program.');
    }
  };

  const handlePause = async () => {
    try {
      const updated = await ptService.pauseProgram(programId, 'Trainer requested pause');
      setProgram(updated);
      Alert.alert('Success', 'Program has been PAUSED.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not pause program.');
    }
  };

  const handleComplete = async () => {
    try {
      const updated = await ptService.completeProgram(programId);
      setProgram(updated);
      Alert.alert('Congratulations', 'Program marked COMPLETED.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not complete program.');
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Required', 'Please enter a cancellation reason.');
      return;
    }
    try {
      const updated = await ptService.cancelProgram(programId, cancelReason);
      setProgram(updated);
      setCancelModalVisible(false);
      setCancelReason('');
      Alert.alert('Success', 'Program has been CANCELLED.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not cancel program.');
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Training Program Details</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : program ? (
          <View style={styles.container}>
            <Card style={styles.mainCard}>
              <View style={styles.headerRow}>
                <Text style={styles.progTitle}>{program.name}</Text>
                <Badge
                  label={program.status}
                  variant={
                    program.status === 'ACTIVE'
                      ? 'success'
                      : program.status === 'COMPLETED'
                      ? 'info'
                      : 'warning'
                  }
                />
              </View>

              {program.description && <Text style={styles.desc}>{program.description}</Text>}

              <View style={styles.dateBlock}>
                <Text style={styles.dateText}>
                  📅 Start Date: {new Date(program.startDate).toLocaleDateString()}
                </Text>
                {program.endDate && (
                  <Text style={styles.dateText}>
                    🎯 Target End Date: {new Date(program.endDate).toLocaleDateString()}
                  </Text>
                )}
                {program.completedAt && (
                  <Text style={styles.dateText}>
                    ✅ Completed: {new Date(program.completedAt).toLocaleDateString()}
                  </Text>
                )}
                {program.cancellationReason && (
                  <Text style={styles.cancelReasonText}>
                    ❌ Reason for Cancellation: {program.cancellationReason}
                  </Text>
                )}
              </View>

              {/* Action Controls */}
              <View style={styles.actionsRow}>
                {program.status === 'DRAFT' && (
                  <Button title="Activate" variant="primary" size="sm" onPress={handleActivate} style={styles.flexBtn} />
                )}
                {program.status === 'ACTIVE' && (
                  <>
                    <Button title="Pause" variant="outline" size="sm" onPress={handlePause} style={styles.flexBtn} />
                    <Button title="Complete" variant="primary" size="sm" onPress={handleComplete} style={styles.flexBtn} />
                  </>
                )}
                {program.status === 'PAUSED' && (
                  <Button title="Resume" variant="primary" size="sm" onPress={handleActivate} style={styles.flexBtn} />
                )}
                {['DRAFT', 'ACTIVE', 'PAUSED'].includes(program.status) && (
                  <Button
                    title="Cancel Program"
                    variant="danger"
                    size="sm"
                    onPress={() => setCancelModalVisible(true)}
                    style={styles.flexBtn}
                  />
                )}
              </View>
            </Card>

            {/* Program Goals */}
            {program.goals && program.goals.length > 0 && (
              <Card style={styles.goalsCard}>
                <Text style={styles.subHeading}>Linked Goals ({program.goals.length})</Text>
                {program.goals.map((goal) => (
                  <View key={goal.id} style={styles.goalItem}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Badge label={goal.status} variant="info" />
                  </View>
                ))}
              </Card>
            )}
          </View>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Program Not Found</Text>
          </Card>
        )}
      </ScrollView>

      {/* Cancel Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Training Program</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Mandatory cancellation reason..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={cancelReason}
              onChangeText={setCancelReason}
            />
            <View style={styles.actionsRow}>
              <Button title="Back" variant="outline" size="sm" onPress={() => setCancelModalVisible(false)} style={styles.flexBtn} />
              <Button title="Confirm Cancel" variant="danger" size="sm" onPress={handleCancelSubmit} style={styles.flexBtn} />
            </View>
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
  scrollContent: { padding: sp.md, gap: sp.md },
  loadingContainer: { padding: sp.xl, alignItems: 'center' },
  container: { gap: sp.md },
  mainCard: { padding: sp.md, backgroundColor: colors.surface, borderColor: colors.borderSubtle },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progTitle: { ...typography.h2, color: colors.primary },
  desc: { ...typography.bodySmall, color: colors.textSecondary, marginTop: sp.sm },
  dateBlock: { marginTop: sp.md, gap: 4 },
  dateText: { ...typography.caption, color: colors.textMuted },
  cancelReasonText: { ...typography.caption, color: themeColors.danger, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.md },
  flexBtn: { flex: 1 },
  goalsCard: { padding: sp.md, backgroundColor: colors.surface, borderColor: colors.borderSubtle },
  subHeading: { ...typography.h3, color: colors.textPrimary, marginBottom: sp.sm },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: sp.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  goalTitle: { ...typography.body, color: colors.textPrimary },
  emptyCard: { padding: sp.lg, alignItems: 'center' },
  emptyTitle: { ...typography.h3, color: colors.textPrimary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: sp.md },
  modalCard: { backgroundColor: colors.modalBackground, borderRadius: radius.md, padding: sp.lg, gap: sp.sm },
  modalTitle: { ...typography.h2, color: colors.textPrimary },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.sm,
    padding: sp.sm,
    color: colors.textPrimary,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
});
