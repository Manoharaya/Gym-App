import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Outlet-Level Boundary Scoping (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let managerToken: string;

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

    // Authenticate Organisation Owner
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@secondwind.com.au', password: 'FitCoreDev2026!' });
    ownerToken = ownerRes.body.data.accessToken;

    // Authenticate Perth CBD Outlet Manager
    const mgrRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager@secondwind.com.au', password: 'FitCoreDev2026!' });
    managerToken = mgrRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('ALLOWS Outlet Manager to view assigned outlet (Perth CBD)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/outlets/${PERTH_CBD_OUTLET_ID}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(PERTH_CBD_OUTLET_ID);
    expect(res.body.data.code).toBe('SW-PERTH-CBD');
  });

  it('BLOCKS Outlet Manager from accessing unassigned outlet (Fremantle) with 403', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/outlets/${FREMANTLE_OUTLET_ID}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toMatch(/not assigned to (this )?outlet/i);
  });

  it('ALLOWS Organisation Owner with organisation-wide scope to access both outlets', async () => {
    // Perth CBD
    const resPerth = await request(app.getHttpServer())
      .get(`/api/v1/outlets/${PERTH_CBD_OUTLET_ID}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(resPerth.body.success).toBe(true);

    // Fremantle
    const resFreo = await request(app.getHttpServer())
      .get(`/api/v1/outlets/${FREMANTLE_OUTLET_ID}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(resFreo.body.success).toBe(true);
  });
});
