import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Role-Based Access Control & Permissions (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let memberToken: string;

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

    // Authenticate Owner
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@secondwind.com.au', password: 'FitCoreDev2026!' });
    ownerToken = ownerRes.body.data.accessToken;

    // Authenticate Member
    const memberRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'member@secondwind.com.au', password: 'FitCoreDev2026!' });
    memberToken = memberRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('ALLOWS Organisation Owner with audit_logs:READ permission to view audit logs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('BLOCKS Member without audit_logs permission from viewing audit logs with 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('ALLOWS Member to view own profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('member@secondwind.com.au');
    expect(res.body.data.userRoles).toBeInstanceOf(Array);
  });
});
