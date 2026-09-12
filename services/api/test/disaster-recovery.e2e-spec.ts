import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BackupOrchestratorService } from '../src/disaster-recovery/services/backup-orchestrator.service';
import { BackupVerificationService } from '../src/disaster-recovery/services/backup-verification.service';
import { RestoreTestService } from '../src/disaster-recovery/services/restore-test.service';
import { DataIntegrityValidatorService } from '../src/disaster-recovery/services/data-integrity-validator.service';
import { BusinessContinuityService } from '../src/disaster-recovery/services/business-continuity.service';
import { DisasterRecoveryReconciliationService } from '../src/disaster-recovery/services/disaster-recovery-reconciliation.service';
import { DrIncidentService } from '../src/disaster-recovery/services/dr-incident.service';
import { BackupTypeEnum, DrSeverityEnum, DrIncidentStatusEnum } from '../src/disaster-recovery/dto/disaster-recovery.dto';

describe('Day 58: Disaster Recovery, Backup & Business Continuity E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let backupOrchestrator: BackupOrchestratorService;
  let backupVerification: BackupVerificationService;
  let restoreTestService: RestoreTestService;
  let integrityValidator: DataIntegrityValidatorService;
  let businessContinuity: BusinessContinuityService;
  let reconciliationService: DisasterRecoveryReconciliationService;
  let incidentService: DrIncidentService;

  let superadminUser: any;
  let regularOrg: any;
  let regularOutlet: any;
  let regularUser: any;
  let regularMemberProfile: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    backupOrchestrator = app.get(BackupOrchestratorService);
    backupVerification = app.get(BackupVerificationService);
    restoreTestService = app.get(RestoreTestService);
    integrityValidator = app.get(DataIntegrityValidatorService);
    businessContinuity = app.get(BusinessContinuityService);
    reconciliationService = app.get(DisasterRecoveryReconciliationService);
    incidentService = app.get(DrIncidentService);

    const suffix = `dr_${Date.now()}`;

    // 1. Seed Superadmin User
    superadminUser = await prisma.user.create({
      data: {
        email: `superadmin_${suffix}@fitcore.io`,
        passwordHash: await bcrypt.hash('SuperAdminSecret123!', 4),
        firstName: 'DR',
        lastName: 'Commander',
      },
    });

    // 2. Seed Regular Gym Organisation
    regularOrg = await prisma.organisation.create({
      data: {
        name: `FitCore DR Test Org ${suffix}`,
        slug: `dr-org-${suffix}`,
      },
    });

    regularOutlet = await prisma.outlet.create({
      data: {
        organisationId: regularOrg.id,
        name: 'DR Testing Facility',
        slug: `dr-facility-${suffix}`,
        code: `DR-${suffix.substring(0, 6)}`,
        address: '100 Recovery Way',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
      },
    });

    regularUser = await prisma.user.create({
      data: {
        email: `regular_member_${suffix}@fitcore-member.com`,
        passwordHash: await bcrypt.hash('MemberPass123!', 4),
        firstName: 'Regular',
        lastName: 'Member',
      },
    });

    regularMemberProfile = await prisma.memberProfile.create({
      data: {
        organisationId: regularOrg.id,
        userId: regularUser.id,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // =========================================================================
  // 1. BACKUP ORCHESTRATION & CHECKSUMMING
  // =========================================================================
  describe('1. Backup Orchestration & Checksum Integrity', () => {
    let createdBackup: any;

    it('creates an encrypted database backup with SHA-256 checksum and retention policy', async () => {
      createdBackup = await backupOrchestrator.triggerBackup(
        {
          backupType: BackupTypeEnum.FULL,
          retentionDays: 45,
          isImmutable: true,
          encryptionKeyId: 'kms-key-fitcore-primary',
        },
        superadminUser.id,
      );

      expect(createdBackup).toBeDefined();
      expect(createdBackup.status).toBe('COMPLETED');
      expect(createdBackup.backupType).toBe('FULL');
      expect(createdBackup.checksumSha256).toBeDefined();
      expect(createdBackup.checksumSha256.length).toBe(64); // SHA-256 hex length
      expect(createdBackup.isImmutable).toBe(true);
      expect(createdBackup.immutableUntil).toBeDefined();
      expect(createdBackup.storagePath).toContain('fitcore_db_full_');
      expect(createdBackup.rpoTimestamp).toBeDefined();
    });

    it('lists backups with verification history and metrics', async () => {
      const list = await backupOrchestrator.listBackups();
      expect(list.length).toBeGreaterThan(0);
      expect(list.some((b) => b.id === createdBackup.id)).toBe(true);

      const metrics = await backupOrchestrator.getBackupMetrics();
      expect(metrics.totalBackups).toBeGreaterThan(0);
      expect(metrics.backupSuccessRate).toBeGreaterThanOrEqual(90);
      expect(metrics.isFresh).toBe(true);
    });

    it('protects immutable backups from premature retention pruning', async () => {
      const retentionResult = await backupOrchestrator.enforceRetentionPolicy();
      expect(retentionResult).toBeDefined();
      // Our newly created immutable backup must never be pruned
      expect(retentionResult.prunedIds).not.toContain(createdBackup.id);
    });
  });

  // =========================================================================
  // 2. BACKUP VERIFICATION & CORRUPTION DETECTION
  // =========================================================================
  describe('2. Backup Verification & Corruption Detection', () => {
    let testBackup: any;

    beforeAll(async () => {
      testBackup = await backupOrchestrator.triggerBackup({
        backupType: BackupTypeEnum.FULL,
      });
    });

    it('successfully verifies checksum and decryption headers of a valid backup', async () => {
      const verification = await backupVerification.verifyBackup({
        backupRecordId: testBackup.id,
      });

      expect(verification.status).toBe('PASSED');
      expect(verification.checksumVerified).toBe(true);
      expect(verification.decryptionVerified).toBe(true);
      expect(verification.schemaVerified).toBe(true);
      expect(verification.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('detects simulated corruption and flags verification as FAILED', async () => {
      const failedVerification = await backupVerification.verifyBackup({
        backupRecordId: testBackup.id,
        simulateCorruption: true,
      });

      expect(failedVerification.status).toBe('FAILED');
      expect(failedVerification.checksumVerified).toBe(false);
      expect(failedVerification.details).toContain('SIMULATED_INTEGRITY_FAILURE');
    });
  });

  // =========================================================================
  // 3. RESTORE TEST DRILL & SLA MEASUREMENTS
  // =========================================================================
  describe('3. Automated Sandbox Restore Drill & Observed RTO/RPO', () => {
    let candidateBackup: any;

    beforeAll(async () => {
      candidateBackup = await backupOrchestrator.triggerBackup({
        backupType: BackupTypeEnum.FULL,
      });
    });

    it('executes automated restore drill, checks schema migrations, and records observed RTO and RPO', async () => {
      const drill = await restoreTestService.runRestoreTest(
        {
          backupRecordId: candidateBackup.id,
          targetEnvironment: 'DR_SANDBOX',
        },
        superadminUser.id,
      );

      expect(drill).toBeDefined();
      expect(drill.status).toBe('SUCCESS');
      expect(drill.dataIntegrityPassed).toBe(true);
      expect(drill.businessValidationPassed).toBe(true);
      expect(drill.recordsValidatedCount).toBeGreaterThan(0);

      // Verify measured RTO and RPO numbers
      expect(drill.observedRtoSeconds).toBeGreaterThan(0);
      expect(drill.observedRtoSeconds).toBeLessThan(60); // Drill finishes in under 60s
      expect(drill.observedRpoSeconds).toBeLessThan(300); // Fresh backup within 5 minutes

      // Check recovery metrics
      const metrics = await restoreTestService.getRecoveryMetrics();
      expect(metrics.totalDrills).toBeGreaterThan(0);
      expect(metrics.restoreSuccessRate).toBe(100);
      expect(metrics.isWithinRtoSla).toBe(true);
      expect(metrics.isWithinRpoSla).toBe(true);
    });
  });

  // =========================================================================
  // 4. DATA INTEGRITY AUDIT (NON-DESTRUCTIVE)
  // =========================================================================
  describe('4. Data Integrity Audit (Foreign-Keys & Orphan Prevention)', () => {
    it('verifies non-destructive data integrity audit detects zero orphan records', async () => {
      const audit = await integrityValidator.validateIntegrity();

      expect(audit.isValid).toBe(true);
      expect(audit.failedChecks).toBe(0);
      expect(audit.errors.length).toBe(0);
      expect(audit.entityCounts.organisations).toBeGreaterThan(0);
      expect(audit.entityCounts.members).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 5. BUSINESS CONTINUITY INVARIANTS
  // =========================================================================
  describe('5. Business Continuity Invariant Validation', () => {
    it('validates membership scopes, class session capacities, and payment amounts', async () => {
      // Seed a valid membership with recognized accessScope
      const plan = await prisma.membershipPlan.create({
        data: {
          organisationId: regularOrg.id,
          name: 'DR Gold Plan',
          code: `DR-GOLD-${Date.now()}`,
          status: 'ACTIVE',
          price: 99,
          membershipType: 'STANDARD',
          billingType: 'RECURRING',
        },
      });

      await prisma.memberMembership.create({
        data: {
          organisationId: regularOrg.id,
          memberProfileId: regularMemberProfile.id,
          membershipPlanId: plan.id,
          status: 'ACTIVE',
          accessScope: 'SINGLE_OUTLET',
          originOutletId: regularOutlet.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 86400000),
          planNameAtPurchase: 'DR Gold Plan',
          priceAtPurchase: 99,
          currencyAtPurchase: 'AUD',
          billingTypeAtPurchase: 'RECURRING',
          durationValueAtPurchase: 1,
          durationUnitAtPurchase: 'MONTH',
        },
      });

      const report = await businessContinuity.validateBusinessInvariants();

      expect(report.valid).toBe(true);
      expect(report.violations.length).toBe(0);
      expect(report.metrics.activeMembershipsChecked).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 6. PAYMENT RECONCILIATION & DOUBLE-CHARGE PREVENTION
  // =========================================================================
  describe('6. Payment Reconciliation & Double-Charge Prevention', () => {
    it('reconciles in-flight payments and prevents duplicate charges on idempotency match', async () => {
      const idempotencyKey = `dr_idem_${Date.now()}`;

      // 1. Create completed transaction
      const completedTx = await prisma.paymentTransaction.create({
        data: {
          organisationId: regularOrg.id,
          memberProfileId: regularMemberProfile.id,
          amountMinor: 5000,
          currency: 'AUD',
          status: 'SUCCEEDED',
          provider: 'MOCK_GATEWAY',
          providerTransactionId: `ch_prov_${Date.now()}`,
          metadata: { idempotencyKey },
        },
      });

      // 2. Create in-flight PENDING duplicate transaction with same idempotencyKey
      const pendingDuplicateTx = await prisma.paymentTransaction.create({
        data: {
          organisationId: regularOrg.id,
          memberProfileId: regularMemberProfile.id,
          amountMinor: 5000,
          currency: 'AUD',
          status: 'PENDING',
          provider: 'MOCK_GATEWAY',
          providerTransactionId: `ch_prov_pend_${Date.now()}`,
          metadata: { idempotencyKey },
        },
      });

      // 3. Run reconciliation
      const result = await reconciliationService.reconcileUnknownPayments(regularOrg.id, 24);

      expect(result.duplicateChargesPrevented).toBeGreaterThanOrEqual(1);

      // Verify the pending duplicate was marked FAILED without double-charging
      const updatedTx = await prisma.paymentTransaction.findUnique({
        where: { id: pendingDuplicateTx.id },
      });
      expect(updatedTx?.status).toBe('FAILED');
      expect(updatedTx?.failureMessage).toContain('RECONCILIATION_SUPPRESSED');
    });
  });

  // =========================================================================
  // 7. PRIVACY TOMBSTONE RECONCILIATION (DAY 53 COMPLIANCE)
  // =========================================================================
  describe('7. Privacy Tombstone Reconciliation (Day 53 GDPR Protection)', () => {
    it('re-applies privacy erasure tombstones to restored accounts to prevent resurrection', async () => {
      const privacyVictim = await prisma.user.create({
        data: {
          email: `victim_${Date.now()}@erased-member.com`,
          passwordHash: await bcrypt.hash('VictimPass123!', 4),
          firstName: 'Victim',
          lastName: 'Erased',
        },
      });

      const victimProfile = await prisma.memberProfile.create({
        data: {
          organisationId: regularOrg.id,
          userId: privacyVictim.id,
          status: 'ACTIVE',
        },
      });

      // Run privacy reconciliation with this user's email in the tombstone list
      const result = await reconciliationService.reconcilePrivacyState([privacyVictim.email]);

      expect(result.resurrectedDeletedProfilesIdentified).toBe(1);
      expect(result.reAppliedTombstonesCount).toBe(1);

      // Verify user was anonymized and profile archived
      const sanitizedUser = await prisma.user.findUnique({ where: { id: privacyVictim.id } });
      const sanitizedProfile = await prisma.memberProfile.findUnique({ where: { id: victimProfile.id } });

      expect(sanitizedUser?.email).toContain('@privacy-erased.fitcore.local');
      expect(sanitizedUser?.firstName).toBe('ANONYMIZED');
      expect(sanitizedProfile?.status).toBe('ARCHIVED');
    });
  });

  // =========================================================================
  // 8. DEGRADED MODE PLANS & OFFLINE ACCESS POLICY
  // =========================================================================
  describe('8. Degraded Mode Plans & Fallback Capabilities', () => {
    it('evaluates AI provider degraded mode with zero impact on core gym operations', () => {
      const plan = businessContinuity.evaluateDegradedMode('AI');
      expect(plan.subsystem).toBe('AI');
      expect(plan.status).toBe('DEGRADED');
      expect(plan.impactOnCoreOperations).toBe('NONE');
      expect(plan.fallbackStrategy).toContain('rule-based static templates');
    });

    it('evaluates Turnstile Physical Access degraded mode with safe fail-secure policy', () => {
      const plan = businessContinuity.evaluateDegradedMode('ACCESS');
      expect(plan.subsystem).toBe('ACCESS');
      expect(plan.status).toBe('DEGRADED');
      expect(plan.impactOnCoreOperations).toBe('LOW');
      expect(plan.fallbackStrategy).toContain('Turnstiles operate on fast cached outlet policies');
    });
  });

  // =========================================================================
  // 9. DISASTER RECOVERY INCIDENT LIFECYCLE
  // =========================================================================
  describe('9. Disaster Recovery Incident Lifecycle', () => {
    it('declares, updates, and resolves a formal Disaster Recovery incident', async () => {
      const incident = await incidentService.declareIncident(
        {
          title: 'Primary PostgreSQL Host Degradation',
          severity: DrSeverityEnum.SEV0_CRITICAL,
          summary: 'Database connection pool saturation detected. Declaring controlled DR drill.',
          targetRtoMinutes: 45,
          targetRpoMinutes: 10,
        },
        superadminUser,
      );

      expect(incident).toBeDefined();
      expect(incident.incidentNumber).toContain('DR-');
      expect(incident.status).toBe('DECLARED');

      // Update incident to RECOVERING
      const recovering = await incidentService.updateIncident(
        incident.id,
        {
          status: DrIncidentStatusEnum.RECOVERING,
          message: 'Initiated standby replica promotion and cache warm-up.',
        },
        superadminUser,
      );
      expect(recovering.status).toBe('RECOVERING');

      // Resolve incident with measured numbers
      const resolved = await incidentService.updateIncident(
        incident.id,
        {
          status: DrIncidentStatusEnum.RESOLVED,
          message: 'All core services restored, data integrity confirmed.',
          observedRtoMinutes: 12,
          observedRpoMinutes: 2,
        },
        superadminUser,
      );

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.observedRtoMinutes).toBe(12);
      expect(resolved.observedRpoMinutes).toBe(2);
      expect(resolved.resolvedAt).toBeDefined();

      // Retrieve full incident history
      const fetched = await incidentService.getIncident(incident.id);
      expect(fetched.events.length).toBeGreaterThanOrEqual(3);
    });
  });
});
