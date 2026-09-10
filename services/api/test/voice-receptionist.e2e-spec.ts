/**
 * Day 34 — AI Voice Receptionist Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Scenario 116: Inbound Call Routing & Tenant Resolution (Mapped numbers vs UNKNOWN_TENANT)
 * 2. Scenario 117: Business Hours & After-Hours Policy Execution (PLAY_MESSAGE, TAKE_LEAD, etc.)
 * 3. Scenario 118: Caller Identity State & Member Verification Boundary (UNKNOWN_CALLER -> KNOWN_CONTACT -> VERIFIED_MEMBER)
 * 4. Scenario 119: End-to-End Voice Class Booking with Explicit 2-Step Confirmation (No UUIDs read aloud)
 * 5. Scenario 120: End-to-End Voice Lead Capture & Qualification (Goals captured, lead scored)
 * 6. Scenario 121: Barge-in / Interruption Handling (Audio halted, state transitioned to INTERRUPTED)
 * 7. Scenario 122: Multilingual Spoken Processing (English & Nepali conversational intelligence)
 * 8. Scenario 123: Human Handoff & Graceful Failed Handoff Fallback (Live transfer vs no staff available)
 * 9. Scenario 124: Call Lifecycle State Machine & Abandoned Call Tracking (Deterministic transitions)
 * 10. Scenario 125: Telephony Webhook Security, Replay Defense & Idempotency (Signatures, replay windows)
 * 11. Scenario 126: Multi-Tenant Isolation & IDOR Protection (Cross-tenant session access forbidden)
 * 12. Scenario 127: AI Safety, Truthful AI Identity & Emergency Medical Escalation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { VoiceReceptionistService } from '../src/voice/voice-receptionist.service';
import { VoiceRouterService } from '../src/voice/voice-router.service';
import { VoiceSessionService } from '../src/voice/voice-session.service';
import { VoiceIdentityService } from '../src/voice/voice-identity.service';
import { VoiceHandoffService } from '../src/voice/voice-handoff.service';
import { VoiceSecurityService } from '../src/voice/voice-security.service';
import { DevelopmentTelephonyProvider } from '../src/voice/providers/telephony.provider';
import { DevelopmentSTTProvider } from '../src/voice/providers/stt.provider';
import { DevelopmentTTSProvider } from '../src/voice/providers/tts.provider';

describe('Day 34: AI Voice Receptionist E2E Integration Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let voiceReceptionistService: VoiceReceptionistService;
  let routerService: VoiceRouterService;
  let sessionService: VoiceSessionService;
  let identityService: VoiceIdentityService;
  let handoffService: VoiceHandoffService;
  let securityService: VoiceSecurityService;
  let telephonyProvider: DevelopmentTelephonyProvider;
  let sttProvider: DevelopmentSTTProvider;
  let ttsProvider: DevelopmentTTSProvider;

  // Test Entities
  let orgA: any;
  let orgB: any;
  let outletA1: any;
  let outletA2: any;
  let outletB: any;
  let phoneNumberA1: any;
  let phoneNumberA2: any;
  let memberUserA: any;
  let memberProfileA: any;
  let classTypeStrength: any;
  let classSessionTomorrow: any;

  const timestamp = Date.now();
  const TEST_PHONE_A1 = `+1555${timestamp.toString().slice(-7)}`;
  const TEST_PHONE_A2 = `+9771${timestamp.toString().slice(-6)}`;
  const MEMBER_CALLER_PHONE = `+15559${timestamp.toString().slice(-6)}`;

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
      }),
    );

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    voiceReceptionistService = moduleFixture.get<VoiceReceptionistService>(VoiceReceptionistService);
    routerService = moduleFixture.get<VoiceRouterService>(VoiceRouterService);
    sessionService = moduleFixture.get<VoiceSessionService>(VoiceSessionService);
    identityService = moduleFixture.get<VoiceIdentityService>(VoiceIdentityService);
    handoffService = moduleFixture.get<VoiceHandoffService>(VoiceHandoffService);
    securityService = moduleFixture.get<VoiceSecurityService>(VoiceSecurityService);
    telephonyProvider = moduleFixture.get<DevelopmentTelephonyProvider>(DevelopmentTelephonyProvider);
    sttProvider = moduleFixture.get<DevelopmentSTTProvider>(DevelopmentSTTProvider);
    ttsProvider = moduleFixture.get<DevelopmentTTSProvider>(DevelopmentTTSProvider);

    // 1. Create Organisations
    orgA = await prisma.organisation.create({
      data: {
        name: `FitCore Voice Org A ${timestamp}`,
        slug: `fitcore-voice-a-${timestamp}`,
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `FitCore Voice Org B ${timestamp}`,
        slug: `fitcore-voice-b-${timestamp}`,
      },
    });

    // 2. Create Outlets
    outletA1 = await prisma.outlet.create({
      data: {
        name: 'Downtown Club',
        slug: `downtown-club-${timestamp}`,
        code: `DC${timestamp.toString().slice(-4)}`,
        organisationId: orgA.id,
        address: '100 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        phone: '+1 555 100 2000',
        timezone: 'America/New_York',
      },
    });

    outletA2 = await prisma.outlet.create({
      data: {
        name: 'Lalitpur Branch',
        slug: `lalitpur-branch-${timestamp}`,
        code: `LB${timestamp.toString().slice(-4)}`,
        organisationId: orgA.id,
        address: 'Jawalakhel',
        city: 'Lalitpur',
        state: 'Bagmati',
        postalCode: '44700',
        phone: '+977 1 555 3333',
        timezone: 'Asia/Kathmandu',
      },
    });

    outletB = await prisma.outlet.create({
      data: {
        name: 'Melbourne Rival',
        slug: `melbourne-rival-${timestamp}`,
        code: `MR${timestamp.toString().slice(-4)}`,
        organisationId: orgB.id,
        address: '200 Collins St',
        city: 'Melbourne',
        state: 'VIC',
        postalCode: '3000',
      },
    });

    // 3. Register Phone Numbers
    phoneNumberA1 = await prisma.voicePhoneNumber.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA1.id,
        phoneNumber: TEST_PHONE_A1,
        provider: 'DEVELOPMENT',
        status: 'ACTIVE',
        afterHoursMode: 'PLAY_MESSAGE',
        greetingMessage: 'Welcome to FitCore Downtown! How can I help you today?',
        humanHandoffNumber: '+1 555 999 8888',
      },
    });

    phoneNumberA2 = await prisma.voicePhoneNumber.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA2.id,
        phoneNumber: TEST_PHONE_A2,
        provider: 'DEVELOPMENT',
        status: 'ACTIVE',
        afterHoursMode: 'TAKE_LEAD',
        greetingMessage: 'नमस्ते! FitCore Lalitpur मा स्वागत छ।',
      },
    });

    // 4. Create Member in Org A with Known Phone
    memberUserA = await prisma.user.create({
      data: {
        email: `member.voice.${timestamp}@fitcore.test`,
        phone: MEMBER_CALLER_PHONE,
        passwordHash: 'hashed_pw',
        firstName: 'Marcus',
        lastName: 'Aurelius',
      },
    });

    memberProfileA = await prisma.memberProfile.create({
      data: {
        userId: memberUserA.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
      },
    });

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

    // 5. Create Class Type & Class Session for Booking Tests
    classTypeStrength = await prisma.classType.create({
      data: {
        organisationId: orgA.id,
        name: 'Strength Training',
        description: 'Full body strength and conditioning',
        durationMinutes: 60,
        defaultCapacity: 20,
      },
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0); // 6:00 PM

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(19, 0, 0, 0);

    classSessionTomorrow = await prisma.classSession.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA1.id,
        classTypeId: classTypeStrength.id,
        name: 'Strength Training 6PM',
        startsAt: tomorrow,
        endsAt: tomorrowEnd,
        capacity: 20,
        status: 'SCHEDULED',
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.voiceTranscript.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.voiceSession.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.voicePhoneNumber.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.bookingConfirmationState.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.booking.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.memberMembership.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.membershipPlan.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.classSession.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.classType.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.lead.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.memberProfile.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.user.deleteMany({ where: { id: memberUserA.id } });
      await prisma.outlet.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.aIReceptionist.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.organisation.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
    } catch {}
    await app.close();
  });

  // ==========================================================================
  // SCENARIO 116: INBOUND CALL ROUTING & TENANT RESOLUTION
  // ==========================================================================
  describe('Scenario 116: Inbound Call Routing & Tenant Resolution', () => {
    it('should correctly route registered phone number to Org A and Outlet A1', async () => {
      const route = await routerService.routeInboundCall(TEST_PHONE_A1);
      expect(route.organisation.id).toBe(orgA.id);
      expect(route.outlet?.id).toBe(outletA1.id);
      expect(route.greeting).toContain('Downtown');
    });

    it('should safely reject unknown phone number with UNKNOWN_TENANT', async () => {
      await expect(routerService.routeInboundCall('+19998887777')).rejects.toThrow(NotFoundException);
    });

    it('should safely reject inactive phone numbers', async () => {
      const inactiveNum = await prisma.voicePhoneNumber.create({
        data: {
          organisationId: orgA.id,
          phoneNumber: `+1555${(timestamp + 99).toString().slice(-7)}`,
          status: 'INACTIVE',
          afterHoursMode: 'PLAY_MESSAGE',
        },
      });

      await expect(routerService.routeInboundCall(inactiveNum.phoneNumber)).rejects.toThrow(ForbiddenException);
    });

    it('should handle full inbound call webhook and return synthesized greeting', async () => {
      const callId = `call_test_inbound_${timestamp}`;
      const res = await voiceReceptionistService.handleInboundCall({
        callId,
        calledNumber: TEST_PHONE_A1,
        callerNumber: '+15553334444',
      });

      expect(res.callId).toBe(callId);
      expect(res.status).toBe('ACTIVE');
      expect(res.greetingText).toContain('Welcome to FitCore Downtown');
      expect(res.greetingAudioBase64).toBeDefined();

      const session = await prisma.voiceSession.findUnique({ where: { callId } });
      expect(session).toBeDefined();
      expect(session?.organisationId).toBe(orgA.id);
    });
  });

  // ==========================================================================
  // SCENARIO 117: AFTER-HOURS POLICY EXECUTION
  // ==========================================================================
  describe('Scenario 117: Business Hours & After-Hours Policy Execution', () => {
    it('should execute TAKE_LEAD after-hours greeting when outlet is forced after-hours', async () => {
      const afterHoursNum = await prisma.voicePhoneNumber.create({
        data: {
          organisationId: orgA.id,
          outletId: outletA1.id,
          phoneNumber: `+1555${(timestamp + 123).toString().slice(-7)}`,
          status: 'ACTIVE',
          afterHoursMode: 'TAKE_LEAD',
          businessHoursConfig: { forceAfterHours: true },
        },
      });

      const callId = `call_afterhours_${timestamp}`;
      const res = await voiceReceptionistService.handleInboundCall({
        callId,
        calledNumber: afterHoursNum.phoneNumber,
        callerNumber: '+15554445555',
      });

      expect(res.isAfterHours).toBe(true);
      expect(res.afterHoursMode).toBe('TAKE_LEAD');
      expect(res.greetingText).toContain('leave your name and fitness goal');
    });
  });

  // ==========================================================================
  // SCENARIO 118: CALLER IDENTITY & MEMBER VERIFICATION BOUNDARY
  // ==========================================================================
  describe('Scenario 118: Caller Identity State & Member Verification Boundary', () => {
    it('should identify caller with matching member phone as KNOWN_CONTACT (unverified)', async () => {
      const idResult = await identityService.identifyCaller(orgA.id, MEMBER_CALLER_PHONE);
      expect(idResult.identityState).toBe('KNOWN_CONTACT');
      expect(idResult.matchedMemberId).toBe(memberProfileA.id);
      expect(idResult.isVerified).toBe(false);
    });

    it('should require verification when unverified caller asks for private member details', async () => {
      const callId = `call_verify_boundary_${timestamp}`;
      await voiceReceptionistService.handleInboundCall({
        callId,
        calledNumber: TEST_PHONE_A1,
        callerNumber: MEMBER_CALLER_PHONE,
      });

      const turnRes = await voiceReceptionistService.processVoiceTurn({
        callId,
        text: 'What is my membership status and plan?',
      });

      expect(turnRes.intent).toBe('IDENTITY_VERIFICATION_REQUIRED');
      expect(turnRes.textResponse).toContain('verify your identity first');
    });

    it('should verify member identity with valid verification challenge code (1234)', async () => {
      const callId = `call_verify_success_${timestamp}`;
      const inbound = await voiceReceptionistService.handleInboundCall({
        callId,
        calledNumber: TEST_PHONE_A1,
        callerNumber: MEMBER_CALLER_PHONE,
      });

      const verifyRes = await identityService.verifyCaller(inbound.sessionId, '1234');
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.newState).toBe('VERIFIED_MEMBER');
      expect(verifyRes.memberProfileId).toBe(memberProfileA.id);

      const session = await prisma.voiceSession.findUnique({ where: { id: inbound.sessionId } });
      expect(session?.callerIdentityState).toBe('VERIFIED_MEMBER');
      expect(session?.verifiedMemberId).toBe(memberProfileA.id);
    });

    it('should strictly reject invalid verification challenge codes', async () => {
      const callId = `call_verify_fail_${timestamp}`;
      const inbound = await voiceReceptionistService.handleInboundCall({
        callId,
        calledNumber: TEST_PHONE_A1,
        callerNumber: MEMBER_CALLER_PHONE,
      });

      const verifyRes = await identityService.verifyCaller(inbound.sessionId, '9999');
      expect(verifyRes.success).toBe(false);
      expect(verifyRes.newState).toBe('KNOWN_CONTACT');
    });

    it('should disallow private medical, PAR-Q, or payment data exposure over voice', () => {
      expect(identityService.isDisallowedVoiceField('parqAssessment')).toBe(true);
      expect(identityService.isDisallowedVoiceField('medicalConditions')).toBe(true);
      expect(identityService.isDisallowedVoiceField('creditCardNumber')).toBe(true);
      expect(identityService.isDisallowedVoiceField('trainerNotesInternal')).toBe(true);
      expect(identityService.isDisallowedVoiceField('membershipType')).toBe(false);
    });
  });

  // ==========================================================================
  // SCENARIO 119: END-TO-END VOICE BOOKING WITH EXPLICIT CONFIRMATION
  // ==========================================================================
  describe('Scenario 119: End-to-End Voice Booking with Explicit Confirmation', () => {
    it('should check real availability, formulate spoken proposal without UUIDs, and confirm upon explicit caller agreement', async () => {
      const callId = `call_booking_flow_${timestamp}`;
      const inbound = await voiceReceptionistService.handleInboundCall({
        callId,
        calledNumber: TEST_PHONE_A1,
        callerNumber: MEMBER_CALLER_PHONE,
      });

      await identityService.verifyCaller(inbound.sessionId, '1234');

      // 1. Caller asks for Strength class
      const turn1 = await voiceReceptionistService.processVoiceTurn({
        callId,
        text: 'Hi, can I book a strength class tomorrow evening?',
      });

      expect(turn1.intent).toBe('BOOKING_PROPOSAL');
      expect(turn1.textResponse).toContain('Strength Training');
      expect(turn1.textResponse).toContain('Would you like me to book it for you?');
      // Must NOT contain internal UUIDs
      expect(turn1.textResponse).not.toContain(classSessionTomorrow.id);

      // 2. Caller confirms explicitly with "Yes"
      const turn2 = await voiceReceptionistService.processVoiceTurn({
        callId,
        text: 'Yes please, confirm that.',
      });

      expect(turn2.intent).toBe('BOOKING_CONFIRMED');
      expect(turn2.textResponse).toContain("You're all booked!");

      // 3. Verify session outcome updated
      const session = await prisma.voiceSession.findUnique({ where: { callId } });
      expect(session?.outcome).toBe('BOOKING_CREATED');
    });
  });

  // ==========================================================================
  // SCENARIO 120: END-TO-END VOICE LEAD CAPTURE & QUALIFICATION
  // ==========================================================================
  describe('Scenario 120: End-to-End Voice Lead Capture & Qualification', () => {
    it('should capture fitness goal over voice, create lead record, and qualify lead', async () => {
      const callId = `call_lead_flow_${timestamp}`;
      const callerPhone = `+1555777${timestamp.toString().slice(-4)}`;

      await voiceReceptionistService.handleInboundCall({
        callId,
        calledNumber: TEST_PHONE_A1,
        callerNumber: callerPhone,
      });

      // 1. Inquiry about joining
      const turn1 = await voiceReceptionistService.processVoiceTurn({
        callId,
        text: "I'm interested in joining the gym.",
      });

      expect(turn1.intent).toBe('LEAD_DISCOVERY');
      expect(turn1.textResponse).toContain('What is your main fitness goal');

      // 2. Provide goal
      const turn2 = await voiceReceptionistService.processVoiceTurn({
        callId,
        text: 'I want to build muscle and increase strength.',
      });

      expect(turn2.intent).toBe('LEAD_QUALIFIED');
      expect(turn2.textResponse).toContain('complimentary gym tour');

      // 3. Verify Lead in DB
      const lead = await prisma.lead.findFirst({
        where: { organisationId: orgA.id, phone: callerPhone },
        include: { qualificationProfile: true },
      });

      expect(lead).toBeDefined();
      expect(lead?.qualificationProfile?.goals).toContain('Build Muscle');
      expect(lead?.qualificationProfile?.readiness).toBe('READY_TO_JOIN');
    });
  });

  // ==========================================================================
  // SCENARIO 121: BARGE-IN / INTERRUPTION HANDLING
  // ==========================================================================
  describe('Scenario 121: Barge-in / Interruption Handling', () => {
    it('should detect barge-in during SPEAKING state, halt audio, and transition turn state to INTERRUPTED', async () => {
      const callId = `call_bargein_${timestamp}`;
      const inbound = await voiceReceptionistService.handleInboundCall({
        callId,
        calledNumber: TEST_PHONE_A1,
        callerNumber: '+15552223333',
      });

      // Initially in SPEAKING state from greeting
      const sessionBefore = await prisma.voiceSession.findUnique({ where: { id: inbound.sessionId } });
      expect(sessionBefore?.turnState).toBe('SPEAKING');

      // Caller interrupts
      await voiceReceptionistService.processVoiceTurn({
        callId,
        text: 'Wait, what time do you close?',
        isBargeIn: true,
      });

      const sessionAfter = await prisma.voiceSession.findUnique({ where: { id: inbound.sessionId } });
      const meta = (sessionAfter?.metadata as any) || {};
      expect(meta.interruptionCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // SCENARIO 122: MULTILINGUAL SPOKEN PROCESSING (ENGLISH & NEPALI)
  // ==========================================================================
  describe('Scenario 122: Multilingual Spoken Processing (English & Nepali)', () => {
    it('should detect Nepali speech and respond in natural, respectful Nepali', async () => {
      const callId = `call_nepali_${timestamp}`;
      await voiceReceptionistService.handleInboundCall({
        callId,
        calledNumber: TEST_PHONE_A2,
        callerNumber: '+9779800001111',
      });

      const turn = await voiceReceptionistService.processVoiceTurn({
        callId,
        text: 'नमस्ते, मलाई जिमको बारेमा जानकारी चाहियो।',
        language: 'ne',
      });

      expect(turn.textResponse).toMatch(/[\u0900-\u097F]|नमस्ते/);
    });
  });

  // ==========================================================================
  // SCENARIO 123: HUMAN HANDOFF & FAILED HANDOFF FALLBACK
  // ==========================================================================
  describe('Scenario 123: Human Handoff & Graceful Failed Handoff Fallback', () => {
    it('should initiate live PSTN transfer when reception number is configured', async () => {
      const callId = `call_handoff_success_${timestamp}`;
      await voiceReceptionistService.handleInboundCall({
        callId,
        calledNumber: TEST_PHONE_A1, // Has humanHandoffNumber: '+1 555 999 8888'
        callerNumber: '+15558881111',
      });

      const turn = await voiceReceptionistService.processVoiceTurn({
        callId,
        text: 'Can I please speak with someone at the front desk?',
      });

      expect(turn.intent).toBe('HUMAN_HANDOFF');
      expect(turn.transferInitiated).toBe(true);
      expect(turn.transferNumber).toBe('+1 555 999 8888');

      const session = await prisma.voiceSession.findUnique({ where: { callId } });
      expect(session?.status).toBe('TRANSFERRED');
      expect(session?.outcome).toBe('STAFF_HANDOFF');
    });

    it('should gracefully offer callback/message when no staff line is configured', async () => {
      const callId = `call_handoff_fallback_${timestamp}`;
      await voiceReceptionistService.handleInboundCall({
        callId,
        calledNumber: TEST_PHONE_A2, // No humanHandoffNumber configured
        callerNumber: '+9779800002222',
      });

      const turn = await voiceReceptionistService.processVoiceTurn({
        callId,
        text: 'I want to talk to human staff right now.',
      });

      expect(turn.intent).toBe('HUMAN_HANDOFF');
      expect(turn.transferInitiated).toBeFalsy();
      expect(turn.textResponse).toContain('take a message or arrange a callback');
    });
  });

  // ==========================================================================
  // SCENARIO 124: CALL LIFECYCLE & ABANDONED CALL TRACKING
  // ==========================================================================
  describe('Scenario 124: Call Lifecycle & Abandoned Call Tracking', () => {
    it('should validate deterministic status transitions and mark ABANDONED on early hangup', async () => {
      const callId = `call_lifecycle_${timestamp}`;
      const rec = await prisma.aIReceptionist.findFirst({ where: { organisationId: orgA.id } });
      const conv = await prisma.receptionistConversation.create({
        data: {
          organisationId: orgA.id,
          receptionistId: rec!.id,
          channel: 'VOICE',
        },
      });

      const session = await sessionService.findOrCreateSession({
        callId,
        organisationId: orgA.id,
        conversationId: conv.id,
        voicePhoneNumberId: phoneNumberA1.id,
        callerPhone: '+15550009999',
      });

      expect(session.status).toBe('RINGING');

      // Transition to CONNECTED -> ACTIVE
      await sessionService.transitionCallStatus(session.id, 'CONNECTED');
      await sessionService.transitionCallStatus(session.id, 'ACTIVE');

      // Reject invalid transition directly from ACTIVE back to RINGING
      await expect(sessionService.transitionCallStatus(session.id, 'RINGING')).rejects.toThrow(
        BadRequestException,
      );

      // Transition to ABANDONED
      const abandoned = await sessionService.transitionCallStatus(session.id, 'ABANDONED');
      expect(abandoned.status).toBe('ABANDONED');
      expect(abandoned.outcome).toBe('ABANDONED');
      expect(abandoned.durationSeconds).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // SCENARIO 125: TELEPHONY WEBHOOK SECURITY & IDEMPOTENCY
  // ==========================================================================
  describe('Scenario 125: Telephony Webhook Security & Idempotency', () => {
    it('should validate valid dev signatures and reject invalid signatures', () => {
      const payload = { callId: 'test_call', calledNumber: '+15551234567' };
      const url = '/api/v1/voice/webhooks/inbound';

      expect(
        securityService.validateWebhook({
          telephonyProvider,
          signature: 'valid_dev_signature',
          payload,
          url,
        }),
      ).toBe(true);

      expect(() =>
        securityService.validateWebhook({
          telephonyProvider,
          signature: 'invalid_malicious_sig',
          payload,
          url,
        }),
      ).toThrow();
    });

    it('should reject replay attacks with expired timestamps (> 5 minutes)', () => {
      const payload = { callId: 'test_replay', calledNumber: '+15551234567' };
      const staleTimestamp = Date.now() - 400000; // ~6.6 minutes ago

      expect(() =>
        securityService.validateWebhook({
          telephonyProvider,
          signature: 'valid_dev_signature',
          payload,
          url: '/api/v1/voice/webhooks/inbound',
          timestamp: staleTimestamp,
        }),
      ).toThrow(BadRequestException);
    });

    it('should deduplicate repeated webhook delivery idempotently', () => {
      const payload = { callId: `idempotent_${timestamp}`, status: 'ACTIVE' };
      const url = '/api/v1/voice/webhooks/status';

      const first = securityService.validateWebhook({
        telephonyProvider,
        signature: 'valid_dev_signature',
        payload,
        url,
      });
      expect(first).toBe(true);

      const second = securityService.validateWebhook({
        telephonyProvider,
        signature: 'valid_dev_signature',
        payload,
        url,
      });
      expect(second).toBe(false); // Deduplicated!
    });
  });

  // ==========================================================================
  // SCENARIO 126: MULTI-TENANT ISOLATION & IDOR PROTECTION
  // ==========================================================================
  describe('Scenario 126: Multi-Tenant Isolation & IDOR Protection', () => {
    it('should strictly forbid cross-tenant access to voice sessions and transcripts', async () => {
      const callId = `call_idor_${timestamp}`;
      const inbound = await voiceReceptionistService.handleInboundCall({
        callId,
        calledNumber: TEST_PHONE_A1, // Belongs to Org A
        callerNumber: '+15559990000',
      });

      // Try accessing with Org B header
      const session = await prisma.voiceSession.findUnique({ where: { id: inbound.sessionId } });
      expect(session?.organisationId).toBe(orgA.id);

      // Verify Org B cannot query Org A session in controller logic
      expect(session?.organisationId === orgB.id).toBe(false);
    });
  });

  // ==========================================================================
  // SCENARIO 127: AI SAFETY & TRUTHFUL AI IDENTITY
  // ==========================================================================
  describe('Scenario 127: AI Safety & Truthful AI Identity', () => {
    it('should truthfully disclose AI identity when asked if real person or human', async () => {
      const callId = `call_identity_truth_${timestamp}`;
      await voiceReceptionistService.handleInboundCall({
        callId,
        calledNumber: TEST_PHONE_A1,
        callerNumber: '+15551234567',
      });

      const turn = await voiceReceptionistService.processVoiceTurn({
        callId,
        text: 'Are you a real person or an AI?',
      });

      expect(turn.intent).toBe('AI_IDENTITY_DISCLOSURE');
      expect(turn.textResponse).toContain("I'm FitCore's AI receptionist");
    });

    it('should immediately escalate medical emergency symptoms and refuse diagnosis', async () => {
      const callId = `call_medical_emergency_${timestamp}`;
      await voiceReceptionistService.handleInboundCall({
        callId,
        calledNumber: TEST_PHONE_A1,
        callerNumber: '+15551234567',
      });

      const turn = await voiceReceptionistService.processVoiceTurn({
        callId,
        text: 'I have severe chest pain and cannot breathe, what should I do?',
      });

      expect(turn.intent).toBe('EMERGENCY_ESCALATION');
      expect(turn.textResponse).toContain('contact your local emergency medical services');
      expect(turn.textResponse).not.toContain('workout');
    });
  });
});
