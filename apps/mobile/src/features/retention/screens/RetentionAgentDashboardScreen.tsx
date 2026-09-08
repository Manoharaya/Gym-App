import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { RetentionAgentService } from '../services/retentionAgentService';
import type {
  RetentionOutreachDto,
  RetentionAgentAnalyticsDto,
  RetentionPriorityLevel,
  RetentionOutreachStatus,
} from '@fitcore/types';

export const RetentionAgentDashboardScreen: React.FC = () => {
  const [analytics, setAnalytics] = useState<RetentionAgentAnalyticsDto | null>(null);
  const [outreaches, setOutreaches] = useState<RetentionOutreachDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<RetentionPriorityLevel | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<RetentionOutreachStatus | 'ALL'>('ALL');
  const [editingOutreachId, setEditingOutreachId] = useState<string | null>(null);
  const [editedMessageText, setEditedMessageText] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [analyticsRes, queueRes] = await Promise.all([
        RetentionAgentService.getAnalytics(),
        RetentionAgentService.getQueue({
          priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        }),
      ]);
      setAnalytics(analyticsRes);
      setOutreaches(queueRes.items);
    } catch (err: any) {
      console.warn('Failed loading retention agent data:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [priorityFilter, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = async (outreach: RetentionOutreachDto) => {
    try {
      setSubmittingId(outreach.id);
      const isEdited = editingOutreachId === outreach.id && editedMessageText.trim().length > 0;
      await RetentionAgentService.approveOutreach(outreach.id, {
        editedMessage: isEdited ? editedMessageText : undefined,
      });
      Alert.alert('Approved & Dispatched', 'Outreach submitted to the Communication Engine for delivery.');
      setEditingOutreachId(null);
      setEditedMessageText('');
      loadData();
    } catch (err: any) {
      Alert.alert('Approval Failed', err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (outreach: RetentionOutreachDto) => {
    Alert.prompt
      ? Alert.prompt(
          'Reject Recommendation',
          'Provide a reason for rejecting this AI outreach draft:',
          async (reason) => {
            if (!reason) return;
            try {
              setSubmittingId(outreach.id);
              await RetentionAgentService.rejectOutreach(outreach.id, reason);
              loadData();
            } catch (err: any) {
              Alert.alert('Rejection Failed', err.message);
            } finally {
              setSubmittingId(null);
            }
          },
        )
      : (async () => {
          try {
            setSubmittingId(outreach.id);
            await RetentionAgentService.rejectOutreach(outreach.id, 'Staff dismissed recommendation');
            loadData();
          } catch (err: any) {
            Alert.alert('Rejection Failed', err.message);
          } finally {
            setSubmittingId(null);
          }
        })();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'SENT':
      case 'DELIVERED':
        return '#10B981';
      case 'REENGAGED':
        return '#8B5CF6';
      case 'PENDING_APPROVAL':
        return '#F59E0B';
      case 'REJECTED':
      case 'CANCELLED':
        return '#EF4444';
      default:
        return '#94A3B8';
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.titleRow}>
        <Text style={styles.headerTitle}>AI Retention Agent</Text>
        <View style={styles.supervisedBadge}>
          <Text style={styles.supervisedText}>HUMAN SUPERVISED</Text>
        </View>
      </View>
      <Text style={styles.headerSubtitle}>
        Review AI-drafted outreach, edit messages, and dispatch through Communication Engine.
      </Text>

      {/* Analytics KPI Row */}
      {analytics && (
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{analytics.candidatesIdentified}</Text>
            <Text style={styles.kpiLabel}>Candidates</Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: '#F59E0B' }]}>
            <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>
              {analytics.outreachPendingApproval}
            </Text>
            <Text style={styles.kpiLabel}>Awaiting Approval</Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: '#10B981' }]}>
            <Text style={[styles.kpiValue, { color: '#10B981' }]}>
              {analytics.outreachApproved}
            </Text>
            <Text style={styles.kpiLabel}>Approved / Sent</Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: '#8B5CF6' }]}>
            <Text style={[styles.kpiValue, { color: '#8B5CF6' }]}>
              {analytics.membersReengaged}
            </Text>
            <Text style={styles.kpiLabel}>Re-engaged</Text>
          </View>
        </View>
      )}

      {/* Filter Chips */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Priority Filter</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {(['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, priorityFilter === p && styles.chipActive]}
              onPress={() => setPriorityFilter(p)}
            >
              <Text style={[styles.chipText, priorityFilter === p && styles.chipTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Status Filter</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {(['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REENGAGED', 'CANCELLED'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, statusFilter === s && styles.chipActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
                {s.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: RetentionOutreachDto }) => {
    const isEditing = editingOutreachId === item.id;
    const isPending = item.status === 'PENDING_APPROVAL' || item.status === 'DRAFT';
    const isSubmitting = submittingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.memberName}>{item.memberName || 'FitCore Member'}</Text>
            <Text style={styles.interventionTag}>{item.interventionType.replace(/_/g, ' ')}</Text>
          </View>
          <View style={styles.badgeGroup}>
            <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                {item.status.replace('_', ' ')}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#3B82F620' }]}>
              <Text style={[styles.badgeText, { color: '#3B82F6' }]}>{item.selectedChannel}</Text>
            </View>
          </View>
        </View>

        {/* AI Draft Message Container */}
        <View style={styles.draftContainer}>
          <View style={styles.aiBadgeRow}>
            <Text style={styles.aiBadgeText}>🤖 AI DRAFT — HUMAN APPROVAL MANDATORY</Text>
          </View>

          {isEditing ? (
            <TextInput
              style={styles.messageInput}
              multiline
              value={editedMessageText}
              onChangeText={setEditedMessageText}
              placeholder="Edit draft message..."
              placeholderTextColor="#64748B"
            />
          ) : (
            <Text style={styles.messageText}>{item.finalMessage || item.messageDraft}</Text>
          )}

          {item.outcome && (
            <View style={styles.outcomeBanner}>
              <Text style={styles.outcomeText}>
                Observed Outcome: {item.outcome} ({item.outcomeReason || 'Telemetry detected'})
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {isPending && (
          <View style={styles.actionRow}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.btnCancel]}
                  onPress={() => setEditingOutreachId(null)}
                >
                  <Text style={styles.btnCancelText}>Cancel Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnApprove]}
                  disabled={isSubmitting}
                  onPress={() => handleApprove(item)}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnApproveText}>Approve & Send</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.btnSecondary]}
                  onPress={() => {
                    setEditingOutreachId(item.id);
                    setEditedMessageText(item.finalMessage || item.messageDraft);
                  }}
                >
                  <Text style={styles.btnSecondaryText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnReject]}
                  disabled={isSubmitting}
                  onPress={() => handleReject(item)}
                >
                  <Text style={styles.btnRejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnApprove]}
                  disabled={isSubmitting}
                  onPress={() => handleApprove(item)}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnApproveText}>Approve & Send</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading Retention Agent Queue...</Text>
        </View>
      ) : (
        <FlatList
          data={outreaches}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Pending Outreaches</Text>
              <Text style={styles.emptySubtitle}>
                All identified candidates have been reviewed or are within the 14-day outreach cooldown window.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  headerContainer: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  supervisedBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  supervisedText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  filterSection: {
    marginTop: 8,
  },
  filterLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  chip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  interventionTag: {
    fontSize: 12,
    color: '#38BDF8',
    marginTop: 2,
    fontWeight: '500',
  },
  badgeGroup: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  draftContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  aiBadgeRow: {
    marginBottom: 6,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A855F7',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
  },
  messageInput: {
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    borderColor: '#3B82F6',
    borderWidth: 1,
  },
  outcomeBanner: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  outcomeText: {
    color: '#A855F7',
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondary: {
    backgroundColor: '#334155',
  },
  btnSecondaryText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  btnReject: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  btnRejectText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  btnApprove: {
    backgroundColor: '#10B981',
  },
  btnApproveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnCancel: {
    backgroundColor: '#475569',
  },
  btnCancelText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
