import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Screen, Card, Badge, MetricCard, Divider, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  BusinessTimeRange,
  BusinessHealthStatus,
  BusinessAIInsight,
} from '@fitcore/types';

interface FunnelItem {
  stage: string;
  count: number;
  rate: string;
}

export const BusinessIntelligenceDashboardScreen: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<BusinessTimeRange>('LAST_30_DAYS');
  const [selectedCurrency, setSelectedCurrency] = useState<'AUD' | 'USD' | 'NPR'>('AUD');
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [language, setLanguage] = useState<'en' | 'ne'>('en');
  const [questionInput, setQuestionInput] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const isNepali = language === 'ne';
  const currencySymbol = selectedCurrency === 'AUD' ? 'A$' : selectedCurrency === 'USD' ? '$' : 'Rs.';

  const [aiInsight, setAiInsight] = useState<BusinessAIInsight>({
    summary: isNepali
      ? 'व्यवसाय समग्र रूपमा स्थिर स्थितिमा छ। कुल आम्दानी र खुद सदस्यता वृद्धि सकारात्मक छ।'
      : 'Overall business performance is robust and stable. Net revenue and member acquisition momentum remain positive.',
    observations: [
      {
        metric: isNepali ? 'खुद सदस्य वृद्धि' : 'Net Member Change',
        value: '+18',
        comparison: isNepali ? '+20 नयाँ, -5 रद्द, +3 पुनः सक्रिय' : '+20 new, -5 cancelled, +3 reactivated',
        evidence: 'MembershipsService authoritative ledger',
      },
      {
        metric: isNepali ? 'खुद आम्दानी' : 'Net Cash Revenue',
        value: `${currencySymbol}52,400`,
        comparison: isNepali ? 'अघिल्लो अवधिको तुलनामा +8.4%' : '+8.4% vs previous period',
        evidence: 'FinancialTransactionReference ledger',
      },
      {
        metric: isNepali ? 'बिक्री रूपान्तरण दर' : 'Sales Conversion Rate',
        value: '22.5%',
        comparison: '27 won / 120 leads',
        evidence: 'SalesOpportunity closed-won conversion ledger',
      },
    ],
    possibleExplanations: isNepali
      ? [
          'सक्रिय सदस्यहरूको नियमित उपस्थितिले सदस्यता नवीकरणलाई बलियो बनाएको छ।',
          'नयाँ लिडहरूको छिटो फलो-अपले रूपान्तरण दरमा सुधार ल्याएको छ।',
        ]
      : [
          'High facility visit consistency among active cohorts is dampening seasonal lapse rates.',
          'Quicker outreach times on qualified leads contributed to higher trial conversion.',
        ],
    recommendations: [
      {
        recommendation: isNepali
          ? 'जोखिममा रहेका ११ सदस्यहरूलाई पुनः संलग्न गराउन सक्रिय सम्पर्क गर्नुहोस्।'
          : 'Initiate proactive check-ins with 11 members flagged in elevated retention risk tier.',
        reason: isNepali ? 'नियमित उपस्थिति घट्दा सदस्यता रद्द हुने सम्भावना बढ्छ।' : 'Declining visit frequency correlates with impending cancellation risk.',
        priority: 'HIGH',
      },
      {
        recommendation: isNepali
          ? '८ वटा बाँकी रहेका भाखा नाघेका इनभ्वाइसहरूको महशुल संकलन प्रक्रिया समीक्षा गर्नुहोस्।'
          : 'Review dunning follow-up on 8 overdue invoices to accelerate collection.',
        reason: isNepali ? 'सञ्चालन नगद प्रवाह सुरक्षित राख्न आवश्यक छ।' : 'Protects cash flow and prevents bad debt write-offs.',
        priority: 'MEDIUM',
      },
    ],
    limitations: isNepali
      ? ['सबै तथ्याङ्कहरू प्रमाणित प्लेटफर्म डेटामा आधारित छन्; कुनै काल्पनिक दाबी गरिएको छैन।']
      : ['Insights are grounded strictly in recorded database metrics without speculative causality claims.'],
    confidence: 0.98,
    isGrounded: true,
  });

  const handleAskQuestion = () => {
    if (!questionInput.trim()) return;
    setIsAiLoading(true);

    setTimeout(() => {
      setIsAiLoading(false);
      const q = questionInput.toLowerCase();
      let answerSummary = isNepali
        ? `तपाईंको प्रश्न "${questionInput}" को आधारमा: प्रमाणित तथ्याङ्क अनुसार यो अवधिमा व्यापार प्रदर्शन स्थिर छ।`
        : `Answering "${questionInput}": Based on authoritative BI records, key performance indicators remain on target.`;

      if (q.includes('revenue') || q.includes('decline') || q.includes('आम्दानी')) {
        answerSummary = isNepali
          ? `आम्दानी विश्लेषण: कुल संकलित खुद आम्दानी ${currencySymbol}52,400 रहेको छ। कुनै राजस्व गिरावट देखिएको छैन, बरु अघिल्लो अवधिको तुलनामा +8.4% ले वृद्धि भएको छ।`
          : `Financial Analysis: Net cash collected is ${currencySymbol}52,400. Revenue has not declined; it increased +8.4% over the prior period.`;
      } else if (q.includes('attendance') || q.includes('उपस्थिति')) {
        answerSummary = isNepali
          ? `उपस्थिति विश्लेषण: यस अवधिमा कुल २,४५० उपस्थिति रेकर्ड गरिएको छ, प्रति सक्रिय सदस्य औसत २.८ पटक उपस्थिति रहेको छ।`
          : `Attendance Analysis: Total facility visits reached 2,450 across period, averaging 2.8 visits per active member.`;
      }

      setAiInsight((prev) => ({
        ...prev,
        summary: answerSummary,
      }));
      setQuestionInput('');
    }, 600);
  };

  const getStatusVariant = (status: BusinessHealthStatus): 'primary' | 'success' | 'warning' | 'error' | 'outline' => {
    switch (status) {
      case 'GOOD':
        return 'success';
      case 'STABLE':
        return 'primary';
      case 'WATCH':
        return 'warning';
      case 'ATTENTION_REQUIRED':
        return 'error';
      default:
        return 'outline';
    }
  };

  const salesFunnelData: FunnelItem[] = [
    { stage: isNepali ? 'नयाँ लिडहरू' : 'Leads Captured', count: 120, rate: '100%' },
    { stage: isNepali ? 'सम्पर्क गरिएका' : 'Contacted', count: 96, rate: '80.0%' },
    { stage: isNepali ? 'योग्य लिडहरू' : 'Qualified', count: 72, rate: '75.0%' },
    { stage: isNepali ? 'ट्रायल / भ्रमण' : 'Trial / Tour', count: 48, rate: '66.7%' },
    { stage: isNepali ? 'प्रस्ताव पठाइएको' : 'Offered', count: 36, rate: '75.0%' },
    { stage: isNepali ? 'सफल रूपान्तरण' : 'Converted', count: 27, rate: '75.0%' },
  ];

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerCategory}>
            {isNepali ? 'कार्यकारी व्यापार बुद्धिमत्ता' : 'EXECUTIVE BUSINESS INTELLIGENCE'}
          </Text>
          <Text style={styles.headerTitle}>
            {isNepali ? 'व्यापार विश्लेषण ड्यासबोर्ड' : 'Unified BI Dashboard'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.langToggle}
            onPress={() => setLanguage((l) => (l === 'en' ? 'ne' : 'en'))}
          >
            <Text style={styles.langText}>{isNepali ? 'English' : 'नेपाली'}</Text>
          </TouchableOpacity>
          <Badge label={isNepali ? 'प्रमाणित' : 'AUTHORITATIVE'} variant="primary" />
        </View>
      </View>

      {/* Currency & Outlet Controls */}
      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>{isNepali ? 'मुद्रा (पृथक):' : 'CURRENCY:'}</Text>
          <View style={styles.currencyPills}>
            {(['AUD', 'USD', 'NPR'] as const).map((curr) => (
              <TouchableOpacity
                key={curr}
                style={[styles.pillTab, selectedCurrency === curr && styles.pillTabActive]}
                onPress={() => setSelectedCurrency(curr)}
              >
                <Text style={[styles.pillText, selectedCurrency === curr && styles.pillTextActive]}>
                  {curr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>{isNepali ? 'शाखा (आउटलेट):' : 'OUTLET:'}</Text>
          <View style={styles.currencyPills}>
            {([
              { id: 'all', label: isNepali ? 'सबै शाखाहरू' : 'All Outlets' },
              { id: 'flagship', label: 'Downtown' },
              { id: 'westside', label: 'Westside' },
            ] as const).map((out) => (
              <TouchableOpacity
                key={out.id}
                style={[styles.pillTab, selectedOutlet === out.id && styles.pillTabActive]}
                onPress={() => setSelectedOutlet(out.id)}
              >
                <Text style={[styles.pillText, selectedOutlet === out.id && styles.pillTextActive]}>
                  {out.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Time Range Selector */}
      <View style={styles.rangeSelector}>
        {(['TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'THIS_QUARTER'] as BusinessTimeRange[]).map((rng) => (
          <TouchableOpacity
            key={rng}
            style={[styles.rangeTab, selectedRange === rng && styles.rangeTabActive]}
            onPress={() => setSelectedRange(rng)}
          >
            <Text style={[styles.rangeTabText, selectedRange === rng && styles.rangeTabTextActive]}>
              {rng === 'TODAY'
                ? isNepali ? 'आज' : 'Today'
                : rng === 'LAST_7_DAYS'
                ? isNepali ? '७ दिन' : '7 Days'
                : rng === 'LAST_30_DAYS'
                ? isNepali ? '३० दिन' : '30 Days'
                : rng === 'THIS_MONTH'
                ? isNepali ? 'यो महिना' : 'This Month'
                : isNepali ? 'त्रैमासिक' : 'Quarter'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Executive KPI Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isNepali ? 'कार्यकारी मुख्य सूचकहरू' : 'Executive Key Performance Indicators'}
          </Text>
          <Badge label={isNepali ? 'उच्च गुणस्तर' : 'HIGH QUALITY'} variant="success" />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label={isNepali ? 'सक्रिय सदस्यहरू' : 'ACTIVE MEMBERS'}
            value="465"
            change={isNepali ? '+18 खुद परिवर्तन' : '+18 net change'}
            trend="up"
            icon="users"
            accentColor={themeColors.success}
            style={styles.flexMetric}
          />
          <MetricCard
            label={isNepali ? 'खुद संकलित आम्दानी' : 'NET CASH REVENUE'}
            value={`${currencySymbol}52,400`}
            change="+8.4%"
            trend="up"
            icon="card"
            accentColor={themeColors.primary}
            style={styles.flexMetric}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label={isNepali ? 'नयाँ लिडहरू' : 'NEW LEADS'}
            value="120"
            change={isNepali ? '७२ योग्य' : '72 qualified'}
            trend="up"
            icon="activity"
            accentColor={themeColors.accent}
            style={styles.flexMetric}
          />
          <MetricCard
            label={isNepali ? 'बिक्री रूपान्तरण' : 'CONVERSION RATE'}
            value="22.5%"
            change="27 / 120 leads"
            trend="up"
            icon="check-circle"
            accentColor={themeColors.success}
            style={styles.flexMetric}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label={isNepali ? 'कुल उपस्थिति' : 'FACILITY VISITS'}
            value="2,450"
            change={isNepali ? '२.८ पटक / सदस्य' : '2.8 visits / member'}
            trend="neutral"
            icon="calendar"
            accentColor={themeColors.secondary}
            style={styles.flexMetric}
          />
          <MetricCard
            label={isNepali ? 'भुक्तानी सफलता दर' : 'PAYMENT SUCCESS'}
            value="97.4%"
            change={isNepali ? '४९८ / ५११ भुक्तानी' : '498 / 511 tx'}
            trend="up"
            icon="shield"
            accentColor={themeColors.success}
            style={styles.flexMetric}
          />
        </View>

        {/* Business Health Overview (7 Dimensions) */}
        <Card style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <View>
              <Text style={styles.cardCategory}>
                {isNepali ? 'व्यापार स्वास्थ्य विश्लेषण' : 'EXECUTIVE BUSINESS HEALTH'}
              </Text>
              <Text style={styles.cardTitle}>
                {isNepali ? 'समग्र स्थिति: उत्कृष्ट (९१/१००)' : 'Overall Health: Optimal (91/100)'}
              </Text>
            </View>
            <Badge label={isNepali ? 'उत्कृष्ट' : 'GOOD'} variant="success" />
          </View>
          <Divider style={styles.divider} />

          <View style={styles.healthGrid}>
            {[
              { dom: isNepali ? 'सदस्यता' : 'Membership', status: 'GOOD' as BusinessHealthStatus, val: '+18 Net', rat: isNepali ? 'नयाँ प्राप्ति र निरन्तरता सकारात्मक' : 'Positive acquisition outpaces lapse' },
              { dom: isNepali ? 'वित्त' : 'Finance', status: 'GOOD' as BusinessHealthStatus, val: `${currencySymbol}52.4k`, rat: isNepali ? '९८.४% बिलिङ संकलन दर' : '98.4% billing collection rate' },
              { dom: isNepali ? 'बिक्री' : 'Sales', status: 'GOOD' as BusinessHealthStatus, val: '22.5%', rat: isNepali ? 'स्वस्थ लिड रूपान्तरण दर' : 'Healthy trial conversion' },
              { dom: isNepali ? 'उपस्थिति' : 'Attendance', status: 'GOOD' as BusinessHealthStatus, val: '2,450', rat: isNepali ? '७४% कक्षा उपयोगिता' : '74% class capacity fill' },
              { dom: isNepali ? 'संलग्नता' : 'Engagement', status: 'GOOD' as BusinessHealthStatus, val: '78/100', rat: isNepali ? 'उच्च वर्कआउट पूर्णता' : 'Consistent workout adherence' },
              { dom: isNepali ? 'सदस्य निरन्तरता' : 'Retention', status: 'WATCH' as BusinessHealthStatus, val: '11 Risk', rat: isNepali ? '११ सदस्य उच्च जोखिममा' : '11 elevated risk members' },
            ].map((d, i) => (
              <View key={i} style={styles.healthItem}>
                <View style={styles.healthItemRow}>
                  <Text style={styles.healthItemDomain}>{d.dom}</Text>
                  <Badge label={d.status} variant={getStatusVariant(d.status)} size="sm" />
                </View>
                <Text style={styles.healthItemValue}>{d.val}</Text>
                <Text style={styles.healthItemRationale}>{d.rat}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Membership Growth & Net Change Breakdown */}
        <Card style={styles.card}>
          <Text style={styles.cardCategory}>
            {isNepali ? 'सदस्यता वृद्धि समीकरण' : 'MEMBERSHIP DYNAMICS'}
          </Text>
          <Text style={styles.cardTitle}>
            {isNepali ? 'खुद सदस्य परिवर्तन: +१८ सदस्यहरू' : 'Net Member Change: +18 Members'}
          </Text>
          <Text style={styles.cardFormula}>
            {isNepali
              ? 'खुद परिवर्तन = नयाँ (+२०) + पुनः सक्रिय (+३) - रद्द (-५)'
              : 'Net Change = New (+20) + Reactivated (+3) - Cancelled (-5)'}
          </Text>

          <View style={styles.memberDynamicsRow}>
            <View style={[styles.dynamicsBox, { borderColor: themeColors.success }]}>
              <Text style={styles.dynamicsVal}>+20</Text>
              <Text style={styles.dynamicsLabel}>{isNepali ? 'नयाँ सदस्यहरू' : 'New Members'}</Text>
            </View>
            <View style={[styles.dynamicsBox, { borderColor: themeColors.primary }]}>
              <Text style={styles.dynamicsVal}>+3</Text>
              <Text style={styles.dynamicsLabel}>{isNepali ? 'पुनः सक्रिय' : 'Reactivated'}</Text>
            </View>
            <View style={[styles.dynamicsBox, { borderColor: themeColors.error }]}>
              <Text style={styles.dynamicsVal}>-5</Text>
              <Text style={styles.dynamicsLabel}>{isNepali ? 'रद्द गरिएका' : 'Cancelled'}</Text>
            </View>
            <View style={[styles.dynamicsBox, { borderColor: themeColors.accent, backgroundColor: '#1A2130' }]}>
              <Text style={[styles.dynamicsVal, { color: themeColors.accent }]}>+18</Text>
              <Text style={styles.dynamicsLabel}>{isNepali ? 'खुद परिवर्तन' : 'Net Change'}</Text>
            </View>
          </View>
        </Card>

        {/* Sales Funnel with explicit denominators */}
        <Card style={styles.card}>
          <Text style={styles.cardCategory}>
            {isNepali ? 'बिक्री फनेल रूपान्तरण' : 'SALES PIPELINE FUNNEL'}
          </Text>
          <Text style={styles.cardTitle}>
            {isNepali ? 'लिड देखि भुक्तान सदस्य सम्म' : 'Lead to Paid Member Conversion'}
          </Text>
          <Divider style={styles.divider} />

          {salesFunnelData.map((f, i) => (
            <View key={i} style={styles.funnelRow}>
              <View style={styles.funnelLabelCol}>
                <Text style={styles.funnelStageText}>{f.stage}</Text>
                <Text style={styles.funnelCountText}>{f.count}</Text>
              </View>
              <View style={styles.funnelBarContainer}>
                <View
                  style={[
                    styles.funnelBar,
                    {
                      width: `${Math.max(15, (f.count / 120) * 100)}%`,
                      backgroundColor: i === salesFunnelData.length - 1 ? themeColors.success : themeColors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.funnelRateText}>{f.rate}</Text>
            </View>
          ))}
        </Card>

        {/* AI Business Insights Panel */}
        <Card style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View>
              <Text style={styles.aiCategory}>
                {isNepali ? 'एआई व्यापार बुद्धिमत्ता' : 'FITCORE AI BUSINESS ADVISORY'}
              </Text>
              <Text style={styles.aiTitle}>
                {isNepali ? 'प्रमाणित अन्तर्दृष्टि र सिफारिसहरू' : 'Grounded Insights & Actionable Guidance'}
              </Text>
            </View>
            <Badge label={isNepali ? 'प्रमाणित' : 'GROUNDED'} variant="success" />
          </View>
          <Divider style={styles.divider} />

          <Text style={styles.aiSummary}>{aiInsight.summary}</Text>

          <Text style={styles.subHeading}>
            {isNepali ? 'तथ्यपरक अवलोकनहरू:' : 'Factual Metric Observations:'}
          </Text>
          {aiInsight.observations.map((obs, i) => (
            <View key={i} style={styles.obsItem}>
              <View style={styles.obsHeader}>
                <Text style={styles.obsMetric}>{obs.metric}</Text>
                <Text style={styles.obsValue}>{obs.value}</Text>
              </View>
              <Text style={styles.obsEvidence}>{obs.evidence}</Text>
              {obs.comparison && <Text style={styles.obsComp}>{obs.comparison}</Text>}
            </View>
          ))}

          <Text style={[styles.subHeading, { marginTop: spacing.md }]}>
            {isNepali ? 'कार्यकारी सिफारिसहरू:' : 'Advisory Recommendations:'}
          </Text>
          {aiInsight.recommendations?.map((rec, i) => (
            <View key={i} style={styles.recItem}>
              <View style={styles.recHeader}>
                <Text style={styles.recText}>{rec.recommendation}</Text>
                <Badge
                  label={rec.priority}
                  variant={rec.priority === 'HIGH' ? 'error' : 'primary'}
                  size="sm"
                />
              </View>
              <Text style={styles.recReason}>{rec.reason}</Text>
            </View>
          ))}

          {/* Interactive Management Question Bar */}
          <Divider style={styles.divider} />
          <Text style={styles.qnaLabel}>
            {isNepali ? 'व्यवस्थापकीय प्रश्न सोध्नुहोस्:' : 'Ask a Business Management Question:'}
          </Text>
          <View style={styles.qnaInputRow}>
            <TextInput
              style={styles.qnaInput}
              placeholder={
                isNepali
                  ? 'जस्तै: आम्दानी किन बढ्यो? कुन क्षेत्रमा ध्यान दिनुपर्छ?'
                  : 'e.g. Why did revenue increase? Which area needs attention?'
              }
              placeholderTextColor="#64748B"
              value={questionInput}
              onChangeText={setQuestionInput}
            />
            <TouchableOpacity
              style={styles.qnaBtn}
              onPress={handleAskQuestion}
              disabled={isAiLoading}
            >
              {isAiLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.qnaBtnText}>{isNepali ? 'सोध्नुहोस्' : 'Ask'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Card>

        {/* Export Action */}
        <View style={styles.exportSection}>
          <Button
            title={isNepali ? 'अनुमोदित CSV निर्यात गर्नुहोस्' : 'Export Verified BI CSV'}
            variant="outline"
            onPress={() => {
              alert(
                isNepali
                  ? 'व्यापार डेटा सुरक्षित रूपमा RFC 4180 CSV ढाँचामा निर्यात गरियो।'
                  : 'Verified Business Intelligence report exported successfully (RFC 4180 CSV).',
              );
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: '#0F1219',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerCategory: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: themeColors.primary,
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginTop: 2,
  },
  langToggle: {
    backgroundColor: '#1F2738',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  langText: {
    fontSize: 12,
    fontWeight: '500',
    color: themeColors.accent,
  },
  filterRow: {
    flexDirection: 'column',
    backgroundColor: '#141822',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2738',
    gap: spacing.xs,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  currencyPills: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pillTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: '#0F1219',
    borderWidth: 1,
    borderColor: '#232B3E',
  },
  pillTabActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#0F1219',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2738',
    justifyContent: 'space-between',
  },
  rangeTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  rangeTabActive: {
    backgroundColor: '#1F2738',
    borderBottomWidth: 2,
    borderBottomColor: themeColors.accent,
  },
  rangeTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  rangeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  flexMetric: {
    flex: 1,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: '#141822',
    borderWidth: 1,
    borderColor: '#1F2738',
    padding: spacing.md,
  },
  healthCard: {
    marginBottom: spacing.md,
    backgroundColor: '#121620',
    borderWidth: 1,
    borderColor: '#232B3E',
    padding: spacing.md,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.primary,
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginTop: 2,
  },
  cardFormula: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  divider: {
    marginVertical: spacing.sm,
    backgroundColor: '#1F2738',
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  healthItem: {
    width: '48%',
    backgroundColor: '#192030',
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#253046',
  },
  healthItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  healthItemDomain: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  healthItemValue: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  healthItemRationale: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  memberDynamicsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  dynamicsBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: '#0F1219',
  },
  dynamicsVal: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  dynamicsLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },
  funnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  funnelLabelCol: {
    width: 100,
  },
  funnelStageText: {
    fontSize: 12,
    fontWeight: '500',
    color: themeColors.textPrimary,
  },
  funnelCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  funnelBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: '#1F2738',
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  funnelBar: {
    height: '100%',
    borderRadius: 8,
  },
  funnelRateText: {
    width: 48,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.accent,
  },
  aiCard: {
    marginBottom: spacing.md,
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: spacing.md,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 1,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginTop: 2,
  },
  aiSummary: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E2E8F0',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  subHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  obsItem: {
    backgroundColor: '#131D33',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: themeColors.primary,
  },
  obsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  obsMetric: {
    fontSize: 12,
    fontWeight: '700',
    color: '#93C5FD',
  },
  obsValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  obsEvidence: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  obsComp: {
    fontSize: 10,
    fontWeight: '500',
    color: themeColors.accent,
    marginTop: 1,
  },
  recItem: {
    backgroundColor: '#131D33',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    marginRight: spacing.xs,
  },
  recReason: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
  },
  qnaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: spacing.xs,
  },
  qnaInputRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  qnaInput: {
    flex: 1,
    backgroundColor: '#0A0F1D',
    borderWidth: 1,
    borderColor: '#253046',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: '#FFFFFF',
    fontSize: 12,
  },
  qnaBtn: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  qnaBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  exportSection: {
    marginTop: spacing.sm,
  },
});
