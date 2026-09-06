import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Member Lifecycle & Onboarding Flow (Day 4 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let parqQuestionnaireId: string;
  let questions: any[] = [];
  let mandatoryConsentTypes: any[] = [];

  const testEmail = `athlete.lifecycle.${Date.now()}@secondwind.com.au`;
  const testPassword = 'Password123!';

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
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  it('1. POST /auth/register - Should register a new member with NOT_STARTED onboarding status', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'John',
        lastName: 'Athlete',
        phone: '+61 411 222 333',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();

    authToken = res.body.data.accessToken;
    userId = res.body.data.user.id;
  });

  it('2. GET /members/me - Should retrieve member profile with status ONBOARDING & onboardingStatus NOT_STARTED', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/members/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBe(userId);
    expect(res.body.data.status).toBe('ONBOARDING');
    expect(res.body.data.onboardingStatus).toBe('NOT_STARTED');
  });

  it('3. POST /members/me/onboarding/start - Should transition onboarding status to IN_PROGRESS', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/members/me/onboarding/start')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('IN_PROGRESS');
    expect(res.body.data.currentStep).toBe('PROFILE');
    expect(res.body.data.progress.percentage).toBeLessThan(100);
  });

  it('4. POST /members/me/onboarding/complete - Should REJECT completion if requirements are incomplete', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/members/me/onboarding/complete')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('5. PATCH /members/me - Should update personal profile details and emergency contact', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/members/me')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        preferredName: 'Johnny',
        dateOfBirth: '1998-07-20T00:00:00.000Z',
        gender: 'MALE',
        emergencyContactName: 'Jane Athlete',
        emergencyContactPhone: '+61 400 999 888',
        emergencyContactRelationship: 'Sister',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.preferredName).toBe('Johnny');
    expect(res.body.data.emergencyContactName).toBe('Jane Athlete');
  });

  it('6. GET /members/me/parq - Should fetch active PAR-Q questionnaire with questions', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/members/me/parq')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.questionnaire).toBeDefined();
    expect(res.body.data.questionnaire.version).toBe('2024.1');
    expect(res.body.data.questionnaire.questions.length).toBeGreaterThanOrEqual(7);

    parqQuestionnaireId = res.body.data.questionnaire.id;
    questions = res.body.data.questionnaire.questions;
  });

  it('7. POST /members/me/parq/draft - Should save draft PAR-Q responses', async () => {
    const draftResponses = [
      { questionId: questions[0].id, answer: { value: false } },
      { questionId: questions[1].id, answer: { value: false } },
    ];

    const res = await request(app.getHttpServer())
      .post('/api/v1/members/me/parq/draft')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        questionnaireId: parqQuestionnaireId,
        responses: draftResponses,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('DRAFT');
  });

  it('8. POST /members/me/parq/submit - Should finalize and immutably submit PAR-Q responses', async () => {
    const allResponses = questions.map((q) => ({
      questionId: q.id,
      answer: { value: false },
    }));

    const res = await request(app.getHttpServer())
      .post('/api/v1/members/me/parq/submit')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        questionnaireId: parqQuestionnaireId,
        responses: allResponses,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.responses.length).toBe(questions.length);
  });

  it('9. GET /members/me/consents - Should list consent types and show pending mandatory consents', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/members/me/consents')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    mandatoryConsentTypes = res.body.data.filter((c: any) => c.isMandatory);
    expect(mandatoryConsentTypes.length).toBeGreaterThanOrEqual(3);
  });

  it('10. POST /members/me/consents - Should REJECT declining mandatory consent', async () => {
    const firstMandatory = mandatoryConsentTypes[0];

    const res = await request(app.getHttpServer())
      .post('/api/v1/members/me/consents')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        consentTypeId: firstMandatory.consentTypeId,
        consentVersionId: firstMandatory.activeVersion.id,
        status: 'DECLINED',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('11. POST /members/me/consents - Should accept all mandatory consents', async () => {
    for (const mc of mandatoryConsentTypes) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/members/me/consents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          consentTypeId: mc.consentTypeId,
          consentVersionId: mc.activeVersion.id,
          status: 'CONSENTED',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CONSENTED');
    }
  });

  it('12. POST /members/me/injuries - Should record an active injury', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/members/me/injuries')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bodyArea: 'LOWER_BACK',
        description: 'Mild muscle strain during deadlifts',
        status: 'RECOVERING',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bodyArea).toBe('LOWER_BACK');
  });

  it('13. POST /members/me/signature - Should record digital declaration with SHA-256 evidence reference', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/members/me/signature')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        documentType: 'ONBOARDING_AGREEMENT',
        documentVersion: '2024.1',
        signerName: 'John Athlete',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.signatureReference).toBeDefined();
    expect(res.body.data.signatureReference.length).toBe(64); // SHA-256 hex string
  });

  it('14. POST /members/me/onboarding/complete - Should now SUCCEED and mark member status as ACTIVE', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/members/me/onboarding/complete')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.onboardingStatus).toBe('COMPLETED');

    // Verify profile state
    const profileRes = await request(app.getHttpServer())
      .get('/api/v1/members/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(profileRes.body.data.status).toBe('ACTIVE');
    expect(profileRes.body.data.onboardingStatus).toBe('COMPLETED');
  });
});
