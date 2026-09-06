import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useMembershipPlans } from '../hooks/useMembership';
import { PlanCard } from '../components/PlanCard';

interface MembershipPlansScreenProps {
  navigation: any;
}

export const MembershipPlansScreen: React.FC<MembershipPlansScreenProps> = () => {
  const { data: plans = [], isLoading, error, refetch } = useMembershipPlans();
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredPlans = plans.filter((p) => {
    if (filterType === 'ALL') return true;
    return p.membershipType === filterType;
  });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading membership plans...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Unable to load plans</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {['ALL', 'STANDARD', 'TRIAL'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterChip, filterType === type && styles.activeChip]}
            onPress={() => setFilterType(type)}
          >
            <Text style={[styles.chipText, filterType === type && styles.activeChipText]}>
              {type === 'ALL' ? 'All Plans' : type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredPlans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PlanCard plan={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Plans Available</Text>
            <Text style={styles.emptySubtitle}>
              There are currently no membership plans available in this category.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0F1D',
    padding: 20,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
  errorTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeChip: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeChipText: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
