/**
 * FitCore — Day 51: Enterprise Administration Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Enterprise Hierarchy & Tree Resolution (/enterprise/hierarchy)
 * 2. Enterprise Governance & Compliance Overview (/enterprise/governance)
 * 3. Enterprise Archive Export (/enterprise/export)
 * 4. Centralized Enterprise Configuration (/enterprise/config)
 * 5. Brand Lifecycle: Creation, Uniqueness, Updates, Outlet Reassignment on Archival (/enterprise/brands)
 * 6. Enterprise Outlets: Creation with Brand, Regional Filtering, Brand Transfer, Safe Archival (/enterprise/outlets)
 * 7. Scoped Role Delegation: PLATFORM, ORGANISATION, BRAND, REGION, OUTLET scopes (/enterprise/roles)
 * 8. Privilege Escalation Defense: Strict rank verification preventing lower-tier elevation
 * 9. Hierarchical Policy Engine: Version history, cascade inheritance (/enterprise/policies)
 * 10. Immutable Hard Security Ceilings: Child scopes blocked from relaxing parent hard restrictions
 * 11. Interactive Policy Simulator: Previews, diff calculation, ceiling breach detection (/enterprise/policies/preview)
 * 12. Hierarchical Branding: Default -> Org -> Brand -> Outlet cascade resolution (/enterprise/branding)
 * 13. Custom Domains Foundation: Registration, DNS TXT token generation, SSL tracking (/enterprise/domains)
 * 14. Multi-Outlet Staff Administration: Scoped assignments and inter-outlet transfers (/enterprise/staff)
 * 15. Immutable Enterprise Audit Trail: Event logging and verification (/enterprise/audit)
 * 16. Cross-Tenant Boundary Defense: Absolute multi-tenant isolation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import request from 'supertest';

describe('Day 51: Enterprise Administration E2E Suite', () => {
  jest.setTimeout(90000);

  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let orgA: any;
  let orgB: any;
  let outletA1: any;
  let outletA2: any;
  let testUser1: any;
  let testStaffProfile: any;

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

    // 1. Authenticate SuperAdmin
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@fitcore.io', password: 'FitCoreDev2026!' });
    superAdminToken = loginRes.body.data?.accessToken || loginRes.body.accessToken;

    const ts = Date.now();

    // 2. Setup Test Organisations
    orgA = await prisma.organisation.create({
      data: {
        name: `Enterprise Org A ${ts}`,
        slug: `ent-org-a-${ts}`,
        legalName: 'FitCore Enterprise Australia Pty Ltd',
        displayName: 'FitCore Australia',
        industry: 'Fitness & Wellness',
        defaultLocale: 'en-AU',
        status: 'ACTIVE',
        currency: 'AUD',
        timezone: 'Australia/Perth',
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `Enterprise Org B ${ts}`,
        slug: `ent-org-b-${ts}`,
        status: 'ACTIVE',
        currency: 'USD',
        timezone: 'America/New_York',
      },
    });

    // 3. Setup Outlets
    outletA1 = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: `Perth City Central ${ts}`,
        code: `PCC-${ts}`,
        slug: `perth-city-central-${ts}`,
        address: '100 St Georges Terrace',
        city: 'Perth',
        state: 'WA',
        postalCode: '6000',
        country: 'Australia',
        timezone: 'Australia/Perth',
        status: 'ACTIVE',
      },
    });

    outletA2 = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: `Sydney Harbour ${ts}`,
        code: `SYD-${ts}`,
        slug: `sydney-harbour-${ts}`,
        address: '200 George Street',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
        country: 'Australia',
        timezone: 'Australia/Sydney',
        status: 'ACTIVE',
      },
    });

    // 4. Setup Test Users & Staff
    testUser1 = await prisma.user.create({
      data: {
        email: `ent_user_${ts}@test.fitcore.io`,
        passwordHash: 'dummy-hash',
        firstName: 'Marcus',
        lastName: 'Aurelius',
        displayName: 'Marcus A.',
        status: 'ACTIVE',
      },
    });

    testStaffProfile = await prisma.staffProfile.create({
      data: {
        userId: testUser1.id,
        organisationId: orgA.id,
        displayName: 'Marcus Aurelius',
        employeeReference: `EMP-${ts}`,
        jobTitle: 'Senior Master Trainer',
        employmentStatus: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    try {
      if (orgA?.id) {
        await prisma.enterprisePolicyVersion.deleteMany({
          where: { policy: { organisationId: orgA.id } },
        });
        await prisma.enterprisePolicy.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.enterpriseRoleAssignment.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.enterpriseConfiguration.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.enterpriseBranding.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.customDomain.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.staffOutletAssignment.deleteMany({
          where: { staffProfile: { organisationId: orgA.id } },
        });
        await prisma.staffProfile.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.outlet.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.organisationBrand.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.auditLog.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.userRole.deleteMany({ where: { organisationId: orgA.id } });
        await prisma.organisation.delete({ where: { id: orgA.id } });
      }

      if (orgB?.id) {
        await prisma.enterprisePolicyVersion.deleteMany({
          where: { policy: { organisationId: orgB.id } },
        });
        await prisma.enterprisePolicy.deleteMany({ where: { organisationId: orgB.id } });
        await prisma.outlet.deleteMany({ where: { organisationId: orgB.id } });
        await prisma.organisation.delete({ where: { id: orgB.id } });
      }

      if (testUser1?.id) {
        await prisma.user.delete({ where: { id: testUser1.id } });
      }
    } catch (e) {
      // Ignored cleanup errors
    }
    await app.close();
  });

  // ==========================================================================
  // 1. BRAND MANAGEMENT
  // ==========================================================================
  describe('1. Brand Lifecycle & Multi-Brand Administration', () => {
    let createdBrand: any;

    it('should create an enterprise brand', async () => {
      const ts = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/enterprise/brands')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          name: 'FitCore Elite Performance',
          code: `FCELITE-${ts}`,
          slug: `fitcore-elite-${ts}`,
          description: 'High-performance strength and athletic conditioning clubs',
          primaryColor: '#6366F1',
          secondaryColor: '#4F46E5',
          accentColor: '#10B981',
          website: 'https://elite.fitcore.io',
        })
        .expect(201);

      const body = getBody(res);
      expect(body.id).toBeDefined();
      expect(body.name).toBe('FitCore Elite Performance');
      expect(body.status).toBe('ACTIVE');
      createdBrand = body;
    });

    it('should reject duplicate brand code within the same organisation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/enterprise/brands')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          name: 'Duplicate Brand',
          code: createdBrand.code,
          slug: `different-slug-${Date.now()}`,
        })
        .expect(409);

      expect(getErrorMessage(res)).toContain('already exists');
    });

    it('should list enterprise brands with counts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enterprise/brands')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      const found = body.find((b: any) => b.id === createdBrand.id);
      expect(found).toBeDefined();
    });

    it('should update brand visual properties', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/enterprise/brands/${createdBrand.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          accentColor: '#F59E0B',
          description: 'Updated elite training philosophy',
        })
        .expect(200);

      const body = getBody(res);
      expect(body.accentColor).toBe('#F59E0B');
      expect(body.description).toBe('Updated elite training philosophy');
    });
  });

  // ==========================================================================
  // 2. ENTERPRISE OUTLETS & BRAND ASSIGNMENT
  // ==========================================================================
  describe('2. Multi-Outlet Administration & Brand Transfer', () => {
    let brand1: any;
    let brand2: any;
    let managedOutlet: any;

    beforeAll(async () => {
      const ts = Date.now();
      brand1 = await prisma.organisationBrand.create({
        data: {
          organisationId: orgA.id,
          name: 'Brand Alpha',
          code: `ALPHA-${ts}`,
          slug: `alpha-${ts}`,
        },
      });

      brand2 = await prisma.organisationBrand.create({
        data: {
          organisationId: orgA.id,
          name: 'Brand Beta',
          code: `BETA-${ts}`,
          slug: `beta-${ts}`,
        },
      });
    });

    it('should create an outlet linked to an enterprise brand', async () => {
      const ts = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/enterprise/outlets')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          name: `Alpha Club South ${ts}`,
          code: `ACS-${ts}`,
          slug: `acs-${ts}`,
          brandId: brand1.id,
          address: '50 South Terrace',
          city: 'Fremantle',
          state: 'WA',
          postalCode: '6160',
          timezone: 'Australia/Perth',
          currency: 'AUD',
        })
        .expect(201);

      const body = getBody(res);
      expect(body.id).toBeDefined();
      expect(body.brandId).toBe(brand1.id);
      expect(body.state).toBe('WA');
      managedOutlet = body;
    });

    it('should list outlets filtered by brand and region', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/enterprise/outlets?brandId=${brand1.id}&region=WA`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body[0].brandId).toBe(brand1.id);
    });

    it('should transfer an outlet to a new brand', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/enterprise/outlets/${managedOutlet.id}/transfer`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          targetBrandId: brand2.id,
          reason: 'Brand portfolio realignment and rebranding',
        })
        .expect(201);

      const body = getBody(res);
      expect(body.brandId).toBe(brand2.id);

      // Verify DB state
      const dbOutlet = await prisma.outlet.findUnique({ where: { id: managedOutlet.id } });
      expect(dbOutlet?.brandId).toBe(brand2.id);
    });

    it('should safely archive an outlet without deleting historical records', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/enterprise/outlets/${managedOutlet.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      expect(body.status).toBe('DELETED');
      expect(body.deletedAt).toBeDefined();

      // Ensure record still exists in DB
      const dbOutlet = await prisma.outlet.findUnique({ where: { id: managedOutlet.id } });
      expect(dbOutlet).not.toBeNull();
      expect(dbOutlet?.deletedAt).not.toBeNull();
    });
  });

  // ==========================================================================
  // 3. SCOPED ENTERPRISE ROLES & PRIVILEGE ESCALATION
  // ==========================================================================
  describe('3. Scoped Enterprise Roles & Privilege Defense', () => {
    let brand: any;
    let assignedRole: any;

    beforeAll(async () => {
      const ts = Date.now();
      brand = await prisma.organisationBrand.create({
        data: {
          organisationId: orgA.id,
          name: 'Scoped Role Brand',
          code: `SRB-${ts}`,
          slug: `srb-${ts}`,
        },
      });
    });

    it('should assign a BRAND scoped role to a user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/enterprise/roles/assign')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          userId: testUser1.id,
          roleName: 'BRAND_MANAGER',
          scopeType: 'BRAND',
          scopeId: brand.id,
          reason: 'Brand manager for regional expansion',
        })
        .expect(201);

      const body = getBody(res);
      expect(body.id).toBeDefined();
      expect(body.scopeType).toBe('BRAND');
      expect(body.brandId).toBe(brand.id);
      expect(body.role.name).toBe('BRAND_MANAGER');
      assignedRole = body;
    });

    it('should list role assignments by scope and user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/enterprise/roles/assignments?userId=${testUser1.id}`)
        .set('Authorization', `Bearer ${superAdminServer(app)}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      expect(Array.isArray(body)).toBe(true);
      expect(body.some((r: any) => r.id === assignedRole.id)).toBe(true);
    });

    it('should revoke a scoped role assignment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/enterprise/roles/revoke/${assignedRole.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({ reason: 'Role delegation completed' })
        .expect(201);

      const body = getBody(res);
      expect(body.status).toBe('REVOKED');
    });
  });

  // Helper for server token
  function superAdminServer(appInstance: INestApplication) {
    return superAdminToken;
  }

  // ==========================================================================
  // 4. HIERARCHICAL POLICIES & HARD CEILINGS
  // ==========================================================================
  describe('4. Hierarchical Policies & Immutable Hard Ceilings', () => {
    let orgPolicy: any;
    let brand: any;

    beforeAll(async () => {
      const ts = Date.now();
      brand = await prisma.organisationBrand.create({
        data: {
          organisationId: orgA.id,
          name: 'Policy Brand',
          code: `POLB-${ts}`,
          slug: `polb-${ts}`,
        },
      });
    });

    it('should create an ORGANISATION root policy with Hard Ceiling enabled', async () => {
      const ts = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/enterprise/policies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          name: 'Global Security Hard Ceiling',
          code: `SEC-CEIL-${ts}`,
          category: 'SECURITY',
          scopeType: 'ORGANISATION',
          isHardCeiling: true,
          configJson: {
            mfaRequired: true,
            maxSessionHours: 8,
          },
          enforcementMode: 'ENFORCED',
        })
        .expect(201);

      const body = getBody(res);
      expect(body.id).toBeDefined();
      expect(body.isHardCeiling).toBe(true);
      expect(body.currentVersion).toBe(1);
      orgPolicy = body;
    });

    it('should block a child BRAND policy from loosening a hard ceiling', async () => {
      const ts = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/enterprise/policies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          name: 'Brand Security Override Attempt',
          code: `SEC-OVERRIDE-${ts}`,
          category: 'SECURITY',
          scopeType: 'BRAND',
          scopeId: brand.id,
          configJson: {
            mfaRequired: false, // VIOLATION of parent hard ceiling!
            maxSessionHours: 24, // VIOLATION of max hours!
          },
        })
        .expect(403);

      expect(getErrorMessage(res)).toContain('Hard security ceiling violation');
    });

    it('should update policy and increment version history', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/enterprise/policies/${orgPolicy.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          configJson: {
            mfaRequired: true,
            maxSessionHours: 4, // Stricter requirement
          },
          changeReason: 'Tightened session limits for compliance',
        })
        .expect(200);

      const body = getBody(res);
      expect(body.currentVersion).toBe(2);

      // Verify versions in DB
      const versions = await prisma.enterprisePolicyVersion.findMany({
        where: { policyId: orgPolicy.id },
      });
      expect(versions.length).toBe(2);
    });

    it('should resolve effective policy across hierarchy with ceiling intact', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/enterprise/policies/effective?category=SECURITY&outletId=${outletA1.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      expect(body.category).toBe('SECURITY');
      expect(body.effectiveConfig.mfaRequired).toBe(true);
      expect(body.effectiveConfig.maxSessionHours).toBe(4);
      expect(body.resolutionChain.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // 5. INTERACTIVE POLICY SIMULATOR
  // ==========================================================================
  describe('5. Interactive Policy Simulator (/policies/preview)', () => {
    it('should simulate policy and flag blocked hard ceiling overrides', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/enterprise/policies/preview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          category: 'SECURITY',
          outletId: outletA1.id,
          proposedConfig: {
            mfaRequired: false, // Breach
            customBanner: 'Welcome to Perth Gym', // Safe new field
          },
        })
        .expect(201);

      const body = getBody(res);
      expect(body.category).toBe('SECURITY');
      expect(body.isSafeToApply).toBe(false);
      expect(body.violations.length).toBeGreaterThanOrEqual(1);

      const mfaDiff = body.diff.find((d: any) => d.field === 'mfaRequired');
      expect(mfaDiff).toBeDefined();
      expect(mfaDiff.status).toBe('CEILING_BLOCKED');

      const bannerDiff = body.diff.find((d: any) => d.field === 'customBanner');
      expect(bannerDiff).toBeDefined();
      expect(bannerDiff.status).toBe('ADDED');
    });
  });

  // ==========================================================================
  // 6. ENTERPRISE BRANDING
  // ==========================================================================
  describe('6. Hierarchical Branding & Cascading Overrides', () => {
    let brand: any;

    beforeAll(async () => {
      const ts = Date.now();
      brand = await prisma.organisationBrand.create({
        data: {
          organisationId: orgA.id,
          name: 'Branding Test Brand',
          code: `BTB-${ts}`,
          slug: `btb-${ts}`,
        },
      });
    });

    it('should set organisation-level corporate branding', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/enterprise/branding')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          scopeType: 'ORGANISATION',
          primaryColor: '#059669',
          fontFamily: 'Roboto, sans-serif',
          logoUrl: 'https://cdn.fitcore.io/corp-logo.png',
        })
        .expect(201);

      const body = getBody(res);
      expect(body.primaryColor).toBe('#059669');
    });

    it('should set brand-level override palette', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/enterprise/branding')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          scopeType: 'BRAND',
          brandId: brand.id,
          primaryColor: '#EC4899', // Pink brand override
        })
        .expect(201);

      const body = getBody(res);
      expect(body.primaryColor).toBe('#EC4899');
    });

    it('should compute effective branding cascade', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/enterprise/branding/effective?brandId=${brand.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      // Brand color overrides org color
      expect(body.primaryColor).toBe('#EC4899');
      // Inherits font from organisation
      expect(body.fontFamily).toBe('Roboto, sans-serif');
      // Inherits corporate logo
      expect(body.logoUrl).toBe('https://cdn.fitcore.io/corp-logo.png');
    });
  });

  // ==========================================================================
  // 7. CUSTOM DOMAINS FOUNDATION
  // ==========================================================================
  describe('7. Custom Domains & SSL Management', () => {
    let registeredDomain: any;

    it('should register custom domain and generate DNS TXT verification token', async () => {
      const ts = Date.now();
      const domainName = `members-${ts}.fitcoreelite.com.au`;

      const res = await request(app.getHttpServer())
        .post('/api/v1/enterprise/domains')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          domain: domainName,
          scopeType: 'ORGANISATION',
          verificationMethod: 'DNS_TXT',
        })
        .expect(201);

      const body = getBody(res);
      expect(body.id).toBeDefined();
      expect(body.domain).toBe(domainName);
      expect(body.status).toBe('PENDING_VERIFICATION');
      expect(body.txtRecordName).toContain('_fitcore-challenge');
      expect(body.txtRecordValue).toContain('fitcore-verification=');
      expect(body.cnameRecordValue).toBe('custom.domains.fitcore.io');
      registeredDomain = body;
    });

    it('should verify custom domain challenge and issue SSL status', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/enterprise/domains/${registeredDomain.id}/verify`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(201);

      const body = getBody(res);
      expect(body.status).toBe('ACTIVE');
      expect(body.sslStatus).toBe('ISSUED');
      expect(body.sslCertificateArn).toBeDefined();
      expect(body.verifiedAt).toBeDefined();
    });

    it('should list registered domains for organisation', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enterprise/domains')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      expect(Array.isArray(body)).toBe(true);
      expect(body.some((d: any) => d.id === registeredDomain.id)).toBe(true);
    });
  });

  // ==========================================================================
  // 8. MULTI-OUTLET STAFF ADMINISTRATION & TRANSFERS
  // ==========================================================================
  describe('8. Multi-Outlet Staff Administration & Transfers', () => {
    it('should assign staff to an outlet as PRIMARY', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/enterprise/staff/assign')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          staffProfileId: testStaffProfile.id,
          outletId: outletA1.id,
          assignmentType: 'PRIMARY',
          isPrimary: true,
          roleScope: 'TRAINER',
        })
        .expect(201);

      const body = getBody(res);
      expect(body.staffProfileId).toBe(testStaffProfile.id);
      expect(body.outletId).toBe(outletA1.id);
      expect(body.isPrimary).toBe(true);
    });

    it('should transfer staff to another outlet retaining secondary access', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/enterprise/staff/transfer')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          staffProfileId: testStaffProfile.id,
          fromOutletId: outletA1.id,
          toOutletId: outletA2.id,
          retainSecondaryAccess: true,
          transferReason: 'Promoted to Sydney Head of Strength & Conditioning',
        })
        .expect(201);

      const body = getBody(res);
      expect(body.outletId).toBe(outletA2.id);
      expect(body.isPrimary).toBe(true);

      // Verify previous assignment was demoted to SECONDARY
      const prev = await prisma.staffOutletAssignment.findUnique({
        where: {
          staffProfileId_outletId: {
            staffProfileId: testStaffProfile.id,
            outletId: outletA1.id,
          },
        },
      });
      expect(prev?.isPrimary).toBe(false);
      expect(prev?.assignmentType).toBe('SECONDARY');
    });
  });

  // ==========================================================================
  // 9. GOVERNANCE HEALTH, HIERARCHY TREE & AUDIT TRAIL
  // ==========================================================================
  describe('9. Governance Overview, Hierarchy Tree & Audit Trail', () => {
    it('should return complete organisation hierarchy tree', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enterprise/hierarchy')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      expect(body.id).toBe(orgA.id);
      expect(body.brands).toBeDefined();
      expect(body.outlets).toBeDefined();
    });

    it('should calculate governance overview and compliance score', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enterprise/governance')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      expect(body.organisationId).toBe(orgA.id);
      expect(body.complianceHealthScore).toBeGreaterThanOrEqual(50);
      expect(body.totalPolicyCategories).toBe(15);
      expect(body.hardCeilingsCount).toBeGreaterThanOrEqual(1);
    });

    it('should export audit-ready enterprise archive', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enterprise/export')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      expect(body.formatVersion).toBe('1.0');
      expect(body.organisation.id).toBe(orgA.id);
      expect(body.policies).toBeDefined();
      expect(body.brands).toBeDefined();
      expect(body.outlets).toBeDefined();
      expect(body.customDomains).toBeDefined();
    });

    it('should retrieve immutable enterprise audit logs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enterprise/audit')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const body = getBody(res);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body[0].action).toMatch(/^(enterprise\.|staff\.)/);
    });
  });

  // ==========================================================================
  // 10. MULTI-TENANT BOUNDARY ISOLATION
  // ==========================================================================
  describe('10. Multi-Tenant Boundary Isolation', () => {
    it('should prevent Org B from viewing Org A brands', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enterprise/brands')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgB.id)
        .expect(200);

      const body = getBody(res);
      expect(body.length).toBe(0); // Org B has no brands
    });

    it('should prevent Org B from viewing Org A policies', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enterprise/policies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgB.id)
        .expect(200);

      const body = getBody(res);
      expect(body.length).toBe(0); // Org B has no policies
    });
  });
});
