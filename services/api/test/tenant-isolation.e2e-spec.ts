import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tenant Isolation & Matrix Security (e2e)', () => {
  let app: INestApplication;

  let superAdminToken: string;
  let secondWindOwnerToken: string;
  let apexMemberToken: string;
  let perthManagerToken: string;
  let perthReceptionToken: string;
  let perthTrainerToken: string;
  let secondWindMemberToken: string;

  const SECOND_WIND_ORG_ID = 'org_dev_secondwind_001';
  const APEX_STRENGTH_ORG_ID = 'org_dev_apex_002';
  const PERTH_CBD_OUTLET_ID = 'outlet_dev_perth_cbd_001';
  const FREMANTLE_OUTLET_ID = 'outlet_dev_fremantle_002';

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

    // 1. SuperAdmin
    const saRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@fitcore.io', password: 'FitCoreDev2026!' });
    superAdminToken = saRes.body.data.accessToken;

    // 2. Second Wind Owner
    const swRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@secondwind.com.au', password: 'FitCoreDev2026!' });
    secondWindOwnerToken = swRes.body.data.accessToken;

    // 3. Apex Strength Member
    const apexRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'member@apexstrength.com.au', password: 'FitCoreDev2026!' });
    apexMemberToken = apexRes.body.data.accessToken;

    // 4. Perth CBD Manager
    const mgrRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager@secondwind.com.au', password: 'FitCoreDev2026!' });
    perthManagerToken = mgrRes.body.data.accessToken;

    // 5. Reception
    const recRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'reception@secondwind.com.au', password: 'FitCoreDev2026!' });
    perthReceptionToken = recRes.body.data.accessToken;

    // 6. Trainer
    const trnRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'trainer@secondwind.com.au', password: 'FitCoreDev2026!' });
    perthTrainerToken = trnRes.body.data.accessToken;

    // 7. Member
    const memRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'member@secondwind.com.au', password: 'FitCoreDev2026!' });
    secondWindMemberToken = memRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // Test 1: Superadmin -> Organisation A => ALLOW
  it('Test 1: ALLOWS Superadmin to access Organisation A', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organisations/${SECOND_WIND_ORG_ID}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(SECOND_WIND_ORG_ID);
  });

  // Test 2: Organisation Owner A -> Organisation A => ALLOW
  it('Test 2: ALLOWS Organisation Owner A to access Organisation A', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organisations/${SECOND_WIND_ORG_ID}`)
      .set('Authorization', `Bearer ${secondWindOwnerToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(SECOND_WIND_ORG_ID);
  });

  // Test 3: Organisation Owner A -> Organisation B => DENY (403)
  it('Test 3: CRITICAL: BLOCKS Organisation Owner A from accessing Organisation B with 403', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organisations/${APEX_STRENGTH_ORG_ID}`)
      .set('Authorization', `Bearer ${secondWindOwnerToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // Test 4: Outlet Manager A1 -> Outlet A1 => ALLOW
  it('Test 4: ALLOWS Outlet Manager A1 to access Outlet A1 (Perth CBD)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organisations/${SECOND_WIND_ORG_ID}/outlets/${PERTH_CBD_OUTLET_ID}`)
      .set('Authorization', `Bearer ${perthManagerToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(PERTH_CBD_OUTLET_ID);
  });

  // Test 5: Outlet Manager A1 -> Outlet B => DENY (403)
  it('Test 5: CRITICAL: BLOCKS Outlet Manager A1 from accessing Outlet B (Fremantle) with 403', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organisations/${SECOND_WIND_ORG_ID}/outlets/${FREMANTLE_OUTLET_ID}`)
      .set('Authorization', `Bearer ${perthManagerToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // Test 6: Trainer -> role assignment => DENY (403)
  it('Test 6: CRITICAL: BLOCKS Trainer from assigning roles with 403', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organisations/${SECOND_WIND_ORG_ID}/users/some-user/roles`)
      .set('Authorization', `Bearer ${perthTrainerToken}`)
      .send({ roleName: 'TRAINER' })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // Test 7: Organisation Owner -> role assignment within permitted scope => ALLOW
  it('Test 7: ALLOWS Organisation Owner to assign roles within permitted scope', async () => {
    // 1. Create a dummy member to assign a role to
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `roletest.${Date.now()}@example.com`,
        password: 'FitCoreDev2026!',
        firstName: 'Role',
        lastName: 'Target',
      })
      .expect(201);

    const targetUserId = regRes.body.data.user.id;

    // 2. Owner assigns RECEPTION role for Perth CBD
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organisations/${SECOND_WIND_ORG_ID}/users/${targetUserId}/roles`)
      .set('Authorization', `Bearer ${secondWindOwnerToken}`)
      .send({ roleName: 'RECEPTION', outletId: PERTH_CBD_OUTLET_ID })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.role.name).toBe('RECEPTION');
  });

  // Test 8: Reception -> Organisation update => DENY (403)
  it('Test 8: CRITICAL: BLOCKS Reception from updating Organisation with 403', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/organisations/${SECOND_WIND_ORG_ID}`)
      .set('Authorization', `Bearer ${perthReceptionToken}`)
      .send({ name: 'Hacked Second Wind' })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // Test 9: Member -> organisation management => DENY (403)
  it('Test 9: CRITICAL: BLOCKS Member from organisation management with 403', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/organisations/${SECOND_WIND_ORG_ID}`)
      .set('Authorization', `Bearer ${secondWindMemberToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // Test 10: Disabled User -> login => DENY (401)
  it('Test 10: CRITICAL: BLOCKS Disabled User from logging in with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'disabled@secondwind.com.au', password: 'FitCoreDev2026!' })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toMatch(/disabled or suspended/i);
  });
});
