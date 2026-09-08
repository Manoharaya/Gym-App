import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { WearablesController } from '../src/wearables/controllers/wearables.controller';
import { WearableCapabilitiesRegistry } from '../src/wearables/domain/wearable-capabilities.registry';
import { TokenEncryptionService } from '../src/wearables/security/token-encryption.service';
import { UnitNormalizer } from '../src/wearables/domain/unit-normalizer';
import { HealthDataValidator } from '../src/wearables/domain/health-data-validator';
import { DeduplicationService } from '../src/wearables/domain/deduplication.service';
import { WearableConnectionService } from '../src/wearables/services/wearable-connection.service';
import { WearableSyncService } from '../src/wearables/services/wearable-sync.service';
import { HealthDataService } from '../src/wearables/services/health-data.service';
import { HealthDataSummaryService } from '../src/wearables/services/health-data-summary.service';
import { WearablePrivacyService } from '../src/wearables/services/wearable-privacy.service';
import { WearableTrainerService } from '../src/wearables/services/wearable-trainer.service';
import { WearableDataDeletionService } from '../src/wearables/security/wearable-data-deletion.service';
import { WearableRateLimiterService } from '../src/wearables/security/wearable-rate-limiter.service';
import { IngestHealthRecordDto } from '../src/wearables/dto/sync-request.dto';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 23: Wearables Integration Foundation & Health Data Sync E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let controller: WearablesController;
  let capabilitiesRegistry: WearableCapabilitiesRegistry;
  let tokenEncryption: TokenEncryptionService;
  let unitNormalizer: UnitNormalizer;
  let validator: HealthDataValidator;
  let deduplication: DeduplicationService;
  let connectionService: WearableConnectionService;
  let syncService: WearableSyncService;
  let healthDataService: HealthDataService;
  let summaryService: HealthDataSummaryService;
  let privacyService: WearablePrivacyService;
  let trainerService: WearableTrainerService;
  let deletionService: WearableDataDeletionService;
  let rateLimiter: WearableRateLimiterService;

  let orgA: any;
  let orgB: any;
  let alexUser: any;
  let alexMember: any;
  let bobUser: any;
  let bobMemberOrgB: any;
  let marcusTrainerUser: any;
  let marcusTrainerProfile: any;
  let otherTrainerUser: any;
  let otherTrainerProfile: any;

  let actorAlex: AuthenticatedUser;
  let actorBobOrgB: AuthenticatedUser;
  let actorMarcusTrainer: AuthenticatedUser;
  let actorOtherTrainer: AuthenticatedUser;

  let wearableConsentType: any;
  let wearableConsentVersion: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);
    controller = app.get(WearablesController);
    capabilitiesRegistry = app.get(WearableCapabilitiesRegistry);
    tokenEncryption = app.get(TokenEncryptionService);
    unitNormalizer = app.get(UnitNormalizer);
    validator = app.get(HealthDataValidator);
    deduplication = app.get(DeduplicationService);
    connectionService = app.get(WearableConnectionService);
    syncService = app.get(WearableSyncService);
    healthDataService = app.get(HealthDataService);
    summaryService = app.get(HealthDataSummaryService);
    privacyService = app.get(WearablePrivacyService);
    trainerService = app.get(WearableTrainerService);
    deletionService = app.get(WearableDataDeletionService);
    rateLimiter = app.get(WearableRateLimiterService);

    // Seed Organisations
    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });

    // Ensure WEARABLE_DATA consent type and version
    wearableConsentType = await prisma.consentType.upsert({
      where: { key: 'WEARABLE_DATA' },
      update: {},
      create: {
        key: 'WEARABLE_DATA',
        name: 'Wearable Health Data Synchronization',
        description: 'Consent for reading health telemetry from connected fitness wearables',
        isMandatory: false,
      },
    });

    wearableConsentVersion = await prisma.consentVersion.findFirst({
      where: { consentTypeId: wearableConsentType.id },
    });
    if (!wearableConsentVersion) {
      wearableConsentVersion = await prisma.consentVersion.create({
        data: {
          consentTypeId: wearableConsentType.id,
          version: '1.0',
          content: 'I consent to synchronizing health data from Apple Health, Google Health Connect, and Fitbit.',
          effectiveFrom: new Date(),
        },
      });
    }

    // Alex (Org A Member)
    alexUser = await prisma.user.findFirstOrThrow({ where: { email: 'member@secondwind.com.au' } });
    alexMember = await prisma.memberProfile.findFirstOrThrow({ where: { userId: alexUser.id } });

    actorAlex = {
      id: alexUser.id,
      email: alexUser.email,
      firstName: alexUser.firstName,
      lastName: alexUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgA.id }],
      permissions: [{ resource: 'wearables', action: 'use', scope: 'SELF' }],
    };

    // Bob (Org B Member)
    bobUser = await prisma.user.findFirstOrThrow({ where: { email: 'member@apexstrength.com.au' } });
    bobMemberOrgB = await prisma.memberProfile.findFirstOrThrow({ where: { userId: bobUser.id } });

    actorBobOrgB = {
      id: bobUser.id,
      email: bobUser.email,
      firstName: bobUser.firstName,
      lastName: bobUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgB.id }],
      permissions: [{ resource: 'wearables', action: 'use', scope: 'SELF' }],
    };

    // Trainer Marcus (Assigned to Alex in Org A)
    marcusTrainerUser = await prisma.user.findFirstOrThrow({ where: { email: 'trainer@secondwind.com.au' } });
    marcusTrainerProfile = await prisma.trainerProfile.findFirstOrThrow({
      where: { professionalName: 'Marcus Vance' },
    });

    actorMarcusTrainer = {
      id: marcusTrainerUser.id,
      email: marcusTrainerUser.email,
      firstName: marcusTrainerUser.firstName,
      lastName: marcusTrainerUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'TRAINER', organisationId: orgA.id }],
      permissions: [{ resource: 'wearables', action: 'view', scope: 'ASSIGNED_CLIENTS' }],
    };
    (actorMarcusTrainer as any).role = 'TRAINER';

    // Ensure Marcus is assigned to Alex
    const existingAssignment = await prisma.trainerClientAssignment.findFirst({
      where: {
        trainerProfileId: marcusTrainerProfile.id,
        memberProfileId: alexMember.id,
      },
    });
    if (!existingAssignment) {
      await prisma.trainerClientAssignment.create({
        data: {
          organisationId: orgA.id,
          trainerProfileId: marcusTrainerProfile.id,
          memberProfileId: alexMember.id,
          status: 'ACTIVE',
        },
      });
    }

    // Unassigned Trainer
    otherTrainerUser = await prisma.user.upsert({
      where: { email: 'unassigned.trainer@secondwind.com.au' },
      update: {},
      create: {
        email: 'unassigned.trainer@secondwind.com.au',
        passwordHash: 'hashed_pw',
        firstName: 'Unassigned',
        lastName: 'Trainer',
        status: 'ACTIVE',
      },
    });

    const otherStaff = await prisma.staffProfile.upsert({
      where: { userId: otherTrainerUser.id },
      update: {},
      create: {
        userId: otherTrainerUser.id,
        organisationId: orgA.id,
        displayName: 'Unassigned Trainer',
        jobTitle: 'Trainer',
      },
    });

    otherTrainerProfile = await prisma.trainerProfile.upsert({
      where: { staffProfileId: otherStaff.id },
      update: {},
      create: {
        organisationId: orgA.id,
        staffProfileId: otherStaff.id,
        professionalName: 'Unassigned Trainer',
        bio: 'Trainer without clients',
      },
    });

    actorOtherTrainer = {
      id: otherTrainerUser.id,
      email: otherTrainerUser.email,
      firstName: otherTrainerUser.firstName,
      lastName: otherTrainerUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'TRAINER', organisationId: orgA.id }],
      permissions: [{ resource: 'wearables', action: 'view', scope: 'ASSIGNED_CLIENTS' }],
    };
    (actorOtherTrainer as any).role = 'TRAINER';

    // Grant WEARABLE_DATA consent to Alex
    await prisma.consentRecord.deleteMany({
      where: {
        memberProfileId: alexMember.id,
        consentTypeId: wearableConsentType.id,
      },
    });
    await prisma.consentRecord.create({
      data: {
        memberProfileId: alexMember.id,
        consentTypeId: wearableConsentType.id,
        consentVersionId: wearableConsentVersion.id,
        status: 'CONSENTED',
      },
    });

    // Clean existing wearable test data for clean state
    await prisma.healthDataRecord.deleteMany({
      where: { memberId: { in: [alexMember.id, bobMemberOrgB.id] } },
    });
    await prisma.wearableRawData.deleteMany({
      where: { memberId: { in: [alexMember.id, bobMemberOrgB.id] } },
    });
    await prisma.wearableSyncLog.deleteMany({
      where: { connection: { memberId: { in: [alexMember.id, bobMemberOrgB.id] } } },
    });
    await prisma.wearableConnection.deleteMany({
      where: { memberId: { in: [alexMember.id, bobMemberOrgB.id] } },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.healthDataRecord.deleteMany({
      where: { memberId: { in: [alexMember.id, bobMemberOrgB.id] } },
    });
    await prisma.wearableRawData.deleteMany({
      where: { memberId: { in: [alexMember.id, bobMemberOrgB.id] } },
    });
    await prisma.wearableSyncLog.deleteMany({
      where: { connection: { memberId: { in: [alexMember.id, bobMemberOrgB.id] } } },
    });
    await prisma.wearableConnection.deleteMany({
      where: { memberId: { in: [alexMember.id, bobMemberOrgB.id] } },
    });
    await app.close();
  });

  describe('1. Provider Capabilities Registry & Wave Phasing', () => {
    it('should list all providers with Wave 1 enabled and Wave 2 disabled', () => {
      const providers = controller.getProviders();
      expect(providers.length).toBe(6);

      const wave1 = providers.filter((p) => p.wave === 1);
      const wave2 = providers.filter((p) => p.wave === 2);

      expect(wave1.length).toBe(3);
      expect(wave2.length).toBe(3);

      const apple = providers.find((p) => p.provider === 'APPLE_HEALTH');
      const google = providers.find((p) => p.provider === 'GOOGLE_HEALTH_CONNECT');
      const fitbit = providers.find((p) => p.provider === 'FITBIT');
      const garmin = providers.find((p) => p.provider === 'GARMIN');

      expect(apple?.isEnabled).toBe(true);
      expect(google?.isEnabled).toBe(true);
      expect(fitbit?.isEnabled).toBe(true);
      expect(garmin?.isEnabled).toBe(false);
      expect(garmin?.description).toContain('Wave 2');
    });

    it('should reject connection attempt for Wave 2 disabled provider (e.g. GARMIN)', async () => {
      await expect(
        controller.connect(actorAlex, {
          provider: 'GARMIN' as any,
          scopes: ['STEPS'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. AES-256-GCM Token Encryption Security', () => {
    it('should encrypt and decrypt tokens correctly with authenticated tag', () => {
      const secret = 'fitbit_oauth_refresh_token_super_secret_xyz123';
      const encrypted = tokenEncryption.encrypt(secret);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(secret);

      // Verify format: iv:authTag:ciphertext
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);
      expect(parts[0].length).toBe(32); // 16 bytes IV = 32 hex chars
      expect(parts[1].length).toBe(32); // 16 bytes tag = 32 hex chars

      const decrypted = tokenEncryption.decrypt(encrypted);
      expect(decrypted).toBe(secret);
    });

    it('should reject tampered or corrupted ciphertext/tag', () => {
      const encrypted = tokenEncryption.encrypt('valid_secret');
      const parts = encrypted.split(':');
      // Tamper ciphertext
      const tampered = `${parts[0]}:${parts[1]}:badciphertextdeadbeef`;

      expect(() => tokenEncryption.decrypt(tampered)).toThrow();
    });

    it('should never expose tokens in plain text via API responses', async () => {
      const conn = await controller.connect(actorAlex, {
        provider: 'FITBIT',
        nativeAccessToken: 'fitbit_access_secret_999',
        nativeRefreshToken: 'fitbit_refresh_secret_888',
        scopes: ['STEPS', 'HEART_RATE'],
      });

      expect(conn.id).toBeDefined();
      expect((conn as any).accessToken).toBeUndefined();
      expect((conn as any).refreshToken).toBeUndefined();
      expect((conn as any).encryptedAccessToken).toBeUndefined();

      // Verify directly in DB that token is stored encrypted
      const dbConn = await prisma.wearableConnection.findUnique({
        where: { id: conn.id },
      });
      expect(dbConn?.encryptedAccessToken).toBeDefined();
      expect(dbConn?.encryptedAccessToken).not.toBe('fitbit_access_secret_999');
      expect(dbConn?.encryptedAccessToken).toContain(':');
    });
  });

  describe('3. Consent Enforcement (Day 4 Compliance)', () => {
    it('should reject connection attempt when WEARABLE_DATA consent is revoked', async () => {
      // Temporarily revoke consent for Alex
      await prisma.consentRecord.updateMany({
        where: {
          memberProfileId: alexMember.id,
          consentTypeId: wearableConsentType.id,
        },
        data: { status: 'WITHDRAWN' },
      });

      await expect(
        controller.connect(actorAlex, {
          provider: 'APPLE_HEALTH',
          scopes: ['STEPS'],
        }),
      ).rejects.toThrow(ForbiddenException);

      // Restore consent
      await prisma.consentRecord.updateMany({
        where: {
          memberProfileId: alexMember.id,
          consentTypeId: wearableConsentType.id,
        },
        data: { status: 'CONSENTED' },
      });
    });
  });

  describe('4. Normalization, Units, & Data Validation', () => {
    it('should normalize units correctly (m to km, hours to minutes, steps count)', () => {
      const distNorm = unitNormalizer.normalize('DISTANCE', 5200, 'm');
      expect(distNorm.value).toBe(5.2);
      expect(distNorm.unit).toBe('km');

      const sleepNorm = unitNormalizer.normalize('SLEEP', 7.5, 'hours');
      expect(sleepNorm.value).toBe(450);
      expect(sleepNorm.unit).toBe('minutes');

      const stepNorm = unitNormalizer.normalize('STEPS', 8500, 'count');
      expect(stepNorm.value).toBe(8500);
      expect(stepNorm.unit).toBe('steps');
    });

    it('should reject invalid or physiological out-of-range records', () => {
      const now = new Date();

      // Negative steps
      const negSteps = validator.validate('STEPS', -100, now);
      expect(negSteps.isValid).toBe(false);
      expect(negSteps.reason).toBe('NEGATIVE_STEPS');

      // Heart rate < 25
      const lowHr = validator.validate('HEART_RATE', 20, now);
      expect(lowHr.isValid).toBe(false);
      expect(lowHr.reason).toContain('OUT_OF_RANGE_HEART_RATE');

      // Heart rate > 260
      const highHr = validator.validate('HEART_RATE', 300, now);
      expect(highHr.isValid).toBe(false);
      expect(highHr.reason).toContain('OUT_OF_RANGE_HEART_RATE');

      // Future timestamp beyond 15 min allowance
      const futureTime = new Date(Date.now() + 25 * 60 * 1000);
      const futureCheck = validator.validate('STEPS', 1000, futureTime);
      expect(futureCheck.isValid).toBe(false);
      expect(futureCheck.reason).toBe('FUTURE_TIMESTAMP_NOT_ALLOWED');
    });
  });

  describe('5. Deterministic Deduplication', () => {
    it('should compute consistent SHA-256 fingerprint for identical telemetry', () => {
      const fp1 = deduplication.generateFingerprint({
        connectionId: 'conn-dedup-1',
        provider: 'APPLE_HEALTH',
        dataType: 'STEPS',
        startTime: new Date('2026-09-07T08:00:00Z'),
        value: 500,
        unit: 'count',
      });
      const fp2 = deduplication.generateFingerprint({
        connectionId: 'conn-dedup-1',
        provider: 'APPLE_HEALTH',
        dataType: 'STEPS',
        startTime: new Date('2026-09-07T08:00:00Z'),
        value: 500,
        unit: 'count',
      });
      expect(fp1).toBe(fp2);
      expect(fp1.length).toBe(64);
    });
  });

  describe('6. Connection Lifecycle (Connect, Reauthorize, Disconnect)', () => {
    let connectionId: string;

    it('should establish an Apple Health connection for Alex', async () => {
      const conn = await controller.connect(actorAlex, {
        provider: 'APPLE_HEALTH',
        scopes: ['STEPS', 'HEART_RATE', 'ACTIVE_CALORIES', 'SLEEP'],
      });

      expect(conn.id).toBeDefined();
      expect(conn.provider).toBe('APPLE_HEALTH');
      expect(conn.status).toBe('CONNECTED');
      connectionId = conn.id;
    });

    it('should list active connections for Alex', async () => {
      const connections = await controller.getConnections(actorAlex);
      expect(connections.length).toBeGreaterThanOrEqual(1);
      const appleConn = connections.find((c) => c.provider === 'APPLE_HEALTH');
      expect(appleConn).toBeDefined();
    });

    it('should retrieve single connection details by ID', async () => {
      const conn = await controller.getConnection(actorAlex, connectionId);
      expect(conn.id).toBe(connectionId);
      expect(conn.provider).toBe('APPLE_HEALTH');
    });

    it('should reauthorize connection with refreshed metadata', async () => {
      const reauth = await controller.reauthorize(actorAlex, connectionId, {});
      expect(reauth.status).toBe('CONNECTED');
    });
  });

  describe('7. Wearable Sync Engine & Idempotency', () => {
    let appleConnection: any;

    beforeAll(async () => {
      // Find or create Apple Health connection
      appleConnection = await prisma.wearableConnection.findFirst({
        where: { memberId: alexMember.id, provider: 'APPLE_HEALTH' },
      });
      if (!appleConnection) {
        appleConnection = await controller.connect(actorAlex, {
          provider: 'APPLE_HEALTH',
          scopes: ['STEPS', 'HEART_RATE', 'ACTIVE_CALORIES'],
        });
      }
    });

    it('should synchronize forwarded health records idempotently', async () => {
      const now = new Date();
      const startTime1 = new Date(now.getTime() - 60 * 60 * 1000); // 1h ago
      const endTime1 = new Date(now.getTime() - 30 * 60 * 1000);

      const recordsPayload: IngestHealthRecordDto[] = [
        {
          dataType: 'STEPS',
          value: 4250,
          unit: 'count',
          startTime: startTime1.toISOString(),
          endTime: endTime1.toISOString(),
          sourceRecordId: `apple-steps-test-${Date.now()}-1`,
          sourceName: 'Apple Watch',
        },
        {
          dataType: 'ACTIVE_CALORIES',
          value: 280,
          unit: 'kcal',
          startTime: startTime1.toISOString(),
          endTime: endTime1.toISOString(),
          sourceRecordId: `apple-cals-test-${Date.now()}-2`,
          sourceName: 'Apple Watch',
        },
        {
          dataType: 'HEART_RATE',
          value: 125,
          unit: 'bpm',
          startTime: startTime1.toISOString(),
          sourceRecordId: `apple-hr-test-${Date.now()}-3`,
          sourceName: 'Apple Watch',
        },
      ];

      // Initial Sync
      const result1 = await controller.sync(actorAlex, appleConnection.id, {
        records: recordsPayload,
      });

      expect(result1.status).toBe('SUCCESS');
      expect(result1.recordsFetched).toBe(3);
      expect(result1.recordsInserted).toBe(3);
      expect(result1.duplicatesSkipped).toBe(0);

      // Re-sync exact same records — must be 100% idempotent
      const result2 = await controller.sync(actorAlex, appleConnection.id, {
        records: recordsPayload,
      });

      expect(result2.status).toBe('SUCCESS');
      expect(result2.recordsFetched).toBe(3);
      expect(result2.recordsInserted).toBe(0);
      expect(result2.duplicatesSkipped).toBe(3);
    });

    it('should record an audit sync log in WearableSyncLog', async () => {
      const logs = await prisma.wearableSyncLog.findMany({
        where: { connectionId: appleConnection.id },
        orderBy: { startedAt: 'desc' },
        take: 1,
      });

      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe('SUCCESS');
      expect(logs[0].recordsFetched).toBeGreaterThan(0);
    });
  });

  describe('8. Health Data Queries & Aggregations', () => {
    it('should query paginated health records with filters', async () => {
      const queryResult = await controller.getHealthData(actorAlex, {
        limit: 10,
        page: 1,
      });

      expect(queryResult).toBeDefined();
      expect(queryResult.records).toBeDefined();
      expect(queryResult.records.length).toBeGreaterThan(0);
      expect(queryResult.total).toBeGreaterThan(0);
      expect(queryResult.page).toBe(1);

      // Verify specific data type filter
      const stepsQuery = await controller.getHealthData(actorAlex, {
        dataType: 'STEPS',
        limit: 10,
        page: 1,
      });
      expect(stepsQuery.records.every((r) => r.dataType === 'STEPS')).toBe(true);
    });

    it('should generate deterministic daily & weekly health data summary', async () => {
      const summary = await controller.getHealthSummary(actorAlex);

      expect(summary).toBeDefined();
      expect(summary.memberId).toBe(alexMember.id);
      expect(summary.totalSteps).toBeGreaterThan(0);
      expect(summary.avgDailySteps).toBeGreaterThanOrEqual(0);
      expect(summary.dailySummaries).toBeDefined();
      expect(summary.dailySummaries.length).toBeGreaterThan(0);
      expect(summary.connectedProviders).toContain('APPLE_HEALTH');
    });
  });

  describe('9. Member Privacy View & Self-Service Data Deletion Boundary', () => {
    it('should return complete privacy transparency view', async () => {
      const privacy = await controller.getPrivacyView(actorAlex);

      expect(privacy).toBeDefined();
      expect(privacy.memberId).toBe(alexMember.id);
      expect(privacy.activeConsent.consented).toBe(true);
      expect(privacy.trainerAccess.isPermitted).toBe(true);
      expect(privacy.trainerAccess.assignedTrainerName).toBe('Marcus Vance');
      expect(privacy.trainerAccess.rawValuesExposed).toBe(false);
      expect(privacy.retentionPolicy.selfServiceDeletionAllowed).toBe(true);
      expect(privacy.connectedProviders.length).toBeGreaterThanOrEqual(1);
    });

    it('should delete provider-specific health data without deleting connection', async () => {
      // Find Fitbit connection or create one
      const fitbitConn = await controller.connect(actorAlex, {
        provider: 'FITBIT',
        scopes: ['STEPS'],
      });

      // Insert test record for Fitbit
      await prisma.healthDataRecord.create({
        data: {
          organisationId: orgA.id,
          memberId: alexMember.id,
          connectionId: fitbitConn.id,
          provider: 'FITBIT',
          dataType: 'STEPS',
          sourceRecordId: 'fitbit-delete-test-1',
          startTime: new Date(),
          value: 3000,
          unit: 'count',
          fingerprint: 'test-fitbit-fp-1',
        },
      });

      // Delete Fitbit records
      const delResult = await controller.deleteWearableData(actorAlex, 'FITBIT', undefined);
      expect(delResult.recordsDeleted).toBeGreaterThanOrEqual(1);

      // Verify records are gone
      const remaining = await prisma.healthDataRecord.count({
        where: { memberId: alexMember.id, provider: 'FITBIT' },
      });
      expect(remaining).toBe(0);
    });

    it('should delete all member wearable data (Day 49 Privacy Centre foundation)', async () => {
      // Clean up via member purge
      const purge = await controller.deleteWearableData(actorAlex, undefined, undefined);
      expect(purge.connectionsDeleted).toBeGreaterThanOrEqual(1);

      // Verify all connections and data are cleaned
      const remainingConns = await prisma.wearableConnection.count({
        where: { memberId: alexMember.id },
      });
      const remainingRecords = await prisma.healthDataRecord.count({
        where: { memberId: alexMember.id },
      });

      expect(remainingConns).toBe(0);
      expect(remainingRecords).toBe(0);
    });
  });

  describe('10. Trainer Client Assignment Scoping & Privacy Access', () => {
    beforeAll(async () => {
      // Re-establish Apple Health connection and records for Alex
      const appleConn = await controller.connect(actorAlex, {
        provider: 'APPLE_HEALTH',
        scopes: ['STEPS', 'ACTIVE_CALORIES'],
      });

      const today = new Date();
      await prisma.healthDataRecord.create({
        data: {
          organisationId: orgA.id,
          memberId: alexMember.id,
          connectionId: appleConn.id,
          provider: 'APPLE_HEALTH',
          dataType: 'STEPS',
          sourceRecordId: 'trainer-test-steps-1',
          startTime: today,
          value: 7500,
          unit: 'count',
          fingerprint: 'trainer-test-steps-fp',
        },
      });
    });

    it('should allow assigned trainer Marcus to view Alex high-level activity summary', async () => {
      const summary = await controller.getTrainerClientSummary(actorMarcusTrainer, alexMember.id);

      expect(summary).toBeDefined();
      expect(summary.memberId).toBe(alexMember.id);
      expect(summary.memberName).toBeDefined();
      expect(summary.weeklyAverages.avgDailySteps).toBeGreaterThanOrEqual(0);
      // Ensure zero raw sensor timestamps or device IDs are exposed to trainer
      expect((summary as any).rawRecords).toBeUndefined();
      expect((summary as any).deviceSerial).toBeUndefined();
    });

    it('should reject unassigned trainer with 403 Forbidden', async () => {
      await expect(
        controller.getTrainerClientSummary(actorOtherTrainer, alexMember.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('11. Multi-Tenant Isolation & IDOR Protection', () => {
    it('should prevent Bob (Org B) from accessing Alex (Org A) wearable connection', async () => {
      const alexConnections = await controller.getConnections(actorAlex);
      expect(alexConnections.length).toBeGreaterThan(0);
      const alexConnId = alexConnections[0].id;

      // Bob in Org B attempts to access Alex connection
      await expect(
        controller.getConnection(actorBobOrgB, alexConnId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent Bob (Org B) from triggering sync on Alex connection', async () => {
      const alexConnections = await controller.getConnections(actorAlex);
      const alexConnId = alexConnections[0].id;

      await expect(
        controller.sync(actorBobOrgB, alexConnId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should ensure health data queries return strictly the calling member records', async () => {
      const bobData = await controller.getHealthData(actorBobOrgB, {});
      expect(bobData.records.length).toBe(0);
      expect(bobData.total).toBe(0);
    });
  });

  describe('12. Wearable Rate Limiter Service', () => {
    it('should allow requests within rate limit and track remaining allowance', () => {
      const connId = 'conn-rate-test-1';
      const provider = 'FITBIT';

      const status1 = rateLimiter.checkRateLimit(connId, provider);
      expect(status1.isAllowed).toBe(true);
      expect(status1.remainingCalls).toBeGreaterThan(0);

      // Record a call
      rateLimiter.recordCall(connId, provider);
      const status2 = rateLimiter.checkRateLimit(connId, provider);
      expect(status2.isAllowed).toBe(true);

      // Record 429 Retry-After
      rateLimiter.recordRetryAfter(connId, provider, 30);
      const cooldownStatus = rateLimiter.checkRateLimit(connId, provider);
      expect(cooldownStatus.isAllowed).toBe(false);
      expect(cooldownStatus.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    });
  });
});
