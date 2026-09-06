import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { themeColors } from '../../../theme';
import {
  useAccessStatus,
  useDynamicQR,
  useActiveVisit,
  useVisitHistory,
  useCheckOutMutation,
} from '../hooks/useAccess';
import {
  AccessStatusCard,
  DynamicQRCode,
  ActiveVisitBanner,
  VisitHistoryItem,
} from '../components';

type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;

export const AccessHomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: accessStatus,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useAccessStatus();
  const {
    token,
    displayIdentifier,
    secondsRemaining,
    refetch: refetchQR,
    isFetching: isRefreshingQR,
  } = useDynamicQR();
  const { data: activeVisit, refetch: refetchActiveVisit } = useActiveVisit();
  const { data: visitHistory, refetch: refetchVisits } = useVisitHistory(1, 5);

  const checkoutMutation = useCheckOutMutation();

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStatus(),
      refetchQR(),
      refetchActiveVisit(),
      refetchVisits(),
    ]);
    setRefreshing(false);
  };

  const handleCheckOut = () => {
    if (activeVisit) {
      checkoutMutation.mutate({ outletId: activeVisit.outletId });
    }
  };

  const isAllowed = accessStatus?.canAccessCurrentOutlet ?? false;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#E63946"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Physical Access</Text>
        <Text style={styles.subtitle}>
          Turnstile entry, dynamic passes & workout visits
        </Text>
      </View>

      {/* Active Workout Visit Banner */}
      {activeVisit && (
        <ActiveVisitBanner
          outletName={(activeVisit as any).outlet?.name || accessStatus?.currentOutlet?.name}
          checkedInAt={activeVisit.checkedInAt}
          onCheckOut={handleCheckOut}
          isCheckingOut={checkoutMutation.isPending}
        />
      )}

      {/* Main Access Status Card */}
      <AccessStatusCard status={accessStatus ?? null} isLoading={statusLoading} />

      {/* Dynamic QR Pass Container */}
      {isAllowed ? (
        <View style={styles.qrSection}>
          <Text style={styles.sectionHeader}>DIGITAL PASS</Text>
          <DynamicQRCode
            token={token}
            displayIdentifier={displayIdentifier}
            secondsRemaining={secondsRemaining}
            onRefresh={() => refetchQR()}
            isRefreshing={isRefreshingQR}
          />

          <TouchableOpacity
            style={styles.fullScreenButton}
            onPress={() => (navigation as any).navigate('QRCode')}
            activeOpacity={0.8}
          >
            <Text style={styles.fullScreenButtonText}>
              Open Full-Screen Scanner View &rarr;
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Action Buttons Row */}
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => (navigation as any).navigate('CheckIn')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🚪</Text>
          <Text style={styles.actionTitle}>Self Check-In</Text>
          <Text style={styles.actionDesc}>Tap or scan into gym</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => (navigation as any).navigate('AccessStatus')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🛡️</Text>
          <Text style={styles.actionTitle}>Diagnostics</Text>
          <Text style={styles.actionDesc}>Entitlements & scope</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Visits Section */}
      <View style={styles.recentVisitsSection}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionHeader}>RECENT GYM VISITS</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('VisitHistory')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {visitHistory?.items && visitHistory.items.length > 0 ? (
          visitHistory.items.map((v) => (
            <VisitHistoryItem key={v.id} visit={v} />
          ))
        ) : (
          <View style={styles.emptyVisitsBox}>
            <Text style={styles.emptyVisitsText}>
              No recent gym visits recorded yet.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 2,
  },
  qrSection: {
    marginVertical: 8,
  },
  sectionHeader: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  fullScreenButton: {
    backgroundColor: themeColors.elevatedBackground,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: -4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  fullScreenButtonText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: themeColors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 8,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionDesc: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  recentVisitsSection: {
    marginTop: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewAllText: {
    color: '#E63946',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyVisitsBox: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  emptyVisitsText: {
    color: '#6B7280',
    fontSize: 13,
  },
});
