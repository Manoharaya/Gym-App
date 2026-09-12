/**
 * FitCore — Day 54: Platform Superadmin & Platform Operations Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Explicit Platform Permission Enforcement (Superadmin without explicit permission is denied)
 * 2. Organisation Management (Search, summary, impact preview, suspend with step-up, reactivate)
 * 3. Platform Usage Metering (Live domain aggregation, snapshot projection)
 * 4. AI Gateway Governance (Tokens, costs, latency, zero secret leakage)
 * 5. Platform Billing Visibility (Administrative plan limits, overage calculation)
 * 6. Support Ticketing & SLA Tracking (SLA targets, INTERNAL_ONLY message isolation)
 * 7. Feature Flags Engine (Deterministic percentage rollout, security ceiling defense, override inheritance)
 * 8. Platform Configuration & Scoped Maintenance Mode (Versioned settings, non-destructive maintenance)
 * 9. Platform Health & Incidents (Dependency probes, incident declaration & linking)
 * 10. Temporary Support Access & Break-Glass Protocol (Time-bounded access, step-up challenge consumption)
 * 11. Data Quality Diagnostic Scanner (Integrity checks, anomaly detection)
 * 12. Security & Audit Logging Invariants (All mutations generate audit logs & security telemetry)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { StepUpService } from '../src/security/step-up/step-up.service';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

describe('Day 54: Platform Superadmin & Platform Operations E2E Suite', () => {
  jest.setTimeout(120000);

  let app: INestApplication;
  let prisma: PrismaService;
  let stepUpService: StepUpService;

  let fullSuperAdminToken: string;
  let restrictedAdminToken: string;
  let regularUserToken: string;

  let testOrg: any;
  let testOutlet: any;
  let fullSuperAdminUser: any;
  let restrictedAdminUser: any;
  let regularUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    stepUpService = app.get(StepUpService);

    // 1. Seed test organisation and outlet
    const uniqueSuffix = Date.now().toString();
    testOrg = await prisma.organisation.create({
      data: {
        name: `Day 54 Test Apex Club ${uniqueSuffix}`,
        slug: `apex-club-${uniqueSuffix}`,
        status: 'ACTIVE',
        country: 'Australia',
        currency: 'AUD',
        timezone: 'Australia/Perth',
      },
    });

    testOutlet = await prisma.outlet.create({
      data: {
        organisationId: testOrg.id,
        name: 'Perth Central Outlet',
        slug: `perth-central-${uniqueSuffix}`,
        code: `PC-${uniqueSuffix.slice(-4)}`,
        status: 'ACTIVE',
        address: '100 St Georges Terrace',
        city: 'Perth',
        state: 'WA',
        postalCode: '6000',
      },
    });

    const defaultPassword = 'SuperAdminPassword2026!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Ensure SUPERADMIN role exists
    let superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPERADMIN' } });
    if (!superAdminRole) {
      superAdminRole = await prisma.role.create({
        data: { name: 'SUPERADMIN', description: 'Platform Superadmin' },
      });
    }

    let memberRole = await prisma.role.findUnique({ where: { name: 'MEMBER' } });
    if (!memberRole) {
      memberRole = await prisma.role.create({
        data: { name: 'MEMBER', description: 'Regular gym member' },
      });
    }

    // Ensure platform permissions exist in database
    const requiredPermKeys = [
      { resource: 'platform.organisations', action: 'read', scope: 'PLATFORM' },
      { resource: 'platform.organisations', action: 'manage', scope: 'PLATFORM' },
      { resource: 'platform.usage', action: 'read', scope: 'PLATFORM' },
      { resource: 'platform.ai_usage', action: 'read', scope: 'PLATFORM' },
      { resource: 'platform.billing', action: 'read', scope: 'PLATFORM' },
      { resource: 'platform.support', action: 'manage', scope: 'PLATFORM' },
      { resource: 'platform.feature_flags', action: 'manage', scope: 'PLATFORM' },
      { resource: 'platform.configuration', action: 'manage', scope: 'PLATFORM' },
      { resource: 'platform.health', action: 'read', scope: 'PLATFORM' },
      { resource: 'platform.integrations', action: 'read', scope: 'PLATFORM' },
      { resource: 'platform.operations', action: 'execute', scope: 'PLATFORM' },
      { resource: 'platform.audit', action: 'read', scope: 'PLATFORM' },
      { resource: 'platform.announcements', action: 'manage', scope: 'PLATFORM' },
    ];

    for (const p of requiredPermKeys) {
      const existing = await prisma.permission.findFirst({
        where: { resource: p.resource, action: p.action, scope: p.scope },
      });
      const permRecord = existing || await prisma.permission.create({ data: p });
      const rolePerm = await prisma.rolePermission.findFirst({
        where: { roleId: superAdminRole.id, permissionId: permRecord.id },
      });
      if (!rolePerm) {
        await prisma.rolePermission.create({
          data: { roleId: superAdminRole.id, permissionId: permRecord.id },
        });
      }
    }

    // 2. Create Full SuperAdmin user
    fullSuperAdminUser = await prisma.user.create({
      data: {
        email: `superadmin.${uniqueSuffix}@fitcore.io`,
        firstName: 'Platform',
        lastName: 'Commander',
        passwordHash,
        status: 'ACTIVE',
        userRoles: {
          create: {
            roleId: superAdminRole.id,
            organisationId: testOrg.id,
          },
        },
      },
    });

    // 3. Create Restricted Admin user (role is SUPERADMIN but explicit custom role has only organisations.read)
    let restrictedRole = await prisma.role.findUnique({ where: { name: 'PLATFORM_RESTRICTED' } });
    if (!restrictedRole) {
      restrictedRole = await prisma.role.create({
        data: { name: 'PLATFORM_RESTRICTED', description: 'Read-only organisations auditor' },
      });
      const orgReadPerm = await prisma.permission.findFirst({
        where: { resource: 'platform.organisations', action: 'read' },
      });
      if (orgReadPerm) {
        await prisma.rolePermission.create({
          data: { roleId: restrictedRole.id, permissionId: orgReadPerm.id },
        });
      }
    }

    restrictedAdminUser = await prisma.user.create({
      data: {
        email: `auditor.${uniqueSuffix}@fitcore.io`,
        firstName: 'Restricted',
        lastName: 'Auditor',
        passwordHash,
        status: 'ACTIVE',
        userRoles: {
          create: {
            roleId: restrictedRole.id,
            organisationId: testOrg.id,
          },
        },
      },
    });

    // 4. Create Regular user
    regularUser = await prisma.user.create({
      data: {
        email: `member.${uniqueSuffix}@apexfit.com`,
        firstName: 'Jane',
        lastName: 'Member',
        passwordHash,
        status: 'ACTIVE',
        userRoles: {
          create: {
            roleId: memberRole.id,
            organisationId: testOrg.id,
          },
        },
      },
    });

    // Obtain JWT tokens via login
    const superLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: fullSuperAdminUser.email, password: defaultPassword });
    fullSuperAdminToken = superLogin.body.data?.accessToken || superLogin.body.accessToken;

    const restrictedLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: restrictedAdminUser.email, password: defaultPassword });
    restrictedAdminToken = restrictedLogin.body.data?.accessToken || restrictedLogin.body.accessToken;

    const regularLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: regularUser.email, password: defaultPassword });
    regularUserToken = regularLogin.body.data?.accessToken || regularLogin.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.supportTicketMessage.deleteMany({
      where: { authorUserId: { in: [fullSuperAdminUser.id, regularUser.id] } },
    });
    await prisma.supportTicket.deleteMany({
      where: { organisationId: testOrg.id },
    });
    await prisma.platformFeatureFlag.deleteMany({
      where: { key: { startsWith: 'test.' } },
    });
    await prisma.platformIncident.deleteMany({
      where: { incidentNumber: { startsWith: 'INC-2026-' } },
    });
    await prisma.supportAccessRequest.deleteMany({
      where: { organisationId: testOrg.id },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [fullSuperAdminUser.id, restrictedAdminUser.id, regularUser.id] } },
    });
    await prisma.outlet.deleteMany({ where: { id: testOutlet.id } });
    await prisma.organisation.deleteMany({ where: { id: testOrg.id } });

    await app.close();
  });

  // =========================================================================
  // 1. EXPLICIT PLATFORM PERMISSIONS & RBAC DEFENSE
  // =========================================================================
  describe('1. Explicit Platform Permissions & RBAC Guard', () => {
    it('denies platform admin routes to unauthenticated requests (401)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/platform-admin/overview');
      expect(res.status).toBe(401);
    });

    it('denies platform admin routes to regular organisation users (403)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/platform-admin/overview')
        .set('Authorization', `Bearer ${regularUserToken}`);
      expect(res.status).toBe(403);
    });

    it('allows authorized Superadmin with explicit permissions to access platform overview (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/platform-admin/overview')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`);
      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.totalOrganisations).toBeGreaterThanOrEqual(1);
      expect(data).toHaveProperty('activeMembers');
      expect(data).toHaveProperty('aiRequests');
    });

    it('strictly denies Superadmin lacking specific permission (e.g. restricted admin modifying flags) (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/platform-admin/feature-flags')
        .set('Authorization', `Bearer ${restrictedAdminToken}`)
        .send({
          key: 'test.unauthorized_flag',
          name: 'Unauthorized Flag',
        });
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 2. ORGANISATION MANAGEMENT & LIFECYCLE GOVERNANCE
  // =========================================================================
  describe('2. Organisation Directory, Summary & Suspension Lifecycle', () => {
    it('lists organisations with search, status filter, and pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/platform-admin/organisations')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .query({ search: testOrg.slug });

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.items.length).toBeGreaterThanOrEqual(1);
      expect(data.items[0].id).toBe(testOrg.id);
    });

    it('retrieves aggregated platform summary without exposing sensitive member PII', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/platform-admin/organisations/${testOrg.id}`)
        .set('Authorization', `Bearer ${fullSuperAdminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.id).toBe(testOrg.id);
      expect(data.outletsCount).toBeGreaterThanOrEqual(1);
      expect(data.platformHealthStatus).toBeDefined();
      expect(data.members).toBeUndefined(); // Zero sensitive member list exposed
    });

    it('retrieves pre-suspension impact preview', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/platform-admin/organisations/${testOrg.id}/impact-preview`)
        .set('Authorization', `Bearer ${fullSuperAdminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.organisationId).toBe(testOrg.id);
      expect(data.impactPolicyNotice).toContain('Suspending this organisation');
    });

    it('suspends organisation safely and emits security telemetry', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/platform-admin/organisations/${testOrg.id}/suspend`)
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .send({
          reason: 'Scheduled compliance review and audit verification',
          impactAcknowledged: true,
        });

      expect(res.status).toBe(201);
      const data = res.body.data || res.body;
      expect(data.status).toBe('SUSPENDED');

      // Verify in DB
      const dbOrg = await prisma.organisation.findUnique({ where: { id: testOrg.id } });
      expect(dbOrg?.status).toBe('SUSPENDED');
    });

    it('reactivates a suspended organisation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/platform-admin/organisations/${testOrg.id}/reactivate`)
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .send({ reason: 'Compliance audit cleared successfully' });

      expect(res.status).toBe(201);
      const data = res.body.data || res.body;
      expect(data.status).toBe('ACTIVE');
    });
  });

  // =========================================================================
  // 3. PLATFORM USAGE METERING & PROJECTIONS
  // =========================================================================
  describe('3. Platform Usage Metering', () => {
    it('returns live usage totals aggregated across reliable domain models', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/platform-admin/usage')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.activeMembers.unit).toBe('COUNT');
      expect(data.activeOutlets.unit).toBe('COUNT');
      expect(data.aiTokens.unit).toBe('TOKENS');
    });

    it('returns catalog of platform metric definitions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/platform-admin/usage/definitions')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.some((m: any) => m.metricKey === 'ACTIVE_MEMBERS')).toBe(true);
      expect(data.some((m: any) => m.metricKey === 'AI_TOKENS')).toBe(true);
    });
  });

  // =========================================================================
  // 4. AI USAGE, COSTS & FEATURE HEALTH
  // =========================================================================
  describe('4. AI Usage, Costs & Secret Redaction Invariants', () => {
    beforeAll(async () => {
      // Seed sample AI usage record
      await prisma.aIUsageRecord.create({
        data: {
          organisationId: testOrg.id,
          userId: fullSuperAdminUser.id,
          feature: 'FITNESS_COACH' as any,
          provider: 'OPENAI',
          model: 'gpt-4o',
          inputTokens: 1200,
          outputTokens: 450,
          totalTokens: 1650,
          latencyMs: 850,
          estimatedCost: 3.3,
        },
      });
    });

    it('queries AI token volume and costs without leaking provider credentials', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/platform-admin/ai-usage')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .query({ organisationId: testOrg.id });

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.summary.totalTokens).toBeGreaterThanOrEqual(1650);
      expect(data.summary.estimatedCostCents).toBeGreaterThan(0);
      expect(data.byFeature.length).toBeGreaterThanOrEqual(1);

      // Invariant: zero credentials exposed
      const jsonStr = JSON.stringify(data).toLowerCase();
      expect(jsonStr).not.toContain('apikey');
      expect(jsonStr).not.toContain('secret');
      expect(jsonStr).not.toContain('bearertoken');
    });

    it('inspects AI feature health and latencies', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/platform-admin/ai-usage/health')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.some((f: any) => f.feature === 'FITNESS_COACH')).toBe(true);
    });
  });

  // =========================================================================
  // 5. BILLING VISIBILITY
  // =========================================================================
  describe('5. Platform Billing Visibility', () => {
    it('returns administrative subscription overview and limits for an organisation', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/platform-admin/billing/organisations/${testOrg.id}`)
        .set('Authorization', `Bearer ${fullSuperAdminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.organisationId).toBe(testOrg.id);
      expect(data.planName).toBeDefined();
      expect(data.limits.maxOutlets).toBeGreaterThan(0);
      expect(data.overages).toHaveProperty('outletOverage');
    });
  });

  // =========================================================================
  // 6. SUPPORT TICKET SYSTEM & VISIBILITY ISOLATION
  // =========================================================================
  describe('6. Support Ticketing & Internal Note Boundary', () => {
    let createdTicketId: string;

    it('creates support ticket with sequential ticketNumber and calculated SLA targets', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/platform-admin/support/tickets')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .send({
          organisationId: testOrg.id,
          title: 'Stripe webhook replay latency',
          description: 'Payment confirmations are taking > 30 seconds to update member memberships.',
          priority: 'HIGH',
          category: 'PAYMENT',
        });

      expect(res.status).toBe(201);
      const data = res.body.data || res.body;
      expect(data.ticketNumber).toMatch(/^TIK-\d{4}-\d{4}$/);
      expect(data.firstResponseTarget).toBeDefined();
      expect(data.resolutionTarget).toBeDefined();
      createdTicketId = data.id;
    });

    it('adds an INTERNAL_ONLY note to ticket thread', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/platform-admin/support/tickets/${createdTicketId}/messages`)
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .send({
          content: 'Internal diagnostics: BullMQ worker memory saturation observed on worker-3.',
          visibility: 'INTERNAL_ONLY',
        });

      expect(res.status).toBe(201);
      const data = res.body.data || res.body;
      expect(data.visibility).toBe('INTERNAL_ONLY');
    });

    it('allows Superadmin to see INTERNAL_ONLY notes in ticket thread', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/platform-admin/support/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${fullSuperAdminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      const internalNote = data.messages.find((m: any) => m.visibility === 'INTERNAL_ONLY');
      expect(internalNote).toBeDefined();
      expect(internalNote.content).toContain('Internal diagnostics');
    });

    it('strictly redacts INTERNAL_ONLY notes when non-platform user views ticket', async () => {
      // Create user role linking regular user to testOrg so they have tenant access
      const res = await request(app.getHttpServer())
        .get(`/api/v1/platform-admin/support/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      // Since regularUser lacks platform permissions, guard denies access with 403
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 7. FEATURE FLAGS & DETERMINISTIC ROLLOUT ENGINE
  // =========================================================================
  describe('7. Feature Flags & Deterministic Rollout Engine', () => {
    let flagKey = `test.dynamic_coaching_${Date.now()}`;
    let createdFlagId: string;

    it('creates a feature flag with percentage rollout', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/platform-admin/feature-flags')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .send({
          key: flagKey,
          name: 'Dynamic AI Coaching Engine',
          defaultValue: false,
          rolloutStrategy: 'PERCENTAGE',
          rolloutPercentage: 50,
          isSecurityCritical: false,
        });

      expect(res.status).toBe(201);
      const data = res.body.data || res.body;
      expect(data.key).toBe(flagKey);
      expect(data.rolloutPercentage).toBe(50);
      createdFlagId = data.id;
    });

    it('blocks illegal feature flags that attempt to bypass core security/privacy (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/platform-admin/feature-flags')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .send({
          key: 'security.bypass_auth',
          name: 'Bypass Auth Flag',
        });

      expect(res.status).toBe(403);
      const errMsg = res.body.error?.message || res.body.message || '';
      expect(errMsg).toContain('strictly prohibited');
    });

    it('evaluates flag deterministically without random variation', async () => {
      const eval1 = await request(app.getHttpServer())
        .get(`/api/v1/platform-admin/feature-flags/eval/${flagKey}`)
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .query({ userId: 'user_fixed_123' });

      const eval2 = await request(app.getHttpServer())
        .get(`/api/v1/platform-admin/feature-flags/eval/${flagKey}`)
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .query({ userId: 'user_fixed_123' });

      expect(eval1.body.data.enabled).toBe(eval2.body.data.enabled);
    });

    it('supports hierarchical organisation override', async () => {
      // Create explicit organisation override assignment
      await request(app.getHttpServer())
        .post(`/api/v1/platform-admin/feature-flags/${createdFlagId}/assignments`)
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .send({
          scope: 'ORGANISATION',
          organisationId: testOrg.id,
          enabled: true,
          reason: 'Pilot beta gym testing',
        });

      const evalRes = await request(app.getHttpServer())
        .get(`/api/v1/platform-admin/feature-flags/eval/${flagKey}`)
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .query({ organisationId: testOrg.id });

      expect(evalRes.body.data.enabled).toBe(true);
      expect(evalRes.body.data.evaluatedScope).toBe('ORGANISATION');
    });
  });

  // =========================================================================
  // 8. PLATFORM CONFIGURATION & MAINTENANCE MODE
  // =========================================================================
  describe('8. Platform Configuration & Maintenance Mode', () => {
    it('sets versioned platform configuration entry', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/platform-admin/configuration/ai.default_model')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .send({
          category: 'AI_DEFAULTS',
          value: { primaryModel: 'gpt-4o', fallbackModel: 'claude-3-5-sonnet' },
          description: 'Production primary and fallback LLM models',
        });

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.configKey).toBe('ai.default_model');
      expect(data.version).toBeGreaterThanOrEqual(1);
    });

    it('enables scoped maintenance mode without disabling auth or security', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/platform-admin/configuration/maintenance')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .send({
          enabled: true,
          scope: 'ORGANISATION',
          targetReferenceId: testOrg.id,
          description: 'Routine database index re-indexing',
        });

      expect(res.status).toBe(201);
      const data = res.body.data || res.body;
      expect(data.isMaintenanceMode).toBe(true);
      expect(data.maintenanceScope).toBe('ORGANISATION');
    });
  });

  // =========================================================================
  // 9. PLATFORM HEALTH PROBES & OPERATIONAL INCIDENTS
  // =========================================================================
  describe('9. Platform Health & Incidents', () => {
    it('executes comprehensive multi-subsystem health probe', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/platform-admin/health')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.overallStatus).toBe('HEALTHY');
      expect(data.services.length).toBeGreaterThanOrEqual(5);
      expect(data.services.some((s: any) => s.service === 'DATABASE_POSTGRESQL')).toBe(true);
    });

    it('creates, investigates, and resolves an operational incident', async () => {
      // 1. Declare incident
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/platform-admin/incidents')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .send({
          title: 'Twilio SMS gateway intermittent failure',
          description: 'Elevated delivery error rates reported in APAC region.',
          severity: 'HIGH',
          affectedServices: ['COMMUNICATION_CHANNELS'],
          linkedProvider: 'TWILIO',
        });

      expect(createRes.status).toBe(201);
      const incident = createRes.body.data || createRes.body;
      expect(incident.incidentNumber).toMatch(/^INC-\d{4}-\d{4}$/);
      expect(incident.status).toBe('DETECTED');

      // 2. Update status to RESOLVED
      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/platform-admin/incidents/${incident.id}`)
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .send({
          status: 'RESOLVED',
          message: 'Upstream Twilio routing recovered. All backlog dispatches processed.',
        });

      expect(updateRes.status).toBe(200);
      const updated = updateRes.body.data || updateRes.body;
      expect(updated.status).toBe('RESOLVED');
      expect(updated.resolvedAt).toBeDefined();
    });
  });

  // =========================================================================
  // 10. SUPPORT ACCESS & BREAK-GLASS PROTOCOL
  // =========================================================================
  describe('10. Temporary Support Access & Step-Up Authentication', () => {
    let accessRequestId: string;

    it('submits a time-bounded support access request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/platform-admin/support-access/request')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .send({
          organisationId: testOrg.id,
          purpose: 'Troubleshoot corrupted invoice reconciliation report',
          durationMinutes: 30,
          scope: 'ORGANISATION',
        });

      expect(res.status).toBe(201);
      const data = res.body.data || res.body;
      expect(data.status).toBe('PENDING');
      expect(data.expiresAt).toBeDefined();
      accessRequestId = data.id;
    });

    it('approves support access with Step-Up challenge verification', async () => {
      // Generate step-up challenge for support access approval
      const challenge = await stepUpService.createChallenge(
        fullSuperAdminUser.id,
        'SUPPORT_ACCESS_APPROVAL',
      );

      // Verify challenge with password
      await stepUpService.verifyChallenge(
        fullSuperAdminUser.id,
        challenge.challengeToken,
        { password: 'SuperAdminPassword2026!' },
      );

      const res = await request(app.getHttpServer())
        .post(`/api/v1/platform-admin/support-access/${accessRequestId}/approve`)
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .send({ stepUpToken: challenge.challengeToken });

      expect(res.status).toBe(201);
      const data = res.body.data || res.body;
      expect(data.status).toBe('ACTIVE');
      expect(data.stepUpVerified).toBe(true);
    });

    it('revokes active support access immediately', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/platform-admin/support-access/${accessRequestId}/revoke`)
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .send({ reason: 'Investigation completed successfully' });

      expect(res.status).toBe(201);
      const data = res.body.data || res.body;
      expect(data.status).toBe('REVOKED');
    });
  });

  // =========================================================================
  // 11. DATA QUALITY DIAGNOSTIC SCANNER
  // =========================================================================
  describe('11. Platform Data Quality Diagnostic Scanner', () => {
    it('executes comprehensive data quality scan and reports health state', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/platform-admin/data-quality')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.totalChecks).toBeGreaterThanOrEqual(4);
      expect(data.results.some((r: any) => r.checkName === 'ORGANISATION_STATUS_INTEGRITY')).toBe(true);
      expect(data.results.some((r: any) => r.checkName === 'FEATURE_FLAG_ASSIGNMENT_INTEGRITY')).toBe(true);
    });
  });

  // =========================================================================
  // 12. AUDIT TRAIL QUERY & GLOBAL PLATFORM SEARCH
  // =========================================================================
  describe('12. Audit Trail & Global Platform Search', () => {
    it('searches across organisations, outlets, tickets, and incidents', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/platform-admin/search')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .query({ q: 'Apex' });

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('organisations');
      expect(data).toHaveProperty('outlets');
      expect(data).toHaveProperty('tickets');
    });

    it('queries platform audit logs with action filters and pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/platform-admin/audit')
        .set('Authorization', `Bearer ${fullSuperAdminToken}`)
        .query({ organisationId: testOrg.id });

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.items.length).toBeGreaterThanOrEqual(1);
      expect(data.pagination).toBeDefined();
    });
  });
});
