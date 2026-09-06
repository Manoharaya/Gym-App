import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Screen, Card, Badge, Button, MetricCard } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

interface ScheduleSession {
  id: string;
  time: string;
  type: 'PT' | 'CLASS';
  title: string;
  clientOrRoom: string;
  capacity?: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CHECKING_IN';
}

const TODAY_SCHEDULE: ScheduleSession[] = [
  {
    id: 's1',
    time: '09:00 AM',
    type: 'PT',
    title: '1-on-1 Hypertrophy Training',
    clientOrRoom: 'Alex Chen',
    status: 'COMPLETED',
  },
  {
    id: 's2',
    time: '11:30 AM',
    type: 'PT',
    title: 'Functional Conditioning',
    clientOrRoom: 'Sarah Connor',
    status: 'UPCOMING',
  },
  {
    id: 's3',
    time: '05:30 PM',
    type: 'CLASS',
    title: 'HIIT Blast 45',
    clientOrRoom: 'Studio 1',
    capacity: '20 / 20 Full (Waitlist: 3)',
    status: 'UPCOMING',
  },
];

const ASSIGNED_CLIENTS = [
  { id: 'c1', name: 'Alex Chen', goal: 'Hypertrophy & Strength', consistency: '94%', lastTrained: 'Today' },
  { id: 'c2', name: 'Sarah Connor', goal: 'Athletic Conditioning', consistency: '88%', lastTrained: '2d ago' },
  { id: 'c3', name: 'James Wilson', goal: 'Fat Loss & Mobility', consistency: '76%', lastTrained: '4d ago' },
];

export const TrainerHomeScreen: React.FC = () => {
  const [sessions, setSessions] = useState(TODAY_SCHEDULE);

  const handleQuickAttendance = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: 'COMPLETED' } : s)),
    );
    Alert.alert('Attendance Marked', 'Member check-in verified and logged to session roster.');
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>STAFF PORTAL · TRAINER</Text>
          <Text style={styles.trainerName}>Marcus Brody</Text>
        </View>
        <Badge label="ACTIVE ON DUTY" variant="success" />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* KPI Metrics Row */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="TODAY'S CLIENTS"
            value="6"
            unit="booked"
            change="+2 vs yesterday"
            trend="up"
            icon="users"
            accentColor={themeColors.accent}
            style={styles.flexMetric}
          />
          <MetricCard
            label="CLASS ROSTER"
            value="100%"
            unit="booked"
            subtitle="HIIT Blast 45"
            icon="dumbbell"
            accentColor={themeColors.primary}
            style={styles.flexMetric}
          />
        </View>

        {/* Today's Timeline Schedule */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>TODAY'S SCHEDULE & SESSIONS</Text>

          <View style={styles.timeline}>
            {sessions.map((session) => (
              <View key={session.id} style={styles.timelineItem}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{session.time}</Text>
                  <Badge
                    label={session.type}
                    variant={session.type === 'CLASS' ? 'primary' : 'accent'}
                  />
                </View>

                <View style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Badge
                      label={session.status}
                      variant={session.status === 'COMPLETED' ? 'success' : 'neutral'}
                    />
                  </View>

                  <Text style={styles.sessionDetailText}>
                    {session.type === 'PT' ? `Client: ${session.clientOrRoom}` : `Room: ${session.clientOrRoom} · ${session.capacity}`}
                  </Text>

                  {session.status === 'UPCOMING' && (
                    <View style={styles.sessionActions}>
                      <Button
                        title="Mark Attendance"
                        onPress={() => handleQuickAttendance(session.id)}
                        variant="accent"
                        size="sm"
                        style={styles.actionBtn}
                      />
                      <Button
                        title="View Workout"
                        onPress={() => Alert.alert('Training Prescription', 'Loading prescribed workout.')}
                        variant="outline"
                        size="sm"
                        style={styles.actionBtn}
                      />
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Assigned Clients Roster */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>ASSIGNED CLIENTS ROSTER</Text>

          <View style={styles.clientsList}>
            {ASSIGNED_CLIENTS.map((client) => (
              <View key={client.id} style={styles.clientItem}>
                <View style={styles.clientAvatar}>
                  <Text style={styles.clientAvatarText}>{client.name.substring(0, 2)}</Text>
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{client.name}</Text>
                  <Text style={styles.clientGoal}>{client.goal} · Last: {client.lastTrained}</Text>
                </View>
                <View style={styles.consistencyBadge}>
                  <Text style={styles.consistencyVal}>{client.consistency}</Text>
                  <Text style={styles.consistencyLabel}>Consistency</Text>
                </View>
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
  trainerName: {
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
  sectionCard: {
    padding: spacing[4],
    gap: spacing[3.5],
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeline: {
    gap: spacing[3],
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.surface,
    paddingBottom: spacing[3],
  },
  timeColumn: {
    width: 72,
    gap: spacing[1],
  },
  timeText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  sessionCard: {
    flex: 1,
    gap: spacing[1.5],
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  sessionDetailText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  actionBtn: {
    flex: 1,
  },
  clientsList: {
    gap: spacing[2.5],
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  clientAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: themeColors.surfaceActive,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  clientAvatarText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  clientInfo: {
    flex: 1,
    gap: 2,
  },
  clientName: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  clientGoal: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontSize: 11,
  },
  consistencyBadge: {
    alignItems: 'flex-end',
  },
  consistencyVal: {
    ...typography.bodySmall,
    color: themeColors.success,
    fontWeight: '700',
  },
  consistencyLabel: {
    fontSize: 9,
    color: themeColors.textMuted,
  },
});
