import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Card, Badge, Button, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { useCheckOutMutation } from '../hooks/useAttendance';
import type { AttendanceRecord } from '../types';

type RouteProps = RouteProp<MemberStackParamList, 'AttendanceConfirmation'>;
type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;

export const AttendanceConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const initialRecord = route.params.attendanceRecord as AttendanceRecord;

  const [record, setRecord] = useState<AttendanceRecord>(initialRecord);
  const checkOutMutation = useCheckOutMutation();

  const session = record.classSession;
  const isLate = record.status === 'LATE';
  const isCompleted = record.status === 'COMPLETED' || record.status === 'LEFT_EARLY';

  const handleCheckOut = async () => {
    try {
      const updated = await checkOutMutation.mutateAsync({
        sessionId: record.classSessionId,
      });
      setRecord(updated);
      Alert.alert('Checked Out', 'You have successfully checked out of class.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Unable to check out.');
    }
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <ScrollView contentContainerStyle={styles.container}>
        {/* Success Icon Badge */}
        <View style={styles.badgeWrapper}>
          <View style={styles.successCircle}>
            <Icon name="check" size={48} color={themeColors.background} />
          </View>
          <Text style={styles.headingTitle}>
            {isCompleted ? 'Workout Completed!' : "You're Checked In!"}
          </Text>
          <Text style={styles.headingSubtitle}>
            {isCompleted
              ? 'Great effort! Your attendance has been logged.'
              : 'Have a fantastic session! Head into the studio room.'}
          </Text>
        </View>

        {/* Boarding Pass Summary Card */}
        <Card style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <View>
              <Badge
                label={isLate ? 'LATE ARRIVAL' : isCompleted ? 'SESSION COMPLETED' : 'ATTENDING'}
                variant={isLate ? 'warning' : isCompleted ? 'neutral' : 'success'}
              />
              <Text style={styles.className}>
                {session?.classType?.name || 'Scheduled Class'}
              </Text>
            </View>
            <Icon name="award" size={28} color={themeColors.accent} />
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>CHECK-IN TIME</Text>
              <Text style={styles.metaValue}>
                {record.checkedInAt
                  ? new Date(record.checkedInAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recorded'}
              </Text>
            </View>

            {record.checkedOutAt && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>CHECK-OUT TIME</Text>
                <Text style={styles.metaValue}>
                  {new Date(record.checkedOutAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}

            {record.durationMinutes && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>DURATION</Text>
                <Text style={styles.metaValue}>{record.durationMinutes} mins</Text>
              </View>
            )}

            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>STUDIO</Text>
              <Text style={styles.metaValue}>
                {session?.resource?.name || 'Studio 1'}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>INSTRUCTOR</Text>
              <Text style={styles.metaValue}>
                {session?.trainer
                  ? `${session.trainer.firstName} ${session.trainer.lastName}`
                  : 'Coach'}
              </Text>
            </View>
          </View>

          {isLate && (
            <View style={styles.warningNote}>
              <Icon name="clock" size={16} color={themeColors.warning} />
              <Text style={styles.warningText}>
                Recorded as {record.lateMinutes || 0}m late arrival.
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionGroup}>
            {!isCompleted && (
              <Button
                testID="check-out-button"
                title={checkOutMutation.isPending ? 'Checking Out...' : 'Check Out of Class'}
                variant="secondary"
                onPress={handleCheckOut}
                disabled={checkOutMutation.isPending}
                style={styles.btnSpacing}
              />
            )}

            <Button
              testID="done-button"
              title="Return to Home"
              variant="primary"
              onPress={() => navigation.navigate('MemberHome')}
              style={styles.btnSpacing}
            />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    paddingBottom: spacing[12],
  },
  badgeWrapper: {
    alignItems: 'center',
    marginVertical: spacing[6],
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: themeColors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  headingTitle: {
    color: themeColors.textPrimary,
    ...typography.h2,
    textAlign: 'center',
  },
  headingSubtitle: {
    color: themeColors.textSecondary,
    ...typography.body1,
    textAlign: 'center',
    marginTop: spacing[1],
    paddingHorizontal: spacing[4],
  },
  ticketCard: {
    padding: spacing[5],
    borderRadius: radius.xl,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  className: {
    color: themeColors.textPrimary,
    ...typography.h3,
    marginTop: spacing[1],
  },
  divider: {
    height: 1,
    backgroundColor: themeColors.border,
    marginVertical: spacing[4],
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  metaItem: {
    width: '45%',
  },
  metaLabel: {
    color: themeColors.textSecondary,
    ...typography.caption,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    color: themeColors.textPrimary,
    ...typography.body1,
    fontWeight: '600',
  },
  warningNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: spacing[3],
    borderRadius: radius.md,
    gap: spacing[1],
    marginBottom: spacing[4],
  },
  warningText: {
    color: themeColors.warning,
    ...typography.caption,
  },
  actionGroup: {
    marginTop: spacing[4],
  },
  btnSpacing: {
    marginBottom: spacing[3],
  },
});
