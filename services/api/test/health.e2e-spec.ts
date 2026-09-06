import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health => returns health status with database and redis info', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.services.database).toBe('ok');
    expect(res.body.requestId).toBeDefined();
  });

  it('GET /health/live => returns liveness ok', async () => {
    const res = await request(app.getHttpServer()).get('/health/live').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
  });

  it('GET /health/ready => returns readiness ok', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ready');
  });
});
