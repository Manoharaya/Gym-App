import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { RetentionService } from '../services/retentionService';
import type {
  RetentionDashboardSummaryDto,
  RetentionQueueItemDto,
  RetentionRiskLevel,
} from '@fitcore/types';

export const RetentionQueueScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [summary, setSummary] = useState<RetentionDashboardSummaryDto | null>(null);
  const [queueItems, setQueueItems] = useState<RetentionQueueItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<RetentionRiskLevel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      const [summaryRes, queueRes] = await Promise.all([
        RetentionService.getSummary(),
        RetentionService.getQueue({
          riskLevel: selectedRiskFilter === 'ALL' ? undefined : selectedRiskFilter,
          search: searchQuery || undefined,
        }),
      ]);
      setSummary(summaryRes);
      setQueueItems(queueRes.items);
    } catch (err: any) {
      console.warn('Failed to load retention data:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedRiskFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getRiskBadgeColor = (risk: RetentionRiskLevel) => {
    switch (risk) {
      case 'HIGH':
        return '#EF4444';
      case 'ELEVATED':
        return '#F59E0B';
      case 'MODERATE':
        return '#EAB308';
      case 'LOW':
        return '#10B981';
      default:
        return '#94A3B8';
    }
  };

  const renderSummaryCard = () => {
    if (!summary) return null;
    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Retention Intelligence Overview</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{summary.totalActiveMembers}</Text>
            <Text style={styles.metricLabel}>Active Members</Text>
          </View>
          <View style={[styles.metricBox, styles.metricBoxHigh]}>
            <Text style={[styles.metricValue, { color: '#EF4444' }]}>{summary.membersWithHighRisk}</Text>
            <Text style={styles.metricLabel}>High Risk</Text>
          </View>
          <View style={[styles.metricBox, styles.metricBoxElevated]}>
            <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{summary.membersWithElevatedRisk}</Text>
            <Text style={styles.metricLabel}>Elevated</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>{summary.membersReengaging}</Text>
            <Text style={styles.metricLabel}>Re-engaging</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderQueueItem = ({ item }: { item: RetentionQueueItemDto }) => {
    const riskColor = getRiskBadgeColor(item.riskLevel);
    return (
      <TouchableOpacity
        style={styles.queueCard}
        onPress={() => navigation?.navigate('RetentionDetail', { memberId: item.memberId })}
        testID={`queue-item-${item.memberId}`}
      >
        <View style={styles.queueCardHeader}>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{item.memberName}</Text>
            {item.outletName && <Text style={styles.outletText}>📍 {item.outletName}</Text>}
          </View>

          <View style={[styles.riskTag, { backgroundColor: `${riskColor}20`, borderColor: riskColor }]}>
            <Text style={[styles.riskTagText, { color: riskColor }]}>{item.riskLevel}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.reasonLabel}>Reason:</Text>
          <Text style={styles.reasonText}>{item.primaryReason}</Text>
        </View>

        <View style={styles.interventionRow}>
          <View style={styles.interventionBadge}>
            <Text style={styles.interventionText}>💡 {item.recommendedIntervention.replace(/_/g, ' ')}</Text>
          </View>
          <Text style={styles.trendLabel}>Trend: {item.riskTrend}</Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerInfo}>
            Trainer: {item.assignedTrainer ? item.assignedTrainer.name : 'Unassigned'}
          </Text>
          {item.lastVisit && <Text style={styles.footerInfo}>Last visit: {item.lastVisit.slice(0, 10)}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container} testID="retention-queue-screen">
      {/* Search Header */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search member by name or email..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={loadData}
          returnKeyType="search"
        />
      </View>

      {/* Risk Filter Chips */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['ALL', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                selectedRiskFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setSelectedRiskFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedRiskFilter === filter && styles.filterChipTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading retention intelligence...</Text>
        </View>
      ) : (
        <FlatList
          data={queueItems}
          keyExtractor={(item) => item.memberId}
          renderItem={renderQueueItem}
          ListHeaderComponent={renderSummaryCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No members matching current retention criteria.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#141824',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#222A3E',
    fontSize: 13,
  },
  filtersWrapper: {
    paddingBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#141824',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222A3E',
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#6366F1',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  summaryContainer: {
    backgroundColor: '#121622',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E2638',
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#0B0E16',
    borderRadius: 8,
    marginHorizontal: 3,
  },
  metricBoxHigh: {
    borderBottomWidth: 2,
    borderBottomColor: '#EF4444',
  },
  metricBoxElevated: {
    borderBottomWidth: 2,
    borderBottomColor: '#F59E0B',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  queueCard: {
    backgroundColor: '#141824',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#232C42',
    marginBottom: 12,
  },
  queueCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  outletText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  riskTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  riskTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    marginBottom: 8,
  },
  reasonLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  reasonText: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 1,
    lineHeight: 16,
  },
  interventionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  interventionBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  interventionText: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '600',
  },
  trendLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E2536',
  },
  footerInfo: {
    color: '#64748B',
    fontSize: 11,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 10,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
});
