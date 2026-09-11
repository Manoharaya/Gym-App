import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';

export interface SecuritySettingsProps {
  navigation: any;
}

export const SecuritySettingsScreen: React.FC<SecuritySettingsProps> = ({ navigation }) => {
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);
  const activeSessionsCount = 1;
  const devicesCount = 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Security & Privacy
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Manage multi-factor authentication, active devices, and session security.
      </Text>

      {/* MFA Card */}
      <Card style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <View style={styles.textColumn}>
            <Text variant="body" style={styles.cardTitle}>
              Two-Factor Authentication (MFA)
            </Text>
            <Text variant="caption" style={styles.cardDesc}>
              Protect your account with an extra layer of security via Authenticator App (TOTP).
            </Text>
          </View>
          <Badge
            variant={isMfaEnabled ? 'success' : 'neutral'}
            label={isMfaEnabled ? 'Enabled' : 'Disabled'}
          />
        </View>

        <TouchableOpacity
          style={[styles.actionButton, isMfaEnabled ? styles.secondaryBtn : styles.primaryBtn]}
          onPress={() => {
            if (isMfaEnabled) {
              Alert.alert(
                'Disable MFA',
                'Disabling two-factor authentication will reduce your account security ceiling. Proceed?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Disable',
                    style: 'destructive',
                    onPress: () => setIsMfaEnabled(false),
                  },
                ],
              );
            } else {
              navigation.navigate('MfaSetup');
            }
          }}
        >
          <Text style={isMfaEnabled ? styles.secondaryBtnText : styles.primaryBtnText}>
            {isMfaEnabled ? 'Manage Two-Factor Auth' : 'Enable Two-Factor Auth'}
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Recovery Codes */}
      <TouchableOpacity
        style={styles.navCard}
        onPress={() => navigation.navigate('RecoveryCodes')}
      >
        <View style={styles.rowBetween}>
          <View>
            <Text variant="body">Emergency Recovery Codes</Text>
            <Text variant="caption">10 backup codes for emergency sign-in</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>

      {/* Active Sessions */}
      <TouchableOpacity
        style={styles.navCard}
        onPress={() => navigation.navigate('Sessions')}
      >
        <View style={styles.rowBetween}>
          <View>
            <Text variant="body">Active Sessions</Text>
            <Text variant="caption">{activeSessionsCount} active login session(s)</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>

      {/* Registered Devices */}
      <TouchableOpacity
        style={styles.navCard}
        onPress={() => navigation.navigate('Devices')}
      >
        <View style={styles.rowBetween}>
          <View>
            <Text variant="body">Registered Devices</Text>
            <Text variant="caption">{devicesCount} recognized device(s)</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>

      {/* Login Activity */}
      <TouchableOpacity
        style={styles.navCard}
        onPress={() => navigation.navigate('LoginActivity')}
      >
        <View style={styles.rowBetween}>
          <View>
            <Text variant="body">Recent Login Activity</Text>
            <Text variant="caption">Review sign-ins, locations, and security events</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: '#FFFFFF', fontWeight: 'bold', marginBottom: 6 },
  subtitle: { color: '#94A3B8', marginBottom: 20 },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  navCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textColumn: { flex: 1, marginRight: 12 },
  cardTitle: { color: '#FFFFFF', fontWeight: '600', marginBottom: 4 },
  cardDesc: { color: '#94A3B8' },
  chevron: { color: '#64748B', fontSize: 24, fontWeight: 'bold' },
  actionButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtn: { backgroundColor: '#3B82F6' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '600' },
  secondaryBtn: { backgroundColor: '#334155' },
  secondaryBtnText: { color: '#E2E8F0', fontWeight: '600' },
});
