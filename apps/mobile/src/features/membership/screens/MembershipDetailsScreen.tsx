import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useMembershipDetails, useCancelMembership, useRenewMembership } from '../hooks/useMembership';
import { MembershipStatusBadge } from '../components/MembershipStatusBadge';
import { AccessScopeBadge } from '../components/AccessScopeBadge';
import { EntitlementList } from '../components/EntitlementList';

interface MembershipDetailsScreenProps {
  route: any;
  navigation: any;
}

export const MembershipDetailsScreen: React.FC<MembershipDetailsScreenProps> = ({
  route,
  navigation,
}) => {
  const membershipId = route.params?.membershipId;
  const { data: membership, isLoading, error } = useMembershipDetails(membershipId);
  const cancelMutation = useCancelMembership();
  const renewMutation = useRenewMembership();

  const [isProcessing, setIsProcessing] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading contract details...</Text>
      </View>
    );
  }

  if (error || !membership) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Membership not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Membership',
      'Are you sure you wish to cancel this membership? Your access privileges will conclude at the end of your billing cycle.',
      [
        { text: 'Keep Membership', style: 'cancel' },
        {
          text: 'Confirm Cancellation',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await cancelMutation.mutateAsync({ id: membership.id, reason: 'Member initiated' });
              Alert.alert('Cancellation Confirmed', 'Your membership has been updated.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Unable to process cancellation.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleRenew = async () => {
    setIsProcessing(true);
    try {
      await renewMutation.mutateAsync(membership.id);
      Alert.alert('Renewal Successful', 'Your membership has been renewed for the next term.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Unable to process renewal.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.statusRow}>
          <Text style={styles.planName}>{membership.planNameAtPurchase}</Text>
          <MembershipStatusBadge
            status={membership.status}
            daysRemaining={membership.daysRemaining}
          />
        </View>

        <View style={styles.badgeRow}>
          <AccessScopeBadge accessScope={membership.accessScope} />
        </View>

        <View style={styles.commercialBox}>
          <Text style={styles.commercialLabel}>COMMERCIAL TERMS SNAPSHOT</Text>
          <Text style={styles.commercialPrice}>
            {membership.currencyAtPurchase} ${membership.priceAtPurchase.toFixed(2)}
          </Text>
          <Text style={styles.commercialSubtext}>
            Billed {membership.billingTypeAtPurchase.toLowerCase()} every {membership.durationValueAtPurchase} {membership.durationUnitAtPurchase.toLowerCase()}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTRACT TIMELINE</Text>
          <View style={styles.timelineRow}>
            <Text style={styles.timelineLabel}>Start Date</Text>
            <Text style={styles.timelineValue}>{formatDate(membership.startDate)}</Text>
          </View>
          <View style={styles.timelineRow}>
            <Text style={styles.timelineLabel}>End Date</Text>
            <Text style={styles.timelineValue}>{formatDate(membership.endDate)}</Text>
          </View>
          {membership.activatedAt && (
            <View style={styles.timelineRow}>
              <Text style={styles.timelineLabel}>Activated On</Text>
              <Text style={styles.timelineValue}>{formatDate(membership.activatedAt)}</Text>
            </View>
          )}
          <View style={styles.timelineRow}>
            <Text style={styles.timelineLabel}>Auto-Renewal</Text>
            <Text style={styles.timelineValue}>
              {membership.autoRenew ? 'Enabled (Automatic)' : 'Disabled'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INCLUDED ENTITLEMENTS</Text>
          <EntitlementList entitlements={membership.membershipPlan?.entitlements} />
        </View>

        {membership.status === 'ACTIVE' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.renewBtn, isProcessing && styles.disabledBtn]}
              onPress={handleRenew}
              disabled={isProcessing}
            >
              <Text style={styles.renewBtnText}>
                {isProcessing ? 'Processing...' : 'Renew Next Period'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, isProcessing && styles.disabledBtn]}
              onPress={handleCancel}
              disabled={isProcessing}
            >
              <Text style={styles.cancelBtnText}>Cancel Membership</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
  errorTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 10,
  },
  badgeRow: {
    marginBottom: 16,
  },
  commercialBox: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  commercialLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  commercialPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#38BDF8',
  },
  commercialSubtext: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  timelineLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 16,
  },
  actionButtons: {
    marginTop: 20,
    gap: 12,
  },
  renewBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  renewBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
