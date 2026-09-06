import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ReceptionStackParamList } from '../../../navigation/types';
import { Screen, Card, Badge, Button, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  useSessionRoster,
  useCheckInMutation,
  useCheckOutMutation,
  useRecordWalkInMutation,
  useCorrectAttendanceMutation,
  useSubstituteTrainerMutation,
  useProcessNoShowsMutation,
  useTrainerCheckInMutation,
  useTrainerCheckOutMutation,
} from '../../attendance/hooks/useAttendance';
import type { RosterItem } from '../../attendance/types';

type RouteProps = RouteProp<ReceptionStackParamList, 'ClassRoster'>;
type NavigationProp = NativeStackNavigationProp<ReceptionStackParamList>;

export const ClassRosterScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const classSessionId = route.params.classId;

  const { data, isLoading, refetch } = useSessionRoster(classSessionId);

  const checkInMutation = useCheckInMutation();
  const checkOutMutation = useCheckOutMutation();
  const walkInMutation = useRecordWalkInMutation();
  const correctMutation = useCorrectAttendanceMutation();
  const substituteTrainerMutation = useSubstituteTrainerMutation();
  const processNoShowsMutation = useProcessNoShowsMutation();
  const trainerCheckInMutation = useTrainerCheckInMutation();
  const trainerCheckOutMutation = useTrainerCheckOutMutation();

  const [activeTab, setActiveTab] = useState<'ALL' | 'CHECKED_IN' | 'RESERVED' | 'WAITLIST'>('ALL');

  // Modals state
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInMemberId, setWalkInMemberId] = useState('');
  const [walkInOverride, setWalkInOverride] = useState(false);
  const [walkInReason, setWalkInReason] = useState('');

  const [showSubTrainerModal, setShowSubTrainerModal] = useState(false);
  const [subTrainerId, setSubTrainerId] = useState('');
  const [subTrainerReason, setSubTrainerReason] = useState('');

  const [showCorrectModal, setShowCorrectModal] = useState(false);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string | null>(null);
  const [correctStatus, setCorrectStatus] = useState('EXCUSED');
  const [correctReason, setCorrectReason] = useState('');

  if (isLoading || !data) {
    return (
      <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.accent} />
          <Text style={styles.loadingText}>Loading operational roster...</Text>
        </View>
      </Screen>
    );
  }

  const { session, summary, roster = [], waitlist = [] } = data;

  const startsAt = new Date(session.startsAt);
  const endsAt = new Date(session.endsAt);

  // Quick action: one-tap check-in for reserved member
  const handleQuickCheckIn = async (item: RosterItem) => {
    try {
      await checkInMutation.mutateAsync({
        sessionId: classSessionId,
        payload: {
          memberProfileId: item.memberProfileId,
          method: 'STAFF',
          allowWindowOverride: true,
        },
      });
      Alert.alert('Checked In', `${item.memberName} checked in successfully.`);
    } catch (err: any) {
      Alert.alert('Check-In Failed', err.message || 'Unable to check in member.');
    }
  };

  // Quick action: check out attendee
  const handleQuickCheckOut = async (item: RosterItem) => {
    try {
      await checkOutMutation.mutateAsync({
        sessionId: classSessionId,
        payload: {
          memberProfileId: item.memberProfileId,
          method: 'STAFF',
        },
      });
      Alert.alert('Checked Out', `${item.memberName} checked out successfully.`);
    } catch (err: any) {
      Alert.alert('Check-Out Failed', err.message || 'Unable to check out member.');
    }
  };

  // Handle Walk-In Submit
  const handleRecordWalkIn = async () => {
    if (!walkInMemberId.trim()) {
      Alert.alert('Validation Error', 'Member Profile ID is required.');
      return;
    }
    if (walkInOverride && !walkInReason.trim()) {
      Alert.alert('Validation Error', 'Override reason is required when overriding capacity.');
      return;
    }

    try {
      await walkInMutation.mutateAsync({
        sessionId: classSessionId,
        payload: {
          memberProfileId: walkInMemberId.trim(),
          allowCapacityOverride: walkInOverride,
          overrideReason: walkInReason.trim() || undefined,
        },
      });
      setShowWalkInModal(false);
      setWalkInMemberId('');
      setWalkInOverride(false);
      setWalkInReason('');
      Alert.alert('Walk-In Admitted', 'Member walk-in attendance recorded.');
    } catch (err: any) {
      Alert.alert('Admission Error', err.message || 'Unable to admit walk-in member.');
    }
  };

  // Handle Trainer Substitution
  const handleSubstituteTrainer = async () => {
    if (!subTrainerId.trim() || !subTrainerReason.trim()) {
      Alert.alert('Validation Error', 'Trainer ID and substitution reason are required.');
      return;
    }

    try {
      await substituteTrainerMutation.mutateAsync({
        sessionId: classSessionId,
        payload: {
          substituteTrainerId: subTrainerId.trim(),
          reason: subTrainerReason.trim(),
        },
      });
      setShowSubTrainerModal(false);
      setSubTrainerId('');
      setSubTrainerReason('');
      Alert.alert('Trainer Substituted', 'Substitute trainer assigned to this session.');
    } catch (err: any) {
      Alert.alert('Substitution Error', err.message || 'Unable to substitute trainer.');
    }
  };

  // Handle Attendance Correction
  const handleCorrectAttendance = async () => {
    if (!selectedAttendanceId || !correctReason.trim()) {
      Alert.alert('Validation Error', 'Mandatory correction reason is required.');
      return;
    }

    try {
      await correctMutation.mutateAsync({
        attendanceId: selectedAttendanceId,
        sessionId: classSessionId,
        payload: {
          status: correctStatus,
          reason: correctReason.trim(),
        },
      });
      setShowCorrectModal(false);
      setSelectedAttendanceId(null);
      setCorrectReason('');
      Alert.alert('Corrected', 'Attendance status corrected with audit trail.');
    } catch (err: any) {
      Alert.alert('Correction Error', err.message || 'Unable to correct attendance.');
    }
  };

  // Handle Process No-Shows
  const handleProcessNoShows = async () => {
    Alert.alert(
      'Process No-Shows',
      'This will automatically mark all unattended confirmed bookings as NO_SHOW.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process Now',
          onPress: async () => {
            try {
              const res = await processNoShowsMutation.mutateAsync({
                sessionId: classSessionId,
                gracePeriodMinutes: 15,
              });
              Alert.alert(
                'No-Shows Processed',
                `Processed ${res.processedCount || 0} no-shows (${res.skippedCount || 0} skipped).`,
              );
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to process no-shows.');
            }
          },
        },
      ],
    );
  };

  // Handle Trainer Check-In / Check-Out
  const handleTrainerToggle = async () => {
    const isTrainerCheckedIn = !!session.trainerCheckedInAt;
    try {
      if (!isTrainerCheckedIn) {
        await trainerCheckInMutation.mutateAsync(classSessionId);
        Alert.alert('Trainer Checked In', 'Instructor arrival recorded.');
      } else {
        await trainerCheckOutMutation.mutateAsync(classSessionId);
        Alert.alert('Trainer Checked Out', 'Instructor departure recorded.');
      }
    } catch (err: any) {
      Alert.alert('Trainer Action Error', err.message || 'Failed to update trainer status.');
    }
  };

  // Filtered Roster Items
  const filteredItems = roster.filter((item) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'CHECKED_IN') return ['CHECKED_IN', 'LATE', 'COMPLETED'].includes(item.status);
    if (activeTab === 'RESERVED') return item.status === 'RESERVED';
    return true;
  });

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            testID="back-button"
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Icon name="chevron-left" size={24} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{session.classType?.name || 'Class Roster'}</Text>
            <Text style={styles.headerSubtitle}>
              {startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
              {endsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
              {session.resource?.name || 'Studio'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
            <Icon name="refresh" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Live Operational KPI Cards */}
        <View style={styles.kpiGrid}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>OCCUPANCY</Text>
            <Text style={styles.kpiValue}>
              {summary.totalOccupied}/{summary.capacity}
            </Text>
            <Text style={styles.kpiSub}>{summary.bookedUtilisation}% Booked</Text>
          </Card>

          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>CHECKED IN</Text>
            <Text style={[styles.kpiValue, { color: themeColors.success }]}>
              {summary.checkedInCount}
            </Text>
            <Text style={styles.kpiSub}>{summary.actualUtilisation}% Actual</Text>
          </Card>

          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>WAITLIST</Text>
            <Text style={[styles.kpiValue, { color: themeColors.warning }]}>
              {summary.waitlistCount}
            </Text>
            <Text style={styles.kpiSub}>{summary.spotsRemaining} spots left</Text>
          </Card>

          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>WALK-INS</Text>
            <Text style={[styles.kpiValue, { color: themeColors.accent }]}>
              {summary.walkInsCount}
            </Text>
            <Text style={styles.kpiSub}>{summary.noShowCount} No-Shows</Text>
          </Card>
        </View>

        {/* Instructor Status Bar */}
        <Card style={styles.trainerCard}>
          <View style={styles.trainerInfo}>
            <Icon name="user" size={20} color={themeColors.accent} />
            <View style={{ flex: 1, marginLeft: spacing[2] }}>
              <Text style={styles.trainerName}>
                Trainer:{' '}
                {session.substituteTrainer
                  ? `${session.substituteTrainer.firstName} ${session.substituteTrainer.lastName} (Substitute)`
                  : session.trainer
                    ? `${session.trainer.firstName} ${session.trainer.lastName}`
                    : 'Unassigned'}
              </Text>
              <Text style={styles.trainerStatus}>
                Status: {session.trainerAttendanceStatus || 'PENDING'}
                {session.trainerCheckedInAt
                  ? ` (Checked in at ${new Date(session.trainerCheckedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                  : ''}
              </Text>
            </View>
          </View>
          <View style={styles.trainerActions}>
            <Button
              title={session.trainerCheckedInAt ? 'Trainer Check-Out' : 'Trainer Check-In'}
              variant="secondary"
              onPress={handleTrainerToggle}
              style={styles.trainerBtn}
            />
            <Button
              title="Substitute"
              variant="outline"
              onPress={() => setShowSubTrainerModal(true)}
              style={styles.trainerBtn}
            />
          </View>
        </Card>

        {/* Operational Toolbar */}
        <View style={styles.toolbar}>
          <Button
            testID="admit-walkin-button"
            title="+ Admit Walk-In"
            variant="primary"
            onPress={() => setShowWalkInModal(true)}
            style={styles.toolBtn}
          />
          <Button
            testID="process-noshows-button"
            title="Process No-Shows"
            variant="secondary"
            onPress={handleProcessNoShows}
            style={styles.toolBtn}
          />
        </View>

        {/* Roster Tabs */}
        <View style={styles.tabBar}>
          {(['ALL', 'CHECKED_IN', 'RESERVED', 'WAITLIST'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            >
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {tab === 'ALL'
                  ? `All (${roster.length})`
                  : tab === 'CHECKED_IN'
                    ? `Checked In (${summary.checkedInCount})`
                    : tab === 'RESERVED'
                      ? `Reserved (${summary.confirmedBookingsCount})`
                      : `Waitlist (${summary.waitlistCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Waitlist View */}
        {activeTab === 'WAITLIST' ? (
          waitlist.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No members on the waitlist.</Text>
            </View>
          ) : (
            waitlist.map((w: any, idx: number) => (
              <Card key={w.bookingId || idx} style={styles.rosterCard}>
                <View style={styles.rosterHeader}>
                  <View>
                    <Text style={styles.memberName}>{w.memberName}</Text>
                    <Text style={styles.memberContact}>{w.email || w.phone}</Text>
                  </View>
                  <Badge label={`WAITLIST #${w.waitlistPosition || idx + 1}`} variant="warning" />
                </View>
              </Card>
            ))
          )
        ) : (
          /* Main Roster Items */
          filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No attendees matching this filter.</Text>
            </View>
          ) : (
            filteredItems.map((item, idx) => {
              const isCheckedIn = ['CHECKED_IN', 'LATE', 'COMPLETED'].includes(item.status);
              const isReserved = item.status === 'RESERVED';
              const isNoShow = item.status === 'NO_SHOW';

              return (
                <Card key={item.memberProfileId || idx} style={styles.rosterCard}>
                  <View style={styles.rosterHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.memberName}>{item.memberName}</Text>
                        {item.isWalkIn && <Badge label="WALK-IN" variant="accent" />}
                        {item.isOverride && <Badge label="OVERRIDE" variant="neutral" />}
                      </View>
                      <Text style={styles.memberContact}>{item.email || item.phone}</Text>
                    </View>

                    <Badge
                      label={
                        item.status === 'LATE'
                          ? `LATE (+${item.lateMinutes}m)`
                          : item.status
                      }
                      variant={
                        isCheckedIn
                          ? 'success'
                          : isReserved
                            ? 'neutral'
                            : isNoShow
                              ? 'danger'
                              : 'warning'
                      }
                    />
                  </View>

                  <View style={styles.rosterMeta}>
                    {item.checkedInAt && (
                      <Text style={styles.metaText}>
                        Checked In:{' '}
                        {new Date(item.checkedInAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        ({item.checkInMethod || 'STAFF'})
                      </Text>
                    )}
                    {item.overrideReason && (
                      <Text style={[styles.metaText, { color: themeColors.warning }]}>
                        Reason: {item.overrideReason}
                      </Text>
                    )}
                  </View>

                  <View style={styles.rosterActions}>
                    {isReserved && (
                      <Button
                        testID={`checkin-btn-${idx}`}
                        title="Check In"
                        variant="primary"
                        onPress={() => handleQuickCheckIn(item)}
                        style={styles.actionBtnSmall}
                      />
                    )}

                    {isCheckedIn && (
                      <Button
                        title="Check Out"
                        variant="secondary"
                        onPress={() => handleQuickCheckOut(item)}
                        style={styles.actionBtnSmall}
                      />
                    )}

                    {item.attendanceId && (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedAttendanceId(item.attendanceId!);
                          setShowCorrectModal(true);
                        }}
                        style={styles.correctBtn}
                      >
                        <Text style={styles.correctBtnText}>Correct</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Card>
              );
            })
          )
        )}

        {/* Walk-In Admission Modal */}
        <Modal
          visible={showWalkInModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowWalkInModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text style={styles.modalTitle}>Admit Walk-In Member</Text>
              <Text style={styles.modalSubtitle}>
                Capacity: {summary.totalOccupied}/{summary.capacity} ({summary.spotsRemaining} spots left)
              </Text>

              <Text style={styles.inputLabel}>Member Profile ID</Text>
              <TextInput
                testID="walkin-member-id-input"
                style={styles.modalInput}
                placeholder="Enter memberProfileId..."
                placeholderTextColor={themeColors.textSecondary}
                value={walkInMemberId}
                onChangeText={setWalkInMemberId}
              />

              {summary.spotsRemaining <= 0 && (
                <View style={styles.warningBox}>
                  <Icon name="alert-circle" size={16} color={themeColors.warning} />
                  <Text style={styles.warningBoxText}>
                    Class is full! Staff capacity override is required to admit.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => setWalkInOverride(!walkInOverride)}
                style={styles.checkboxRow}
              >
                <View style={[styles.checkbox, walkInOverride && styles.checkboxChecked]}>
                  {walkInOverride && <Icon name="check" size={14} color={themeColors.background} />}
                </View>
                <Text style={styles.checkboxLabel}>Staff Capacity Override</Text>
              </TouchableOpacity>

              {walkInOverride && (
                <>
                  <Text style={styles.inputLabel}>Override Reason (Mandatory)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. VIP Member admitted with trainer approval..."
                    placeholderTextColor={themeColors.textSecondary}
                    value={walkInReason}
                    onChangeText={setWalkInReason}
                  />
                </>
              )}

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowWalkInModal(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  testID="confirm-walkin-btn"
                  title="Admit Member"
                  variant="primary"
                  onPress={handleRecordWalkIn}
                  disabled={walkInMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </View>
        </Modal>

        {/* Substitute Trainer Modal */}
        <Modal
          visible={showSubTrainerModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSubTrainerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text style={styles.modalTitle}>Substitute Trainer</Text>
              <Text style={styles.modalSubtitle}>
                Assigns substitute for this individual session instance without altering recurring schedule.
              </Text>

              <Text style={styles.inputLabel}>Substitute Trainer User ID</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter trainer userId..."
                placeholderTextColor={themeColors.textSecondary}
                value={subTrainerId}
                onChangeText={setSubTrainerId}
              />

              <Text style={styles.inputLabel}>Substitution Reason (Mandatory)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Assigned coach unwell, approved swap..."
                placeholderTextColor={themeColors.textSecondary}
                value={subTrainerReason}
                onChangeText={setSubTrainerReason}
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowSubTrainerModal(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Substitute"
                  variant="primary"
                  onPress={handleSubstituteTrainer}
                  disabled={substituteTrainerMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </View>
        </Modal>

        {/* Correct Attendance Modal */}
        <Modal
          visible={showCorrectModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCorrectModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text style={styles.modalTitle}>Correct Attendance Status</Text>
              <Text style={styles.modalSubtitle}>
                Update attendance record with audit trail justification.
              </Text>

              <Text style={styles.inputLabel}>New Status</Text>
              <View style={styles.statusChips}>
                {(['EXCUSED', 'CHECKED_IN', 'LATE', 'NO_SHOW', 'COMPLETED'] as const).map(
                  (st) => (
                    <TouchableOpacity
                      key={st}
                      onPress={() => setCorrectStatus(st)}
                      style={[
                        styles.chip,
                        correctStatus === st && styles.chipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          correctStatus === st && styles.chipTextActive,
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>

              <Text style={styles.inputLabel}>Correction Justification (Mandatory)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Member arrived on time but scanner was offline..."
                placeholderTextColor={themeColors.textSecondary}
                value={correctReason}
                onChangeText={setCorrectReason}
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowCorrectModal(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Confirm Correction"
                  variant="primary"
                  onPress={handleCorrectAttendance}
                  disabled={correctMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </View>
        </Modal>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    paddingBottom: spacing[12],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: themeColors.textSecondary,
    marginTop: spacing[4],
    ...typography.body2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: themeColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  headerTitle: {
    color: themeColors.textPrimary,
    ...typography.h3,
  },
  headerSubtitle: {
    color: themeColors.textSecondary,
    ...typography.caption,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: themeColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  kpiCard: {
    width: '48%',
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  kpiLabel: {
    color: themeColors.textSecondary,
    ...typography.caption,
    letterSpacing: 0.5,
  },
  kpiValue: {
    color: themeColors.textPrimary,
    ...typography.h2,
    marginVertical: 2,
  },
  kpiSub: {
    color: themeColors.textSecondary,
    ...typography.caption,
  },
  trainerCard: {
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: spacing[4],
  },
  trainerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  trainerName: {
    color: themeColors.textPrimary,
    ...typography.body1,
    fontWeight: '600',
  },
  trainerStatus: {
    color: themeColors.textSecondary,
    ...typography.caption,
    marginTop: 2,
  },
  trainerActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  trainerBtn: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  toolBtn: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: spacing[4],
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: spacing[1],
    alignItems: 'center',
    borderRadius: radius.md,
  },
  tabItemActive: {
    backgroundColor: themeColors.accent,
  },
  tabLabel: {
    color: themeColors.textSecondary,
    ...typography.caption,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: themeColors.background,
  },
  emptyState: {
    padding: spacing[8],
    alignItems: 'center',
  },
  emptyText: {
    color: themeColors.textSecondary,
    ...typography.body2,
  },
  rosterCard: {
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: spacing[2],
  },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  memberName: {
    color: themeColors.textPrimary,
    ...typography.body1,
    fontWeight: '600',
  },
  memberContact: {
    color: themeColors.textSecondary,
    ...typography.caption,
    marginTop: 2,
  },
  rosterMeta: {
    marginTop: spacing[1],
  },
  metaText: {
    color: themeColors.textSecondary,
    ...typography.caption,
  },
  rosterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  actionBtnSmall: {
    paddingVertical: 6,
    paddingHorizontal: spacing[3],
  },
  correctBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing[2],
  },
  correctBtnText: {
    color: themeColors.accent,
    ...typography.caption,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing[5],
  },
  modalCard: {
    padding: spacing[5],
    borderRadius: radius.xl,
    backgroundColor: themeColors.modalBackground,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  modalTitle: {
    color: themeColors.textPrimary,
    ...typography.h3,
  },
  modalSubtitle: {
    color: themeColors.textSecondary,
    ...typography.body2,
    marginTop: 4,
    marginBottom: spacing[4],
  },
  inputLabel: {
    color: themeColors.textSecondary,
    ...typography.caption,
    letterSpacing: 0.5,
    marginTop: spacing[2],
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: themeColors.inputBackground,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
    borderRadius: radius.md,
    padding: spacing[3],
    color: themeColors.textPrimary,
    ...typography.body2,
    marginBottom: spacing[3],
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: spacing[3],
    borderRadius: radius.md,
    marginBottom: spacing[3],
  },
  warningBoxText: {
    color: themeColors.warning,
    ...typography.caption,
    flex: 1,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[2],
    gap: spacing[2],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: themeColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: themeColors.accent,
    borderColor: themeColors.accent,
  },
  checkboxLabel: {
    color: themeColors.textPrimary,
    ...typography.body2,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.inputBackground,
  },
  chipActive: {
    backgroundColor: themeColors.accent,
    borderColor: themeColors.accent,
  },
  chipText: {
    color: themeColors.textSecondary,
    ...typography.caption,
    fontWeight: '600',
  },
  chipTextActive: {
    color: themeColors.background,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
});
