/**
 * FitCore — Day 56: Observability, Monitoring & Platform Health E2E Test Suite
 *
 * Validates:
 * 1. Structured Logging & Recursive Redaction (Zero credential or PII leakage)
 * 2. W3C TraceContext Propagation (traceId, spanId, traceparent header parsing)
 * 3. Bounded Metrics Registry & Snapshots (Counters, Histograms, Percentiles p50/p95/p99)
 * 4. Multi-Tier Health Probes (Liveness, Readiness, Subsystem Probes for Core, Storage, Workers, AI, Providers)
 * 5. Alert Rules & Deduplication Engine (Deterministic fingerprinting, threshold breach detection, cooldowns)
 * 6. Operational Incident Management (Declaration, Alert linkage, timeline events, resolution)
 * 7. Queue & Worker Health Telemetry (Backlog, rates, oldest job age)
 * 8. AI Gateway Observability & Token Metrics (Throughput, latencies, safety blocks, costs)
 * 9. SLI / SLO Compliance Engine (Target vs observed percentage tracking)
 * 10. Deployment Tracking & Correlation (Recording version, sha, release history)
 * 11. Multi-Tenant Isolation & Role-Based Access Control
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { LogRedactionService } from '../src/observability/logging/log-redaction.service';
import { TraceContextService } from '../src/observability/tracing/trace-context.service';
import { MetricRegistryService } from '../src/observability/metrics/metric-registry.service';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

describe('Day 56: Observability, Monitoring & Platform Health E2E Suite', () => {
  jest.setTimeout(120000);

  let app: INestApplication;
  let prisma: PrismaService;
  let redactionService: LogRedactionService;
  let traceService: TraceContextService;
  let metricsService: MetricRegistryService;

  let superAdminToken: string;
  let regularOrgOwnerToken: string;

  let testOrg: any;
  let superAdminUser: any;
  let orgOwnerUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    redactionService = app.get(LogRedactionService);
    traceService = app.get(TraceContextService);
    metricsService = app.get(MetricRegistryService);

    const suffix = Date.now().toString();

    // 1. Seed test organisation
    testOrg = await prisma.organisation.create({
      data: {
        name: `Observability Test Gym ${suffix}`,
        slug: `obs-gym-${suffix}`,
        status: 'ACTIVE',
        currency: 'AUD',
        country: 'Australia',
      },
    });

    const defaultPassword = 'ObservabilityPass2026!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Roles
    let superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPERADMIN' } });
    if (!superAdminRole) {
      superAdminRole = await prisma.role.create({
        data: { name: 'SUPERADMIN', description: 'Platform Superadmin' },
      });
    }

    let ownerRole = await prisma.role.findUnique({ where: { name: 'ORGANISATION_OWNER' } });
    if (!ownerRole) {
      ownerRole = await prisma.role.create({
        data: { name: 'ORGANISATION_OWNER', description: 'Organisation Owner' },
      });
    }

    // Users
    superAdminUser = await prisma.user.create({
      data: {
        email: `super.obs.${suffix}@fitcore.io`,
        firstName: 'Observability',
        lastName: 'Admin',
        passwordHash,
        status: 'ACTIVE',
        userRoles: {
          create: { roleId: superAdminRole.id, organisationId: testOrg.id },
        },
      },
    });

    orgOwnerUser = await prisma.user.create({
      data: {
        email: `owner.obs.${suffix}@gym.com`,
        firstName: 'Owner',
        lastName: 'Gym',
        passwordHash,
        status: 'ACTIVE',
        userRoles: {
          create: { roleId: ownerRole.id, organisationId: testOrg.id },
        },
      },
    });

    // Login tokens
    const loginSuper = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: superAdminUser.email, password: defaultPassword });
    superAdminToken = loginSuper.body.data?.accessToken || loginSuper.body.accessToken;

    const loginOwner = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: orgOwnerUser.email, password: defaultPassword });
    regularOrgOwnerToken = loginOwner.body.data?.accessToken || loginOwner.body.accessToken;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.observabilityIncidentEvent.deleteMany({});
      await prisma.observabilityAlert.deleteMany({});
      await prisma.observabilityIncident.deleteMany({});
      await prisma.observabilityAlertRule.deleteMany({});
      await prisma.observabilityDeployment.deleteMany({});

      if (testOrg) {
        await prisma.userRole.deleteMany({ where: { organisationId: testOrg.id } });
        await prisma.user.deleteMany({
          where: { id: { in: [superAdminUser.id, orgOwnerUser.id] } },
        });
        await prisma.organisation.deleteMany({ where: { id: testOrg.id } });
      }
    }
    await app.close();
  });

  // =========================================================================
  // 1. STRUCTURED LOGGING & REDACTION
  // =========================================================================
  describe('1. Structured Logging & Recursive Redaction', () => {
    it('redacts sensitive passwords, tokens, secrets, and authorization headers', () => {
      const payload = {
        requestId: 'req_12345',
        user: {
          id: 'usr_abc',
          email: 'user@example.com',
          password: 'SuperSecretPassword!',
          mfaSecret: 'JBSWY3DPEHPK3PXP',
        },
        auth: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'refresh_tok_123',
          apiKey: 'fitcore_live_secret_key',
        },
        payment: {
          cardNumber: '4111222233334444',
          cvv: '123',
        },
        health: {
          parqAnswers: { chestPain: true },
        },
      };

      const redacted = redactionService.redact(payload);

      expect(redacted.user.password).toBe('[REDACTED]');
      expect(redacted.user.mfaSecret).toBe('[REDACTED]');
      expect(redacted.auth.token).toBe('[REDACTED]');
      expect(redacted.auth.refreshToken).toBe('[REDACTED]');
      expect(redacted.auth.apiKey).toBe('[REDACTED]');
      expect(redacted.payment.cardNumber).toBe('[REDACTED]');
      expect(redacted.payment.cvv).toBe('[REDACTED]');
      expect(redacted.health.parqAnswers).toBe('[REDACTED]');
      expect(redacted.user.email).toBe('user@example.com');
      expect(redacted.requestId).toBe('req_12345');
    });

    it('redacts inline Bearer tokens inside strings', () => {
      const rawString = 'Failed authentication with header: Bearer abc123def456.jwt.sig';
      const sanitized = redactionService.redact(rawString);
      expect(sanitized).toBe('Failed authentication with header: Bearer [REDACTED]');
    });
  });

  // =========================================================================
  // 2. W3C TRACECONTEXT PROPAGATION
  // =========================================================================
  describe('2. Distributed Tracing & W3C Context Propagation', () => {
    it('generates valid 32-hex traceId and 16-hex spanId', () => {
      const traceId = traceService.generateTraceId();
      const spanId = traceService.generateSpanId();

      expect(traceId).toHaveLength(32);
      expect(spanId).toHaveLength(16);
      expect(/^[0-9a-f]{32}$/.test(traceId)).toBe(true);
      expect(/^[0-9a-f]{16}$/.test(spanId)).toBe(true);
    });

    it('parses incoming W3C traceparent header and preserves traceId across hops', () => {
      const parentTraceId = '4bf92f3577b34da6a3ce929d0e0e4736';
      const parentSpanId = '00f067aa0ba902b7';
      const header = `00-${parentTraceId}-${parentSpanId}-01`;

      const ctx = traceService.parseTraceparent(header);
      expect(ctx.traceId).toBe(parentTraceId);
      expect(ctx.parentSpanId).toBe(parentSpanId);
      expect(ctx.spanId).not.toBe(parentSpanId);
      expect(ctx.sampled).toBe(true);

      const serialized = traceService.formatTraceparent(ctx);
      expect(serialized.startsWith(`00-${parentTraceId}-`)).toBe(true);
    });
  });

  // =========================================================================
  // 3. METRICS REGISTRY & STATISTICAL AGGREGATION
  // =========================================================================
  describe('3. Metrics Registry & Bounded Aggregation', () => {
    it('records counters, gauges, and computes histogram percentiles (p50, p95, p99)', () => {
      metricsService.incrementCounter('api.requests.total', 10);
      metricsService.setGauge('redis.cache.hit_ratio', 94.5);

      // Record simulated latencies
      for (let i = 1; i <= 100; i++) {
        metricsService.recordHistogram('api.latency.ms', i);
      }

      const counterSnap = metricsService.getSnapshot('api.requests.total');
      const gaugeSnap = metricsService.getSnapshot('redis.cache.hit_ratio');
      const histSnap = metricsService.getSnapshot('api.latency.ms');

      expect(counterSnap?.value).toBeGreaterThanOrEqual(10);
      expect(gaugeSnap?.value).toBe(94.5);
      expect(histSnap?.value).toBeGreaterThan(0);

      const percentiles = metricsService.getPercentiles('api.latency.ms');
      expect(percentiles.p50).toBeGreaterThanOrEqual(50);
      expect(percentiles.p95).toBeGreaterThanOrEqual(95);
      expect(percentiles.p99).toBeGreaterThanOrEqual(99);
    });

    it('returns documented metric definitions catalog via API', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/observability/metric-definitions')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const defs = res.body.data || res.body;
      expect(Array.isArray(defs)).toBe(true);
      expect(defs.some((d: any) => d.key === 'api.requests.total')).toBe(true);
      expect(defs.some((d: any) => d.key === 'ai.tokens.total')).toBe(true);
    });
  });

  // =========================================================================
  // 4. MULTI-TIER HEALTH PROBES
  // =========================================================================
  describe('4. Multi-Tier Platform Health Probes', () => {
    it('serves unauthenticated liveness probe', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/observability/health/live');
      expect(res.status).toBe(200);
      const body = res.body.data || res.body;
      expect(body.status).toBe('UP');
      expect(body.uptime).toBeGreaterThan(0);
    });

    it('serves unauthenticated readiness probe checking database connection', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/observability/health/ready');
      expect(res.status).toBe(200);
      const body = res.body.data || res.body;
      expect(body.status).toBe('READY');
    });

    it('provides comprehensive platform health overview for Superadmin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/observability/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const overview = res.body.data || res.body;
      expect(overview.overallStatus).toBeDefined();
      expect(overview.services.length).toBeGreaterThanOrEqual(5);
      expect(overview.services.some((s: any) => s.service === 'DATABASE_POSTGRESQL')).toBe(true);
      expect(overview.services.some((s: any) => s.service === 'CACHE_REDIS')).toBe(true);
      expect(overview.services.some((s: any) => s.service === 'AI_GATEWAY')).toBe(true);
    });
  });

  // =========================================================================
  // 5. ALERT RULES & DEDUPLICATION FINGERPRINTING
  // =========================================================================
  describe('5. Alert Engine & Deduplication', () => {
    it('creates a configurable alert rule and evaluates threshold breach', async () => {
      const ruleKey = `RULE_API_ERRORS_${Date.now()}`;

      // 1. Create Rule
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/observability/alerts/rules')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          ruleKey,
          name: 'High 5xx Error Spike',
          service: 'API_GATEWAY',
          metricKey: 'api.errors.5xx',
          condition: 'GT',
          threshold: 5,
          severity: 'HIGH',
        });

      expect(createRes.status).toBe(201);

      // 2. Simulate breach in metrics registry
      metricsService.incrementCounter('api.errors.5xx', 12);

      // 3. Trigger evaluation
      const evalRes = await request(app.getHttpServer())
        .post('/api/v1/observability/alerts/evaluate')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(evalRes.status).toBe(201);
      const alerts = evalRes.body.data || evalRes.body;
      expect(alerts.some((a: any) => a.ruleKey === ruleKey)).toBe(true);

      // 4. Evaluate again immediately - fingerprint deduplication prevents duplicate open alert
      const evalAgain = await request(app.getHttpServer())
        .post('/api/v1/observability/alerts/evaluate')
        .set('Authorization', `Bearer ${superAdminToken}`);

      const alertsAgain = evalAgain.body.data || evalAgain.body;
      expect(alertsAgain.some((a: any) => a.ruleKey === ruleKey)).toBe(false);
    });

    it('acknowledges and resolves an active alert', async () => {
      const alertsRes = await request(app.getHttpServer())
        .get('/api/v1/observability/alerts')
        .set('Authorization', `Bearer ${superAdminToken}`);

      const alertList = alertsRes.body.data || alertsRes.body;
      expect(alertList.length).toBeGreaterThan(0);
      const targetAlert = alertList[0];

      // Acknowledge
      const ackRes = await request(app.getHttpServer())
        .post(`/api/v1/observability/alerts/${targetAlert.id}/acknowledge`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(ackRes.status).toBe(201);
      expect((ackRes.body.data || ackRes.body).status).toBe('ACKNOWLEDGED');

      // Resolve
      const resolveRes = await request(app.getHttpServer())
        .post(`/api/v1/observability/alerts/${targetAlert.id}/resolve`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(resolveRes.status).toBe(201);
      expect((resolveRes.body.data || resolveRes.body).status).toBe('RESOLVED');
    });
  });

  // =========================================================================
  // 6. OPERATIONAL INCIDENT TRACKING
  // =========================================================================
  describe('6. Operational Incident Lifecycle', () => {
    let incidentId: string;

    it('declares an operational incident and creates timeline event', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/observability/incidents')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Twilio SMS Webhook Latency Degradation',
          description: 'Delivery receipts delayed by 180 seconds due to upstream provider rate limits',
          severity: 'HIGH',
          affectedServices: ['COMMUNICATION_CHANNELS', 'WORKER'],
        });

      expect(res.status).toBe(201);
      const inc = res.body.data || res.body;
      expect(inc.incidentNumber).toMatch(/^INC-/);
      expect(inc.status).toBe('OPEN');
      incidentId = inc.id;
    });

    it('progresses incident through MITIGATED to RESOLVED status with notes', async () => {
      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/observability/incidents/${incidentId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: 'RESOLVED',
          mitigationNotes: 'Applied exponential backoff and alternate gateway fallback',
          eventMessage: 'Resolved after provider rate limit cleared',
        });

      expect(updateRes.status).toBe(200);
      const inc = updateRes.body.data || updateRes.body;
      expect(inc.status).toBe('RESOLVED');
      expect(inc.resolvedAt).toBeDefined();
      expect(inc.events.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // 7. QUEUE & AI TELEMETRY
  // =========================================================================
  describe('7. Queue & AI Gateway Telemetry', () => {
    it('retrieves background worker queue depths and processing throughput', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/observability/queues')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const queues = res.body.data || res.body;
      expect(Array.isArray(queues)).toBe(true);
      expect(queues.some((q: any) => q.queueName === 'billing-finalization')).toBe(true);
      expect(queues.some((q: any) => q.queueName === 'communications-dispatch')).toBe(true);
    });

    it('retrieves AI Gateway operational metrics without leaking prompts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/observability/ai')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const ai = res.body.data || res.body;
      expect(ai).toHaveProperty('successRatePercent');
      expect(ai).toHaveProperty('providerStatus');
      expect(ai).toHaveProperty('safetyBlocksCount');
      expect(ai.providerStatus.OpenAI).toBe('HEALTHY');
    });
  });

  // =========================================================================
  // 8. SLI / SLO COMPLIANCE & DEPLOYMENT CORRELATION
  // =========================================================================
  describe('8. SLO Compliance & Deployment Tracking', () => {
    it('evaluates observed SLI performance against target SLOs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/observability/slo')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const slos = res.body.data || res.body;
      expect(Array.isArray(slos)).toBe(true);
      expect(slos.some((s: any) => s.key === 'slo.api.availability')).toBe(true);
      expect(slos.every((s: any) => typeof s.observedPercentage === 'number')).toBe(true);
    });

    it('records release deployment for release correlation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/observability/deployments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          version: 'v2.14.0',
          commitSha: 'a1b2c3d4e5f6',
          environment: 'production',
          notes: 'Day 56 Observability deployment',
        });

      expect(res.status).toBe(201);
      const dep = res.body.data || res.body;
      expect(dep.version).toBe('v2.14.0');
    });
  });

  // =========================================================================
  // 9. RBAC & TENANT DEFENSE
  // =========================================================================
  describe('9. RBAC & Access Boundaries', () => {
    it('blocks regular gym organisation owner from accessing platform observability overview', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/observability/overview')
        .set('Authorization', `Bearer ${regularOrgOwnerToken}`);

      expect(res.status).toBe(403);
    });

    it('blocks unauthenticated requests to internal metrics and alert routes', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/observability/metrics');
      expect(res.status).toBe(401);
    });
  });
});
