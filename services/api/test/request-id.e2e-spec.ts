import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('RequestId Tracking (e2e)', () => {
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

  it('generates a new x-request-id when not provided in incoming request', async () => {
    const res = await request(app.getHttpServer()).get('/health/live').expect(200);

    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body.requestId).toBeDefined();
    expect(res.headers['x-request-id']).toEqual(res.body.requestId);
  });

  it('propagates caller-supplied x-request-id through header and body', async () => {
    const customTraceId = 'fitcore-client-trace-999888';
    const res = await request(app.getHttpServer())
      .get('/health/live')
      .set('x-request-id', customTraceId)
      .expect(200);

    expect(res.headers['x-request-id']).toEqual(customTraceId);
    expect(res.body.requestId).toEqual(customTraceId);
  });
});
