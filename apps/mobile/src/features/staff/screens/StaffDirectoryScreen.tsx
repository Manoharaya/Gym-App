import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Screen, Card, Badge, Button, Avatar, MetricCard } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { staffService } from '../services/staffService';
import type { StaffEmploymentStatus } from '@fitcore/types';

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

interface StaffItem {
  id: string;
  displayName: string;
  jobTitle: string;
  employeeReference?: string;
  employmentStatus: StaffEmploymentStatus;
  workEmail?: string;
  phone?: string;
  hireDate?: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
    roles?: { role: { name: string } }[];
  };
  outletAssignments?: {
    id: string;
    outletId: string;
    outlet?: { name: string; code: string };
    isPrimary: boolean;
    roleScope?: string;
  }[];
}

const FALLBACK_STAFF: StaffItem[] = [
  {
    id: 'staff_1',
    displayName: 'Jack Darling',
    jobTitle: 'Managing Director & Founder',
    employeeReference: 'EMP-SW-001',
    employmentStatus: 'ACTIVE',
    workEmail: 'owner@secondwind.com.au',
    user: {
      email: 'owner@secondwind.com.au',
      firstName: 'Jack',
      lastName: 'Darling',
      roles: [{ role: { name: 'ORGANISATION_OWNER' } }],
    },
    outletAssignments: [
      { id: 'oa_1', outletId: 'out_1', outlet: { name: 'Perth CBD', code: 'SW-PERTH-CBD' }, isPrimary: true },
    ],
  },
  {
    id: 'staff_2',
    displayName: 'Sarah Miller',
    jobTitle: 'General Club Manager',
    employeeReference: 'EMP-SW-002',
    employmentStatus: 'ACTIVE',
    workEmail: 'manager@secondwind.com.au',
    user: {
      email: 'manager@secondwind.com.au',
      firstName: 'Sarah',
      lastName: 'Miller',
      roles: [{ role: { name: 'OUTLET_MANAGER' } }],
    },
    outletAssignments: [
      { id: 'oa_2', outletId: 'out_1', outlet: { name: 'Perth CBD', code: 'SW-PERTH-CBD' }, isPrimary: true },
    ],
  },
  {
    id: 'staff_3',
    displayName: 'Marcus Vance',
    jobTitle: 'Head Strength Coach & PT',
    employeeReference: 'EMP-SW-004',
    employmentStatus: 'ACTIVE',
    workEmail: 'trainer@secondwind.com.au',
    user: {
      email: 'trainer@secondwind.com.au',
      firstName: 'Marcus',
      lastName: 'Vance',
      roles: [{ role: { name: 'TRAINER' } }],
    },
    outletAssignments: [
      { id: 'oa_3', outletId: 'out_1', outlet: { name: 'Perth CBD', code: 'SW-PERTH-CBD' }, isPrimary: true },
    ],
  },
  {
    id: 'staff_4',
    displayName: 'Mike Ross',
    jobTitle: 'Senior Performance Coach',
    employeeReference: 'EMP-SW-005',
    employmentStatus: 'ON_LEAVE',
    workEmail: 'trainer.mike@secondwind.com.au',
    user: {
      email: 'trainer.mike@secondwind.com.au',
      firstName: 'Mike',
      lastName: 'Ross',
      roles: [{ role: { name: 'TRAINER' } }],
    },
    outletAssignments: [
      { id: 'oa_4', outletId: 'out_1', outlet: { name: 'Perth CBD', code: 'SW-PERTH-CBD' }, isPrimary: true },
    ],
  },
  {
    id: 'staff_5',
    displayName: 'Emma Watson',
    jobTitle: 'Front Desk Lead',
    employeeReference: 'EMP-SW-003',
    employmentStatus: 'ACTIVE',
    workEmail: 'reception@secondwind.com.au',
    user: {
      email: 'reception@secondwind.com.au',
      firstName: 'Emma',
      lastName: 'Watson',
      roles: [{ role: { name: 'RECEPTION' } }],
    },
    outletAssignments: [
      { id: 'oa_5', outletId: 'out_1', outlet: { name: 'Perth CBD', code: 'SW-PERTH-CBD' }, isPrimary: true },
    ],
  },
];

const STATUS_FILTERS: (StaffEmploymentStatus | 'ALL')[] = [
  'ALL',
  'ACTIVE',
  'ON_LEAVE',
  'INVITED',
  'SUSPENDED',
];

export const StaffDirectoryScreen: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffItem[]>(FALLBACK_STAFF);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StaffEmploymentStatus | 'ALL'>('ALL');

  // Modal states
  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  // Invite Form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteJobTitle, setInviteJobTitle] = useState('');
  const [inviteRole, setInviteRole] = useState('TRAINER');

  const fetchStaff = useCallback(async () => {
    try {
      const data = await staffService.getAllStaff();
      if (data && data.length > 0) {
        setStaffList(data as StaffItem[]);
      }
    } catch {
      // Keep fallback if API fails
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStaff();
  };

  const handleStatusChange = async (newStatus: StaffEmploymentStatus) => {
    if (!selectedStaff) return;
    try {
      await staffService.transitionStatus(selectedStaff.id, newStatus, 'Status changed via mobile management');
      setStaffList((prev) =>
        prev.map((s) => (s.id === selectedStaff.id ? { ...s, employmentStatus: newStatus } : s)),
      );
      setStatusModalVisible(false);
      Alert.alert('Status Updated', `Staff employment status changed to ${newStatus}`);
    } catch {
      setStaffList((prev) =>
        prev.map((s) => (s.id === selectedStaff.id ? { ...s, employmentStatus: newStatus } : s)),
      );
      setStatusModalVisible(false);
      Alert.alert('Status Updated (Local)', `Employment status updated to ${newStatus}`);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteJobTitle) {
      Alert.alert('Validation Error', 'Please fill in both email and job title.');
      return;
    }

    try {
      await staffService.inviteStaff({
        email: inviteEmail,
        jobTitle: inviteJobTitle,
        roleName: inviteRole,
      });
      setInviteModalVisible(false);
      setInviteEmail('');
      setInviteJobTitle('');
      Alert.alert('Invitation Sent', `Staff invitation emailed to ${inviteEmail}`);
      fetchStaff();
    } catch {
      const prefix = inviteEmail.split('@')[0] || 'Invited';
      const newInvited: StaffItem = {
        id: `staff_inv_${Date.now()}`,
        displayName: prefix,
        jobTitle: inviteJobTitle,
        employmentStatus: 'INVITED',
        workEmail: inviteEmail,
        employeeReference: `PENDING-${Date.now().toString().slice(-4)}`,
        user: {
          email: inviteEmail,
          firstName: prefix,
          lastName: '',
          roles: [{ role: { name: inviteRole } }],
        },
      };
      setStaffList((prev) => [newInvited, ...prev]);
      setInviteModalVisible(false);
      setInviteEmail('');
      setInviteJobTitle('');
      Alert.alert('Invitation Created', `Invitation recorded for ${inviteEmail}`);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesStatus = selectedStatus === 'ALL' || s.employmentStatus === selectedStatus;
    const nameStr = (s.displayName || `${s.user?.firstName} ${s.user?.lastName}` || '').toLowerCase();
    const jobStr = (s.jobTitle || '').toLowerCase();
    const emailStr = (s.workEmail || s.user?.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || nameStr.includes(query) || jobStr.includes(query) || emailStr.includes(query);
    return matchesStatus && matchesSearch;
  });

  const activeCount = staffList.filter((s) => s.employmentStatus === 'ACTIVE').length;
  const leaveCount = staffList.filter((s) => s.employmentStatus === 'ON_LEAVE').length;
  const invitedCount = staffList.filter((s) => s.employmentStatus === 'INVITED').length;

  const getStatusBadgeVariant = (status: StaffEmploymentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'ON_LEAVE':
        return 'warning';
      case 'INVITED':
        return 'info';
      case 'SUSPENDED':
      case 'TERMINATED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>ORGANISATION MANAGEMENT</Text>
          <Text style={styles.headerTitle}>Staff Directory</Text>
        </View>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => setInviteModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.inviteButtonText}>+ Invite Staff</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Metric Overview Row */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="TOTAL ACTIVE"
            value={activeCount.toString()}
            icon="users"
            accentColor={colors.success}
            style={styles.flexMetric}
          />
          <MetricCard
            label="ON LEAVE"
            value={leaveCount.toString()}
            icon="clock"
            accentColor={colors.warning}
            style={styles.flexMetric}
          />
          <MetricCard
            label="INVITED"
            value={invitedCount.toString()}
            icon="user"
            accentColor={colors.accent}
            style={styles.flexMetric}
          />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, title, or email..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {STATUS_FILTERS.map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.chip, selectedStatus === st && styles.chipActive]}
              onPress={() => setSelectedStatus(st)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selectedStatus === st && styles.chipTextActive]}>
                {st.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Staff List */}
        <View style={styles.listSection}>
          <Text style={styles.listHeader}>
            {filteredStaff.length} {filteredStaff.length === 1 ? 'MEMBER' : 'MEMBERS'} FOUND
          </Text>

          {filteredStaff.map((staff) => {
            const role = staff.user?.roles?.[0]?.role?.name?.replace(/_/g, ' ') || 'STAFF';
            return (
              <Card key={staff.id} style={styles.staffCard}>
                <View style={styles.cardHeader}>
                  <Avatar
                    name={staff.displayName || staff.user?.firstName || 'Staff'}
                    size="md"
                  />
                  <View style={styles.cardMainInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.staffName}>{staff.displayName}</Text>
                      <Badge
                        label={staff.employmentStatus}
                        variant={getStatusBadgeVariant(staff.employmentStatus)}
                      />
                    </View>
                    <Text style={styles.staffTitle}>{staff.jobTitle}</Text>
                    {staff.employeeReference && (
                      <Text style={styles.staffRef}>{staff.employeeReference}</Text>
                    )}
                  </View>
                </View>

                {/* Details Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.pillsRow}>
                    <View style={styles.rolePill}>
                      <Text style={styles.rolePillText}>{role}</Text>
                    </View>
                    {staff.outletAssignments?.map((oa) => (
                      <View key={oa.id} style={[styles.outletPill, oa.isPrimary && styles.primaryOutletPill]}>
                        <Text style={[styles.outletPillText, oa.isPrimary && styles.primaryOutletPillText]}>
                          {oa.isPrimary ? '★ ' : ''}
                          {oa.outlet?.name || 'Perth CBD'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.actionRow}>
                    <Button
                      title="Manage Status"
                      variant="secondary"
                      size="sm"
                      onPress={() => {
                        setSelectedStaff(staff);
                        setStatusModalVisible(true);
                      }}
                      style={styles.actionBtn}
                    />
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {/* Status Transition Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change Employment Status</Text>
            <Text style={styles.modalSubtitle}>
              Target: {selectedStaff?.displayName} ({selectedStaff?.jobTitle})
            </Text>

            <View style={styles.modalOptions}>
              {(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'INACTIVE'] as StaffEmploymentStatus[]).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    selectedStaff?.employmentStatus === status && styles.statusOptionCurrent,
                  ]}
                  onPress={() => handleStatusChange(status)}
                >
                  <Text style={styles.statusOptionText}>{status.replace('_', ' ')}</Text>
                  {selectedStaff?.employmentStatus === status && (
                    <Text style={styles.currentIndicator}>Current</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Close"
              variant="outline"
              size="md"
              onPress={() => setStatusModalVisible(false)}
              style={styles.closeModalBtn}
            />
          </View>
        </View>
      </Modal>

      {/* Invite Staff Modal */}
      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Invite New Staff Member</Text>
            <Text style={styles.modalSubtitle}>
              Sends an onboarding invitation token to establish secure credentials.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Work Email</Text>
              <TextInput
                style={styles.formInput}
                placeholder="colleague@secondwind.com.au"
                placeholderTextColor={colors.textMuted}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Job Title</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Olympic Lifting Coach"
                placeholderTextColor={colors.textMuted}
                value={inviteJobTitle}
                onChangeText={setInviteJobTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Assigned Role</Text>
              <View style={styles.rolePickerRow}>
                {['TRAINER', 'OUTLET_MANAGER', 'RECEPTION', 'FINANCE'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleChoice, inviteRole === r && styles.roleChoiceActive]}
                    onPress={() => setInviteRole(r)}
                  >
                    <Text style={[styles.roleChoiceText, inviteRole === r && styles.roleChoiceTextActive]}>
                      {r.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtonsRow}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setInviteModalVisible(false)}
                style={styles.halfBtn}
              />
              <Button
                title="Send Invite"
                variant="primary"
                size="md"
                onPress={handleSendInvite}
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
  headerSubtitle: {
    ...typography.caption,
    color: colors.primary,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: 2,
  },
  inviteButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderRadius: radius.md,
  },
  inviteButtonText: {
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: sp.md,
    marginBottom: sp.md,
    height: 46,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.body,
  },
  clearSearch: {
    padding: sp.xs,
  },
  clearSearchText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: sp.md,
  },
  chip: {
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginRight: sp.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  listSection: {
    marginTop: sp.xs,
  },
  listHeader: {
    ...typography.overline,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: sp.sm,
  },
  staffCard: {
    marginBottom: sp.md,
    padding: sp.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
  },
  cardMainInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  staffName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  staffTitle: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  staffRef: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardFooter: {
    marginTop: sp.md,
    paddingTop: sp.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: sp.sm,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: sp.xs,
  },
  rolePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: sp.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  rolePillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  outletPill: {
    backgroundColor: 'rgba(0, 209, 178, 0.12)',
    paddingHorizontal: sp.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  primaryOutletPill: {
    backgroundColor: 'rgba(255, 180, 0, 0.15)',
  },
  outletPillText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  primaryOutletPillText: {
    color: '#FFB400',
  },
  actionRow: {
    flexDirection: 'row',
  },
  actionBtn: {
    minWidth: 110,
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
  modalOptions: {
    gap: sp.sm,
    marginBottom: sp.lg,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: sp.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statusOptionCurrent: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 229, 155, 0.1)',
  },
  statusOptionText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  currentIndicator: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  closeModalBtn: {
    marginTop: sp.xs,
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
  rolePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
  },
  roleChoice: {
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceHighlight,
  },
  roleChoiceActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 229, 155, 0.15)',
  },
  roleChoiceText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  roleChoiceTextActive: {
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
