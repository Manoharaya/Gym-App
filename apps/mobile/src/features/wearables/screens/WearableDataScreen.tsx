import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { WearablesService } from '../services/wearablesService';
import type { HealthDataRecordDto, HealthDataType } from '@fitcore/types';

const FILTER_TYPES: Array<{ label: string; value?: HealthDataType }> = [
  { label: 'All' },
  { label: 'Steps', value: 'STEPS' },
  { label: 'Heart Rate', value: 'HEART_RATE' },
  { label: 'Calories', value: 'ACTIVE_CALORIES' },
  { label: 'Sleep', value: 'SLEEP' },
  { label: 'Distance', value: 'DISTANCE' },
];

export const WearableDataScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [selectedType, setSelectedType] = useState<HealthDataType | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<HealthDataRecordDto[]>([]);
  const [, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async (type?: HealthDataType, pageNum = 1) => {
    setLoading(true);
    try {
      const res = await WearablesService.getHealthData({
        dataType: type,
        page: pageNum,
        limit: 30,
      });
      setRecords(res.records);
      setTotal(res.total);
      setPage(pageNum);
    } catch {
      // Graceful error fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedType, 1);
  }, [selectedType, loadData]);

  const handleFilterSelect = (val?: HealthDataType) => {
    setSelectedType(val);
  };

  const renderRecordItem = ({ item }: { item: HealthDataRecordDto }) => {
    const formattedDate = new Date(item.startTime).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Card style={styles.recordCard}>
        <View style={styles.recordRow}>
          <View style={styles.iconBox}>
            <Icon
              name={
                item.dataType === 'HEART_RATE' || item.dataType === 'RESTING_HEART_RATE'
                  ? 'heart'
                  : item.dataType === 'ACTIVE_CALORIES'
                  ? 'flame'
                  : 'activity'
              }
              size={18}
              color={themeColors.accent}
            />
          </View>
          <View style={styles.recordContent}>
            <View style={styles.recordTitleRow}>
              <Text style={styles.dataTypeText}>{item.dataType.replace(/_/g, ' ')}</Text>
              <Text style={styles.valueText}>
                {item.value.toLocaleString()} {item.unit}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaTime}>{formattedDate}</Text>
              <Badge label={item.provider.replace(/_/g, ' ')} variant="neutral" />
            </View>
            {item.sourceName ? (
              <Text style={styles.deviceText}>Source: {item.sourceName}</Text>
            ) : null}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Telemetry Logs</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_TYPES}
          keyExtractor={(item) => item.label}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isSelected = selectedType === item.value;
            return (
              <TouchableOpacity
                onPress={() => handleFilterSelect(item.value)}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Record Counter */}
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          {total} {total === 1 ? 'record' : 'records'} found
        </Text>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.accent} />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="activity" size={36} color={themeColors.textTertiary} />
          <Text style={styles.emptyTitle}>No Health Records</Text>
          <Text style={styles.emptyDesc}>
            No synchronized records match the selected filter. Connect a wearable device to begin streaming telemetry.
          </Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderRecordItem}
          contentContainerStyle={styles.recordsList}
          showsVerticalScrollIndicator={false}
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
    paddingHorizontal: spacing.lg,
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
  filterContainer: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  filterChipActive: {
    backgroundColor: themeColors.accent,
    borderColor: themeColors.accent,
  },
  filterText: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  filterTextActive: {
    color: themeColors.background,
  },
  counterRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  counterText: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginTop: spacing.md,
  },
  emptyDesc: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  recordsList: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  recordCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: themeColors.surface,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: themeColors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  recordContent: {
    flex: 1,
  },
  recordTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataTypeText: {
    ...typography.body,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  valueText: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.accent,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  metaTime: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  deviceText: {
    ...typography.caption,
    color: themeColors.textTertiary,
    marginTop: 2,
  },
});
