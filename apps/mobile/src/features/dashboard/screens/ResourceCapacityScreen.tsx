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
  ResourceOverviewDto,
  TrainerCapacityDto,
  RoomCapacityDto,
  PeakHourSlotDto,
  ResourceAIInsightDto,
  PeakDemandLevel,
} from '@fitcore/types';

export const ResourceCapacityScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'peak_hours' | 'trainers' | 'rooms' | 'bottlenecks' | 'advisory'
  >('overview');
  const [language, setLanguage] = useState<'en' | 'ne'>('en');
  const [questionInput, setQuestionInput] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const isNepali = language === 'ne';

  // Mock Overview Data
  const overview: ResourceOverviewDto = {
    organisationId: 'org-01',
    timeRange: 'Last 30 Days',
    totalResources: 12,
    activeResources: 11,
    overallResourceUtilisation: 74.2,
    overallTrainerUtilisation: 81.5,
    overallRoomUtilisation: 78.0,
    overallClassFillRate: 84.2,
    overallAttendanceUtilisation: 71.5,
    peakHourUtilisation: 88.0,
    waitlistPressureRate: 18.5,
    activeBottlenecksCount: 3,
    activeBottlenecks: [
      {
        id: 'btn-01',
        type: 'CLASS_CAPACITY_LIMIT',
        severity: 'HIGH',
        resourceName: 'Studio A (HIIT)',
        observation: 'Class "Metabolic Burn" reached 100% capacity with 14 queued waitlist members across 18 sessions.',
        evidence: {
          metricKey: 'resource.class.fill_rate',
          metricLabel: 'Fill Rate',
          observedValue: '100%',
          thresholdValue: '90%',
          sampleSize: 18,
          observationWindow: 'Last 30 Days',
        },
        category: 'OBSERVED',
        recommendation: 'Management may review adding a secondary parallel evening session or upgrading to Main Hall.',
        humanDecisionRequired: 'Authorise timetable expansion for high-demand studio classes.',
        identifiedAt: new Date().toISOString(),
      },
      {
        id: 'btn-02',
        type: 'TRAINER_CAPACITY_LIMIT',
        severity: 'HIGH',
        resourceName: 'Coach Sarah Miller',
        observation: 'Coach Sarah operates at 92% capacity with 38 booked PT hours against 40 available.',
        evidence: {
          metricKey: 'resource.trainer.utilisation',
          metricLabel: 'Trainer Utilisation',
          observedValue: '92%',
          thresholdValue: '80%',
          sampleSize: 38,
          observationWindow: 'Last 30 Days',
        },
        category: 'OBSERVED',
        recommendation: 'Assess coach workload to avoid fatigue; pair new client onboarding with secondary personal trainers.',
        humanDecisionRequired: 'Authorise new client intake freeze or shift reallocation.',
        identifiedAt: new Date().toISOString(),
      },
      {
        id: 'btn-03',
        type: 'LOW_RESOURCE_UTILISATION',
        severity: 'LOW',
        resourceName: 'Cycle Studio',
        observation: 'Cycle Studio recorded 22% average utilization outside Saturday morning endurance blocks.',
        evidence: {
          metricKey: 'resource.room.utilisation',
          metricLabel: 'Room Utilisation',
          observedValue: '22%',
          thresholdValue: '40%',
          sampleSize: 24,
          observationWindow: 'Last 30 Days',
        },
        category: 'OBSERVED',
        recommendation: 'Explore virtual instructor-led cycling sessions or lunchtime express rides to fill idle mid-day capacity.',
        humanDecisionRequired: 'Approve virtual cycling trial timetable.',
        identifiedAt: new Date().toISOString(),
      },
    ],
    topUtilisedResources: [
      {
        resourceId: 'res-01',
        resourceName: 'Studio A (Main)',
        resourceType: 'STUDIO',
        outletId: 'out-01',
        outletName: 'Downtown Flagship',
        timeUtilisation: 89.5,
        capacityUtilisation: 89.5,
        bookingUtilisation: 89.5,
        attendanceUtilisation: 78.4,
        availableHours: 420,
        bookedHours: 376,
        totalCapacity: 1260,
        occupiedCapacity: 988,
        totalBookings: 1128,
        totalCheckedIn: 988,
        sessionsCount: 42,
        sampleSize: 42,
        dataQuality: 'HIGH',
      },
      {
        resourceId: 'res-02',
        resourceName: 'Functional Turf Zone',
        resourceType: 'TRAINING_AREA',
        outletId: 'out-01',
        outletName: 'Downtown Flagship',
        timeUtilisation: 82.0,
        capacityUtilisation: 82.0,
        bookingUtilisation: 82.0,
        attendanceUtilisation: 76.0,
        availableHours: 420,
        bookedHours: 344,
        totalCapacity: 840,
        occupiedCapacity: 638,
        totalBookings: 688,
        totalCheckedIn: 638,
        sessionsCount: 35,
        sampleSize: 35,
        dataQuality: 'HIGH',
      },
    ],
    underutilisedResources: [
      {
        resourceId: 'res-03',
        resourceName: 'Mind & Body Studio',
        resourceType: 'STUDIO',
        outletId: 'out-01',
        outletName: 'Downtown Flagship',
        timeUtilisation: 34.0,
        capacityUtilisation: 34.0,
        bookingUtilisation: 34.0,
        attendanceUtilisation: 28.5,
        availableHours: 420,
        bookedHours: 142,
        totalCapacity: 600,
        occupiedCapacity: 171,
        totalBookings: 204,
        totalCheckedIn: 171,
        sessionsCount: 20,
        sampleSize: 20,
        dataQuality: 'HIGH',
      },
    ],
    freshness: 'REAL_TIME',
    dataQuality: 'HIGH',
  };

  // Mock Trainers Data
  const trainers: TrainerCapacityDto[] = [
    {
      trainerId: 'tr-01',
      trainerName: 'Sarah Miller',
      outletName: 'Downtown Flagship',
      availableHours: 40,
      scheduledHours: 36.8,
      bookedHours: 36.8,
      completedHours: 34.0,
      cancelledHours: 2.8,
      noShowHours: 0,
      ptBookedHours: 28.0,
      classBookedHours: 8.8,
      ptUtilisation: 70.0,
      groupClassUtilisation: 22.0,
      combinedUtilisation: 92.0,
      peakDemandPeriods: ['07:00-09:00', '17:00-19:00'],
      scheduleGapsCount: 1,
      activeClientsCount: 14,
      sampleSize: 32,
      dataQuality: 'HIGH',
    },
    {
      trainerId: 'tr-02',
      trainerName: 'David Chen',
      outletName: 'Downtown Flagship',
      availableHours: 40,
      scheduledHours: 29.5,
      bookedHours: 29.5,
      completedHours: 28.0,
      cancelledHours: 1.5,
      noShowHours: 0,
      ptBookedHours: 18.0,
      classBookedHours: 11.5,
      ptUtilisation: 45.0,
      groupClassUtilisation: 28.8,
      combinedUtilisation: 73.8,
      peakDemandPeriods: ['06:00-08:00', '18:00-20:00'],
      scheduleGapsCount: 4,
      activeClientsCount: 9,
      sampleSize: 26,
      dataQuality: 'HIGH',
    },
  ];

  // Mock Rooms Data
  const rooms: RoomCapacityDto[] = [
    {
      roomId: 'room-01',
      roomName: 'Studio A (Main)',
      roomType: 'STUDIO',
      outletId: 'out-01',
      outletName: 'Downtown Flagship',
      configuredCapacity: 30,
      availableHours: 420,
      bookedHours: 376,
      actualUtilisedHours: 338,
      roomUtilisation: 89.5,
      sessionsCount: 42,
      totalAttendees: 988,
      averageMembersPerSession: 23.5,
      peakHours: ['06:00-08:00', '18:00-20:00'],
      underutilisedSlotsCount: 8,
      overCapacityAttempts: 0,
      dataQuality: 'HIGH',
    },
    {
      roomId: 'room-02',
      roomName: 'Pilates Reformer Zone',
      roomType: 'ROOM',
      outletId: 'out-01',
      outletName: 'Downtown Flagship',
      configuredCapacity: 12,
      availableHours: 420,
      bookedHours: 312,
      actualUtilisedHours: 290,
      roomUtilisation: 74.3,
      sessionsCount: 36,
      totalAttendees: 396,
      averageMembersPerSession: 11.0,
      peakHours: ['09:00-11:00', '17:00-19:00'],
      underutilisedSlotsCount: 14,
      overCapacityAttempts: 0,
      dataQuality: 'HIGH',
    },
  ];

  // Mock Peak Hour Slots (Condensed 8-Hour Representation for UI)
  const peakSlots: PeakHourSlotDto[] = [
    { hourOfDay: 6, dayOfWeek: 1, dayName: 'Mon', utilisationRate: 88.0, demandLevel: 'VERY_HIGH', totalBookings: 44, totalCapacity: 50, waitlistPressureCount: 6, activeSessionsCount: 2, accessibleLabel: 'Mon 06:00 VERY_HIGH' },
    { hourOfDay: 7, dayOfWeek: 1, dayName: 'Mon', utilisationRate: 94.0, demandLevel: 'VERY_HIGH', totalBookings: 47, totalCapacity: 50, waitlistPressureCount: 9, activeSessionsCount: 2, accessibleLabel: 'Mon 07:00 VERY_HIGH' },
    { hourOfDay: 12, dayOfWeek: 1, dayName: 'Mon', utilisationRate: 48.0, demandLevel: 'MODERATE', totalBookings: 24, totalCapacity: 50, waitlistPressureCount: 0, activeSessionsCount: 2, accessibleLabel: 'Mon 12:00 MODERATE' },
    { hourOfDay: 17, dayOfWeek: 1, dayName: 'Mon', utilisationRate: 92.0, demandLevel: 'VERY_HIGH', totalBookings: 46, totalCapacity: 50, waitlistPressureCount: 8, activeSessionsCount: 2, accessibleLabel: 'Mon 17:00 VERY_HIGH' },
    { hourOfDay: 18, dayOfWeek: 1, dayName: 'Mon', utilisationRate: 96.0, demandLevel: 'VERY_HIGH', totalBookings: 48, totalCapacity: 50, waitlistPressureCount: 12, activeSessionsCount: 2, accessibleLabel: 'Mon 18:00 VERY_HIGH' },
    { hourOfDay: 19, dayOfWeek: 1, dayName: 'Mon', utilisationRate: 82.0, demandLevel: 'HIGH', totalBookings: 41, totalCapacity: 50, waitlistPressureCount: 4, activeSessionsCount: 2, accessibleLabel: 'Mon 19:00 HIGH' },
    { hourOfDay: 20, dayOfWeek: 1, dayName: 'Mon', utilisationRate: 52.0, demandLevel: 'MODERATE', totalBookings: 26, totalCapacity: 50, waitlistPressureCount: 0, activeSessionsCount: 2, accessibleLabel: 'Mon 20:00 MODERATE' },
  ];

  // Mock AI Advisory Insights
  const aiInsight: ResourceAIInsightDto = {
    summary: isNepali
      ? 'स्रोत सञ्चालन अवलोकन: स्टुडियो कोठा उपयोगिता ७८.०% र प्रशिक्षक क्षमता ८१.५% मा सन्तुलित छ।'
      : 'Resource operations reflect 78.0% studio utilisation alongside 81.5% trainer capacity allocation.',
    keyObservations: isNepali
      ? [
          'कक्षा बुकिङ दर (Fill Rate) ८४.२% रेकर्ड गरिएको छ, जबकि वास्तविक उपस्थिति ७१.५% छ (१२.७% नो-शो दर)।',
          'बिहान ०६:००-०८:०० र साँझ १७:००-२०:०० बीच स्टुडियो क्षमता अत्यधिक चापमा सञ्चालित छ।',
          '३ वटा परिचालन अवरोधहरू पहिचान गरिएका छन् जसलाई मानवीय समीक्षा सिफारिस गरिन्छ।',
        ]
      : [
          'Booking fill rate averaged 84.2%, while physical attendance utilisation settled at 71.5% (12.7% drop-off).',
          'Peak hours (06:00–08:00 & 17:00–20:00) operate at sustained 90%+ space saturation.',
          'Identified 3 active capacity bottlenecks requiring managerial evaluation.',
        ],
    capacityPressures: isNepali
      ? ['स्टूडियो A र कोच सराह मिलरको तालिका उच्च मागका कारण पूर्ण रूपमा भरिएको छ।']
      : ['Studio A (Metabolic Burn) and Coach Sarah Miller operate at near-maximum intake capacity.'],
    underutilisedAreas: isNepali
      ? ['साइकल स्टुडियो र दिउँसो ११:०० देखि १५:०० सम्मका समय स्लटहरू कम उपयोगमा छन्।']
      : ['Cycle Studio and midday 11:00–15:00 hours maintain excess available operating capacity.'],
    peakPeriods: ['06:00-08:00', '17:00-20:00'],
    resourceTrends: ['Demand trajectories remain stable across the 30-day window.'],
    possibleExplanations: [
      'Standard metropolitan work schedules drive morning and evening workout concentration.',
    ],
    recommendedActions: isNepali
      ? [
          'दिउँसोको खाली समयमा विशेष वर्कशप वा निजी प्रशिक्षण (PT) सत्रहरू तालिकाबद्ध गर्ने विचार गर्नुहोस्।',
          'बुकिङ पुष्टिकरण सन्देशहरू पठाएर नो-शो दर घटाउन व्यवस्थापकीय ध्यान दिनुहोस्।',
        ]
      : [
          'Evaluate lunchtime express circuits to monetize available midday studio capacity.',
          'Introduce SMS check-in reminders to reduce the 12.7% variance between booked seats and actual attendance.',
        ],
    limitations: [
      'Analysis is grounded in verified booking and access gate telemetry; unreserved free-weight floor usage is excluded.',
    ],
    confidence: 0.95,
    groundedMetricsCount: 6,
    generatedAt: new Date().toISOString(),
    isAdvisoryOnly: true,
  };

  const getDemandBadgeColor = (level: PeakDemandLevel) => {
    switch (level) {
      case 'VERY_HIGH':
        return themeColors.danger;
      case 'HIGH':
        return themeColors.warning;
      case 'MODERATE':
        return themeColors.info;
      default:
        return themeColors.surfaceHighlight;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
      case 'CRITICAL':
        return <Badge label={severity} variant="danger" />;
      case 'MEDIUM':
        return <Badge label={severity} variant="warning" />;
      default:
        return <Badge label={severity} variant="info" />;
    }
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>
              {isNepali ? 'स्रोत र क्षमता विश्लेषण' : 'Resource & Capacity Intelligence'}
            </Text>
            <Text style={styles.subtitle}>
              {isNepali
                ? 'प्रशिक्षक, स्टुडियो, उपकरण र क्षमता उपयोगिता'
                : 'Trainers, Studios, Equipment & Utilisation Analytics'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.languageToggle}
            onPress={() => setLanguage(language === 'en' ? 'ne' : 'en')}
          >
            <Text style={styles.languageText}>{language === 'en' ? 'नेपाली' : 'English'}</Text>
          </TouchableOpacity>
        </View>

        {/* Top KPI Cards Grid */}
        <View style={styles.kpiGrid}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{isNepali ? 'स्रोत उपयोगिता' : 'Overall Utilisation'}</Text>
            <Text style={styles.kpiValue}>{overview.overallResourceUtilisation}%</Text>
            <Badge label="Healthy" variant="success" />
          </Card>

          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{isNepali ? 'प्रशिक्षक उपयोगिता' : 'Trainer Utilisation'}</Text>
            <Text style={styles.kpiValue}>{overview.overallTrainerUtilisation}%</Text>
            <Badge label="Optimal" variant="success" />
          </Card>

          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{isNepali ? 'कोठा उपयोगिता' : 'Room Utilisation'}</Text>
            <Text style={styles.kpiValue}>{overview.overallRoomUtilisation}%</Text>
            <Badge label="Balanced" variant="info" />
          </Card>

          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{isNepali ? 'कक्षा बुकिङ दर' : 'Class Fill Rate'}</Text>
            <Text style={styles.kpiValue}>{overview.overallClassFillRate}%</Text>
            <Text style={styles.kpiSubtext}>
              {isNepali ? 'उपस्थिति: ' : 'Attendance: '}{overview.overallAttendanceUtilisation}%
            </Text>
          </Card>
        </View>

        {/* Secondary KPI Strip */}
        <Card style={styles.secondaryStrip}>
          <View style={styles.secondaryItem}>
            <Text style={styles.secLabel}>{isNepali ? 'व्यस्त समय उपयोगिता' : 'Peak-Hour Utilisation'}</Text>
            <Text style={styles.secValue}>{overview.peakHourUtilisation}%</Text>
          </View>
          <Divider style={styles.verticalDivider} />
          <View style={styles.secondaryItem}>
            <Text style={styles.secLabel}>{isNepali ? 'प्रतीक्षा सूची दबाब' : 'Waitlist Pressure'}</Text>
            <Text style={styles.secValue}>{overview.waitlistPressureRate}%</Text>
          </View>
          <Divider style={styles.verticalDivider} />
          <View style={styles.secondaryItem}>
            <Text style={styles.secLabel}>{isNepali ? 'सक्रिय अवरोधहरू' : 'Active Bottlenecks'}</Text>
            <Text style={[styles.secValue, { color: themeColors.warning }]}>
              {overview.activeBottlenecksCount}
            </Text>
          </View>
        </Card>

        {/* Navigation Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              {isNepali ? 'सिंहावलोकन' : 'Overview'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'peak_hours' && styles.activeTab]}
            onPress={() => setActiveTab('peak_hours')}
          >
            <Text style={[styles.tabText, activeTab === 'peak_hours' && styles.activeTabText]}>
              {isNepali ? 'व्यस्त समय' : 'Peak Hours'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'trainers' && styles.activeTab]}
            onPress={() => setActiveTab('trainers')}
          >
            <Text style={[styles.tabText, activeTab === 'trainers' && styles.activeTabText]}>
              {isNepali ? 'प्रशिक्षकहरू' : 'Trainers'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'rooms' && styles.activeTab]}
            onPress={() => setActiveTab('rooms')}
          >
            <Text style={[styles.tabText, activeTab === 'rooms' && styles.activeTabText]}>
              {isNepali ? 'स्टुडियो / कोठा' : 'Rooms & Studios'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'bottlenecks' && styles.activeTab]}
            onPress={() => setActiveTab('bottlenecks')}
          >
            <Text style={[styles.tabText, activeTab === 'bottlenecks' && styles.activeTabText]}>
              {isNepali ? 'अवरोधहरू' : 'Bottlenecks'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'advisory' && styles.activeTab]}
            onPress={() => setActiveTab('advisory')}
          >
            <Text style={[styles.tabText, activeTab === 'advisory' && styles.activeTabText]}>
              {isNepali ? 'एआई सल्लाहकार' : 'AI Advisory'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              {isNepali ? 'शीर्ष उपयोग गरिएका स्रोतहरू' : 'Top Utilised Resources'}
            </Text>
            {overview.topUtilisedResources.map((res) => (
              <Card key={res.resourceId} style={styles.resourceCard}>
                <View style={styles.resourceHeader}>
                  <View>
                    <Text style={styles.resName}>{res.resourceName}</Text>
                    <Text style={styles.resSub}>{res.resourceType} • {res.outletName}</Text>
                  </View>
                  <Badge label={`${res.timeUtilisation}%`} variant="success" />
                </View>
                <Divider style={styles.cardDivider} />
                <View style={styles.statsRow}>
                  <Text style={styles.statItem}>
                    {isNepali ? 'बुकिङ घण्टा: ' : 'Booked: '}{res.bookedHours}h / {res.availableHours}h
                  </Text>
                  <Text style={styles.statItem}>
                    {isNepali ? 'सत्र संख्या: ' : 'Sessions: '}{res.sessionsCount}
                  </Text>
                  <Text style={styles.statItem}>
                    {isNepali ? 'उपस्थिति दर: ' : 'Att. Util: '}{res.attendanceUtilisation}%
                  </Text>
                </View>
              </Card>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
              {isNepali ? 'कम उपयोग भएका स्रोतहरू' : 'Underutilised Resources'}
            </Text>
            {overview.underutilisedResources.map((res) => (
              <Card key={res.resourceId} style={styles.resourceCard}>
                <View style={styles.resourceHeader}>
                  <View>
                    <Text style={styles.resName}>{res.resourceName}</Text>
                    <Text style={styles.resSub}>{res.resourceType} • {res.outletName}</Text>
                  </View>
                  <Badge label={`${res.timeUtilisation}%`} variant="warning" />
                </View>
                <Text style={styles.underutilisedNotice}>
                  {isNepali
                    ? 'सुझाव: दिउँसोको खाली समयमा विशेष वर्कशप वा ओपेन फ्लोर प्रशिक्षण सत्रहरू तालिकाबद्ध गर्नुहोस्।'
                    : 'Opportunity: Available for specialty clinics or express midday training sessions.'}
                </Text>
              </Card>
            ))}
          </View>
        )}

        {/* Tab 2: Peak Hours Timetable */}
        {activeTab === 'peak_hours' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              {isNepali ? '२४x७ व्यस्त समय तालिका (Heatmap)' : 'Peak Hours Heatmap Timetable'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {isNepali
                ? 'हप्ताका दिनहरू र घन्टा अनुसार क्षमता उपयोगिता दर'
                : 'Hour-by-hour capacity utilization and waitlist saturation'}
            </Text>

            <Card style={styles.heatmapCard}>
              {peakSlots.map((slot, index) => (
                <View key={index} style={styles.slotRow}>
                  <Text style={styles.slotTime}>
                    {String(slot.hourOfDay).padStart(2, '0')}:00
                  </Text>
                  <View style={styles.slotBarContainer}>
                    <View
                      style={[
                        styles.slotBarFill,
                        {
                          width: `${slot.utilisationRate}%`,
                          backgroundColor: getDemandBadgeColor(slot.demandLevel),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.slotRate}>{slot.utilisationRate}%</Text>
                  <Badge label={slot.demandLevel} variant="info" />
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Tab 3: Trainers */}
        {activeTab === 'trainers' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              {isNepali ? 'प्रशिक्षक क्षमता र तालिका' : 'Trainer Capacity & Workload'}
            </Text>
            {trainers.map((t) => (
              <Card key={t.trainerId} style={styles.resourceCard}>
                <View style={styles.resourceHeader}>
                  <View>
                    <Text style={styles.resName}>{t.trainerName}</Text>
                    <Text style={styles.resSub}>{t.outletName} • {t.activeClientsCount} Clients</Text>
                  </View>
                  <Badge label={`${t.combinedUtilisation}% Load`} variant="info" />
                </View>
                <Divider style={styles.cardDivider} />
                <View style={styles.statsRow}>
                  <Text style={styles.statItem}>PT: {t.ptBookedHours}h ({t.ptUtilisation}%)</Text>
                  <Text style={styles.statItem}>Class: {t.classBookedHours}h</Text>
                  <Text style={styles.statItem}>Available: {t.availableHours}h</Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Tab 4: Rooms & Studios */}
        {activeTab === 'rooms' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              {isNepali ? 'स्टुडियो र कोठा उपयोगिता' : 'Studio & Room Capacity'}
            </Text>
            {rooms.map((r) => (
              <Card key={r.roomId} style={styles.resourceCard}>
                <View style={styles.resourceHeader}>
                  <View>
                    <Text style={styles.resName}>{r.roomName}</Text>
                    <Text style={styles.resSub}>{r.roomType} • Capacity: {r.configuredCapacity}</Text>
                  </View>
                  <Badge label={`${r.roomUtilisation}% Util`} variant="success" />
                </View>
                <Divider style={styles.cardDivider} />
                <View style={styles.statsRow}>
                  <Text style={styles.statItem}>Booked: {r.bookedHours}h</Text>
                  <Text style={styles.statItem}>Sessions: {r.sessionsCount}</Text>
                  <Text style={styles.statItem}>Avg Attendees: {r.averageMembersPerSession}</Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Tab 5: Bottlenecks Panel */}
        {activeTab === 'bottlenecks' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              {isNepali ? 'सक्रिय परिचालन अवरोधहरू' : 'Active Capacity Bottlenecks'}
            </Text>
            {overview.activeBottlenecks.map((btn) => (
              <Card key={btn.id} style={styles.bottleneckCard}>
                <View style={styles.btnHeader}>
                  <View style={styles.btnTypeRow}>
                    {getSeverityBadge(btn.severity)}
                    <Text style={styles.btnType}>{btn.type}</Text>
                  </View>
                  <Text style={styles.btnResource}>{btn.resourceName}</Text>
                </View>
                <Text style={styles.btnObs}>{btn.observation}</Text>
                <View style={styles.evidenceBox}>
                  <Text style={styles.evidenceTitle}>Evidence:</Text>
                  <Text style={styles.evidenceText}>
                    {btn.evidence.metricLabel} = {btn.evidence.observedValue} (Threshold: {btn.evidence.thresholdValue}, Sample: {btn.evidence.sampleSize})
                  </Text>
                </View>
                <Text style={styles.recommendationText}>
                  Recommendation: {btn.recommendation}
                </Text>
                <View style={styles.humanDecisionBox}>
                  <Text style={styles.humanDecisionText}>
                    Decision Required: {btn.humanDecisionRequired}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Tab 6: Grounded AI Advisory */}
        {activeTab === 'advisory' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              {isNepali ? 'एआई रणनीतिक सल्लाहकार' : 'Grounded AI Strategic Advisory'}
            </Text>

            <Card style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <Badge label="Grounded Advisory" variant="info" />
                <Badge label="Advisory Only" variant="warning" />
              </View>

              <Text style={styles.aiSummary}>{aiInsight.summary}</Text>

              <Text style={styles.aiSubHeading}>
                {isNepali ? 'प्रमुख अवलोकनहरू:' : 'Key Observations:'}
              </Text>
              {aiInsight.keyObservations.map((obs, idx) => (
                <Text key={idx} style={styles.bulletPoint}>• {obs}</Text>
              ))}

              <Text style={styles.aiSubHeading}>
                {isNepali ? 'सिफारिस गरिएका कार्यहरू:' : 'Recommended Actions:'}
              </Text>
              {aiInsight.recommendedActions.map((act, idx) => (
                <Text key={idx} style={styles.bulletPoint}>• {act}</Text>
              ))}

              <View style={styles.aiFooter}>
                <Text style={styles.aiFootnote}>
                  Confidence: {aiInsight.confidence * 100}% • Verified grounded metrics: {aiInsight.groundedMetricsCount}
                </Text>
              </View>
            </Card>

            {/* Interactive Query Input */}
            <Card style={styles.queryCard}>
              <Text style={styles.queryLabel}>
                {isNepali ? 'व्यवस्थापकीय प्रश्न सोध्नुहोस्:' : 'Ask a capacity management question:'}
              </Text>
              <TextInput
                style={styles.queryInput}
                placeholder={
                  isNepali
                    ? 'उदा. "स्टुडियो A को लागि पीक समय व्यवस्थापन कसरी गर्ने?"'
                    : 'e.g. "How can we optimize midday utilization in Cycle Studio?"'
                }
                placeholderTextColor={themeColors.textTertiary}
                value={questionInput}
                onChangeText={setQuestionInput}
              />
              <Button
                title={isNepali ? 'विश्लेषण गर्नुहोस्' : 'Query Advisory Agent'}
                onPress={() => {
                  setIsAiLoading(true);
                  setTimeout(() => setIsAiLoading(false), 800);
                }}
                disabled={isAiLoading || !questionInput.trim()}
                style={styles.queryButton}
              />
            </Card>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headingMedium,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginTop: spacing.xs,
  },
  languageToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: themeColors.surfaceHighlight,
    borderRadius: radius.sm,
  },
  languageText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiCard: {
    flex: 1,
    minWidth: '46%',
    padding: spacing.md,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
  },
  kpiLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginBottom: spacing.xs,
  },
  kpiValue: {
    ...typography.headingLarge,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  kpiSubtext: {
    ...typography.caption,
    color: themeColors.textTertiary,
    marginTop: spacing.xs,
  },
  secondaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
  },
  secondaryItem: {
    alignItems: 'center',
  },
  secLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginBottom: spacing.xs,
  },
  secValue: {
    ...typography.headingSmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: themeColors.border,
  },
  tabScroll: {
    marginBottom: spacing.md,
  },
  tabButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: themeColors.surfaceHighlight,
    marginRight: spacing.sm,
  },
  activeTab: {
    backgroundColor: themeColors.primary,
  },
  tabText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: themeColors.surface,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingSmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginBottom: spacing.md,
  },
  resourceCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resName: {
    ...typography.bodyMedium,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  resSub: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: spacing.xs,
  },
  cardDivider: {
    marginVertical: spacing.sm,
    backgroundColor: themeColors.border,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  underutilisedNotice: {
    ...typography.caption,
    color: themeColors.warning,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  heatmapCard: {
    padding: spacing.md,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  slotTime: {
    width: 50,
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  slotBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: themeColors.surfaceHighlight,
    borderRadius: radius.xs,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  slotBarFill: {
    height: '100%',
    borderRadius: radius.xs,
  },
  slotRate: {
    width: 45,
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    marginRight: spacing.sm,
  },
  bottleneckCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: themeColors.danger,
  },
  btnHeader: {
    marginBottom: spacing.xs,
  },
  btnTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  btnType: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  btnResource: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  btnObs: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    marginVertical: spacing.xs,
  },
  evidenceBox: {
    padding: spacing.sm,
    backgroundColor: themeColors.surfaceHighlight,
    borderRadius: radius.sm,
    marginVertical: spacing.xs,
  },
  evidenceTitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '700',
  },
  evidenceText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    marginTop: spacing.xs,
  },
  recommendationText: {
    ...typography.bodySmall,
    color: themeColors.info,
    marginTop: spacing.xs,
  },
  humanDecisionBox: {
    marginTop: spacing.xs,
    padding: spacing.xs,
    backgroundColor: themeColors.surfaceHighlight,
    borderRadius: radius.xs,
  },
  humanDecisionText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  aiCard: {
    padding: spacing.md,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  aiSummary: {
    ...typography.bodyMedium,
    color: themeColors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  aiSubHeading: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  bulletPoint: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
  aiFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  aiFootnote: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  queryCard: {
    padding: spacing.md,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
  },
  queryLabel: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  queryInput: {
    backgroundColor: themeColors.surfaceHighlight,
    color: themeColors.textPrimary,
    borderRadius: radius.sm,
    padding: spacing.sm,
    ...typography.bodySmall,
    marginBottom: spacing.sm,
  },
  queryButton: {
    marginTop: spacing.xs,
  },
});
