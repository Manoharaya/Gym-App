import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing } from '../../../theme';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [darkMode, setDarkMode] = useState(true);
  const [biometrics, setBiometrics] = useState(true);
  const [waitlistAlerts, setWaitlistAlerts] = useState(true);
  const [bookingReminders, setBookingReminders] = useState(true);

  const handleExportData = () => {
    Alert.alert(
      'Export Personal Data',
      'Your encrypted fitness telemetry and health records will be compiled into a secure JSON archive and emailed to your registered address.',
      [{ text: 'Request Export', onPress: () => Alert.alert('Request Submitted', 'Archive sent.') }, { text: 'Cancel', style: 'cancel' }],
    );
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings & Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Appearance */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>APPEARANCE</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Dark Athletic Theme</Text>
              <Text style={styles.settingDescription}>Deep space obsidian with high-contrast accents</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: themeColors.surfaceActive, true: themeColors.accent }}
            />
          </View>
        </Card>

        {/* Security & Access */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>SECURITY</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Biometric App Lock</Text>
              <Text style={styles.settingDescription}>Require FaceID / TouchID to open FitCore</Text>
            </View>
            <Switch
              value={biometrics}
              onValueChange={setBiometrics}
              trackColor={{ false: themeColors.surfaceActive, true: themeColors.accent }}
            />
          </View>
        </Card>

        {/* Notification Preferences */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>NOTIFICATIONS</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Waitlist Auto-Promotion</Text>
              <Text style={styles.settingDescription}>Immediate notification when promoted to confirmed spot</Text>
            </View>
            <Switch
              value={waitlistAlerts}
              onValueChange={setWaitlistAlerts}
              trackColor={{ false: themeColors.surfaceActive, true: themeColors.accent }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Class Reminders</Text>
              <Text style={styles.settingDescription}>Alert 2 hours prior to scheduled class start</Text>
            </View>
            <Switch
              value={bookingReminders}
              onValueChange={setBookingReminders}
              trackColor={{ false: themeColors.surfaceActive, true: themeColors.accent }}
            />
          </View>
        </Card>

        {/* Privacy & Health Data */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>PRIVACY & GDPR / APPs</Text>
          <TouchableOpacity onPress={handleExportData} style={styles.actionRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Export My Fitness Data</Text>
              <Text style={styles.settingDescription}>Download encrypted training history and biometrics</Text>
            </View>
            <Icon name="chevron-right" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Build & Version Info */}
        <View style={styles.footerInfo}>
          <Text style={styles.versionText}>FitCore Mobile Platform v0.1.0</Text>
          <Text style={styles.tenantInfo}>Multi-Tenant Architecture · Second Wind Athletic Club</Text>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing[2],
    marginLeft: -spacing[2],
  },
  headerTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  container: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },
  sectionCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
    gap: spacing[3],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
    gap: spacing[3],
  },
  settingText: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  settingDescription: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  footerInfo: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing[4],
  },
  versionText: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '600',
  },
  tenantInfo: {
    fontSize: 10,
    color: themeColors.textMuted,
  },
});
