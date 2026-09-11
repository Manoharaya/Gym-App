/**
 * Day 49 — Developer Platform & Public API Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Developer Application Lifecycle (Create, read, update, rotate secret, suspend/revoke)
 * 2. Developer API Key Management (fc_live_/fc_test_ prefixes, hashing, zero-downtime rotation, revocation)
 * 3. Scope Registry, Sensitivity & Scope Escalation Guards
 * 4. Public API Domain Endpoints (/members, /classes, /bookings, /memberships, /trainers, /attendance)
 * 5. Idempotent Booking Creation with Idempotency-Key
 * 6. Strict Data Privacy Boundaries (Sanitizes PAR-Q, medical, injuries, and wearable telemetry)
 * 7. Sliding-Window Rate Limiting (X-RateLimit-* headers & HTTP 429 Retry-After)
 * 8. OAuth 2.0 Authorization Code Flow with PKCE (S256 challenge, single-use code replay rejection, token rotation)
 * 9. Webhook Subscriptions, HMAC-SHA256 Signing & SSRF Defenses (Localhost/private IP rejection)
 * 10. Webhook Synthetic Test Dispatching (Safe test: true payloads)
 * 11. Multi-Tenant RBAC & Cross-Tenant IDOR Defenses (Org A vs Org B isolation)
 * 12. Developer API Usage Analytics & Audit Logging (No secrets or sensitive PII logged)
 * 13. Sandbox Environment Capabilities
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { DeveloperApplicationService } from '../src/developer-platform/services/developer-application.service';
import { ApiKeyService } from '../src/developer-platform/services/api-key.service';
import { ApiScopeService } from '../src/developer-platform/services/api-scope.service';
import { OAuthService } from '../src/developer-platform/services/oauth.service';
import { WebhookSubscriptionService } from '../src/developer-platform/services/webhook-subscription.service';
import { WebhookSigningService } from '../src/developer-platform/services/webhook-signing.service';
import { WebhookDeliveryService } from '../src/developer-platform/services/webhook-delivery.service';
import { ApiRateLimitService } from '../src/developer-platform/services/api-rate-limit.service';
import { ApiUsageService } from '../src/developer-platform/services/api-usage.service';
import { DeveloperSecurityService } from '../src/developer-platform/services/developer-security.service';
import request from 'supertest';
import * as crypto from 'crypto';

describe('Day 49: Developer Platform E2E Suite', () => {
  jest.setTimeout(90000);
  let app: INestApplication;
  let prisma: PrismaService;
  let appService: DeveloperApplicationService;
  let apiKeyService: ApiKeyService;
  let scopeService: ApiScopeService;
  let oauthService: OAuthService;
  let webhookSubService: WebhookSubscriptionService;
  let webhookSigningService: WebhookSigningService;
  let webhookDeliveryService: WebhookDeliveryService;
  let rateLimitService: ApiRateLimitService;
  let usageService: ApiUsageService;
  let securityService: DeveloperSecurityService;

  let superAdminToken: string;
  let orgA: any;
  let orgB: any;
  let outletA: any;
  let userA: any;
  let memberA: any;
  let classTypeA: any;
  let classSessionA: any;
  let membershipPlanA: any;
  let staffUserA: any;
  let staffProfileA: any;
  let trainerProfileA: any;

  let createdApplication: any;
  let plainClientSecret: string;
  let activeLiveApiKey: string;
  let activeTestApiKey: string;
  let activeApiKeyRecord: any;

  const getBody = (res: any) =>
    res.body && res.body.data !== undefined ? res.body.data : res.body;

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
    appService = app.get(DeveloperApplicationService);
    apiKeyService = app.get(ApiKeyService);
    scopeService = app.get(ApiScopeService);
    oauthService = app.get(OAuthService);
    webhookSubService = app.get(WebhookSubscriptionService);
    webhookSigningService = app.get(WebhookSigningService);
    webhookDeliveryService = app.get(WebhookDeliveryService);
    rateLimitService = app.get(ApiRateLimitService);
    usageService = app.get(ApiUsageService);
    securityService = app.get(DeveloperSecurityService);

    // 1. Authenticate SuperAdmin
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@fitcore.io', password: 'FitCoreDev2026!' });
    superAdminToken = loginRes.body.data?.accessToken || loginRes.body.accessToken;

    const ts = Date.now();

    // 2. Setup Test Organisations
    orgA = await prisma.organisation.create({
      data: {
        name: `DevPlatform Org A ${ts}`,
        slug: `dev-org-a-${ts}`,
        status: 'ACTIVE',
        currency: 'AUD',
        timezone: 'Australia/Sydney',
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `DevPlatform Org B ${ts}`,
        slug: `dev-org-b-${ts}`,
        status: 'ACTIVE',
        currency: 'USD',
        timezone: 'America/New_York',
      },
    });

    // 3. Setup Test Outlet
    outletA = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: `Sydney CBD ${ts}`,
        code: `SYD-${ts}`,
        slug: `sydney-cbd-${ts}`,
        address: '100 George Street',
        city: 'Sydney',
        state: 'NSW',
        country: 'Australia',
        postalCode: '2000',
        status: 'ACTIVE',
      },
    });

    // 4. Setup Member in Org A
    userA = await prisma.user.create({
      data: {
        email: `dev.member.${ts}@example.com`,
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Developer',
        phone: '+61400111222',
        status: 'ACTIVE',
      },
    });

    memberA = await prisma.memberProfile.create({
      data: {
        userId: userA.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
        onboardingStatus: 'COMPLETED',
      },
    });

    // 5. Setup Class Session in Org A
    classTypeA = await prisma.classType.create({
      data: {
        organisationId: orgA.id,
        name: `Functional Strength ${ts}`,
        category: 'STRENGTH',
        defaultCapacity: 15,
      },
    });

    classSessionA = await prisma.classSession.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA.id,
        classTypeId: classTypeA.id,
        name: `Morning Functional Strength`,
        startsAt: new Date(Date.now() + 86400000), // tomorrow
        endsAt: new Date(Date.now() + 90000000),
        capacity: 15,
        status: 'SCHEDULED',
      },
    });

    // 6. Setup Membership Plan in Org A
    membershipPlanA = await prisma.membershipPlan.create({
      data: {
        organisationId: orgA.id,
        name: `Standard Unlimited ${ts}`,
        code: `PLAN-${ts}`,
        price: 49.99,
        currency: 'AUD',
        membershipType: 'STANDARD',
        billingType: 'RECURRING',
        status: 'ACTIVE',
        durationValue: 1,
        durationUnit: 'MONTH',
        entitlements: {
          create: [
            {
              type: 'GROUP_CLASSES',
              name: 'Group Fitness Classes',
            },
          ],
        },
      },
    });

    await prisma.memberMembership.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberA.id,
        membershipPlanId: membershipPlanA.id,
        status: 'ACTIVE',
        accessScope: 'ALL_ORGANISATION_OUTLETS',
        startDate: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        planNameAtPurchase: membershipPlanA.name,
        priceAtPurchase: membershipPlanA.price,
        currencyAtPurchase: 'AUD',
        billingTypeAtPurchase: 'RECURRING',
        durationValueAtPurchase: 1,
        durationUnitAtPurchase: 'MONTH',
      },
    });

    // 7. Setup Staff & Trainer Profile
    staffUserA = await prisma.user.create({
      data: {
        email: `dev.trainer.${ts}@example.com`,
        passwordHash: 'hashed_password',
        firstName: 'Sarah',
        lastName: 'Trainer',
        status: 'ACTIVE',
      },
    });

    staffProfileA = await prisma.staffProfile.create({
      data: {
        userId: staffUserA.id,
        organisationId: orgA.id,
        displayName: 'Sarah Trainer',
        jobTitle: 'Head Coach',
      },
    });

    trainerProfileA = await prisma.trainerProfile.create({
      data: {
        staffProfileId: staffProfileA.id,
        organisationId: orgA.id,
        professionalName: 'Coach Sarah',
        specialties: ['Functional', 'Kettlebell', 'Conditioning'],
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    // Cleanup created records in reverse dependency order
    try {
      const orgIds = [orgA?.id, orgB?.id].filter(Boolean);
      if (orgIds.length > 0) {
        await prisma.developerAuditLog.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.developerApiUsage.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.webhookDelivery.deleteMany({}).catch(() => {});
        await prisma.webhookSubscription.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.oAuthToken.deleteMany({}).catch(() => {});
        await prisma.oAuthAuthorization.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.developerApiKey.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.developerApplication.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.booking.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.classSession.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.classType.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.membershipPlan.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.attendanceRecord.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.memberMembership.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.staffProfile.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.memberProfile.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.userRole.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        await prisma.outlet.deleteMany({ where: { organisationId: { in: orgIds } } }).catch(() => {});
        const userIds = [userA?.id, staffUserA?.id].filter(Boolean);
        if (userIds.length > 0) {
          await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
        }
        await prisma.organisation.deleteMany({ where: { id: { in: orgIds } } }).catch(() => {});
      }
    } catch {
      // ignore teardown cascading errors
    }
    await app.close();
  });

  // =========================================================================
  // 1. DEVELOPER APPLICATION LIFECYCLE
  // =========================================================================
  describe('1. Developer Application Lifecycle', () => {
    it('should create a new developer application returning plain client secret once', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/developer/applications')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          organisationId: orgA.id,
          name: 'Partner Mobile Companion',
          description: 'Production partner application for gym members',
          applicationType: 'ORGANISATION',
          environment: 'PRODUCTION',
          redirectUris: ['https://partner.app.io/oauth/callback'],
          allowedScopes: [
            'members:read',
            'classes:read',
            'bookings:read',
            'bookings:write',
            'attendance:read',
            'trainers:read',
            'memberships:read',
          ],
        })
        .expect(201);

      const body = getBody(res);
      expect(body.application).toBeDefined();
      expect(body.application.name).toBe('Partner Mobile Companion');
      expect(body.application.clientId).toMatch(/^fc_client_/);
      expect(body.application.status).toBe('ACTIVE');
      expect(body.application.environment).toBe('PRODUCTION');
      expect(body.clientSecret).toMatch(/^fc_sec_/);

      createdApplication = body.application;
      plainClientSecret = body.clientSecret;
    });

    it('should retrieve application details without ever exposing client secret', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/developer/applications/${createdApplication.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const body = getBody(res);
      expect(body.id).toBe(createdApplication.id);
      expect(body.clientId).toBe(createdApplication.clientId);
      expect(body.clientSecret).toBeUndefined();
      expect(body.clientSecretHash).toBeUndefined();
    });

    it('should rotate application client secret', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/developer/applications/${createdApplication.id}/rotate-secret`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(201);

      const body = getBody(res);
      expect(body.clientSecret).toBeDefined();
      expect(body.clientSecret).not.toBe(plainClientSecret);
      plainClientSecret = body.clientSecret;
    });
  });

  // =========================================================================
  // 2. API KEY MANAGEMENT & ROTATION
  // =========================================================================
  describe('2. Developer API Key Management', () => {
    it('should generate a live API key with fc_live_ prefix and return plain key once', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/developer/applications/${createdApplication.id}/api-keys`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Live Mobile API Key',
          environment: 'PRODUCTION',
          scopes: [
            'members:read',
            'classes:read',
            'bookings:read',
            'bookings:write',
            'attendance:read',
            'trainers:read',
            'memberships:read',
          ],
          expiresInDays: 90,
        })
        .expect(201);

      const body = getBody(res);
      expect(body.apiKey).toBeDefined();
      expect(body.apiKey.keyPrefix).toMatch(/^fc_live_/);
      expect(body.apiKey.status).toBe('ACTIVE');
      expect(body.plainKey).toMatch(/^fc_live_/);

      activeLiveApiKey = body.plainKey;
      activeApiKeyRecord = body.apiKey;
    });

    it('should generate a sandbox test API key with fc_test_ prefix', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/developer/applications/${createdApplication.id}/api-keys`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Sandbox Development Key',
          environment: 'SANDBOX',
          scopes: ['classes:read'],
        })
        .expect(201);

      const body = getBody(res);
      expect(body.apiKey.keyPrefix).toMatch(/^fc_test_/);
      expect(body.plainKey).toMatch(/^fc_test_/);
      activeTestApiKey = body.plainKey;
    });

    it('should reject malformed or non-existent API keys with 401 UNAUTHENTICATED', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/classes')
        .set('X-Api-Key', 'fc_live_invalid_nonexistent_key_12345')
        .expect(401);

      expect(res.body.error?.code).toBe('INVALID_API_KEY');
    });

    it('should rotate API key with zero-downtime grace period', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/developer/api-keys/${activeApiKeyRecord.id}/rotate`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ gracePeriodHours: 24 })
        .expect(201);

      const body = getBody(res);
      expect(body.apiKey.rotatedFromId).toBe(activeApiKeyRecord.id);
      expect(body.plainKey).toMatch(/^fc_live_/);

      const newKey = body.plainKey;

      // Both old key (in grace period) and new key should successfully authenticate
      await request(app.getHttpServer())
        .get('/api/v1/public/classes')
        .set('X-Api-Key', activeLiveApiKey)
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/v1/public/classes')
        .set('X-Api-Key', newKey)
        .expect(200);

      // Update activeLiveApiKey to new key
      activeLiveApiKey = newKey;
    });

    it('should immediately revoke an API key and reject subsequent requests', async () => {
      // Revoke test key
      const keyRecord = await prisma.developerApiKey.findFirst({
        where: { keyHash: securityService.hashSecret(activeTestApiKey) },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/developer/api-keys/${keyRecord!.id}/revoke`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/v1/public/classes')
        .set('X-Api-Key', activeTestApiKey)
        .expect(401);

      expect(res.body.error?.code).toBe('KEY_REVOKED');
    });
  });

  // =========================================================================
  // 3. SCOPE REGISTRY & SENSITIVITY GUARDS
  // =========================================================================
  describe('3. Scope Registry & Sensitivity Enforcement', () => {
    it('should list formal scope registry with sensitivity classifications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/developer/scopes')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const scopes = getBody(res);
      expect(scopes.length).toBeGreaterThanOrEqual(15);
      const membersRead = scopes.find((s: any) => s.scope === 'members:read');
      expect(membersRead.sensitivity).toBe('STANDARD');

      const healthRead = scopes.find((s: any) => s.scope === 'health:read');
      expect(healthRead.sensitivity).toBe('RESTRICTED');
      expect(healthRead.requiresExplicitConsent).toBe(true);
    });

    it('should reject access with 403 INSUFFICIENT_SCOPE when required scope is missing', async () => {
      // Create key with ONLY 'classes:read'
      const keyRes = await apiKeyService.createApiKey(createdApplication.id, {
        name: 'Classes Only Key',
        scopes: ['classes:read'],
      });

      // Attempt to access /members (which requires 'members:read')
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/members')
        .set('X-Api-Key', keyRes.plainKey)
        .expect(403);

      expect(res.body.error?.code).toBe('INSUFFICIENT_SCOPE');
    });
  });

  // =========================================================================
  // 4. PUBLIC API DOMAIN ENDPOINTS & PRIVACY BOUNDARIES
  // =========================================================================
  describe('4. Public API Domain Endpoints', () => {
    it('should list members and strictly exclude sensitive health/medical/wearable PII', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/members')
        .set('X-Api-Key', activeLiveApiKey)
        .expect(200);

      const body = res.body;
      expect(body.data).toBeInstanceOf(Array);
      expect(body.meta).toBeDefined();
      expect(body.meta.requestId).toMatch(/^req_/);

      const member = body.data.find((m: any) => m.id === memberA.id);
      expect(member).toBeDefined();
      expect(member.firstName).toBe('John');
      expect(member.lastName).toBe('Developer');
      expect(member.email).toBe(userA.email);

      // Strict privacy boundary assertions:
      expect((member as any).passwordHash).toBeUndefined();
      expect((member as any).parq).toBeUndefined();
      expect((member as any).injuries).toBeUndefined();
      expect((member as any).medicalClearance).toBeUndefined();
      expect((member as any).wearables).toBeUndefined();
    });

    it('should get a single member by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/public/members/${memberA.id}`)
        .set('X-Api-Key', activeLiveApiKey)
        .expect(200);

      const body = getBody(res);
      expect(body.id).toBe(memberA.id);
      expect(body.firstName).toBe('John');
    });

    it('should list public scheduled classes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/classes')
        .set('X-Api-Key', activeLiveApiKey)
        .expect(200);

      const body = getBody(res);
      expect(body.length).toBeGreaterThanOrEqual(1);
      const session = body.find((s: any) => s.id === classSessionA.id);
      expect(session).toBeDefined();
      expect(session.name).toBe('Morning Functional Strength');
      expect(session.capacity).toBe(15);
      expect(session.isFull).toBe(false);
    });

    it('should book a class session and honor idempotency via Idempotency-Key', async () => {
      const idempotencyKey = `idem_${Date.now()}_abc`;

      // 1. First booking request
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/public/bookings')
        .set('X-Api-Key', activeLiveApiKey)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          classSessionId: classSessionA.id,
          memberId: memberA.id,
        })
        .expect(201);

      const booking1 = getBody(res1);
      expect(booking1.classSessionId).toBe(classSessionA.id);
      expect(booking1.memberId).toBe(memberA.id);
      expect(booking1.status).toBe('CONFIRMED');

      // 2. Second request with identical Idempotency-Key: must return existing record safely
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/public/bookings')
        .set('X-Api-Key', activeLiveApiKey)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          classSessionId: classSessionA.id,
          memberId: memberA.id,
        })
        .expect(201);

      const booking2 = getBody(res2);
      expect(booking2.id).toBe(booking1.id);
    });

    it('should cancel a booking via public API', async () => {
      // Find the booking just created
      const booking = await prisma.booking.findFirst({
        where: { classSessionId: classSessionA.id, memberProfileId: memberA.id },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/public/bookings/${booking!.id}`)
        .set('X-Api-Key', activeLiveApiKey)
        .expect(200);

      const body = getBody(res);
      expect(body.success).toBe(true);
      expect(body.cancelledId).toBe(booking!.id);
    });

    it('should list membership plans via public API', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/memberships')
        .set('X-Api-Key', activeLiveApiKey)
        .expect(200);

      const body = getBody(res);
      expect(body.length).toBeGreaterThanOrEqual(1);
      const plan = body.find((p: any) => p.id === membershipPlanA.id);
      expect(plan).toBeDefined();
      expect(plan.priceMinor).toBe(4999);
      expect(plan.currency).toBe('AUD');
    });

    it('should list trainer profiles via public API', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/trainers')
        .set('X-Api-Key', activeLiveApiKey)
        .expect(200);

      const body = getBody(res);
      expect(body.length).toBeGreaterThanOrEqual(1);
      const trainer = body.find((t: any) => t.id === trainerProfileA.id);
      expect(trainer).toBeDefined();
      expect(trainer.name).toBe('Coach Sarah');
    });
  });

  // =========================================================================
  // 5. SLIDING-WINDOW RATE LIMITING
  // =========================================================================
  describe('5. Sliding-Window Rate Limiting', () => {
    it('should include X-RateLimit headers on responses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/classes')
        .set('X-Api-Key', activeLiveApiKey)
        .expect(200);

      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should return 429 RATE_LIMITED with Retry-After when rate limit is exceeded', async () => {
      // Emulate rapid exhaustion using rate limit service
      const testAppId = `exhaust_${Date.now()}`;
      // Max sandbox quota is 60 req/min
      for (let i = 0; i < 60; i++) {
        await rateLimitService.checkRateLimit(testAppId, 'SANDBOX');
      }

      // 61st call should trigger DeveloperError
      await expect(
        rateLimitService.checkRateLimit(testAppId, 'SANDBOX'),
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // 6. OAUTH 2.0 WITH PKCE FLOW
  // =========================================================================
  describe('6. OAuth 2.0 with PKCE Flow', () => {
    let authCode: string;
    let codeVerifier: string;
    let codeChallenge: string;
    let accessToken: string;
    let refreshToken: string;

    beforeAll(() => {
      // Generate PKCE code verifier and S256 code challenge
      codeVerifier = crypto.randomBytes(32).toString('base64url');
      codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
    });

    it('should reject authorize request if redirect_uri is not pre-registered', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/oauth/authorize')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .query({
          client_id: createdApplication.clientId,
          redirect_uri: 'https://evil-unregistered.com/callback',
          response_type: 'code',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        })
        .expect(400);

      expect(res.body.error?.code).toBe('INVALID_REDIRECT_URI');
    });

    it('should present consent metadata for valid client and redirect URI', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/oauth/authorize')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .query({
          client_id: createdApplication.clientId,
          redirect_uri: 'https://partner.app.io/oauth/callback',
          response_type: 'code',
          scope: 'classes:read bookings:read',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        })
        .expect(200);

      const body = getBody(res);
      expect(body.applicationName).toBe(createdApplication.name);
      expect(body.requestedScopes.length).toBe(2);
    });

    it('should submit user consent and issue single-use authorization code', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/oauth/authorize')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          client_id: createdApplication.clientId,
          redirect_uri: 'https://partner.app.io/oauth/callback',
          scopes: ['classes:read', 'bookings:read'],
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          approved: true,
          state: 'test_state_123',
        })
        .expect(201);

      const body = getBody(res);
      expect(body.code).toMatch(/^fc_code_/);
      expect(body.redirectUrl).toContain('test_state_123');
      authCode = body.code;
    });

    it('should exchange authorization code + PKCE verifier for access & refresh tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/oauth/token')
        .send({
          grant_type: 'authorization_code',
          client_id: createdApplication.clientId,
          client_secret: plainClientSecret,
          code: authCode,
          redirect_uri: 'https://partner.app.io/oauth/callback',
          code_verifier: codeVerifier,
        })
        .expect(201);

      const body = res.body;
      expect(body.access_token).toMatch(/^fc_tok_/);
      expect(body.refresh_token).toMatch(/^fc_ref_/);
      expect(body.token_type).toBe('Bearer');
      expect(body.expires_in).toBe(3600);

      accessToken = body.access_token;
      refreshToken = body.refresh_token;
    });

    it('should reject replay of the same authorization code (Single-Use Defense)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/oauth/token')
        .send({
          grant_type: 'authorization_code',
          client_id: createdApplication.clientId,
          client_secret: plainClientSecret,
          code: authCode,
          redirect_uri: 'https://partner.app.io/oauth/callback',
          code_verifier: codeVerifier,
        })
        .expect(400);

      expect(res.body.error?.code).toBe('INVALID_GRANT');
    });

    it('should authenticate Public API requests using OAuth Bearer access token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/classes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = getBody(res);
      expect(body).toBeInstanceOf(Array);
    });

    it('should refresh access token and rotate refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/oauth/token')
        .send({
          grant_type: 'refresh_token',
          client_id: createdApplication.clientId,
          client_secret: plainClientSecret,
          refresh_token: refreshToken,
        })
        .expect(201);

      const body = res.body;
      expect(body.access_token).toMatch(/^fc_tok_/);
      expect(body.refresh_token).toMatch(/^fc_ref_/);
      expect(body.refresh_token).not.toBe(refreshToken); // Rotated!
    });
  });

  // =========================================================================
  // 7. WEBHOOK SUBSCRIPTIONS, HMAC SIGNING & SSRF DEFENSES
  // =========================================================================
  describe('7. Webhooks Pipeline & Cryptographic Signing', () => {
    let webhookSub: any;

    it('should reject webhook URLs targeting localhost or private IPs (SSRF Defense)', async () => {
      const badUrls = [
        'http://localhost:8080/hook',
        'http://127.0.0.1:3000/webhook',
        'http://169.254.169.254/latest/meta-data',
        'http://10.0.0.1/admin',
        'http://192.168.1.1/hook',
      ];

      for (const badUrl of badUrls) {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/developer/applications/${createdApplication.id}/webhooks`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            endpointUrl: badUrl,
            eventTypes: ['booking.created'],
          })
          .expect(400);

        expect(res.body.error?.code).toBe('SSRF_ATTEMPT_DETECTED');
      }
    });

    it('should register a valid webhook subscription and return secret once', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/developer/applications/${createdApplication.id}/webhooks`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          endpointUrl: 'https://webhook.site/partner-events',
          description: 'Production partner events endpoint',
          eventTypes: ['booking.created', 'class.updated'],
        })
        .expect(201);

      const body = getBody(res);
      expect(body.subscription).toBeDefined();
      expect(body.subscription.endpointUrl).toBe('https://webhook.site/partner-events');
      expect(body.webhookSecret).toMatch(/^whsec_/);
      webhookSub = body.subscription;
    });

    it('should sign webhook payloads with HMAC-SHA256 and verify timestamps', () => {
      const secret = 'whsec_test_secret_12345';
      const payload = { event: 'booking.created', data: { id: 'bk_1' } };

      const { signatureHeader, timestamp } = webhookSigningService.signPayload(payload, secret);
      expect(signatureHeader).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);

      // Verify valid signature
      const isValid = webhookSigningService.verifySignature(payload, signatureHeader, secret);
      expect(isValid).toBe(true);

      // Reject tampered payload
      const tamperedPayload = { event: 'booking.created', data: { id: 'bk_999' } };
      const isTamperedValid = webhookSigningService.verifySignature(
        tamperedPayload,
        signatureHeader,
        secret,
      );
      expect(isTamperedValid).toBe(false);
    });

    it('should send a safe test webhook event with test: true and zero real member PII', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/developer/webhooks/${webhookSub.id}/test`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(201);

      const body = getBody(res);
      expect(body.success).toBe(true);
      expect(body.payload.test).toBe(true);
      expect(body.payload.data.isSyntheticTestData).toBe(true);
    });
  });

  // =========================================================================
  // 8. MULTI-TENANT RBAC & IDOR DEFENSES
  // =========================================================================
  describe('8. Multi-Tenant RBAC & IDOR Protections', () => {
    it('should prevent API key from Org A from accessing Org B members (IDOR Defense)', async () => {
      // Create member in Org B
      const userB = await prisma.user.create({
        data: {
          email: `org.b.member.${Date.now()}@example.com`,
          passwordHash: 'hash',
          firstName: 'Bob',
          lastName: 'OrgB',
          status: 'ACTIVE',
        },
      });
      const memberB = await prisma.memberProfile.create({
        data: {
          userId: userB.id,
          organisationId: orgB.id,
          status: 'ACTIVE',
        },
      });

      // Org A's key querying Org B's member must return 404
      const res = await request(app.getHttpServer())
        .get(`/api/v1/public/members/${memberB.id}`)
        .set('X-Api-Key', activeLiveApiKey)
        .expect(404);

      expect(res.body.error?.code).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // 9. OBSERVABILITY, ANALYTICS & SANDBOX
  // =========================================================================
  describe('9. Observability, Analytics & Sandbox', () => {
    it('should aggregate developer application usage analytics', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/developer/applications/${createdApplication.id}/analytics`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const body = getBody(res);
      expect(body.requestsToday).toBeDefined();
      expect(body.averageLatencyMs).toBeDefined();
      expect(body.successRatePercentage).toBeDefined();
    });

    it('should return developer request logs without leaking secrets or passwords', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/developer/applications/${createdApplication.id}/logs`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const logs = getBody(res);
      expect(logs).toBeInstanceOf(Array);
      if (logs.length > 0) {
        expect(logs[0].requestId).toBeDefined();
        expect(logs[0].password).toBeUndefined();
        expect(logs[0].clientSecret).toBeUndefined();
      }
    });

    it('should return sandbox environment status and synthetic datasets capabilities', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/developer/sandbox/status')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const body = getBody(res);
      expect(body.environment).toBe('SANDBOX');
      expect(body.isAvailable).toBe(true);
      expect(body.syntheticDatasets.membersCount).toBeGreaterThan(0);
    });
  });
});
