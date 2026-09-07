import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Screen,
  Card,
  Input,
  Button,
  Badge,
  Icon,
} from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { useAuthStore } from '../../../store/authStore';
import { useTenantStore } from '../../../store/tenantStore';
import type { UserRole } from '@fitcore/types';

import { getAppConfig } from '@fitcore/config';
import { SECURE_STORAGE_KEYS } from '@fitcore/constants';
import { secureStorage } from '../../../services/storage/secureStorage';


interface DemoProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  badgeVariant: 'primary' | 'accent' | 'ai' | 'warning' | 'info' | 'success';
}

const DEMO_PROFILES: DemoProfile[] = [
  {
    id: 'user_active_member',
    name: 'Active Member (Alex)',
    email: 'active.member@secondwind.com.au',
    role: 'MEMBER',
    roleLabel: 'Member',
    badgeVariant: 'accent',
  },
  {
    id: 'user_trainer_marcus',
    name: 'Marcus Brody',
    email: 'trainer@secondwind.com.au',
    role: 'TRAINER',
    roleLabel: 'Trainer',
    badgeVariant: 'ai',
  },
  {
    id: 'user_reception_emma',
    name: 'Emma Watson',
    email: 'reception@secondwind.com.au',
    role: 'RECEPTION',
    roleLabel: 'Reception',
    badgeVariant: 'info',
  },
  {
    id: 'user_manager_sarah',
    name: 'Sarah Miller',
    email: 'manager@secondwind.com.au',
    role: 'OUTLET_MANAGER',
    roleLabel: 'Manager',
    badgeVariant: 'warning',
  },
  {
    id: 'user_owner_jack',
    name: 'Jack Darling',
    email: 'owner@secondwind.com.au',
    role: 'ORGANISATION_OWNER',
    roleLabel: 'Owner',
    badgeVariant: 'primary',
  },
];

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { setSession, setLoading } = useAuthStore();
  const { setRole } = useTenantStore();

  const [email, setEmail] = useState('active.member@secondwind.com.au');
  const [password, setPassword] = useState('FitCoreDev2026!');
  const [selectedProfile, setSelectedProfile] = useState<DemoProfile>(DEMO_PROFILES[0]!);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectProfile = (profile: DemoProfile) => {
    setSelectedProfile(profile);
    setEmail(profile.email);
    setPassword('FitCoreDev2026!');
    setError(null);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    setError(null);

    try {
      const config = getAppConfig();
      // Try authenticating with backend API to obtain real JWT access and refresh tokens
      try {
        const response = await fetch(`${config.apiBaseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (response.ok) {
          const resData = await response.json();
          const tokens = resData?.data;
          if (tokens?.accessToken) {
            await secureStorage.setItem(SECURE_STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
          }
          if (tokens?.refreshToken) {
            await secureStorage.setItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
          }
        }
      } catch (err) {
        console.warn('API login skipped or failed, using local session:', err);
      }

      setRole(selectedProfile.role);
      setSession(selectedProfile.id, selectedProfile.role);

      // Route directly to the corresponding experience
      switch (selectedProfile.role) {
        case 'MEMBER':
          navigation.navigate('MemberFlow');
          break;
        case 'TRAINER':
          navigation.navigate('TrainerFlow');
          break;
        case 'RECEPTION':
          navigation.navigate('ReceptionFlow');
          break;
        case 'OUTLET_MANAGER':
          navigation.navigate('OutletManagerFlow');
          break;
        case 'ORGANISATION_OWNER':
          navigation.navigate('OrganisationOwnerFlow');
          break;
        default:
          navigation.navigate('MemberFlow');
          break;
      }
    } catch {
      setError('Invalid credentials. Please verify your email and password.');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Monogram & Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>FC</Text>
            </View>
            <Text style={styles.brandTitle}>FitCore</Text>
            <Text style={styles.brandSubtitle}>Intelligent Athletic Performance Platform</Text>
          </View>

          {/* Role / Demo Profile Quick Picker */}
          <Card style={styles.profileCard}>
            <View style={styles.profileHeaderRow}>
              <Text style={styles.sectionHeading}>SELECT USER ROLE</Text>
              <Badge label="DEVELOPMENT SEED" variant="neutral" />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.profileScroll}
            >
              {DEMO_PROFILES.map((profile) => {
                const isSelected = selectedProfile.id === profile.id;
                return (
                  <TouchableOpacity
                    key={profile.id}
                    onPress={() => handleSelectProfile(profile)}
                    style={[styles.profilePill, isSelected && styles.profilePillSelected]}
                  >
                    <View style={styles.profilePillHeader}>
                      <Badge label={profile.roleLabel} variant={profile.badgeVariant} />
                    </View>
                    <Text
                      style={[
                        styles.profileName,
                        isSelected && { color: themeColors.textPrimary },
                      ]}
                    >
                      {profile.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Card>

          {/* Login Form */}
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>Sign In</Text>
            <Text style={styles.formSubtitle}>
              Active profile: {selectedProfile.name} ({selectedProfile.roleLabel})
            </Text>

            {error && (
              <View style={styles.errorBanner}>
                <Icon name="alert-circle" size={16} color={themeColors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@domain.com"
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
              />
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot credentials?</Text>
            </TouchableOpacity>

            <Button
              title={isSubmitting ? 'Authenticating...' : `Enter as ${selectedProfile.roleLabel}`}
              onPress={handleLogin}
              variant="accent"
              loading={isSubmitting}
              style={styles.signInButton}
            />

            {/* Quick Face ID / Biometrics hint button */}
            <Button
              title="Sign in with Biometrics"
              onPress={handleLogin}
              variant="outline"
              leftIcon={<Icon name="shield" size={18} color={themeColors.textPrimary} />}
              style={styles.biometricButton}
            />
          </Card>

          {/* Footer Join Option */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have a membership yet?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Join Club</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    padding: spacing[4],
    gap: spacing[4],
  },
  brandHeader: {
    alignItems: 'center',
    marginVertical: spacing[3],
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  logoText: {
    ...typography.h1,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: -1,
  },
  brandTitle: {
    ...typography.h1,
    color: themeColors.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginTop: spacing[0.5],
  },
  profileCard: {
    padding: spacing[3],
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  profileScroll: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  profilePill: {
    backgroundColor: themeColors.surface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    minWidth: 120,
  },
  profilePillSelected: {
    borderColor: themeColors.accent,
    backgroundColor: themeColors.surfaceActive,
  },
  profilePillHeader: {
    marginBottom: spacing[1],
  },
  profileName: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  formCard: {
    padding: spacing[5],
    gap: spacing[3],
  },
  formTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  formSubtitle: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginTop: -spacing[1],
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.dangerBackground,
    padding: spacing[3],
    borderRadius: radius.md,
    gap: spacing[2],
  },
  errorText: {
    ...typography.bodySmall,
    color: themeColors.danger,
    flex: 1,
  },
  inputGroup: {
    gap: spacing[3],
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -spacing[1],
  },
  forgotPasswordText: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '600',
  },
  signInButton: {
    marginTop: spacing[1],
  },
  biometricButton: {
    marginTop: spacing[1],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[3],
  },
  footerText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
  },
  registerLink: {
    ...typography.bodySmall,
    color: themeColors.accent,
    fontWeight: '700',
  },
});
