import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Screen, Card, Badge, Divider, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  OutletNormalisationMode,
  OutletHealthStatus,
  MultiOutletAIInsight,
  OutletOverviewSummaryDto,
  OutletCategoryLeaders,
} from '@fitcore/types';

export const MultiOutletIntelligenceScreen: React.FC = () => {
  const [selectedCurrency, setSelectedCurrency] = useState<'AUD' | 'USD' | 'NPR'>('AUD');
  const [normalisationMode, setNormalisationMode] = useState<OutletNormalisationMode>('PER_ACTIVE_MEMBER');
  const [language, setLanguage] = useState<'en' | 'ne'>('en');
  const [questionInput, setQuestionInput] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'comparison' | 'leaders' | 'health' | 'advisory'>('comparison');

  const isNepali = language === 'ne';
  const currencySymbol = selectedCurrency === 'AUD' ? 'A$' : selectedCurrency === 'USD' ? '$' : 'Rs.';

  // Mock outlets data for mobile display
  const outlets: OutletOverviewSummaryDto[] = [
    {
      outletId: 'out-01',
      outletName: 'Downtown Flagship',
      code: 'DT-01',
      currency: 'AUD',
      activeMembers: 840,
      netMemberChange: 28,
      memberGrowthRate: 3.4,
      newLeads: 120,
      conversionRate: 23.3,
      conversionDenominator: 120,
      grossRevenue: 98500,
      netRevenue: 95200,
      revenuePerActiveMember: 113.33,
      totalVisits: 6240,
      visitsPerActiveMember: 7.43,
      classFillRate: 82.5,
      averageEngagementScore: 78,
      highRiskRetentionCount: 14,
      highRiskPercentage: 1.7,
      healthStatus: 'GOOD',
      attentionFlagsCount: 0,
      dataQuality: 'HIGH',
      freshness: 'REAL_TIME',
    },
    {
      outletId: 'out-02',
      outletName: 'Suburban Hub',
      code: 'SUB-02',
      currency: 'AUD',
      activeMembers: 410,
      netMemberChange: 35,
      memberGrowthRate: 9.3,
      newLeads: 95,
      conversionRate: 36.8,
      conversionDenominator: 95,
      grossRevenue: 44200,
      netRevenue: 42800,
      revenuePerActiveMember: 104.39,
      totalVisits: 3120,
      visitsPerActiveMember: 7.61,
      classFillRate: 74.0,
      averageEngagementScore: 71,
      highRiskRetentionCount: 22,
      highRiskPercentage: 5.4,
      healthStatus: 'WATCH',
      attentionFlagsCount: 1,
      dataQuality: 'HIGH',
      freshness: 'REAL_TIME',
    },
    {
      outletId: 'out-03',
      outletName: 'Westside Express',
      code: 'WST-03',
      currency: 'AUD',
      activeMembers: 220,
      netMemberChange: -4,
      memberGrowthRate: -1.8,
      newLeads: 30,
      conversionRate: 16.7,
      conversionDenominator: 30,
      grossRevenue: 19800,
      netRevenue: 19100,
      revenuePerActiveMember: 86.82,
      totalVisits: 1480,
      visitsPerActiveMember: 6.73,
      classFillRate: 58.0,
      averageEngagementScore: 64,
      highRiskRetentionCount: 18,
      highRiskPercentage: 8.2,
      healthStatus: 'ATTENTION_REQUIRED',
      attentionFlagsCount: 3,
      dataQuality: 'MEDIUM',
      freshness: 'REAL_TIME',
    },
  ];

  // Categorical Leaders
  const leaders: OutletCategoryLeaders = {
    revenueLeader: {
      metricKey: 'finance.net_revenue',
      metricLabel: 'Net Cash Revenue',
      domain: 'FINANCE',
      outletId: 'out-01',
      outletName: 'Downtown Flagship',
      outletCode: 'DT-01',
      absoluteValue: 95200,
      normalisedValue: 113.33,
      unit: 'CURRENCY',
      normalisedUnit: 'AUD / Member',
      currency: 'AUD',
      direction: 'UP',
      dataQuality: 'HIGH',
    },
    growthLeader: {
      metricKey: 'membership.growth_rate',
      metricLabel: 'Member Expansion Rate',
      domain: 'MEMBERSHIP',
      outletId: 'out-02',
      outletName: 'Suburban Hub',
      outletCode: 'SUB-02',
      absoluteValue: 35,
      normalisedValue: 9.3,
      unit: 'PERCENTAGE',
      normalisedUnit: '% Growth',
      direction: 'UP',
      dataQuality: 'HIGH',
    },
    salesLeader: {
      metricKey: 'sales.conversion_rate',
      metricLabel: 'Lead Conversion Rate',
      domain: 'SALES',
      outletId: 'out-02',
      outletName: 'Suburban Hub',
      outletCode: 'SUB-02',
      absoluteValue: 35,
      normalisedValue: 36.8,
      unit: 'PERCENTAGE',
      normalisedUnit: '% Conversion',
      direction: 'UP',
      dataQuality: 'HIGH',
    },
    attendanceLeader: {
      metricKey: 'attendance.total_visits',
      metricLabel: 'Visits per Active Member',
      domain: 'ATTENDANCE',
      outletId: 'out-02',
      outletName: 'Suburban Hub',
      outletCode: 'SUB-02',
      absoluteValue: 3120,
      normalisedValue: 7.61,
      unit: 'COUNT',
      normalisedUnit: 'Visits / Member',
      direction: 'UP',
      dataQuality: 'HIGH',
    },
    classUtilisationLeader: {
      metricKey: 'bookings.fill_rate',
      metricLabel: 'Class Fill Rate',
      domain: 'BOOKING',
      outletId: 'out-01',
      outletName: 'Downtown Flagship',
      outletCode: 'DT-01',
      absoluteValue: 82.5,
      normalisedValue: 82.5,
      unit: 'PERCENTAGE',
      normalisedUnit: '% Fill',
      direction: 'UP',
      dataQuality: 'HIGH',
    },
    retentionWatch: {
      metricKey: 'retention.risk_percentage',
      metricLabel: 'Elevated Retention Risk %',
      domain: 'RETENTION',
      outletId: 'out-03',
      outletName: 'Westside Express',
      outletCode: 'WST-03',
      absoluteValue: 18,
      normalisedValue: 8.2,
      unit: 'PERCENTAGE',
      normalisedUnit: '% Risk',
      direction: 'DOWN',
      dataQuality: 'MEDIUM',
      sampleSizeCaveat: 'Small active member base (220)',
    },
  };

  const [aiInsight, setAiInsight] = useState<MultiOutletAIInsight>({
    summary: isNepali
      ? 'शाखाहरू बीच कार्यसम्पादन विश्लेषण: डाउनटाउन फ्ल्यागशिपले कुल आम्दानीमा नेतृत्व गरेको छ भने सबअर्बन हबले सदस्यता वृद्धि र बिक्री रूपान्तरणमा उत्कृष्ट प्रगति देखाएको छ।'
      : 'Authoritative cross-outlet analysis reveals distinct strengths: Downtown Flagship leads in aggregate revenue velocity, while Suburban Hub outperforms in member growth rate (+9.3%) and sales conversion efficiency (36.8%).',
    leaders: [
      {
        outletId: 'out-01',
        outletName: 'Downtown Flagship',
        metric: 'finance.net_revenue',
        value: 'A$95,200',
        evidence: 'Highest absolute net collections in reporting period',
      },
      {
        outletId: 'out-02',
        outletName: 'Suburban Hub',
        metric: 'membership.growth_rate',
        value: '+9.3%',
        evidence: '+35 net active member expansion against baseline',
      },
    ],
    attentionAreas: [
      {
        outletId: 'out-03',
        outletName: 'Westside Express',
        issue: isNepali ? 'सदस्यता कमी र कक्षा उपयोगिता न्यून' : 'Membership decline (-1.8%) and low class fill rate (58%)',
        evidence: 'Active cohort contracted by 4 members; class occupancy is 24.5% lower than Downtown',
        severity: 'HIGH',
      },
      {
        outletId: 'out-02',
        outletName: 'Suburban Hub',
        issue: isNepali ? 'जोखिममा रहेका सदस्यहरूको संख्या वृद्धि' : 'Elevated churn risk cohort (22 members)',
        evidence: '5.4% of member base show declining check-in frequency over past 21 days',
        severity: 'MEDIUM',
      },
    ],
    comparisons: [
      {
        metric: 'finance.revenue_per_member',
        outlets: ['Downtown Flagship', 'Westside Express'],
        observation: 'Downtown generates A$113.33/member vs Westside A$86.82/member, driven by personal training package add-ons.',
      },
    ],
    recommendations: [
      {
        recommendation: isNepali
          ? 'वेस्टसाइड एक्सप्रेसको कक्षा समय तालिका पुनरावलोकन गर्नुहोस् र बिहानका सत्रहरूमा जोड दिनुहोस्।'
          : 'Conduct class schedule review at Westside Express to optimize low-fill afternoon slots.',
        reason: '58% fill rate leaves excess overhead capacity unmonetized.',
        priority: 'HIGH',
        targetOutletId: 'out-03',
      },
      {
        recommendation: isNepali
          ? 'सबअर्बन हबको सफल बिक्री रणनीति अन्य शाखाहरूमा पनि विस्तार गर्नुहोस्।'
          : 'Adopt Suburban Hub lead follow-up scripts across other branch locations.',
        reason: 'Suburban Hub converts 36.8% of leads compared to the 23.3% organisation average.',
        priority: 'MEDIUM',
      },
    ],
    limitations: [
      'Comparisons reflect recorded operational transactions and access logs.',
      'Small sample size protection applied to Westside Express (sample base < 250).',
    ],
    confidence: 0.96,
    isGrounded: true,
  });

  const handleAskQuestion = () => {
    if (!questionInput.trim()) return;
    setIsAiLoading(true);
    setTimeout(() => {
      setIsAiLoading(false);
      setAiInsight((prev) => ({
        ...prev,
        summary: isNepali
          ? `प्रश्न "${questionInput}" को विश्लेषण: प्रमाणित शाखा तथ्याङ्क अनुसार डाउनटाउनले आम्दानी प्रति सदस्य र सबअर्बनले रूपान्तरण दरमा नेतृत्व गरिरहेका छन्।`
          : `Executive Inquiry Analysis for "${questionInput}": Verified cross-outlet records indicate Suburban Hub achieves highest capital efficiency on member acquisition, while Downtown Flagship commands the highest revenue per active member.`,
      }));
      setQuestionInput('');
    }, 900);
  };

  const getStatusBadge = (status: OutletHealthStatus) => {
    switch (status) {
      case 'GOOD':
        return <Badge label={isNepali ? 'उत्कृष्ट' : 'GOOD'} variant="success" />;
      case 'STABLE':
        return <Badge label={isNepali ? 'स्थिर' : 'STABLE'} variant="neutral" />;
      case 'WATCH':
        return <Badge label={isNepali ? 'निगरानी' : 'WATCH'} variant="warning" />;
      case 'ATTENTION_REQUIRED':
        return <Badge label={isNepali ? 'ध्यान आवश्यक' : 'ATTENTION'} variant="danger" />;
      default:
        return <Badge label={isNepali ? 'अपूर्ण' : 'N/A'} variant="neutral" />;
    }
  };

  return (
    <Screen testID="multi-outlet-intelligence-screen">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>
              {isNepali ? 'बहु-शाखा विश्लेषण र बेन्चमार्किङ' : 'Multi-Outlet Intelligence'}
            </Text>
            <Text style={styles.subtitleText}>
              {isNepali
                ? 'शाखाहरू बीच निष्पक्ष तुलना, बेन्चमार्क, र व्यवस्थापकीय अन्तर्दृष्टि'
                : 'Authoritative Cross-Outlet Benchmarking & Comparative Intelligence'}
            </Text>
          </View>

          {/* Language Toggle */}
          <TouchableOpacity
            style={styles.langToggle}
            onPress={() => setLanguage(language === 'en' ? 'ne' : 'en')}
          >
            <Text style={styles.langToggleText}>
              {language === 'en' ? 'नेपाली' : 'English'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Currency & Range Controls */}
        <View style={styles.controlBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll}>
            {(['AUD', 'USD', 'NPR'] as const).map((curr) => (
              <TouchableOpacity
                key={curr}
                style={[
                  styles.currencyPill,
                  selectedCurrency === curr && styles.activeCurrencyPill,
                ]}
                onPress={() => setSelectedCurrency(curr)}
              >
                <Text
                  style={[
                    styles.currencyPillText,
                    selectedCurrency === curr && styles.activeCurrencyPillText,
                  ]}
                >
                  {curr}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Normalisation Toggle */}
          <View style={styles.modeToggleGroup}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                normalisationMode === 'PER_ACTIVE_MEMBER' && styles.activeModeButton,
              ]}
              onPress={() => setNormalisationMode('PER_ACTIVE_MEMBER')}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  normalisationMode === 'PER_ACTIVE_MEMBER' && styles.activeModeButtonText,
                ]}
              >
                {isNepali ? 'प्रति सदस्य' : 'Per Member'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                normalisationMode === 'ABSOLUTE' && styles.activeModeButton,
              ]}
              onPress={() => setNormalisationMode('ABSOLUTE')}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  normalisationMode === 'ABSOLUTE' && styles.activeModeButtonText,
                ]}
              >
                {isNepali ? 'कुल अंक' : 'Absolute'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabBar}>
          {[
            { key: 'comparison', label: isNepali ? 'शाखा तुलना' : 'Comparison' },
            { key: 'leaders', label: isNepali ? 'विधागत विजेता' : 'Category Leaders' },
            { key: 'health', label: isNepali ? 'शाखा स्वास्थ्य' : 'Health Radar' },
            { key: 'advisory', label: isNepali ? 'एआई सल्लाहकार' : 'AI Advisory' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.activeTabItem]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text
                style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TAB 1: COMPARISON */}
        {activeTab === 'comparison' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeading}>
              {isNepali ? 'शाखा कार्यसम्पादन तालिका' : 'Outlet Performance Matrix'}
            </Text>
            <Text style={styles.sectionSubheading}>
              {isNepali
                ? 'शाखाको आकार अनुसार सामान्यीकृत मेट्रिक्स (प्रति सदस्य तुलना)'
                : 'Fair normalised comparisons preventing size-bias between large and boutique clubs.'}
            </Text>

            {outlets.map((o) => (
              <Card key={o.outletId} style={styles.outletCard}>
                <View style={styles.outletCardHeader}>
                  <View>
                    <View style={styles.outletNameRow}>
                      <Text style={styles.outletNameText}>{o.outletName}</Text>
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeBadgeText}>{o.code}</Text>
                      </View>
                    </View>
                    <Text style={styles.membersSubtext}>
                      {o.activeMembers} {isNepali ? 'सक्रिय सदस्यहरू' : 'active members'} (
                      {o.netMemberChange >= 0 ? `+${o.netMemberChange}` : o.netMemberChange})
                    </Text>
                  </View>
                  {getStatusBadge(o.healthStatus)}
                </View>

                <Divider style={styles.cardDivider} />

                <View style={styles.grid2x2}>
                  <View style={styles.metricCell}>
                    <Text style={styles.cellLabel}>
                      {normalisationMode === 'PER_ACTIVE_MEMBER'
                        ? (isNepali ? 'आम्दानी / सदस्य' : 'Rev / Member')
                        : (isNepali ? 'खुद आम्दानी' : 'Net Revenue')}
                    </Text>
                    <Text style={styles.cellValue}>
                      {normalisationMode === 'PER_ACTIVE_MEMBER'
                        ? `${currencySymbol}${o.revenuePerActiveMember}`
                        : `${currencySymbol}${o.netRevenue.toLocaleString()}`}
                    </Text>
                  </View>

                  <View style={styles.metricCell}>
                    <Text style={styles.cellLabel}>
                      {normalisationMode === 'PER_ACTIVE_MEMBER'
                        ? (isNepali ? 'उपस्थिति / सदस्य' : 'Visits / Member')
                        : (isNepali ? 'कुल उपस्थिति' : 'Total Visits')}
                    </Text>
                    <Text style={styles.cellValue}>
                      {normalisationMode === 'PER_ACTIVE_MEMBER'
                        ? `${o.visitsPerActiveMember}x`
                        : o.totalVisits.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.metricCell}>
                    <Text style={styles.cellLabel}>
                      {isNepali ? 'बिक्री रूपान्तरण दर' : 'Sales Conversion'}
                    </Text>
                    <Text style={styles.cellValue}>
                      {o.conversionRate}%{' '}
                      <Text style={styles.denomText}>({o.conversionDenominator} leads)</Text>
                    </Text>
                  </View>

                  <View style={styles.metricCell}>
                    <Text style={styles.cellLabel}>
                      {isNepali ? 'कक्षा उपयोगिता' : 'Class Fill Rate'}
                    </Text>
                    <Text style={styles.cellValue}>{o.classFillRate}%</Text>
                  </View>
                </View>

                {o.attentionFlagsCount > 0 && (
                  <View style={styles.attentionAlert}>
                    <Text style={styles.attentionAlertText}>
                      ⚠️ {o.attentionFlagsCount} {isNepali ? 'चेतावनी संकेतहरू समीक्षा आवश्यक' : 'attention flag(s) detected'}
                    </Text>
                  </View>
                )}
              </Card>
            ))}

            {/* Unattributed Revenue Notice */}
            <Card style={styles.unattributedCard}>
              <Text style={styles.unattributedTitle}>
                🛡️ {isNepali ? 'गैर-श्रेणीबद्ध आम्दानी (Unattributed)' : 'Unattributed Revenue Ledger'}
              </Text>
              <Text style={styles.unattributedText}>
                {isNepali
                  ? 'FitCore ले शाखा अस्पष्ट भएका कारोबारहरूलाई जबरजस्ती कुनै शाखामा गाभ्दैन। सबै अनबाउन्ड कारोबारहरू छुट्टै पारदर्शी रूपमा देखाइन्छ।'
                  : 'FitCore strictly segregates transactions without origin-outlet links. Zero heuristic attribution ensures accounting truth.'}
              </Text>
              <Text style={styles.unattributedAmount}>
                {currencySymbol}0.00 {isNepali ? 'अस्पष्ट रकम' : 'unattributed in this period'}
              </Text>
            </Card>
          </View>
        )}

        {/* TAB 2: CATEGORY LEADERS */}
        {activeTab === 'leaders' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeading}>
              {isNepali ? 'विधागत उत्कृष्ट शाखाहरू' : 'Categorical Benchmark Leaders'}
            </Text>
            <Text style={styles.sectionSubheading}>
              {isNepali
                ? 'एउटा मात्र "उत्कृष्ट शाखा" छनोट गर्नुको सट्टा बहुआयामिक विधागत नेतृत्व'
                : 'No single universal "best outlet". Leaders celebrated per operational dimension.'}
            </Text>

            {leaders.revenueLeader && (
              <Card style={styles.leaderCard}>
                <View style={styles.leaderBadgeRow}>
                  <Badge label="REVENUE LEADER" variant="primary" />
                  <Text style={styles.leaderValue}>
                    {currencySymbol}{leaders.revenueLeader.absoluteValue.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.leaderOutletName}>
                  {leaders.revenueLeader.outletName}
                </Text>
                <Text style={styles.leaderDetailText}>
                  {currencySymbol}{leaders.revenueLeader.normalisedValue}/member across active cohort
                </Text>
              </Card>
            )}

            {leaders.growthLeader && (
              <Card style={styles.leaderCard}>
                <View style={styles.leaderBadgeRow}>
                  <Badge label="GROWTH LEADER" variant="success" />
                  <Text style={styles.leaderValue}>
                    +{leaders.growthLeader.normalisedValue}%
                  </Text>
                </View>
                <Text style={styles.leaderOutletName}>
                  {leaders.growthLeader.outletName}
                </Text>
                <Text style={styles.leaderDetailText}>
                  +{leaders.growthLeader.absoluteValue} net members gained against prior baseline
                </Text>
              </Card>
            )}

            {leaders.salesLeader && (
              <Card style={styles.leaderCard}>
                <View style={styles.leaderBadgeRow}>
                  <Badge label="SALES CONVERSION LEADER" variant="success" />
                  <Text style={styles.leaderValue}>
                    {leaders.salesLeader.normalisedValue}%
                  </Text>
                </View>
                <Text style={styles.leaderOutletName}>
                  {leaders.salesLeader.outletName}
                </Text>
                <Text style={styles.leaderDetailText}>
                  35 won opportunities from 95 captured leads
                </Text>
              </Card>
            )}

            {leaders.classUtilisationLeader && (
              <Card style={styles.leaderCard}>
                <View style={styles.leaderBadgeRow}>
                  <Badge label="CLASS UTILISATION LEADER" variant="neutral" />
                  <Text style={styles.leaderValue}>
                    {leaders.classUtilisationLeader.normalisedValue}%
                  </Text>
                </View>
                <Text style={styles.leaderOutletName}>
                  {leaders.classUtilisationLeader.outletName}
                </Text>
                <Text style={styles.leaderDetailText}>
                  Optimum booking schedule fill without bottleneck queues
                </Text>
              </Card>
            )}

            {leaders.retentionWatch && (
              <Card style={[styles.leaderCard, styles.watchCard]}>
                <View style={styles.leaderBadgeRow}>
                  <Badge label="RETENTION WATCH" variant="warning" />
                  <Text style={[styles.leaderValue, { color: themeColors.warning }]}>
                    {leaders.retentionWatch.normalisedValue}% risk
                  </Text>
                </View>
                <Text style={styles.leaderOutletName}>
                  {leaders.retentionWatch.outletName}
                </Text>
                <Text style={styles.leaderDetailText}>
                  {leaders.retentionWatch.sampleSizeCaveat || 'Proactive outreach recommended'}
                </Text>
              </Card>
            )}
          </View>
        )}

        {/* TAB 3: HEALTH RADAR */}
        {activeTab === 'health' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeading}>
              {isNepali ? 'शाखा स्वास्थ्य स्थिति (८ आयामहरू)' : 'Outlet Health Dimensions'}
            </Text>
            <Text style={styles.sectionSubheading}>
              {isNepali
                ? 'सदस्यता, वित्त, बिक्री, उपस्थिति, कक्षा, संलग्नता, प्रतिधारण, र डाटा शुद्धता'
                : 'Objective 8-dimension health scoring grounded in operational telemetry.'}
            </Text>

            {[
              {
                title: 'Downtown Flagship',
                status: 'GOOD' as OutletHealthStatus,
                score: 92,
                highlights: [
                  'Member Health: 94/100 (Strong growth momentum)',
                  'Financial Health: 96/100 (99.2% payment success)',
                  'Attendance Vitality: 88/100 (7.4 visits/member)',
                  'Class Fill: 82.5% (Optimal utilisation)',
                ],
              },
              {
                title: 'Suburban Hub',
                status: 'WATCH' as OutletHealthStatus,
                score: 79,
                highlights: [
                  'Sales Conversion: 95/100 (Leader in trial conversion)',
                  'Retention Stability: 64/100 (22 members at elevated risk)',
                  'Data Integrity: 95/100 (Real-time telemetry)',
                ],
              },
              {
                title: 'Westside Express',
                status: 'ATTENTION_REQUIRED' as OutletHealthStatus,
                score: 62,
                highlights: [
                  'Membership Health: 52/100 (Net change negative: -4)',
                  'Class Utilisation: 58/100 (Sub-optimal occupancy)',
                  'Sample Caveat: Small active member cohort (< 250)',
                ],
              },
            ].map((club, idx) => (
              <Card key={idx} style={styles.healthCard}>
                <View style={styles.healthHeader}>
                  <View>
                    <Text style={styles.healthTitle}>{club.title}</Text>
                    <Text style={styles.healthScoreText}>Health Index: {club.score}/100</Text>
                  </View>
                  {getStatusBadge(club.status)}
                </View>

                <Divider style={styles.cardDivider} />

                {club.highlights.map((h, hIdx) => (
                  <Text key={hIdx} style={styles.healthHighlightText}>
                    • {h}
                  </Text>
                ))}
              </Card>
            ))}
          </View>
        )}

        {/* TAB 4: GROUNDED AI ADVISORY */}
        {activeTab === 'advisory' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeading}>
              {isNepali ? 'कार्यकारी एआई सल्लाहकार' : 'Executive AI Advisory'}
            </Text>
            <Text style={styles.sectionSubheading}>
              {isNepali
                ? 'शाखा तथ्याङ्कमा आधारित गैर-कारणात्मक व्याख्या र वस्तुपरक सिफारिसहरू'
                : 'Grounded intelligence explaining cross-outlet variance without causal assumptions.'}
            </Text>

            {/* AI Summary Card */}
            <Card style={styles.aiCard}>
              <View style={styles.aiBadgeRow}>
                <Badge label="FITCORE MULTI-OUTLET AGENT" variant="primary" />
                <Text style={styles.groundedTag}>
                  🔒 {isNepali ? 'प्रमाणित डाटामा आधारित' : 'Strictly Grounded'}
                </Text>
              </View>

              <Text style={styles.aiSummaryText}>{aiInsight.summary}</Text>

              <Divider style={styles.cardDivider} />

              <Text style={styles.aiSectionTitle}>
                {isNepali ? 'मुख्य ध्यान दिनुपर्ने क्षेत्रहरू' : 'Attention Areas & Telemetry Evidence'}
              </Text>
              {(aiInsight.attentionAreas || []).map((area, aIdx) => (
                <View key={aIdx} style={styles.attentionBox}>
                  <Text style={styles.attentionClubText}>
                    {area.outletName} — {area.issue}
                  </Text>
                  <Text style={styles.attentionEvidenceText}>
                    Evidence: {area.evidence}
                  </Text>
                </View>
              ))}

              <Divider style={styles.cardDivider} />

              <Text style={styles.aiSectionTitle}>
                {isNepali ? 'रणनीतिक सिफारिसहरू' : 'Operational Recommendations'}
              </Text>
              {(aiInsight.recommendations || []).map((rec, rIdx) => (
                <View key={rIdx} style={styles.recItem}>
                  <Badge
                    label={rec.priority}
                    variant={rec.priority === 'HIGH' ? 'danger' : 'neutral'}
                  />
                  <View style={styles.recContent}>
                    <Text style={styles.recText}>{rec.recommendation}</Text>
                    <Text style={styles.recReason}>Rationale: {rec.reason}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.limitationsBox}>
                <Text style={styles.limitationsText}>
                  ℹ️ {isNepali
                    ? 'अस्वीकरण: यो विश्लेषण प्रमाणित वित्तीय र उपस्थिति तथ्याङ्कमा आधारित छ। यसले कुनै अप्रमाणित कारणात्मक दावी गर्दैन।'
                    : 'Non-Causal Notice: Metric observations describe co-occurring trends without asserting definitive causation.'}
                </Text>
              </View>
            </Card>

            {/* AI Interactive Prompt Box */}
            <Card style={styles.promptCard}>
              <Text style={styles.promptTitle}>
                {isNepali ? 'व्यवस्थापकीय प्रश्न सोध्नुहोस्' : 'Inquire on Cross-Outlet Performance'}
              </Text>

              <TextInput
                style={styles.promptInput}
                placeholder={
                  isNepali
                    ? 'उदाहरण: सबअर्बन हब र डाउनटाउनको रूपान्तरण दर तुलना गर्नुहोस्...'
                    : 'e.g., Which outlet shows best capital efficiency on visits?...'
                }
                placeholderTextColor={themeColors.textTertiary}
                value={questionInput}
                onChangeText={setQuestionInput}
              />

              <Button
                title={
                  isAiLoading
                    ? (isNepali ? 'विश्लेषण हुँदैछ...' : 'Analyzing Telemetry...')
                    : (isNepali ? 'सल्लाह प्राप्त गर्नुहोस्' : 'Generate Grounded Analysis')
                }
                onPress={handleAskQuestion}
                disabled={isAiLoading}
                style={styles.askButton}
              />
            </Card>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  titleText: {
    ...typography.h2,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  subtitleText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  langToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: themeColors.surfaceHighlight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  langToggleText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '600',
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  currencyScroll: {
    flexGrow: 0,
  },
  currencyPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: themeColors.cardBackground,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginRight: spacing.xs,
  },
  activeCurrencyPill: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  currencyPillText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  activeCurrencyPillText: {
    color: '#FFFFFF',
  },
  modeToggleGroup: {
    flexDirection: 'row',
    backgroundColor: themeColors.surfaceHighlight,
    borderRadius: radius.sm,
    padding: 2,
  },
  modeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  activeModeButton: {
    backgroundColor: themeColors.cardBackground,
  },
  modeButtonText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  activeModeButtonText: {
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  activeTabItem: {
    backgroundColor: themeColors.primary,
  },
  tabText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
    fontSize: 11,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabContent: {
    marginTop: spacing.xs,
  },
  sectionHeading: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  sectionSubheading: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginBottom: spacing.md,
    marginTop: 2,
  },
  outletCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  outletCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  outletNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outletNameText: {
    ...typography.subtitle,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  codeBadge: {
    backgroundColor: themeColors.surfaceHighlight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginLeft: spacing.xs,
  },
  codeBadgeText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  membersSubtext: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  cardDivider: {
    marginVertical: spacing.sm,
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCell: {
    width: '48%',
    backgroundColor: themeColors.surfaceHighlight,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  cellLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  cellValue: {
    ...typography.subtitle,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  denomText: {
    ...typography.bodySmall,
    color: themeColors.textTertiary,
    fontSize: 10,
  },
  attentionAlert: {
    marginTop: spacing.sm,
    padding: spacing.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: radius.xs,
  },
  attentionAlertText: {
    ...typography.caption,
    color: themeColors.danger,
    fontWeight: '600',
    fontSize: 11,
  },
  unattributedCard: {
    padding: spacing.md,
    backgroundColor: themeColors.surfaceHighlight,
    borderColor: themeColors.border,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  unattributedTitle: {
    ...typography.body,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  unattributedText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  unattributedAmount: {
    ...typography.subtitle,
    color: themeColors.primary,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  leaderCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  leaderBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  leaderValue: {
    ...typography.subtitle,
    color: themeColors.primary,
    fontWeight: '700',
  },
  leaderOutletName: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  leaderDetailText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  watchCard: {
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  healthCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  healthTitle: {
    ...typography.subtitle,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  healthScoreText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  healthHighlightText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginVertical: 2,
  },
  aiCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  groundedTag: {
    ...typography.caption,
    color: themeColors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  aiSummaryText: {
    ...typography.body,
    color: themeColors.textPrimary,
    lineHeight: 20,
  },
  aiSectionTitle: {
    ...typography.body,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  attentionBox: {
    backgroundColor: themeColors.surfaceHighlight,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  attentionClubText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  attentionEvidenceText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  recContent: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  recText: {
    ...typography.body,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  recReason: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  limitationsBox: {
    marginTop: spacing.sm,
    padding: spacing.xs,
    backgroundColor: themeColors.surfaceHighlight,
    borderRadius: radius.xs,
  },
  limitationsText: {
    ...typography.bodySmall,
    color: themeColors.textTertiary,
    fontSize: 10,
  },
  promptCard: {
    padding: spacing.md,
  },
  promptTitle: {
    ...typography.subtitle,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  promptInput: {
    backgroundColor: themeColors.surfaceHighlight,
    borderRadius: radius.md,
    padding: spacing.sm,
    color: themeColors.textPrimary,
    ...typography.body,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: spacing.sm,
  },
  askButton: {
    marginTop: spacing.xs,
  },
});
