import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Screen, Card, Badge, Icon, Button, MetricCard } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

interface ArrivalEvent {
  id: string;
  time: string;
  name: string;
  memberNumber: string;
  point: string;
  status: 'SUCCESS' | 'DENIED' | 'OVERRIDE';
}

const RECENT_ARRIVALS: ArrivalEvent[] = [
  { id: 'a1', time: 'Just now', name: 'Alex Chen', memberNumber: 'FC-2026-0042', point: 'Turnstile A', status: 'SUCCESS' },
  { id: 'a2', time: '4m ago', name: 'Sarah Connor', memberNumber: 'FC-2026-0115', point: 'Turnstile B', status: 'SUCCESS' },
  { id: 'a3', time: '12m ago', name: 'Marcus Brody', memberNumber: 'FC-2026-0204', point: 'Turnstile A', status: 'DENIED' },
  { id: 'a4', time: '28m ago', name: 'James Wilson', memberNumber: 'FC-2026-0089', point: 'Main Gate (Override)', status: 'OVERRIDE' },
];

export const ReceptionHomeScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleManualOverride = () => {
    Alert.alert(
      'Staff Access Override',
      'Authorize emergency turnstile unlock? An immutable audit event with your staff ID will be recorded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Authorize Unlock',
          onPress: () => Alert.alert('Turnstile Relay Dispatched', 'Gate 1 unlocked for 5 seconds.'),
        },
      ],
    );
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>FRONT DESK & RECEPTION</Text>
          <Text style={styles.clubName}>Perth CBD Facility</Text>
        </View>
        <Badge label="GATES OPERATIONAL" variant="success" />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* KPI Row */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="TODAY'S ARRIVALS"
            value="142"
            unit="visits"
            change="+18%"
            trend="up"
            icon="users"
            accentColor={themeColors.accent}
            style={styles.flexMetric}
          />
          <MetricCard
            label="ARREARS ALERTS"
            value="3"
            unit="members"
            subtitle="Flagged at desk"
            icon="alert-circle"
            accentColor={themeColors.danger}
            style={styles.flexMetric}
          />
        </View>

        {/* Real-time Member Search Input */}
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={themeColors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search member by name, email, or #..."
            placeholderTextColor={themeColors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={16} color={themeColors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Emergency Gate Override Action Card */}
        <Card style={styles.overrideCard}>
          <View style={styles.overrideHeader}>
            <View>
              <Text style={styles.overrideTitle}>Front Desk Gate Control</Text>
              <Text style={styles.overrideSubtitle}>Immediate staff relay trigger with mandatory audit</Text>
            </View>
            <Button
              title="Unlock Gate 1"
              onPress={handleManualOverride}
              variant="accent"
              size="sm"
            />
          </View>
        </Card>

        {/* Live Arrivals Feed */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>LIVE ARRIVALS STREAM</Text>

          <View style={styles.arrivalsList}>
            {RECENT_ARRIVALS.map((arrival) => (
              <View key={arrival.id} style={styles.arrivalItem}>
                <View style={styles.arrivalAvatar}>
                  <Text style={styles.avatarLetter}>{arrival.name.substring(0, 1)}</Text>
                </View>
                <View style={styles.arrivalDetails}>
                  <View style={styles.arrivalNameRow}>
                    <Text style={styles.arrivalName}>{arrival.name}</Text>
                    <Badge
                      label={arrival.status}
                      variant={arrival.status === 'SUCCESS' ? 'success' : arrival.status === 'OVERRIDE' ? 'warning' : 'danger'}
                    />
                  </View>
                  <Text style={styles.arrivalSubText}>
                    {arrival.memberNumber} · {arrival.point}
                  </Text>
                </View>
                <Text style={styles.arrivalTime}>{arrival.time}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  headerLeft: {
    gap: 2,
  },
  greeting: {
    fontSize: 10,
    fontWeight: '800',
    color: themeColors.textMuted,
    letterSpacing: 0.5,
  },
  clubName: {
    ...typography.h2,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  container: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  flexMetric: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    color: themeColors.textPrimary,
    fontSize: 14,
  },
  overrideCard: {
    padding: spacing[4],
    backgroundColor: '#121A28',
    borderColor: '#1D3B5E',
    borderWidth: 1,
  },
  overrideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overrideTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  overrideSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  arrivalsList: {
    gap: spacing[3],
  },
  arrivalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  arrivalAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: themeColors.surfaceActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  arrivalDetails: {
    flex: 1,
    gap: 2,
  },
  arrivalNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: spacing[2],
  },
  arrivalName: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  arrivalSubText: {
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  arrivalTime: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
});
