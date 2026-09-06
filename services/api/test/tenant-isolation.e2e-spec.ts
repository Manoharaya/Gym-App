import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Multi-Tenant Isolation Security (e2e)', () => {
  let app: INestApplication;
  let secondWindOwnerToken: string;
  let apexMemberToken: string;
  let superAdminToken: string;

  const SECOND_WIND_ORG_ID = 'org_dev_secondwind_001';
  const APEX_STRENGTH_ORG_ID = 'org_dev_apex_002';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'health/live', 'health/ready'],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    // Authenticate Second Wind Club Owner
    const swRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@secondwind.com.au', password: 'FitCoreDev2026!' });
    secondWindOwnerToken = swRes.body.data.accessToken;

    // Authenticate Apex Strength Member
    const apexRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'member@apexstrength.com.au', password: 'FitCoreDev2026!' });
    apexMemberToken = apexRes.body.data.accessToken;

    // Authenticate Platform Superadmin
    const saRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@fitcore.io', password: 'FitCoreDev2026!' });
    superAdminToken = saRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('ALLOWS Second Wind Owner to access Second Wind organisation', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organisations/${SECOND_WIND_ORG_ID}`)
      .set('Authorization', `Bearer ${secondWindOwnerToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(SECOND_WIND_ORG_ID);
    expect(res.body.data.slug).toBe('second-wind');
  });

  it('CRITICAL SECURITY: BLOCKS Second Wind Owner from accessing Apex Strength organisation with 403', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organisations/${APEX_STRENGTH_ORG_ID}`)
      .set('Authorization', `Bearer ${secondWindOwnerToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toMatch(/cross-tenant access forbidden/i);
  });

  it('CRITICAL SECURITY: BLOCKS Apex Strength user from accessing Second Wind organisation with 403', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organisations/${SECOND_WIND_ORG_ID}`)
      .set('Authorization', `Bearer ${apexMemberToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toMatch(/cross-tenant access forbidden/i);
  });

  it('CRITICAL SECURITY: BLOCKS Apex user from spoofing tenant via x-organisation-id header with 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/organisations')
      .set('Authorization', `Bearer ${apexMemberToken}`)
      .set('x-organisation-id', SECOND_WIND_ORG_ID)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toMatch(/cross-tenant access forbidden/i);
  });

  it('CRITICAL SECURITY: BLOCKS Apex user from querying Second Wind outlets with 403', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/outlets?organisationId=${SECOND_WIND_ORG_ID}`)
      .set('Authorization', `Bearer ${apexMemberToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('ALLOWS Platform SuperAdmin to access across tenant boundaries', async () => {
    // SuperAdmin accessing Second Wind
    const swRes = await request(app.getHttpServer())
      .get(`/api/v1/organisations/${SECOND_WIND_ORG_ID}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(swRes.body.success).toBe(true);

    // SuperAdmin accessing Apex Strength
    const apexRes = await request(app.getHttpServer())
      .get(`/api/v1/organisations/${APEX_STRENGTH_ORG_ID}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(apexRes.body.success).toBe(true);
  });
});
