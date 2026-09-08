import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { ReactivationService } from '../services/reactivationService';
import { MemberRecoveryCard } from '../components/MemberRecoveryCard';
import type { ReactivationQueueItemDto, ReactivationSummaryDto } from '@fitcore/types';

interface Props {
  navigation: any;
}

export const ReactivationQueueScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ReactivationQueueItemDto[]>([]);
  const [summary, setSummary] = useState<ReactivationSummaryDto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'NEEDS_ATTENTION' | 'RECOVERING' | 'REENGAGED'>('ALL');

  const fetchData = useCallback(async () => {
    try {
      const [queueRes, summaryRes] = await Promise.all([
        ReactivationService.getQueue({
          reactivationStatus: activeTab === 'ALL' ? undefined : activeTab,
        }),
        ReactivationService.getSummary(),
      ]);
      setItems(queueRes.items || []);
      setSummary(summaryRes);
    } catch (err: any) {
      console.error('Failed to fetch reactivation queue:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    return item.memberName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <View style={styles.container} testID="reactivation-queue-screen">
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
          testID="reactivation-search-input"
        />
      </View>

      {/* Metric Summary Ribbon */}
      {summary && (
        <View style={styles.summaryRibbon}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{summary.totalActiveMembers}</Text>
            <Text style={styles.metricLabel}>Total Members</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{summary.membersInReactivationCount}</Text>
            <Text style={styles.metricLabel}>In Recovery</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>{summary.reengagedMembersCount}</Text>
            <Text style={styles.metricLabel}>Re-engaged</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricValue, { color: '#6366F1' }]}>{summary.recoveryRatePercent}%</Text>
            <Text style={styles.metricLabel}>Success Rate</Text>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {(['ALL', 'NEEDS_ATTENTION', 'RECOVERING', 'REENGAGED'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
            testID={`reactivation-tab-${tab}`}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Queue List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.memberId}
          renderItem={({ item }) => (
            <MemberRecoveryCard
              memberId={item.memberId}
              memberName={item.memberName}
              daysInactive={item.inactivityDays}
              recoveryState={item.recoveryState}
              recommendedStrategy={item.recommendedStrategy}
              onViewPlan={(planId) => navigation.navigate('RecoveryPlanDetail', { planId })}
              onCreatePlan={() =>
                navigation.navigate('RecoveryPlanDetail', {
                  memberId: item.memberId,
                  memberName: item.memberName,
                  strategy: item.recommendedStrategy,
                })
              }
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Members in Queue</Text>
              <Text style={styles.emptySubtitle}>All members are currently active or accounted for.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
  searchRow: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricBox: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
  },
  tabButtonActive: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
  },
});
