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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/types';
import { Screen, Card, Input, Button, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const PLANS = [
  {
    id: 'plan_prem',
    name: 'All-Access Premium',
    price: '$120 / month',
    tag: 'MOST POPULAR',
    features: ['All Club Outlets', 'Group Classes Included', '24/7 Turnstile Access', 'AI Coach'],
  },
  {
    id: 'plan_single',
    name: 'Single Club Pass',
    price: '$80 / month',
    tag: 'STANDARD',
    features: ['Perth CBD Home Gym', 'Fitness Floor Access', 'Locker Room & Sauna'],
  },
];

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('plan_prem');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      navigation.navigate('Login');
    }, 800);
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Join FitCore</Text>
            <Text style={styles.subtitle}>Second Wind Athletic Club Network</Text>
          </View>

          {/* Membership Tier Cards */}
          <View style={styles.plansSection}>
            <Text style={styles.sectionLabel}>CHOOSE MEMBERSHIP PLAN</Text>
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  onPress={() => setSelectedPlan(plan.id)}
                  style={[styles.planCard, isSelected && styles.planCardSelected]}
                >
                  <View style={styles.planHeader}>
                    <View>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planPrice}>{plan.price}</Text>
                    </View>
                    <Badge label={plan.tag} variant={isSelected ? 'accent' : 'neutral'} />
                  </View>
                  <View style={styles.featureList}>
                    {plan.features.map((f, i) => (
                      <View key={i} style={styles.featureItem}>
                        <Icon name="check" size={14} color={themeColors.accent} />
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Personal Information */}
          <Card style={styles.formCard}>
            <Text style={styles.formHeading}>Member Details</Text>
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Alex Chen"
            />
            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="you@domain.com"
            />
            <Input
              label="Create Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Minimum 8 characters"
            />

            <View style={styles.complianceNotice}>
              <Icon name="shield" size={16} color={themeColors.accent} />
              <Text style={styles.complianceText}>
                FitCore requires digital PAR-Q and health clearance upon first login.
              </Text>
            </View>

            <Button
              title={isSubmitting ? 'Creating Membership...' : 'Complete Registration'}
              onPress={handleRegister}
              variant="accent"
              loading={isSubmitting}
            />
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
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
  header: {
    gap: spacing[1],
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing[2],
    marginLeft: -spacing[2],
  },
  title: {
    ...typography.h1,
    color: themeColors.textPrimary,
    fontWeight: '800',
  },
  subtitle: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
  },
  plansSection: {
    gap: spacing[2.5],
  },
  sectionLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing[3],
  },
  planCardSelected: {
    borderColor: themeColors.accent,
    backgroundColor: themeColors.surfaceActive,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  planPrice: {
    ...typography.bodySmall,
    color: themeColors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  featureList: {
    gap: spacing[1.5],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  featureText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
  },
  formCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  formHeading: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  complianceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.accentLight,
    padding: spacing[3],
    borderRadius: radius.md,
    gap: spacing[2],
  },
  complianceText: {
    ...typography.caption,
    color: themeColors.accent,
    flex: 1,
    fontWeight: '500',
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
  loginLink: {
    ...typography.bodySmall,
    color: themeColors.accent,
    fontWeight: '700',
  },
});
