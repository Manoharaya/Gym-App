/**
 * FitCore — Day 51: Enterprise Administration Dashboard Screen
 *
 * Provides enterprise-grade oversight across multi-outlet networks, brands,
 * hierarchical policies, hard security ceilings, custom domains, and scoped roles.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Screen, Card, Badge, Divider, Button } from '../../../components/primitives';
import { spacing, radius } from '../../../theme';

type TabType = 'outlets' | 'policies' | 'simulator' | 'domains' | 'roles';

interface OutletItem {
  id: string;
  name: string;
  code: string;
  brandName: string;
  brandColor: string;
  region: string;
  city: string;
  manager: string;
  memberCount: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'COMING_SOON';
}

interface PolicyItem {
  id: string;
  code: string;
  name: string;
  category: string;
  scopeType: 'ORGANISATION' | 'BRAND' | 'REGION' | 'OUTLET';
  scopeName: string;
  isHardCeiling: boolean;
  version: number;
  enforcementMode: 'ENFORCED' | 'ADVISORY' | 'AUDIT_ONLY';
  configPreview: string;
}

interface CustomDomainItem {
  id: string;
  domain: string;
  scope: string;
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'FAILED';
  sslStatus: 'ISSUED' | 'PENDING' | 'EXPIRED';
  dnsTxtChallenge: string;
  cnameTarget: string;
}

interface ScopedRoleItem {
  id: string;
  userName: string;
  userEmail: string;
  role: string;
  scopeType: string;
  scopeName: string;
  status: 'ACTIVE' | 'SCHEDULED';
}

const INITIAL_OUTLETS: OutletItem[] = [
  {
    id: 'out-1',
    name: 'FitCore Perth CBD',
    code: 'FC-PERTH-01',
    brandName: 'FitCore Elite',
    brandColor: '#6366F1',
    region: 'WA',
    city: 'Perth',
    manager: 'Sarah Jenkins',
    memberCount: 1420,
    status: 'ACTIVE',
  },
  {
    id: 'out-2',
    name: 'FitCore Fremantle',
    code: 'FC-FREO-02',
    brandName: 'FitCore Elite',
    brandColor: '#6366F1',
    region: 'WA',
    city: 'Fremantle',
    manager: 'Markus Vance',
    memberCount: 890,
    status: 'ACTIVE',
  },
  {
    id: 'out-3',
    name: 'CorePulse Sydney Central',
    code: 'CP-SYD-01',
    brandName: 'CorePulse Studio',
    brandColor: '#EC4899',
    region: 'NSW',
    city: 'Sydney',
    manager: 'Chloe Nguyen',
    memberCount: 650,
    status: 'ACTIVE',
  },
  {
    id: 'out-4',
    name: 'CorePulse Melbourne South',
    code: 'CP-MEL-01',
    brandName: 'CorePulse Studio',
    brandColor: '#EC4899',
    region: 'VIC',
    city: 'Melbourne',
    manager: 'David Miller',
    memberCount: 520,
    status: 'ACTIVE',
  },
];

const INITIAL_POLICIES: PolicyItem[] = [
  {
    id: 'pol-1',
    code: 'SEC-MFA-FORCE',
    name: 'Enterprise MFA Mandatory Enforcement',
    category: 'SECURITY',
    scopeType: 'ORGANISATION',
    scopeName: 'Global Organisation',
    isHardCeiling: true,
    version: 3,
    enforcementMode: 'ENFORCED',
    configPreview: '{"mfaRequired": true, "sessionTimeoutMinutes": 60}',
  },
  {
    id: 'pol-2',
    code: 'AI-GOV-SAFETY',
    name: 'AI External LLM & Safety Ceiling',
    category: 'AI',
    scopeType: 'ORGANISATION',
    scopeName: 'Global Organisation',
    isHardCeiling: true,
    version: 2,
    enforcementMode: 'ENFORCED',
    configPreview: '{"allowExternalLlm": false, "piiMaskingRequired": true}',
  },
  {
    id: 'pol-3',
    code: 'BRAND-PERTH-OVERRIDE',
    name: 'FitCore Elite Brand Colors & Themes',
    category: 'BRANDING',
    scopeType: 'BRAND',
    scopeName: 'FitCore Elite',
    isHardCeiling: false,
    version: 1,
    enforcementMode: 'ENFORCED',
    configPreview: '{"primaryColor": "#6366F1", "fontFamily": "Inter"}',
  },
  {
    id: 'pol-4',
    code: 'DEV-API-LIMITS',
    name: 'Developer Webhooks & API Rate Ceiling',
    category: 'DEVELOPER_API',
    scopeType: 'ORGANISATION',
    scopeName: 'Global Organisation',
    isHardCeiling: true,
    version: 2,
    enforcementMode: 'ENFORCED',
    configPreview: '{"allowCustomWebhooks": true, "maxDeliveriesPerHour": 5000}',
  },
];

const INITIAL_DOMAINS: CustomDomainItem[] = [
  {
    id: 'dom-1',
    domain: 'portal.fitcoreelite.com.au',
    scope: 'FitCore Elite',
    status: 'ACTIVE',
    sslStatus: 'ISSUED',
    dnsTxtChallenge: '_fitcore-challenge.portal.fitcoreelite.com.au',
    cnameTarget: 'custom.domains.fitcore.io',
  },
  {
    id: 'dom-2',
    domain: 'app.corepulsestudios.com',
    scope: 'CorePulse Studio',
    status: 'PENDING_VERIFICATION',
    sslStatus: 'PENDING',
    dnsTxtChallenge: '_fitcore-challenge.app.corepulsestudios.com',
    cnameTarget: 'custom.domains.fitcore.io',
  },
];

const INITIAL_ROLES: ScopedRoleItem[] = [
  {
    id: 'role-1',
    userName: 'Elena Rostova',
    userEmail: 'elena@enterprisefit.com',
    role: 'ENTERPRISE_ADMIN',
    scopeType: 'ORGANISATION',
    scopeName: 'Global Organisation',
    status: 'ACTIVE',
  },
  {
    id: 'role-2',
    userName: 'Marcus Sterling',
    userEmail: 'marcus@enterprisefit.com',
    role: 'REGIONAL_MANAGER',
    scopeType: 'REGION',
    scopeName: 'Western Australia (WA)',
    status: 'ACTIVE',
  },
  {
    id: 'role-3',
    userName: 'Aria Chen',
    userEmail: 'aria@corepulse.com',
    role: 'BRAND_MANAGER',
    scopeType: 'BRAND',
    scopeName: 'CorePulse Studio',
    status: 'ACTIVE',
  },
];

export const EnterpriseDashboardScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('outlets');
  const [outlets, setOutlets] = useState<OutletItem[]>(INITIAL_OUTLETS);
  const [policies] = useState<PolicyItem[]>(INITIAL_POLICIES);
  const [domains, setDomains] = useState<CustomDomainItem[]>(INITIAL_DOMAINS);
  const [roles] = useState<ScopedRoleItem[]>(INITIAL_ROLES);

  // Filter states
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Simulator state
  const [simCategory, setSimCategory] = useState<string>('SECURITY');
  const [simProposedJson, setSimProposedJson] = useState<string>(
    '{\n  "mfaRequired": false,\n  "sessionTimeoutMinutes": 120\n}',
  );
  const [simResult, setSimResult] = useState<{
    ran: boolean;
    safe: boolean;
    diff: Array<{ field: string; base: any; sim: any; status: string; reason?: string }>;
  } | null>(null);

  // Transfer modal state
  const [transferOutlet, setTransferOutlet] = useState<OutletItem | null>(null);
  const [transferTargetBrand, setTransferTargetBrand] = useState<string>('CorePulse Studio');

  const handleVerifyDomain = (domainId: string) => {
    setDomains((prev) =>
      prev.map((d) =>
        d.id === domainId
          ? { ...d, status: 'ACTIVE', sslStatus: 'ISSUED' }
          : d,
      ),
    );
    Alert.alert('Domain Verified', 'DNS challenge resolved. SSL certificate issued and domain activated!');
  };

  const handleRunSimulation = () => {
    try {
      const parsed = JSON.parse(simProposedJson);
      const diff: Array<{ field: string; base: any; sim: any; status: string; reason?: string }> = [];
      let isSafe = true;

      if (parsed.mfaRequired === false) {
        isSafe = false;
        diff.push({
          field: 'mfaRequired',
          base: true,
          sim: false,
          status: 'CEILING_BLOCKED',
          reason: 'Hard ceiling at ORGANISATION level prohibits disabling MFA',
        });
      } else if (parsed.mfaRequired !== undefined) {
        diff.push({
          field: 'mfaRequired',
          base: true,
          sim: parsed.mfaRequired,
          status: 'UNCHANGED',
        });
      }

      if (parsed.sessionTimeoutMinutes !== undefined) {
        diff.push({
          field: 'sessionTimeoutMinutes',
          base: 60,
          sim: parsed.sessionTimeoutMinutes,
          status: 'MODIFIED',
        });
      }

      setSimResult({
        ran: true,
        safe: isSafe,
        diff,
      });
    } catch (e: any) {
      Alert.alert('JSON Error', 'Proposed configuration must be valid JSON: ' + e.message);
    }
  };

  const handleApplyTransfer = () => {
    if (!transferOutlet) return;
    setOutlets((prev) =>
      prev.map((o) =>
        o.id === transferOutlet.id
          ? {
              ...o,
              brandName: transferTargetBrand,
              brandColor: transferTargetBrand === 'CorePulse Studio' ? '#EC4899' : '#6366F1',
            }
          : o,
      ),
    );
    Alert.alert('Outlet Transferred', `${transferOutlet.name} transferred to ${transferTargetBrand}`);
    setTransferOutlet(null);
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header banner */}
        <View style={styles.header}>
          <View>
            <View style={styles.tagRow}>
              <Badge variant="primary" label="DAY 51 — ENTERPRISE ADMINISTRATION" />
              <Badge variant="success" label="96% GOVERNANCE HEALTH" />
            </View>
            <Text style={styles.title}>FitCore Enterprise Hub</Text>
            <Text style={styles.subtitle}>
              Multi-brand administration, deterministic policy inheritance & hard security ceilings
            </Text>
          </View>
        </View>

        {/* Executive KPI Grid */}
        <View style={styles.kpiGrid}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>ACTIVE OUTLETS</Text>
            <Text style={styles.kpiValue}>4</Text>
            <Text style={styles.kpiSub}>Across 3 States (WA, NSW, VIC)</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>BRANDS</Text>
            <Text style={styles.kpiValue}>2</Text>
            <Text style={styles.kpiSub}>FitCore Elite & CorePulse</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>HARD CEILINGS</Text>
            <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>3</Text>
            <Text style={styles.kpiSub}>MFA, AI Safety, API Limits</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>CUSTOM DOMAINS</Text>
            <Text style={[styles.kpiValue, { color: '#10B981' }]}>2</Text>
            <Text style={styles.kpiSub}>1 Verified SSL, 1 Pending DNS</Text>
          </Card>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'outlets' && styles.tabButtonActive]}
            onPress={() => setActiveTab('outlets')}
          >
            <Text style={[styles.tabText, activeTab === 'outlets' && styles.tabTextActive]}>
              Outlets (4)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'policies' && styles.tabButtonActive]}
            onPress={() => setActiveTab('policies')}
          >
            <Text style={[styles.tabText, activeTab === 'policies' && styles.tabTextActive]}>
              Policies (4)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'simulator' && styles.tabButtonActive]}
            onPress={() => setActiveTab('simulator')}
          >
            <Text style={[styles.tabText, activeTab === 'simulator' && styles.tabTextActive]}>
              Simulator
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'domains' && styles.tabButtonActive]}
            onPress={() => setActiveTab('domains')}
          >
            <Text style={[styles.tabText, activeTab === 'domains' && styles.tabTextActive]}>
              Domains (2)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'roles' && styles.tabButtonActive]}
            onPress={() => setActiveTab('roles')}
          >
            <Text style={[styles.tabText, activeTab === 'roles' && styles.tabTextActive]}>
              Roles & Scope (3)
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: Multi-Outlet Administration */}
        {activeTab === 'outlets' && (
          <View style={styles.sectionContainer}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Filter by Brand:</Text>
              <TouchableOpacity
                style={[styles.filterChip, brandFilter === 'ALL' && styles.filterChipActive]}
                onPress={() => setBrandFilter('ALL')}
              >
                <Text style={[styles.chipText, brandFilter === 'ALL' && styles.chipTextActive]}>
                  All Brands
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, brandFilter === 'FitCore Elite' && styles.filterChipActive]}
                onPress={() => setBrandFilter('FitCore Elite')}
              >
                <Text style={[styles.chipText, brandFilter === 'FitCore Elite' && styles.chipTextActive]}>
                  FitCore Elite
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, brandFilter === 'CorePulse Studio' && styles.filterChipActive]}
                onPress={() => setBrandFilter('CorePulse Studio')}
              >
                <Text style={[styles.chipText, brandFilter === 'CorePulse Studio' && styles.chipTextActive]}>
                  CorePulse
                </Text>
              </TouchableOpacity>
            </View>

            {outlets
              .filter((o) => brandFilter === 'ALL' || o.brandName === brandFilter)
              .map((outlet) => (
                <Card key={outlet.id} style={styles.itemCard}>
                  <View style={styles.cardHeader}>
                    <View>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle}>{outlet.name}</Text>
                        <Badge
                          variant="neutral"
                          label={outlet.brandName}
                          style={{ backgroundColor: `${outlet.brandColor}22` }}
                        />
                      </View>
                      <Text style={styles.cardCode}>
                        Code: {outlet.code} • Region: {outlet.region} ({outlet.city})
                      </Text>
                    </View>
                    <Badge
                      variant={outlet.status === 'ACTIVE' ? 'success' : 'warning'}
                      label={outlet.status}
                    />
                  </View>

                  <Divider style={styles.divider} />

                  <View style={styles.outletMetaRow}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>OUTLET MANAGER</Text>
                      <Text style={styles.metaVal}>{outlet.manager}</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>ACTIVE MEMBERS</Text>
                      <Text style={styles.metaVal}>{outlet.memberCount}</Text>
                    </View>
                    <View style={styles.actionCol}>
                      <Button
                        title="Transfer Brand"
                        variant="outline"
                        size="sm"
                        onPress={() => setTransferOutlet(outlet)}
                      />
                    </View>
                  </View>
                </Card>
              ))}
          </View>
        )}

        {/* TAB 2: Policies & Hard Ceilings */}
        {activeTab === 'policies' && (
          <View style={styles.sectionContainer}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Category:</Text>
              {['ALL', 'SECURITY', 'AI', 'BRANDING', 'DEVELOPER_API'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive]}
                  onPress={() => setCategoryFilter(cat)}
                >
                  <Text style={[styles.chipText, categoryFilter === cat && styles.chipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {policies
              .filter((p) => categoryFilter === 'ALL' || p.category === categoryFilter)
              .map((policy) => (
                <Card key={policy.id} style={styles.itemCard}>
                  <View style={styles.cardHeader}>
                    <View>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle}>{policy.name}</Text>
                        {policy.isHardCeiling && (
                          <Badge variant="danger" label="🔒 HARD CEILING" />
                        )}
                      </View>
                      <Text style={styles.cardCode}>
                        Code: {policy.code} • Scope: {policy.scopeType} ({policy.scopeName}) • v{policy.version}
                      </Text>
                    </View>
                    <Badge variant="primary" label={policy.enforcementMode} />
                  </View>

                  <View style={styles.configBox}>
                    <Text style={styles.configCode}>{policy.configPreview}</Text>
                  </View>
                </Card>
              ))}
          </View>
        )}

        {/* TAB 3: Interactive Policy Simulator */}
        {activeTab === 'simulator' && (
          <View style={styles.sectionContainer}>
            <Card style={styles.simCard}>
              <Text style={styles.simTitle}>⚡ Hierarchical Policy Dry-Run Simulator</Text>
              <Text style={styles.simSub}>
                Test proposed policy overrides before publishing. The simulation checks inheritance
                chains and detects any parent hard ceiling security violations.
              </Text>

              <Text style={styles.inputLabel}>Category to Simulate:</Text>
              <View style={styles.chipRow}>
                {['SECURITY', 'AI', 'BRANDING', 'DEVELOPER_API'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.filterChip, simCategory === c && styles.filterChipActive]}
                    onPress={() => setSimCategory(c)}
                  >
                    <Text style={[styles.chipText, simCategory === c && styles.chipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Proposed Scope: OUTLET (FitCore Perth CBD)</Text>
              <Text style={styles.inputLabel}>Proposed Config JSON:</Text>
              <TextInput
                style={styles.jsonInput}
                multiline
                numberOfLines={5}
                value={simProposedJson}
                onChangeText={setSimProposedJson}
              />

              <Button
                title="Run Inheritance Simulation"
                variant="primary"
                style={styles.simButton}
                onPress={handleRunSimulation}
              />

              {simResult && (
                <View style={styles.simResultBox}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultTitle}>Simulation Results:</Text>
                    <Badge
                      variant={simResult.safe ? 'success' : 'danger'}
                      label={simResult.safe ? 'SAFE TO APPLY' : 'HARD CEILING BREACH DETECTED'}
                    />
                  </View>

                  {simResult.diff.map((item, idx) => (
                    <View key={idx} style={styles.diffRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.diffField}>{item.field}</Text>
                        <Text style={styles.diffVal}>
                          Baseline: {JSON.stringify(item.base)} → Proposed: {JSON.stringify(item.sim)}
                        </Text>
                        {item.reason && <Text style={styles.diffReason}>{item.reason}</Text>}
                      </View>
                      <Badge
                        variant={item.status === 'CEILING_BLOCKED' ? 'danger' : 'success'}
                        label={item.status}
                      />
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </View>
        )}

        {/* TAB 4: Custom Domains & SSL */}
        {activeTab === 'domains' && (
          <View style={styles.sectionContainer}>
            {domains.map((dom) => (
              <Card key={dom.id} style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{dom.domain}</Text>
                    <Text style={styles.cardCode}>Tenant Scope: {dom.scope}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Badge
                      variant={dom.status === 'ACTIVE' ? 'success' : 'warning'}
                      label={dom.status}
                    />
                    <Badge
                      variant={dom.sslStatus === 'ISSUED' ? 'success' : 'neutral'}
                      label={`SSL: ${dom.sslStatus}`}
                    />
                  </View>
                </View>

                <View style={styles.dnsBox}>
                  <Text style={styles.dnsLabel}>DNS TXT Challenge:</Text>
                  <Text style={styles.dnsVal}>{dom.dnsTxtChallenge}</Text>
                  <Text style={styles.dnsLabel}>CNAME Target:</Text>
                  <Text style={styles.dnsVal}>{dom.cnameTarget}</Text>
                </View>

                {dom.status === 'PENDING_VERIFICATION' && (
                  <Button
                    title="Verify DNS Challenge & Issue SSL"
                    variant="primary"
                    size="sm"
                    style={{ marginTop: 12 }}
                    onPress={() => handleVerifyDomain(dom.id)}
                  />
                )}
              </Card>
            ))}
          </View>
        )}

        {/* TAB 5: Roles & Scoped Access */}
        {activeTab === 'roles' && (
          <View style={styles.sectionContainer}>
            <View style={styles.roleHierarchyNotice}>
              <Text style={styles.noticeTitle}>🛡️ Scoped Enterprise Hierarchy</Text>
              <Text style={styles.noticeText}>
                Enterprise Admin (Level 90) → Regional Manager (Level 75) → Brand Manager (Level 70) →
                Operations/Compliance/Analytics (Level 65) → Outlet Manager (Level 60).
                Privilege escalation is strictly prevented by boundary enforcement.
              </Text>
            </View>

            {roles.map((r) => (
              <Card key={r.id} style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{r.userName}</Text>
                    <Text style={styles.cardCode}>{r.userEmail}</Text>
                  </View>
                  <Badge variant="primary" label={r.role} />
                </View>

                <Divider style={styles.divider} />

                <View style={styles.outletMetaRow}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>SCOPE TYPE</Text>
                    <Text style={styles.metaVal}>{r.scopeType}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>ASSIGNED SCOPE BOUNDARY</Text>
                    <Text style={styles.metaVal}>{r.scopeName}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>STATUS</Text>
                    <Badge variant="success" label={r.status} />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Brand Transfer Modal */}
      {transferOutlet && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Transfer Outlet Brand</Text>
              <Text style={styles.modalSub}>
                Reassign <Text style={{ fontWeight: 'bold' }}>{transferOutlet.name}</Text> to a
                different brand. Effective branding and policies will automatically update.
              </Text>

              <Text style={styles.inputLabel}>Current Brand: {transferOutlet.brandName}</Text>
              <Text style={styles.inputLabel}>Select New Brand:</Text>

              <View style={{ gap: 8, marginVertical: 12 }}>
                {['FitCore Elite', 'CorePulse Studio'].map((brand) => (
                  <TouchableOpacity
                    key={brand}
                    style={[
                      styles.brandOption,
                      transferTargetBrand === brand && styles.brandOptionActive,
                    ]}
                    onPress={() => setTransferTargetBrand(brand)}
                  >
                    <Text
                      style={[
                        styles.brandOptionText,
                        transferTargetBrand === brand && styles.brandOptionTextActive,
                      ]}
                    >
                      {brand}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <Button title="Cancel" variant="outline" onPress={() => setTransferOutlet(null)} />
                <Button title="Confirm Transfer" variant="primary" onPress={handleApplyTransfer} />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    marginBottom: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    padding: spacing.md,
    backgroundColor: '#131B2E',
    borderColor: '#1E293B',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#131B2E',
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  sectionContainer: {
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1E293B',
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
  },
  chipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  itemCard: {
    padding: spacing.md,
    backgroundColor: '#131B2E',
    borderColor: '#1E293B',
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  cardCode: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  divider: {
    marginVertical: spacing.sm,
    backgroundColor: '#1E293B',
  },
  outletMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaCol: {
    flex: 1,
  },
  actionCol: {
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
    marginTop: 2,
  },
  configBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: '#0B0F19',
  },
  configCode: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#38BDF8',
  },
  simCard: {
    padding: spacing.md,
    backgroundColor: '#131B2E',
    borderColor: '#1E293B',
  },
  simTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  simSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 8,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  jsonInput: {
    backgroundColor: '#0B0F19',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 10,
    color: '#38BDF8',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  simButton: {
    marginTop: spacing.md,
  },
  simResultBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#0B0F19',
    borderColor: '#334155',
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  diffField: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  diffVal: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  diffReason: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 2,
  },
  dnsBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: '#0B0F19',
    gap: 4,
  },
  dnsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  dnsVal: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#38BDF8',
  },
  roleHierarchyNotice: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#1E1B4B',
    borderColor: '#4338CA',
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C7D2FE',
  },
  noticeText: {
    fontSize: 12,
    color: '#E0E7FF',
    marginTop: 4,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#131B2E',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderColor: '#334155',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  brandOption: {
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  brandOptionActive: {
    backgroundColor: '#6366F122',
    borderColor: '#6366F1',
  },
  brandOptionText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  brandOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: spacing.md,
  },
});
