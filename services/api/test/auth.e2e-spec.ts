import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Authentication & Session Management (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/register => creates new member account', async () => {
    const testEmail = `athlete.${Date.now()}@example.com`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'FitCoreDev2026!',
        firstName: 'Alice',
        lastName: 'Walker',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail);

    // Duplicate registration should fail
    const dupRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'FitCoreDev2026!',
        firstName: 'Duplicate',
        lastName: 'Alice',
      })
      .expect(409);

    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.error.code).toBe('CONFLICT');
  });

  it('POST /api/v1/auth/register => blocks self-assignment of elevated administrative role with 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `hacker.${Date.now()}@example.com`,
        password: 'FitCoreDev2026!',
        firstName: 'Malicious',
        lastName: 'Actor',
        role: 'SUPERADMIN',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/v1/auth/login => rejects invalid credentials with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@secondwind.com.au',
        password: 'WrongPassword123!',
      })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/auth/login => blocks disabled account with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'disabled@secondwind.com.au',
        password: 'FitCoreDev2026!',
      })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/disabled or suspended/i);
  });

  it('POST /api/v1/auth/login => blocks suspended account with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'suspended@secondwind.com.au',
        password: 'FitCoreDev2026!',
      })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/disabled or suspended/i);
  });

  it('POST /api/v1/auth/login => successfully authenticates with valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@secondwind.com.au',
        password: 'FitCoreDev2026!',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.expiresIn).toBe(900);
    expect(res.body.data.user.email).toBe('owner@secondwind.com.au');
  });

  it('GET /api/v1/auth/me => returns user profile, organisations, outlets, and permissions', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@secondwind.com.au', password: 'FitCoreDev2026!' });

    const token = loginRes.body.data.accessToken;

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.email).toBe('owner@secondwind.com.au');
    expect(meRes.body.data.organisations).toBeInstanceOf(Array);
    expect(meRes.body.data.permissions).toBeInstanceOf(Array);
  });

  it('POST /api/v1/auth/context => allows switching to valid member organisation', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@secondwind.com.au', password: 'FitCoreDev2026!' });

    const token = loginRes.body.data.accessToken;

    const contextRes = await request(app.getHttpServer())
      .post('/api/v1/auth/context')
      .set('Authorization', `Bearer ${token}`)
      .send({ organisationId: 'org_dev_secondwind_001' })
      .expect(200);

    expect(contextRes.body.success).toBe(true);
    expect(contextRes.body.data.status).toBe('SWITCHED');
  });

  it('POST /api/v1/auth/context => blocks switching to unauthorised organisation with 403', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@secondwind.com.au', password: 'FitCoreDev2026!' });

    const token = loginRes.body.data.accessToken;

    const contextRes = await request(app.getHttpServer())
      .post('/api/v1/auth/context')
      .set('Authorization', `Bearer ${token}`)
      .send({ organisationId: 'org_dev_apex_002' })
      .expect(403);

    expect(contextRes.body.success).toBe(false);
    expect(contextRes.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/v1/auth/logout-all => terminates all active sessions for user', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'member@secondwind.com.au', password: 'FitCoreDev2026!' });

    const token = loginRes.body.data.accessToken;
    const refreshToken = loginRes.body.data.refreshToken;

    // Logout all
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Refresh should now fail because all sessions were revoked
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
