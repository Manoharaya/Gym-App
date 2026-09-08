import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen, Card, Badge, Icon, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { WearablesService } from '../services/wearablesService';
import type { WearableProviderInfo, WearableProviderType } from '@fitcore/types';

export const WearableProviderDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const providerType: WearableProviderType = route.params?.provider || 'APPLE_HEALTH';

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [provider, setProvider] = useState<WearableProviderInfo | null>(null);

  useEffect(() => {
    WearablesService.getProvider(providerType)
      .then((res) => setProvider(res))
      .catch(() => Alert.alert('Error', 'Unable to load provider details'))
      .finally(() => setLoading(false));
  }, [providerType]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Connect provider
      const conn = await WearablesService.connect({
        provider: providerType,
        scopes: provider?.capabilities.map((c) => c.dataType) || [],
      });

      // Trigger initial synchronization
      await WearablesService.syncConnection(conn.id, { syncType: 'INITIAL' });

      Alert.alert(
        'Connected!',
        `Your ${provider?.name || 'device'} has been linked successfully. Initial health data has been synchronized.`,
        [
          {
            text: 'View Connection',
            onPress: () =>
              navigation.replace('WearableConnection', { connectionId: conn.id }),
          },
        ],
      );
    } catch (err: any) {
      if (err.message?.includes('WEARABLE_CONSENT_REQUIRED')) {
        Alert.alert(
          'Consent Required',
          'You must grant FitCore permission to process health and wearable data before connecting.',
        );
      } else {
        Alert.alert('Connection Error', err.message || 'Failed to connect provider.');
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{provider?.name || 'Provider Details'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading || !provider ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.accent} />
          </View>
        ) : (
          <>
            {/* Provider Banner */}
            <Card style={styles.bannerCard}>
              <View style={styles.bannerIcon}>
                <Icon
                  name={provider.provider === 'FITBIT' ? 'bolt' : 'activity'}
                  size={32}
                  color={themeColors.accent}
                />
              </View>
              <Text style={styles.bannerTitle}>{provider.name}</Text>
              <Badge
                label={provider.isEnabled ? 'WAVE 1 · ACTIVE' : 'WAVE 2 · PLANNED'}
                variant={provider.isEnabled ? 'success' : 'neutral'}
                style={styles.badge}
              />
              <Text style={styles.bannerDesc}>{provider.description}</Text>
            </Card>

            {/* Privacy Guarantee */}
            <Card style={styles.privacyNoticeCard}>
              <View style={styles.privacyHeader}>
                <Icon name="shield" size={18} color={themeColors.accent} />
                <Text style={styles.privacyHeading}>Privacy Guarantee</Text>
              </View>
              <Text style={styles.privacyNoticeText}>{provider.privacyNotice}</Text>
            </Card>

            {/* Capabilities Matrix */}
            <Text style={styles.sectionTitle}>SYNCHRONIZED METRICS</Text>
            <Card style={styles.capabilitiesCard}>
              {provider.capabilities.map((cap, idx) => (
                <View
                  key={cap.dataType}
                  style={[
                    styles.capabilityRow,
                    idx < provider.capabilities.length - 1 && styles.borderBottom,
                  ]}
                >
                  <View style={styles.capLeft}>
                    <Text style={styles.capName}>{cap.dataType.replace(/_/g, ' ')}</Text>
                    <Text style={styles.capDesc}>{cap.description}</Text>
                  </View>
                  <Badge label={cap.unit.toUpperCase()} variant="neutral" />
                </View>
              ))}
            </Card>

            {/* Connect CTA */}
            <View style={styles.ctaContainer}>
              <Button
                title={connecting ? 'Connecting & Syncing...' : `Connect ${provider.name}`}
                onPress={handleConnect}
                disabled={!provider.isEnabled || connecting}
                variant="primary"
              />
            </View>
          </>
        )}
      </ScrollView>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl * 2,
    alignItems: 'center',
  },
  bannerCard: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: themeColors.surface,
  },
  bannerIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: themeColors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  bannerTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
    marginBottom: spacing.xs,
  },
  badge: {
    marginBottom: spacing.md,
  },
  bannerDesc: {
    ...typography.body,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
  privacyNoticeCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: themeColors.surfaceLight,
    borderWidth: 1,
    borderColor: themeColors.accent + '22',
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  privacyHeading: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.accent,
  },
  privacyNoticeText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: themeColors.textTertiary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  capabilitiesCard: {
    padding: 0,
    backgroundColor: themeColors.surface,
    overflow: 'hidden',
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  capLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  capName: {
    ...typography.body,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  capDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  ctaContainer: {
    marginTop: spacing.xl,
  },
});
