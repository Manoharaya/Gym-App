/**
 * Day 30 — Staff Automation Center Screen
 *
 * Provides gym staff with:
 * 1. Active Workflows Overview & Controls
 * 2. Human-in-the-Loop Action Approval Queue
 * 3. Pre-configured Template Deployer
 * 4. AI Workflow Architect with Bilingual Preview
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  AutomationService,
  WorkflowTemplateItem,
  PendingApprovalItem,
} from '../automationService';
import type {
  EngagementWorkflowSummaryDto,
  AIAssistWorkflowResponseDto,
} from '@fitcore/types';

export const AutomationCenterScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workflows' | 'approvals' | 'templates' | 'ai'>('workflows');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Workflows state
  const [workflows, setWorkflows] = useState<EngagementWorkflowSummaryDto[]>([]);

  // Approvals state
  const [approvals, setApprovals] = useState<PendingApprovalItem[]>([]);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<PendingApprovalItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Templates state
  const [templates, setTemplates] = useState<WorkflowTemplateItem[]>([]);

  // AI Assistant state
  const [aiIntent, setAiIntent] = useState('');
  const [aiLanguage, setAiLanguage] = useState<'en' | 'ne'>('en');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState<AIAssistWorkflowResponseDto | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [wfRes, appRes, tplRes] = await Promise.all([
        AutomationService.listWorkflows(),
        AutomationService.getPendingApprovals(),
        AutomationService.listTemplates(),
      ]);
      setWorkflows(wfRes || []);
      setApprovals(appRes || []);
      setTemplates(tplRes || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load automation data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleWorkflow = async (workflow: EngagementWorkflowSummaryDto) => {
    try {
      if (workflow.status === 'ACTIVE') {
        await AutomationService.pauseWorkflow(workflow.id);
      } else {
        await AutomationService.activateWorkflow(workflow.id);
      }
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update workflow state.');
    }
  };

  const handleApprove = async (item: PendingApprovalItem) => {
    try {
      await AutomationService.approveAction(item.instanceId, 'Approved by gym staff');
      Alert.alert('Approved', `Action for ${item.memberName} approved successfully.`);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve action.');
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    if (!rejectionReason.trim()) {
      Alert.alert('Required', 'Please enter a rejection reason.');
      return;
    }
    try {
      await AutomationService.rejectAction(selectedApproval.instanceId, rejectionReason);
      setRejectModalVisible(false);
      setRejectionReason('');
      setSelectedApproval(null);
      Alert.alert('Rejected', 'Action cancelled.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reject action.');
    }
  };

  const handleDeployTemplate = async (template: WorkflowTemplateItem) => {
    try {
      setLoading(true);
      await AutomationService.instantiateTemplate(template.templateKey);
      Alert.alert('Template Deployed', `"${template.name}" is now configured in Draft.`);
      setActiveTab('workflows');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to deploy template.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiIntent.trim()) {
      Alert.alert('Required', 'Please describe the workflow you want to create.');
      return;
    }
    setAiLoading(true);
    try {
      const draft = await AutomationService.draftWithAI(aiIntent, 'SUPPORTIVE', aiLanguage);
      setAiDraft(draft);
    } catch (err: any) {
      Alert.alert('AI Assistant Error', err.message || 'Could not generate workflow draft.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Automation Center</Text>
        <Text style={styles.subtitle}>Deterministic, Event-Driven Engagement Engine</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'workflows' && styles.tabButtonActive]}
          onPress={() => setActiveTab('workflows')}
        >
          <Text style={[styles.tabText, activeTab === 'workflows' && styles.tabTextActive]}>
            Workflows ({workflows.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'approvals' && styles.tabButtonActive]}
          onPress={() => setActiveTab('approvals')}
        >
          <Text style={[styles.tabText, activeTab === 'approvals' && styles.tabTextActive]}>
            Approvals ({approvals.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'templates' && styles.tabButtonActive]}
          onPress={() => setActiveTab('templates')}
        >
          <Text style={[styles.tabText, activeTab === 'templates' && styles.tabTextActive]}>
            Templates
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ai' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ai')}
        >
          <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>
            AI Architect
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#38BDF8" style={styles.loader} />
        ) : null}

        {/* WORKFLOWS TAB */}
        {activeTab === 'workflows' && (
          <View>
            {workflows.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Workflows Yet</Text>
                <Text style={styles.emptySubtitle}>Deploy a pre-configured template or draft one with AI.</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setActiveTab('templates')}>
                  <Text style={styles.primaryBtnText}>Browse Templates</Text>
                </TouchableOpacity>
              </View>
            ) : (
              workflows.map((wf) => (
                <View key={wf.id} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{wf.name}</Text>
                      <Text style={styles.triggerBadge}>Trigger: {wf.triggerType}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        wf.status === 'ACTIVE' ? styles.statusActive : styles.statusDraft,
                      ]}
                    >
                      <Text style={styles.statusPillText}>{wf.status}</Text>
                    </View>
                  </View>

                  {wf.description ? <Text style={styles.cardDesc}>{wf.description}</Text> : null}

                  <View style={styles.cardStatsRow}>
                    <Text style={styles.statsText}>Version: v{wf.currentVersion}</Text>
                    <Text style={styles.statsText}>Executions: {wf.activeInstanceCount || 0}</Text>
                    <Text style={styles.statsText}>Approval: {wf.approvalMode}</Text>
                  </View>

                  <View style={styles.cardActionRow}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        wf.status === 'ACTIVE' ? styles.pauseBtn : styles.activateBtn,
                      ]}
                      onPress={() => handleToggleWorkflow(wf)}
                    >
                      <Text style={styles.actionBtnText}>
                        {wf.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* APPROVALS QUEUE TAB */}
        {activeTab === 'approvals' && (
          <View>
            {approvals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>All Clear!</Text>
                <Text style={styles.emptySubtitle}>No workflow actions currently require human approval.</Text>
              </View>
            ) : (
              approvals.map((app) => (
                <View key={app.instanceId} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{app.workflowName}</Text>
                      <Text style={styles.memberTag}>Member: {app.memberName}</Text>
                    </View>
                    <View style={styles.statusPillPending}>
                      <Text style={styles.statusPillText}>REQUIRES REVIEW</Text>
                    </View>
                  </View>

                  <View style={styles.actionPreviewBox}>
                    <Text style={styles.actionTypeLabel}>Action: {app.actionType}</Text>
                    {app.actionDetails?.action?.params?.message ? (
                      <Text style={styles.messagePreview}>
                        "{app.actionDetails.action.params.message}"
                      </Text>
                    ) : null}
                    {app.actionDetails?.action?.params?.messageNepali ? (
                      <Text style={styles.nepaliPreview}>
                        "{app.actionDetails.action.params.messageNepali}"
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.approvalButtonsRow}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => {
                        setSelectedApproval(app);
                        setRejectModalVisible(true);
                      }}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprove(app)}
                    >
                      <Text style={styles.approveBtnText}>Approve & Send</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <View>
            <Text style={styles.sectionHeader}>Ready-to-Deploy Engagement Workflows</Text>
            {templates.map((tpl) => (
              <View key={tpl.templateKey} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{tpl.name}</Text>
                    <Text style={styles.triggerBadge}>Trigger: {tpl.triggerType}</Text>
                  </View>
                </View>
                <Text style={styles.cardDesc}>{tpl.description}</Text>

                <View style={styles.tagRow}>
                  {tpl.tags.map((t) => (
                    <View key={t} style={styles.tagBadge}>
                      <Text style={styles.tagText}>#{t}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.deployBtn}
                  onPress={() => handleDeployTemplate(tpl)}
                >
                  <Text style={styles.deployBtnText}>Deploy Template</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* AI ARCHITECT TAB */}
        {activeTab === 'ai' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>AI Engagement Workflow Architect</Text>
              <Text style={styles.cardDesc}>
                Describe your gym engagement objective in natural language. The AI assistant will draft
                safe trigger conditions, quiet hours policy, and multi-lingual English/Nepali templates.
              </Text>

              <TextInput
                style={styles.aiInput}
                placeholder="e.g. Check in on trial members who haven't visited after 3 days with a warm Nepali greeting and alert their trainer..."
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={4}
                value={aiIntent}
                onChangeText={setAiIntent}
              />

              <View style={styles.langSelectorRow}>
                <Text style={styles.langLabel}>Primary Copy:</Text>
                <TouchableOpacity
                  style={[styles.langChoice, aiLanguage === 'en' && styles.langChoiceActive]}
                  onPress={() => setAiLanguage('en')}
                >
                  <Text style={styles.langChoiceText}>English</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.langChoice, aiLanguage === 'ne' && styles.langChoiceActive]}
                  onPress={() => setAiLanguage('ne')}
                >
                  <Text style={styles.langChoiceText}>Nepali (नेपाली)</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleGenerateAI}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Draft Workflow</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* AI Draft Preview */}
            {aiDraft && (
              <View style={styles.aiResultCard}>
                <Text style={styles.aiResultTitle}>✨ Drafted: {aiDraft.recommendedName}</Text>
                <Text style={styles.cardDesc}>{aiDraft.description}</Text>

                <View style={styles.aiSpecBox}>
                  <Text style={styles.aiSpecLabel}>Trigger: {aiDraft.triggerType}</Text>
                  <Text style={styles.aiSpecLabel}>
                    Cooldown: {aiDraft.safetyPolicy?.cooldownHours || 24} hours
                  </Text>
                  <Text style={styles.aiSpecLabel}>
                    Quiet Hours: {aiDraft.safetyPolicy?.quietHoursStart} - {aiDraft.safetyPolicy?.quietHoursEnd}
                  </Text>
                </View>

                <Text style={styles.previewSubheading}>Message Copy Preview:</Text>
                {aiDraft.suggestedMessageTemplates?.map((msg, i) => (
                  <View key={i} style={styles.messageBox}>
                    <Text style={styles.msgLangTag}>[{msg.language.toUpperCase()}] ({msg.channel})</Text>
                    <Text style={styles.msgBodyText}>{msg.body}</Text>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.saveDraftBtn}
                  onPress={() => {
                    Alert.alert('Draft Saved', 'Draft configuration ready for staff activation.');
                  }}
                >
                  <Text style={styles.saveDraftBtnText}>Save as Draft Workflow</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Rejection Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Action Step</Text>
            <Text style={styles.modalSubtitle}>Provide a reason for stopping this action:</Text>

            <TextInput
              style={styles.rejectInput}
              placeholder="e.g. Member contacted front desk directly..."
              placeholderTextColor="#64748B"
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalRejectBtn} onPress={handleReject}>
                <Text style={styles.modalRejectText}>Confirm Rejection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#38BDF8',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#38BDF8',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loader: {
    marginVertical: 20,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  triggerBadge: {
    fontSize: 12,
    color: '#38BDF8',
    marginTop: 2,
  },
  memberTag: {
    fontSize: 13,
    color: '#F59E0B',
    marginTop: 2,
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
    lineHeight: 18,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: '#065F46',
  },
  statusDraft: {
    backgroundColor: '#334155',
  },
  statusPillPending: {
    backgroundColor: '#78350F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  cardStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  statsText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  cardActionRow: {
    marginTop: 12,
  },
  actionBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  activateBtn: {
    backgroundColor: '#0284C7',
  },
  pauseBtn: {
    backgroundColor: '#475569',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginVertical: 40,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  actionPreviewBox: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  actionTypeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: 13,
    color: '#E2E8F0',
    fontStyle: 'italic',
  },
  nepaliPreview: {
    fontSize: 13,
    color: '#A7F3D0',
    marginTop: 4,
    fontStyle: 'italic',
  },
  approvalButtonsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#475569',
    alignItems: 'center',
  },
  rejectBtnText: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 13,
  },
  approveBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  deployBtn: {
    marginTop: 12,
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  deployBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  aiInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    marginTop: 12,
    marginBottom: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#334155',
  },
  langSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  langLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  langChoice: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  langChoiceActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#0369A1',
  },
  langChoiceText: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  aiResultCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  aiResultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#38BDF8',
  },
  aiSpecBox: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  aiSpecLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  previewSubheading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 12,
    marginBottom: 6,
  },
  messageBox: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  msgLangTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 2,
  },
  msgBodyText: {
    fontSize: 13,
    color: '#E2E8F0',
  },
  saveDraftBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveDraftBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 12,
  },
  rejectInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalRejectBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalRejectText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
