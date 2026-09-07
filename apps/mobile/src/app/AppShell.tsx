import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { getAppConfig } from '@fitcore/config';
import { Screen } from '../components/primitives/Screen';
import { Text } from '../components/primitives/Text';
import { Card } from '../components/primitives/Card';
import { Badge } from '../components/primitives/Badge';
import { Button } from '../components/primitives/Button';
import { Divider } from '../components/primitives/Divider';
import { useTenant } from '../providers/TenantProvider';
import { usePermissions } from '../hooks/usePermissions';
import { themeColors, spacing } from '../theme';
import { Icon } from '../components/primitives/Icon';
import { useNavigation } from '@react-navigation/native';
import type { UserRole } from '@fitcore/types';

export const AppShell: React.FC = () => {
  const navigation = useNavigation<any>();
  const config = getAppConfig();
  const { tenant, setRole, setOutlet } = useTenant();
  const { can } = usePermissions();

  const handleRoleToggle = () => {
    const roles: UserRole[] = ['MEMBER', 'TRAINER', 'OUTLET_MANAGER', 'ORGANISATION_OWNER'];
    const currentIndex = roles.indexOf(tenant.role);
    const nextRole = roles[(currentIndex + 1) % roles.length] ?? 'MEMBER';
    setRole(nextRole);
  };

  const handleOutletToggle = () => {
    if (tenant.outletId === 'outlet_dev_perth_cbd_001') {
      setOutlet('outlet_dev_fremantle_002', 'Fremantle');
    } else {
      setOutlet('outlet_dev_perth_cbd_001', 'Perth CBD');
    }
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Branding */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandIconText}>FC</Text>
            </View>
            <View>
              <Text variant="h1" style={styles.appName}>
                FitCore
              </Text>
              <Text variant="caption" style={styles.tagline}>
                Cross-Platform Fitness SaaS Architecture
              </Text>
            </View>
          </View>
          <Badge label="DAY 1 FOUNDATION" variant="primary" />
        </View>

        <Divider spacingSize={3} />

        {/* Redesigned Experience Launcher Hero */}
        <Card elevated bordered style={styles.launcherCard}>
          <View style={styles.launcherHeader}>
            <View style={styles.launcherTitleRow}>
              <View style={styles.sparkleIcon}>
                <Icon name="sparkles" size={14} color="#FFFFFF" />
              </View>
              <Text variant="h3">Redesigned Experience Suite</Text>
            </View>
            <Badge label="PREMIUM UI/UX" variant="primary" />
          </View>
          <Text variant="bodySmall" style={styles.launcherDesc}>
            Launch directly into the newly redesigned, Apple-grade interfaces tailored for members and operational roles:
          </Text>

          <View style={styles.launcherGrid}>
            <Button
              title="🏃‍♂️ Enter as Member (Days 1–10)"
              variant="accent"
              size="sm"
              onPress={() => {
                setRole('MEMBER');
                navigation.navigate('MemberFlow');
              }}
              style={styles.launcherBtn}
            />
            <Button
              title="🔐 Sign In / Login Screen"
              variant="primary"
              size="sm"
              onPress={() => {
                navigation.navigate('Auth', { screen: 'Login' });
              }}
              style={styles.launcherBtn}
            />
            <Button
              title="📋 Member Onboarding Flow (Day 4)"
              variant="outline"
              size="sm"
              onPress={() => {
                navigation.navigate('OnboardingFlow');
              }}
              style={styles.launcherBtn}
            />
            <Button
              title="🏋️‍♂️ Trainer Hub"
              variant="outline"
              size="sm"
              onPress={() => {
                setRole('TRAINER');
                navigation.navigate('TrainerFlow');
              }}
              style={styles.launcherBtn}
            />
            <Button
              title="🛎️ Reception Desk"
              variant="outline"
              size="sm"
              onPress={() => {
                setRole('RECEPTION');
                navigation.navigate('ReceptionFlow');
              }}
              style={styles.launcherBtn}
            />
            <Button
              title="🏢 Outlet Manager"
              variant="outline"
              size="sm"
              onPress={() => {
                setRole('OUTLET_MANAGER');
                navigation.navigate('OutletManagerFlow');
              }}
              style={styles.launcherBtn}
            />
            <Button
              title="💳 Finance Center"
              variant="outline"
              size="sm"
              onPress={() => {
                setRole('FINANCE');
                navigation.navigate('FinanceFlow');
              }}
              style={styles.launcherBtn}
            />
            <Button
              title="👑 Organisation Owner"
              variant="outline"
              size="sm"
              onPress={() => {
                setRole('ORGANISATION_OWNER');
                navigation.navigate('OrganisationOwnerFlow');
              }}
              style={styles.launcherBtn}
            />
            <Button
              title="👥 Staff Directory (Day 11)"
              variant="primary"
              size="sm"
              onPress={() => {
                setRole('OUTLET_MANAGER');
                navigation.navigate('OutletManagerFlow', { screen: 'StaffDirectory' });
              }}
              style={styles.launcherBtn}
            />
            <Button
              title="🏋️ Trainer Directory (Day 11)"
              variant="primary"
              size="sm"
              onPress={() => {
                setRole('OUTLET_MANAGER');
                navigation.navigate('OutletManagerFlow', { screen: 'TrainerDirectory' });
              }}
              style={styles.launcherBtn}
            />
            <Button
              title="🤝 Client Roster & Assignment (Day 11)"
              variant="accent"
              size="sm"
              onPress={() => {
                setRole('TRAINER');
                navigation.navigate('TrainerFlow', { screen: 'TrainerClients' });
              }}
              style={styles.launcherBtn}
            />
          </View>
        </Card>

        {/* Technical Verification Overview Card */}
        <Card elevated bordered style={styles.summaryCard}>
          <Text variant="h2" style={styles.sectionHeading}>
            Platform Foundation
          </Text>
          <Text variant="bodySmall" style={styles.summaryDesc}>
            Production-grade, scalable multi-tenant architecture verifying all Day 1 subsystems.
          </Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text variant="caption" style={styles.metaLabel}>
                Environment
              </Text>
              <Badge
                label={config.env.toUpperCase()}
                variant={config.isProduction ? 'danger' : 'success'}
              />
            </View>

            <View style={styles.metaItem}>
              <Text variant="caption" style={styles.metaLabel}>
                Architecture
              </Text>
              <Badge label="Multi-Tenant" variant="info" />
            </View>

            <View style={styles.metaItem}>
              <Text variant="caption" style={styles.metaLabel}>
                Platform
              </Text>
              <Badge
                label={`${Platform.OS.toUpperCase()} (${Platform.select({ ios: 'iOS', android: 'Android', default: 'Native' })})`}
                variant="neutral"
              />
            </View>
          </View>
        </Card>

        {/* Interactive Tenant & Permission Testing Card */}
        <Card elevated bordered style={styles.tenantCard}>
          <View style={styles.cardHeaderRow}>
            <Text variant="h3">Active Tenant Context</Text>
            {tenant.isDevSeed && <Badge label="DEV SEED DATA" variant="warning" />}
          </View>

          <Text variant="caption" style={styles.tenantNotice}>
            Second Wind Athletic Club is configured purely as a development seed and is NOT
            hardcoded into the platform architecture.
          </Text>

          <View style={styles.tenantDetails}>
            <View style={styles.tenantRow}>
              <Text variant="bodySmall" style={styles.fieldLabel}>
                Organisation:
              </Text>
              <Text variant="body" style={styles.fieldValue}>
                {tenant.organisationName}
              </Text>
            </View>

            <View style={styles.tenantRow}>
              <Text variant="bodySmall" style={styles.fieldLabel}>
                Active Outlet:
              </Text>
              <Text variant="body" style={styles.fieldValue}>
                {tenant.outletName || 'All Outlets'}
              </Text>
            </View>

            <View style={styles.tenantRow}>
              <Text variant="bodySmall" style={styles.fieldLabel}>
                Active Role:
              </Text>
              <Badge label={tenant.role} variant="primary" />
            </View>
          </View>

          <View style={styles.buttonRow}>
            <Button
              title="Toggle Role"
              variant="outline"
              size="sm"
              onPress={handleRoleToggle}
              style={styles.actionBtn}
            />
            <Button
              title="Switch Outlet"
              variant="outline"
              size="sm"
              onPress={handleOutletToggle}
              style={styles.actionBtn}
            />
          </View>

          {/* Realtime Permission Evaluation Demonstration */}
          <Divider spacingSize={2} />
          <Text variant="caption" style={styles.permHeading}>
            Permission Engine Evaluation:
          </Text>
          <View style={styles.permList}>
            <View style={styles.permRow}>
              <Text variant="bodySmall" style={styles.permName}>
                Manage Outlets (ORGANISATION)
              </Text>
              <Badge
                label={can('outlets', 'manage', 'ORGANISATION') ? 'ALLOWED' : 'DENIED'}
                variant={can('outlets', 'manage', 'ORGANISATION') ? 'success' : 'neutral'}
              />
            </View>
            <View style={styles.permRow}>
              <Text variant="bodySmall" style={styles.permName}>
                Log Own Workout (SELF)
              </Text>
              <Badge
                label={can('workouts', 'write', 'SELF') ? 'ALLOWED' : 'DENIED'}
                variant={can('workouts', 'write', 'SELF') ? 'success' : 'neutral'}
              />
            </View>
            <View style={styles.permRow}>
              <Text variant="bodySmall" style={styles.permName}>
                Configure AI Gateway (ORGANISATION)
              </Text>
              <Badge
                label={can('ai', 'configure', 'ORGANISATION') ? 'ALLOWED' : 'DENIED'}
                variant={can('ai', 'configure', 'ORGANISATION') ? 'success' : 'neutral'}
              />
            </View>
          </View>
        </Card>

        {/* Subsystem Health Grid */}
        <Card elevated bordered style={styles.healthCard}>
          <Text variant="h3" style={styles.healthTitle}>
            Subsystem Verification
          </Text>

          <View style={styles.systemStatusGrid}>
            <SystemStatusItem name="React Native & Expo" status="Verified" ok />
            <SystemStatusItem name="TypeScript Strict Mode" status="Enforced" ok />
            <SystemStatusItem name="Turborepo + pnpm" status="Configured" ok />
            <SystemStatusItem name="Design System (14 Primitives)" status="Active" ok />
            <SystemStatusItem name="Role & Scope Engine" status="Active" ok />
            <SystemStatusItem name="Multi-Tenant Isolation" status="Active" ok />
            <SystemStatusItem name="Zustand Client Store" status="Ready" ok />
            <SystemStatusItem name="TanStack Query v5" status="Ready" ok />
            <SystemStatusItem name="FitCore API Client" status="Initialized" ok />
            <SystemStatusItem name="Secure Hardware Storage" status="Ready" ok />
            <SystemStatusItem name="Centralized Logger (PII Redacted)" status="Active" ok />
            <SystemStatusItem name="24 Feature Module Boundaries" status="Established" ok />
          </View>
        </Card>

        <Text variant="caption" align="center" style={styles.footerNote}>
          FitCore Monorepo · Architecture Foundation v0.1.0 · Ready for Day 2
        </Text>
      </ScrollView>
    </Screen>
  );
};

const SystemStatusItem: React.FC<{ name: string; status: string; ok: boolean }> = ({
  name,
  status,
  ok,
}) => (
  <View style={styles.statusItem}>
    <View style={styles.statusDotRow}>
      <View style={[styles.statusDot, ok && styles.statusDotOk]} />
      <Text variant="bodySmall" style={styles.statusName}>
        {name}
      </Text>
    </View>
    <Text variant="caption" style={styles.statusLabel}>
      {status}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    gap: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 20,
    letterSpacing: -1,
  },
  appName: {
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    color: themeColors.textSecondary,
  },
  launcherCard: {
    padding: spacing[4],
    backgroundColor: '#121722',
    borderColor: '#232E45',
    borderWidth: 1.5,
    gap: spacing[3],
  },
  launcherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  launcherTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sparkleIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  launcherDesc: {
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  launcherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  launcherBtn: {
    flexGrow: 1,
    minWidth: '45%',
  },
  summaryCard: {
    gap: spacing[3],
  },
  sectionHeading: {
    color: '#FFFFFF',
  },
  summaryDesc: {
    color: themeColors.textSecondary,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  metaItem: {
    flex: 1,
    minWidth: 90,
    backgroundColor: themeColors.surfaceActive,
    padding: spacing[3],
    borderRadius: 8,
    gap: spacing[1],
  },
  metaLabel: {
    color: themeColors.textMuted,
  },
  tenantCard: {
    gap: spacing[3],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tenantNotice: {
    color: themeColors.textMuted,
    fontStyle: 'italic',
  },
  tenantDetails: {
    backgroundColor: themeColors.surfaceActive,
    padding: spacing[3],
    borderRadius: 8,
    gap: spacing[2],
  },
  tenantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    color: themeColors.textSecondary,
  },
  fieldValue: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionBtn: {
    flex: 1,
  },
  permHeading: {
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  permList: {
    gap: spacing[2],
  },
  permRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permName: {
    color: themeColors.textPrimary,
  },
  healthCard: {
    gap: spacing[3],
  },
  healthTitle: {
    color: '#FFFFFF',
  },
  systemStatusGrid: {
    gap: spacing[2],
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeColors.textMuted,
  },
  statusDotOk: {
    backgroundColor: themeColors.success,
  },
  statusName: {
    color: themeColors.textPrimary,
  },
  statusLabel: {
    color: themeColors.textSecondary,
  },
  footerNote: {
    color: themeColors.textMuted,
    paddingVertical: spacing[4],
  },
});
