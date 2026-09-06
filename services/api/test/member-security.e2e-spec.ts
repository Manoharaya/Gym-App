import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Member Security & Health Isolation Matrix (Day 4 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let secondWindMemberToken: string;
  let secondWindMemberProfileId: string;
  let secondWindMemberUserId: string;

  let apexMemberToken: string;
  let apexMemberProfileId: string;

  let receptionToken: string;
  let ownerToken: string;

  let createdDocumentId: string;

  const defaultPassword = 'FitCoreDev2026!';

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

    // 1. Authenticate Second Wind Member (Alex Mercer)
    const swRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'member@secondwind.com.au', password: defaultPassword });
    secondWindMemberToken = swRes.body.data.accessToken;
    secondWindMemberUserId = swRes.body.data.user.id;

    const swProfile = await prisma.memberProfile.findUnique({
      where: { userId: secondWindMemberUserId },
    });
    secondWindMemberProfileId = swProfile!.id;

    // 2. Authenticate Apex Member (Chloe Price)
    const apexRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'member@apexstrength.com.au', password: defaultPassword });
    apexMemberToken = apexRes.body.data.accessToken;

    const apexProfile = await prisma.memberProfile.findUnique({
      where: { userId: apexRes.body.data.user.id },
    });
    apexMemberProfileId = apexProfile!.id;

    // 3. Authenticate Second Wind Reception (Emma Watson)
    const recRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'reception@secondwind.com.au', password: defaultPassword });
    receptionToken = recRes.body.data.accessToken;

    // 4. Authenticate Second Wind Owner (Jack Darling)
    const ownRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@secondwind.com.au', password: defaultPassword });
    ownerToken = ownRes.body.data.accessToken;

    // 5. Seed a medical document for Second Wind Member
    const doc = await prisma.memberDocument.create({
      data: {
        memberProfileId: secondWindMemberProfileId,
        documentType: 'MEDICAL_CLEARANCE',
        storageKey: `tenants/org_dev_secondwind_001/members/${secondWindMemberProfileId}/medical.pdf`,
        fileName: 'medical.pdf',
        mimeType: 'application/pdf',
        size: 102400,
        status: 'UPLOADED',
        uploadedById: secondWindMemberUserId,
      },
    });
    createdDocumentId = doc.id;
  });

  afterAll(async () => {
    if (createdDocumentId) {
      await prisma.memberDocument.delete({ where: { id: createdDocumentId } }).catch(() => {});
    }
    await app.close();
  });

  // -------------------------------------------------------------
  // A. Cross-Tenant Isolation
  // -------------------------------------------------------------
  it('1. Cross-Tenant Access: Second Wind Owner cannot view Apex Member -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/members/${apexMemberProfileId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('2. Cross-Tenant Access: Apex Member cannot view Second Wind Member -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/members/${secondWindMemberProfileId}`)
      .set('Authorization', `Bearer ${apexMemberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // -------------------------------------------------------------
  // B. Cross-Member IDOR
  // -------------------------------------------------------------
  it('3. IDOR Defense: Member A cannot view Member B profile via /members/:memberId -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/members/${apexMemberProfileId}`)
      .set('Authorization', `Bearer ${secondWindMemberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('4. IDOR Defense: Member A cannot patch Member B status -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/members/${apexMemberProfileId}`)
      .set('Authorization', `Bearer ${secondWindMemberToken}`)
      .send({ status: 'ACTIVE' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // -------------------------------------------------------------
  // C. Health Data & Medical Clearance Restriction
  // -------------------------------------------------------------
  it('5. Role Restriction: Reception staff blocked from medical clearance document -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/members/me/documents/${createdDocumentId}/download-url`)
      .set('Authorization', `Bearer ${receptionToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('6. Document Access: Owner can access member document within same tenant -> 200 OK', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/members/me/documents/${createdDocumentId}/download-url`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.downloadUrl).toBeDefined();
  });

  it('7. Document IDOR: Apex Member blocked from downloading Second Wind member document -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/members/me/documents/${createdDocumentId}/download-url`)
      .set('Authorization', `Bearer ${apexMemberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // -------------------------------------------------------------
  // D. Consent Immutability & Withdrawal
  // -------------------------------------------------------------
  it('8. Consent Immutability: Withdrawing consent preserves historical record with WITHDRAWN status', async () => {
    // 1. Record an optional consent (e.g. WEARABLE_DATA)
    const wearableType = await prisma.consentType.findUnique({
      where: { key: 'WEARABLE_DATA' },
      include: { versions: true },
    });

    const grantRes = await request(app.getHttpServer())
      .post('/api/v1/members/me/consents')
      .set('Authorization', `Bearer ${secondWindMemberToken}`)
      .send({
        consentTypeId: wearableType!.id,
        consentVersionId: wearableType!.versions[0].id,
        status: 'CONSENTED',
      });

    expect(grantRes.status).toBe(201);
    const consentRecordId = grantRes.body.data.id;

    // 2. Withdraw consent
    const withdrawRes = await request(app.getHttpServer())
      .post(`/api/v1/members/me/consents/${wearableType!.id}/withdraw`)
      .set('Authorization', `Bearer ${secondWindMemberToken}`);

    expect(withdrawRes.status).toBe(201);
    expect(withdrawRes.body.data.status).toBe('WITHDRAWN');
    expect(withdrawRes.body.data.withdrawnAt).toBeDefined();

    // 3. Verify record was preserved in database
    const dbRecord = await prisma.consentRecord.findUnique({
      where: { id: consentRecordId },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord!.status).toBe('WITHDRAWN');
    expect(dbRecord!.withdrawnAt).not.toBeNull();
  });
});
