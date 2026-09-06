import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { themeColors } from '../../../theme';
import { useAccessStatus } from '../hooks/useAccess';

export const AccessStatusScreen: React.FC = () => {
  const { data: status, isLoading } = useAccessStatus();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#E63946" />
      </View>
    );
  }

  const isAllowed = status?.canAccessCurrentOutlet ?? false;
  const membership = status?.activeMembership;
  const credential = status?.primaryCredential;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Access Diagnostics</Text>
        <Text style={styles.subtitle}>
          Authoritative membership, scope & credential verification
        </Text>
      </View>

      {/* Access Authority Status */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>PHYSICAL ACCESS AUTHORITY</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Authoritative Status</Text>
          <Text style={[styles.value, isAllowed ? styles.textSuccess : styles.textDanger]}>
            {isAllowed ? 'ALLOWED' : 'DENIED'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Decision Engine</Text>
          <Text style={styles.value}>AccessDecisionService</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Current Facility</Text>
          <Text style={styles.value}>{status?.currentOutlet?.name || 'None'}</Text>
        </View>
        {status?.denialReason && (
          <View style={styles.row}>
            <Text style={styles.label}>Reason Code</Text>
            <Text style={[styles.value, styles.textDanger]}>{status.denialReason}</Text>
          </View>
        )}
      </View>

      {/* Membership Entitlement Snapshot */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>MEMBERSHIP ENTITLEMENTS</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Plan Name</Text>
          <Text style={styles.value}>{membership?.planName || 'None Active'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Membership Status</Text>
          <Text style={styles.value}>{membership?.status || 'INACTIVE'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Access Scope</Text>
          <Text style={styles.value}>{membership?.accessScope || 'SINGLE_OUTLET'}</Text>
        </View>
        {membership?.startDate && (
          <View style={styles.row}>
            <Text style={styles.label}>Valid Period</Text>
            <Text style={styles.value}>
              {new Date(membership.startDate).toLocaleDateString()} &rarr;{' '}
              {new Date(membership.endDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Authorized Outlets */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          AUTHORIZED CLUBS ({status?.authorizedOutlets.length ?? 0})
        </Text>
        {status?.authorizedOutlets && status.authorizedOutlets.length > 0 ? (
          status.authorizedOutlets.map((outlet, index) => (
            <View key={outlet.id} style={styles.outletRow}>
              <Text style={styles.outletNumber}>{index + 1}.</Text>
              <View style={styles.outletDetails}>
                <Text style={styles.outletNameText}>{outlet.name}</Text>
                <Text style={styles.outletCodeText}>Code: {outlet.code}</Text>
              </View>
              <View style={styles.checkBadge}>
                <Text style={styles.checkBadgeText}>✓ Authorized</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No clubs authorized under current plan.</Text>
        )}
      </View>

      {/* Credential Security */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>ACTIVE ACCESS CREDENTIAL</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Credential Type</Text>
          <Text style={styles.value}>{credential?.type || 'QR_CODE'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Identifier</Text>
          <Text style={styles.value}>{credential?.displayIdentifier || 'Dynamic Pass Active'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.value, styles.textSuccess]}>{credential?.status || 'ACTIVE'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Replay Protection</Text>
          <Text style={styles.value}>HMAC-SHA256 Signed</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 14,
    padding: 18,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  sectionTitle: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  label: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  textSuccess: {
    color: '#10B981',
  },
  textDanger: {
    color: '#EF4444',
  },
  outletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  outletNumber: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    width: 24,
  },
  outletDetails: {
    flex: 1,
  },
  outletNameText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  outletCodeText: {
    color: '#6B7280',
    fontSize: 11,
  },
  checkBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  checkBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  noDataText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
});
