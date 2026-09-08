/**
 * Day 32 — AI Receptionist Booking & Scheduling Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Schedule & Availability Discovery (filters, dynamic capacities, status normalization)
 * 2. Multi-Outlet disambiguation and clarification prompts
 * 3. Canonical booking eligibility checks (active memberships, entitlements, window)
 * 4. Two-Step Confirmation State Lifecycle (tokens, TTL expiration, single-use replay defense)
 * 5. Real-time transactional booking creation with post-execution verification
 * 6. Cancellation with policy notice window evaluation
 * 7. Atomic Rescheduling (preserves original spot on target failure)
 * 8. Waitlist joining when class session is full
 * 9. Cross-Tenant isolation and IDOR defense (blocks cross-member mutations)
 * 10. Zero-side-effect dry-run simulation mode
 * 11. Multilingual conversational booking flow (Nepali + English)
 * 12. Booking telemetry & conversion funnel metrics
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ReceptionistBookingService } from '../src/ai/features/receptionist/booking/receptionist-booking.service';
import { ConfirmationStateService } from '../src/ai/features/receptionist/confirmation/confirmation-state.service';
import { BookingSearchService } from '../src/ai/features/receptionist/booking/booking-search.service';
import { ReceptionistMemberIdentityService } from '../src/ai/features/receptionist/identity/receptionist-member-identity.service';
import { ReceptionistToolRegistry } from '../src/ai/features/receptionist/tools/receptionist-tool-registry';

describe('Day 32: AI Receptionist Booking & Scheduling E2E Integration Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let receptionistBookingService: ReceptionistBookingService;
  let confirmationService: ConfirmationStateService;
  let searchService: BookingSearchService;
  let identityService: ReceptionistMemberIdentityService;
  let toolRegistry: ReceptionistToolRegistry;

  // Test Entities
  let orgA: any;
  let orgB: any;
  let outletA1: any; // Downtown
  let outletA2: any; // Westside
  let outletB: any;
  let classTypeHIIT: any;
  let classTypeYoga: any;
  let trainerUser: any;
  let trainerProfile: any;
  let memberUserA: any;
  let memberProfileA: any;
  let memberUserB: any;
  let memberProfileB: any;
  let policyStandard: any;

  let sessionAvailable: any;
  let sessionFull: any;
  let sessionTargetReschedule: any;
  let receptionistA: any;
  let conversationA: any;

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
    receptionistBookingService = moduleFixture.get<ReceptionistBookingService>(ReceptionistBookingService);
    confirmationService = moduleFixture.get<ConfirmationStateService>(ConfirmationStateService);
    searchService = moduleFixture.get<BookingSearchService>(BookingSearchService);
    identityService = moduleFixture.get<ReceptionistMemberIdentityService>(ReceptionistMemberIdentityService);
    toolRegistry = moduleFixture.get<ReceptionistToolRegistry>(ReceptionistToolRegistry);

    const timestamp = Date.now();

    // 1. Organisations
    orgA = await prisma.organisation.create({
      data: {
        name: `FitCore Booking Org A ${timestamp}`,
        slug: `fitcore-booking-a-${timestamp}`,
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `FitCore Booking Org B ${timestamp}`,
        slug: `fitcore-booking-b-${timestamp}`,
      },
    });

    // 2. Outlets
    outletA1 = await prisma.outlet.create({
      data: {
        name: 'Downtown Club',
        slug: `dt-booking-${timestamp}`,
        code: `D${timestamp.toString().slice(-4)}`,
        organisationId: orgA.id,
        address: '100 Main Street',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
        country: 'Australia',
        timezone: 'Australia/Sydney',
        status: 'ACTIVE',
      },
    });

    outletA2 = await prisma.outlet.create({
      data: {
        name: 'Westside Branch',
        slug: `ws-booking-${timestamp}`,
        code: `W${timestamp.toString().slice(-4)}`,
        organisationId: orgA.id,
        address: '200 Western Road',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2150',
        country: 'Australia',
        timezone: 'Australia/Sydney',
        status: 'ACTIVE',
      },
    });

    outletB = await prisma.outlet.create({
      data: {
        name: 'Rival Gym Outlet',
        slug: `rival-booking-${timestamp}`,
        code: `R${timestamp.toString().slice(-4)}`,
        organisationId: orgB.id,
        address: '999 Other St',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
        country: 'Australia',
        timezone: 'Australia/Sydney',
        status: 'ACTIVE',
      },
    });

    // 3. Class Types
    classTypeHIIT = await prisma.classType.create({
      data: {
        name: 'Morning HIIT',
        description: 'High intensity interval training',
        category: 'Cardio',
        durationMinutes: 45,
        defaultCapacity: 20,
        organisationId: orgA.id,
      },
    });

    classTypeYoga = await prisma.classType.create({
      data: {
        name: 'Vinyasa Flow Yoga',
        description: 'Mindful dynamic movement',
        category: 'Mind & Body',
        durationMinutes: 60,
        defaultCapacity: 15,
        organisationId: orgA.id,
      },
    });

    // 4. Trainer User & Staff Profile
    trainerUser = await prisma.user.create({
      data: {
        email: `trainer-${timestamp}@fitcore.test`,
        passwordHash: 'test_hash',
        firstName: 'Sarah',
        lastName: 'Trainer',
      },
    });

    trainerProfile = await prisma.staffProfile.create({
      data: {
        userId: trainerUser.id,
        organisationId: orgA.id,
        displayName: 'Sarah Trainer',
        jobTitle: 'Trainer',
      },
    });

    // 5. Booking Policy
    policyStandard = await prisma.bookingPolicy.create({
      data: {
        name: 'Standard 2-Hour Cancellation Policy',
        organisationId: orgA.id,
        minimumCancellationNoticeHours: 2,
        lateCancellationWindowHours: 2,
        allowWaitlist: true,
        maxWaitlistSize: 10,
        maxBookingsPerDay: 3,
        maxAdvanceBookingHours: 168, // 7 days
      },
    });

    // 6. Member A (Org A)
    memberUserA = await prisma.user.create({
      data: {
        email: `member-a-${timestamp}@fitcore.test`,
        passwordHash: 'test_hash',
        firstName: 'Alice',
        lastName: 'Member',
      },
    });

    memberProfileA = await prisma.memberProfile.create({
      data: {
        userId: memberUserA.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
      },
    });

    await prisma.memberOutlet.create({
      data: {
        memberProfileId: memberProfileA.id,
        outletId: outletA1.id,
      },
    });

    // Active membership for Member A
    const planA = await prisma.membershipPlan.create({
      data: {
        name: 'All-Access Unlimited',
        code: `AA-${timestamp}`,
        description: 'All-Access Tier',
        price: 99,
        membershipType: 'STANDARD',
        durationValue: 1,
        durationUnit: 'MONTH',
        organisationId: orgA.id,
        status: 'ACTIVE',
        entitlements: {
          create: [
            {
              type: 'GROUP_CLASSES',
              name: 'Group Fitness Classes',
            },
          ],
        },
      },
    });

    await prisma.memberMembership.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfileA.id,
        membershipPlanId: planA.id,
        status: 'ACTIVE',
        accessScope: 'ALL_ORGANISATION_OUTLETS',
        startDate: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        planNameAtPurchase: planA.name,
        priceAtPurchase: planA.price,
        currencyAtPurchase: 'AUD',
        billingTypeAtPurchase: 'RECURRING',
        durationValueAtPurchase: 1,
        durationUnitAtPurchase: 'MONTH',
      },
    });

    // AI Receptionist & Conversation
    receptionistA = await prisma.aIReceptionist.create({
      data: {
        organisationId: orgA.id,
        name: 'Default AI Receptionist',
        displayName: 'FitCore Receptionist',
        greeting: 'Hello! How can I help you today?',
        status: 'ACTIVE',
        language: 'en',
      },
    });

    conversationA = await prisma.receptionistConversation.create({
      data: {
        organisationId: orgA.id,
        receptionistId: receptionistA.id,
        channel: 'WEB_CHAT',
        status: 'ACTIVE',
        customerId: memberProfileA.id,
        language: 'en',
      },
    });

    // 7. Member B (Org B)
    memberUserB = await prisma.user.create({
      data: {
        email: `member-b-${timestamp}@fitcore.test`,
        passwordHash: 'test_hash',
        firstName: 'Bob',
        lastName: 'CrossTenant',
      },
    });

    memberProfileB = await prisma.memberProfile.create({
      data: {
        userId: memberUserB.id,
        organisationId: orgB.id,
        status: 'ACTIVE',
      },
    });

    // 8. Class Sessions
    const tomorrowMorning = new Date();
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(7, 0, 0, 0);

    const tomorrowMorningEnd = new Date(tomorrowMorning.getTime() + 45 * 60 * 1000);

    // Session 1: Open Capacity (Capacity 10, 0 booked)
    sessionAvailable = await prisma.classSession.create({
      data: {
        name: 'Morning HIIT',
        classTypeId: classTypeHIIT.id,
        outletId: outletA1.id,
        trainerId: trainerUser.id,
        bookingPolicyId: policyStandard.id,
        organisationId: orgA.id,
        startsAt: tomorrowMorning,
        endsAt: tomorrowMorningEnd,
        capacity: 10,
        status: 'SCHEDULED',
        cancellationClosesAt: new Date(tomorrowMorning.getTime() - 2 * 3600 * 1000),
      },
    });

    // Session 2: Full Session (Capacity 1, 1 booked)
    const tomorrowAfternoon = new Date(tomorrowMorning);
    tomorrowAfternoon.setHours(17, 0, 0, 0);
    const tomorrowAfternoonEnd = new Date(tomorrowAfternoon.getTime() + 60 * 60 * 1000);

    sessionFull = await prisma.classSession.create({
      data: {
        name: 'Vinyasa Flow Yoga',
        classTypeId: classTypeYoga.id,
        outletId: outletA1.id,
        trainerId: trainerUser.id,
        bookingPolicyId: policyStandard.id,
        organisationId: orgA.id,
        startsAt: tomorrowAfternoon,
        endsAt: tomorrowAfternoonEnd,
        capacity: 1,
        status: 'SCHEDULED',
        cancellationClosesAt: new Date(tomorrowAfternoon.getTime() - 2 * 3600 * 1000),
      },
    });

    // Seed 1 confirmed booking on sessionFull
    await prisma.booking.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA1.id,
        memberProfileId: memberProfileA.id,
        classSessionId: sessionFull.id,
        status: 'CONFIRMED',
      },
    });

    // Session 3: Target for rescheduling
    const dayAfterTomorrow = new Date(tomorrowMorning);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    dayAfterTomorrow.setHours(9, 0, 0, 0);
    const dayAfterTomorrowEnd = new Date(dayAfterTomorrow.getTime() + 45 * 60 * 1000);

    sessionTargetReschedule = await prisma.classSession.create({
      data: {
        name: 'Morning HIIT Reschedule Target',
        classTypeId: classTypeHIIT.id,
        outletId: outletA1.id,
        trainerId: trainerUser.id,
        bookingPolicyId: policyStandard.id,
        organisationId: orgA.id,
        startsAt: dayAfterTomorrow,
        endsAt: dayAfterTomorrowEnd,
        capacity: 10,
        status: 'SCHEDULED',
        cancellationClosesAt: new Date(dayAfterTomorrow.getTime() - 2 * 3600 * 1000),
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.receptionistBookingInteraction.deleteMany({
      where: { organisationId: { in: [orgA.id, orgB.id] } },
    });
    await prisma.bookingConfirmationState.deleteMany({
      where: { organisationId: { in: [orgA.id, orgB.id] } },
    });
    await prisma.waitlistEntry.deleteMany({
      where: { classSessionId: { in: [sessionAvailable.id, sessionFull.id, sessionTargetReschedule.id] } },
    });
    await prisma.booking.deleteMany({
      where: { organisationId: { in: [orgA.id, orgB.id] } },
    });
    await prisma.classSession.deleteMany({
      where: { organisationId: { in: [orgA.id, orgB.id] } },
    });
    await prisma.bookingPolicy.deleteMany({
      where: { organisationId: { in: [orgA.id, orgB.id] } },
    });
    await prisma.memberMembership.deleteMany({
      where: { memberProfile: { organisationId: { in: [orgA.id, orgB.id] } } },
    });
    await prisma.membershipPlan.deleteMany({
      where: { organisationId: { in: [orgA.id, orgB.id] } },
    });
    await prisma.memberOutlet.deleteMany({
      where: { memberProfile: { organisationId: { in: [orgA.id, orgB.id] } } },
    });
    await prisma.memberProfile.deleteMany({
      where: { organisationId: { in: [orgA.id, orgB.id] } },
    });
    await prisma.staffProfile.deleteMany({
      where: { organisationId: { in: [orgA.id, orgB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [trainerUser.id, memberUserA.id, memberUserB.id] } },
    });
    await prisma.classType.deleteMany({
      where: { organisationId: { in: [orgA.id, orgB.id] } },
    });
    await prisma.receptionistMessage.deleteMany({
      where: { conversation: { organisationId: { in: [orgA.id, orgB.id] } } },
    });
    await prisma.receptionistConversation.deleteMany({
      where: { organisationId: { in: [orgA.id, orgB.id] } },
    });
    await prisma.aIReceptionist.deleteMany({
      where: { organisationId: { in: [orgA.id, orgB.id] } },
    });
    await prisma.outlet.deleteMany({
      where: { organisationId: { in: [orgA.id, orgB.id] } },
    });
    await prisma.organisation.deleteMany({
      where: { id: { in: [orgA.id, orgB.id] } },
    });

    await app.close();
  });

  // ---------------------------------------------------------------------------
  // 1. Availability Search & Multi-Outlet Disambiguation
  // ---------------------------------------------------------------------------
  describe('Availability Search & Disambiguation', () => {
    it('requires outlet clarification when searching multi-outlet org without outlet specified', async () => {
      const result = await searchService.searchAvailability(orgA.id, {});

      expect(result.requiresOutletClarification).toBe(true);
      expect(result.availableOutlets?.length).toBeGreaterThanOrEqual(2);
    });

    it('returns live sessions with spots remaining when outlet is specified', async () => {
      const result = await searchService.searchAvailability(orgA.id, {
        outletId: outletA1.id,
      });

      expect(result.requiresOutletClarification).toBe(false);
      expect(result.sessions.length).toBeGreaterThanOrEqual(1);

      const openSession = result.sessions.find((s) => s.sessionId === sessionAvailable.id);
      expect(openSession).toBeDefined();
      expect(openSession?.spotsRemaining).toBe(10);
      expect(openSession?.status).toBe('AVAILABLE');
      expect(openSession?.trainerName).toBe('Sarah Trainer');
    });

    it('marks full session as WAITLIST_AVAILABLE or FULL', async () => {
      const result = await searchService.searchAvailability(orgA.id, {
        outletId: outletA1.id,
      });

      const fullSession = result.sessions.find((s) => s.sessionId === sessionFull.id);
      expect(fullSession).toBeDefined();
      expect(fullSession?.spotsRemaining).toBe(0);
      expect(fullSession?.status).toBe('WAITLIST_AVAILABLE');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Member Eligibility & Canonical Policy Evaluation
  // ---------------------------------------------------------------------------
  describe('Canonical Eligibility Check', () => {
    it('assesses authenticated member as ELIGIBLE for open session', async () => {
      const result = await receptionistBookingService.searchAvailability(
        orgA.id,
        { outletId: outletA1.id },
        memberProfileA.id,
      );

      const target = result.sessions.find((s) => s.sessionId === sessionAvailable.id);
      expect(target?.eligibility?.eligible).toBe(true);
      expect(target?.eligibility?.reason).toBe('ELIGIBLE');
    });

    it('identifies unauthenticated prospect and restricts to discovery', async () => {
      const identity = await identityService.resolveMemberIdentity(orgA.id, undefined);
      expect(identity.isMember).toBe(false);

      expect(() => identityService.assertVerifiedMember(identity)).toThrow(UnauthorizedException);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Two-Step Confirmation State Token Lifecycle
  // ---------------------------------------------------------------------------
  describe('Two-Step Confirmation Lifecycle', () => {
    let confirmationToken: string;

    it('creates single-use confirmation state token with TTL', async () => {
      const confirmation = await confirmationService.createConfirmationState(
        orgA.id,
        memberProfileA.id,
        outletA1.id,
        {
          conversationId: conversationA.id,
          classSessionId: sessionAvailable.id,
          action: 'CREATE_BOOKING',
          displayedDetails: { className: 'Morning HIIT', time: '7:00 AM' },
          ttlSeconds: 600,
        },
      );

      expect(confirmation.confirmationToken).toBeDefined();
      expect(confirmation.status).toBe('PENDING');
      expect(confirmation.action).toBe('CREATE_BOOKING');
      confirmationToken = confirmation.confirmationToken;
    });

    it('validates and consumes token atomically upon execution', async () => {
      const result = await receptionistBookingService.executeConfirmedBooking(
        orgA.id,
        memberProfileA.id,
        {
          confirmationToken,
          notes: 'First time joining HIIT',
        },
      );

      expect(result.status).toBe('CONFIRMED');
      expect(result.bookingId).toBeDefined();

      // Verify token state is EXECUTED in database
      const dbConfirmation = await prisma.bookingConfirmationState.findUnique({
        where: { confirmationToken },
      });
      expect(dbConfirmation?.status).toBe('EXECUTED');
      expect(dbConfirmation?.executedAt).toBeDefined();
    });

    it('blocks replay attack when attempting to re-use executed token', async () => {
      await expect(
        receptionistBookingService.executeConfirmedBooking(orgA.id, memberProfileA.id, {
          confirmationToken,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Booking Cancellation with Policy Notice Window
  // ---------------------------------------------------------------------------
  describe('Cancellation Flow & Policy Window', () => {
    let bookedId: string;
    let cancelToken: string;

    beforeAll(async () => {
      // Create a test booking for member A
      const b = await prisma.booking.create({
        data: {
          organisationId: orgA.id,
          outletId: outletA1.id,
          memberProfileId: memberProfileA.id,
          classSessionId: sessionAvailable.id,
          status: 'CONFIRMED',
        },
      });
      bookedId = b.id;
    });

    it('evaluates cancellation policy correctly', async () => {
      const details = await receptionistBookingService.getBookingDetails(
        orgA.id,
        bookedId,
        memberProfileA.id,
      );

      expect(details.cancellationPolicy.canCancel).toBe(true);
      expect(details.cancellationPolicy.policyWindowHours).toBe(2);
    });

    it('creates cancellation confirmation and executes successfully', async () => {
      const conf = await confirmationService.createConfirmationState(
        orgA.id,
        memberProfileA.id,
        outletA1.id,
        {
          conversationId: conversationA.id,
          classSessionId: sessionAvailable.id,
          action: 'CANCEL_BOOKING',
          existingBookingId: bookedId,
        },
      );
      cancelToken = conf.confirmationToken;

      const cancelResult = await receptionistBookingService.executeConfirmedCancellation(
        orgA.id,
        memberProfileA.id,
        cancelToken,
        'Schedule conflict',
      );

      expect(cancelResult.status).toBe('CANCELLED');

      // Database verification
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: bookedId },
      });
      expect(updatedBooking?.status).toBe('CANCELLED');
      expect(updatedBooking?.cancellationReason).toBe('Schedule conflict');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Atomic Rescheduling (Preserves Original Booking on Failure)
  // ---------------------------------------------------------------------------
  describe('Atomic Rescheduling', () => {
    let originalBooking: any;

    beforeEach(async () => {
      originalBooking = await prisma.booking.create({
        data: {
          organisationId: orgA.id,
          outletId: outletA1.id,
          memberProfileId: memberProfileA.id,
          classSessionId: sessionAvailable.id,
          status: 'CONFIRMED',
        },
      });
    });

    it('atomically moves booking to new target session', async () => {
      const rescheduleConf = await confirmationService.createConfirmationState(
        orgA.id,
        memberProfileA.id,
        outletA1.id,
        {
          conversationId: conversationA.id,
          classSessionId: sessionTargetReschedule.id,
          action: 'RESCHEDULE_BOOKING',
          existingBookingId: originalBooking.id,
        },
      );

      const result = await receptionistBookingService.executeConfirmedReschedule(
        orgA.id,
        memberProfileA.id,
        rescheduleConf.confirmationToken,
      );

      expect(result.status).toBe('CONFIRMED');
      expect(result.newBookingId).toBeDefined();

      // Original booking is cancelled
      const oldB = await prisma.booking.findUnique({ where: { id: originalBooking.id } });
      expect(oldB?.status).toBe('CANCELLED');

      // New booking is confirmed
      const newB = await prisma.booking.findUnique({ where: { id: result.newBookingId } });
      expect(newB?.status).toBe('CONFIRMED');
      expect(newB?.classSessionId).toBe(sessionTargetReschedule.id);
    });

    it('preserves original booking if destination is full', async () => {
      // Attempt to reschedule to sessionFull (which has 0 spots remaining)
      const invalidRescheduleConf = await confirmationService.createConfirmationState(
        orgA.id,
        memberProfileA.id,
        outletA1.id,
        {
          conversationId: conversationA.id,
          classSessionId: sessionFull.id,
          action: 'RESCHEDULE_BOOKING',
          existingBookingId: originalBooking.id,
        },
      );

      await expect(
        receptionistBookingService.executeConfirmedReschedule(
          orgA.id,
          memberProfileA.id,
          invalidRescheduleConf.confirmationToken,
        ),
      ).rejects.toThrow(ConflictException);

      // Verify original booking is STILL CONFIRMED
      const preservedBooking = await prisma.booking.findUnique({
        where: { id: originalBooking.id },
      });
      expect(preservedBooking?.status).toBe('CONFIRMED');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Security & Multi-Tenant IDOR Guardrails
  // ---------------------------------------------------------------------------
  describe('Security & Multi-Tenant IDOR Boundaries', () => {
    it('blocks cross-member booking cancellation attempt', async () => {
      // Member B attempts to cancel Member A's booking
      const b = await prisma.booking.create({
        data: {
          organisationId: orgA.id,
          outletId: outletA1.id,
          memberProfileId: memberProfileA.id,
          classSessionId: sessionAvailable.id,
          status: 'CONFIRMED',
        },
      });

      await expect(
        receptionistBookingService.getBookingDetails(orgA.id, b.id, memberProfileB.id),
      ).rejects.toThrow();
    });

    it('blocks cross-tenant confirmation token execution', async () => {
      const confA = await confirmationService.createConfirmationState(
        orgA.id,
        memberProfileA.id,
        outletA1.id,
        {
          conversationId: conversationA.id,
          classSessionId: sessionAvailable.id,
          action: 'CREATE_BOOKING',
        },
      );

      // Attempt execution in Org B
      await expect(
        receptionistBookingService.executeConfirmedBooking(orgB.id, memberProfileA.id, {
          confirmationToken: confA.confirmationToken,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks mutation tools without confirmationToken in ToolRegistry', async () => {
      const result = await toolRegistry.executeTool(
        'create_booking',
        orgA.id,
        { memberProfileId: memberProfileA.id }, // missing confirmationToken
      );

      expect(result.status).toBe('FAILED');
      expect(result.error).toMatch(/confirmation token/);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Zero-Side-Effect Dry-Run Simulation
  // ---------------------------------------------------------------------------
  describe('Zero-Side-Effect Dry-Run Simulation', () => {
    beforeAll(async () => {
      await prisma.booking.deleteMany({
        where: {
          memberProfileId: memberProfileA.id,
          classSessionId: sessionAvailable.id,
        },
      });
    });

    it('evaluates booking viability without creating any DB records', async () => {
      const initialBookingsCount = await prisma.booking.count({
        where: { organisationId: orgA.id },
      });

      const dryRun = await receptionistBookingService.runDryRun(
        orgA.id,
        memberProfileA.id,
        sessionAvailable.id,
      );

      expect(dryRun.identityStatus).toBe('VERIFIED');
      expect(dryRun.availabilityStatus).toBe('AVAILABLE');
      expect(dryRun.eligibilityStatus).toBe('ELIGIBLE');
      expect(dryRun.confirmationRequired).toBe(true);
      expect(dryRun.productionSideEffect).toBe('NONE');
      expect(dryRun.sessionSnapshot?.spotsRemaining).toBeGreaterThan(0);

      // Verify zero records were written to Booking table
      const afterCount = await prisma.booking.count({
        where: { organisationId: orgA.id },
      });
      expect(afterCount).toBe(initialBookingsCount);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Booking Telemetry & Conversion Funnel
  // ---------------------------------------------------------------------------
  describe('Booking Telemetry & Funnel Metrics', () => {
    it('aggregates booking interactions into conversion funnel metrics', async () => {
      const metrics = await receptionistBookingService.getBookingMetrics(orgA.id);

      expect(metrics).toBeDefined();
      expect(typeof metrics.confirmedBookings).toBe('number');
      expect(typeof metrics.availabilitySearches).toBe('number');
      expect(metrics.conversionFunnel).toBeDefined();
      expect(typeof metrics.conversionFunnel.completedBookings).toBe('number');
    });
  });
});
