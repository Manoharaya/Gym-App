import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Icon, Modal, Button } from '../../../components/primitives';
import { themeColors, spacing, radius } from '../../../theme';
import {
  AIFitnessCoachMessage,
  AIFitnessCoachInput,
  AIFitnessCoachSuggestion,
  AIFitnessCoachSafetyNotice,
} from '../components';
import {
  fitnessCoachService,
  type ContextSummaryResponse,
} from '../services/fitnessCoachService';
import type {
  FitnessCoachResponse,
  FitnessAction,
  AIFeedbackRating,
} from '@fitcore/types';

type NavigationProp = NativeStackNavigationProp<MemberStackParamList, 'AICoach'>;

interface MessageItem {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  structuredOutput?: FitnessCoachResponse | null;
  createdAt?: string;
}

const DEFAULT_SUGGESTIONS = [
  'How is my workout consistency this week?',
  'Analyze my current training volume',
  'What should I focus on for progressive overload?',
  'Explain how my goals connect to my training',
];

export const AICoachScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [safetyNotice, setSafetyNotice] = useState<{ urgent: boolean; message: string } | null>(null);
  const [privacyModalVisible, setPrivacyModalVisible] = useState<boolean>(false);
  const [contextSummary, setContextSummary] = useState<ContextSummaryResponse | null>(null);
  const [loadingContext, setLoadingContext] = useState<boolean>(false);

  // Initialize or resume conversation on mount
  useEffect(() => {
    initConversation();
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isSending]);

  const initConversation = async () => {
    setIsLoading(true);
    try {
      const convList = await fitnessCoachService.listConversations('ACTIVE');
      if (convList.data && convList.data.length > 0 && convList.data[0]) {
        const activeConv = convList.data[0];
        setConversationId(activeConv.id);
        const detailed = await fitnessCoachService.getConversation(activeConv.id);
        if (detailed.messages && detailed.messages.length > 0) {
          setMessages(
            detailed.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              structuredOutput: m.structuredOutput as FitnessCoachResponse | null,
              createdAt: m.createdAt,
            })),
          );
        } else {
          // Welcome greeting
          addWelcomeMessage();
        }
      } else {
        const newConv = await fitnessCoachService.createConversation('Training Intelligence');
        setConversationId(newConv.id);
        addWelcomeMessage();
      }
    } catch (err) {
      console.warn('Failed to load conversation from backend, using fresh local session', err);
      addWelcomeMessage();
    } finally {
      setIsLoading(false);
    }
  };

  const addWelcomeMessage = () => {
    setMessages([
      {
        id: 'welcome_msg',
        role: 'ASSISTANT',
        content:
          "Welcome to your FitCore AI Coach. I have direct access to your verified workout history, active training plans, streaks, and progress goals. How can I help optimize your training today?",
        structuredOutput: {
          message:
            "Welcome to your FitCore AI Coach. I have direct access to your verified workout history, active training plans, streaks, and progress goals. How can I help optimize your training today?",
          insights: [
            {
              type: 'ADHERENCE',
              title: 'Grounded Intelligence',
              description: 'Every recommendation is based strictly on your recorded FitCore data.',
            },
          ],
          recommendations: [],
          cautions: [
            'For acute joint pain, chest pain, or medical conditions, always consult a medical doctor.',
          ],
          suggestedActions: [],
          followUpQuestion: 'Would you like a review of your recent workout consistency?',
        },
      },
    ]);
  };

  const handleStartNewConversation = async () => {
    setIsLoading(true);
    try {
      const newConv = await fitnessCoachService.createConversation('New Training Session');
      setConversationId(newConv.id);
      setSafetyNotice(null);
      addWelcomeMessage();
    } catch (err) {
      console.error('Failed to create new conversation', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isSending) return;

    const userMessage: MessageItem = {
      id: `user_${Date.now()}`,
      role: 'USER',
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      let convId = conversationId;
      if (!convId) {
        const created = await fitnessCoachService.createConversation('Training Session');
        convId = created.id;
        setConversationId(convId);
      }

      const res = await fitnessCoachService.sendMessage(convId, {
        content: text.trim(),
      });

      const structured = res.response;

      // Check if safety cautions exist
      if (structured.cautions && structured.cautions.length > 0) {
        const isUrgent = structured.cautions.some(
          (c) =>
            c.toLowerCase().includes('medical') ||
            c.toLowerCase().includes('emergency') ||
            c.toLowerCase().includes('physician') ||
            c.toLowerCase().includes('urgent'),
        );
        setSafetyNotice({
          urgent: isUrgent,
          message: structured.cautions[0] || 'Medical caution advised.',
        });
      }

      const assistantMessage: MessageItem = {
        id: res.assistantMessageId || `ai_${Date.now()}`,
        role: 'ASSISTANT',
        content: structured.message || 'I have analyzed your training data.',
        structuredOutput: structured,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Coach communication error', err);
      const errorMessage: MessageItem = {
        id: `err_${Date.now()}`,
        role: 'ASSISTANT',
        content:
          err?.response?.data?.message ||
          'I encountered an error retrieving your training context. Please ensure you have granted AI coaching consent and try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleActionPress = (action: FitnessAction) => {
    const targetId = action.parameters?.targetId || action.parameters?.id;
    switch (action.action) {
      case 'VIEW_WORKOUT':
        navigation.navigate('WorkoutSession', { workoutId: targetId });
        break;
      case 'VIEW_PROGRESS':
        navigation.navigate('Progress');
        break;
      case 'VIEW_GOAL':
        navigation.navigate('Goals', { memberProfileId: targetId });
        break;
      case 'VIEW_TRAINING_PLAN':
        navigation.navigate('TrainingPlanOverview', { planId: targetId });
        break;
      case 'VIEW_BOOKING':
        navigation.navigate('MyBookings');
        break;
      case 'OPEN_CHALLENGE':
        navigation.navigate('Challenges');
        break;
      default:
        console.log('Action pressed:', action);
    }
  };

  const handleFeedback = async (messageId: string, rating: AIFeedbackRating) => {
    try {
      await fitnessCoachService.submitFeedback(rating, messageId);
    } catch (err) {
      console.warn('Failed to submit feedback', err);
    }
  };

  const handleOpenPrivacyModal = async () => {
    setPrivacyModalVisible(true);
    setLoadingContext(true);
    try {
      const summary = await fitnessCoachService.getContextSummary();
      setContextSummary(summary);
    } catch (err) {
      console.warn('Failed to load context summary', err);
    } finally {
      setLoadingContext(false);
    }
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.headerTitleRow}>
              <View style={styles.aiGlowDot} />
              <Text style={styles.headerTitle}>FitCore AI Coach</Text>
            </View>
            <Text style={styles.headerSubtitle}>Grounded Training Intelligence</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleOpenPrivacyModal}
              style={styles.headerActionBtn}
              accessibilityLabel="AI Data & Privacy"
            >
              <Icon name="shield" size={18} color="#38BDF8" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleStartNewConversation}
              style={styles.headerActionBtn}
              accessibilityLabel="New Conversation"
            >
              <Icon name="plus" size={18} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Urgent Safety Escalation Banner if triggered */}
        {safetyNotice && (
          <AIFitnessCoachSafetyNotice
            urgent={safetyNotice.urgent}
            message={safetyNotice.message}
          />
        )}

        {/* Loading Initial State */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#0EA5E9" />
            <Text style={styles.loadingText}>Loading training context...</Text>
          </View>
        ) : (
          <>
            {/* Conversation Stream */}
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.chatStream}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg) => (
                <AIFitnessCoachMessage
                  key={msg.id}
                  id={msg.id}
                  role={msg.role}
                  content={msg.content}
                  structuredOutput={msg.structuredOutput}
                  onActionPress={handleActionPress}
                  onFeedback={(rating) => handleFeedback(msg.id, rating)}
                />
              ))}

              {isSending && (
                <View style={styles.thinkingCard}>
                  <ActivityIndicator size="small" color="#0EA5E9" />
                  <Text style={styles.thinkingText}>
                    Coach is analyzing your workout logs & training history...
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Suggestions */}
            <AIFitnessCoachSuggestion
              suggestions={DEFAULT_SUGGESTIONS}
              onSelect={handleSendMessage}
              disabled={isSending}
            />

            {/* Input Bar */}
            <AIFitnessCoachInput
              onSend={handleSendMessage}
              disabled={isSending}
              placeholder="Ask about workouts, form, volume, or recovery..."
            />
          </>
        )}

        {/* Privacy & Context Inspection Modal */}
        <Modal
          visible={privacyModalVisible}
          onClose={() => setPrivacyModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🛡️ AI Data & Grounding Context</Text>
              <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                <Icon name="close" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loadingContext ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color="#0EA5E9" />
                <Text style={styles.modalSubText}>Retrieving active context snapshot...</Text>
              </View>
            ) : contextSummary ? (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalSectionTitle}>Training History</Text>
                <Text style={styles.modalRowText}>
                  Active Plan: {contextSummary.training.activePlanName || 'None assigned'}
                </Text>
                <Text style={styles.modalRowText}>
                  Logged Workouts (Last 14d): {contextSummary.training.recentWorkoutsCount}
                </Text>

                <Text style={styles.modalSectionTitle}>Goal Tracking</Text>
                <Text style={styles.modalRowText}>
                  Active Goals: {contextSummary.progress.activeGoalsCount}
                </Text>
                {contextSummary.progress.goals.map((g, idx) => (
                  <Text key={idx} style={styles.modalBulletText}>
                    • {g.title} ({g.category})
                  </Text>
                ))}

                <Text style={styles.modalSectionTitle}>Engagement & Consistency</Text>
                <Text style={styles.modalRowText}>
                  Streak: {contextSummary.engagement.streak} days
                </Text>
                <Text style={styles.modalRowText}>
                  Level: {contextSummary.engagement.engagementLevel}
                </Text>

                <Text style={styles.modalSectionTitle}>Redacted Sensitive Information</Text>
                <Text style={styles.modalRedactionText}>
                  🔒 PAR-Q, medical clearances, private trainer notes, and payment credentials are
                  strictly excluded from AI context builder payloads.
                </Text>
              </ScrollView>
            ) : (
              <Text style={styles.modalSubText}>Unable to load context snapshot.</Text>
            )}

            <Button
              title="Close"
              variant="secondary"
              onPress={() => setPrivacyModalVisible(false)}
              style={styles.modalCloseBtn}
            />
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  iconButton: {
    padding: spacing[1],
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing[2],
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  aiGlowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0EA5E9',
  },
  headerTitle: {
    fontSize: 16,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerActionBtn: {
    padding: spacing[1.5],
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing[3],
    color: '#94A3B8',
    fontSize: 14,
  },
  chatStream: {
    paddingVertical: spacing[3],
    paddingBottom: spacing[4],
  },
  thinkingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: '#1E293B',
    marginHorizontal: spacing[4],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: spacing[2],
  },
  thinkingText: {
    color: '#94A3B8',
    fontSize: 13,
    fontStyle: 'italic',
  },
  modalContent: {
    gap: spacing[3],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalLoading: {
    paddingVertical: spacing[4],
    alignItems: 'center',
    gap: spacing[2],
  },
  modalScroll: {
    maxHeight: 320,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
    marginTop: spacing[2],
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalRowText: {
    fontSize: 13,
    color: '#E2E8F0',
    marginBottom: 2,
  },
  modalBulletText: {
    fontSize: 12,
    color: '#CBD5E1',
    marginLeft: spacing[2],
    marginBottom: 2,
  },
  modalRedactionText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalSubText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  modalCloseBtn: {
    marginTop: spacing[2],
  },
});
