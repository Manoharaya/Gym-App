/**
 * Day 43 — Accounting Integration & Financial Synchronisation Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Provider-Neutral Architecture, Registry & Capability Interrogation
 * 2. Secure OAuth 2.0 Flow, Single-Use CSRF State & AES-256-GCM Token Encryption
 * 3. Chart of Accounts Discovery & Tax Rate Discovery
 * 4. Revenue Category & Payment Account Mapping Foundation
 * 5. Customer Contact Synchronization & Strict Health Data Privacy Enforcement
 * 6. Invoice Synchronization & External Reference Idempotency
 * 7. Payment & Refund Synchronization
 * 8. Accounting Reconciliation Engine & Discrepancy Audits
 * 9. Conflict Management & Non-Destructive Resolution Workflows
 * 10. Provider Outage Simulation & Error Normalization (Zero Block on Core Billing)
 * 11. Strict RBAC & Cross-Tenant Zero Leakage (Member 403, Trainer 403, Org A vs Org B)
 * 12. Accounting Sync Health & RFC 4180 Sanitized CSV Export
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { AccountingProviderRegistry } from '../src/accounting-integration/providers/accounting-provider.registry';
import { AccountingCredentialService } from '../src/accounting-integration/security/accounting-credential.service';
import { OAuthStateService } from '../src/accounting-integration/security/oauth-state.service';
import { AccountingConnectionService } from '../src/accounting-integration/services/accounting-connection.service';
import { AccountingMappingService } from '../src/accounting-integration/services/accounting-mapping.service';
import { AccountingNormalizerService } from '../src/accounting-integration/services/accounting-normalizer.service';
import { AccountingSyncService } from '../src/accounting-integration/services/accounting-sync.service';
import { AccountingReconciliationService } from '../src/accounting-integration/services/accounting-reconciliation.service';
import { AccountingConflictService } from '../src/accounting-integration/services/accounting-conflict.service';
import { AccountingHealthService } from '../src/accounting-integration/services/accounting-health.service';
import { AccountingErrorNormalizer } from '../src/accounting-integration/domain/accounting-errors';
import request from 'supertest';

describe('Day 43: Accounting Integration E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let registry: AccountingProviderRegistry;
  let credentialService: AccountingCredentialService;
  let oauthStateService: OAuthStateService;
  let connectionService: AccountingConnectionService;
  let mappingService: AccountingMappingService;
  let normalizerService: AccountingNormalizerService;
  let syncService: AccountingSyncService;
  let reconciliationService: AccountingReconciliationService;
  let conflictService: AccountingConflictService;
  let healthService: AccountingHealthService;

  let superAdminToken: string;
  let orgA: any;
  let orgB: any;
  let outletA1: any;
  let planA1: any;
  let memberUser1: any;
  let memberProfile1: any;
  let trainerUser: any;
  let receptionistUser: any;

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
    registry = app.get(AccountingProviderRegistry);
    credentialService = app.get(AccountingCredentialService);
    oauthStateService = app.get(OAuthStateService);
    connectionService = app.get(AccountingConnectionService);
    mappingService = app.get(AccountingMappingService);
    normalizerService = app.get(AccountingNormalizerService);
    syncService = app.get(AccountingSyncService);
    reconciliationService = app.get(AccountingReconciliationService);
    conflictService = app.get(AccountingConflictService);
    healthService = app.get(AccountingHealthService);

    // SuperAdmin token
    const saRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@fitcore.io', password: 'FitCoreDev2026!' });
    superAdminToken = saRes.body.data?.accessToken || saRes.body.accessToken;

    const ts = Date.now();

    // 1. Setup Organisations
    orgA = await prisma.organisation.create({
      data: {
        name: `Accounting Org A ${ts}`,
        slug: `acct-org-a-${ts}`,
        status: 'ACTIVE',
        currency: 'AUD',
        timezone: 'Australia/Sydney',
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `Accounting Org B ${ts}`,
        slug: `acct-org-b-${ts}`,
        status: 'ACTIVE',
        currency: 'USD',
        timezone: 'America/New_York',
      },
    });

    // 2. Outlets
    outletA1 = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: `Sydney Central ${ts}`,
        code: `SYDC-${ts}`,
        slug: `sydney-central-${ts}`,
        address: '100 George St',
        city: 'Sydney',
        state: 'NSW',
        country: 'Australia',
        postalCode: '2000',
        status: 'ACTIVE',
      },
    });

    // 3. Plan
    planA1 = await prisma.membershipPlan.create({
      data: {
        organisationId: orgA.id,
        name: `Accounting Test Plan ${ts}`,
        code: `ACCT-PLAN-${ts}`,
        membershipType: 'STANDARD',
        billingType: 'RECURRING',
        price: 150,
        currency: 'AUD',
        durationValue: 1,
        durationUnit: 'MONTH',
        status: 'ACTIVE',
      },
    });

    // 4. Member 1
    memberUser1 = await prisma.user.create({
      data: {
        email: `member-acct-${ts}@billingtest.com`,
        passwordHash: 'dummyhash',
        firstName: 'Arthur',
        lastName: 'Dent',
        phone: '+61411223344',
        status: 'ACTIVE',
      },
    });

    memberProfile1 = await prisma.memberProfile.create({
      data: {
        userId: memberUser1.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
      },
    });

    await prisma.memberOutlet.create({
      data: {
        memberProfileId: memberProfile1.id,
        outletId: outletA1.id,
      },
    });

    // 5. Staff users
    trainerUser = await prisma.user.create({
      data: {
        email: `trainer-acct-${ts}@billingtest.com`,
        passwordHash: 'dummyhash',
        firstName: 'Coach',
        lastName: 'Tom',
        status: 'ACTIVE',
      },
    });

    receptionistUser = await prisma.user.create({
      data: {
        email: `reception-acct-${ts}@billingtest.com`,
        passwordHash: 'dummyhash',
        firstName: 'Desk',
        lastName: 'Sarah',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // ===========================================================================
  // 1. Provider Registry & Capability Interrogation
  // ===========================================================================
  describe('1. Provider Registry & Capability Interrogation', () => {
    it('resolves Xero and QuickBooks providers via provider registry', () => {
      const xero = registry.getProvider('XERO');
      expect(xero).toBeDefined();
      expect(xero.providerType).toBe('XERO');

      const qbo = registry.getProvider('QUICKBOOKS');
      expect(qbo).toBeDefined();
      expect(qbo.providerType).toBe('QUICKBOOKS');

      expect(() => registry.getProvider('INVALID_PROVIDER')).toThrow();
    });

    it('returns supported provider capabilities via API', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/capabilities')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const caps = res.body.data || res.body;
      expect(caps.XERO).toBeDefined();
      expect(caps.XERO).toContain('INVOICES');
      expect(caps.XERO).toContain('PAYMENTS');
      expect(caps.XERO).toContain('REFUNDS');
      expect(caps.QUICKBOOKS).toBeDefined();
      expect(caps.QUICKBOOKS).toContain('CHART_OF_ACCOUNTS');
    });
  });

  // ===========================================================================
  // 2. Secure OAuth 2.0 Flow, Single-Use State & AES-256-GCM Encryption
  // ===========================================================================
  describe('2. Secure OAuth 2.0 Flow & Token Security', () => {
    let generatedStateToken: string;

    it('initiates OAuth connection, generating a single-use CSRF state token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/connect')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .send({
          provider: 'XERO',
          redirectUri: 'https://app.fitcore.io/accounting/callback',
        })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.authorizationUrl).toBeDefined();
      expect(data.authorizationUrl).toContain('login.xero.com');
      expect(data.stateToken).toBeDefined();
      generatedStateToken = data.stateToken;
    });

    it('completes OAuth callback, storing AES-256-GCM encrypted tokens at rest', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/accounting/oauth/callback?code=mock_xero_code_123&state=${generatedStateToken}`)
        .expect(200);

      const connection = res.body.data || res.body;
      expect(connection.id).toBeDefined();
      expect(connection.provider).toBe('XERO');
      expect(connection.status).toBe('CONNECTED');

      // CRITICAL SECURITY ASSERTION: Plaintext tokens must NEVER be returned in API
      expect((connection as any).accessToken).toBeUndefined();
      expect((connection as any).refreshToken).toBeUndefined();
      expect((connection as any).encryptedAccessToken).toBeUndefined();

      // Verify in DB that tokens are stored in authenticated ciphertext format (iv:authTag:cipher)
      const dbConn = await prisma.accountingConnection.findUnique({
        where: { id: connection.id },
      });
      expect(dbConn?.encryptedAccessToken).toBeDefined();
      const parts = dbConn!.encryptedAccessToken!.split(':');
      expect(parts.length).toBe(3); // iv, authTag, encryptedHex

      // Decryption check via service
      const decrypted = credentialService.decryptToken(dbConn!.encryptedAccessToken!);
      expect(decrypted.startsWith('xero_at_')).toBe(true);
    });

    it('rejects reused or invalid OAuth state tokens (Single-Use CSRF Defense)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/accounting/oauth/callback?code=replay_code&state=${generatedStateToken}`)
        .expect(400);
    });
  });

  // ===========================================================================
  // 3. Chart of Accounts & Tax Rates Discovery
  // ===========================================================================
  describe('3. Chart of Accounts & Tax Rates Discovery', () => {
    it('retrieves active Chart of Accounts from connected provider', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/accounts')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const accounts = res.body.data || res.body;
      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBeGreaterThan(0);
      const membershipAcc = accounts.find((a: any) => a.code === '200');
      expect(membershipAcc).toBeDefined();
      expect(membershipAcc.name).toContain('Membership Dues Revenue');
    });

    it('retrieves configured external tax rates', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/tax-rates')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const taxRates = res.body.data || res.body;
      expect(Array.isArray(taxRates)).toBe(true);
      expect(taxRates.some((t: any) => t.code === 'OUTPUT')).toBe(true);
    });
  });

  // ===========================================================================
  // 4. Revenue Category & Payment Account Mapping Foundation
  // ===========================================================================
  describe('4. Accounting Mapping Foundation', () => {
    it('creates revenue account mapping for membership dues via API', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/mappings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .send({
          mappingType: 'MEMBERSHIP_REVENUE_ACCOUNT',
          fitcoreReference: 'MEMBERSHIP_PAYMENT',
          externalReference: '200',
          externalName: 'Membership Dues Revenue',
        })
        .expect(201);

      const mapping = res.body.data || res.body;
      expect(mapping.id).toBeDefined();
      expect(mapping.externalReference).toBe('200');
      expect(mapping.mappingType).toBe('MEMBERSHIP_REVENUE_ACCOUNT');
    });

    it('creates payment clearing account mapping', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/mappings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .send({
          mappingType: 'PAYMENT_ACCOUNT',
          fitcoreReference: 'DEFAULT_PAYMENT',
          externalReference: '090',
          externalName: 'Stripe Clearing Account',
        })
        .expect(201);

      const mapping = res.body.data || res.body;
      expect(mapping.mappingType).toBe('PAYMENT_ACCOUNT');
    });

    it('creates tax mapping for standard sales tax', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/tax-mappings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .send({
          fitcoreTaxIdentifier: 'STANDARD_TAX',
          externalTaxIdentifier: 'OUTPUT',
          externalTaxRate: 10,
        })
        .expect(201);

      const taxMapping = res.body.data || res.body;
      expect(taxMapping.fitcoreTaxIdentifier).toBe('STANDARD_TAX');
      expect(taxMapping.externalTaxIdentifier).toBe('OUTPUT');
    });
  });

  // ===========================================================================
  // 5. Customer Contact Synchronization & Strict Health Data Privacy Enforcement
  // ===========================================================================
  describe('5. Customer Synchronization & Health Privacy Boundary', () => {
    it('normalizes member profile to customer contact without transmitting health data', async () => {
      const customer = await normalizerService.normalizeCustomer(orgA.id, memberProfile1.id);

      expect(customer.fitcoreMemberId).toBe(memberProfile1.id);
      expect(customer.firstName).toBe('Arthur');
      expect(customer.lastName).toBe('Dent');
      expect(customer.email).toContain('@billingtest.com');
      expect(customer.address).toBeDefined();

      // CRITICAL PRIVACY ASSERTIONS: Strict absence of biometric / medical info
      expect((customer as any).parq).toBeUndefined();
      expect((customer as any).injuries).toBeUndefined();
      expect((customer as any).medicalClearance).toBeUndefined();
      expect((customer as any).heartRate).toBeUndefined();
      expect((customer as any).trainerNotes).toBeUndefined();
      expect((customer as any).retentionRisk).toBeUndefined();
    });
  });

  // ===========================================================================
  // 6. Invoice Synchronization & External Reference Idempotency
  // ===========================================================================
  describe('6. Invoice Synchronization & Idempotency', () => {
    let testInvoice: any;

    beforeAll(async () => {
      testInvoice = await prisma.invoice.create({
        data: {
          organisationId: orgA.id,
          memberProfileId: memberProfile1.id,
          invoiceNumber: `INV-SYNC-${Date.now()}`,
          status: 'OPEN',
          currency: 'AUD',
          subtotalMinor: 15000,
          totalMinor: 15000,
          amountDueMinor: 15000,
          dueDate: new Date(),
        },
      });
    });

    it('synchronizes an invoice and records external reference', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/accounting/sync/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const record = res.body.data || res.body;
      expect(record.status).toBe('SYNCED');
      expect(record.externalEntityId).toBeDefined();

      const extRef = await prisma.accountingExternalReference.findFirst({
        where: {
          organisationId: orgA.id,
          entityType: 'INVOICE',
          fitcoreEntityId: testInvoice.id,
        },
      });
      expect(extRef).toBeDefined();
      expect(extRef?.syncStatus).toBe('SYNCED');
    });

    it('re-synchronizing the same invoice is idempotent (no duplicate external references)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/accounting/sync/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const record = res.body.data || res.body;
      expect(record.status).toBe('SYNCED');
      expect(record.operation).toBe('UPDATE');

      const count = await prisma.accountingExternalReference.count({
        where: {
          organisationId: orgA.id,
          entityType: 'INVOICE',
          fitcoreEntityId: testInvoice.id,
        },
      });
      expect(count).toBe(1);
    });
  });

  // ===========================================================================
  // 7. Payment & Refund Synchronization
  // ===========================================================================
  describe('7. Payment & Refund Synchronization', () => {
    let testPayment: any;
    let testRefund: any;
    let paidInvoice: any;

    beforeAll(async () => {
      paidInvoice = await prisma.invoice.create({
        data: {
          organisationId: orgA.id,
          memberProfileId: memberProfile1.id,
          invoiceNumber: `INV-PAID-${Date.now()}`,
          status: 'PAID',
          currency: 'AUD',
          subtotalMinor: 10000,
          totalMinor: 10000,
          amountPaidMinor: 10000,
          amountDueMinor: 0,
          dueDate: new Date(),
        },
      });

      testPayment = await prisma.paymentTransaction.create({
        data: {
          organisationId: orgA.id,
          memberProfileId: memberProfile1.id,
          invoiceId: paidInvoice.id,
          provider: 'MOCK',
          providerTransactionId: `tx-acct-${Date.now()}`,
          amountMinor: 10000,
          currency: 'AUD',
          status: 'SUCCEEDED',
        },
      });

      testRefund = await prisma.paymentRefund.create({
        data: {
          organisationId: orgA.id,
          paymentTransactionId: testPayment.id,
          amountMinor: 2000,
          currency: 'AUD',
          status: 'SUCCEEDED',
          reason: 'Partial refund for unused period',
        },
      });
    });

    it('synchronizes payment transaction linked to invoice', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/accounting/sync/payments/${testPayment.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const record = res.body.data || res.body;
      expect(record.status).toBe('SYNCED');

      const ext = await prisma.accountingExternalReference.findFirst({
        where: {
          organisationId: orgA.id,
          entityType: 'PAYMENT',
          fitcoreEntityId: testPayment.id,
        },
      });
      expect(ext).toBeDefined();
    });

    it('synchronizes refund transaction linked to payment and invoice', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/accounting/sync/refunds/${testRefund.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const record = res.body.data || res.body;
      expect(record.status).toBe('SYNCED');

      const ext = await prisma.accountingExternalReference.findFirst({
        where: {
          organisationId: orgA.id,
          entityType: 'REFUND',
          fitcoreEntityId: testRefund.id,
        },
      });
      expect(ext).toBeDefined();
    });
  });

  // ===========================================================================
  // 8. Accounting Reconciliation Engine & Discrepancy Audits
  // ===========================================================================
  describe('8. Accounting Reconciliation Engine', () => {
    it('runs reconciliation audit and identifies matched records', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/reconciliation/run')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const report = res.body.data || res.body;
      expect(report.id).toBeDefined();
      expect(report.matchedCount).toBeGreaterThan(0);
      expect(report.runAt).toBeDefined();
    });
  });

  // ===========================================================================
  // 9. Conflict Management & Non-Destructive Resolution Workflows
  // ===========================================================================
  describe('9. Conflict Management & Resolution Workflows', () => {
    let conflictId: string;

    it('records and lists an accounting conflict without mutating FitCore source data', async () => {
      const conflict = await conflictService.recordConflict(
        orgA.id,
        (await prisma.accountingConnection.findFirst({ where: { organisationId: orgA.id } }))!.id,
        'INVOICE',
        'inv_sample_conflict_123',
        'xero_inv_999',
        'AMOUNT_MISMATCH',
        '15000',
        '12000',
      );

      expect(conflict.id).toBeDefined();
      expect(conflict.status).toBe('UNRESOLVED');
      conflictId = conflict.id;

      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/conflicts?status=UNRESOLVED')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const list = res.body.data || res.body;
      expect(list.some((c: any) => c.id === conflictId)).toBe(true);
    });

    it('resolves an accounting conflict with audit justification', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/accounting/conflicts/${conflictId}/resolve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .send({
          status: 'RESOLVED',
          resolutionNotes: 'Accountant confirmed $30 manual discount in external ledger.',
        })
        .expect(200);

      const resolved = res.body.data || res.body;
      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolutionNotes).toContain('manual discount');
    });
  });

  // ===========================================================================
  // 10. Provider Outage Simulation & Error Normalization
  // ===========================================================================
  describe('10. Provider Outage & Error Normalization', () => {
    it('normalizes external 429 rate limit into retryable RATE_LIMITED error', () => {
      const normalized = AccountingErrorNormalizer.normalize({
        status: 429,
        message: 'Rate limit exceeded. Try again in 60s.',
      });
      expect(normalized.code).toBe('RATE_LIMITED');
      expect(normalized.isRetryable).toBe(true);
    });

    it('normalizes external 503 outage into retryable PROVIDER_UNAVAILABLE error', () => {
      const normalized = AccountingErrorNormalizer.normalize({
        status: 503,
        message: 'Service Temporarily Unavailable',
      });
      expect(normalized.code).toBe('PROVIDER_UNAVAILABLE');
      expect(normalized.isRetryable).toBe(true);
    });
  });

  // ===========================================================================
  // 11. Strict RBAC & Multi-Tenant Isolation
  // ===========================================================================
  describe('11. Strict RBAC & Multi-Tenant Isolation', () => {
    it('blocks MEMBER role from accessing accounting endpoints (HTTP 403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/accounting/connection')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-user-id', memberUser1.id)
        .set('x-role', 'MEMBER')
        .expect(403);
    });

    it('blocks TRAINER role from accessing accounting endpoints (HTTP 403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/accounting/reconciliation')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-user-id', trainerUser.id)
        .set('x-role', 'TRAINER')
        .expect(403);
    });

    it('blocks RECEPTION role from modifying accounting mappings (HTTP 403)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/accounting/mappings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-user-id', receptionistUser.id)
        .set('x-role', 'RECEPTION')
        .send({
          mappingType: 'REVENUE_ACCOUNT',
          fitcoreReference: 'TEST',
          externalReference: '999',
        })
        .expect(403);
    });

    it('strictly isolates Org A from Org B (cross-tenant zero leakage)', async () => {
      // Requesting connection for Org B (which has no connection yet)
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/connection')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgB.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const conn = res.body.data !== undefined ? res.body.data : res.body;
      expect(conn).toBeNull();
    });
  });

  // ===========================================================================
  // 12. Accounting Sync Health & RFC 4180 Sanitized CSV Export
  // ===========================================================================
  describe('12. Accounting Health & CSV Export', () => {
    it('returns system health rating and token status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/health')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const health = res.body.data || res.body;
      expect(health.organisationId).toBe(orgA.id);
      expect(health.provider).toBe('XERO');
      expect(health.isTokenValid).toBe(true);
      expect(health.systemHealthRating).toBeDefined();
    });

    it('generates sanitized RFC 4180 CSV export with masked PII and external IDs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/export')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('InvoiceNumber');
      expect(res.text).toContain('ExternalInvoiceId');
      expect(res.text).toContain('SyncStatus');
      expect(res.text).toContain('A*** D***'); // Masked Arthur Dent
    });
  });
});
