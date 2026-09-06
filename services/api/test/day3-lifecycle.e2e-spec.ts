import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Day 3 End-to-End Platform Lifecycle (e2e)', () => {
  let app: INestApplication;
  let superAdminToken: string;
  let newOrgId: string;
  let newOutletId: string;
  let ownerToken: string;
  let invitationToken: string;
  let trainerToken: string;

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

    // Authenticate Platform SuperAdmin
    const saRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@fitcore.io', password: 'FitCoreDev2026!' });
    superAdminToken = saRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Step 1: Superadmin creates new Organisation and Owner in atomic transaction', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/organisations')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Iron Works Fitness',
        timezone: 'Australia/Sydney',
        currency: 'AUD',
        country: 'Australia',
        owner: {
          email: 'ian.owner@ironworks.com',
          password: 'FitCoreDev2026!',
          firstName: 'Ian',
          lastName: 'Wright',
        },
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.slug).toMatch(/^iron-works-fitness/);
    expect(res.body.data.owner).toBeDefined();
    expect(res.body.data.owner.email).toBe('ian.owner@ironworks.com');

    newOrgId = res.body.data.id;
  });

  it('Step 2: Superadmin creates an Outlet for the new Organisation', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organisations/${newOrgId}/outlets`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Iron Works Central',
        code: 'IW-CENTRAL',
        address: '150 Pitt Street',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
        phone: '+61 2 9000 7777',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.code).toBe('IW-CENTRAL');

    newOutletId = res.body.data.id;
  });

  it('Step 3: New Organisation Owner logs in and acquires authenticated session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'ian.owner@ironworks.com',
        password: 'FitCoreDev2026!',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('ian.owner@ironworks.com');

    ownerToken = res.body.data.accessToken;
  });

  it('Step 4: Owner accesses own Organisation details', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organisations/${newOrgId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(newOrgId);
  });

  it('Step 5: Owner creates a Staff Invitation for a Trainer at new Outlet', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organisations/${newOrgId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'tina.trainer@ironworks.com',
        role: 'TRAINER',
        outletId: newOutletId,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.invitationToken).toBeDefined();
    expect(res.body.data.role).toBe('TRAINER');

    invitationToken = res.body.data.invitationToken;
  });

  it('Step 6: Trainer accepts invitation, sets password, and receives session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/invitations/accept')
      .send({
        token: invitationToken,
        password: 'TrainerSecret2026!',
        firstName: 'Tina',
        lastName: 'Turner',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('tina.trainer@ironworks.com');

    trainerToken = res.body.data.accessToken;
  });

  it('Step 7: Trainer logs in with new credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'tina.trainer@ironworks.com',
        password: 'TrainerSecret2026!',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('tina.trainer@ironworks.com');
  });

  it('Step 8: Trainer can view assigned outlet data', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organisations/${newOrgId}/outlets/${newOutletId}`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(newOutletId);
  });

  it('Step 9: CRITICAL: Trainer is BLOCKED from accessing Second Wind Athletic Club with 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/organisations/org_dev_secondwind_001')
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Step 10: CRITICAL: Trainer is BLOCKED from creating organisations with 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/organisations')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Rogue Gym',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Step 11: CRITICAL: Trainer is BLOCKED from assigning roles with 403', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organisations/${newOrgId}/users/some-target-id/roles`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        roleName: 'ORGANISATION_OWNER',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
