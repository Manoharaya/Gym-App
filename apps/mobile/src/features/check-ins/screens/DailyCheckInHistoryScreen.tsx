import React, { useEffect, useState } from 'react';
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
import { Screen, Card, Icon, Badge } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { dailyCheckInService } from '../services/dailyCheckInService';
import type { DailyCheckInHistoryItemDto } from '@fitcore/types';

type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;

export const DailyCheckInHistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DailyCheckInHistoryItemDto[]>([]);
  const [detectedTrends, setDetectedTrends] = useState<string[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await dailyCheckInService.getHistory(20);
      setItems(data.items);
      setDetectedTrends(data.detectedTrends || []);
    } catch {
      // Gracefully handle
    } finally {
      setLoading(false);
    }
  };

  const renderTrendBanner = () => {
    if (detectedTrends.length === 0) return null;
    return (
      <Card style={styles.trendCard}>
        <View style={styles.trendHeader}>
          <Icon name="activity" size={16} color={themeColors.accent} />
          <Text style={styles.trendTitle}>Observed Historical Trends</Text>
        </View>
        <View style={styles.trendPillList}>
          {detectedTrends.map((t, idx) => (
            <Badge key={idx} label={t.replace(/_/g, ' ')} variant="accent" />
          ))}
        </View>
      </Card>
    );
  };

  const renderItem = ({ item }: { item: DailyCheckInHistoryItemDto }) => (
    <TouchableOpacity
      onPress={() => (navigation as any).navigate('DailyCheckInDetail', { checkInId: item.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemDate}>{item.checkInDate}</Text>
          {item.readinessCategory ? (
            <Badge
              label={item.readinessCategory}
              variant={item.readinessCategory === 'OPTIMAL' ? 'success' : 'accent'}
            />
          ) : (
            <Badge label={item.status} variant="neutral" />
          )}
        </View>

        {item.todayFocus ? (
          <Text style={styles.itemFocus} numberOfLines={2}>
            {item.todayFocus}
          </Text>
        ) : null}

        <View style={styles.itemMetaRow}>
          {item.readinessScore !== null && item.readinessScore !== undefined ? (
            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>Readiness:</Text>
              <Text style={styles.metaVal}>{item.readinessScore}%</Text>
            </View>
          ) : null}

          {item.energyLevel ? (
            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>Energy:</Text>
              <Text style={styles.metaVal}>{item.energyLevel}</Text>
            </View>
          ) : null}

          {item.sorenessLevel ? (
            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>Soreness:</Text>
              <Text style={styles.metaVal}>{item.sorenessLevel}</Text>
            </View>
          ) : null}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Check-In History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          ListHeaderComponent={renderTrendBanner}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No historical check-ins recorded yet.</Text>
            </View>
          }
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  trendCard: {
    padding: spacing.md,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: themeColors.accent,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trendTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.accent,
  },
  trendPillList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  itemCard: {
    padding: spacing.md,
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.xs,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDate: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  itemFocus: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  itemMetaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: themeColors.surfaceHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  metaLabel: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  metaVal: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.bodySecondary,
    color: themeColors.textTertiary,
  },
});
