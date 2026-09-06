import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useMembershipHistory } from '../hooks/useMembership';
import { MembershipStatusBadge } from '../components/MembershipStatusBadge';
import { AccessScopeBadge } from '../components/AccessScopeBadge';
import type { MemberMembership } from '../types';

interface MembershipHistoryScreenProps {
  navigation: any;
}

export const MembershipHistoryScreen: React.FC<MembershipHistoryScreenProps> = ({
  navigation,
}) => {
  const { data: history, isLoading, error, refetch } = useMembershipHistory();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading membership records...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Unable to load history</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderItem = ({ item }: { item: MemberMembership }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('MembershipDetails', { membershipId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.planName}>{item.planNameAtPurchase}</Text>
        <MembershipStatusBadge status={item.status} />
      </View>

      <View style={styles.scopeRow}>
        <AccessScopeBadge accessScope={item.accessScope} />
        <Text style={styles.priceText}>
          {item.currencyAtPurchase} ${item.priceAtPurchase.toFixed(2)}
        </Text>
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>TERM:</Text>
        <Text style={styles.dateValue}>
          {formatDate(item.startDate)} — {formatDate(item.endDate)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Previous Memberships</Text>
            <Text style={styles.emptySubtitle}>
              Your membership history and past renewals will appear here.
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
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
    marginRight: 10,
  },
  scopeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginRight: 6,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
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
