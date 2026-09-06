import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Card, Badge, Icon, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { useAuthStore } from '../../../store/authStore';

type NavigationProp = NativeStackNavigationProp<MemberStackParamList, 'MemberProfile'>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { clearSession } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          clearSession();
          // Navigation returns to auth or shell
        },
      },
    ]);
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Icon name="settings" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AC</Text>
          </View>
          <Text style={styles.userName}>Alex Chen</Text>
          <Text style={styles.userEmail}>alex.chen@secondwind.example.com</Text>
          <View style={styles.memberIdBadge}>
            <Text style={styles.memberIdText}>MEMBER # FC-2026-0042</Text>
          </View>

          <View style={styles.membershipRow}>
            <View style={styles.membershipInfo}>
              <Text style={styles.membershipLabel}>CURRENT PLAN</Text>
              <Text style={styles.membershipPlan}>All-Access Premium</Text>
            </View>
            <Badge label="ACTIVE" variant="success" />
          </View>
        </Card>

        {/* Quick Hub Navigation Links */}
        <Card style={styles.linksCard}>
          <Text style={styles.sectionHeading}>ACCOUNT & GYM SERVICES</Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('MembershipHome')}
            style={styles.linkItem}
          >
            <View style={[styles.linkIconBox, { backgroundColor: `${themeColors.accent}1A` }]}>
              <Icon name="card" size={18} color={themeColors.accent} />
            </View>
            <View style={styles.linkTextBox}>
              <Text style={styles.linkTitle}>Membership & Entitlements</Text>
              <Text style={styles.linkSubtitle}>View contract, scope, and plan terms</Text>
            </View>
            <Icon name="chevron-right" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Billing')}
            style={styles.linkItem}
          >
            <View style={[styles.linkIconBox, { backgroundColor: `${themeColors.success}1A` }]}>
              <Icon name="card" size={18} color={themeColors.success} />
            </View>
            <View style={styles.linkTextBox}>
              <Text style={styles.linkTitle}>Billing & Invoices</Text>
              <Text style={styles.linkSubtitle}>Payment methods, receipts, and invoices</Text>
            </View>
            <Icon name="chevron-right" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('QRCode')}
            style={styles.linkItem}
          >
            <View style={[styles.linkIconBox, { backgroundColor: `${themeColors.primary}1A` }]}>
              <Icon name="qr" size={18} color={themeColors.primary} />
            </View>
            <View style={styles.linkTextBox}>
              <Text style={styles.linkTitle}>Digital Turnstile Pass</Text>
              <Text style={styles.linkSubtitle}>60-second rotating HMAC QR code</Text>
            </View>
            <Icon name="chevron-right" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('MyBookings')}
            style={styles.linkItem}
          >
            <View style={[styles.linkIconBox, { backgroundColor: `${themeColors.warning}1A` }]}>
              <Icon name="calendar" size={18} color={themeColors.warning} />
            </View>
            <View style={styles.linkTextBox}>
              <Text style={styles.linkTitle}>Class Roster & Waitlist</Text>
              <Text style={styles.linkSubtitle}>Manage your upcoming reservations</Text>
            </View>
            <Icon name="chevron-right" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Wearables')}
            style={styles.linkItem}
          >
            <View style={[styles.linkIconBox, { backgroundColor: `${themeColors.aiPrimary}1A` }]}>
              <Icon name="activity" size={18} color={themeColors.aiPrimary} />
            </View>
            <View style={styles.linkTextBox}>
              <Text style={styles.linkTitle}>Wearables & Sensors</Text>
              <Text style={styles.linkSubtitle}>Apple Watch, Whoop, Garmin sync</Text>
            </View>
            <Icon name="chevron-right" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Sign Out Action */}
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          style={styles.signOutButton}
        />
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
  profileCard: {
    alignItems: 'center',
    padding: spacing[5],
    gap: spacing[2],
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: themeColors.surfaceActive,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: themeColors.accent,
    marginBottom: spacing[1],
  },
  avatarText: {
    ...typography.h2,
    color: themeColors.textPrimary,
    fontWeight: '800',
  },
  userName: {
    ...typography.h2,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  userEmail: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
  },
  memberIdBadge: {
    backgroundColor: themeColors.surface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    marginTop: spacing[1],
  },
  memberIdText: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.accent,
    letterSpacing: 0.5,
  },
  membershipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: themeColors.surface,
    padding: spacing[3],
    borderRadius: radius.md,
    marginTop: spacing[2],
  },
  membershipInfo: {
    gap: 2,
  },
  membershipLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: themeColors.textMuted,
    textTransform: 'uppercase',
  },
  membershipPlan: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  linksCard: {
    padding: spacing[4],
    gap: spacing[2],
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2.5],
    gap: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.surface,
  },
  linkIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTextBox: {
    flex: 1,
    gap: 2,
  },
  linkTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  linkSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  signOutButton: {
    borderColor: themeColors.danger,
    marginTop: spacing[2],
  },
});
