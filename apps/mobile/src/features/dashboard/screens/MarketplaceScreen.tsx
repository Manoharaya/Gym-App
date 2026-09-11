/**
 * FitCore — Day 50: Mobile Marketplace Discovery & App Management Screen
 *
 * Enables gym owners and managers to discover, evaluate, install, configure,
 * and manage apps, hardware integrations, AI agents, training programs,
 * and certified coaches across organisations and specific outlets.
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
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  MarketplaceListingType,
  MarketplaceInstallationScope,
  MarketplacePricingType,
  MarketplaceHealthStatus,
} from '@fitcore/types';

interface MarketplaceItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  listingType: MarketplaceListingType;
  category: string;
  categorySlug: string;
  publisherName: string;
  verified: boolean;
  featured: boolean;
  version: string;
  pricingType: MarketplacePricingType;
  priceLabel: string;
  ratingAverage: number;
  reviewCount: number;
  installCount: number;
  requiredPermissions: string[];
  healthPiiRequested: boolean;
  supportedScopes: MarketplaceInstallationScope[];
  capabilities: string[];
  dependencies?: string[];
  conflicts?: string[];
}

interface InstalledApp {
  id: string;
  listingId: string;
  title: string;
  listingType: MarketplaceListingType;
  publisherName: string;
  version: string;
  latestVersion: string;
  status: 'ACTIVE' | 'PAUSED' | 'UPGRADING' | 'UNINSTALLED';
  installationScope: MarketplaceInstallationScope;
  targetOutletName?: string;
  healthStatus: MarketplaceHealthStatus;
  installedAt: string;
  permissionsGranted: string[];
}

export const MarketplaceScreen: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<'discover' | 'installed' | 'categories'>('discover');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedListing, setSelectedListing] = useState<MarketplaceItem | null>(null);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [selectedScope, setSelectedScope] = useState<MarketplaceInstallationScope>('ORGANISATION');
  const [consentHealthPii, setConsentHealthPii] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  // Mock catalog of marketplace listings
  const [catalogListings] = useState<MarketplaceItem[]>([
    {
      id: 'mkt-1',
      slug: 'turnstile-cloud-gate',
      title: 'CloudGate Turnstile Pro',
      tagline: 'Automated QR and RFID turnstile hardware controller with tailgating detection',
      description:
        'Connects directly to Day 48 hardware platform and high-speed optical turnstiles. Enforces sub-50ms barcode, NFC, and QR check-in validations.',
      listingType: 'INTEGRATION',
      category: 'Hardware & Integrations',
      categorySlug: 'integrations',
      publisherName: 'GateLock IoT Systems',
      verified: true,
      featured: true,
      version: '2.4.0',
      pricingType: 'SUBSCRIPTION',
      priceLabel: '$49/mo per gate',
      ratingAverage: 4.9,
      reviewCount: 38,
      installCount: 142,
      requiredPermissions: ['checkins:read', 'checkins:write', 'devices:access'],
      healthPiiRequested: false,
      supportedScopes: ['ORGANISATION', 'OUTLET'],
      capabilities: ['Sub-50ms offline checkins', 'Anti-passback enforcement', 'NFC & QR reader sync'],
      dependencies: [],
      conflicts: [],
    },
    {
      id: 'mkt-2',
      slug: 'ai-receptionist-ultra',
      title: 'Aura AI Voice Receptionist',
      tagline: 'Autonomous 24/7 inbound phone receptionist powered by Day 19 AI Orchestrator',
      description:
        'Answers gym calls instantly, provides class schedules, books trial passes, answers pricing inquiries, and escalates emergencies directly to front-desk staff.',
      listingType: 'AI_AGENT',
      category: 'AI Agents & Assistants',
      categorySlug: 'ai-agents',
      publisherName: 'FitCore Labs (First-Party)',
      verified: true,
      featured: true,
      version: '3.1.2',
      pricingType: 'USAGE_BASED',
      priceLabel: '$0.08 / min call time',
      ratingAverage: 4.95,
      reviewCount: 64,
      installCount: 280,
      requiredPermissions: ['bookings:read', 'bookings:write', 'classes:read', 'communications:send'],
      healthPiiRequested: false,
      supportedScopes: ['ORGANISATION', 'OUTLET'],
      capabilities: ['Bilingual phone conversation', 'Live trial booking', 'Zero front-desk hold times'],
    },
    {
      id: 'mkt-3',
      slug: 'wearable-biometrics-coach',
      title: 'Biometric Recovery Co-Pilot',
      tagline: 'Deep HRV, sleep, and strain analysis for personalized workout intensity modulation',
      description:
        'Syncs with Apple Watch, Whoop, and Garmin to advise personal trainers on optimal recovery days and detect overtraining indicators.',
      listingType: 'AI_AGENT',
      category: 'AI Agents & Assistants',
      categorySlug: 'ai-agents',
      publisherName: 'BioFit AI',
      verified: true,
      featured: false,
      version: '1.2.0',
      pricingType: 'FREE',
      priceLabel: 'Free with Core',
      ratingAverage: 4.75,
      reviewCount: 19,
      installCount: 95,
      requiredPermissions: ['health:wearables:read', 'health:biometrics:read'],
      healthPiiRequested: true,
      supportedScopes: ['ORGANISATION'],
      capabilities: ['Automated strain warnings', 'Readiness index scoring', 'Personalized recovery advice'],
    },
    {
      id: 'mkt-4',
      slug: 'xero-accounting-bridge',
      title: 'Xero Real-Time Sync Bridge',
      tagline: 'Instant ledger synchronization, chart-of-accounts mapping, and invoice settlement',
      description:
        'Builds upon Day 43 Accounting Integration to deliver automated end-of-day bank reconciliations, GST classification, and journal entry exports.',
      listingType: 'INTEGRATION',
      category: 'Hardware & Integrations',
      categorySlug: 'integrations',
      publisherName: 'FinCloud Ledger',
      verified: true,
      featured: true,
      version: '2.0.1',
      pricingType: 'SUBSCRIPTION',
      priceLabel: '$29/mo flat',
      ratingAverage: 4.88,
      reviewCount: 52,
      installCount: 310,
      requiredPermissions: ['payments:read'],
      healthPiiRequested: false,
      supportedScopes: ['ORGANISATION'],
      capabilities: ['Automated journal entries', 'Multi-outlet revenue splits', 'GST/Tax code alignment'],
    },
    {
      id: 'mkt-5',
      slug: 'hypertrophy-12-week-blueprint',
      title: 'Hypertrophy 12-Week Master Split',
      tagline: 'Scientifically periodised 4-day upper/lower and push/pull/legs periodisation protocol',
      description:
        'Authored by IFBB Pro Master Trainers. Pre-configured exercise load curves, RPE targets, and progressive overload tracking.',
      listingType: 'PROGRAM',
      category: 'Training Programs',
      categorySlug: 'training-programs',
      publisherName: 'Apex Athletics',
      verified: true,
      featured: false,
      version: '1.0.0',
      pricingType: 'PAID',
      priceLabel: '$99 one-time license',
      ratingAverage: 4.92,
      reviewCount: 88,
      installCount: 420,
      requiredPermissions: ['classes:read'],
      healthPiiRequested: false,
      supportedScopes: ['ORGANISATION', 'OUTLET'],
      capabilities: ['12-week periodisation', 'In-app video guides', 'Auto-progression calculator'],
    },
    {
      id: 'mkt-6',
      slug: 'dxa-body-scan-service',
      title: 'Mobile DXA Body Composition Service',
      tagline: 'On-site clinical-grade bone density, visceral fat, and lean mass testing van visits',
      description:
        'Book recurring mobile DXA scanning clinics at your gym. Boosts non-dues secondary spend with zero upfront equipment capital.',
      listingType: 'SERVICE',
      category: 'Wellness & Recovery Services',
      categorySlug: 'wellness-services',
      publisherName: 'BodyMetrics Mobile DXA',
      verified: true,
      featured: false,
      version: '1.1.0',
      pricingType: 'CONTACT_SALES',
      priceLabel: 'Revenue Share (20%)',
      ratingAverage: 4.8,
      reviewCount: 14,
      installCount: 45,
      requiredPermissions: ['bookings:read', 'bookings:write'],
      healthPiiRequested: false,
      supportedScopes: ['OUTLET'],
      capabilities: ['Turnkey mobile clinic', 'Direct member app report delivery', 'High-margin secondary spend'],
    },
  ]);

  // Installed Apps State
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([
    {
      id: 'inst-1',
      listingId: 'mkt-1',
      title: 'CloudGate Turnstile Pro',
      listingType: 'INTEGRATION',
      publisherName: 'GateLock IoT Systems',
      version: '2.4.0',
      latestVersion: '2.4.0',
      status: 'ACTIVE',
      installationScope: 'ORGANISATION',
      healthStatus: 'HEALTHY',
      installedAt: '2026-08-15',
      permissionsGranted: ['checkins:read', 'checkins:write', 'devices:access'],
    },
    {
      id: 'inst-2',
      listingId: 'mkt-2',
      title: 'Aura AI Voice Receptionist',
      listingType: 'AI_AGENT',
      publisherName: 'FitCore Labs (First-Party)',
      version: '3.1.0',
      latestVersion: '3.1.2',
      status: 'ACTIVE',
      installationScope: 'ORGANISATION',
      healthStatus: 'HEALTHY',
      installedAt: '2026-08-20',
      permissionsGranted: ['bookings:read', 'bookings:write', 'classes:read', 'communications:send'],
    },
  ]);

  const categories = [
    { label: 'All Categories', slug: 'ALL' },
    { label: 'Hardware & Integrations', slug: 'integrations' },
    { label: 'AI Agents', slug: 'ai-agents' },
    { label: 'Training Programs', slug: 'training-programs' },
    { label: 'Wellness & Services', slug: 'wellness-services' },
  ];

  // Filtering
  const filteredListings = catalogListings.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.categorySlug === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.publisherName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenInstall = (listing: MarketplaceItem) => {
    setSelectedListing(listing);
    setSelectedScope(listing.supportedScopes[0] || 'ORGANISATION');
    setConsentHealthPii(false);
    setShowInstallModal(true);
  };

  const handleConfirmInstall = () => {
    if (!selectedListing) return;

    if (selectedListing.healthPiiRequested && !consentHealthPii) {
      Alert.alert(
        'Health PII Consent Required',
        'This application requests access to sensitive member biometric data. You must explicitly acknowledge isolated health data permissions to proceed.',
      );
      return;
    }

    setIsInstalling(true);
    setTimeout(() => {
      setIsInstalling(false);
      setShowInstallModal(false);

      const newInstall: InstalledApp = {
        id: `inst-${Date.now()}`,
        listingId: selectedListing.id,
        title: selectedListing.title,
        listingType: selectedListing.listingType,
        publisherName: selectedListing.publisherName,
        version: selectedListing.version,
        latestVersion: selectedListing.version,
        status: 'ACTIVE',
        installationScope: selectedScope,
        healthStatus: 'HEALTHY',
        installedAt: 'Just now',
        permissionsGranted: selectedListing.requiredPermissions,
      };

      setInstalledApps([newInstall, ...installedApps]);
      Alert.alert(
        'Installation Succeeded',
        `${selectedListing.title} is now installed and active across your ${selectedScope.toLowerCase()}.`,
      );
    }, 600);
  };

  const handleTogglePause = (appId: string) => {
    setInstalledApps(
      installedApps.map((a) => {
        if (a.id === appId) {
          const nextStatus = a.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
          return { ...a, status: nextStatus };
        }
        return a;
      }),
    );
  };

  const handleUpgrade = (appId: string, latestVersion: string) => {
    setInstalledApps(
      installedApps.map((a) => (a.id === appId ? { ...a, version: latestVersion } : a)),
    );
    Alert.alert('App Upgraded', `Application has been upgraded to version ${latestVersion}.`);
  };

  const handleUninstall = (appId: string, title: string) => {
    Alert.alert(
      'Confirm Uninstallation',
      `Are you sure you want to uninstall ${title}? All associated permission grants and credentials will be permanently revoked.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Uninstall',
          style: 'destructive',
          onPress: () => {
            setInstalledApps(installedApps.filter((a) => a.id !== appId));
          },
        },
      ],
    );
  };

  const isAlreadyInstalled = (listingId: string) => {
    return installedApps.some((a) => a.listingId === listingId && a.status !== 'UNINSTALLED');
  };

  return (
    <Screen style={styles.screenContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>FitCore Marketplace</Text>
          <Badge variant="primary" label="Ecosystem" />
        </View>
        <Text style={styles.subtitle}>
          Discover verified integrations, autonomous AI agents, hardware turnstiles, and expert fitness programs.
        </Text>
      </View>

      {/* Main Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeMainTab === 'discover' && styles.tabButtonActive]}
          onPress={() => setActiveMainTab('discover')}
        >
          <Text style={[styles.tabText, activeMainTab === 'discover' && styles.tabTextActive]}>
            Explore Catalog
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeMainTab === 'installed' && styles.tabButtonActive]}
          onPress={() => setActiveMainTab('installed')}
        >
          <View style={styles.tabBadgeRow}>
            <Text style={[styles.tabText, activeMainTab === 'installed' && styles.tabTextActive]}>
              Installed ({installedApps.length})
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* DISCOVER TAB CONTENT */}
      {activeMainTab === 'discover' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search apps, turnstiles, AI agents, programs..."
              placeholderTextColor={themeColors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.slug}
                style={[
                  styles.categoryPill,
                  selectedCategory === cat.slug && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory(cat.slug)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCategory === cat.slug && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Featured Carousel Banner */}
          {selectedCategory === 'ALL' && searchQuery === '' && catalogListings[1] && (
            <Card style={styles.featuredCard}>
              <View style={styles.featuredBadgeRow}>
                <Badge variant="warning" label="★ FEATURED ECOSYSTEM SPOTLIGHT" />
                <Text style={styles.featuredVersion}>v3.1.2</Text>
              </View>
              <Text style={styles.featuredTitle}>Aura AI Voice Receptionist</Text>
              <Text style={styles.featuredDesc}>
                Zero missed sales calls. Powered by Day 19 AI Orchestrator to autonomously handle trial bookings, class times, and receptionist queries 24/7.
              </Text>
              <View style={styles.featuredFooter}>
                <Text style={styles.featuredPricing}>Usage-based ($0.08/min)</Text>
                <TouchableOpacity
                  style={styles.featuredActionBtn}
                  onPress={() => handleOpenInstall(catalogListings[1]!)}
                >
                  <Text style={styles.featuredActionBtnText}>
                    {isAlreadyInstalled(catalogListings[1]!.id) ? 'Installed ✓' : 'Install Co-Pilot'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {/* Listings Feed */}
          <View style={styles.feedHeader}>
            <Text style={styles.feedTitle}>
              {selectedCategory === 'ALL' ? 'All Applications & Services' : selectedCategory} ({filteredListings.length})
            </Text>
          </View>

          {filteredListings.map((item) => {
            const installed = isAlreadyInstalled(item.id);
            return (
              <Card key={item.id} style={styles.listingCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleBlock}>
                    <View style={styles.typeBadgeRow}>
                      <Badge
                        variant={item.listingType === 'AI_AGENT' ? 'info' : item.listingType === 'INTEGRATION' ? 'success' : 'primary'}
                        label={item.listingType}
                      />
                      {item.verified && <Badge variant="neutral" label="VERIFIED" />}
                    </View>
                    <Text style={styles.listingTitle}>{item.title}</Text>
                    <Text style={styles.publisherName}>By {item.publisherName}</Text>
                  </View>
                  <View style={styles.priceBlock}>
                    <Text style={styles.priceText}>{item.priceLabel}</Text>
                    <Text style={styles.pricingType}>{item.pricingType}</Text>
                  </View>
                </View>

                <Text style={styles.listingTagline}>{item.tagline}</Text>

                {/* Rating and Stats */}
                <View style={styles.statsRow}>
                  <Text style={styles.ratingText}>★ {item.ratingAverage.toFixed(1)}</Text>
                  <Text style={styles.statDot}>•</Text>
                  <Text style={styles.statText}>{item.reviewCount} reviews</Text>
                  <Text style={styles.statDot}>•</Text>
                  <Text style={styles.statText}>{item.installCount} installs</Text>
                </View>

                {/* Capabilities pills */}
                <View style={styles.capabilityRow}>
                  {item.capabilities.map((cap, idx) => (
                    <View key={idx} style={styles.capabilityPill}>
                      <Text style={styles.capabilityText}>✓ {cap}</Text>
                    </View>
                  ))}
                </View>

                <Divider style={styles.divider} />

                {/* Footer Action */}
                <View style={styles.cardFooter}>
                  <View style={styles.permissionsIndicator}>
                    <Text style={styles.permCountText}>
                      {item.requiredPermissions.length} permissions requested
                    </Text>
                    {item.healthPiiRequested && (
                      <Badge variant="danger" label="Health PII" />
                    )}
                  </View>

                  {installed ? (
                    <Button
                      title="Installed ✓"
                      variant="secondary"
                      size="sm"
                      disabled
                      onPress={() => {}}
                    />
                  ) : (
                    <Button
                      title="View & Install"
                      variant="primary"
                      size="sm"
                      onPress={() => handleOpenInstall(item)}
                    />
                  )}
                </View>
              </Card>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* INSTALLED TAB CONTENT */}
      {activeMainTab === 'installed' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {installedApps.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Applications Installed</Text>
              <Text style={styles.emptySubtitle}>
                Browse the marketplace catalog to discover turnstile controllers, AI agents, and integrations.
              </Text>
              <Button
                title="Browse Marketplace"
                variant="primary"
                onPress={() => setActiveMainTab('discover')}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          ) : (
            installedApps.map((app) => (
              <Card key={app.id} style={styles.installedCard}>
                <View style={styles.installedHeaderRow}>
                  <View>
                    <View style={styles.installedBadgeRow}>
                      <Badge
                        variant={app.status === 'ACTIVE' ? 'success' : 'warning'}
                        label={app.status}
                      />
                      <Badge
                        variant={app.healthStatus === 'HEALTHY' ? 'primary' : 'danger'}
                        label={app.healthStatus}
                      />
                      <Badge variant="neutral" label={`v${app.version}`} />
                    </View>
                    <Text style={styles.installedTitle}>{app.title}</Text>
                    <Text style={styles.installedPublisher}>Publisher: {app.publisherName}</Text>
                  </View>
                </View>

                {/* Scope & Permissions */}
                <View style={styles.installedDetails}>
                  <Text style={styles.installedDetailText}>
                    Scope: <Text style={styles.boldText}>{app.installationScope}</Text>
                  </Text>
                  <Text style={styles.installedDetailText}>
                    Active Grants: <Text style={styles.boldText}>{app.permissionsGranted.join(', ')}</Text>
                  </Text>
                </View>

                {app.version !== app.latestVersion && (
                  <View style={styles.upgradeNotice}>
                    <Text style={styles.upgradeNoticeText}>
                      New version {app.latestVersion} available!
                    </Text>
                    <Button
                      title="Upgrade"
                      variant="primary"
                      size="sm"
                      onPress={() => handleUpgrade(app.id, app.latestVersion)}
                    />
                  </View>
                )}

                <Divider style={styles.divider} />

                {/* Management Action Bar */}
                <View style={styles.installedActionsRow}>
                  <Button
                    title={app.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                    variant="secondary"
                    size="sm"
                    onPress={() => handleTogglePause(app.id)}
                  />
                  <Button
                    title="Uninstall"
                    variant="danger"
                    size="sm"
                    onPress={() => handleUninstall(app.id, app.title)}
                  />
                </View>
              </Card>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* INSTALLATION DIALOG MODAL */}
      <Modal
        visible={showInstallModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInstallModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {selectedListing && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Install {selectedListing.title}</Text>
                  <TouchableOpacity onPress={() => setShowInstallModal(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <Text style={styles.modalDesc}>{selectedListing.description}</Text>

                  <Text style={styles.modalSectionTitle}>Target Installation Scope</Text>
                  <View style={styles.scopeSelector}>
                    {selectedListing.supportedScopes.map((scope) => (
                      <TouchableOpacity
                        key={scope}
                        style={[
                          styles.scopeButton,
                          selectedScope === scope && styles.scopeButtonActive,
                        ]}
                        onPress={() => setSelectedScope(scope)}
                      >
                        <Text
                          style={[
                            styles.scopeButtonText,
                            selectedScope === scope && styles.scopeButtonTextActive,
                          ]}
                        >
                          {scope === 'ORGANISATION' ? 'Organisation-Wide' : 'Single Outlet'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.modalSectionTitle}>Requested Permissions</Text>
                  <View style={styles.permsList}>
                    {selectedListing.requiredPermissions.map((perm) => (
                      <View key={perm} style={styles.permItem}>
                        <Text style={styles.permCheck}>✓</Text>
                        <Text style={styles.permName}>{perm}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Sensitive Health PII isolation acknowledgment */}
                  {selectedListing.healthPiiRequested && (
                    <Card style={styles.healthPiiWarningCard}>
                      <Badge variant="danger" label="HEALTH PII ISOLATION REQUIREMENT" />
                      <Text style={styles.healthPiiNoticeText}>
                        This app requests member biometric data. FitCore maintains strict medical data isolation. This grant does NOT grant biometric access until individual members grant consent.
                      </Text>
                      <TouchableOpacity
                        style={styles.consentCheckboxRow}
                        onPress={() => setConsentHealthPii(!consentHealthPii)}
                      >
                        <View style={[styles.checkbox, consentHealthPii && styles.checkboxChecked]}>
                          {consentHealthPii && <Text style={styles.checkboxCheck}>✓</Text>}
                        </View>
                        <Text style={styles.consentLabel}>
                          I authorise this application to request biometric permissions under compliance policies.
                        </Text>
                      </TouchableOpacity>
                    </Card>
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={() => setShowInstallModal(false)}
                    style={{ flex: 1, marginRight: spacing.sm }}
                  />
                  <Button
                    title={isInstalling ? 'Installing...' : 'Confirm & Install'}
                    variant="primary"
                    disabled={isInstalling}
                    onPress={handleConfirmInstall}
                    style={{ flex: 1, marginLeft: spacing.sm }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  tabButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: themeColors.primary,
  },
  tabText: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: themeColors.primary,
  },
  tabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  searchContainer: {
    marginBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: themeColors.cardBackground,
    borderColor: themeColors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: themeColors.textPrimary,
    ...typography.bodySm,
  },
  categoryScroll: {
    marginBottom: spacing.md,
  },
  categoryScrollContent: {
    paddingVertical: 2,
  },
  categoryPill: {
    backgroundColor: themeColors.cardBackground,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginRight: spacing.sm,
  },
  categoryPillActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  categoryPillText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  featuredCard: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  featuredBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  featuredVersion: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  featuredTitle: {
    ...typography.h3,
    color: '#ffffff',
    fontWeight: '700',
    marginVertical: 4,
  },
  featuredDesc: {
    ...typography.bodySm,
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: spacing.sm,
  },
  featuredPricing: {
    ...typography.caption,
    color: '#38bdf8',
    fontWeight: '700',
  },
  featuredActionBtn: {
    backgroundColor: themeColors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  featuredActionBtnText: {
    ...typography.caption,
    color: '#ffffff',
    fontWeight: '700',
  },
  feedHeader: {
    marginBottom: spacing.sm,
  },
  feedTitle: {
    ...typography.bodyMd,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  listingCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleBlock: {
    flex: 1,
    marginRight: spacing.sm,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  listingTitle: {
    ...typography.bodyMd,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  publisherName: {
    ...typography.caption,
    color: themeColors.textTertiary,
    marginTop: 2,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceText: {
    ...typography.bodySm,
    color: themeColors.primary,
    fontWeight: '700',
  },
  pricingType: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  listingTagline: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    marginVertical: spacing.xs,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  ratingText: {
    ...typography.caption,
    color: '#f59e0b',
    fontWeight: '700',
  },
  statDot: {
    ...typography.caption,
    color: themeColors.textTertiary,
    marginHorizontal: 6,
  },
  statText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  capabilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: spacing.xs,
  },
  capabilityPill: {
    backgroundColor: themeColors.surfaceHighlight,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  capabilityText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permissionsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  permCountText: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  installedCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  installedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  installedBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  installedTitle: {
    ...typography.bodyMd,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  installedPublisher: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  installedDetails: {
    marginVertical: spacing.sm,
    gap: 2,
  },
  installedDetailText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  boldText: {
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  upgradeNotice: {
    backgroundColor: '#0c4a6e',
    borderColor: '#0284c7',
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  upgradeNoticeText: {
    ...typography.caption,
    color: '#e0f2fe',
    fontWeight: '600',
  },
  installedActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: themeColors.cardBackground,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '85%',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  modalClose: {
    ...typography.h3,
    color: themeColors.textSecondary,
  },
  modalBody: {
    marginBottom: spacing.md,
  },
  modalDesc: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  modalSectionTitle: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  scopeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  scopeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  scopeButtonActive: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.surfaceHighlight,
  },
  scopeButtonText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  scopeButtonTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  permsList: {
    gap: 6,
    marginBottom: spacing.md,
  },
  permItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permCheck: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  permName: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontFamily: 'monospace',
  },
  healthPiiWarningCard: {
    backgroundColor: '#450a0a',
    borderColor: '#991b1b',
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  healthPiiNoticeText: {
    ...typography.caption,
    color: '#fecaca',
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  consentCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#ef4444',
  },
  checkboxCheck: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  consentLabel: {
    ...typography.caption,
    color: '#fecaca',
    flex: 1,
    fontSize: 11,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
});
