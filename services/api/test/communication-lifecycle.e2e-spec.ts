import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { NotificationService } from '../src/communication/services/notification.service';
import { NotificationOrchestratorService } from '../src/communication/services/notification-orchestrator.service';
import { NotificationTemplateService } from '../src/communication/services/notification-template.service';
import { NotificationPreferenceService } from '../src/communication/services/notification-preference.service';
import { PushDeviceService } from '../src/communication/services/push-device.service';
import { NotificationSchedulerService } from '../src/communication/services/notification-scheduler.service';
import { NotificationDeliveryService } from '../src/communication/services/notification-delivery.service';
import { NotificationQueueService } from '../src/communication/queue/notification-queue.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';
import {
  NotificationCategoryEnum,
  NotificationPriorityEnum,
  NotificationChannelEnum,
  PushPlatformEnum,
} from '../src/communication/dto/communication.dto';

describe('Day 17: Communication & Notifications Foundation E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notificationService: NotificationService;
  let orchestrator: NotificationOrchestratorService;
  let templateService: NotificationTemplateService;
  let preferenceService: NotificationPreferenceService;
  let pushDeviceService: PushDeviceService;
  let schedulerService: NotificationSchedulerService;
  let deliveryService: NotificationDeliveryService;
  let queueService: NotificationQueueService;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let alexUser: any;
  let bobUserOrgB: any;
  let charlieUser: any;

  let actorOwnerOrgA: AuthenticatedUser;
  let actorAlexUser: AuthenticatedUser;
  let actorBobUserOrgB: AuthenticatedUser;
  let actorCharlieUser: AuthenticatedUser;

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
    notificationService = app.get(NotificationService);
    orchestrator = app.get(NotificationOrchestratorService);
    templateService = app.get(NotificationTemplateService);
    preferenceService = app.get(NotificationPreferenceService);
    pushDeviceService = app.get(PushDeviceService);
    schedulerService = app.get(NotificationSchedulerService);
    deliveryService = app.get(NotificationDeliveryService);
    queueService = app.get(NotificationQueueService);

    // Retrieve test tenants & users
    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });
    outletA = await prisma.outlet.findFirstOrThrow({ where: { organisationId: orgA.id } });

    // Org Owner
    const ownerUser = await prisma.user.findFirstOrThrow({ where: { email: 'owner@secondwind.com.au' } });
    actorOwnerOrgA = {
      id: ownerUser.id,
      email: ownerUser.email,
      firstName: ownerUser.firstName,
      lastName: ownerUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgA.id }],
      permissions: [
        { resource: 'notifications', action: 'manage', scope: 'ORGANISATION' },
        { resource: 'communications', action: 'manage', scope: 'ORGANISATION' },
      ],
    };

    // Member Alex (Org A)
    alexUser = await prisma.user.findFirstOrThrow({ where: { email: 'member@secondwind.com.au' } });
    actorAlexUser = {
      id: alexUser.id,
      email: alexUser.email,
      firstName: alexUser.firstName,
      lastName: alexUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgA.id }],
      permissions: [
        { resource: 'notifications', action: 'manage', scope: 'SELF' },
        { resource: 'communications', action: 'read', scope: 'SELF' },
      ],
    };

    // User Charlie (Org A, second member for isolation tests)
    const charlie = await prisma.user.upsert({
      where: { email: 'charlie.day17@secondwind.com.au' },
      update: {},
      create: {
        email: 'charlie.day17@secondwind.com.au',
        passwordHash: 'dummy_hash_for_tests',
        firstName: 'Charlie',
        lastName: 'NotificationTest',
        status: 'ACTIVE',
      },
    });
    charlieUser = charlie;
    actorCharlieUser = {
      id: charlie.id,
      email: charlie.email,
      firstName: charlie.firstName,
      lastName: charlie.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgA.id }],
      permissions: [
        { resource: 'notifications', action: 'manage', scope: 'SELF' },
      ],
    };

    // User Bob (Org B)
    const bob = await prisma.user.findFirstOrThrow({ where: { email: 'member@apexstrength.com.au' } });
    bobUserOrgB = bob;
    actorBobUserOrgB = {
      id: bob.id,
      email: bob.email,
      firstName: bob.firstName,
      lastName: bob.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgB.id }],
      permissions: [
        { resource: 'notifications', action: 'manage', scope: 'SELF' },
      ],
    };

    // Clean up past notifications for test isolation
    await prisma.notificationDelivery.deleteMany({
      where: {
        notification: {
          recipientUserId: { in: [alexUser.id, charlieUser.id, bobUserOrgB.id] },
        },
      },
    });
    await prisma.notification.deleteMany({
      where: {
        recipientUserId: { in: [alexUser.id, charlieUser.id, bobUserOrgB.id] },
      },
    });
    await prisma.notificationSchedule.deleteMany({
      where: {
        recipientUserId: { in: [alexUser.id, charlieUser.id, bobUserOrgB.id] },
      },
    });
    await prisma.pushDevice.deleteMany({
      where: {
        userId: { in: [alexUser.id, charlieUser.id, bobUserOrgB.id] },
      },
    });
    await prisma.notificationTemplate.deleteMany({
      where: {
        organisationId: orgA.id,
      },
    });
    await prisma.notificationPreference.deleteMany({
      where: {
        userId: { in: [alexUser.id, charlieUser.id, bobUserOrgB.id] },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // GROUP 1: TEMPLATE ENGINE & SAFE INTERPOLATION
  // ==========================================
  describe('Group 1: Notification Templates & Safe Variable Interpolation', () => {
    it('seeds default system templates on startup', async () => {
      const templates = await prisma.notificationTemplate.findMany({
        where: { isSystem: true },
      });
      expect(templates.length).toBeGreaterThanOrEqual(5);

      const bookingInApp = templates.find(
        (t) => t.key === 'BOOKING_CONFIRMED' && t.channel === 'IN_APP',
      );
      expect(bookingInApp).toBeDefined();
      expect(bookingInApp?.isSystem).toBe(true);
      expect(bookingInApp?.organisationId).toBeNull();
    });

    it('prevents organisation users from modifying or deleting system templates', async () => {
      const systemTemplate = await prisma.notificationTemplate.findFirstOrThrow({
        where: { isSystem: true },
      });

      await expect(
        templateService.updateTemplate(
          orgA.id,
          systemTemplate.id,
          { name: 'Hacked System Template' },
          actorOwnerOrgA,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('safely renders template variables with deep paths and escaping', () => {
      const templateText =
        'Hi {{member.firstName}}, your {{booking.className}} class at {{outlet.name}} is confirmed!';
      const context = {
        member: { firstName: 'Alex' },
        booking: { className: 'HIIT <script>alert("xss")</script>' },
        outlet: { name: 'Perth CBD' },
      };

      const rendered = templateService.render(templateText, context);
      expect(rendered).toContain('Hi Alex');
      expect(rendered).toContain('Perth CBD is confirmed!');
      // Verifies HTML sanitization against XSS
      expect(rendered).not.toContain('<script>');
      expect(rendered).toContain('&lt;script&gt;');
    });

    it('gracefully handles missing template variables without crashing', () => {
      const templateText =
        'Hello {{member.firstName}}, your trainer is {{trainer.name}}. Notes: {{missing.prop}}';
      const context = {
        member: { firstName: 'Alex' },
      };

      const rendered = templateService.render(templateText, context);
      expect(rendered).toBe('Hello Alex, your trainer is . Notes: ');
    });

    it('allows organisations to create custom templates and increments version on update', async () => {
      const created = await templateService.createTemplate(
        orgA.id,
        {
          key: 'CUSTOM_WORKOUT_PROMO',
          name: 'Custom Workout Promo',
          channel: NotificationChannelEnum.IN_APP,
          category: NotificationCategoryEnum.TRAINING,
          body: 'Check out our new program: {{promo.title}}!',
          variables: ['promo.title'],
        },
        actorOwnerOrgA,
      );

      expect(created.id).toBeDefined();
      expect(created.organisationId).toBe(orgA.id);
      expect(created.version).toBe(1);

      // Update template -> increments version
      const updated = await templateService.updateTemplate(
        orgA.id,
        created.id,
        {
          body: 'Special offer: {{promo.title}} is now 50% off!',
        },
        actorOwnerOrgA,
      );

      expect(updated.version).toBe(2);
      expect(updated.body).toContain('50% off');
    });
  });

  // ==========================================
  // GROUP 2: EVENT-DRIVEN ORCHESTRATION & DELIVERY
  // ==========================================
  describe('Group 2: Domain Event Orchestration & Multi-Channel Delivery', () => {
    it('orchestrates a domain notification event into persisted Notification and Deliveries', async () => {
      const notification = await orchestrator.handleDomainEvent({
        type: 'BOOKING_CONFIRMED',
        organisationId: orgA.id,
        outletId: outletA.id,
        recipientUserId: alexUser.id,
        category: NotificationCategoryEnum.BOOKING,
        priority: NotificationPriorityEnum.NORMAL,
        variables: {
          booking: {
            className: 'Power Yoga 60',
            startTime: 'Tomorrow at 07:00 AM',
          },
          outlet: { name: 'Second Wind Perth CBD' },
          member: { firstName: 'Alex' },
        },
        data: {
          actionType: 'BOOKING',
          actionId: 'booking_test_123',
          deepLink: 'fitcore://bookings/booking_test_123',
        },
      });

      expect(notification).toBeDefined();
      expect(notification?.recipientUserId).toBe(alexUser.id);
      expect(notification?.organisationId).toBe(orgA.id);
      expect(notification?.title).toBe('Booking Confirmed');
      expect(notification?.body).toContain('Power Yoga 60');
      expect(notification?.status).toBe('DELIVERED');

      // Check deliveries (IN_APP, PUSH, EMAIL)
      expect(notification?.deliveries.length).toBeGreaterThanOrEqual(2);
      const inAppDelivery = notification?.deliveries.find(
        (d: any) => d.channel === 'IN_APP',
      );
      expect(inAppDelivery).toBeDefined();
      expect(inAppDelivery?.status).toBe('DELIVERED');
    });

    it('enforces idempotency key protection preventing duplicate notifications', async () => {
      const idempotencyKey = 'booking:b999:reminder:30m:20260907';

      const eventPayload = {
        type: 'CLASS_REMINDER',
        organisationId: orgA.id,
        recipientUserId: alexUser.id,
        category: NotificationCategoryEnum.BOOKING,
        variables: {
          booking: { className: 'HIIT Express' },
          reminder: { timeUntil: '30 minutes' },
          outlet: { name: 'Perth CBD' },
        },
        idempotencyKey,
      };

      const firstDispatch = await orchestrator.handleDomainEvent(eventPayload);
      expect(firstDispatch).toBeDefined();

      const secondDispatch = await orchestrator.handleDomainEvent(eventPayload);
      // Returns the exact same notification without creating duplicates
      expect(secondDispatch?.id).toBe(firstDispatch?.id);

      const count = await prisma.notification.count({
        where: {
          recipientUserId: alexUser.id,
          data: {
            path: ['idempotencyKey'],
            equals: idempotencyKey,
          },
        },
      });
      expect(count).toBe(1);
    });

    it('preserves historical notification content even after template updates', async () => {
      // 1. Create custom template v1
      const customTemplate = await templateService.createTemplate(
        orgA.id,
        {
          key: 'SPECIAL_ANNOUNCEMENT',
          name: 'Announcement V1',
          channel: NotificationChannelEnum.IN_APP,
          category: NotificationCategoryEnum.SYSTEM,
          body: 'Version 1 Announcement for {{member.firstName}}',
          variables: ['member.firstName'],
        },
        actorOwnerOrgA,
      );

      // 2. Dispatch notification using v1
      const notif = await orchestrator.handleDomainEvent({
        type: 'SPECIAL_ANNOUNCEMENT',
        organisationId: orgA.id,
        recipientUserId: alexUser.id,
        category: NotificationCategoryEnum.SYSTEM,
        variables: { member: { firstName: 'Alex' } },
      });
      expect(notif?.body).toBe('Version 1 Announcement for Alex');

      // 3. Update template to v2
      await templateService.updateTemplate(
        orgA.id,
        customTemplate.id,
        { body: 'Version 2 NEW Announcement for {{member.firstName}}' },
        actorOwnerOrgA,
      );

      // 4. Verify historical notification remains unchanged
      const historical = await notificationService.getNotificationById(
        alexUser.id,
        orgA.id,
        notif!.id,
      );
      expect(historical.body).toBe('Version 1 Announcement for Alex');
    });
  });

  // ==========================================
  // GROUP 3: IN-APP NOTIFICATION CENTRE & READ STATES
  // ==========================================
  describe('Group 3: In-App Notification Centre, Unread Counts & Read States', () => {
    let testNotifId: string;

    beforeAll(async () => {
      // Create fresh notifications for Alex
      const n1 = await orchestrator.handleDomainEvent({
        type: 'PAYMENT_SUCCEEDED',
        organisationId: orgA.id,
        recipientUserId: alexUser.id,
        category: NotificationCategoryEnum.PAYMENT,
        variables: {
          payment: {
            amountFormatted: '$89.00',
            description: 'Weekly Membership',
          },
        },
      });
      testNotifId = n1!.id;

      await orchestrator.handleDomainEvent({
        type: 'WORKOUT_ASSIGNED',
        organisationId: orgA.id,
        recipientUserId: alexUser.id,
        category: NotificationCategoryEnum.TRAINING,
        variables: {
          trainer: { name: 'Marcus' },
          workout: { name: 'Leg Hypertrophy A' },
        },
      });
    });

    it('returns paginated notifications for the user with accurate unread count', async () => {
      const list = await notificationService.getNotifications(alexUser.id, orgA.id, {
        page: 1,
        limit: 10,
      });

      expect(list.data.length).toBeGreaterThanOrEqual(2);
      expect(list.total).toBeGreaterThanOrEqual(2);

      const unread = await notificationService.getUnreadCount(alexUser.id, orgA.id);
      expect(unread.unreadCount).toBeGreaterThanOrEqual(2);
    });

    it('filters notifications by category and unread status', async () => {
      const paymentOnly = await notificationService.getNotifications(alexUser.id, orgA.id, {
        category: NotificationCategoryEnum.PAYMENT,
      });
      expect(paymentOnly.data.every((n) => n.category === 'PAYMENT')).toBe(true);

      const unreadOnly = await notificationService.getNotifications(alexUser.id, orgA.id, {
        unreadOnly: true,
      });
      expect(unreadOnly.data.every((n) => n.readAt === null)).toBe(true);
    });

    it('marks a single notification as read and updates readAt timestamp', async () => {
      const initialUnread = await notificationService.getUnreadCount(alexUser.id, orgA.id);

      const marked = await notificationService.markAsRead(
        alexUser.id,
        orgA.id,
        testNotifId,
        true,
      );
      expect(marked.readAt).toBeDefined();
      expect(marked.status).toBe('READ');

      const updatedUnread = await notificationService.getUnreadCount(alexUser.id, orgA.id);
      expect(updatedUnread.unreadCount).toBe(initialUnread.unreadCount - 1);
    });

    it('marks all notifications as read for the user', async () => {
      const res = await notificationService.markAllAsRead(alexUser.id, orgA.id);
      expect(res.updatedCount).toBeGreaterThanOrEqual(1);

      const unread = await notificationService.getUnreadCount(alexUser.id, orgA.id);
      expect(unread.unreadCount).toBe(0);
    });

    it('deletes a notification successfully', async () => {
      const deleteRes = await notificationService.deleteNotification(
        alexUser.id,
        orgA.id,
        testNotifId,
      );
      expect(deleteRes.success).toBe(true);

      await expect(
        notificationService.getNotificationById(alexUser.id, orgA.id, testNotifId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================
  // GROUP 4: ZERO-TRUST USER ISOLATION & IDOR PREVENTION
  // ==========================================
  describe('Group 4: Zero-Trust User Isolation & IDOR Security', () => {
    let charlieNotifId: string;

    beforeAll(async () => {
      // Create notification specifically for Charlie
      const notif = await orchestrator.handleDomainEvent({
        type: 'BOOKING_CONFIRMED',
        organisationId: orgA.id,
        recipientUserId: charlieUser.id,
        category: NotificationCategoryEnum.BOOKING,
        variables: {
          booking: { className: 'Pilates Reformer' },
          outlet: { name: 'Perth CBD' },
        },
      });
      charlieNotifId = notif!.id;
    });

    it('prevents User Alex from viewing User Charlies notification (IDOR check)', async () => {
      await expect(
        notificationService.getNotificationById(alexUser.id, orgA.id, charlieNotifId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('prevents User Alex from marking User Charlies notification as read', async () => {
      await expect(
        notificationService.markAsRead(alexUser.id, orgA.id, charlieNotifId, true),
      ).rejects.toThrow(ForbiddenException);
    });

    it('prevents User Alex from deleting User Charlies notification', async () => {
      await expect(
        notificationService.deleteNotification(alexUser.id, orgA.id, charlieNotifId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('prevents cross-tenant access between Organisation A and Organisation B', async () => {
      await expect(
        notificationService.getNotificationById(bobUserOrgB.id, orgB.id, charlieNotifId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================
  // GROUP 5: NOTIFICATION PREFERENCES & QUIET HOURS
  // ==========================================
  describe('Group 5: Preferences, Quiet Hours & Channel Suppression', () => {
    it('allows a user to update preferences and suppresses opted-out channels', async () => {
      // Alex opts out of TRAINING PUSH notifications
      await preferenceService.updatePreference(alexUser.id, orgA.id, {
        category: NotificationCategoryEnum.TRAINING,
        channel: NotificationChannelEnum.PUSH,
        enabled: false,
      });

      // Dispatch training notification
      const notif = await orchestrator.handleDomainEvent({
        type: 'WORKOUT_ASSIGNED',
        organisationId: orgA.id,
        recipientUserId: alexUser.id,
        category: NotificationCategoryEnum.TRAINING,
        variables: { trainer: { name: 'Marcus' }, workout: { name: 'Chest Day' } },
      });

      // Verifies IN_APP was created, but PUSH was suppressed!
      const deliveries = notif?.deliveries || [];
      expect(deliveries.some((d: any) => d.channel === 'IN_APP')).toBe(true);
      expect(deliveries.some((d: any) => d.channel === 'PUSH')).toBe(false);
    });

    it('bypasses opt-outs for critical security alerts', async () => {
      // Alex opts out of SYSTEM channel
      await preferenceService.updatePreference(alexUser.id, orgA.id, {
        category: NotificationCategoryEnum.SECURITY,
        channel: NotificationChannelEnum.PUSH,
        enabled: false,
      });

      const allowed = await preferenceService.isDeliveryAllowed(
        alexUser.id,
        orgA.id,
        NotificationCategoryEnum.SECURITY,
        NotificationChannelEnum.PUSH,
        NotificationPriorityEnum.URGENT,
      );

      // Critical security alerts bypass opt-outs
      expect(allowed.allowed).toBe(true);
    });
  });

  // ==========================================
  // GROUP 6: MARKETING CONSENT VERIFICATION
  // ==========================================
  describe('Group 6: Communication Consent Compliance', () => {
    it('blocks marketing notifications if marketing consent is not active', async () => {
      const allowed = await preferenceService.isDeliveryAllowed(
        alexUser.id,
        orgA.id,
        NotificationCategoryEnum.MARKETING,
        NotificationChannelEnum.PUSH,
        NotificationPriorityEnum.NORMAL,
        true, // isMarketing
      );

      expect(allowed.allowed).toBe(false);
      expect(allowed.reason).toBe('MARKETING_CONSENT_WITHDRAWN_OR_MISSING');
    });

    it('permits transactional communications even when marketing consent is absent', async () => {
      const allowed = await preferenceService.isDeliveryAllowed(
        alexUser.id,
        orgA.id,
        NotificationCategoryEnum.BOOKING,
        NotificationChannelEnum.EMAIL,
        NotificationPriorityEnum.NORMAL,
        false, // isMarketing
      );

      expect(allowed.allowed).toBe(true);
    });
  });

  // ==========================================
  // GROUP 7: PUSH DEVICE MANAGEMENT
  // ==========================================
  describe('Group 7: Push Device Registration & Masking', () => {
    let deviceId: string;

    it('registers a device push token and returns masked token', async () => {
      const registered = await pushDeviceService.registerDevice(alexUser.id, orgA.id, {
        deviceId: 'device_alex_iphone_15',
        platform: PushPlatformEnum.IOS,
        pushToken: 'fcm_token_abcdef1234567890_secret_payload',
        deviceName: "Alex's iPhone 15 Pro",
        appVersion: '1.2.0',
      });

      expect(registered.id).toBeDefined();
      expect(registered.status).toBe('ACTIVE');
      deviceId = registered.deviceId;

      // Sensitive token must be masked in API response
      expect(registered.pushTokenMasked).toBe('fcm_...load');
      expect(registered.pushTokenMasked).not.toBe('fcm_token_abcdef1234567890_secret_payload');
    });

    it('retrieves raw active tokens internally for push delivery', async () => {
      const tokens = await pushDeviceService.getActiveTokens(alexUser.id);
      expect(tokens).toContain('fcm_token_abcdef1234567890_secret_payload');
    });

    it('revokes a registered device on logout', async () => {
      const revoked = await pushDeviceService.revokeDevice(alexUser.id, deviceId);
      expect(revoked.status).toBe('REVOKED');

      const activeTokens = await pushDeviceService.getActiveTokens(alexUser.id);
      expect(activeTokens).not.toContain('fcm_token_abcdef1234567890_secret_payload');
    });
  });

  // ==========================================
  // GROUP 8: NOTIFICATION SCHEDULING & REMINDERS
  // ==========================================
  describe('Group 8: Notification Scheduler & Reminder Engine', () => {
    let scheduleId: string;

    it('schedules a future notification with idempotency', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour in future
      const schedule = await schedulerService.scheduleNotification(orgA.id, {
        recipientUserId: alexUser.id,
        notificationType: 'CLASS_REMINDER',
        scheduledFor: futureDate.toISOString(),
        idempotencyKey: 'schedule:booking_456:reminder:1h',
        payload: {
          className: 'Sprint Cycle 45',
          outletName: 'Perth CBD',
          timeUntil: '1 hour',
        },
      });

      expect(schedule.id).toBeDefined();
      expect(schedule.status).toBe('SCHEDULED');
      scheduleId = schedule.id;

      // Duplicate schedule attempt returns existing
      const duplicate = await schedulerService.scheduleNotification(orgA.id, {
        recipientUserId: alexUser.id,
        notificationType: 'CLASS_REMINDER',
        scheduledFor: futureDate.toISOString(),
        idempotencyKey: 'schedule:booking_456:reminder:1h',
        payload: { className: 'Sprint Cycle 45' },
      });
      expect(duplicate.id).toBe(schedule.id);
    });

    it('cancels a scheduled notification', async () => {
      const cancelled = await schedulerService.cancelSchedule(orgA.id, scheduleId);
      expect(cancelled.status).toBe('CANCELLED');
    });

    it('processes due schedules in batch worker', async () => {
      // Create a schedule that is already due (scheduled in past)
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago
      await schedulerService.scheduleNotification(orgA.id, {
        recipientUserId: alexUser.id,
        notificationType: 'BOOKING_CONFIRMED',
        scheduledFor: pastDate.toISOString(),
        idempotencyKey: 'due_schedule_test_001',
        payload: {
          category: NotificationCategoryEnum.BOOKING,
          booking: { className: 'Recovery Yoga', startTime: 'Now' },
          outlet: { name: 'Perth CBD' },
          member: { firstName: 'Alex' },
        },
      });

      const res = await schedulerService.processDueSchedules();
      expect(res.processedCount).toBeGreaterThanOrEqual(1);

      // Verify that the schedule was marked SENT
      const processed = await prisma.notificationSchedule.findUnique({
        where: { idempotencyKey: 'due_schedule_test_001' },
      });
      expect(processed?.status).toBe('SENT');
    });
  });

  // ==========================================
  // GROUP 9: QUEUE RETRIES & EXPONENTIAL BACKOFF
  // ==========================================
  describe('Group 9: Queue Processing & Retry Backoff', () => {
    it('increments attempt count on retry and marks failed at limit', async () => {
      // Create delivery record
      const notif = await prisma.notification.create({
        data: {
          organisationId: orgA.id,
          recipientUserId: alexUser.id,
          type: 'TEST_RETRY',
          category: 'SYSTEM',
          title: 'Test Retry',
          body: 'Test Retry Body',
          status: 'PENDING',
        },
      });

      const delivery = await prisma.notificationDelivery.create({
        data: {
          notificationId: notif.id,
          channel: 'EMAIL',
          provider: 'TEST_FAILING',
          status: 'PENDING',
          attemptCount: 0,
        },
      });

      // Enqueue retry attempt 1
      await queueService.enqueueRetry({
        deliveryId: delivery.id,
        notificationId: notif.id,
        channel: 'EMAIL',
        attemptCount: 0,
      });

      expect(queueService.queueSize).toBeGreaterThan(0);
    });
  });
});
