import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Insecure Direct Object Reference (IDOR) Security (e2e)', () => {
  let app: INestApplication;
  let secondWindOwnerToken: string;
  let apexMemberToken: string;
  let apexUserId: string;

  const SECOND_WIND_ORG_ID = 'org_dev_secondwind_001';
  const APEX_STRENGTH_ORG_ID = 'org_dev_apex_002';
  const PERTH_CBD_OUTLET_ID = 'outlet_dev_perth_cbd_001';
  const SYDNEY_CBD_OUTLET_ID = 'outlet_dev_sydney_001';

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

    // Authenticate Second Wind Owner
    const swRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@secondwind.com.au', password: 'FitCoreDev2026!' });
    secondWindOwnerToken = swRes.body.data.accessToken;

    // Authenticate Apex Member
    const apexRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'member@apexstrength.com.au', password: 'FitCoreDev2026!' });
    apexMemberToken = apexRes.body.data.accessToken;
    apexUserId = apexRes.body.data.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('IDOR 1: BLOCKS User A from accessing Organisation B details via direct ID with 403', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organisations/${APEX_STRENGTH_ORG_ID}`)
      .set('Authorization', `Bearer ${secondWindOwnerToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('IDOR 2: BLOCKS User A from accessing Outlet of Org B with 403', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organisations/${SECOND_WIND_ORG_ID}/outlets/${SYDNEY_CBD_OUTLET_ID}`)
      .set('Authorization', `Bearer ${secondWindOwnerToken}`)
      .expect(404); // Not found within this org boundary

    expect(res.body.success).toBe(false);

    // Also test flat endpoint: cross-tenant access denied
    const flatRes = await request(app.getHttpServer())
      .get(`/api/v1/outlets/${SYDNEY_CBD_OUTLET_ID}`)
      .set('Authorization', `Bearer ${secondWindOwnerToken}`)
      .expect(403);

    expect(flatRes.body.success).toBe(false);
    expect(flatRes.body.error.code).toBe('FORBIDDEN');
  });

  it('IDOR 3: BLOCKS User A from inspecting or modifying User B of Org B with 403', async () => {
    // 1. Attempt inspection
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/users/${apexUserId}`)
      .set('Authorization', `Bearer ${secondWindOwnerToken}`)
      .expect(403);

    expect(getRes.body.success).toBe(false);
    expect(getRes.body.error.code).toBe('FORBIDDEN');

    // 2. Attempt modification
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/users/${apexUserId}`)
      .set('Authorization', `Bearer ${secondWindOwnerToken}`)
      .send({ firstName: 'Compromised' })
      .expect(403);

    expect(patchRes.body.success).toBe(false);
    expect(patchRes.body.error.code).toBe('FORBIDDEN');
  });

  it('IDOR 4: PREVENTS tampering with organisationId during outlet update', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/organisations/${SECOND_WIND_ORG_ID}/outlets/${PERTH_CBD_OUTLET_ID}`)
      .set('Authorization', `Bearer ${secondWindOwnerToken}`)
      .send({
        name: 'Updated Perth CBD',
        organisationId: APEX_STRENGTH_ORG_ID, // Malicious tamper attempt
      } as any)
      .expect(400); // Rejected by strict ValidationPipe whitelist/forbidNonWhitelisted!

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
