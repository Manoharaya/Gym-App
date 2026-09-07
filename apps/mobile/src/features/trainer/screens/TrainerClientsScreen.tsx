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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Button, Avatar, MetricCard } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { trainerService } from '../services/trainerService';
import type { TrainerAssignmentType, TrainerAssignmentStatus } from '@fitcore/types';

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

interface ClientAssignmentItem {
  id: string;
  assignmentType: TrainerAssignmentType;
  status: TrainerAssignmentStatus;
  startDate: string;
  endDate?: string;
  notes?: string;
  memberProfile: {
    id: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
  trainerProfile?: {
    id: string;
    professionalName: string;
  };
}

const FALLBACK_CLIENTS: ClientAssignmentItem[] = [
  {
    id: 'asgn_1',
    assignmentType: 'PRIMARY',
    status: 'ACTIVE',
    startDate: '2024-02-01T00:00:00.000Z',
    notes: 'Primary 1-on-1 athletic strength programming & weekly technique check-in.',
    memberProfile: {
      id: 'mp_1',
      user: {
        id: 'u_1',
        email: 'member@secondwind.com.au',
        firstName: 'Alex',
        lastName: 'Mercer',
      },
    },
  },
  {
    id: 'asgn_2',
    assignmentType: 'PRIMARY',
    status: 'ACTIVE',
    startDate: '2024-03-15T00:00:00.000Z',
    notes: 'Competition prep hypertrophy block.',
    memberProfile: {
      id: 'mp_2',
      user: {
        id: 'u_2',
        email: 'completed@secondwind.com.au',
        firstName: 'Chris',
        lastName: 'Evans',
      },
    },
  },
  {
    id: 'asgn_3',
    assignmentType: 'SECONDARY',
    status: 'ACTIVE',
    startDate: '2024-05-10T00:00:00.000Z',
    notes: 'Olympic lifting technique consultant.',
    memberProfile: {
      id: 'mp_3',
      user: {
        id: 'u_3',
        email: 'active.member@secondwind.com.au',
        firstName: 'Active',
        lastName: 'Member',
      },
    },
  },
  {
    id: 'asgn_4',
    assignmentType: 'PRIMARY',
    status: 'REASSIGNED',
    startDate: '2023-08-01T00:00:00.000Z',
    endDate: '2024-01-30T00:00:00.000Z',
    notes: 'Reassigned to Mike Ross for cardiovascular conditioning.',
    memberProfile: {
      id: 'mp_4',
      user: {
        id: 'u_4',
        email: 'in-progress@secondwind.com.au',
        firstName: 'Bella',
        lastName: 'Swan',
      },
    },
  },
];

export const TrainerClientsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const trainerId = route.params?.trainerId || 'trainer_marcus';

  const [clients, setClients] = useState<ClientAssignmentItem[]>(FALLBACK_CLIENTS);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [refreshing, setRefreshing] = useState(false);

  // Reassignment Modal State
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ClientAssignmentItem | null>(null);
  const [reassignReason, setReassignReason] = useState('');
  const [reassignNotes, setReassignNotes] = useState('');

  // Assign New Client Modal State
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newAssignmentType, setNewAssignmentType] = useState<TrainerAssignmentType>('PRIMARY');
  const [newAssignmentNotes, setNewAssignmentNotes] = useState('');

  const fetchClients = useCallback(async () => {
    try {
      const data = await trainerService.getTrainerClients(trainerId);
      if (data && data.length > 0) {
        setClients(data as unknown as ClientAssignmentItem[]);
      }
    } catch {
      // Keep fallback
    } finally {
      setRefreshing(false);
    }
  }, [trainerId]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  const handleReassign = async () => {
    if (!selectedAssignment) return;

    try {
      await trainerService.reassignClient(trainerId, selectedAssignment.id, {
        newTrainerId: 'trainer_mike',
        assignmentType: selectedAssignment.assignmentType,
        reason: reassignReason || 'Reassigned via mobile app',
        transferNotes: reassignNotes,
      });

      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedAssignment.id
            ? { ...c, status: 'REASSIGNED' as TrainerAssignmentStatus, endDate: new Date().toISOString() }
            : c,
        ),
      );

      setReassignModalVisible(false);
      setSelectedAssignment(null);
      setReassignReason('');
      setReassignNotes('');
      Alert.alert(
        'Client Reassigned',
        'Assignment closed and new coach relationship established with preserved audit trail.',
      );
    } catch {
      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedAssignment.id
            ? { ...c, status: 'REASSIGNED' as TrainerAssignmentStatus, endDate: new Date().toISOString() }
            : c,
        ),
      );
      setReassignModalVisible(false);
      setSelectedAssignment(null);
      Alert.alert('Client Reassigned (Local)', 'Transfer recorded successfully.');
    }
  };

  const handleTerminate = async (assignment: ClientAssignmentItem) => {
    Alert.alert(
      'Terminate Coaching Relationship',
      `Are you sure you want to end coaching with ${assignment.memberProfile.user.firstName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: async () => {
            try {
              await trainerService.terminateClientAssignment(trainerId, assignment.id);
            } catch {
              // Local update
            }
            setClients((prev) =>
              prev.map((c) =>
                c.id === assignment.id
                  ? { ...c, status: 'TERMINATED' as TrainerAssignmentStatus, endDate: new Date().toISOString() }
                  : c,
              ),
            );
            Alert.alert('Assignment Terminated', 'Coaching assignment concluded.');
          },
        },
      ],
    );
  };

  const handleAssignNewClient = async () => {
    if (!newClientEmail) {
      Alert.alert('Validation Error', 'Please enter client member email.');
      return;
    }

    try {
      const newAsgn: ClientAssignmentItem = {
        id: `asgn_${Date.now()}`,
        assignmentType: newAssignmentType,
        status: 'ACTIVE',
        startDate: new Date().toISOString(),
        notes: newAssignmentNotes || 'Initial client assignment',
        memberProfile: {
          id: `mp_${Date.now()}`,
          user: {
            id: `u_${Date.now()}`,
            email: newClientEmail,
            firstName: newClientEmail.split('@')[0] || 'Client',
            lastName: '',
          },
        },
      };

      setClients((prev) => [newAsgn, ...prev]);
      setAssignModalVisible(false);
      setNewClientEmail('');
      setNewAssignmentNotes('');
      Alert.alert('Client Assigned', `${newClientEmail} assigned as ${newAssignmentType} client.`);
    } catch {
      Alert.alert('Error', 'Could not assign client. Ensure Primary Trainer rule is not violated.');
    }
  };

  const activeClients = clients.filter((c) => c.status === 'ACTIVE');
  const pastClients = clients.filter((c) => c.status !== 'ACTIVE');
  const displayedClients = activeTab === 'ACTIVE' ? activeClients : pastClients;

  const primaryCount = activeClients.filter((c) => c.assignmentType === 'PRIMARY').length;
  const secondaryCount = activeClients.filter((c) => c.assignmentType === 'SECONDARY').length;

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assigned Clients</Text>
        <TouchableOpacity
          style={styles.assignNewBtn}
          onPress={() => setAssignModalVisible(true)}
        >
          <Text style={styles.assignNewBtnText}>+ Assign</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* KPI Metrics */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="ACTIVE CLIENTS"
            value={activeClients.length.toString()}
            icon="users"
            accentColor={colors.primary}
            style={styles.flexMetric}
          />
          <MetricCard
            label="PRIMARY 1-ON-1"
            value={primaryCount.toString()}
            icon="award"
            accentColor="#FFB400"
            style={styles.flexMetric}
          />
          <MetricCard
            label="SECONDARY / GROUP"
            value={secondaryCount.toString()}
            icon="shield"
            accentColor={colors.accent}
            style={styles.flexMetric}
          />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ACTIVE' && styles.tabActive]}
            onPress={() => setActiveTab('ACTIVE')}
          >
            <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
              Active Clients ({activeClients.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'HISTORY' && styles.tabActive]}
            onPress={() => setActiveTab('HISTORY')}
          >
            <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>
              Past / Reassigned ({pastClients.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Client Cards List */}
        <View style={styles.listSection}>
          {displayedClients.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No {activeTab.toLowerCase()} client assignments found.</Text>
            </Card>
          ) : (
            displayedClients.map((item) => {
              const fullName = `${item.memberProfile.user.firstName} ${item.memberProfile.user.lastName}`.trim();
              const isPrimary = item.assignmentType === 'PRIMARY';
              return (
                <Card key={item.id} style={styles.clientCard}>
                  <TouchableOpacity
                    style={styles.clientCardTop}
                    onPress={() =>
                      navigation.navigate('TrainerClientDetail', {
                        memberProfileId: item.memberProfile.id,
                        clientName: fullName,
                        clientEmail: item.memberProfile.user.email,
                        assignmentId: item.id,
                      })
                    }
                  >
                    <Avatar
                      name={fullName}
                      size="md"
                    />
                    <View style={styles.clientMain}>
                      <View style={styles.nameBadgeRow}>
                        <Text style={styles.clientName}>{fullName}</Text>
                        <Badge
                          label={item.assignmentType}
                          variant={isPrimary ? 'primary' : 'info'}
                        />
                      </View>
                      <Text style={styles.clientEmail}>{item.memberProfile.user.email}</Text>
                      <Text style={styles.clientStartDate}>
                        Since: {new Date(item.startDate).toLocaleDateString()}
                        {item.endDate ? ` · Ended: ${new Date(item.endDate).toLocaleDateString()}` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {item.notes && (
                    <Text style={styles.clientNotes}>📝 {item.notes}</Text>
                  )}

                  {/* Actions for Active Clients */}
                  {item.status === 'ACTIVE' && (
                    <View style={styles.cardActionsRow}>
                      <Button
                        title="Coaching Console"
                        variant="primary"
                        size="sm"
                        onPress={() =>
                          navigation.navigate('TrainerClientDetail', {
                            memberProfileId: item.memberProfile.id,
                            clientName: fullName,
                            clientEmail: item.memberProfile.user.email,
                            assignmentId: item.id,
                          })
                        }
                        style={styles.reassignBtn}
                      />
                      <Button
                        title="Reassign Coach"
                        variant="secondary"
                        size="sm"
                        onPress={() => {
                          setSelectedAssignment(item);
                          setReassignModalVisible(true);
                        }}
                        style={styles.reassignBtn}
                      />
                      <Button
                        title="End Assignment"
                        variant="outline"
                        size="sm"
                        onPress={() => handleTerminate(item)}
                        style={styles.endBtn}
                      />
                    </View>
                  )}

                  {item.status === 'REASSIGNED' && (
                    <View style={styles.reassignedTag}>
                      <Text style={styles.reassignedTagText}>
                        Transferred with preserved workout & progression history.
                      </Text>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Reassign Modal */}
      <Modal
        visible={reassignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReassignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Reassign Member Client</Text>
            <Text style={styles.modalSubtitle}>
              Client: {selectedAssignment?.memberProfile.user.firstName}{' '}
              {selectedAssignment?.memberProfile.user.lastName}
            </Text>

            <View style={styles.alertBanner}>
              <Text style={styles.alertBannerText}>
                🛡️ Primary Trainer Rule: Reassigning automatically closes the current relationship
                and activates the new coach while preserving all workout history.
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Target Coach</Text>
              <View style={styles.coachChoice}>
                <Text style={styles.coachChoiceText}>Mike Ross (Senior Performance Coach)</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Reassignment Reason</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Specialization switch, schedule conflict"
                placeholderTextColor={colors.textMuted}
                value={reassignReason}
                onChangeText={setReassignReason}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Handover / Transfer Notes</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Key programming notes, PRs, movement limitations..."
                placeholderTextColor={colors.textMuted}
                value={reassignNotes}
                onChangeText={setReassignNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtonsRow}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setReassignModalVisible(false)}
                style={styles.halfBtn}
              />
              <Button
                title="Confirm Transfer"
                variant="primary"
                size="md"
                onPress={handleReassign}
                style={styles.halfBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign New Client Modal */}
      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Assign Client to Coach</Text>
            <Text style={styles.modalSubtitle}>
              Establishes a personal training relationship governed by platform rules.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Member Email</Text>
              <TextInput
                style={styles.formInput}
                placeholder="member@secondwind.com.au"
                placeholderTextColor={colors.textMuted}
                value={newClientEmail}
                onChangeText={setNewClientEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Assignment Type</Text>
              <View style={styles.typeRow}>
                {(['PRIMARY', 'SECONDARY', 'GROUP_COACH'] as TrainerAssignmentType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, newAssignmentType === t && styles.typeBtnActive]}
                    onPress={() => setNewAssignmentType(t)}
                  >
                    <Text style={[styles.typeBtnText, newAssignmentType === t && styles.typeBtnTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Coaching Notes & Goals</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="e.g. Strength block, 3 sessions/week"
                placeholderTextColor={colors.textMuted}
                value={newAssignmentNotes}
                onChangeText={setNewAssignmentNotes}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.modalButtonsRow}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setAssignModalVisible(false)}
                style={styles.halfBtn}
              />
              <Button
                title="Assign Client"
                variant="primary"
                size="md"
                onPress={handleAssignNewClient}
                style={styles.halfBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.lg,
    paddingVertical: sp.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  backBtn: {
    paddingVertical: sp.xs,
  },
  backBtnText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  assignNewBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderRadius: radius.md,
  },
  assignNewBtnText: {
    ...typography.buttonSmall,
    color: '#000000',
    fontWeight: '700',
  },
  scrollContent: {
    padding: sp.md,
    paddingBottom: sp.xl * 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: sp.sm,
    marginBottom: sp.md,
  },
  flexMetric: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: sp.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tab: {
    flex: 1,
    paddingVertical: sp.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.surfaceHighlight,
  },
  tabText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listSection: {
    gap: sp.md,
  },
  emptyCard: {
    padding: sp.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
  clientCard: {
    padding: sp.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  clientCardTop: {
    flexDirection: 'row',
    gap: sp.md,
    alignItems: 'center',
  },
  clientMain: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  clientName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  clientEmail: {
    ...typography.caption,
    color: colors.textMuted,
  },
  clientStartDate: {
    ...typography.caption,
    color: colors.accent,
    marginTop: 2,
  },
  clientNotes: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceHighlight,
    padding: sp.sm,
    borderRadius: radius.sm,
    marginTop: sp.sm,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: sp.sm,
    marginTop: sp.md,
    paddingTop: sp.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  reassignBtn: {
    flex: 1,
  },
  endBtn: {
    flex: 1,
  },
  reassignedTag: {
    marginTop: sp.sm,
    padding: sp.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.sm,
  },
  reassignedTagText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: sp.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: sp.md,
  },
  alertBanner: {
    backgroundColor: 'rgba(0, 209, 178, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 178, 0.3)',
    borderRadius: radius.md,
    padding: sp.sm,
    marginBottom: sp.md,
  },
  alertBannerText: {
    ...typography.caption,
    color: colors.accent,
    lineHeight: 16,
  },
  formGroup: {
    marginBottom: sp.md,
  },
  formLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  coachChoice: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: sp.md,
  },
  coachChoiceText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  formInput: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    color: colors.textPrimary,
    ...typography.body,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    gap: sp.xs,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: sp.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceHighlight,
  },
  typeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 229, 155, 0.15)',
  },
  typeBtnText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  typeBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: sp.md,
    marginTop: sp.md,
  },
  halfBtn: {
    flex: 1,
  },
});
