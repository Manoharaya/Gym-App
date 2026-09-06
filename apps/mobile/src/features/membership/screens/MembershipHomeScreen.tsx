import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useActiveMembership } from '../hooks/useMembership';
import { MembershipStatusBadge } from '../components/MembershipStatusBadge';
import { AccessScopeBadge } from '../components/AccessScopeBadge';
import { EntitlementList } from '../components/EntitlementList';

interface MembershipHomeScreenProps {
  navigation: any;
}

export const MembershipHomeScreen: React.FC<MembershipHomeScreenProps> = ({ navigation }) => {
  const { data: activeMembership, isLoading, error, refetch } = useActiveMembership();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading membership details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Unable to load membership</Text>
        <Text style={styles.errorSubtitle}>Please check your connection and try again.</Text>
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Membership & Access</Text>
        <Text style={styles.headerSubtitle}>
          Second Wind Athletic Club — Active Facility Scope
        </Text>
      </View>

      {activeMembership ? (
        <View style={styles.heroCard}>
          <View style={styles.cardTopRow}>
            <Text style={styles.planName}>{activeMembership.planNameAtPurchase}</Text>
            <MembershipStatusBadge
              status={activeMembership.status}
              daysRemaining={activeMembership.daysRemaining}
            />
          </View>

          <View style={styles.scopeRow}>
            <AccessScopeBadge accessScope={activeMembership.accessScope} />
            {activeMembership.daysRemaining !== undefined && (
              <Text style={styles.remainingText}>
                {activeMembership.daysRemaining} days remaining
              </Text>
            )}
          </View>

          <View style={styles.datesContainer}>
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>STARTED</Text>
              <Text style={styles.dateValue}>{formatDate(activeMembership.startDate)}</Text>
            </View>
            <View style={styles.dateDivider} />
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>VALID UNTIL</Text>
              <Text style={styles.dateValue}>{formatDate(activeMembership.endDate)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>Included Privileges:</Text>
          <EntitlementList entitlements={activeMembership.membershipPlan?.entitlements} />

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() =>
                navigation.navigate('MembershipDetails', { membershipId: activeMembership.id })
              }
            >
              <Text style={styles.detailsButtonText}>Contract Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.plansButton}
              onPress={() => navigation.navigate('MembershipPlans')}
            >
              <Text style={styles.plansButtonText}>Browse Plans</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Active Membership</Text>
          <Text style={styles.emptyText}>
            You do not currently have an active membership plan assigned for Second Wind Athletic Club.
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('MembershipPlans')}
          >
            <Text style={styles.browseButtonText}>Explore Membership Plans</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.historyNavRow}
        onPress={() => navigation.navigate('MembershipHistory')}
      >
        <View>
          <Text style={styles.historyNavTitle}>Membership History</Text>
          <Text style={styles.historyNavSubtitle}>View previous passes and renewals</Text>
        </View>
        <Text style={styles.historyArrow}>→</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0F1D',
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  errorTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  heroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 10,
  },
  scopeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  remainingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  datesContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  dateCol: {
    flex: 1,
    alignItems: 'center',
  },
  dateDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 14,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
  },
  plansButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  plansButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  historyNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyNavTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  historyNavSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  historyArrow: {
    fontSize: 20,
    color: '#94A3B8',
  },
});
