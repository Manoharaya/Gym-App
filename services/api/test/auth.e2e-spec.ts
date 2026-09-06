import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Authentication & Token Lifecycle (e2e)', () => {
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
    expect(res.body.data.user.roles).toBeInstanceOf(Array);
  });

  it('GET /api/v1/auth/me => rejects unauthenticated requests with 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/auth/me => returns user profile when valid bearer token is provided', async () => {
    // 1. Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@secondwind.com.au',
        password: 'FitCoreDev2026!',
      })
      .expect(200);

    const token = loginRes.body.data.accessToken;

    // 2. Call /me
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.email).toBe('owner@secondwind.com.au');
    expect(meRes.body.data.firstName).toBe('Jack');
  });

  it('Token Rotation & Reuse Detection => rotates token and invalidates family on reuse', async () => {
    // 1. Initial Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'member@secondwind.com.au',
        password: 'FitCoreDev2026!',
      })
      .expect(200);

    const initialRefreshToken = loginRes.body.data.refreshToken;

    // 2. Refresh Token Rotation (first consumption)
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken })
      .expect(200);

    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).not.toEqual(initialRefreshToken);

    const newRefreshToken = refreshRes.body.data.refreshToken;

    // 3. Security Test: Reusing already consumed initialRefreshToken (Token Compromise Detection)
    const reuseRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken })
      .expect(401);

    expect(reuseRes.body.success).toBe(false);
    expect(reuseRes.body.error.message).toMatch(/reuse detected/i);

    // 4. Verify that session was terminated: even the newRefreshToken should now fail
    const postCompromiseRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: newRefreshToken })
      .expect(401);

    expect(postCompromiseRes.body.success).toBe(false);
  });
});
