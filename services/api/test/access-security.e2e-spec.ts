import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AccessDecisionService } from '../src/access/services/access-decision.service';
import { AccessDeviceService } from '../src/access/services/access-device.service';

describe('Physical Access Security & Tenant Isolation (Day 7 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let decisionService: AccessDecisionService;
  let deviceService: AccessDeviceService;

  let ownerToken: string;
  let memberToken: string;
  let receptionToken: string;

  let orgIdA: string;
  let outletAId: string;
  let deviceAId: string;

  let orgIdB: string;
  let outletBId: string;
  let deviceBId: string;

  let memberAProfileId: string;
  let memberBProfileId: string;
  let memberBToken: string;

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
      })
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    prisma = app.get(PrismaService);
    decisionService = app.get(AccessDecisionService);
    deviceService = app.get(AccessDeviceService);

    const defaultPassword = 'FitCoreDev2026!';

    // Authenticate Org A Users
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@secondwind.com.au', password: defaultPassword });
    ownerToken = ownerRes.body.data.accessToken;

    const memberRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'active.member@secondwind.com.au', password: defaultPassword });
    memberToken = memberRes.body.data.accessToken;

    const receptionRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'reception@secondwind.com.au', password: defaultPassword });
    receptionToken = receptionRes.body.data.accessToken;

    // Org A setup
    const secondWind = await prisma.organisation.findFirst({
      where: { slug: 'second-wind' },
      include: { outlets: true },
    });
    orgIdA = secondWind!.id;
    outletAId = secondWind!.outlets.find((o) => o.code === 'SW-PERTH-CBD')!.id;

    const devA = await prisma.accessDevice.findFirst({ where: { outletId: outletAId } });
    deviceAId = devA!.id;

    const memAProfile = await prisma.memberProfile.findFirst({
      where: { user: { email: 'active.member@secondwind.com.au' } },
    });
    memberAProfileId = memAProfile!.id;

    // Org B setup (Isolated Tenant)
    const orgB = await prisma.organisation.upsert({
      where: { slug: 'tenant-b-security-test' },
      update: {},
      create: {
        id: 'org_sec_tenant_b_001',
        name: 'Apex Fitness Collective',
        slug: 'tenant-b-security-test',
        currency: 'AUD',
        timezone: 'Australia/Perth',
      },
    });
    orgIdB = orgB.id;

    const outletB = await prisma.outlet.upsert({
      where: { organisationId_code: { organisationId: orgIdB, code: 'APEX-01' } },
      update: {},
      create: {
        id: 'outlet_sec_apex_001',
        organisationId: orgIdB,
        name: 'Apex Central',
        slug: 'apex-central',
        code: 'APEX-01',
        address: '45 St Georges Tce',
        city: 'Perth',
        state: 'WA',
        postalCode: '6000',
      },
    });
    outletBId = outletB.id;

    const devB = await prisma.accessDevice.upsert({
      where: { provider_providerDeviceId: { provider: 'MOCK', providerDeviceId: 'mock_dev_apex_sec_01' } },
      update: {},
      create: {
        id: 'dev_sec_apex_001',
        organisationId: orgIdB,
        outletId: outletBId,
        name: 'Apex Turnstile 1',
        type: 'TURNSTILE',
        status: 'ONLINE',
        provider: 'MOCK',
        providerDeviceId: 'mock_dev_apex_sec_01',
      },
    });
    deviceBId = devB.id;

    // Member B setup in Org B
    const userB = await prisma.user.upsert({
      where: { email: 'member.b@apex.com.au' },
      update: {},
      create: {
        id: 'user_sec_member_b_001',
        email: 'member.b@apex.com.au',
        firstName: 'Bob',
        lastName: 'Apex',
        passwordHash: '$2b$10$xyz',
      },
    });

    const memBProfile = await prisma.memberProfile.upsert({
      where: { userId: userB.id },
      update: {},
      create: {
        id: 'member_profile_sec_b_001',
        userId: userB.id,
        organisationId: orgIdB,
        status: 'ACTIVE',
        onboardingStatus: 'COMPLETED',
      },
    });
    memberBProfileId = memBProfile.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // 1. CROSS-TENANT DEVICE & EVENT ISOLATION (Section 35 & 50)
  // =========================================================================

  describe('Cross-Tenant Device Isolation', () => {
    it('Device registered to Org B cannot submit events for Org A session (401 / Unauthorized)', async () => {
      // Owner of Org A calls device webhook presenting deviceBId (belongs to Org B)
      const res = await request(app.getHttpServer())
        .post('/api/v1/access/devices/events')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organisation-id', orgIdA)
        .send({
          deviceId: deviceBId,
          deviceEventId: `evt_rogue_${Date.now()}`,
          eventType: 'CHECK_IN',
        });

      // Must be rejected because device belongs to Org B
      expect(res.status).toBe(401);
    });

    it('Org A credential cannot unlock Org B device/outlet (DENIED)', async () => {
      const decision = await decisionService.canAccess({
        memberProfileId: memberAProfileId,
        outletId: outletBId,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('ORGANISATION_MISMATCH');
    });
  });

  // =========================================================================
  // 2. ANTI-IDOR SECURITY (Section 43)
  // =========================================================================

  describe('Anti-IDOR Protection', () => {
    it('Member A querying visit history with Member B ID receives only Member A visits', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/access/visits?memberProfileId=${memberBProfileId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-organisation-id', orgIdA);

      expect(res.status).toBe(200);
      const items = res.body.data.items || [];
      // All items must belong to Member A, never Member B
      for (const item of items) {
        expect(item.memberProfileId).toBe(memberAProfileId);
      }
    });
  });

  // =========================================================================
  // 3. RBAC ENFORCEMENT (Section 42)
  // =========================================================================

  describe('RBAC Security', () => {
    it('Ordinary member cannot create staff access override (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/access/overrides')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-organisation-id', orgIdA)
        .send({
          memberProfileId: memberAProfileId,
          outletId: outletAId,
          reason: 'MANAGER_APPROVAL',
          durationHours: 2,
        });

      expect(res.status).toBe(403);
    });

    it('Ordinary member cannot perform manual check-in (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/access/manual-checkin')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-organisation-id', orgIdA)
        .send({
          memberProfileId: memberAProfileId,
          outletId: outletAId,
        });

      expect(res.status).toBe(403);
    });

    it('Reception staff can create staff access override (201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/access/overrides')
        .set('Authorization', `Bearer ${receptionToken}`)
        .set('x-organisation-id', orgIdA)
        .send({
          memberProfileId: memberAProfileId,
          outletId: outletAId,
          reason: 'TECHNICAL_FAILURE',
          durationHours: 1,
          notes: 'RFID reader offline at entrance',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.reason).toBe('TECHNICAL_FAILURE');
      expect(res.body.data.status).toBe('ACTIVE');
    });
  });

  // =========================================================================
  // 4. ZERO SECRET LEAKAGE (Section 7 & 41)
  // =========================================================================

  describe('Zero Secret Leakage', () => {
    it('Dynamic QR token generation and credentials API never returns raw secrets or database keys', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/access/credentials/qr')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-organisation-id', orgIdA)
        .send({});

      expect(res.status).toBe(201);
      const data = res.body.data;
      expect(data.token).toBeDefined();
      expect(data.token.startsWith('FCQR.')).toBe(true);

      // Verify no member internal database ID is plaintext inside the token
      expect(data.token).not.toContain(memberAProfileId);
    });

    it('Access credentials list hides sensitive hash and secrets', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/access/credentials')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-organisation-id', orgIdA);

      expect(res.status).toBe(200);
      const creds = res.body.data;
      expect(Array.isArray(creds)).toBe(true);
      for (const cred of creds) {
        expect(cred.credentialReference).toBeUndefined(); // Scrubbed
        expect(cred.displayIdentifier).toBeDefined();
      }
    });
  });

  // =========================================================================
  // 5. FAIL-SAFE ACCESS BEHAVIOR (Section 37)
  // =========================================================================

  describe('Fail-Safe Access Behavior', () => {
    it('Disabled hardware device strictly defaults to DENIED', async () => {
      // Temporarily mark device as DISABLED
      await prisma.accessDevice.update({
        where: { id: deviceAId },
        data: { status: 'DISABLED' },
      });

      const decision = await decisionService.canAccess({
        memberProfileId: memberAProfileId,
        outletId: outletAId,
        deviceId: deviceAId,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('DEVICE_DISABLED');

      // Restore device
      await prisma.accessDevice.update({
        where: { id: deviceAId },
        data: { status: 'ONLINE' },
      });
    });

    it('Offline device strictly defaults to DENIED', async () => {
      await prisma.accessDevice.update({
        where: { id: deviceAId },
        data: { status: 'OFFLINE' },
      });

      const decision = await decisionService.canAccess({
        memberProfileId: memberAProfileId,
        outletId: outletAId,
        deviceId: deviceAId,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('DEVICE_OFFLINE');

      // Restore device
      await prisma.accessDevice.update({
        where: { id: deviceAId },
        data: { status: 'ONLINE' },
      });
    });
  });
});
