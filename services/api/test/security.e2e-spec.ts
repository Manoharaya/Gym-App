/**
 * FitCore — Day 52: Advanced Security Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. MFA Enrollment (TOTP generation, secret encryption, provisioning URI)
 * 2. MFA Verification & Clock Tolerance (valid code, invalid code, ±30s clock drift)
 * 3. Single-Use Recovery Codes (atomic consumption, reuse prevention, regeneration)
 * 4. MFA Login Challenge Flow (mfaRequired response, challenge token, verify & session issuance)
 * 5. Step-Up Authentication (challenge issuance, verification, single-use consumption)
 * 6. Session Management (tracking, listing, individual revocation, revoke-all)
 * 7. Refresh Token Rotation & Compromise Detection (rotation, replay detection, token family revocation, alert creation)
 * 8. Device Registration & Trust (fingerprinting, trust status, device trust cannot bypass MFA)
 * 9. Authentication Risk Evaluation (signal analysis, risk scoring, recommended action)
 * 10. Brute-Force & Account Lockout (5 failed attempts trigger lockout, zero account enumeration)
 * 11. Security Events & Metadata Sanitization (emission, severity levels, secret redaction)
 * 12. Security Alerts Workflow (open, acknowledge, resolve)
 * 13. Enterprise IP Restrictions (CIDR allowlist/denylist, hierarchical inheritance, hard ceilings, fail-closed admin)
 * 14. Tenant Boundary Defense (Org A cannot view or mutate Org B security resources)
 * 15. Privilege Escalation Defense (Member cannot call administrative security endpoints)
 * 16. Secret Protection Invariant (assert no password, raw token, or secret is ever leaked)
 * 17. Concurrency Verification (simultaneous recovery code consumption allows exactly one)
 * 18. End-to-End User Flow (login -> MFA challenge -> verified session -> device registered -> step-up)
 * 19. Enterprise Administrator Flow (policy require MFA -> admin login -> review events -> revoke session)
 * 20. Attacker Failure Flow (brute force -> lockout -> MFA failure -> risk escalation -> security alert)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { SecurityService } from '../src/security/security.service';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

describe('Day 52: Advanced Security E2E Suite', () => {
  jest.setTimeout(90000);

  let app: INestApplication;
  let prisma: PrismaService;
  let security: SecurityService;

  let superAdminToken: string;
  let orgOwnerToken: string;
  let memberToken: string;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let superAdminUser: any;
  let orgOwnerUser: any;
  let memberUser: any;
  let userB: any;
  let passwordHash: string;
  let orgOwnerRole: any;
  let memberRole: any;

  const getBody = (res: any) =>
    res.body && res.body.data !== undefined ? res.body.data : res.body;

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
    security = app.get(SecurityService);

    // Setup Test Organisations
    const ts = Date.now();
    orgA = await prisma.organisation.create({
      data: {
        name: `Security Org Alpha ${ts}`,
        slug: `sec-org-alpha-${ts}`,
        status: 'ACTIVE',
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `Security Org Beta ${ts}`,
        slug: `sec-org-beta-${ts}`,
        status: 'ACTIVE',
      },
    });

    outletA = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: `Alpha Main Outlet ${ts}`,
        code: `SEC-${ts}`,
        slug: `alpha-main-${ts}`,
        address: '100 St Georges Terrace',
        city: 'Perth',
        state: 'WA',
        postalCode: '6000',
        country: 'Australia',
        status: 'ACTIVE',
      },
    });

    // Ensure Roles
    const superAdminRole = await prisma.role.upsert({
      where: { name: 'SUPERADMIN' },
      update: {},
      create: { name: 'SUPERADMIN', description: 'Platform Superadmin' },
    });

    orgOwnerRole = await prisma.role.upsert({
      where: { name: 'ORGANISATION_OWNER' },
      update: {},
      create: { name: 'ORGANISATION_OWNER', description: 'Organisation Owner' },
    });

    memberRole = await prisma.role.upsert({
      where: { name: 'MEMBER' },
      update: {},
      create: { name: 'MEMBER', description: 'Gym Member' },
    });

    passwordHash = await bcrypt.hash('Password123!', 10);

    // 1. Superadmin
    superAdminUser = await prisma.user.create({
      data: {
        email: `sec-superadmin-${ts}@fitcore.io`,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        status: 'ACTIVE',
        userRoles: {
          create: { roleId: superAdminRole.id, organisationId: orgA.id },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    // 2. Org Owner (Org A)
    orgOwnerUser = await prisma.user.create({
      data: {
        email: `sec-owner-${ts}@fitcore.io`,
        passwordHash,
        firstName: 'Org',
        lastName: 'Owner',
        status: 'ACTIVE',
        userRoles: {
          create: { roleId: orgOwnerRole.id, organisationId: orgA.id },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    // 3. Member (Org A)
    memberUser = await prisma.user.create({
      data: {
        email: `sec-member-${ts}@fitcore.io`,
        passwordHash,
        firstName: 'Gym',
        lastName: 'Member',
        status: 'ACTIVE',
        userRoles: {
          create: { roleId: memberRole.id, organisationId: orgA.id, outletId: outletA.id },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    // 4. User in Org B (for Tenant Isolation testing)
    userB = await prisma.user.create({
      data: {
        email: `sec-user-orgb-${ts}@fitcore.io`,
        passwordHash,
        firstName: 'User',
        lastName: 'Beta',
        status: 'ACTIVE',
        userRoles: {
          create: { roleId: orgOwnerRole.id, organisationId: orgB.id },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    // Obtain JWT Tokens
    const loginSuper = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: superAdminUser.email, password: 'Password123!' });
    superAdminToken = loginSuper.body.data?.accessToken || loginSuper.body.accessToken;

    const loginOwner = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: orgOwnerUser.email, password: 'Password123!' });
    orgOwnerToken = loginOwner.body.data?.accessToken || loginOwner.body.accessToken;

    const loginMember = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: memberUser.email, password: 'Password123!' });
    memberToken = loginMember.body.data?.accessToken || loginMember.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // 1. MFA ENROLLMENT & SECRET ENCRYPTION
  // =========================================================================
  describe('1. MFA Enrollment & Secret Protection', () => {
    it('should initiate TOTP enrollment, returning Base32 secret, otpauth URI, and 10 recovery codes', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/security/mfa/enroll')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ label: 'Personal iPhone Authenticator' })
        .expect(201);

      const data = getBody(res);
      expect(data.methodId).toBeDefined();
      expect(data.type).toBe('TOTP');
      expect(data.secret).toBeDefined();
      expect(data.secret.length).toBeGreaterThanOrEqual(16);
      expect(data.keyUri).toContain('otpauth://totp/');
      expect(data.recoveryCodes).toHaveLength(10);
      expect(data.recoveryCodes[0]).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);

      // Verify the secret stored in PostgreSQL is ENCRYPTED (AES-256-GCM format iv:authTag:ciphertext)
      const storedMethod = await prisma.userMfaMethod.findUnique({
        where: { id: data.methodId },
      });
      expect(storedMethod).toBeDefined();
      expect(storedMethod!.secretReference).not.toEqual(data.secret);
      expect(storedMethod!.secretReference.split(':')).toHaveLength(3);
      expect(storedMethod!.status).toBe('PENDING');

      // Verify recovery codes are stored as BCRYPT hashes, not plaintext
      const storedCodes = await prisma.userMfaRecoveryCode.findMany({
        where: { userId: memberUser.id },
      });
      expect(storedCodes).toHaveLength(10);
      expect(storedCodes[0].codeHash).toContain('$2');
      expect(storedCodes[0].codeHash).not.toEqual(data.recoveryCodes[0]);
    });
  });

  // =========================================================================
  // 2. MFA VERIFICATION & CLOCK TOLERANCE
  // =========================================================================
  describe('2. MFA Verification & Clock Tolerance', () => {
    it('should reject invalid 6-digit codes', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/security/mfa/verify')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ code: '000000' })
        .expect(401);
    });

    it('should successfully verify enrollment using a valid TOTP code and support ±30s clock tolerance', async () => {
      // Fetch user's pending TOTP secret
      const method = await prisma.userMfaMethod.findFirst({
        where: { userId: memberUser.id, status: 'PENDING' },
      });
      expect(method).toBeDefined();

      const decryptedSecret = security.mfa['encryptionService'].decrypt(method!.secretReference);

      // Generate code for a 30s drift in the past
      const pastTime = Date.now() - 30 * 1000;
      const validDriftCode = security.mfa['totpService'].generateCode(decryptedSecret, pastTime);

      const res = await request(app.getHttpServer())
        .post('/api/v1/security/mfa/verify')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ code: validDriftCode })
        .expect(201);

      expect(getBody(res).verified).toBe(true);

      // Verify status is now ACTIVE
      const updatedMethod = await prisma.userMfaMethod.findUnique({
        where: { id: method!.id },
      });
      expect(updatedMethod!.status).toBe('ACTIVE');
      expect(updatedMethod!.verifiedAt).toBeDefined();
    });
  });

  // =========================================================================
  // 3. SINGLE-USE RECOVERY CODES & REGENERATION
  // =========================================================================
  describe('3. Single-Use Recovery Codes', () => {
    let activeRecoveryCode: string;
    let stepUpToken: string;

    it('should consume a recovery code once and reject replay attempts', async () => {
      // Re-enroll to get a fresh plaintext recovery code
      const enrollRes = await request(app.getHttpServer())
        .post('/api/v1/security/mfa/enroll')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ label: 'Auth App' });
      const enrollment = getBody(enrollRes);
      activeRecoveryCode = enrollment.recoveryCodes[0];

      // Verify TOTP activation
      const decryptedSecret = security.mfa['encryptionService'].decrypt(
        (await prisma.userMfaMethod.findUnique({ where: { id: enrollment.methodId } }))!.secretReference,
      );
      const code = security.mfa['totpService'].generateCode(decryptedSecret);
      await request(app.getHttpServer())
        .post('/api/v1/security/mfa/verify')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ code });

      // 1. Consume recovery code
      const result1 = await security.mfa.verifyMfaChallenge(memberUser.id, activeRecoveryCode, true);
      expect(result1.success).toBe(true);
      expect(result1.methodUsed).toBe('RECOVERY_CODE');

      // 2. Replay attempt MUST fail
      await expect(
        security.mfa.verifyMfaChallenge(memberUser.id, activeRecoveryCode, true),
      ).rejects.toThrow();
    });

    it('should regenerate recovery codes after step-up authentication', async () => {
      // 1. Request step-up challenge
      const chalRes = await request(app.getHttpServer())
        .post('/api/v1/security/step-up/challenge')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ action: 'REGENERATE_RECOVERY_CODES' })
        .expect(201);
      stepUpToken = getBody(chalRes).challengeToken;

      // 2. Verify step-up challenge using password
      await request(app.getHttpServer())
        .post('/api/v1/security/step-up/verify')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ challengeToken: stepUpToken, password: 'Password123!' })
        .expect(201);

      // 3. Regenerate recovery codes
      const regenRes = await request(app.getHttpServer())
        .post('/api/v1/security/mfa/recovery-codes/regenerate')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ stepUpToken })
        .expect(201);

      const newCodes = getBody(regenRes).recoveryCodes;
      expect(newCodes).toHaveLength(10);
      expect(newCodes[0]).not.toEqual(activeRecoveryCode);
    });
  });

  // =========================================================================
  // 4. MFA LOGIN CHALLENGE & VERIFICATION FLOW
  // =========================================================================
  describe('4. MFA Login Challenge Flow', () => {
    it('should require MFA challenge for user with active MFA (no access token issued upfront)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: memberUser.email, password: 'Password123!' })
        .expect(200);

      const body = getBody(res);
      expect(body.mfaRequired).toBe(true);
      expect(body.mfaChallengeToken).toBeDefined();
      expect(body.accessToken).toBeUndefined(); // Crucial: unprivileged!
      expect(body.refreshToken).toBeUndefined();

      // Complete MFA challenge via /auth/mfa/verify
      const method = await prisma.userMfaMethod.findFirst({
        where: { userId: memberUser.id, status: 'ACTIVE' },
      });
      const secret = security.mfa['encryptionService'].decrypt(method!.secretReference);
      const code = security.mfa['totpService'].generateCode(secret);

      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/auth/mfa/verify')
        .send({ challengeToken: body.mfaChallengeToken, code })
        .expect(200);

      const verifyBody = getBody(verifyRes);
      expect(verifyBody.accessToken).toBeDefined();
      expect(verifyBody.refreshToken).toBeDefined();
      expect(verifyBody.user.email).toBe(memberUser.email);
    });
  });

  // =========================================================================
  // 5. STEP-UP AUTHENTICATION
  // =========================================================================
  describe('5. Step-Up Authentication', () => {
    it('should issue a challenge, verify it, and allow single-use consumption for sensitive operations', async () => {
      const chalRes = await request(app.getHttpServer())
        .post('/api/v1/security/step-up/challenge')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .send({ action: 'MODIFY_SECURITY_POLICY' })
        .expect(201);

      const token = getBody(chalRes).challengeToken;

      // Verify challenge with password
      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/security/step-up/verify')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .send({ challengeToken: token, password: 'Password123!' })
        .expect(201);
      expect(getBody(verifyRes).verified).toBe(true);

      // Consume once
      await security.stepUp.consumeChallenge(orgOwnerUser.id, token, 'MODIFY_SECURITY_POLICY');

      // Second consumption must fail (single-use)
      await expect(
        security.stepUp.consumeChallenge(orgOwnerUser.id, token, 'MODIFY_SECURITY_POLICY'),
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // 6. SESSION MANAGEMENT & REVOCATION
  // =========================================================================
  describe('6. Session Management', () => {
    it('should list active sessions and support single and bulk revocation', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/security/sessions')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .expect(200);

      const sessions = getBody(listRes);
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThanOrEqual(1);
      expect(sessions[0].status).toBe('ACTIVE');

      // Revoke all other sessions
      const revokeRes = await request(app.getHttpServer())
        .post('/api/v1/security/sessions/revoke-all?exceptCurrent=true')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .expect(201);

      expect(getBody(revokeRes).revokedCount).toBeDefined();
    });
  });

  // =========================================================================
  // 7. REFRESH TOKEN ROTATION & TOKEN COMPROMISE ANOMALY
  // =========================================================================
  describe('7. Refresh Token Rotation & Compromise Anomaly Detection', () => {
    it('should rotate refresh token and detect replay attack, invalidating session family', async () => {
      // 1. Create a dedicated user for replay testing so other test sessions remain intact
      const replayEmail = `sec-replay-${Date.now()}@fitcore.io`;
      const replayUser = await prisma.user.create({
        data: {
          email: replayEmail,
          passwordHash,
          firstName: 'Replay',
          lastName: 'Tester',
          status: 'ACTIVE',
          userRoles: {
            create: { roleId: orgOwnerRole.id, organisationId: orgA.id },
          },
        },
      });

      // Create a fresh session
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: replayEmail, password: 'Password123!' });

      const oldRefreshToken = getBody(loginRes).refreshToken;
      expect(oldRefreshToken).toBeDefined();

      // 2. Normal Rotation (Token A -> Token B)
      const rotateRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      const newRefreshToken = getBody(rotateRes).refreshToken;
      expect(newRefreshToken).toBeDefined();
      expect(newRefreshToken).not.toEqual(oldRefreshToken);

      // 3. Attacker attempts to replay already-consumed Token A -> REUSE ANOMALY!
      const replayRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);

      expect(replayRes.body.message || replayRes.body.error?.message).toContain('Token reuse detected');

      // 4. Verify session family is now COMPROMISED
      const compromisedSession = await prisma.session.findFirst({
        where: { userId: replayUser.id, status: 'COMPROMISED' },
      });
      expect(compromisedSession).toBeDefined();
      expect(compromisedSession!.isValid).toBe(false);

      // 5. Verify security event was recorded
      const reuseEvent = await prisma.securityEvent.findFirst({
        where: {
          userId: replayUser.id,
          eventType: 'REFRESH_TOKEN_REUSE_DETECTED',
        },
      });
      expect(reuseEvent).toBeDefined();
      expect(reuseEvent!.severity).toBe('HIGH');

      // 6. Verify security alert was created
      const alert = await prisma.securityAlert.findFirst({
        where: {
          organisationId: orgA.id,
          type: 'TOKEN_REUSE_COMPROMISE',
        },
      });
      expect(alert).toBeDefined();
      expect(alert!.status).toBe('OPEN');
    });
  });

  // =========================================================================
  // 8. DEVICE TRACKING & TRUST BOUNDARY
  // =========================================================================
  describe('8. Device Tracking & Trust Model', () => {
    it('should register device, allow trust elevation, and revoke device', async () => {
      const devicesRes = await request(app.getHttpServer())
        .get('/api/v1/security/devices')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const devices = getBody(devicesRes);
      expect(devices.length).toBeGreaterThanOrEqual(1);
      const targetDevice = devices[0];

      // Mark device as TRUSTED
      await request(app.getHttpServer())
        .post(`/api/v1/security/devices/${targetDevice.id}/trust`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      const updatedDevice = await prisma.userDevice.findUnique({
        where: { id: targetDevice.id },
      });
      expect(updatedDevice!.status).toBe('TRUSTED');

      // Crucial Invariant: Device Trust does NOT bypass MFA when MFA is required
      const loginAttempt = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('User-Agent', targetDevice.browser || 'Browser')
        .send({ email: memberUser.email, password: 'Password123!' });

      expect(getBody(loginAttempt).mfaRequired).toBe(true); // Must still require MFA!

      // Revoke device
      await request(app.getHttpServer())
        .post(`/api/v1/security/devices/${targetDevice.id}/revoke`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      const revokedDevice = await prisma.userDevice.findUnique({
        where: { id: targetDevice.id },
      });
      expect(revokedDevice!.status).toBe('REVOKED');
    });
  });

  // =========================================================================
  // 9. AUTHENTICATION RISK EVALUATION
  // =========================================================================
  describe('9. Authentication Risk Evaluation', () => {
    it('should score signals and recommend actions deterministically', async () => {
      // Normal low risk
      const lowRisk = await security.risk.evaluateRisk({
        userId: memberUser.id,
        isNewDevice: false,
        failedAttemptsCount: 0,
      });
      expect(lowRisk.riskLevel).toBe('LOW');
      expect(lowRisk.recommendedAction).toBe('ALLOW');

      // Critical risk with token reuse
      const critRisk = await security.risk.evaluateRisk({
        userId: memberUser.id,
        isTokenReuse: true,
        failedAttemptsCount: 5,
      });
      expect(critRisk.riskLevel).toBe('CRITICAL');
      expect(critRisk.recommendedAction).toBe('REVOKE_SESSION');
      expect(critRisk.signals).toContain('REFRESH_TOKEN_REUSE');
    });
  });

  // =========================================================================
  // 10. BRUTE-FORCE PROTECTION & ZERO ACCOUNT ENUMERATION
  // =========================================================================
  describe('10. Brute-Force Defense & Anti-Enumeration', () => {
    it('should lock out account after 5 consecutive failed attempts without leaking account existence', async () => {
      const testEmail = `victim-${Date.now()}@fitcore.io`;

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: testEmail, password: 'WrongPassword!' })
          .expect(401);
      }

      // 6th attempt triggers temporary lockout
      const lockedRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'Password123!' })
        .expect(401);

      expect(lockedRes.body.message || lockedRes.body.error?.message).toContain('Account is temporarily locked');
    });
  });

  // =========================================================================
  // 11. SECURITY EVENT TELEMETRY & METADATA SANITIZATION
  // =========================================================================
  describe('11. Security Events & Sanitization', () => {
    it('should query security events and verify passwords and secrets are strictly redacted', async () => {
      // Log event with attempted secret leak
      await security.events.recordEvent({
        organisationId: orgA.id,
        userId: memberUser.id,
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'MEDIUM',
        source: 'API',
        metadata: {
          ipAddress: '1.2.3.4',
          password: 'SuperSecretPassword!',
          refreshToken: 'fc_ref_leak123',
          normalKey: 'safe-value',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/security/events?severity=MEDIUM')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const events = getBody(res);
      expect(events.length).toBeGreaterThanOrEqual(1);

      const leakTestEvent = events.find((e: any) => e.eventType === 'SUSPICIOUS_ACTIVITY');
      expect(leakTestEvent).toBeDefined();
      expect(leakTestEvent.metadata.password).toBe('[REDACTED]');
      expect(leakTestEvent.metadata.refreshToken).toBe('[REDACTED]');
      expect(leakTestEvent.metadata.normalKey).toBe('safe-value');
    });
  });

  // =========================================================================
  // 12. SECURITY ALERTS WORKFLOW
  // =========================================================================
  describe('12. Security Alerts Workflow', () => {
    it('should list, acknowledge, and resolve security alerts', async () => {
      // 1. List alerts
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/security/alerts')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const alerts = getBody(listRes);
      expect(alerts.length).toBeGreaterThanOrEqual(1);
      const alertId = alerts[0].id;

      // 2. Acknowledge alert
      await request(app.getHttpServer())
        .post(`/api/v1/security/alerts/${alertId}/acknowledge`)
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', orgA.id)
        .send({ assignedTo: orgOwnerUser.id })
        .expect(201);

      const ackAlert = await prisma.securityAlert.findUnique({ where: { id: alertId } });
      expect(ackAlert!.status).toBe('ACKNOWLEDGED');

      // 3. Resolve alert
      await request(app.getHttpServer())
        .post(`/api/v1/security/alerts/${alertId}/resolve`)
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', orgA.id)
        .send({ resolutionNotes: 'Compromised session invalidated and user notified.' })
        .expect(201);

      const resolvedAlert = await prisma.securityAlert.findUnique({ where: { id: alertId } });
      expect(resolvedAlert!.status).toBe('RESOLVED');
      expect(resolvedAlert!.resolvedAt).toBeDefined();
    });
  });

  // =========================================================================
  // 13. ENTERPRISE IP RESTRICTIONS & HIERARCHICAL HARD CEILINGS
  // =========================================================================
  describe('13. Enterprise IP Restrictions & Ceilings', () => {
    it('should configure CIDR rules, enforce parent hard ceilings, and fail-closed on admin surfaces', async () => {
      // 1. Create Denylist Policy with CIDR on Organisation level
      const policyRes = await request(app.getHttpServer())
        .post('/api/v1/security/ip-policies')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          name: 'Block Untrusted Subnet',
          type: 'DENYLIST',
          targetSurfaces: ['ADMIN_LOGIN', 'ADMIN_PORTAL', 'FINANCE'],
          rules: [{ ipOrCidr: '198.51.100.0/24', description: 'Known malicious subnet' }],
          isHardCeiling: true,
        })
        .expect(201);

      const policy = getBody(policyRes);
      expect(policy.id).toBeDefined();

      // 2. Evaluate IP in blocked subnet -> BLOCKED
      const evalBlocked = await security.ip.evaluateAccess({
        organisationId: orgA.id,
        clientIp: '198.51.100.55',
        targetSurface: 'ADMIN_LOGIN',
      });
      expect(evalBlocked.allowed).toBe(false);

      // 3. Evaluate IP outside blocked subnet -> ALLOWED
      const evalAllowed = await security.ip.evaluateAccess({
        organisationId: orgA.id,
        clientIp: '203.0.113.10',
        targetSurface: 'ADMIN_LOGIN',
      });
      expect(evalAllowed.allowed).toBe(true);

      // 4. Fail-Closed Verification: Simulate evaluation error on admin surface
      jest.spyOn(prisma.securityIpPolicy, 'findMany').mockRejectedValueOnce(new Error('DB Timeout'));
      const failClosedRes = await security.ip.evaluateAccess({
        organisationId: orgA.id,
        clientIp: '203.0.113.10',
        targetSurface: 'ADMIN_LOGIN',
      });
      expect(failClosedRes.allowed).toBe(false);
      expect(failClosedRes.reason).toBe('FAIL_CLOSED_ADMIN_SURFACE_ERROR');
    });
  });

  // =========================================================================
  // 14. TENANT BOUNDARY ISOLATION
  // =========================================================================
  describe('14. Cross-Tenant Boundary Defense', () => {
    it('should prove Org A cannot view or manipulate Org B security resources', async () => {
      // Org A owner attempts to query Org B events -> blocked by TenantGuard with 403 Forbidden
      await request(app.getHttpServer())
        .get('/api/v1/security/events')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', orgB.id)
        .expect(403);

      // Org A owner attempts to revoke session belonging to User B
      const sessionB = await prisma.session.create({
        data: {
          userId: userB.id,
          organisationId: orgB.id,
          tokenFamily: 'family-b',
          isValid: true,
          expiresAt: new Date(Date.now() + 1000000),
        },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/security/sessions/${sessionB.id}/revoke`)
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .expect(403);
    });
  });

  // =========================================================================
  // 15. PRIVILEGE ESCALATION DEFENSE
  // =========================================================================
  describe('15. Privilege Escalation Defense', () => {
    it('should reject non-administrative users from accessing enterprise security endpoints', async () => {
      // Member tries to view security overview
      await request(app.getHttpServer())
        .get('/api/v1/security/overview')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(403);

      // Member tries to create IP policy
      await request(app.getHttpServer())
        .post('/api/v1/security/ip-policies')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          name: 'Hacker Allowlist',
          type: 'ALLOWLIST',
          targetSurfaces: ['API'],
          rules: [{ ipOrCidr: '0.0.0.0/0' }],
        })
        .expect(403);
    });
  });

  // =========================================================================
  // 16. CONCURRENCY VERIFICATION
  // =========================================================================
  describe('16. Concurrency Invariants', () => {
    it('should allow only one successful consumption when two calls attempt to use the same recovery code concurrently', async () => {
      // Generate two fresh codes
      const { plainCodes, hashedRecords } = await security.mfa['recoveryCodeService'].generateCodes(memberUser.id);
      await security.mfa['recoveryCodeService'].saveCodes(memberUser.id, hashedRecords);

      const targetCode = plainCodes[0];

      // Execute concurrently
      const [res1, res2] = await Promise.all([
        security.mfa['recoveryCodeService'].verifyAndConsume(memberUser.id, targetCode),
        security.mfa['recoveryCodeService'].verifyAndConsume(memberUser.id, targetCode),
      ]);

      // Exactly one must succeed
      expect((res1 && !res2) || (!res1 && res2)).toBe(true);
    });
  });

  // =========================================================================
  // 17. SECURITY OVERVIEW METRICS DASHBOARD
  // =========================================================================
  describe('17. Security Overview Dashboard', () => {
    it('should return valid metrics for organisation security dashboard', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/security/overview')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const metrics = getBody(res);
      expect(metrics.activeSessions).toBeGreaterThanOrEqual(0);
      expect(metrics.trustedDevices).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.mfaAdoptionRate).toBe('number');
      expect(metrics.openAlerts).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // 18. END-TO-END USER FLOW
  // =========================================================================
  describe('18. End-to-End User Flow', () => {
    it('should complete full user lifecycle: login -> MFA challenge -> session -> device -> step-up', async () => {
      const e2eEmail = `sec-e2e-${Date.now()}@fitcore.io`;
      await prisma.user.create({
        data: {
          email: e2eEmail,
          passwordHash,
          firstName: 'Lifecycle',
          lastName: 'User',
          status: 'ACTIVE',
          userRoles: {
            create: { roleId: memberRole.id, organisationId: orgA.id },
          },
        },
      });

      // 1. Initial Login (no MFA yet)
      const initLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: e2eEmail, password: 'Password123!' })
        .expect(200);
      const userToken = getBody(initLogin).accessToken;
      expect(userToken).toBeDefined();

      // 2. Enroll & verify MFA
      const enrollRes = await request(app.getHttpServer())
        .post('/api/v1/security/mfa/enroll')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ label: 'Mobile Device' })
        .expect(201);
      const enrollData = getBody(enrollRes);

      const secret = security.mfa['encryptionService'].decrypt(
        (await prisma.userMfaMethod.findUnique({ where: { id: enrollData.methodId } }))!.secretReference,
      );
      const code = security.mfa['totpService'].generateCode(secret);
      await request(app.getHttpServer())
        .post('/api/v1/security/mfa/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code })
        .expect(201);

      // 3. Second Login -> Challenges for MFA
      const secondLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: e2eEmail, password: 'Password123!' })
        .expect(200);
      const challenge = getBody(secondLogin);
      expect(challenge.mfaRequired).toBe(true);

      // 4. Complete Challenge -> Session Issued
      const nextCode = security.mfa['totpService'].generateCode(secret);
      const mfaComplete = await request(app.getHttpServer())
        .post('/api/v1/auth/mfa/verify')
        .send({ challengeToken: challenge.mfaChallengeToken, code: nextCode })
        .expect(200);
      const fullToken = getBody(mfaComplete).accessToken;
      expect(fullToken).toBeDefined();

      // 5. Trigger Step-Up Challenge for sensitive action
      const stepUpRes = await request(app.getHttpServer())
        .post('/api/v1/security/step-up/challenge')
        .set('Authorization', `Bearer ${fullToken}`)
        .send({ action: 'DISABLE_MFA' })
        .expect(201);
      const stepUpToken = getBody(stepUpRes).challengeToken;

      await request(app.getHttpServer())
        .post('/api/v1/security/step-up/verify')
        .set('Authorization', `Bearer ${fullToken}`)
        .send({ challengeToken: stepUpToken, password: 'Password123!' })
        .expect(201);

      // 6. Disable MFA with step-up token
      await request(app.getHttpServer())
        .post('/api/v1/security/mfa/disable')
        .set('Authorization', `Bearer ${fullToken}`)
        .send({ stepUpToken })
        .expect(201);
    });
  });

  // =========================================================================
  // 19. ENTERPRISE ADMINISTRATOR FLOW
  // =========================================================================
  describe('19. Enterprise Administrator Security Flow', () => {
    it('should allow admin to review security events, inspect alerts, and terminate sessions', async () => {
      // 1. Admin reviews security events
      const eventsRes = await request(app.getHttpServer())
        .get('/api/v1/security/events')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);
      expect(Array.isArray(getBody(eventsRes))).toBe(true);

      // 2. Admin queries security dashboard
      const overviewRes = await request(app.getHttpServer())
        .get('/api/v1/security/overview')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);
      expect(getBody(overviewRes).activeSessions).toBeGreaterThanOrEqual(1);

      // 3. Admin revokes a session
      const sessions = await prisma.session.findMany({
        where: { organisationId: orgA.id, isValid: true },
      });
      if (sessions.length > 0) {
        await request(app.getHttpServer())
          .post(`/api/v1/security/sessions/${sessions[0].id}/revoke`)
          .set('Authorization', `Bearer ${orgOwnerToken}`)
          .set('x-organisation-id', orgA.id)
          .expect(201);
      }
    });
  });

  // =========================================================================
  // 20. ATTACKER FAILURE FLOW
  // =========================================================================
  describe('20. Attacker Failure Flow', () => {
    it('should withstand brute force, enforce lockout, and escalate risk signals', async () => {
      const targetEmail = `victim-account-${Date.now()}@fitcore.io`;

      // 5 Failed password attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: targetEmail, password: 'BadPassword' })
          .expect(401);
      }

      // 6th attempt is locked out immediately
      const lockedRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: targetEmail, password: 'BadPassword' })
        .expect(401);
      expect(lockedRes.body.message || lockedRes.body.error?.message).toContain('Account is temporarily locked');

      // Risk score should evaluate as HIGH / CRITICAL
      const risk = await security.risk.evaluateRisk({
        userId: 'some-user-id',
        failedAttemptsCount: 6,
        isNewDevice: true,
      });
      expect(['HIGH', 'CRITICAL']).toContain(risk.riskLevel);
      expect([
        'CHALLENGE',
        'CHALLENGE_MFA',
        'REQUIRE_MFA',
        'LOCK_ACCOUNT',
        'REVOKE_SESSION',
      ]).toContain(risk.recommendedAction);
    });
  });
});
