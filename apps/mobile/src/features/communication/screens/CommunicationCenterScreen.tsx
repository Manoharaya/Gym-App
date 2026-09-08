import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { CommunicationChannel, CommunicationType, CommunicationStatus } from '@fitcore/types';

interface MessageItem {
  id: string;
  recipientName: string;
  channel: CommunicationChannel;
  type: CommunicationType;
  status: CommunicationStatus;
  subject?: string;
  preview: string;
  createdAt: string;
}

export const CommunicationCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MESSAGES' | 'COMPOSER' | 'FAILED'>('OVERVIEW');

  // Sample data for staff management interface
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'comm-1',
      recipientName: 'Sarah Jenkins',
      channel: 'SMS',
      type: 'REACTIVATION',
      status: 'DELIVERED',
      preview: 'Hi Sarah, your trainer Marcus has set up a welcoming routine for you!',
      createdAt: '10 mins ago',
    },
    {
      id: 'comm-2',
      recipientName: 'David Lee',
      channel: 'EMAIL',
      type: 'TRANSACTIONAL',
      status: 'DELIVERED',
      subject: 'Membership Renewal Confirmation',
      preview: 'Thank you for renewing your Gold Access membership.',
      createdAt: '25 mins ago',
    },
    {
      id: 'comm-3',
      recipientName: 'Emma Wilson',
      channel: 'PUSH',
      type: 'REMINDER',
      status: 'READ',
      preview: 'Your HIIT Bootcamp starts in 45 minutes.',
      createdAt: '1 hour ago',
    },
    {
      id: 'comm-4',
      recipientName: 'James Taylor',
      channel: 'SMS',
      type: 'MARKETING',
      status: 'SUPPRESSED',
      preview: 'Exclusive early bird access to summer transformation challenge.',
      createdAt: '2 hours ago',
    },
    {
      id: 'comm-5',
      recipientName: 'Michael Brown',
      channel: 'EMAIL',
      type: 'OPERATIONAL',
      status: 'FAILED',
      preview: 'Notice of scheduled facility maintenance for pool area.',
      createdAt: '3 hours ago',
    },
  ]);

  // Composer Form State
  const [composerRecipient, setComposerRecipient] = useState('');
  const [composerChannel, setComposerChannel] = useState<CommunicationChannel>('SMS');
  const [composerType, setComposerType] = useState<CommunicationType>('OPERATIONAL');
  const [composerSubject, setComposerSubject] = useState('');
  const [composerBody, setComposerBody] = useState('');
  const [composerNeedsApproval, setComposerNeedsApproval] = useState(false);
  const [composerSuccess, setComposerSuccess] = useState<string | null>(null);

  const handleSendMessage = () => {
    if (!composerRecipient || !composerBody) return;

    const newMsg: MessageItem = {
      id: `comm-${Date.now()}`,
      recipientName: composerRecipient,
      channel: composerChannel,
      type: composerType,
      status: composerNeedsApproval ? 'PENDING_APPROVAL' : 'DELIVERED',
      subject: composerSubject || undefined,
      preview: composerBody,
      createdAt: 'Just now',
    };

    setMessages([newMsg, ...messages]);
    setComposerSuccess(
      composerNeedsApproval
        ? 'Message drafted and held for manager approval'
        : 'Message queued and delivered via Development Provider'
    );
    setComposerRecipient('');
    setComposerBody('');
    setComposerSubject('');
    setTimeout(() => {
      setComposerSuccess(null);
      setActiveTab('MESSAGES');
    }, 1800);
  };

  const getStatusBadge = (status: CommunicationStatus) => {
    switch (status) {
      case 'DELIVERED':
      case 'READ':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: themeColors.success, label: status };
      case 'QUEUED':
      case 'SENDING':
      case 'SENT':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', label: status };
      case 'PENDING_APPROVAL':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', label: 'PENDING APPROVAL' };
      case 'SUPPRESSED':
        return { bg: 'rgba(107, 114, 128, 0.2)', text: '#9CA3AF', label: 'SUPPRESSED' };
      case 'FAILED':
      default:
        return { bg: 'rgba(239, 68, 68, 0.15)', text: themeColors.error, label: 'FAILED' };
    }
  };

  return (
    <Screen style={styles.container} testID="communication-center-screen">
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-left" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Communication Center</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['OVERVIEW', 'MESSAGES', 'COMPOSER', 'FAILED'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'FAILED' ? 'Failed (1)' : tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* OVERVIEW TAB */}
        {activeTab === 'OVERVIEW' && (
          <View>
            {/* KPI Cards */}
            <View style={styles.metricsGrid}>
              <Card style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Dispatched</Text>
                <Text style={styles.metricValue}>1,248</Text>
                <Text style={styles.metricSub}>Past 30 days</Text>
              </Card>
              <Card style={styles.metricCard}>
                <Text style={styles.metricLabel}>Delivery Rate</Text>
                <Text style={[styles.metricValue, { color: themeColors.success }]}>98.4%</Text>
                <Text style={styles.metricSub}>Industry benchmark: 95%</Text>
              </Card>
              <Card style={styles.metricCard}>
                <Text style={styles.metricLabel}>Suppression Rate</Text>
                <Text style={styles.metricValue}>1.2%</Text>
                <Text style={styles.metricSub}>Opted-out / Consent</Text>
              </Card>
              <Card style={styles.metricCard}>
                <Text style={styles.metricLabel}>Est. Provider Cost</Text>
                <Text style={styles.metricValue}>$14.82</Text>
                <Text style={styles.metricSub}>Development mode: $0</Text>
              </Card>
            </View>

            {/* Channel Breakdown */}
            <Text style={styles.sectionTitle}>Channel Distribution</Text>
            <Card style={styles.breakdownCard}>
              <View style={styles.channelStatRow}>
                <Text style={styles.channelStatName}>PUSH Notification</Text>
                <Text style={styles.channelStatValue}>620 (49%)</Text>
              </View>
              <View style={styles.channelStatRow}>
                <Text style={styles.channelStatName}>Email</Text>
                <Text style={styles.channelStatValue}>380 (30%)</Text>
              </View>
              <View style={styles.channelStatRow}>
                <Text style={styles.channelStatName}>SMS Text</Text>
                <Text style={styles.channelStatValue}>190 (15%)</Text>
              </View>
              <View style={styles.channelStatRow}>
                <Text style={styles.channelStatName}>In-App Notifications</Text>
                <Text style={styles.channelStatValue}>58 (5%)</Text>
              </View>
            </Card>

            {/* Human in the loop Banner */}
            <Card style={styles.hilCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="check-circle" size={18} color="#10B981" />
                <Text style={styles.hilTitle}>AI Platform Boundary Enforced</Text>
              </View>
              <Text style={styles.hilText}>
                No AI retention or check-in models may bypass the Communication Orchestrator. All outreach respects recipient preferences and consent rules.
              </Text>
            </Card>
          </View>
        )}

        {/* MESSAGES TAB */}
        {activeTab === 'MESSAGES' && (
          <View>
            {messages.map((item) => {
              const badge = getStatusBadge(item.status);
              return (
                <Card key={item.id} style={styles.messageCard}>
                  <View style={styles.msgHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.msgRecipient}>{item.recipientName}</Text>
                      <View style={[styles.channelTag]}>
                        <Text style={styles.channelTagText}>{item.channel}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                    </View>
                  </View>

                  {item.subject && <Text style={styles.msgSubject}>{item.subject}</Text>}
                  <Text style={styles.msgPreview}>{item.preview}</Text>

                  <View style={styles.msgFooter}>
                    <Text style={styles.msgType}>{item.type}</Text>
                    <Text style={styles.msgTime}>{item.createdAt}</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* COMPOSER TAB */}
        {activeTab === 'COMPOSER' && (
          <Card style={styles.composerCard}>
            <Text style={styles.composerTitle}>Staff Outreach Composer</Text>
            <Text style={styles.composerSubtitle}>
              Compose structured member communications safely through the platform orchestrator.
            </Text>

            {composerSuccess && (
              <View style={styles.successBox}>
                <Icon name="check-circle" size={16} color={themeColors.success} />
                <Text style={styles.successText}>{composerSuccess}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Recipient Name or Email</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Sarah Jenkins or sarah@example.com"
              placeholderTextColor={themeColors.textSecondary}
              value={composerRecipient}
              onChangeText={setComposerRecipient}
            />

            <Text style={styles.inputLabel}>Delivery Channel</Text>
            <View style={styles.pillRow}>
              {(['SMS', 'EMAIL', 'PUSH', 'WHATSAPP'] as CommunicationChannel[]).map((ch) => (
                <TouchableOpacity
                  key={ch}
                  style={[styles.pill, composerChannel === ch && styles.pillActive]}
                  onPress={() => setComposerChannel(ch)}
                >
                  <Text style={[styles.pillText, composerChannel === ch && styles.pillTextActive]}>
                    {ch}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Communication Type</Text>
            <View style={styles.pillRow}>
              {(['OPERATIONAL', 'REACTIVATION', 'REMINDER', 'ENGAGEMENT'] as CommunicationType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.pill, composerType === t && styles.pillActive]}
                  onPress={() => setComposerType(t)}
                >
                  <Text style={[styles.pillText, composerType === t && styles.pillTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {composerChannel === 'EMAIL' && (
              <>
                <Text style={styles.inputLabel}>Subject Line</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Email subject..."
                  placeholderTextColor={themeColors.textSecondary}
                  value={composerSubject}
                  onChangeText={setComposerSubject}
                />
              </>
            )}

            <Text style={styles.inputLabel}>Message Content</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Write your message here... Supports variables like {{member.firstName}}"
              placeholderTextColor={themeColors.textSecondary}
              multiline
              numberOfLines={4}
              value={composerBody}
              onChangeText={setComposerBody}
            />

            {/* Approval Toggle */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setComposerNeedsApproval(!composerNeedsApproval)}
            >
              <View style={[styles.checkbox, composerNeedsApproval && styles.checkboxChecked]}>
                {composerNeedsApproval && <Icon name="check" size={14} color="#ffffff" />}
              </View>
              <Text style={styles.checkboxLabel}>Submit for Manager Approval (Hold in Pending)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Icon name="send" size={18} color="#ffffff" />
              <Text style={styles.sendButtonText}>
                {composerNeedsApproval ? 'Submit for Approval' : 'Dispatch via Orchestrator'}
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* FAILED TAB */}
        {activeTab === 'FAILED' && (
          <View>
            <Card style={styles.messageCard}>
              <View style={styles.msgHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.msgRecipient}>Michael Brown</Text>
                  <View style={[styles.channelTag]}>
                    <Text style={styles.channelTagText}>EMAIL</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Text style={[styles.statusText, { color: themeColors.error }]}>FAILED</Text>
                </View>
              </View>

              <Text style={styles.msgSubject}>Notice of scheduled facility maintenance</Text>
              <Text style={styles.msgPreview}>Recipient mailbox unavailable (Simulated transient timeout)</Text>

              <View style={styles.failedActionsRow}>
                <Text style={styles.failedAttemptCount}>Attempt: 2 / 3 (Exponential Backoff)</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    alert('Retrying communication via DeliveryService...');
                  }}
                >
                  <Icon name="rotate-ccw" size={14} color="#ffffff" />
                  <Text style={styles.retryButtonText}>Retry Now</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: themeColors.primary,
  },
  tabText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: themeColors.primary,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metricCard: {
    width: '48%',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  metricLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  metricValue: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginVertical: 4,
  },
  metricSub: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textSecondary,
  },
  sectionTitle: {
    ...typography.subtitle1,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  breakdownCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  channelStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  channelStatName: {
    ...typography.body2,
    color: themeColors.textPrimary,
  },
  channelStatValue: {
    ...typography.body2,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  hilCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    padding: spacing.md,
  },
  hilTitle: {
    ...typography.subtitle2,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  hilText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  messageCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  msgRecipient: {
    ...typography.subtitle2,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  channelTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginLeft: spacing.xs,
  },
  channelTagText: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  statusText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  msgSubject: {
    ...typography.body2,
    color: themeColors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  msgPreview: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  msgFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    paddingTop: spacing.xs,
  },
  msgType: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '600',
  },
  msgTime: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  composerCard: {
    padding: spacing.md,
  },
  composerTitle: {
    ...typography.h4,
    color: themeColors.textPrimary,
  },
  composerSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginBottom: spacing.md,
    marginTop: 2,
  },
  inputLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.md,
    color: themeColors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  pillActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  pillText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  checkboxChecked: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  checkboxLabel: {
    ...typography.caption,
    color: themeColors.textPrimary,
  },
  sendButton: {
    backgroundColor: themeColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  sendButtonText: {
    ...typography.subtitle2,
    color: '#ffffff',
    fontWeight: '700',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: themeColors.success,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  successText: {
    ...typography.caption,
    color: themeColors.success,
    fontWeight: '600',
  },
  failedActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    paddingTop: spacing.xs,
  },
  failedAttemptCount: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    gap: 4,
  },
  retryButtonText: {
    ...typography.caption,
    color: '#ffffff',
    fontWeight: '700',
  },
});
