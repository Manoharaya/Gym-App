import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Payment & Billing Lifecycle (Day 6 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let memberToken: string;
  let activeMemberId: string;
  let activeMemberProfileId: string;
  let organisationId: string;
  let savedPaymentMethodId: string;
  let pendingMembershipId: string;

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

    // 1. Authenticate Owner
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@secondwind.com.au',
        password: defaultPassword,
      });
    ownerToken = ownerRes.body.data.accessToken;

    // 2. Authenticate Member
    const memberRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'active.member@secondwind.com.au',
        password: defaultPassword,
      });
    memberToken = memberRes.body.data.accessToken;
    activeMemberId = memberRes.body.data.user.id;

    const org = await prisma.organisation.findFirstOrThrow({
      where: { slug: 'second-wind' },
    });
    organisationId = org.id;

    const profile = await prisma.memberProfile.findUnique({
      where: { userId: activeMemberId },
    });
    activeMemberProfileId = profile!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Invoicing & Billing Calculation', () => {
    it('should create an invoice with calculated line items, taxes, and promotional discount in minor units', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organisation-id', organisationId)
        .send({
          memberProfileId: activeMemberProfileId,
          currency: 'AUD',
          discountCode: 'WELCOME10',
          taxRatePercentage: 10,
          items: [
            {
              description: 'Personal Training Pack (5 Sessions)',
              quantity: 1,
              unitAmountMinor: 35000, // $350.00
            },
            {
              description: 'Nutritional Consultation',
              quantity: 1,
              unitAmountMinor: 10000, // $100.00
            },
          ],
        });

      expect(res.status).toBe(201);
      const invoice = res.body.data;
      expect(invoice.invoiceNumber).toMatch(/^INV-/);
      expect(invoice.subtotalMinor).toBe(45000); // 35000 + 10000
      expect(invoice.discountMinor).toBe(4500); // 10% of 45000 = 4500
      expect(invoice.taxMinor).toBe(4500); // 10% on line items
      expect(invoice.totalMinor).toBe(45000); // 45000 - 4500 + 4500
      expect(invoice.amountDueMinor).toBe(45000);
      expect(invoice.status).toBe('OPEN');
      expect(invoice.lineItems).toHaveLength(2);
    });
  });

  describe('2. Tokenized Payment Methods (Zero Sensitive Card Data)', () => {
    it('should securely register a tokenized payment method without PAN or CVV', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payment-methods')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-organisation-id', organisationId)
        .send({
          memberProfileId: activeMemberProfileId,
          type: 'CARD',
          provider: 'MOCK',
          providerPaymentMethodId: 'pm_mock_visa_e2e_9999',
          brand: 'VISA',
          last4: '9999',
          expiryMonth: 10,
          expiryYear: 2029,
          isDefault: true,
        });

      expect(res.status).toBe(201);
      const method = res.body.data;
      savedPaymentMethodId = method.id;
      expect(method.brand).toBe('VISA');
      expect(method.last4).toBe('9999');
      expect(method.isDefault).toBe(true);
      expect(method.status).toBe('ACTIVE');

      // Verify DB contains zero sensitive card data
      const dbMethod = await prisma.paymentMethod.findUnique({
        where: { id: savedPaymentMethodId },
      });
      expect(dbMethod).not.toHaveProperty('cvv');
      expect(dbMethod).not.toHaveProperty('cardNumber');
      expect(dbMethod?.providerPaymentMethodId).toBe('pm_mock_visa_e2e_9999');
    });

    it('should list member saved payment methods', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/payment-methods')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-organisation-id', organisationId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.some((m: any) => m.id === savedPaymentMethodId)).toBe(true);
    });
  });

  describe('3. Payment-Membership Bridge & Lifecycle Activation', () => {
    let bridgeInvoiceId: string;

    beforeAll(async () => {
      const plan = await prisma.membershipPlan.findFirstOrThrow({
        where: { organisationId, status: 'ACTIVE' },
      });

      // Create a PENDING membership
      const membership = await prisma.memberMembership.create({
        data: {
          organisationId,
          memberProfileId: activeMemberProfileId,
          membershipPlanId: plan.id,
          status: 'PENDING',
          accessScope: 'ALL_ORGANISATION_OUTLETS',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          autoRenew: true,
          planNameAtPurchase: plan.name,
          priceAtPurchase: plan.price,
          currencyAtPurchase: plan.currency,
          billingTypeAtPurchase: plan.billingType,
          durationValueAtPurchase: plan.durationValue,
          durationUnitAtPurchase: plan.durationUnit,
        },
      });
      pendingMembershipId = membership.id;

      // Create an invoice tied to this pending membership
      const invoiceRes = await request(app.getHttpServer())
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organisation-id', organisationId)
        .send({
          memberProfileId: activeMemberProfileId,
          items: [
            {
              description: `Membership dues: ${plan.name}`,
              quantity: 1,
              unitAmountMinor: 11999,
              memberMembershipId: pendingMembershipId,
            },
          ],
        });

      bridgeInvoiceId = invoiceRes.body.data.id;
    });

    it('should process payment, mark invoice PAID, and trigger bridge to ACTIVATE membership', async () => {
      // Membership starts in PENDING
      const preCheck = await prisma.memberMembership.findUnique({
        where: { id: pendingMembershipId },
      });
      expect(preCheck?.status).toBe('PENDING');

      // Pay the invoice
      const payRes = await request(app.getHttpServer())
        .post('/api/v1/payments/charge')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-organisation-id', organisationId)
        .send({
          memberProfileId: activeMemberProfileId,
          invoiceId: bridgeInvoiceId,
          amountMinor: 11999,
          currency: 'AUD',
          paymentMethodId: savedPaymentMethodId,
        });

      expect(payRes.status).toBe(201);
      const tx = payRes.body.data;
      expect(tx.status).toBe('SUCCEEDED');
      expect(tx.amountMinor).toBe(11999);

      // Verify invoice transitioned to PAID
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: bridgeInvoiceId },
      });
      expect(updatedInvoice?.status).toBe('PAID');
      expect(updatedInvoice?.amountDueMinor).toBe(0);
      expect(updatedInvoice?.amountPaidMinor).toBe(11999);

      // Verify Payment-Membership Bridge activated the membership!
      const postCheck = await prisma.memberMembership.findUnique({
        where: { id: pendingMembershipId },
      });
      expect(postCheck?.status).toBe('ACTIVE');
      expect(postCheck?.activatedAt).toBeDefined();

      // Verify historical audit record was logged by the membership state machine
      const history = await prisma.memberMembershipHistory.findFirst({
        where: { memberMembershipId: pendingMembershipId, toStatus: 'ACTIVE' },
      });
      expect(history).toBeDefined();
      expect(history?.action).toBe('ACTIVATE');
    });
  });

  describe('4. Full & Partial Refunds with Cumulative Validation', () => {
    let refundTxId: string;
    let refundInvoiceId: string;

    beforeAll(async () => {
      // Create and pay an invoice for $100 (10000 minor)
      const invRes = await request(app.getHttpServer())
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organisation-id', organisationId)
        .send({
          memberProfileId: activeMemberProfileId,
          items: [{ description: 'Workshop Pass', quantity: 1, unitAmountMinor: 10000 }],
        });
      refundInvoiceId = invRes.body.data.id;

      const chargeRes = await request(app.getHttpServer())
        .post('/api/v1/payments/charge')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organisation-id', organisationId)
        .send({
          memberProfileId: activeMemberProfileId,
          invoiceId: refundInvoiceId,
          amountMinor: 10000,
          currency: 'AUD',
          paymentMethodId: savedPaymentMethodId,
        });
      refundTxId = chargeRes.body.data.id;
    });

    it('should process partial refund and transition status to PARTIALLY_REFUNDED', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organisation-id', organisationId)
        .send({
          paymentTransactionId: refundTxId,
          amountMinor: 3000, // Partial $30.00 refund
          reason: 'Customer cancelled 1 day before workshop',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('SUCCEEDED');
      expect(res.body.data.amountMinor).toBe(3000);

      // Verify transaction status is PARTIALLY_REFUNDED
      const tx = await prisma.paymentTransaction.findUnique({
        where: { id: refundTxId },
      });
      expect(tx?.status).toBe('PARTIALLY_REFUNDED');

      // Verify invoice amountDue increased and amountPaid decreased
      const inv = await prisma.invoice.findUnique({
        where: { id: refundInvoiceId },
      });
      expect(inv?.amountPaidMinor).toBe(7000);
      expect(inv?.amountDueMinor).toBe(3000);
      expect(inv?.status).toBe('OPEN');
    });

    it('should reject refund exceeding remaining refundable balance', async () => {
      // Remaining refundable balance is 7000. Trying to refund 8000.
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organisation-id', organisationId)
        .send({
          paymentTransactionId: refundTxId,
          amountMinor: 8000,
          reason: 'Over-refund attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('exceeds remaining refundable balance');
    });

    it('should process full refund of remaining balance and transition to REFUNDED', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organisation-id', organisationId)
        .send({
          paymentTransactionId: refundTxId,
          amountMinor: 7000, // Remaining $70.00
          reason: 'Full refund completion',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('SUCCEEDED');

      const tx = await prisma.paymentTransaction.findUnique({
        where: { id: refundTxId },
      });
      expect(tx?.status).toBe('REFUNDED');
    });
  });

  describe('5. Manual Staff Payments (Cash / POS)', () => {
    it('should record an in-gym cash payment and reconcile invoice', async () => {
      const invRes = await request(app.getHttpServer())
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organisation-id', organisationId)
        .send({
          memberProfileId: activeMemberProfileId,
          items: [{ description: 'Front-desk Shake & Towel', quantity: 1, unitAmountMinor: 1500 }],
        });
      const invoiceId = invRes.body.data.id;

      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/manual')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organisation-id', organisationId)
        .send({
          memberProfileId: activeMemberProfileId,
          invoiceId,
          amountMinor: 1500,
          currency: 'AUD',
          paymentMethodType: 'MANUAL_CASH',
          notes: 'Cash received at reception counter',
        });

      expect(res.status).toBe(201);
      const tx = res.body.data;
      expect(tx.status).toBe('SUCCEEDED');
      expect(tx.provider).toBe('MANUAL');
      expect(tx.paymentMethodType).toBe('MANUAL_CASH');

      const inv = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });
      expect(inv?.status).toBe('PAID');
      expect(inv?.amountPaidMinor).toBe(1500);
      expect(inv?.amountDueMinor).toBe(0);
    });
  });
});
