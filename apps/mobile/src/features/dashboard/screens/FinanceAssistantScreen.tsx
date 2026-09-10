import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Screen, Card, Badge } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  FinanceFact,
  FinanceComparison,
  FinanceRecommendation,
} from '@fitcore/types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  language?: 'en' | 'ne';
  facts?: FinanceFact[];
  comparisons?: FinanceComparison[];
  recommendations?: FinanceRecommendation[];
  isGrounded?: boolean;
  limitations?: string[];
  suggestedFollowUps?: string[];
  feedbackSubmitted?: boolean;
}

const ENGLISH_PROMPTS = [
  'How much revenue did we collect this month?',
  'What is our recurring collection rate?',
  'What is our outstanding invoice balance?',
  'Are there any accounting sync conflicts?',
  'Compare this month revenue with last month',
];

const NEPALI_PROMPTS = [
  'यो महिना कति आम्दानी संकलन भयो?',
  'हाम्रो महशुल संकलन दर (collection rate) कति छ?',
  'कुल बक्यौता इनभ्वाइस कति बाँकी छ?',
  'लेखा प्रणाली (Accounting Sync) मा कुनै समस्या छ?',
  'गत महिनाको तुलनामा यो महिनाको आम्दानी कस्तो छ?',
];

export const FinanceAssistantScreen: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'ne'>('en');
  const [selectedCurrency, setSelectedCurrency] = useState<'AUD' | 'USD' | 'NPR'>('AUD');
  const [selectedOutlet] = useState<string>('all');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [feedbackAccuracy, setFeedbackAccuracy] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState<string>('');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text:
        language === 'en'
          ? 'Hello. I am your FitCore AI Finance Assistant. You can ask me factual questions about revenue, collections, outstanding invoices, and accounting sync status.'
          : 'नमस्ते। म तपाईंको FitCore एआई वित्त सहायक हुँ। तपाईं आम्दानी, महसुल संकलन दर, बक्यौता इनभ्वाइस र लेखा प्रणाली स्थिति बारे प्रश्न सोध्न सक्नुहुन्छ।',
      isGrounded: true,
      suggestedFollowUps: language === 'en' ? ENGLISH_PROMPTS.slice(0, 3) : NEPALI_PROMPTS.slice(0, 3),
    },
  ]);

  const scrollViewRef = useRef<ScrollView>(null);

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: textToSend,
      language,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Mock realistic grounded response reflecting backend AI pipeline
    setTimeout(() => {
      const isNepali = language === 'ne' || /[\u0900-\u097F]/.test(textToSend);
      const isRevenue = textToSend.toLowerCase().includes('revenue') || textToSend.includes('आम्दानी');
      const isCollection = textToSend.toLowerCase().includes('collection') || textToSend.includes('संकलन');

      let responseText = '';
      let facts: FinanceFact[] = [];
      let comparisons: FinanceComparison[] = [];
      let recommendations: FinanceRecommendation[] = [];

      if (isRevenue) {
        if (isNepali) {
          responseText = `यो महिना कुल आम्दानी ${selectedCurrency} 45,200.00 संकलन भएको छ। गत महिनाको तुलनामा +8.4% वृद्धि देखिएको छ।`;
        } else {
          responseText = `Total gross revenue for the current period is ${selectedCurrency} 45,200.00, reflecting an observed increase of +8.4% compared to the prior period.`;
        }
        facts = [
          { metric: 'Gross Revenue', value: `${selectedCurrency} 45,200.00`, source: 'FinancialAnalyticsService.getOverview' },
          { metric: 'Net Revenue', value: `${selectedCurrency} 43,850.00`, source: 'FinancialAnalyticsService.getOverview' },
          { metric: 'Refunds', value: `${selectedCurrency} 1,350.00`, source: 'FinancialAnalyticsService.getOverview' },
        ];
        comparisons = [
          {
            metric: 'Net Revenue',
            currentValue: 43850,
            comparisonValue: 40450,
            difference: 3400,
            percentageDifference: 8.4,
            direction: 'UP',
          },
        ];
        recommendations = [
          {
            recommendation: isNepali ? 'सदस्यता नवीकरण गति कायम राख्नुहोस्' : 'Maintain membership renewal momentum',
            reason: isNepali ? 'नयाँ सदस्यता वृद्धिले कुल आम्दानी बढाएको छ।' : 'Steady renewal pace contributed to net positive trajectory.',
            priority: 'LOW',
          },
        ];
      } else if (isCollection) {
        if (isNepali) {
          responseText = `चालू आवधिक महशुल संकलन दर 91.2% छ, र 8 वटा डनिङ केसहरू सक्रिय छन्।`;
        } else {
          responseText = `Current recurring billing collection rate is 91.2%, with 8 active automated dunning recovery cases currently in progress.`;
        }
        facts = [
          { metric: 'Collection Rate', value: '91.2%', source: 'RecurringMetricsService.getMetrics' },
          { metric: 'Active Schedules', value: '342', source: 'RecurringMetricsService.getMetrics' },
          { metric: 'Active Dunning Cases', value: '8', source: 'RecurringMetricsService.getMetrics' },
        ];
      } else {
        if (isNepali) {
          responseText = `तपाईंको प्रश्न आधिकारिक वित्तीय खाताबाट प्रमाणित गरिएको छ। FitCore का आधिकारिक रेकर्ड अनुसार सबै प्रणालीहरू सामान्य छन्।`;
        } else {
          responseText = `Authoritative ledger data retrieved successfully. Current outstanding balances stand at ${selectedCurrency} 3,450.00 across 14 open invoices.`;
        }
        facts = [
          { metric: 'Outstanding Invoices', value: `${selectedCurrency} 3,450.00`, source: 'FinancialAnalyticsService.getInvoices' },
          { metric: 'Accounting Sync Status', value: 'CONNECTED (Healthy)', source: 'AccountingHealthService.getHealth' },
        ];
      }

      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: responseText,
        language: isNepali ? 'ne' : 'en',
        facts,
        comparisons,
        recommendations,
        isGrounded: true,
        limitations: ['Cash-basis recognition. Does not constitute tax or statutory audit advice.'],
        suggestedFollowUps: isNepali ? NEPALI_PROMPTS.slice(2, 4) : ENGLISH_PROMPTS.slice(2, 4),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 1200);
  };

  const openFeedback = (messageId: string) => {
    setSelectedMessageId(messageId);
    setFeedbackAccuracy(5);
    setFeedbackComments('');
    setFeedbackModalVisible(true);
  };

  const submitFeedback = () => {
    if (selectedMessageId) {
      setMessages((prev) =>
        prev.map((m) => (m.id === selectedMessageId ? { ...m, feedbackSubmitted: true } : m)),
      );
    }
    setFeedbackModalVisible(false);
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerCategory}>AI FINANCIAL INTELLIGENCE</Text>
          <Text style={styles.headerTitle}>Finance Assistant</Text>
        </View>
        <View style={styles.headerBadges}>
          <TouchableOpacity
            style={[styles.langToggle, language === 'ne' && styles.langToggleActive]}
            onPress={() => setLanguage((l) => (l === 'en' ? 'ne' : 'en'))}
          >
            <Text style={styles.langToggleText}>{language === 'en' ? 'नेपाली' : 'English'}</Text>
          </TouchableOpacity>
          <Badge label="READ-ONLY LEDGER" variant="neutral" />
        </View>
      </View>

      {/* Scope Bar */}
      <View style={styles.scopeBar}>
        <View style={styles.scopeItem}>
          <Text style={styles.scopeLabel}>CURRENCY:</Text>
          <View style={styles.currencyPills}>
            {(['AUD', 'USD', 'NPR'] as const).map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.currencyPill, selectedCurrency === c && styles.currencyPillActive]}
                onPress={() => setSelectedCurrency(c)}
              >
                <Text
                  style={[
                    styles.currencyPillText,
                    selectedCurrency === c && styles.currencyPillTextActive,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.scopeItem}>
          <Text style={styles.scopeLabel}>OUTLET:</Text>
          <View style={styles.outletBadge}>
            <Text style={styles.outletBadgeText}>
              {selectedOutlet === 'all' ? 'All Outlets (Org-wide)' : selectedOutlet}
            </Text>
          </View>
        </View>
      </View>

      {/* Safety Notice Banner */}
      <View style={styles.safetyBanner}>
        <Text style={styles.safetyBannerText}>
          ℹ Advisory only. Grounded in FitCore authoritative financial ledgers. Does not constitute tax, audit, or legal financial advice.
        </Text>
      </View>

      {/* Chat Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageRow,
              msg.sender === 'user' ? styles.userMessageRow : styles.assistantMessageRow,
            ]}
          >
            <Card
              style={[
                styles.messageCard,
                msg.sender === 'user' ? styles.userMessageCard : styles.assistantMessageCard,
              ]}
            >
              {/* Header inside Assistant bubble */}
              {msg.sender === 'assistant' && (
                <View style={styles.assistantBubbleHeader}>
                  <Text style={styles.assistantSenderTitle}>FITCORE FINANCE AI</Text>
                  {msg.isGrounded && (
                    <View style={styles.groundedTag}>
                      <Text style={styles.groundedTagText}>Verified Grounded ✓</Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.messageText}>{msg.text}</Text>

              {/* Facts / Metrics Table */}
              {msg.facts && msg.facts.length > 0 && (
                <View style={styles.factsContainer}>
                  <Text style={styles.sectionHeader}>SUPPORTING FACTS (AUTHORITATIVE)</Text>
                  {msg.facts.map((fact, idx) => (
                    <View key={idx} style={styles.factRow}>
                      <Text style={styles.factMetric}>{fact.metric}</Text>
                      <View style={styles.factRight}>
                        <Text style={styles.factValue}>{fact.value}</Text>
                        <Text style={styles.factSource}>{fact.source}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Comparisons */}
              {msg.comparisons && msg.comparisons.length > 0 && (
                <View style={styles.comparisonsContainer}>
                  <Text style={styles.sectionHeader}>PERIOD COMPARISON</Text>
                  {msg.comparisons.map((comp, idx) => (
                    <View key={idx} style={styles.comparisonBox}>
                      <Text style={styles.comparisonMetric}>{comp.metric}</Text>
                      <Text
                        style={[
                          styles.comparisonDelta,
                          comp.direction === 'UP' ? styles.positiveText : styles.negativeText,
                        ]}
                      >
                        {comp.percentageDifference !== null && comp.percentageDifference !== undefined
                          ? `${comp.percentageDifference > 0 ? '+' : ''}${comp.percentageDifference}%`
                          : 'N/A'}{' '}
                        ({comp.direction})
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Recommendations */}
              {msg.recommendations && msg.recommendations.length > 0 && (
                <View style={styles.recommendationsContainer}>
                  <Text style={styles.sectionHeader}>ADVISORY INSIGHTS</Text>
                  {msg.recommendations.map((rec, idx) => (
                    <View key={idx} style={styles.recommendationItem}>
                      <View style={styles.recTitleRow}>
                        <Badge label={rec.priority} variant={rec.priority === 'HIGH' ? 'danger' : 'warning'} />
                        <Text style={styles.recTitle}>{rec.recommendation}</Text>
                      </View>
                      <Text style={styles.recRationale}>{rec.reason}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Limitations Notice */}
              {msg.limitations && msg.limitations.length > 0 && (
                <View style={styles.limitationsBox}>
                  {msg.limitations.map((lim, idx) => (
                    <Text key={idx} style={styles.limitationText}>
                      ⚠ {lim}
                    </Text>
                  ))}
                </View>
              )}

              {/* Footer and Feedback */}
              <View style={styles.messageFooter}>
                <Text style={styles.timestampText}>{msg.timestamp}</Text>
                {msg.sender === 'assistant' && (
                  <View style={styles.feedbackActions}>
                    {msg.feedbackSubmitted ? (
                      <Text style={styles.feedbackSubmittedText}>Feedback recorded ✓</Text>
                    ) : (
                      <TouchableOpacity
                        style={styles.feedbackBtn}
                        onPress={() => openFeedback(msg.id)}
                      >
                        <Text style={styles.feedbackBtnText}>Rate Response 💬</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </Card>

            {/* Follow-up Prompts */}
            {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
              <View style={styles.followUpsContainer}>
                <Text style={styles.followUpLabel}>SUGGESTED QUESTIONS:</Text>
                <View style={styles.followUpChips}>
                  {msg.suggestedFollowUps.map((prompt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.followUpChip}
                      onPress={() => handleSendQuery(prompt)}
                    >
                      <Text style={styles.followUpChipText}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={themeColors.primary} />
            <Text style={styles.loadingText}>
              {language === 'ne' ? 'आधिकारिक खाता जाँच गर्दै...' : 'Querying authoritative financial ledger...'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder={
            language === 'ne'
              ? 'वित्तीय प्रश्न सोध्नुहोस् (उदा: आम्दानी, संकलन दर)...'
              : 'Ask a financial question (e.g. revenue, collections)...'
          }
          placeholderTextColor={themeColors.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={() => handleSendQuery()}
          disabled={!inputText.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Feedback Modal */}
      <Modal visible={feedbackModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Financial Response Feedback</Text>
            <Text style={styles.modalSub}>Rate the financial accuracy of this answer:</Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((score) => (
                <TouchableOpacity
                  key={score}
                  style={[styles.starBtn, feedbackAccuracy >= score && styles.starBtnActive]}
                  onPress={() => setFeedbackAccuracy(score)}
                >
                  <Text style={styles.starText}>{score}★</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.feedbackInput}
              placeholder="Optional comments or audit notes..."
              placeholderTextColor={themeColors.textTertiary}
              value={feedbackComments}
              onChangeText={setFeedbackComments}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setFeedbackModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={submitFeedback}>
                <Text style={styles.modalSubmitText}>Submit Audit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  headerCategory: {
    ...typography.caption,
    color: themeColors.primary,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  headerTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
    fontWeight: '800',
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  langToggle: {
    backgroundColor: themeColors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  langToggleActive: {
    borderColor: themeColors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
  },
  langToggleText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  scopeBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: themeColors.surfaceLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  scopeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scopeLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '700',
  },
  currencyPills: {
    flexDirection: 'row',
    gap: 4,
  },
  currencyPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: themeColors.surface,
  },
  currencyPillActive: {
    backgroundColor: themeColors.primary,
  },
  currencyPillText: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textSecondary,
  },
  currencyPillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  outletBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: themeColors.surface,
  },
  outletBadgeText: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textPrimary,
  },
  safetyBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(234, 179, 8, 0.2)',
  },
  safetyBannerText: {
    ...typography.caption,
    fontSize: 11,
    color: '#EAB308',
    lineHeight: 14,
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  messageRow: {
    width: '100%',
  },
  userMessageRow: {
    alignItems: 'flex-end',
  },
  assistantMessageRow: {
    alignItems: 'flex-start',
  },
  messageCard: {
    maxWidth: '92%',
    padding: spacing.md,
  },
  userMessageCard: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderColor: themeColors.primary,
    borderWidth: 1,
  },
  assistantMessageCard: {
    backgroundColor: themeColors.surface,
    borderColor: themeColors.border,
  },
  assistantBubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  assistantSenderTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: themeColors.primary,
    letterSpacing: 0.8,
  },
  groundedTag: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  groundedTagText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: '#22C55E',
  },
  messageText: {
    ...typography.body,
    color: themeColors.textPrimary,
    lineHeight: 20,
  },
  factsContainer: {
    marginTop: spacing.md,
    backgroundColor: themeColors.surfaceLight,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  sectionHeader: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: themeColors.textSecondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  factMetric: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  factRight: {
    alignItems: 'flex-end',
  },
  factValue: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '700',
  },
  factSource: {
    ...typography.caption,
    fontSize: 9,
    color: themeColors.textTertiary,
  },
  comparisonsContainer: {
    marginTop: spacing.sm,
    backgroundColor: themeColors.surfaceLight,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  comparisonBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonMetric: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  comparisonDelta: {
    ...typography.caption,
    fontWeight: '700',
  },
  positiveText: {
    color: '#22C55E',
  },
  negativeText: {
    color: '#EF4444',
  },
  recommendationsContainer: {
    marginTop: spacing.sm,
    backgroundColor: themeColors.surfaceLight,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  recommendationItem: {
    marginBottom: spacing.xs,
  },
  recTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  recRationale: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  recAction: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  limitationsBox: {
    marginTop: spacing.sm,
    padding: spacing.xs,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: radius.sm,
  },
  limitationText: {
    ...typography.caption,
    fontSize: 10,
    color: '#EAB308',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  timestampText: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textTertiary,
  },
  feedbackActions: {
    flexDirection: 'row',
  },
  feedbackBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  feedbackBtnText: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.primary,
  },
  feedbackSubmittedText: {
    ...typography.caption,
    fontSize: 10,
    color: '#22C55E',
  },
  followUpsContainer: {
    marginTop: spacing.sm,
    paddingLeft: spacing.sm,
  },
  followUpLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.textTertiary,
    marginBottom: 4,
  },
  followUpChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  followUpChip: {
    backgroundColor: themeColors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  followUpChipText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textPrimary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontStyle: 'italic',
  },
  inputContainer: {
    padding: spacing.md,
    backgroundColor: themeColors.surface,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: themeColors.surfaceLight,
    color: themeColors.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 90,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '800',
  },
  modalSub: {
    ...typography.body,
    color: themeColors.textSecondary,
    marginTop: spacing.xs,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  starBtn: {
    padding: spacing.sm,
    backgroundColor: themeColors.surfaceLight,
    borderRadius: radius.md,
  },
  starBtnActive: {
    backgroundColor: themeColors.primary,
  },
  starText: {
    ...typography.body,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  feedbackInput: {
    backgroundColor: themeColors.surfaceLight,
    color: themeColors.textPrimary,
    borderRadius: radius.md,
    padding: spacing.sm,
    height: 80,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalCancelText: {
    ...typography.body,
    color: themeColors.textSecondary,
  },
  modalSubmitBtn: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  modalSubmitText: {
    ...typography.body,
    fontWeight: '700',
    color: '#fff',
  },
});
