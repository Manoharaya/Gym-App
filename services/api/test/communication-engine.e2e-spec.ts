import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { CommunicationsService } from '../src/communications/communications.service';
import { CommunicationOrchestratorService } from '../src/communications/orchestrator/communication-orchestrator.service';
import { DeliveryPolicyService } from '../src/communications/orchestrator/delivery-policy.service';
import { TemplateService } from '../src/communications/templates/template.service';
import { TemplateVersionService } from '../src/communications/templates/template-version.service';
import { TemplateRendererService } from '../src/communications/templates/template-renderer.service';
import { CommunicationPreferenceService } from '../src/communications/preferences/communication-preference.service';
import { ConsentPolicyService } from '../src/communications/preferences/consent-policy.service';
import { DeliveryService } from '../src/communications/delivery/delivery.service';
import { DeliveryStatusService } from '../src/communications/delivery/delivery-status.service';
import { RetryPolicyService } from '../src/communications/delivery/retry-policy.service';
import { DevelopmentCommunicationProvider } from '../src/communications/providers/development/development-provider.adapter';

describe('Day 28: Communication & Notification Engine E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let commsService: CommunicationsService;
  let orchestrator: CommunicationOrchestratorService;
  let templateService: TemplateService;
  let versionService: TemplateVersionService;
  let renderer: TemplateRendererService;
  let preferenceService: CommunicationPreferenceService;
  let consentPolicy: ConsentPolicyService;
  let deliveryService: DeliveryService;
  let deliveryStatusService: DeliveryStatusService;
  let devProvider: DevelopmentCommunicationProvider;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let memberUserA: any;
  let memberProfileA: any;
  let memberUserB: any;
  let memberProfileB: any;

  let actorOwnerOrgA: any;
  let actorMemberA: any;
  let actorOwnerOrgB: any;

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

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    commsService = moduleFixture.get<CommunicationsService>(CommunicationsService);
    orchestrator = moduleFixture.get<CommunicationOrchestratorService>(CommunicationOrchestratorService);
    templateService = moduleFixture.get<TemplateService>(TemplateService);
    versionService = moduleFixture.get<TemplateVersionService>(TemplateVersionService);
    renderer = moduleFixture.get<TemplateRendererService>(TemplateRendererService);
    preferenceService = moduleFixture.get<CommunicationPreferenceService>(CommunicationPreferenceService);
    consentPolicy = moduleFixture.get<ConsentPolicyService>(ConsentPolicyService);
    deliveryService = moduleFixture.get<DeliveryService>(DeliveryService);
    deliveryStatusService = moduleFixture.get<DeliveryStatusService>(DeliveryStatusService);
    devProvider = moduleFixture.get<DevelopmentCommunicationProvider>(DevelopmentCommunicationProvider);

    // Setup Test Tenancy & Members
    const suffix = Date.now();

    orgA = await prisma.organisation.create({
      data: {
        name: `FitCore Comms Org A ${suffix}`,
        slug: `comms-org-a-${suffix}`,
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `FitCore Comms Org B ${suffix}`,
        slug: `comms-org-b-${suffix}`,
      },
    });

    outletA = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: `Central Comms Outlet ${suffix}`,
        slug: `comms-central-${suffix}`,
        code: `CC${suffix.toString().slice(-4)}`,
        address: '100 Core St',
        city: 'Sydney',
        state: 'NSW',
        country: 'Australia',
        postalCode: '2000',
      },
    });

    memberUserA = await prisma.user.create({
      data: {
        email: `member_a_${suffix}@fitcore.io`,
        firstName: 'Alice',
        lastName: 'Cooper',
        passwordHash: 'hash123',
        phone: '+61412345678',
      },
    });

    memberProfileA = await prisma.memberProfile.create({
      data: {
        userId: memberUserA.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
        onboardingStatus: 'COMPLETED',
      },
    });

    memberUserB = await prisma.user.create({
      data: {
        email: `member_b_${suffix}@fitcore.io`,
        firstName: 'Bob',
        lastName: 'Dylan',
        passwordHash: 'hash123',
        phone: '+61487654321',
      },
    });

    memberProfileB = await prisma.memberProfile.create({
      data: {
        userId: memberUserB.id,
        organisationId: orgB.id,
        status: 'ACTIVE',
        onboardingStatus: 'COMPLETED',
      },
    });

    // Mock authenticated actors
    actorOwnerOrgA = {
      id: memberUserA.id,
      email: memberUserA.email,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgA.id, scope: 'ORGANISATION' }],
    };

    actorMemberA = {
      id: memberUserA.id,
      email: memberUserA.email,
      roles: [{ role: 'MEMBER', organisationId: orgA.id, scope: 'SELF' }],
    };

    actorOwnerOrgB = {
      id: memberUserB.id,
      email: memberUserB.email,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgB.id, scope: 'ORGANISATION' }],
    };
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    devProvider.clear();
  });

  // ===========================================================================
  // GROUP 1: Provider Abstraction & Development Provider
  // ===========================================================================
  describe('Group 1: Provider Abstraction & Safe Local Development', () => {
    it('dispatches communication via DevelopmentCommunicationProvider without sending real messages', async () => {
      const result = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        recipientUserId: memberUserA.id,
        type: 'OPERATIONAL',
        channel: 'SMS',
        body: 'Hello Alice, gym hours updated for public holiday.',
        source: 'STAFF',
        idempotencyKey: `dev-test-${Date.now()}`,
      });

      expect(result).toBeDefined();
      expect(result!.status).toBe('DELIVERED');
      expect(result!.provider).toBe('DEVELOPMENT');
      expect(result!.providerMessageId).toMatch(/^dev_msg_/);

      const sent = devProvider.getSentMessages();
      expect(sent.length).toBe(1);
      expect(sent[0].recipientPhone).toBe('+61412345678');
      expect(sent[0].channel).toBe('SMS');
    });

    it('records and returns simulated cost metrics', async () => {
      const comm = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        recipientUserId: memberUserA.id,
        type: 'REMINDER',
        channel: 'EMAIL',
        subject: 'Upcoming Class Reminder',
        body: 'Your Pilates session starts at 10am.',
        source: 'BOOKING',
        idempotencyKey: `cost-test-${Date.now()}`,
      });

      expect(comm).toBeDefined();
      expect(comm!.cost).toBeDefined();
      expect(comm!.currency).toBe('USD');
    });
  });

  // ===========================================================================
  // GROUP 2: Tenant Isolation & Recipient Authorization
  // ===========================================================================
  describe('Group 2: Tenant Isolation & Recipient Authorization', () => {
    let orgAComm: any;

    beforeEach(async () => {
      orgAComm = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        recipientUserId: memberUserA.id,
        type: 'TRANSACTIONAL',
        channel: 'EMAIL',
        subject: 'Org A Confidential Receipt',
        body: 'Receipt for $50 membership payment.',
        source: 'PAYMENT',
        idempotencyKey: `tenant-test-${Date.now()}`,
      });
    });

    it('allows Org A to access its own communications', async () => {
      const fetched = await commsService.getCommunicationById(orgAComm.id, orgA.id);
      expect(fetched.id).toBe(orgAComm.id);
      expect(fetched.organisationId).toBe(orgA.id);
    });

    it('strictly prevents Org B from accessing Org A communications (IDOR check)', async () => {
      await expect(
        commsService.getCommunicationById(orgAComm.id, orgB.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('prevents Org B from managing or cancelling Org A communications', async () => {
      await expect(
        commsService.cancelCommunication(orgAComm.id, memberUserB.id, orgB.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================================================
  // GROUP 3: Consent Integration & Preference Compliance
  // ===========================================================================
  describe('Group 3: Consent Integration & Preference Compliance', () => {
    it('suppresses MARKETING communications when Day 4 marketing consent is absent', async () => {
      const comm = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        recipientUserId: memberUserA.id,
        recipientMemberId: memberProfileA.id,
        type: 'MARKETING',
        channel: 'SMS',
        body: '20% off personal training sessions this weekend!',
        source: 'MARKETING',
        idempotencyKey: `marketing-suppressed-${Date.now()}`,
      });

      expect(comm).toBeDefined();
      expect(comm!.status).toBe('SUPPRESSED');
      expect(comm!.suppressionReason).toContain('MISSING_CONSENT');
      // Verify nothing was sent to provider
      expect(devProvider.getSentMessages().length).toBe(0);
    });

    it('allows TRANSACTIONAL communications even without marketing consent', async () => {
      const comm = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        recipientUserId: memberUserA.id,
        recipientMemberId: memberProfileA.id,
        type: 'TRANSACTIONAL',
        channel: 'EMAIL',
        subject: 'Payment Successful',
        body: 'Your payment was processed successfully.',
        source: 'PAYMENT',
        idempotencyKey: `transactional-allowed-${Date.now()}`,
      });

      expect(comm).toBeDefined();
      expect(comm!.status).toBe('DELIVERED');
      expect(comm!.suppressionReason).toBeNull();
    });

    it('suppresses communication when user has opted out of that channel', async () => {
      // Opt out of REMINDER on SMS
      await preferenceService.updatePreference(
        memberUserA.id,
        orgA.id,
        'SMS',
        'REMINDER',
        false,
      );

      const comm = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        recipientUserId: memberUserA.id,
        type: 'REMINDER',
        channel: 'SMS',
        body: 'Class starts in 30 mins.',
        source: 'BOOKING',
        idempotencyKey: `optout-suppressed-${Date.now()}`,
      });

      expect(comm).toBeDefined();
      expect(comm!.status).toBe('SUPPRESSED');
      expect(comm!.suppressionReason).toContain('OPTED_OUT');
    });

    it('prohibits opting out of critical TRANSACTIONAL messages', async () => {
      await expect(
        preferenceService.updatePreference(
          memberUserA.id,
          orgA.id,
          'EMAIL',
          'TRANSACTIONAL',
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('accurately evaluates quiet hours across midnight boundary', () => {
      const policyService = app.get(DeliveryPolicyService);
      const now = new Date();
      const currentH = now.getUTCHours();
      const startH = (currentH - 1 + 24) % 24;
      const endH = (currentH + 1) % 24;

      const pad = (n: number) => String(n).padStart(2, '0');
      const inQuiet = policyService.isWithinQuietHours(`${pad(startH)}:00`, `${pad(endH)}:00`, 'UTC');
      expect(inQuiet).toBe(true);

      const outsideStart = (currentH + 2) % 24;
      const outsideEnd = (currentH + 3) % 24;
      const outsideQuiet = policyService.isWithinQuietHours(`${pad(outsideStart)}:00`, `${pad(outsideEnd)}:00`, 'UTC');
      expect(outsideQuiet).toBe(false);
    });
  });

  // ===========================================================================
  // GROUP 4: Template System, Versioning & Safe Variable Rendering
  // ===========================================================================
  describe('Group 4: Template System, Versioning & Safe Variable Rendering', () => {
    let testTemplate: any;

    it('creates a template and generates version 1', async () => {
      testTemplate = await templateService.createTemplate({
        organisationId: orgA.id,
        name: 'Welcome Member Template',
        type: 'ENGAGEMENT',
        channel: 'EMAIL',
        subjectTemplate: 'Welcome to {{outlet.name}}, {{member.firstName}}!',
        bodyTemplate: 'Hi {{member.firstName}}, we are thrilled to have you at {{outlet.name}}.',
        variablesSchema: ['member.firstName', 'outlet.name'],
        actorUserId: memberUserA.id,
      });

      expect(testTemplate.id).toBeDefined();
      expect(testTemplate.versions.length).toBe(1);
      expect(testTemplate.versions[0].version).toBe(1);
    });

    it('safely renders template variables with dot notation', async () => {
      const rendered = await templateService.renderTemplate(testTemplate.id, {
        member: { firstName: 'Alice' },
        outlet: { name: 'Central Gym' },
      });

      expect(rendered.subject).toBe('Welcome to Central Gym, Alice!');
      expect(rendered.body).toBe('Hi Alice, we are thrilled to have you at Central Gym.');
    });

    it('throws controlled BadRequestException when required template variable is missing', async () => {
      await expect(
        templateService.renderTemplate(testTemplate.id, {
          member: { firstName: 'Alice' },
          // outlet.name is missing
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sanitizes dangerous HTML and script tags from template body', async () => {
      const maliciousTemplate = '<p>Hello!</p><script>alert("hack")</script><a href="javascript:void(0)">Link</a>';
      const sanitized = renderer.sanitizeHtml(maliciousTemplate);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('<p>Hello!</p>');
    });

    it('rejects prohibited sensitive variables like churnScore, medicalCondition, and password', async () => {
      expect(() => {
        renderer.render(
          'Hello {{member.firstName}}',
          {
            member: { firstName: 'Alice' },
            churnScore: 0.85,
          },
        );
      }).toThrow(BadRequestException);
    });

    it('increments version on template update and preserves version immutability', async () => {
      const updated = await templateService.updateTemplate(testTemplate.id, orgA.id, {
        bodyTemplate: 'Hi {{member.firstName}}! Your upgraded journey begins at {{outlet.name}}.',
        actorUserId: memberUserA.id,
      });

      expect(updated.latestVersion?.version).toBe(2);

      // Verify v1 is still retrievable and immutable
      const v1 = await versionService.getVersion(testTemplate.id, 1);
      expect(v1.bodyTemplate).toBe('Hi {{member.firstName}}, we are thrilled to have you at {{outlet.name}}.');

      // Verify v2 has new content
      const v2 = await versionService.getVersion(testTemplate.id, 2);
      expect(v2.bodyTemplate).toBe('Hi {{member.firstName}}! Your upgraded journey begins at {{outlet.name}}.');
    });
  });

  // ===========================================================================
  // GROUP 5: Idempotency & Duplicate Suppression
  // ===========================================================================
  describe('Group 5: Idempotency & Duplicate Suppression', () => {
    it('prevents duplicate sends using unique idempotencyKey', async () => {
      const key = `idempotency-key-${Date.now()}`;

      const first = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        recipientUserId: memberUserA.id,
        type: 'OPERATIONAL',
        channel: 'PUSH',
        body: 'Your locker PIN has been reset.',
        source: 'STAFF',
        idempotencyKey: key,
      });

      const second = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        recipientUserId: memberUserA.id,
        type: 'OPERATIONAL',
        channel: 'PUSH',
        body: 'Your locker PIN has been reset (retry).',
        source: 'STAFF',
        idempotencyKey: key,
      });

      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(second!.id).toBe(first!.id);
      expect(devProvider.getSentMessages().length).toBe(1);
    });
  });

  // ===========================================================================
  // GROUP 6: Transient Error Retries & Permanent Failures
  // ===========================================================================
  describe('Group 6: Transient Error Retries & Permanent Failures', () => {
    it('retries transient provider timeouts and succeeds', async () => {
      devProvider.setFailNext(false);

      const comm = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        recipientUserId: memberUserA.id,
        type: 'OPERATIONAL',
        channel: 'SMS',
        body: 'Important maintenance update.',
        source: 'SYSTEM',
        idempotencyKey: `retry-test-${Date.now()}`,
      });

      expect(comm).toBeDefined();
      expect(comm!.status).toBe('QUEUED');
      expect(comm!.attemptCount).toBe(1);

      const retryResult = await commsService.retryCommunication(comm!.id, memberUserA.id, orgA.id);
      expect(retryResult.success).toBe(true);

      const updated = await commsService.getCommunicationById(comm!.id, orgA.id);
      expect(updated.status).toBe('DELIVERED');
      expect(updated.attemptCount).toBe(2);
    });

    it('marks permanent errors as FAILED without retrying', async () => {
      devProvider.setFailNext(true);

      const comm = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        recipientUserId: memberUserA.id,
        type: 'OPERATIONAL',
        channel: 'EMAIL',
        subject: 'Important notice',
        body: 'Permanent rejection test.',
        source: 'SYSTEM',
        idempotencyKey: `permanent-fail-${Date.now()}`,
      });

      expect(comm).toBeDefined();
      expect(comm!.status).toBe('FAILED');
      expect(comm!.failedAt).toBeDefined();

      const retryPolicy = new RetryPolicyService();
      expect(retryPolicy.shouldRetry(1, 'PERMANENT_ERROR', 3)).toBe(false);
    });
  });

  // ===========================================================================
  // GROUP 7: Webhook Signature Verification & Event Ingestion
  // ===========================================================================
  describe('Group 7: Webhook Ingestion & Idempotent Tracking', () => {
    let sentComm: any;

    beforeEach(async () => {
      sentComm = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        recipientUserId: memberUserA.id,
        type: 'OPERATIONAL',
        channel: 'EMAIL',
        subject: 'Webhook Tracking Test',
        body: 'Testing webhook status transitions.',
        source: 'STAFF',
        idempotencyKey: `webhook-test-${Date.now()}`,
      });
    });

    it('rejects webhooks with missing or invalid signatures', async () => {
      await expect(
        commsService.handleWebhook('EMAIL', { event: 'delivered' }, 'invalid-signature'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('processes valid provider delivery webhook and normalizes status to READ', async () => {
      const webhookPayload = {
        eventId: `evt_${Date.now()}`,
        messageId: sentComm.providerMessageId,
        status: 'opened',
        timestamp: new Date().toISOString(),
      };

      const result = await commsService.handleWebhook('DEVELOPMENT', webhookPayload, 'test-dev-signature');
      expect(result.received).toBe(true);

      const comm = await commsService.getCommunicationById(sentComm.id, orgA.id);
      expect(comm.status).toBe('READ');
      expect(comm.readAt).toBeDefined();
    });

    it('processes duplicate webhook events idempotently without duplicating events', async () => {
      const eventId = `evt_duplicate_${Date.now()}`;
      const webhookPayload = {
        eventId,
        messageId: sentComm.providerMessageId,
        status: 'delivered',
        timestamp: new Date().toISOString(),
      };

      await commsService.handleWebhook('DEVELOPMENT', webhookPayload, 'test-dev-signature');

      const duplicateResult = await commsService.handleWebhook('DEVELOPMENT', webhookPayload, 'test-dev-signature');
      expect(duplicateResult.result.duplicate).toBe(true);

      const events = await prisma.communicationDeliveryEvent.findMany({
        where: { providerEventId: eventId },
      });
      expect(events.length).toBe(1);
    });
  });

  // ===========================================================================
  // GROUP 8: Staff Approval Workflow & Human-in-the-Loop
  // ===========================================================================
  describe('Group 8: Staff Approval Workflow & Human-in-the-Loop', () => {
    it('holds communication in PENDING_APPROVAL when requiresApproval is true', async () => {
      const pendingComm = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        recipientUserId: memberUserA.id,
        type: 'ENGAGEMENT',
        channel: 'SMS',
        body: 'Special offer drafted for you: 1 free personal training session.',
        source: 'STAFF',
        requiresApproval: true,
        idempotencyKey: `approval-req-${Date.now()}`,
      });

      expect(pendingComm).toBeDefined();
      expect(pendingComm!.status).toBe('PENDING_APPROVAL');
      expect(devProvider.getSentMessages().length).toBe(0);

      const approved = await commsService.approveCommunication(
        pendingComm!.id,
        memberUserA.id,
        orgA.id,
      );

      expect(approved).toBeDefined();
      expect(approved!.status).toBe('DELIVERED');
      expect(devProvider.getSentMessages().length).toBe(1);
    });

    it('allows staff to cancel pending communication before dispatch', async () => {
      const pendingComm = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        recipientUserId: memberUserA.id,
        type: 'ENGAGEMENT',
        channel: 'EMAIL',
        subject: 'Drafted Email',
        body: 'This should be cancelled.',
        source: 'STAFF',
        requiresApproval: true,
        idempotencyKey: `cancel-test-${Date.now()}`,
      });

      const cancelled = await commsService.cancelCommunication(
        pendingComm!.id,
        memberUserA.id,
        orgA.id,
      );

      expect(cancelled.status).toBe('CANCELLED');
      expect(devProvider.getSentMessages().length).toBe(0);
    });
  });

  // ===========================================================================
  // GROUP 9: In-App Notification Center & Mobile Experience
  // ===========================================================================
  describe('Group 9: In-App Notification Center & Mobile Experience', () => {
    it('delivers IN_APP communications to member notification center and tracks read state', async () => {
      const inAppComm = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        recipientUserId: memberUserA.id,
        type: 'OPERATIONAL',
        channel: 'IN_APP',
        subject: 'Class Schedule Change',
        body: 'Your 6:00 PM HIIT class room moved to Studio 2.',
        source: 'SYSTEM',
        idempotencyKey: `inapp-test-${Date.now()}`,
      });

      expect(inAppComm).toBeDefined();
      expect(inAppComm!.status).toBe('DELIVERED');

      const notifs = await commsService.getInAppNotifications(memberUserA.id, orgA.id, { unreadOnly: true });
      expect(notifs.items.length).toBeGreaterThanOrEqual(1);

      const target = notifs.items.find((n: any) => n.title === 'Class Schedule Change');
      expect(target).toBeDefined();
      expect(target!.readAt).toBeNull();

      const updated = await commsService.markNotificationRead(target!.id, memberUserA.id, orgA.id);
      expect(updated.status).toBe('READ');
      expect(updated.readAt).toBeDefined();
    });
  });

  // ===========================================================================
  // GROUP 10: Day 27 Reactivation & Future AI Gateway Integration
  // ===========================================================================
  describe('Group 10: Day 27 Reactivation & Future AI Gateway Integration', () => {
    it('dispatches approved Day 27 reactivation recovery plan outreach via orchestrator contract', async () => {
      const planOutreach = await orchestrator.submitCommunication({
        organisationId: orgA.id,
        outletId: outletA.id,
        recipientMemberId: memberProfileA.id,
        type: 'REACTIVATION',
        channel: 'SMS',
        body: 'Hi Alice, your trainer Marcus has customized a gentle 20-minute return routine for you.',
        source: 'REACTIVATION',
        sourceReferenceId: `recovery-plan-001`,
        idempotencyKey: `day27-plan-outreach-${Date.now()}`,
      });

      expect(planOutreach).toBeDefined();
      expect(planOutreach!.status).toBe('DELIVERED');
      expect(planOutreach!.source).toBe('REACTIVATION');
      expect(planOutreach!.sourceReferenceId).toBe('recovery-plan-001');

      const sent = devProvider.getSentMessages();
      expect(sent.length).toBe(1);
      expect(sent[0].body).toContain('gentle 20-minute return routine');
    });

    it('enforces future AI Agent contract: AI Agent must route through orchestrator with requiresApproval', async () => {
      const aiRequest = {
        organisationId: orgA.id,
        outletId: outletA.id,
        recipientMemberId: memberProfileA.id,
        type: 'REACTIVATION' as const,
        channel: 'SMS' as const,
        body: 'AI Draft: We noticed you missed your usual Tuesday workout. Can we help you reschedule?',
        source: 'AI_AGENT' as const,
        sourceReferenceId: 'ai-retention-run-42',
        requiresApproval: true,
        idempotencyKey: `ai-agent-draft-${Date.now()}`,
      };

      const result = await orchestrator.submitCommunication(aiRequest);

      expect(result).toBeDefined();
      expect(result!.status).toBe('PENDING_APPROVAL');
      expect(result!.source).toBe('AI_AGENT');
      expect(devProvider.getSentMessages().length).toBe(0);

      await commsService.approveCommunication(result!.id, memberUserA.id, orgA.id);
      expect(devProvider.getSentMessages().length).toBe(1);
    });

    it('generates accurate analytics aggregates for organisation management', async () => {
      const analytics = await commsService.getAnalytics(orgA.id);
      expect(analytics.totalMessages).toBeGreaterThanOrEqual(1);
      expect(analytics.deliveryRate).toBeGreaterThan(0);
      expect(analytics.byStatus).toBeDefined();
      expect(analytics.byChannel).toBeDefined();
      expect(analytics.currency).toBe('USD');
    });
  });
});
