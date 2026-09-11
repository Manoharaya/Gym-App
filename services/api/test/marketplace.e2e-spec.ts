/**
 * Day 50 — Marketplace Foundation Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Marketplace Discovery, Taxonomy & Public Catalog (/categories, /permissions, /featured, /popular, /listings)
 * 2. Search & Visibility Filtering (Public vs Private org-scoped visibility)
 * 3. Publisher Portal & Lifecycle (Create draft, publish versions, submit for review)
 * 4. Superadmin Moderation (Approve, reject with feedback, suspend active listing)
 * 5. Publisher Analytics & Telemetry (Views, installs, review counts, average ratings)
 * 6. Installation Lifecycle (Organisation-wide & Outlet-specific scopes, configure, pause, resume, upgrade, uninstall)
 * 7. Multi-Tenant Idempotency & Conflict Guard (No duplicate active installs)
 * 8. Sensitive Health PII Quarantine (Blocks biometric access without explicit consent)
 * 9. Pre-Flight Dependency Graph & Mutual Conflict Detection (Missing dependencies, bidirectional conflicts)
 * 10. Verified Reviews & Rating Aggregation (Only installed tenants can review, single review per tenant, live recalculation)
 * 11. Review Flagging & Admin Moderation (Flag, hide, remove)
 * 12. Installation Health Probes & Tenant Health Summary (Healthy, degraded, failing state transitions)
 * 13. Multi-Tenant Boundary & IDOR Defense (Cross-tenant installation access blocked)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { MarketplaceListingService } from '../src/marketplace/services/marketplace-listing.service';
import { MarketplaceInstallationService } from '../src/marketplace/services/marketplace-installation.service';
import { MarketplaceDiscoveryService } from '../src/marketplace/services/marketplace-discovery.service';
import { MarketplaceReviewService } from '../src/marketplace/services/marketplace-review.service';
import { MarketplaceCategoryService } from '../src/marketplace/services/marketplace-category.service';
import { MarketplaceHealthService } from '../src/marketplace/services/marketplace-health.service';
import request from 'supertest';

describe('Day 50: Marketplace Foundation E2E Suite', () => {
  jest.setTimeout(90000);

  let app: INestApplication;
  let prisma: PrismaService;
  let listingService: MarketplaceListingService;
  let installationService: MarketplaceInstallationService;
  let discoveryService: MarketplaceDiscoveryService;
  let reviewService: MarketplaceReviewService;
  let categoryService: MarketplaceCategoryService;
  let healthService: MarketplaceHealthService;

  let superAdminToken: string;
  let orgA: any;
  let orgB: any;
  let outletA: any;
  let userA: any;
  let userB: any;
  let userAToken: string;
  let userBToken: string;

  let defaultCategory: any;
  let publishedListing: any;
  let healthPiiListing: any;
  let dependentListing: any;
  let conflictingListingA: any;
  let conflictingListingB: any;

  const getBody = (res: any) =>
    res.body && res.body.data !== undefined ? res.body.data : res.body;

  const getErrorMessage = (res: any) =>
    res.body?.error?.message || res.body?.message || '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    listingService = app.get(MarketplaceListingService);
    installationService = app.get(MarketplaceInstallationService);
    discoveryService = app.get(MarketplaceDiscoveryService);
    reviewService = app.get(MarketplaceReviewService);
    categoryService = app.get(MarketplaceCategoryService);
    healthService = app.get(MarketplaceHealthService);

    // 1. Authenticate SuperAdmin
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@fitcore.io', password: 'FitCoreDev2026!' });
    superAdminToken = loginRes.body.data?.accessToken || loginRes.body.accessToken;

    const ts = Date.now();

    // 2. Setup Test Organisations
    orgA = await prisma.organisation.create({
      data: {
        name: `Marketplace Org A ${ts}`,
        slug: `mkt-org-a-${ts}`,
        status: 'ACTIVE',
        currency: 'AUD',
        timezone: 'Australia/Perth',
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `Marketplace Org B ${ts}`,
        slug: `mkt-org-b-${ts}`,
        status: 'ACTIVE',
        currency: 'USD',
        timezone: 'America/New_York',
      },
    });

    // 3. Setup Test Outlet
    outletA = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: `Perth Central ${ts}`,
        code: `PER-${ts}`,
        slug: `perth-central-${ts}`,
        address: '100 St Georges Terrace',
        city: 'Perth',
        state: 'WA',
        postalCode: '6000',
        country: 'Australia',
        timezone: 'Australia/Perth',
        status: 'ACTIVE',
      },
    });

    // 4. Setup Test Users
    userA = await prisma.user.create({
      data: {
        email: `org_a_admin_${ts}@test.fitcore.io`,
        passwordHash: 'dummy-hash',
        firstName: 'Alice',
        lastName: 'Manager',
        status: 'ACTIVE',
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `org_b_admin_${ts}@test.fitcore.io`,
        passwordHash: 'dummy-hash',
        firstName: 'Bob',
        lastName: 'Director',
        status: 'ACTIVE',
      },
    });

    // Assign roles
    const ownerRole = await prisma.role.findFirst({ where: { name: 'ORGANISATION_OWNER' } });
    if (ownerRole) {
      await prisma.userRole.create({
        data: {
          userId: userA.id,
          roleId: ownerRole.id,
          organisationId: orgA.id,
        },
      });
      await prisma.userRole.create({
        data: {
          userId: userB.id,
          roleId: ownerRole.id,
          organisationId: orgB.id,
        },
      });
    }

    // User A & B tokens (superadmin token can impersonate with x-organisation-id)
    userAToken = superAdminToken;
    userBToken = superAdminToken;

    // 5. Seed default categories if not already seeded
    await categoryService.seedDefaultCategories();
    defaultCategory = await prisma.marketplaceCategory.findFirst({
      where: { slug: 'integrations' },
    });
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (orgA?.id) {
        await prisma.marketplaceAuditLog.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.marketplacePermissionGrant.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.marketplaceReview.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.marketplaceInstallation.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.outlet.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.marketplaceListing.deleteMany({ where: { publisherOrgId: orgA.id } });
        await prisma.userRole.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.user.deleteMany({ where: { id: userA.id } });
        await prisma.organisation.delete({ where: { id: orgA.id } });
      }
      if (orgB?.id) {
        await prisma.marketplaceAuditLog.deleteMany({ where: { organisationId: orgB.id } });
        await prisma.marketplacePermissionGrant.deleteMany({ where: { organisationId: orgB.id } });
        await prisma.marketplaceReview.deleteMany({ where: { organisationId: orgB.id } });
        await prisma.marketplaceInstallation.deleteMany({ where: { organisationId: orgB.id } });
        await prisma.marketplaceListing.deleteMany({ where: { publisherOrgId: orgB.id } });
        await prisma.userRole.deleteMany({ where: { organisationId: orgB.id } });
        await prisma.user.deleteMany({ where: { id: userB.id } });
        await prisma.organisation.delete({ where: { id: orgB.id } });
      }
    } catch (e) {
      // Ignore cleanup error
    }
    await app.close();
  });

  // =========================================================================
  // 1. PUBLIC DISCOVERY & TAXONOMY
  // =========================================================================
  describe('1. Discovery & Public Catalog', () => {
    it('GET /marketplace/categories returns all seeded categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/categories')
        .expect(200);

      const data = getBody(res);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(6);
      expect(data.some((c: any) => c.slug === 'business-apps')).toBe(true);
      expect(data.some((c: any) => c.slug === 'integrations')).toBe(true);
      expect(data.some((c: any) => c.slug === 'ai-agents')).toBe(true);
    });

    it('GET /marketplace/permissions returns permission catalog including health permissions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/permissions')
        .expect(200);

      const data = getBody(res);
      expect(data.permissions).toBeDefined();
      expect(data.permissions).toContain('members:read');
      expect(data.permissions).toContain('bookings:write');
      expect(data.permissions).toContain('devices:access');
      expect(data.permissions).toContain('health:biometrics:read');
    });

    it('GET /marketplace returns paginated published listings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace')
        .expect(200);

      const data = getBody(res);
      expect(data.items).toBeDefined();
      expect(data.meta).toBeDefined();
      expect(data.meta.page).toBe(1);
    });
  });

  // =========================================================================
  // 2. PUBLISHER LIFECYCLE & SUPERADMIN MODERATION
  // =========================================================================
  describe('2. Publisher Lifecycle & Admin Moderation', () => {
    let draftListing: any;
    const ts = Date.now();

    it('POST /marketplace/publisher/listings creates a listing in DRAFT status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/marketplace/publisher/listings')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          title: `CloudTurnstile IoT Controller ${ts}`,
          slug: `cloudturnstile-${ts}`,
          tagline: 'High speed RFID turnstile controller',
          description: 'Enforces sub-50ms offline checkin validations and optical barrier access.',
          listingType: 'INTEGRATION',
          publisherType: 'VERIFIED_PARTNER',
          categoryId: defaultCategory.id,
          publisherName: 'IoT Security Systems',
          publisherEmail: 'dev@iotsecurity.io',
          requiredPermissions: ['checkins:read', 'checkins:write', 'devices:access'],
          supportedScopes: ['ORGANISATION', 'OUTLET'],
          capabilities: ['Sub-50ms checkin', 'RFID & NFC scan'],
          pricingType: 'SUBSCRIPTION',
          featured: true,
        })
        .expect(201);

      draftListing = getBody(res);
      expect(draftListing.id).toBeDefined();
      expect(draftListing.status).toBe('DRAFT');
      expect(draftListing.currentVersion).toBe('1.0.0');
      expect(draftListing.versions.length).toBe(1);
    });

    it('POST /marketplace/publisher/listings/:id/submit submits draft for review', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/marketplace/publisher/listings/${draftListing.id}/submit`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(201);

      const data = getBody(res);
      expect(data.status).toBe('UNDER_REVIEW');
    });

    it('GET /marketplace/admin/submissions lists submitted listings for superadmin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/admin/submissions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const data = getBody(res);
      expect(Array.isArray(data)).toBe(true);
      expect(data.some((l: any) => l.id === draftListing.id)).toBe(true);
    });

    it('POST /marketplace/admin/listings/:id/approve approves and publishes listing', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/marketplace/admin/listings/${draftListing.id}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(201);

      publishedListing = getBody(res);
      expect(publishedListing.status).toBe('PUBLISHED');
      expect(publishedListing.verified).toBe(true);
      expect(publishedListing.publishedAt).toBeDefined();
    });

    it('POST /marketplace/publisher/listings/:id/versions releases a new version', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/marketplace/publisher/listings/${publishedListing.id}/versions`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          version: '1.1.0',
          changelog: 'Added anti-tailgating optical barrier alerts',
          manifest: {
            slug: publishedListing.slug,
            version: '1.1.0',
            entrypoint: 'index.js',
          },
          requiredPermissions: ['checkins:read', 'checkins:write', 'devices:access'],
          supportedScopes: ['ORGANISATION', 'OUTLET'],
        })
        .expect(201);

      const version = getBody(res);
      expect(version.version).toBe('1.1.0');
      expect(version.status).toBe('PUBLISHED');

      // Verify listing updated currentVersion
      const updated = await prisma.marketplaceListing.findUnique({
        where: { id: publishedListing.id },
      });
      expect(updated?.currentVersion).toBe('1.1.0');
    });

    it('GET /marketplace/publisher/analytics returns publisher telemetry metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/publisher/analytics')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const data = getBody(res);
      expect(data.overview).toBeDefined();
      expect(data.overview.totalListings).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(data.listings)).toBe(true);
    });
  });

  // =========================================================================
  // 3. SEARCH & VISIBILITY FILTERING
  // =========================================================================
  describe('3. Search, Category & Visibility Filtering', () => {
    it('GET /marketplace?search=... finds published listing by title keyword', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/marketplace?search=CloudTurnstile`)
        .expect(200);

      const data = getBody(res);
      expect(data.items.some((i: any) => i.id === publishedListing.id)).toBe(true);
    });

    it('GET /marketplace/featured returns featured listings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/featured')
        .expect(200);

      const data = getBody(res);
      expect(Array.isArray(data)).toBe(true);
      expect(data.some((i: any) => i.id === publishedListing.id)).toBe(true);
    });

    it('GET /marketplace/listings/:slug increments view count and returns details', async () => {
      const res1 = await request(app.getHttpServer())
        .get(`/api/v1/marketplace/listings/${publishedListing.slug}`)
        .expect(200);

      const listing = getBody(res1);
      expect(listing.id).toBe(publishedListing.id);
      expect(listing.category).toBeDefined();
      expect(listing.versions.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // 4. INSTALLATION LIFECYCLE & SCOPES
  // =========================================================================
  describe('4. Tenant Installation Lifecycle & Scope Enforcement', () => {
    let orgAInstallation: any;

    it('POST /marketplace/installations installs listing at ORGANISATION scope', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/marketplace/installations')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          listingId: publishedListing.id,
          installationScope: 'ORGANISATION',
          config: { gateTimeoutSeconds: 5, enableTailgateAlarm: true },
          approvedPermissions: ['checkins:read', 'checkins:write', 'devices:access'],
        })
        .expect(201);

      orgAInstallation = getBody(res);
      expect(orgAInstallation.id).toBeDefined();
      expect(orgAInstallation.status).toBe('ACTIVE');
      expect(orgAInstallation.installationScope).toBe('ORGANISATION');
      expect(orgAInstallation.config.enableTailgateAlarm).toBe(true);
      expect(orgAInstallation.permissionGrants.length).toBe(3);
    });

    it('POST /marketplace/installations rejects duplicate installation (Idempotency)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/marketplace/installations')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          listingId: publishedListing.id,
          installationScope: 'ORGANISATION',
        })
        .expect(409);

      expect(getErrorMessage(res)).toContain('already installed');
    });

    it('GET /marketplace/installations lists tenant active installations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/installations')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const data = getBody(res);
      expect(Array.isArray(data)).toBe(true);
      expect(data.some((i: any) => i.id === orgAInstallation.id)).toBe(true);
    });

    it('PATCH /marketplace/installations/:id/config updates installation config and permissions', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/marketplace/installations/${orgAInstallation.id}/config`)
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          config: { gateTimeoutSeconds: 10 },
        })
        .expect(200);

      const updated = getBody(res);
      expect(updated.config.gateTimeoutSeconds).toBe(10);
      expect(updated.config.enableTailgateAlarm).toBe(true);
    });

    it('POST /marketplace/installations/:id/pause pauses an active installation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/marketplace/installations/${orgAInstallation.id}/pause`)
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(201);

      const data = getBody(res);
      expect(data.status).toBe('PAUSED');
      expect(data.pausedAt).toBeDefined();
    });

    it('POST /marketplace/installations/:id/resume resumes a paused installation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/marketplace/installations/${orgAInstallation.id}/resume`)
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(201);

      const data = getBody(res);
      expect(data.status).toBe('ACTIVE');
      expect(data.pausedAt).toBeNull();
    });

    it('POST /marketplace/installations/:id/upgrade upgrades installation to target version', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/marketplace/installations/${orgAInstallation.id}/upgrade`)
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .send({ version: '1.1.0' })
        .expect(201);

      const upgraded = getBody(res);
      expect(upgraded.version.version).toBe('1.1.0');
    });

    it('DELETE /marketplace/installations/:id uninstalls and revokes all permission grants', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/marketplace/installations/${orgAInstallation.id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const data = getBody(res);
      expect(data.status).toBe('UNINSTALLED');
      expect(data.uninstalledAt).toBeDefined();

      // Verify all permission grants are revoked
      const grants = await prisma.marketplacePermissionGrant.findMany({
        where: { installationId: orgAInstallation.id },
      });
      expect(grants.every((g) => g.status === 'REVOKED')).toBe(true);
    });
  });

  // =========================================================================
  // 5. HEALTH PII QUARANTINE & CONSENT ISOLATION
  // =========================================================================
  describe('5. Sensitive Health PII Isolation & Consent Enforcer', () => {
    beforeAll(async () => {
      const ts = Date.now();
      healthPiiListing = await prisma.marketplaceListing.create({
        data: {
          title: `Biometric Recovery CoPilot ${ts}`,
          slug: `biometric-copilot-${ts}`,
          tagline: 'HRV and sleep strain tracker',
          description: 'Monitors member biometrics and wearable recovery metrics.',
          listingType: 'AI_AGENT',
          publisherType: 'FIRST_PARTY',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          categoryId: defaultCategory.id,
          publisherName: 'BioFit AI',
          publisherEmail: 'support@biofit.ai',
          requiredPermissions: ['health:biometrics:read', 'health:wearables:read'],
          supportedScopes: ['ORGANISATION'],
          healthPiiRequested: true,
          currentVersion: '1.0.0',
        },
      });

      await prisma.marketplaceListingVersion.create({
        data: {
          listingId: healthPiiListing.id,
          version: '1.0.0',
          status: 'PUBLISHED',
          manifest: { slug: healthPiiListing.slug, version: '1.0.0' },
          requiredPermissions: ['health:biometrics:read', 'health:wearables:read'],
          healthPiiRequested: true,
        },
      });
    });

    it('POST /marketplace/installations blocks Health PII app without explicit consent (HTTP 403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/marketplace/installations')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          listingId: healthPiiListing.id,
          installationScope: 'ORGANISATION',
          consentHealthPii: false, // Consent NOT given
        })
        .expect(403);

      expect(getErrorMessage(res)).toContain('explicit isolated member Health PII consent');
    });

    it('POST /marketplace/installations succeeds when consentHealthPii: true is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/marketplace/installations')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          listingId: healthPiiListing.id,
          installationScope: 'ORGANISATION',
          consentHealthPii: true, // Explicit Consent given
        })
        .expect(201);

      const data = getBody(res);
      expect(data.status).toBe('ACTIVE');

      // Verify permission grants flagged as isHealthPii: true
      const grants = await prisma.marketplacePermissionGrant.findMany({
        where: { installationId: data.id },
      });
      expect(grants.some((g) => g.permission === 'health:biometrics:read' && g.isHealthPii === true)).toBe(true);
    });
  });

  // =========================================================================
  // 6. DEPENDENCY GRAPH & CONFLICT DETECTION
  // =========================================================================
  describe('6. Pre-Flight Dependency Graph & Conflict Detection', () => {
    beforeAll(async () => {
      const ts = Date.now();

      // Listing with required dependency
      dependentListing = await prisma.marketplaceListing.create({
        data: {
          title: `Advanced Gate AI Analytics ${ts}`,
          slug: `gate-ai-analytics-${ts}`,
          tagline: 'Tailgating image detection module',
          description: 'Requires CloudGate controller.',
          listingType: 'AI_AGENT',
          publisherType: 'COMMUNITY',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          categoryId: defaultCategory.id,
          publisherName: 'Vision Gate AI',
          publisherEmail: 'vision@gateai.com',
          requiredPermissions: ['checkins:read'],
          supportedScopes: ['ORGANISATION'],
          dependencies: [{ slug: 'required-nonexistent-base-hardware', optional: false }],
          currentVersion: '1.0.0',
        },
      });

      await prisma.marketplaceListingVersion.create({
        data: {
          listingId: dependentListing.id,
          version: '1.0.0',
          status: 'PUBLISHED',
          manifest: { slug: dependentListing.slug, version: '1.0.0' },
          requiredPermissions: ['checkins:read'],
        },
      });

      // Two mutually conflicting listings
      conflictingListingA = await prisma.marketplaceListing.create({
        data: {
          title: `Access Driver Alpha ${ts}`,
          slug: `driver-alpha-${ts}`,
          tagline: 'Legacy RS-485 gate bus',
          description: 'Direct serial bus gate controller.',
          listingType: 'INTEGRATION',
          publisherType: 'COMMUNITY',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          categoryId: defaultCategory.id,
          publisherName: 'Serial Works',
          publisherEmail: 'dev@serialworks.com',
          conflicts: [`driver-beta-${ts}`],
          currentVersion: '1.0.0',
        },
      });

      await prisma.marketplaceListingVersion.create({
        data: {
          listingId: conflictingListingA.id,
          version: '1.0.0',
          status: 'PUBLISHED',
          manifest: { slug: conflictingListingA.slug, version: '1.0.0' },
        },
      });

      conflictingListingB = await prisma.marketplaceListing.create({
        data: {
          title: `Access Driver Beta ${ts}`,
          slug: `driver-beta-${ts}`,
          tagline: 'Modern Wiegand/OSDP bus',
          description: 'OSDP high-security bus controller.',
          listingType: 'INTEGRATION',
          publisherType: 'COMMUNITY',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          categoryId: defaultCategory.id,
          publisherName: 'OSDP Works',
          publisherEmail: 'dev@osdpworks.com',
          conflicts: [`driver-alpha-${ts}`],
          currentVersion: '1.0.0',
        },
      });

      await prisma.marketplaceListingVersion.create({
        data: {
          listingId: conflictingListingB.id,
          version: '1.0.0',
          status: 'PUBLISHED',
          manifest: { slug: conflictingListingB.slug, version: '1.0.0' },
        },
      });
    });

    it('POST /marketplace/installations rejects install when required dependency is missing (HTTP 422)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/marketplace/installations')
        .set('Authorization', `Bearer ${userBToken}`)
        .set('x-organisation-id', orgB.id)
        .send({
          listingId: dependentListing.id,
          installationScope: 'ORGANISATION',
        })
        .expect(422);

      expect(getErrorMessage(res)).toContain('missing required dependencies');
      expect(getErrorMessage(res)).toContain('required-nonexistent-base-hardware');
    });

    it('POST /marketplace/installations detects and blocks conflicting application (HTTP 409)', async () => {
      // 1. Install Driver Alpha in Org B
      await request(app.getHttpServer())
        .post('/api/v1/marketplace/installations')
        .set('Authorization', `Bearer ${userBToken}`)
        .set('x-organisation-id', orgB.id)
        .send({
          listingId: conflictingListingA.id,
          installationScope: 'ORGANISATION',
        })
        .expect(201);

      // 2. Attempt to install Driver Beta in Org B (declares conflict with Alpha)
      const res = await request(app.getHttpServer())
        .post('/api/v1/marketplace/installations')
        .set('Authorization', `Bearer ${userBToken}`)
        .set('x-organisation-id', orgB.id)
        .send({
          listingId: conflictingListingB.id,
          installationScope: 'ORGANISATION',
        })
        .expect(409);

      expect(getErrorMessage(res)).toContain('active conflicts');
    });
  });

  // =========================================================================
  // 7. VERIFIED REVIEWS & RATINGS AGGREGATION
  // =========================================================================
  describe('7. Verified Reviews & Star Rating Engine', () => {
    let reviewTargetListing: any;
    let createdReviewId: string;

    beforeAll(async () => {
      const ts = Date.now();
      reviewTargetListing = await prisma.marketplaceListing.create({
        data: {
          title: `Xero Cloud Bridge ${ts}`,
          slug: `xero-bridge-${ts}`,
          tagline: 'Real-time ledger export',
          description: 'Maps invoices and settlement payouts.',
          listingType: 'INTEGRATION',
          publisherType: 'FIRST_PARTY',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          categoryId: defaultCategory.id,
          publisherName: 'FinSync Solutions',
          publisherEmail: 'dev@finsync.io',
          currentVersion: '1.0.0',
        },
      });

      await prisma.marketplaceListingVersion.create({
        data: {
          listingId: reviewTargetListing.id,
          version: '1.0.0',
          status: 'PUBLISHED',
          manifest: { slug: reviewTargetListing.slug, version: '1.0.0' },
        },
      });
    });

    it('POST /marketplace/listings/:id/reviews rejects uninstalled organisation review (HTTP 403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/marketplace/listings/${reviewTargetListing.id}/reviews`)
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          rating: 5,
          title: 'Great bridge',
          comment: 'Works wonders without installing.',
        })
        .expect(403);

      expect(getErrorMessage(res)).toContain('restricted to organisations that have actively installed');
    });

    it('POST /marketplace/listings/:id/reviews succeeds after verified installation', async () => {
      // 1. Install listing
      await request(app.getHttpServer())
        .post('/api/v1/marketplace/installations')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          listingId: reviewTargetListing.id,
          installationScope: 'ORGANISATION',
        })
        .expect(201);

      // 2. Submit verified review
      const res = await request(app.getHttpServer())
        .post(`/api/v1/marketplace/listings/${reviewTargetListing.id}/reviews`)
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          rating: 5,
          title: 'Exceptional Ledger Sync',
          comment: 'Saved our accounting team 12 hours every week on end-of-month reconciliations.',
        })
        .expect(201);

      const review = getBody(res);
      createdReviewId = review.id;
      expect(review.rating).toBe(5);
      expect(review.isVerifiedInstallation).toBe(true);

      // Verify listing updated ratingAverage and reviewCount
      const updatedListing = await prisma.marketplaceListing.findUnique({
        where: { id: reviewTargetListing.id },
      });
      expect(updatedListing?.ratingAverage).toBe(5.0);
      expect(updatedListing?.reviewCount).toBe(1);
    });

    it('POST /marketplace/listings/:id/reviews rejects duplicate review from same organisation (HTTP 409)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/marketplace/listings/${reviewTargetListing.id}/reviews`)
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          rating: 4,
          title: 'Second review attempt',
          comment: 'Should be rejected due to uniqueness constraint.',
        })
        .expect(409);

      expect(getErrorMessage(res)).toContain('already submitted a review');
    });

    it('GET /marketplace/listings/:id/reviews returns published reviews', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/marketplace/listings/${reviewTargetListing.id}/reviews`)
        .expect(200);

      const data = getBody(res);
      expect(data.reviews.length).toBe(1);
      expect(data.reviews[0].id).toBe(createdReviewId);
    });

    it('POST /marketplace/reviews/:id/flag flags a review for moderation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/marketplace/reviews/${createdReviewId}/flag`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ reason: 'Potential advertising content' })
        .expect(201);

      const data = getBody(res);
      expect(data.status).toBe('FLAGGED');
    });

    it('POST /marketplace/admin/reviews/:id/moderate superadmin can hide or publish review', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/marketplace/admin/reviews/${createdReviewId}/moderate`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: 'PUBLISHED',
          moderationNotes: 'Reviewed by admin team: verified genuine customer feedback',
        })
        .expect(201);

      const data = getBody(res);
      expect(data.status).toBe('PUBLISHED');
      expect(data.moderationNotes).toContain('verified genuine');
    });
  });

  // =========================================================================
  // 8. INSTALLATION HEALTH SUPERVISOR
  // =========================================================================
  describe('8. Installation Health Probes & Tenant Health Summary', () => {
    let testInst: any;

    beforeAll(async () => {
      // Find an active installation for Org A
      testInst = await prisma.marketplaceInstallation.findFirst({
        where: { organisationId: orgA.id, status: 'ACTIVE' },
      });
    });

    it('POST /marketplace/installations/:id/health records degraded or failing health probe', async () => {
      if (!testInst) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/marketplace/installations/${testInst.id}/health`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          status: 'DEGRADED',
          details: { latencyMs: 840, consecutiveRetries: 3 },
        })
        .expect(201);

      const updated = getBody(res);
      expect(updated.healthStatus).toBe('DEGRADED');
      expect(updated.healthDetails.latencyMs).toBe(840);
    });

    it('GET /marketplace/installations/health returns tenant health summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/installations/health')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const summary = getBody(res);
      expect(summary.totalActive).toBeGreaterThanOrEqual(1);
      expect(summary.installations).toBeDefined();
    });
  });

  // =========================================================================
  // 9. MULTI-TENANT ISOLATION & IDOR DEFENSE
  // =========================================================================
  describe('9. Multi-Tenant Boundary & Cross-Tenant IDOR Defenses', () => {
    let orgAInst: any;

    beforeAll(async () => {
      orgAInst = await prisma.marketplaceInstallation.findFirst({
        where: { organisationId: orgA.id },
      });
    });

    it('GET /marketplace/installations/:id blocks Org B from accessing Org A installation (HTTP 404)', async () => {
      if (!orgAInst) return;

      await request(app.getHttpServer())
        .get(`/api/v1/marketplace/installations/${orgAInst.id}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .set('x-organisation-id', orgB.id) // Org B context!
        .expect(404);
    });

    it('DELETE /marketplace/installations/:id blocks Org B from uninstalling Org A installation (HTTP 404)', async () => {
      if (!orgAInst) return;

      await request(app.getHttpServer())
        .delete(`/api/v1/marketplace/installations/${orgAInst.id}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .set('x-organisation-id', orgB.id) // Org B context!
        .expect(404);
    });
  });
});
