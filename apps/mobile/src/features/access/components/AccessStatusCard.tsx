import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { themeColors } from '../../../theme';
import type { MemberAccessStatusResponse } from '../types';

interface AccessStatusCardProps {
  status: MemberAccessStatusResponse | null;
  isLoading?: boolean;
}

export const AccessStatusCard: React.FC<AccessStatusCardProps> = ({ status, isLoading }) => {
  if (isLoading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <Text style={styles.loadingText}>Verifying facility access credentials...</Text>
      </View>
    );
  }

  const isAllowed = status?.canAccessCurrentOutlet ?? false;
  const outletName = status?.currentOutlet?.name || 'Selected Facility';
  const planName = status?.activeMembership?.planName || 'No Active Membership';
  const accessScope = status?.activeMembership?.accessScope || 'None';

  const formatScope = (scope: string) => {
    switch (scope) {
      case 'ALL_ORGANISATION_OUTLETS':
        return 'All-Clubs Access';
      case 'MULTI_OUTLET':
        return 'Multi-Club Access';
      case 'SINGLE_OUTLET':
        return 'Home Club Access';
      default:
        return 'Standard';
    }
  };

  return (
    <View style={[styles.card, isAllowed ? styles.cardAllowed : styles.cardDenied]}>
      {/* Header Badge */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.statusBadge,
            isAllowed ? styles.statusBadgeAllowed : styles.statusBadgeDenied,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isAllowed ? styles.statusDotAllowed : styles.statusDotDenied,
            ]}
          />
          <Text
            style={[
              styles.statusBadgeText,
              isAllowed ? styles.statusBadgeTextAllowed : styles.statusBadgeTextDenied,
            ]}
          >
            {isAllowed ? 'ACCESS ACTIVE' : 'ACCESS NOT AVAILABLE'}
          </Text>
        </View>

        <View style={styles.scopeChip}>
          <Text style={styles.scopeChipText}>{formatScope(accessScope)}</Text>
        </View>
      </View>

      {/* Facility & Plan Info */}
      <View style={styles.contentSection}>
        <Text style={styles.outletTitle}>{outletName}</Text>
        <Text style={styles.planSubtitle}>{planName}</Text>
      </View>

      {/* User-facing Friendly Reason/Instruction */}
      <View style={styles.messageBox}>
        <Text style={styles.messageText}>
          {status?.userFacingMessage ||
            (isAllowed
              ? 'Present your dynamic QR pass at the entrance turnstile to enter.'
              : 'Physical access is not available. Please review your membership or speak to reception.')}
        </Text>
      </View>

      {/* Authorized Outlets Count */}
      {status?.authorizedOutlets && status.authorizedOutlets.length > 0 && (
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>
            Authorized at {status.authorizedOutlets.length} club
            {status.authorizedOutlets.length > 1 ? 's' : ''}:{' '}
            {status.authorizedOutlets.map((o) => o.name).join(', ')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardAllowed: {
    borderColor: '#10B981',
  },
  cardDenied: {
    borderColor: '#EF4444',
  },
  loadingCard: {
    borderColor: themeColors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeAllowed: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusBadgeDenied: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusDotAllowed: {
    backgroundColor: '#10B981',
  },
  statusDotDenied: {
    backgroundColor: '#EF4444',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadgeTextAllowed: {
    color: '#10B981',
  },
  statusBadgeTextDenied: {
    color: '#EF4444',
  },
  scopeChip: {
    backgroundColor: themeColors.elevatedBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scopeChipText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '600',
  },
  contentSection: {
    marginBottom: 12,
  },
  outletTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  planSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  messageBox: {
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  messageText: {
    color: '#E5E7EB',
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: themeColors.inputBorder,
    paddingTop: 8,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 11,
  },
});
