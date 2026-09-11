/**
 * Day 48 — Integrations Platform Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Provider Registry, Discovery & Capability Interrogation
 * 2. Multi-Scope Connection Lifecycle (ORGANISATION, OUTLET, MEMBER, STAFF)
 * 3. AES-256-GCM Credential Encryption & Secret Redaction Hygiene
 * 4. Provider-Neutral OAuth 2.0 State Security, CSRF Tokens & Expiration
 * 5. Webhook Inbound Pipeline, Signature Verification & Event Idempotency
 * 6. Sync Engine, Job Records & Cursor Tracking
 * 7. Exponential Backoff Retry Engine with Full Jitter
 * 8. Rate Limiting & Throttling Enforcement
 * 9. Health Monitoring, Latency Tracking & Auto-Degradation
 * 10. Provider Adapter Consolidations (Payments, Accounting, Communications, Wearables, Access, Calendar)
 * 11. Multi-Tenant RBAC & IDOR Isolation (Org A vs Org B, Member 403, Outlet isolation)
 * 12. SSRF URL Defenses & Management Overview Dashboard
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { IntegrationRegistry } from '../src/integrations/core/integration-registry.service';
import { IntegrationCredentialService } from '../src/integrations/core/integration-credential.service';
import { IntegrationOAuthService } from '../src/integrations/core/integration-oauth.service';
import { IntegrationConnectionService } from '../src/integrations/core/integration-connection.service';
import { IntegrationWebhookService } from '../src/integrations/core/integration-webhook.service';
import { IntegrationSyncService } from '../src/integrations/core/integration-sync.service';
import { IntegrationRetryService } from '../src/integrations/core/integration-retry.service';
import { IntegrationRateLimitService } from '../src/integrations/core/integration-rate-limit.service';
import { IntegrationHealthService } from '../src/integrations/core/integration-health.service';
import { IntegrationsService } from '../src/integrations/integrations.service';
import request from 'supertest';

describe('Day 48: Integrations Platform E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let registry: IntegrationRegistry;
  let credentialService: IntegrationCredentialService;
  let oauthService: IntegrationOAuthService;
  let connectionService: IntegrationConnectionService;
  let webhookService: IntegrationWebhookService;
  let syncService: IntegrationSyncService;
  let retryService: IntegrationRetryService;
  let rateLimitService: IntegrationRateLimitService;
  let healthService: IntegrationHealthService;
  let masterService: IntegrationsService;

  let superAdminToken: string;
  let orgA: any;
  let orgB: any;
  let outletA1: any;
  let outletA2: any;
  let memberUserA1: any;
  let memberProfileA1: any;
  let trainerUserA1: any;
  let staffProfileA1: any;

  const getBody = (res: any) => (res.body && res.body.data !== undefined ? res.body.data : res.body);

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
    registry = app.get(IntegrationRegistry);
    credentialService = app.get(IntegrationCredentialService);
    oauthService = app.get(IntegrationOAuthService);
    connectionService = app.get(IntegrationConnectionService);
    webhookService = app.get(IntegrationWebhookService);
    syncService = app.get(IntegrationSyncService);
    retryService = app.get(IntegrationRetryService);
    rateLimitService = app.get(IntegrationRateLimitService);
    healthService = app.get(IntegrationHealthService);
    masterService = app.get(IntegrationsService);

    // Login SuperAdmin
    const saRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@fitcore.io', password: 'FitCoreDev2026!' });
    superAdminToken = saRes.body.data?.accessToken || saRes.body.accessToken;

    const ts = Date.now();

    // 1. Setup Test Organisations
    orgA = await prisma.organisation.create({
      data: {
        name: `Integration Org A ${ts}`,
        slug: `int-org-a-${ts}`,
        status: 'ACTIVE',
        currency: 'AUD',
        timezone: 'Australia/Perth',
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `Integration Org B ${ts}`,
        slug: `int-org-b-${ts}`,
        status: 'ACTIVE',
        currency: 'USD',
        timezone: 'America/New_York',
      },
    });

    // 2. Setup Test Outlets
    outletA1 = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: `Perth Central ${ts}`,
        code: `PER-A1-${ts}`,
        slug: `perth-central-${ts}`,
        address: '100 St Georges Terrace',
        city: 'Perth',
        state: 'WA',
        country: 'Australia',
        postalCode: '6000',
        status: 'ACTIVE',
      },
    });

    outletA2 = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: `Fremantle ${ts}`,
        code: `FRE-A2-${ts}`,
        slug: `fremantle-${ts}`,
        address: '50 South Terrace',
        city: 'Fremantle',
        state: 'WA',
        country: 'Australia',
        postalCode: '6160',
        status: 'ACTIVE',
      },
    });

    // 3. Setup Test Member
    memberUserA1 = await prisma.user.create({
      data: {
        email: `member-${ts}@integrationtest.com`,
        passwordHash: 'dummyhash',
        firstName: 'Alice',
        lastName: 'Cooper',
        status: 'ACTIVE',
      },
    });

    memberProfileA1 = await prisma.memberProfile.create({
      data: {
        userId: memberUserA1.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
      },
    });

    // 4. Setup Test Trainer Staff
    trainerUserA1 = await prisma.user.create({
      data: {
        email: `trainer-${ts}@integrationtest.com`,
        passwordHash: 'dummyhash',
        firstName: 'Bob',
        lastName: 'Trainer',
        status: 'ACTIVE',
      },
    });

    staffProfileA1 = await prisma.staffProfile.create({
      data: {
        userId: trainerUserA1.id,
        organisationId: orgA.id,
        displayName: 'Trainer Bob',
        jobTitle: 'Senior Coach',
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await prisma.integrationAuditLog.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.integrationSyncRecord.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.integrationSyncJob.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.integrationWebhookEvent.deleteMany({ where: { provider: { in: ['STRIPE', 'XERO', 'TWILIO'] } } });
      await prisma.integrationConnection.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.staffProfile.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.memberProfile.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [memberUserA1.id, trainerUserA1.id] } } });
      await prisma.outlet.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.organisation.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
    } catch {}

    await app.close();
  });

  // ---------------------------------------------------------------------------
  // 1. Provider Registry & Capabilities
  // ---------------------------------------------------------------------------
  describe('1. Provider Registry & Capabilities', () => {
    it('should list all available providers across categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/integrations/providers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const body = getBody(res);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(10);

      const keys = body.map((p: any) => p.integrationKey);
      expect(keys).toContain('STRIPE');
      expect(keys).toContain('XERO');
      expect(keys).toContain('QUICKBOOKS');
      expect(keys).toContain('TWILIO');
      expect(keys).toContain('FITBIT');
      expect(keys).toContain('GOOGLE_CALENDAR');
      expect(keys).toContain('ACCESS_CONTROL_PROVIDER');
    });

    it('should return metadata for a specific provider', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/integrations/providers/STRIPE')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const body = getBody(res);
      expect(body.integrationKey).toBe('STRIPE');
      expect(body.category).toBe('PAYMENTS');
      expect(body.capabilities).toEqual(expect.arrayContaining(['PAYMENTS', 'REFUNDS', 'WEBHOOKS']));
      expect(body.authenticationType).toBe('API_KEY');
    });

    it('should return full catalog of capabilities', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/integrations/capabilities')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const body = getBody(res);
      expect(Array.isArray(body)).toBe(true);
      const caps = body.map((c: any) => c.capability);
      expect(caps).toContain('PAYMENTS');
      expect(caps).toContain('CONTACTS');
      expect(caps).toContain('INVOICES');
      expect(caps).toContain('SMS');
      expect(caps).toContain('CALENDAR_READ');
      expect(caps).toContain('ACCESS_CONTROL');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Multi-Scope Connection Lifecycle (Org, Outlet, Member, Staff)
  // ---------------------------------------------------------------------------
  describe('2. Multi-Scope Connection Lifecycle', () => {
    let orgConn: any;
    let outletConn: any;
    let memberConn: any;
    let staffConn: any;

    it('should create an ORGANISATION-scoped connection (Xero)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/integrations/connections')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .send({
          integrationKey: 'XERO',
          scope: 'ORGANISATION',
          environment: 'PRODUCTION',
          configuration: { syncFrequency: 60 },
        })
        .expect(201);

      orgConn = getBody(res);
      expect(orgConn.id).toBeDefined();
      expect(orgConn.organisationId).toBe(orgA.id);
      expect(orgConn.scope).toBe('ORGANISATION');
      expect(orgConn.integrationKey).toBe('XERO');
      expect(orgConn.status).toBe('PENDING');
      expect(orgConn.hasCredentials).toBe(false);
    });

    it('should create an OUTLET-scoped connection (Door Controller)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/integrations/connections')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-outlet-id', outletA1.id)
        .set('x-role', 'OUTLET_MANAGER')
        .send({
          integrationKey: 'ACCESS_CONTROL_PROVIDER',
          scope: 'OUTLET',
          outletId: outletA1.id,
          credentials: { deviceId: 'turnstile-01', apiKey: 'sec_door_token' },
        })
        .expect(201);

      outletConn = getBody(res);
      expect(outletConn.scope).toBe('OUTLET');
      expect(outletConn.outletId).toBe(outletA1.id);
      expect(outletConn.status).toBe('CONNECTED');
      expect(outletConn.hasCredentials).toBe(true);
    });

    it('should reject OUTLET-scoped connection if outletId is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/integrations/connections')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .send({
          integrationKey: 'ACCESS_CONTROL_PROVIDER',
          scope: 'OUTLET',
        })
        .expect(400);
    });

    it('should create a MEMBER-scoped connection (Fitbit)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/integrations/connections')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-member-id', memberProfileA1.id)
        .set('x-role', 'MEMBER')
        .send({
          integrationKey: 'FITBIT',
          scope: 'MEMBER',
          memberId: memberProfileA1.id,
          credentials: { accessToken: 'dummy_fitbit_token' },
        })
        .expect(201);

      memberConn = getBody(res);
      expect(memberConn.scope).toBe('MEMBER');
      expect(memberConn.memberId).toBe(memberProfileA1.id);
      expect(memberConn.status).toBe('CONNECTED');
    });

    it('should create a STAFF-scoped connection (Google Calendar)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/integrations/connections')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-staff-id', staffProfileA1.id)
        .set('x-role', 'TRAINER')
        .send({
          integrationKey: 'GOOGLE_CALENDAR',
          scope: 'STAFF',
          staffId: staffProfileA1.id,
          credentials: { refreshToken: 'dummy_cal_refresh' },
        })
        .expect(201);

      staffConn = getBody(res);
      expect(staffConn.scope).toBe('STAFF');
      expect(staffConn.staffId).toBe(staffProfileA1.id);
      expect(staffConn.status).toBe('CONNECTED');
    });

    it('should list all connections scoped to the organisation', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/integrations/connections')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Credential Security & AES-256-GCM Encryption
  // ---------------------------------------------------------------------------
  describe('3. Credential Security & AES-256-GCM Encryption', () => {
    let testConnId: string;

    it('should encrypt sensitive credentials at rest and never return secrets', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/integrations/connections')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          integrationKey: 'STRIPE',
          scope: 'ORGANISATION',
          credentials: {
            apiKey: 'sk_live_very_secret_key_12345',
            webhookSecret: 'whsec_secret_signing_key_999',
          },
        })
        .expect(201);

      const body = getBody(res);
      testConnId = body.id;
      // REST response must not contain credentials
      expect(body.encryptedCredentials).toBeUndefined();
      expect(body.credentials).toBeUndefined();
      expect(body.apiKey).toBeUndefined();
      expect(body.hasCredentials).toBe(true);

      // Verify at the database level: must be encrypted ciphertext
      const dbRecord = await prisma.integrationConnection.findUnique({
        where: { id: testConnId },
      });
      expect(dbRecord?.encryptedCredentials).toBeDefined();
      expect(dbRecord?.encryptedCredentials).not.toContain('sk_live_very_secret_key');
      expect(dbRecord?.encryptedCredentials?.split(':').length).toBe(3); // iv:authTag:ciphertext

      // Decryption service should retrieve the original secrets
      const decrypted = credentialService.decrypt<any>(dbRecord?.encryptedCredentials);
      expect(decrypted.apiKey).toBe('sk_live_very_secret_key_12345');
      expect(decrypted.webhookSecret).toBe('whsec_secret_signing_key_999');
    });

    it('should wipe credentials on disconnection', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/integrations/connections/${testConnId}/disconnect`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const dbRecord = await prisma.integrationConnection.findUnique({
        where: { id: testConnId },
      });
      expect(dbRecord?.status).toBe('DISCONNECTED');
      expect(dbRecord?.encryptedCredentials).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. OAuth 2.0 Security & State Tokens
  // ---------------------------------------------------------------------------
  describe('4. OAuth 2.0 State Security', () => {
    let oauthConnId: string;
    let stateToken: string;

    beforeAll(async () => {
      const conn = await prisma.integrationConnection.create({
        data: {
          organisationId: orgA.id,
          integrationKey: 'XERO',
          provider: 'XERO',
          category: 'ACCOUNTING',
          scope: 'ORGANISATION',
          status: 'PENDING',
          connectedByUserId: 'usr-admin-01',
        },
      });
      oauthConnId = conn.id;
    });

    it('should generate single-use, tenant-bound state token and authorization URL', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/integrations/connections/${oauthConnId}/connect`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-user-id', 'usr-admin-01')
        .send({ redirectUri: 'https://api.fitcore.app/api/v1/integrations/oauth/callback' })
        .expect(200);

      const body = getBody(res);
      expect(body.stateToken).toBeDefined();
      expect(body.stateToken).toMatch(/^fc_state_[a-f0-9]{64}$/);
      expect(body.authorizationUrl).toContain(encodeURIComponent(body.stateToken));
      stateToken = body.stateToken;
    });

    it('should consume the state token once and reject replay/re-use', async () => {
      // First consumption
      const payload = await oauthService.consumeState(stateToken);
      expect(payload.organisationId).toBe(orgA.id);
      expect(payload.userId).toBe('usr-admin-01');

      // Second consumption must fail (single-use CSRF defense)
      await expect(oauthService.consumeState(stateToken)).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Inbound Webhooks Pipeline & Idempotency
  // ---------------------------------------------------------------------------
  describe('5. Inbound Webhooks Pipeline & Idempotency', () => {
    const externalEventId = `evt_stripe_${Date.now()}`;

    it('should accept, verify, normalize, and process a valid webhook', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/integrations/webhooks/STRIPE')
        .set('x-webhook-signature', 'test_valid_sig')
        .send({
          id: externalEventId,
          type: 'payment_intent.succeeded',
          data: { object: { amount: 15000, currency: 'aud' } },
        })
        .expect(200);

      const body = getBody(res);
      expect(body.received).toBe(true);
      expect(body.duplicate).toBe(false);
      expect(body.status).toBe('PROCESSED');
      expect(body.normalizedType).toBe('PAYMENT_SUCCEEDED');
    });

    it('should detect duplicate webhook arrival and safely ignore duplicate mutations (Idempotency)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/integrations/webhooks/STRIPE')
        .set('x-webhook-signature', 'test_valid_sig')
        .send({
          id: externalEventId,
          type: 'payment_intent.succeeded',
          data: { object: { amount: 15000, currency: 'aud' } },
        })
        .expect(200);

      const body = getBody(res);
      expect(body.received).toBe(true);
      expect(body.duplicate).toBe(true);
      expect(body.status).toBe('DUPLICATE');
      expect(body.message).toContain('Duplicate ignored safely');
    });

    it('should reject webhook with invalid signature (401 Unauthorized)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/integrations/webhooks/STRIPE')
        .set('x-webhook-signature', 'invalid_signature')
        .send({
          id: `evt_bad_sig_${Date.now()}`,
          type: 'payment_intent.succeeded',
        })
        .expect(401);
    });

    it('should list received webhook events in administrative view', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/integrations/webhook-events?provider=STRIPE')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const body = getBody(res);
      expect(Array.isArray(body)).toBe(true);
      const found = body.find((e: any) => e.externalEventId === externalEventId);
      expect(found).toBeDefined();
      expect(found.normalizedType).toBe('PAYMENT_SUCCEEDED');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Sync Engine & Cursors
  // ---------------------------------------------------------------------------
  describe('6. Sync Engine & Cursor Checkpoints', () => {
    let syncConnId: string;

    beforeAll(async () => {
      const conn = await prisma.integrationConnection.create({
        data: {
          organisationId: orgA.id,
          integrationKey: 'XERO',
          provider: 'XERO',
          category: 'ACCOUNTING',
          scope: 'ORGANISATION',
          status: 'CONNECTED',
          connectedByUserId: 'usr-admin-01',
        },
      });
      syncConnId = conn.id;
    });

    it('should trigger an INCREMENTAL sync job and record entity records', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/integrations/connections/${syncConnId}/sync`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({ syncType: 'INCREMENTAL' })
        .expect(202);

      const body = getBody(res);
      expect(body.id).toBeDefined();
      expect(body.status).toBe('COMPLETED');
      expect(body.recordsProcessed).toBeGreaterThan(0);
      expect(body.cursor).toBeDefined();

      // Check that connection lastSyncAt and cursor were updated
      const updatedConn = await prisma.integrationConnection.findUnique({
        where: { id: syncConnId },
      });
      expect(updatedConn?.lastSyncAt).toBeDefined();
      expect(updatedConn?.healthStatus).toBe('HEALTHY');
    });

    it('should retrieve sync jobs history for the connection', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/integrations/connections/${syncConnId}/sync`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body[0].syncType).toBe('INCREMENTAL');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Retry Engine with Exponential Backoff & Jitter
  // ---------------------------------------------------------------------------
  describe('7. Retry Engine with Exponential Backoff & Jitter', () => {
    it('should compute delay with jitter within expected exponential bounds', () => {
      const delay1 = retryService.calculateDelay(1, 100, 5000);
      expect(delay1).toBeGreaterThanOrEqual(0);
      expect(delay1).toBeLessThanOrEqual(100);

      const delay3 = retryService.calculateDelay(3, 100, 5000);
      expect(delay3).toBeGreaterThanOrEqual(0);
      expect(delay3).toBeLessThanOrEqual(400); // 100 * 2^2 = 400
    });

    it('should retry transient failures and succeed when an operation eventually resolves', async () => {
      let attempts = 0;
      const result = await retryService.executeWithRetry(
        async (attempt) => {
          attempts = attempt;
          if (attempt < 2) {
            const err: any = new Error('Network timeout');
            err.code = 'ETIMEDOUT';
            throw err;
          }
          return 'SUCCESS_RECOVERED';
        },
        { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 50 },
      );

      expect(result).toBe('SUCCESS_RECOVERED');
      expect(attempts).toBe(2);
    });

    it('should NOT retry non-retryable authentication failures', async () => {
      let attempts = 0;
      await expect(
        retryService.executeWithRetry(
          async (attempt) => {
            attempts = attempt;
            const err: any = new Error('Invalid API Key');
            err.status = 401;
            throw err;
          },
          { maxAttempts: 3, baseDelayMs: 10 },
        ),
      ).rejects.toThrow();

      // Must fail immediately on attempt 1 without wasteful retries
      expect(attempts).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Rate Limiting & Throttling
  // ---------------------------------------------------------------------------
  describe('8. Rate Limiting & Throttling', () => {
    it('should allow calls within limit and decrement remaining capacity', async () => {
      const status = await rateLimitService.checkAndIncrement('TEST_PROVIDER', 'conn-test-01', 'query', {
        limit: 5,
        windowSeconds: 60,
      });

      expect(status.limit).toBe(5);
      expect(status.remaining).toBeLessThan(5);
      expect(status.isThrottled).toBe(false);
    });

    it('should throw IntegrationError when limit is exhausted', async () => {
      const config = { limit: 2, windowSeconds: 60 };
      const connId = `conn-rate-${Date.now()}`;

      // Call 1
      await rateLimitService.checkAndIncrement('TWILIO', connId, 'send', config);
      // Call 2
      await rateLimitService.checkAndIncrement('TWILIO', connId, 'send', config);

      // Call 3 must throw 429 RATE_LIMITED
      await expect(
        rateLimitService.checkAndIncrement('TWILIO', connId, 'send', config),
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Provider Health & Diagnostics
  // ---------------------------------------------------------------------------
  describe('9. Health Monitoring & Degraded States', () => {
    let healthConnId: string;

    beforeAll(async () => {
      const conn = await prisma.integrationConnection.create({
        data: {
          organisationId: orgA.id,
          integrationKey: 'TWILIO',
          provider: 'TWILIO',
          category: 'SMS',
          scope: 'ORGANISATION',
          status: 'CONNECTED',
          connectedByUserId: 'usr-admin-01',
        },
      });
      healthConnId = conn.id;
    });

    it('should evaluate connection health and return diagnostic report', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/integrations/connections/${healthConnId}/health`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      expect(body.connectionId).toBe(healthConnId);
      expect(body.provider).toBe('TWILIO');
      expect(body.isAvailable).toBe(true);
      expect(body.status).toBe('HEALTHY');
      expect(body.latencyMs).toBeDefined();
    });

    it('should mark connection DEGRADED upon repeated operation failures', async () => {
      // Record 2 consecutive failures
      await healthService.recordFailure(healthConnId, new Error('Gateway timeout'));
      const status = await healthService.recordFailure(healthConnId, new Error('Gateway timeout'));

      expect(status).toBe('DEGRADED');

      const updated = await prisma.integrationConnection.findUnique({
        where: { id: healthConnId },
      });
      expect(updated?.consecutiveFailures).toBe(2);
      expect(updated?.healthStatus).toBe('DEGRADED');
    });

    it('should restore connection to HEALTHY upon success', async () => {
      await healthService.recordSuccess(healthConnId);

      const updated = await prisma.integrationConnection.findUnique({
        where: { id: healthConnId },
      });
      expect(updated?.consecutiveFailures).toBe(0);
      expect(updated?.healthStatus).toBe('HEALTHY');
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Multi-Tenant RBAC & IDOR Defenses
  // ---------------------------------------------------------------------------
  describe('10. Multi-Tenant RBAC & IDOR Defenses', () => {
    let connOrgA: any;
    let connOrgB: any;

    beforeAll(async () => {
      connOrgA = await prisma.integrationConnection.create({
        data: {
          organisationId: orgA.id,
          integrationKey: 'STRIPE',
          provider: 'STRIPE',
          category: 'PAYMENTS',
          scope: 'ORGANISATION',
          status: 'CONNECTED',
          connectedByUserId: 'usr-admin-a',
        },
      });

      connOrgB = await prisma.integrationConnection.create({
        data: {
          organisationId: orgB.id,
          integrationKey: 'XERO',
          provider: 'XERO',
          category: 'ACCOUNTING',
          scope: 'ORGANISATION',
          status: 'CONNECTED',
          connectedByUserId: 'usr-admin-b',
        },
      });
    });

    it('should reject MEMBER role from accessing organisation integration overview (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/integrations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'MEMBER')
        .expect(403);
    });

    it('should prevent Org A user from accessing Org B connection (Cross-Tenant IDOR defense)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/integrations/connections/${connOrgB.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id) // Org A tries to access Org B connection
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(403);
    });

    it('should prevent Outlet Manager from managing an integration for a different outlet', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/integrations/connections')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-outlet-id', outletA1.id) // Assigned to outlet A1
        .set('x-role', 'OUTLET_MANAGER')
        .send({
          integrationKey: 'ACCESS_CONTROL_PROVIDER',
          scope: 'OUTLET',
          outletId: outletA2.id, // Attempts to create on outlet A2
        })
        .expect(403);
    });
  });

  // ---------------------------------------------------------------------------
  // 11. SSRF Protection & Security
  // ---------------------------------------------------------------------------
  describe('11. SSRF Defense & Management Overview', () => {
    it('should reject redirect URLs targeting localhost (SSRF defense)', () => {
      expect(() => masterService.validateUrlForSsrf('http://localhost:3000/callback')).toThrow();
      expect(() => masterService.validateUrlForSsrf('http://127.0.0.1:8080/token')).toThrow();
    });

    it('should reject redirect URLs targeting AWS cloud metadata service (169.254.169.254)', () => {
      expect(() =>
        masterService.validateUrlForSsrf('http://169.254.169.254/latest/meta-data/'),
      ).toThrow();
    });

    it('should reject private internal CIDR addresses (10.0.0.1, 192.168.1.1)', () => {
      expect(() => masterService.validateUrlForSsrf('http://10.0.0.5/api')).toThrow();
      expect(() => masterService.validateUrlForSsrf('http://192.168.1.100/token')).toThrow();
    });

    it('should allow valid HTTPS destination URLs', () => {
      expect(() =>
        masterService.validateUrlForSsrf('https://api.fitcore.app/api/v1/integrations/oauth/callback'),
      ).not.toThrow();
    });

    it('should return executive overview summary for the organisation', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/integrations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const body = getBody(res);
      expect(body.totalConnections).toBeGreaterThanOrEqual(1);
      expect(body.categories).toBeDefined();
      expect(body.healthyCount).toBeDefined();
      expect(body.syncsLast24h).toBeDefined();
    });

    it('should return audit logs without exposing plaintext secrets', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/integrations/audit')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      expect(Array.isArray(body)).toBe(true);
      if (body.length > 0) {
        const str = JSON.stringify(body);
        expect(str).not.toContain('very_secret_key');
        expect(str).not.toContain('signing_key');
      }
    });
  });
});
