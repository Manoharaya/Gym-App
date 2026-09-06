import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { useMyAttendance } from '../hooks/useAttendance';
import type { AttendanceRecord } from '../types';

type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;

export const AttendanceHistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { data: records = [], isLoading, refetch, isRefetching } = useMyAttendance();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'COMPLETED' | 'LATE'>('ALL');

  const filteredRecords = records.filter((r) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'COMPLETED') return r.status === 'COMPLETED' || r.status === 'CHECKED_IN';
    if (activeFilter === 'LATE') return r.status === 'LATE';
    return true;
  });

  const renderItem = ({ item }: { item: AttendanceRecord }) => {
    const session = item.classSession;
    const sessionDate = session?.startsAt ? new Date(session.startsAt) : new Date(item.createdAt);
    const isLate = item.status === 'LATE';
    const isCompleted = item.status === 'COMPLETED';

    return (
      <Card style={styles.recordCard}>
        <View style={styles.cardTop}>
          <View style={styles.titleArea}>
            <Text style={styles.className}>{session?.classType?.name || 'Class Session'}</Text>
            <Text style={styles.dateText}>
              {sessionDate.toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}{' '}
              at{' '}
              {sessionDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <Badge
            label={isLate ? 'LATE' : isCompleted ? 'COMPLETED' : item.status}
            variant={isLate ? 'warning' : isCompleted ? 'success' : 'neutral'}
          />
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>LOCATION</Text>
            <Text style={styles.metaValue}>{session?.outlet?.name || 'Main Gym'}</Text>
          </View>

          {item.durationMinutes ? (
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>DURATION</Text>
              <Text style={styles.metaValue}>{item.durationMinutes} mins</Text>
            </View>
          ) : null}

          {isLate && item.lateMinutes ? (
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>LATE</Text>
              <Text style={[styles.metaValue, { color: themeColors.warning }]}>
                +{item.lateMinutes}m
              </Text>
            </View>
          ) : null}

          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>METHOD</Text>
            <Text style={styles.metaValue}>{item.checkInMethod || 'APP'}</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {(['ALL', 'COMPLETED', 'LATE'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            onPress={() => setActiveFilter(filter)}
            style={[styles.tabButton, activeFilter === filter && styles.tabButtonActive]}
          >
            <Text
              style={[styles.tabText, activeFilter === filter && styles.tabTextActive]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.accent} />
          <Text style={styles.loadingText}>Loading attendance records...</Text>
        </View>
      ) : filteredRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="calendar" size={48} color={themeColors.textSecondary} />
          <Text style={styles.emptyTitle}>No Attendance Records</Text>
          <Text style={styles.emptySubtitle}>
            You have not attended any classes matching this filter.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: themeColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: themeColors.textPrimary,
    ...typography.h3,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  tabButton: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[4],
    borderRadius: radius.full,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  tabButtonActive: {
    backgroundColor: themeColors.accent,
    borderColor: themeColors.accent,
  },
  tabText: {
    color: themeColors.textSecondary,
    ...typography.caption,
    fontWeight: '600',
  },
  tabTextActive: {
    color: themeColors.background,
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  recordCard: {
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: spacing[4],
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleArea: {
    flex: 1,
  },
  className: {
    color: themeColors.textPrimary,
    ...typography.h3,
  },
  dateText: {
    color: themeColors.textSecondary,
    ...typography.caption,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: themeColors.border,
    marginVertical: spacing[2],
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    color: themeColors.textSecondary,
    ...typography.caption,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    color: themeColors.textPrimary,
    ...typography.caption,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: themeColors.textSecondary,
    marginTop: spacing[4],
    ...typography.body2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
  emptyTitle: {
    color: themeColors.textPrimary,
    ...typography.h3,
    marginTop: spacing[4],
  },
  emptySubtitle: {
    color: themeColors.textSecondary,
    ...typography.body2,
    textAlign: 'center',
    marginTop: spacing[1],
  },
});
