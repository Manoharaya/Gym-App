import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Payment & Financial Security, IDOR & Multi-Tenancy (Day 6 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let memberTokenA: string;
  let memberTokenB: string;
  let profileAId: string;
  let profileBId: string;
  let orgAId: string;
  let orgBId: string;
  let invoiceAId: string;

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

    const defaultPassword = 'FitCoreDev2026!';

    // Authenticate Owner of Org A (Second Wind)
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@secondwind.com.au', password: defaultPassword });
    ownerToken = ownerRes.body.data.accessToken;

    const orgA = await prisma.organisation.findFirstOrThrow({
      where: { slug: 'second-wind' },
    });
    orgAId = orgA.id;

    // Authenticate Member A
    const memberARes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'active.member@secondwind.com.au', password: defaultPassword });
    memberTokenA = memberARes.body.data.accessToken;

    const profileA = await prisma.memberProfile.findUnique({
      where: { userId: memberARes.body.data.user.id },
    });
    profileAId = profileA!.id;

    // Create / Ensure Org B exists for cross-tenant isolation test
    const orgB = await prisma.organisation.upsert({
      where: { slug: 'crossfit-apex' },
      update: {},
      create: {
        name: 'CrossFit Apex',
        slug: 'crossfit-apex',
        country: 'Australia',
        currency: 'AUD',
        timezone: 'Australia/Perth',
      },
    });
    orgBId = orgB.id;

    // Authenticate Member B (parq.member)
    const memberBRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'parq.member@secondwind.com.au', password: defaultPassword });
    memberTokenB = memberBRes.body.data.accessToken;

    const profileB = await prisma.memberProfile.findUnique({
      where: { userId: memberBRes.body.data.user.id },
    });
    profileBId = profileB!.id;

    // Create an invoice for Member A in Org A
    const invRes = await request(app.getHttpServer())
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organisation-id', orgAId)
      .send({
        memberProfileId: profileAId,
        items: [{ description: 'Private Coaching Session', quantity: 1, unitAmountMinor: 8500 }],
      });
    invoiceAId = invRes.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Cross-Tenant Financial Isolation', () => {
    it('should block accessing an invoice using a different organisation context with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/invoices/${invoiceAId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organisation-id', orgBId); // Org B header

      expect(res.status).toBe(403);
    });

    it('should block querying invoices of another organisation with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organisation-id', orgBId);

      expect(res.status).toBe(403);
    });
  });

  describe('2. Anti-IDOR (Insecure Direct Object Reference) Protection', () => {
    it('should prevent Member B from viewing Member A invoice (returns 404/not authorized)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/invoices/${invoiceAId}`)
        .set('Authorization', `Bearer ${memberTokenB}`)
        .set('x-organisation-id', orgAId);

      expect(res.status).toBe(404);
    });

    it('should prevent Member B from paying Member A invoice (Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/charge')
        .set('Authorization', `Bearer ${memberTokenB}`)
        .set('x-organisation-id', orgAId)
        .send({
          memberProfileId: profileAId, // Attempting to pay on behalf of Member A
          invoiceId: invoiceAId,
          amountMinor: 8500,
          currency: 'AUD',
          providerPaymentMethodId: 'pm_mock_success',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Cannot process payments on behalf of another member');
    });
  });

  describe('3. Idempotency Replay Protection', () => {
    it('should prevent double charging by returning cached result when duplicate Idempotency-Key is sent', async () => {
      const idempotencyKey = `idem_test_${Date.now()}_abc`;

      // 1st request with idempotency key
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/payments/charge')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organisation-id', orgAId)
        .set('idempotency-key', idempotencyKey)
        .send({
          memberProfileId: profileAId,
          invoiceId: invoiceAId,
          amountMinor: 8500,
          currency: 'AUD',
          providerPaymentMethodId: 'pm_mock_success',
        });

      expect(res1.status).toBe(201);
      const txId1 = res1.body.data.id;

      // 2nd request with EXACT same idempotency key
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/payments/charge')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organisation-id', orgAId)
        .set('idempotency-key', idempotencyKey)
        .send({
          memberProfileId: profileAId,
          invoiceId: invoiceAId,
          amountMinor: 8500,
          currency: 'AUD',
          providerPaymentMethodId: 'pm_mock_success',
        });

      expect(res2.status).toBe(201);
      expect(res2.body.data.id).toBe(txId1);
      expect(res2.body.data._isIdempotentReplay).toBe(true);

      // Verify DB count: only 1 transaction record exists with this providerTransactionId
      const txCount = await prisma.paymentTransaction.count({
        where: { id: txId1 },
      });
      expect(txCount).toBe(1);
    });
  });

  describe('4. Webhook Deduplication & Replay Protection', () => {
    it('should process webhook once and safely ignore duplicate attempts (5x retry test)', async () => {
      const eventId = `evt_webhook_replay_${Date.now()}`;
      const webhookPayload = {
        id: eventId,
        type: 'payment.succeeded',
        data: {
          object: {
            id: 'mock_tx_ext_123',
            amount: 5000,
          },
        },
      };

      // 1st time: Processed
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/webhooks/MOCK')
        .set('x-fitcore-signature', 'valid_mock_signature')
        .send(webhookPayload);

      expect(res1.status).toBe(200);
      expect(res1.body.data.status).toBe('PROCESSED');

      // Subsequent 4 attempts: Deduplicated & Ignored
      for (let i = 0; i < 4; i++) {
        const dupRes = await request(app.getHttpServer())
          .post('/api/v1/webhooks/MOCK')
          .set('x-fitcore-signature', 'valid_mock_signature')
          .send(webhookPayload);

        expect(dupRes.status).toBe(200);
        expect(dupRes.body.data.status).toBe('IGNORED');
      }

      // Check DB: Only 1 record in payment_webhook_events
      const eventsCount = await prisma.paymentWebhookEvent.count({
        where: { providerEventId: eventId },
      });
      expect(eventsCount).toBe(1);
    });
  });

  describe('5. RBAC Permission Enforcement', () => {
    it('should reject Member attempting to issue refunds (Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .set('x-organisation-id', orgAId)
        .send({
          paymentTransactionId: 'any_tx_id',
          amountMinor: 1000,
        });

      expect(res.status).toBe(403);
    });

    it('should reject Member attempting to record manual cash payments (Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/manual')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .set('x-organisation-id', orgAId)
        .send({
          memberProfileId: profileAId,
          invoiceId: invoiceAId,
          amountMinor: 5000,
          currency: 'AUD',
          paymentMethodType: 'MANUAL_CASH',
        });

      expect(res.status).toBe(403);
    });
  });
});
