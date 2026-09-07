import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { notificationService } from '../services/notificationService';
import type { NotificationPreference } from '@fitcore/types';

interface PreferenceState {
  bookingPush: boolean;
  bookingEmail: boolean;
  trainingPush: boolean;
  trainingEmail: boolean;
  paymentPush: boolean;
  paymentEmail: boolean;
  marketingPush: boolean;
  marketingEmail: boolean;
  marketingSms: boolean;
  quietHoursEnabled: boolean;
}

export const NotificationPreferencesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [marketingConsent, setMarketingConsent] = useState<boolean>(false);

  const [state, setState] = useState<PreferenceState>({
    bookingPush: true,
    bookingEmail: true,
    trainingPush: true,
    trainingEmail: true,
    paymentPush: true,
    paymentEmail: true,
    marketingPush: false,
    marketingEmail: false,
    marketingSms: false,
    quietHoursEnabled: false,
  });

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await notificationService.getPreferences();
      setMarketingConsent(res.marketingConsentActive || false);

      const prefs = res.preferences || [];
      const getPref = (cat: string, chan: string, defVal = true) => {
        const found = prefs.find(
          (p: NotificationPreference) => p.category === cat && p.channel === chan,
        );
        return found ? found.enabled : defVal;
      };

      const anyQuiet = prefs.some((p: NotificationPreference) => !!p.quietHoursStart);

      setState({
        bookingPush: getPref('BOOKING', 'PUSH', true),
        bookingEmail: getPref('BOOKING', 'EMAIL', true),
        trainingPush: getPref('TRAINING', 'PUSH', true),
        trainingEmail: getPref('TRAINING', 'EMAIL', true),
        paymentPush: getPref('PAYMENT', 'PUSH', true),
        paymentEmail: getPref('PAYMENT', 'EMAIL', true),
        marketingPush: getPref('MARKETING', 'PUSH', false),
        marketingEmail: getPref('MARKETING', 'EMAIL', false),
        marketingSms: getPref('MARKETING', 'SMS', false),
        quietHoursEnabled: anyQuiet,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleToggle = async (
    key: keyof PreferenceState,
    category: string,
    channel: string,
  ) => {
    const newValue = !state[key];
    setState((prev) => ({ ...prev, [key]: newValue }));

    try {
      setSaving(true);
      setError(null);
      await notificationService.updatePreference({
        category,
        channel,
        enabled: newValue,
        ...(state.quietHoursEnabled
          ? { quietHoursStart: '22:00', quietHoursEnd: '07:00' }
          : {}),
      });
      setSuccessMsg('Preference updated');
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save preference');
      // Revert state
      setState((prev) => ({ ...prev, [key]: !newValue }));
    } finally {
      setSaving(false);
    }
  };

  const handleQuietHoursToggle = async () => {
    const newQuiet = !state.quietHoursEnabled;
    setState((prev) => ({ ...prev, quietHoursEnabled: newQuiet }));
    try {
      setSaving(true);
      await notificationService.updatePreference({
        category: 'BOOKING',
        channel: 'PUSH',
        enabled: state.bookingPush,
        quietHoursStart: newQuiet ? '22:00' : undefined,
        quietHoursEnd: newQuiet ? '07:00' : undefined,
      });
      setSuccessMsg(newQuiet ? 'Quiet hours enabled (10 PM – 7 AM)' : 'Quiet hours disabled');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to update quiet hours');
      setState((prev) => ({ ...prev, quietHoursEnabled: !newQuiet }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Preferences</Text>
        <View style={styles.headerRightPlaceholder}>
          {saving && <ActivityIndicator size="small" color={themeColors.accent} />}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.accent} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {successMsg && (
            <View style={styles.successBanner}>
              <Icon name="check-circle" size={16} color={themeColors.success} />
              <Text style={styles.successBannerText}>{successMsg}</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle" size={16} color={themeColors.danger} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Essential Notices Disclaimer */}
          <Card style={styles.disclaimerCard}>
            <View style={styles.disclaimerHeader}>
              <Icon name="shield" size={18} color={themeColors.accent} />
              <Text style={styles.disclaimerTitle}>Essential Communications</Text>
            </View>
            <Text style={styles.disclaimerBody}>
              Security notices, password resets, payment receipts, and mandatory facility access updates
              are delivered automatically and cannot be disabled.
            </Text>
          </Card>

          {/* Bookings Section */}
          <Text style={styles.sectionHeader}>Class & Facility Bookings</Text>
          <Card style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <Text style={styles.toggleTitle}>Push Notifications</Text>
                <Text style={styles.toggleDesc}>Reminders, confirmations & waitlist promotions</Text>
              </View>
              <Switch
                value={state.bookingPush}
                onValueChange={() => handleToggle('bookingPush', 'BOOKING', 'PUSH')}
                trackColor={{ false: themeColors.surfaceActive, true: themeColors.accent }}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <Text style={styles.toggleTitle}>Email Confirmations</Text>
                <Text style={styles.toggleDesc}>Detailed reservation and timetable receipts</Text>
              </View>
              <Switch
                value={state.bookingEmail}
                onValueChange={() => handleToggle('bookingEmail', 'BOOKING', 'EMAIL')}
                trackColor={{ false: themeColors.surfaceActive, true: themeColors.accent }}
              />
            </View>
          </Card>

          {/* Training & Coaching Section */}
          <Text style={styles.sectionHeader}>Training & Coaching</Text>
          <Card style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <Text style={styles.toggleTitle}>Push Notifications</Text>
                <Text style={styles.toggleDesc}>New workout assignments, PT session alerts</Text>
              </View>
              <Switch
                value={state.trainingPush}
                onValueChange={() => handleToggle('trainingPush', 'TRAINING', 'PUSH')}
                trackColor={{ false: themeColors.surfaceActive, true: themeColors.accent }}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <Text style={styles.toggleTitle}>Email Summaries</Text>
                <Text style={styles.toggleDesc}>Weekly training programs and coach notes</Text>
              </View>
              <Switch
                value={state.trainingEmail}
                onValueChange={() => handleToggle('trainingEmail', 'TRAINING', 'EMAIL')}
                trackColor={{ false: themeColors.surfaceActive, true: themeColors.accent }}
              />
            </View>
          </Card>

          {/* Billing & Payments Section */}
          <Text style={styles.sectionHeader}>Billing & Memberships</Text>
          <Card style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <Text style={styles.toggleTitle}>Push Notifications</Text>
                <Text style={styles.toggleDesc}>Payment status and renewal reminders</Text>
              </View>
              <Switch
                value={state.paymentPush}
                onValueChange={() => handleToggle('paymentPush', 'PAYMENT', 'PUSH')}
                trackColor={{ false: themeColors.surfaceActive, true: themeColors.accent }}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <Text style={styles.toggleTitle}>Email Invoices</Text>
                <Text style={styles.toggleDesc}>Payment tax receipts and membership invoices</Text>
              </View>
              <Switch
                value={state.paymentEmail}
                onValueChange={() => handleToggle('paymentEmail', 'PAYMENT', 'EMAIL')}
                trackColor={{ false: themeColors.surfaceActive, true: themeColors.accent }}
              />
            </View>
          </Card>

          {/* Quiet Hours Section */}
          <Text style={styles.sectionHeader}>Quiet Hours</Text>
          <Card style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <Text style={styles.toggleTitle}>Silence Alerts at Night</Text>
                <Text style={styles.toggleDesc}>Mutes non-critical push alerts between 10:00 PM – 7:00 AM</Text>
              </View>
              <Switch
                value={state.quietHoursEnabled}
                onValueChange={handleQuietHoursToggle}
                trackColor={{ false: themeColors.surfaceActive, true: themeColors.accent }}
              />
            </View>
          </Card>

          {/* Marketing Communications Section */}
          <Text style={styles.sectionHeader}>Promotions & Offers</Text>
          <Card style={styles.card}>
            <View style={styles.consentStatusRow}>
              <Text style={styles.consentStatusLabel}>Marketing Consent Status:</Text>
              <Text
                style={[
                  styles.consentStatusBadge,
                  marketingConsent ? styles.consentActive : styles.consentInactive,
                ]}
              >
                {marketingConsent ? 'Active (Consented)' : 'Declined / Withdrawn'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <Text style={styles.toggleTitle}>Marketing Push</Text>
                <Text style={styles.toggleDesc}>Club events, challenges & exclusive offers</Text>
              </View>
              <Switch
                disabled={!marketingConsent}
                value={state.marketingPush && marketingConsent}
                onValueChange={() => handleToggle('marketingPush', 'MARKETING', 'PUSH')}
                trackColor={{ false: themeColors.surfaceActive, true: themeColors.accent }}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <Text style={styles.toggleTitle}>Marketing Email</Text>
                <Text style={styles.toggleDesc}>Monthly newsletter and retail discounts</Text>
              </View>
              <Switch
                disabled={!marketingConsent}
                value={state.marketingEmail && marketingConsent}
                onValueChange={() => handleToggle('marketingEmail', 'MARKETING', 'EMAIL')}
                trackColor={{ false: themeColors.surfaceActive, true: themeColors.accent }}
              />
            </View>
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  iconButton: {
    padding: spacing[2],
  },
  headerRightPlaceholder: {
    width: 36,
  },
  container: {
    padding: spacing[4],
    paddingBottom: spacing[16],
  },
  sectionHeader: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  card: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  disclaimerCard: {
    backgroundColor: themeColors.surfaceActive,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: themeColors.accent,
    marginBottom: spacing[2],
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  disclaimerTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  disclaimerBody: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: spacing[3],
  },
  toggleTitle: {
    ...typography.body,
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  toggleDesc: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: themeColors.border,
    marginVertical: spacing[1],
  },
  consentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  consentStatusLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  consentStatusBadge: {
    ...typography.caption,
    fontWeight: '700',
  },
  consentActive: {
    color: themeColors.success,
  },
  consentInactive: {
    color: themeColors.textMuted,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: themeColors.surface,
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.success,
    marginBottom: spacing[3],
  },
  successBannerText: {
    ...typography.caption,
    color: themeColors.success,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: themeColors.surface,
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.danger,
    marginBottom: spacing[3],
  },
  errorBannerText: {
    ...typography.caption,
    color: themeColors.danger,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  loadingText: {
    ...typography.body,
    color: themeColors.textSecondary,
    marginTop: spacing[3],
  },
});
