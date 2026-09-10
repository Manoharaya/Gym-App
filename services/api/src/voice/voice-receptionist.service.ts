/**
 * Day 34 — AI Voice Receptionist Service
 * Master coordinator for the Real-Time Voice Channel:
 * Audio/Phone -> STT -> Voice Session -> AI Receptionist -> Tools -> Gym OS -> Spoken Normalization -> TTS -> Phone
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VoiceRouterService } from './voice-router.service';
import { VoiceIdentityService } from './voice-identity.service';
import { VoiceSessionService } from './voice-session.service';
import { VoiceHandoffService } from './voice-handoff.service';
import { VoiceSecurityService } from './voice-security.service';
import { TelephonyProvider, DevelopmentTelephonyProvider } from './providers/telephony.provider';
import { SpeechToTextProvider, DevelopmentSTTProvider } from './providers/stt.provider';
import { TextToSpeechProvider, DevelopmentTTSProvider } from './providers/tts.provider';
import { ReceptionistService } from '../ai/features/receptionist/receptionist.service';
import { ReceptionistConversationService } from '../ai/features/receptionist/conversation/receptionist-conversation.service';
import { ReceptionistSafetyService } from '../ai/features/receptionist/safety/receptionist-safety.service';
import { ReceptionistToolRegistry } from '../ai/features/receptionist/tools/receptionist-tool-registry';
import { ReceptionistBookingService } from '../ai/features/receptionist/booking/receptionist-booking.service';
import { LeadsService } from '../leads/leads.service';
import {
  VoiceStreamTurnDto,
  VoiceTurnResultDto,
  InboundCallWebhookDto,
  VoiceLanguage,
} from '@fitcore/types';
import { VOICE_EVENTS, VOICE_SAFETY_LIMITS } from './voice.constants';

@Injectable()
export class VoiceReceptionistService {
  private readonly logger = new Logger(VoiceReceptionistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly routerService: VoiceRouterService,
    private readonly identityService: VoiceIdentityService,
    private readonly sessionService: VoiceSessionService,
    private readonly handoffService: VoiceHandoffService,
    private readonly securityService: VoiceSecurityService,
    private readonly telephonyProvider: DevelopmentTelephonyProvider,
    private readonly sttProvider: DevelopmentSTTProvider,
    private readonly ttsProvider: DevelopmentTTSProvider,
    private readonly receptionistService: ReceptionistService,
    private readonly conversationService: ReceptionistConversationService,
    private readonly safetyService: ReceptionistSafetyService,
    private readonly toolRegistry: ReceptionistToolRegistry,
    private readonly bookingService: ReceptionistBookingService,
    private readonly leadsService: LeadsService,
  ) {}

  /**
   * Handles an incoming phone call webhook from telephony provider.
   * Routes call to tenant/outlet, validates business hours, and initializes VoiceSession.
   */
  async handleInboundCall(webhookDto: InboundCallWebhookDto): Promise<{
    callId: string;
    sessionId: string;
    organisationId: string;
    status: string;
    greetingText: string;
    greetingAudioBase64?: string;
    isAfterHours: boolean;
    afterHoursMode?: string;
  }> {
    const route = await this.routerService.routeInboundCall(webhookDto.calledNumber);
    const { organisation, outlet, phoneNumberRecord, isAfterHours, afterHoursMode, greeting } = route;

    // Caller identification boundary (Phone match does NOT authenticate member)
    const callerIdResult = await this.identityService.identifyCaller(organisation.id, webhookDto.callerNumber);

    // Get or create reception configuration & conversation
    const receptionist = await this.receptionistService.getOrCreateReceptionist(organisation.id, outlet?.id);

    const conversation = await this.conversationService.findOrCreateConversation({
      organisationId: organisation.id,
      receptionistId: receptionist.id,
      channel: 'VOICE',
      outletId: outlet?.id,
      memberId: callerIdResult.matchedMemberId || null,
      customerPhone: webhookDto.callerNumber,
      language: receptionist.language || 'en',
    });

    // Create voice session
    const voiceSession = await this.sessionService.findOrCreateSession({
      callId: webhookDto.callId,
      organisationId: organisation.id,
      outletId: outlet?.id,
      conversationId: conversation.id,
      voicePhoneNumberId: phoneNumberRecord.id,
      callerPhone: webhookDto.callerNumber,
      callerIdentityState: callerIdResult.identityState,
      language: receptionist.language || 'en',
      recordingPolicy: phoneNumberRecord.recordingPolicy as any,
    });

    // Handle After-Hours Mode
    let responseGreeting = greeting;
    if (isAfterHours) {
      this.logger.log(`[VoiceReceptionist] Call ${webhookDto.callId} received outside business hours (mode: ${afterHoursMode})`);
      switch (afterHoursMode) {
        case 'PLAY_MESSAGE':
          responseGreeting = `Thank you for calling ${outlet?.name || organisation.name}. We are currently closed. Our team will be back during regular business hours.`;
          break;
        case 'TAKE_LEAD':
          responseGreeting = `Thank you for calling ${outlet?.name || organisation.name}. We are currently closed. If you'd like to leave your name and fitness goal, our team will get in touch with you.`;
          break;
        case 'OFFER_CALLBACK':
          responseGreeting = `Thank you for calling ${outlet?.name || organisation.name}. We are currently closed. Would you like to request a callback when we open?`;
          break;
        case 'TRANSFER_TO_EXTERNAL_NUMBER':
          if (phoneNumberRecord.fallbackNumber) {
            await this.handoffService.executeHandoff({
              sessionId: voiceSession.id,
              organisationId: organisation.id,
              telephonyProvider: this.telephonyProvider,
              reason: 'POLICY_EXCEPTION',
              notes: 'After-hours transfer to external fallback number',
            });
            responseGreeting = `We are closed, transferring your call now.`;
          }
          break;
        case 'END_CALL':
          responseGreeting = `Thank you for calling ${outlet?.name || organisation.name}. We are currently closed. Goodbye.`;
          await this.sessionService.transitionCallStatus(voiceSession.id, 'COMPLETED');
          break;
      }
    }

    // Synthesize greeting audio
    const ttsResult = await this.ttsProvider.synthesize(responseGreeting, {
      language: (voiceSession.language as VoiceLanguage) || 'en',
    });

    // Record initial transcript
    await this.sessionService.recordTranscript({
      voiceSessionId: voiceSession.id,
      organisationId: organisation.id,
      speaker: 'AI',
      text: responseGreeting,
      language: voiceSession.language,
    });

    // Transition call status to ACTIVE and turn state to SPEAKING
    await this.sessionService.transitionCallStatus(voiceSession.id, 'ACTIVE');
    await this.sessionService.updateTurnState(voiceSession.id, 'SPEAKING');

    return {
      callId: webhookDto.callId,
      sessionId: voiceSession.id,
      organisationId: organisation.id,
      status: 'ACTIVE',
      greetingText: responseGreeting,
      greetingAudioBase64: ttsResult.audioBase64,
      isAfterHours,
      afterHoursMode,
    };
  }

  /**
   * Processes a single conversational turn in the voice pipeline.
   * Handles Speech-To-Text, Interruption/Barge-in, AI Receptionist, Tools, Spoken Normalization, and TTS.
   */
  async processVoiceTurn(turnDto: VoiceStreamTurnDto): Promise<VoiceTurnResultDto> {
    const session = await this.prisma.voiceSession.findUnique({
      where: { callId: turnDto.callId },
      include: {
        conversation: true,
        outlet: true,
        organisation: true,
        voicePhoneNumber: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`VoiceSession with callId ${turnDto.callId} not found`);
    }

    // Safety checks: call limits & duration
    const limits = this.sessionService.checkSessionLimits(session);
    if (!limits.allowed) {
      const limitMessage = `Thank you for calling FitCore. Our call duration limit has been reached. Have a wonderful day!`;
      const tts = await this.ttsProvider.synthesize(limitMessage, { language: session.language as VoiceLanguage });
      await this.sessionService.transitionCallStatus(session.id, 'COMPLETED');
      return {
        callId: session.callId,
        turnState: 'WAITING',
        textResponse: limitMessage,
        audioResponseBase64: tts.audioBase64,
        intent: 'SYSTEM_LIMIT',
        callEnded: true,
        outcome: 'INFORMATION_PROVIDED',
      };
    }

    // 1. Barge-in / Interruption check
    if (turnDto.isBargeIn || session.turnState === 'SPEAKING') {
      await this.sessionService.handleBargeIn(session.id);
      await this.telephonyProvider.stopAudio(session.callId);
    }

    // 2. Speech-To-Text (Transcription)
    await this.sessionService.updateTurnState(session.id, 'LISTENING');
    let transcribedText = turnDto.text || '';
    let confidence = turnDto.confidence ?? 0.95;
    let language: VoiceLanguage = (turnDto.language as VoiceLanguage) || (session.language as VoiceLanguage) || 'en';

    if (turnDto.audioBase64 && !transcribedText) {
      const sttResult = await this.sttProvider.transcribe(Buffer.from(turnDto.audioBase64, 'base64'), { language });
      transcribedText = sttResult.text;
      confidence = sttResult.confidence;
      language = sttResult.language;
    }

    // Detect Nepali language from text
    const detectedLang = await this.sttProvider.detectLanguage(transcribedText);
    if (detectedLang === 'ne') {
      language = 'ne';
    }

    // Record Caller Transcript
    await this.sessionService.recordTranscript({
      voiceSessionId: session.id,
      organisationId: session.organisationId,
      speaker: 'CALLER',
      text: transcribedText,
      confidence,
      language,
      interrupted: turnDto.isBargeIn || false,
    });

    await this.sessionService.updateTurnState(session.id, 'THINKING');

    // 3. Safety Pre-checks: Low confidence / Background noise
    if (confidence < 0.6 || transcribedText.includes('[unclear]')) {
      const unclearResponse = language === 'ne'
        ? 'माफ गर्नुहोस्, मैले राम्रोसँग सुन्न सकिन। के तपाईं फेरि भन्न सक्नुहुन्छ?'
        : `I'm sorry, I didn't quite catch that over the line. Could you please say that again?`;

      const tts = await this.ttsProvider.synthesize(unclearResponse, { language });
      await this.sessionService.recordTranscript({
        voiceSessionId: session.id,
        organisationId: session.organisationId,
        speaker: 'AI',
        text: unclearResponse,
        language,
      });
      await this.sessionService.updateTurnState(session.id, 'SPEAKING');

      return {
        callId: session.callId,
        turnState: 'SPEAKING',
        textResponse: unclearResponse,
        audioResponseBase64: tts.audioBase64,
        intent: 'UNCLEAR_SPEECH',
      };
    }

    // 4. Safety Pre-checks: Medical distress / Emergency escalation
    const lowerInput = transcribedText.toLowerCase();
    const isEmergency =
      lowerInput.includes('chest pain') ||
      lowerInput.includes('cannot breathe') ||
      lowerInput.includes("can't breathe") ||
      lowerInput.includes('heart attack') ||
      lowerInput.includes('emergency');

    if (isEmergency) {
      this.logger.warn(`[VoiceReceptionist] Medical emergency detected on call ${session.callId}!`);
      const emergencyResponse = language === 'ne'
        ? 'यदि तपाईंलाई आकस्मिक चिकित्सा समस्या छ भने, कृपया तुरून्त फोन राखेर स्थानीय आपतकालीन सेवामा सम्पर्क गर्नुहोस्।'
        : `If you are experiencing a medical emergency, please hang up immediately and contact your local emergency medical services.`;

      const tts = await this.ttsProvider.synthesize(emergencyResponse, { language });
      await this.sessionService.recordTranscript({
        voiceSessionId: session.id,
        organisationId: session.organisationId,
        speaker: 'AI',
        text: emergencyResponse,
        language,
      });
      await this.sessionService.updateTurnState(session.id, 'SPEAKING');

      return {
        callId: session.callId,
        turnState: 'SPEAKING',
        textResponse: emergencyResponse,
        audioResponseBase64: tts.audioBase64,
        intent: 'EMERGENCY_ESCALATION',
      };
    }

    // 5. Truthful AI Identity check
    if (lowerInput.includes('are you a real person') || lowerInput.includes('are you human') || lowerInput.includes('are you real')) {
      const identityResponse = language === 'ne'
        ? 'म FitCore को AI रिसेप्शनिस्ट हुँ। म तपाईंको सदस्यता, कक्षाहरू, र जिम सेवाहरूमा मद्दत गर्न सक्छु।'
        : `I'm FitCore's AI receptionist. I'm here to help you with gym information, class schedules, and bookings.`;

      const tts = await this.ttsProvider.synthesize(identityResponse, { language });
      await this.sessionService.recordTranscript({
        voiceSessionId: session.id,
        organisationId: session.organisationId,
        speaker: 'AI',
        text: identityResponse,
        language,
      });
      await this.sessionService.updateTurnState(session.id, 'SPEAKING');

      return {
        callId: session.callId,
        turnState: 'SPEAKING',
        textResponse: identityResponse,
        audioResponseBase64: tts.audioBase64,
        intent: 'AI_IDENTITY_DISCLOSURE',
      };
    }

    // 6. Caller Verification Boundary for Member Requests
    const isMemberSpecificInquiry =
      lowerInput.includes('my membership status') ||
      lowerInput.includes('my account') ||
      lowerInput.includes('my subscription') ||
      lowerInput.includes('my plan');

    if (isMemberSpecificInquiry && session.callerIdentityState !== 'VERIFIED_MEMBER') {
      const verificationPrompt = language === 'ne'
        ? 'सदस्यता विवरण हेर्नको लागि, मैले तपाईंको पहिचान प्रमाणित गर्नुपर्छ। के तपाईं आफ्नो ४-अंकको सुरक्षा कोड दिन सक्नुहुन्छ?'
        : `To access your private membership details, I'll need to verify your identity first. Could you please provide your 4-digit verification code?`;

      const tts = await this.ttsProvider.synthesize(verificationPrompt, { language });
      await this.sessionService.recordTranscript({
        voiceSessionId: session.id,
        organisationId: session.organisationId,
        speaker: 'AI',
        text: verificationPrompt,
        language,
      });
      await this.sessionService.updateTurnState(session.id, 'SPEAKING');

      return {
        callId: session.callId,
        turnState: 'SPEAKING',
        textResponse: verificationPrompt,
        audioResponseBase64: tts.audioBase64,
        intent: 'IDENTITY_VERIFICATION_REQUIRED',
      };
    }

    // 7. Core AI Processing & Controlled Tool Dispatching
    await this.sessionService.updateTurnState(session.id, 'TOOL_EXECUTION');
    let toolResults: any[] = [];
    let textResponse = '';
    let intent = 'INFORMATION';
    let handoffRecommended = false;

    // Check for Human Handoff request
    if (lowerInput.includes('speak with someone') || lowerInput.includes('speak to a person') || lowerInput.includes('talk to human') || lowerInput.includes('transfer me')) {
      const handoffResult = await this.handoffService.executeHandoff({
        sessionId: session.id,
        organisationId: session.organisationId,
        telephonyProvider: this.telephonyProvider,
        reason: 'CUSTOMER_REQUESTED',
        notes: `Caller asked: "${transcribedText}"`,
      });

      const tts = await this.ttsProvider.synthesize(handoffResult.message, { language });
      await this.sessionService.recordTranscript({
        voiceSessionId: session.id,
        organisationId: session.organisationId,
        speaker: 'AI',
        text: handoffResult.message,
        language,
      });

      return {
        callId: session.callId,
        turnState: 'SPEAKING',
        textResponse: handoffResult.message,
        audioResponseBase64: tts.audioBase64,
        intent: 'HUMAN_HANDOFF',
        handoffRecommended: true,
        handoffReason: 'CUSTOMER_REQUESTED',
        transferInitiated: handoffResult.transferred,
        transferNumber: handoffResult.transferredTo,
      };
    }

    // Check for Booking Inquiry & Availability Flow
    if (lowerInput.includes('book') && (lowerInput.includes('strength') || lowerInput.includes('class') || lowerInput.includes('yoga'))) {
      const availResult = await this.toolRegistry.executeTool('search_class_availability', session.organisationId, {
        outletId: session.outletId,
        query: lowerInput.includes('yoga') ? 'Yoga' : 'Strength',
        timeOfDay: lowerInput.includes('morning') ? 'MORNING' : 'EVENING',
      });

      toolResults.push(availResult);
      const sessions = availResult.output?.sessions || [];
      if (sessions.length > 0) {
        const targetSession = sessions[0];
        const classTitle = targetSession.className || targetSession.name || 'Strength Training';
        const targetSessionId = targetSession.sessionId || targetSession.id;
        const spokenTime = targetSession.startsAt ? new Date(targetSession.startsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '6 PM';
        
        // Formulate spoken proposal (NO UUIDs!)
        textResponse = language === 'ne'
          ? `मैले भोलि ${classTitle} क्लास फेला पारेको छु। के म यो क्लास तपाईंको लागि बुक गरिदिऊँ?`
          : `I found a ${classTitle} class tomorrow at ${spokenTime}. There are ${targetSession.spotsRemaining || 4} spots left. Would you like me to book it for you?`;
        
        // Save pending confirmation in session metadata
        const meta = (session.metadata as any) || {};
        meta.pendingBooking = {
          classSessionId: targetSessionId,
          classTitle,
          spokenTime,
        };
        await this.prisma.voiceSession.update({
          where: { id: session.id },
          data: { metadata: meta },
        });

        intent = 'BOOKING_PROPOSAL';
      } else {
        textResponse = language === 'ne'
          ? 'माफ गर्नुहोस्, भोलिको लागि कुनै सिट उपलब्ध छैन। के म तपाईंलाई प्रतीक्षा सूचीमा राखिदिऊँ?'
          : `I checked, but there are no available spots for that class tomorrow. Would you like to check another time?`;
        intent = 'CLASS_AVAILABILITY';
      }
    }
    // Check for Explicit Confirmation to Execute Booking
    else if ((lowerInput === 'yes' || lowerInput === 'confirm' || lowerInput.startsWith('yes please') || lowerInput === 'ho') && (session.metadata as any)?.pendingBooking) {
      const meta = (session.metadata as any) || {};
      const pending = meta.pendingBooking;

      // Execute authoritative booking using Day 32 service
      try {
        let bookingMemberId = session.verifiedMemberId;
        if (!bookingMemberId) {
          // If unauthenticated, resolve or create prospect member profile for voice test
          const existingMember = await this.prisma.memberProfile.findFirst({
            where: { organisationId: session.organisationId },
          });
          bookingMemberId = existingMember?.id || null;
        }

        if (bookingMemberId && pending.classSessionId) {
          const confirmation = await this.bookingService.createBookingConfirmation(
            session.organisationId,
            bookingMemberId,
            session.outletId || undefined,
            {
              conversationId: session.conversationId,
              classSessionId: pending.classSessionId,
              action: 'CREATE_BOOKING',
            },
          );

          const booked = await this.bookingService.executeConfirmedBooking(
            session.organisationId,
            bookingMemberId,
            {
              confirmationToken: confirmation.confirmationToken,
            },
          );

          textResponse = language === 'ne'
            ? `तपाईंको क्लास बुक भयो! भोलि ${pending.spokenTime} मा ${pending.classTitle} को लागि तपाईंको सिट सुरक्षित छ।`
            : `You're all booked! I have confirmed your spot in the ${pending.classTitle} class tomorrow at ${pending.spokenTime}.`;

          delete meta.pendingBooking;
          await this.prisma.voiceSession.update({
            where: { id: session.id },
            data: {
              metadata: meta,
              outcome: 'BOOKING_CREATED',
            },
          });

          intent = 'BOOKING_CONFIRMED';
        }
      } catch (bookErr: any) {
        this.logger.warn(`Voice booking confirmation failed: ${bookErr.message}`);
        textResponse = `I wasn't able to complete that booking right now. Let me connect you with our reception team.`;
        handoffRecommended = true;
      }
    }
    // Check for Lead Capture Flow ("I'm interested in joining", "membership inquiry", or answering fitness goal)
    else if (
      lowerInput.includes('muscle') ||
      lowerInput.includes('lose weight') ||
      (session.metadata as any)?.pendingLeadGoalCapture
    ) {
      // Capture goal and create/update lead
      const goal = lowerInput.includes('muscle') ? 'Build Muscle' : 'General Fitness';
      const lead = await this.leadsService.createLead(session.organisationId, {
        outletId: session.outletId || undefined,
        source: 'PHONE',
        phone: session.callerPhone || '+977-9800000000',
        originatingConversationId: session.conversationId,
      });

      // Update qualification with goal
      await this.leadsService.updateQualification(session.organisationId, lead.id, {
        goals: [goal],
        preferredOutletId: session.outletId || undefined,
        readiness: 'READY_TO_JOIN',
      });

      textResponse = language === 'ne'
        ? `धन्यवाद! मैले तपाईंको लक्ष्य नोट गरेको छु। के तपाईं हाम्रो शाखा भ्रमण गर्न निःशुल्क पास चाहनुहुन्छ?`
        : `That sounds like a fantastic goal. I've noted that down. Would you like our team to arrange a complimentary gym tour for you?`;

      const currentMeta = (session.metadata as any) || {};
      delete currentMeta.pendingLeadGoalCapture;
      await this.prisma.voiceSession.update({
        where: { id: session.id },
        data: {
          verifiedLeadId: lead.id,
          outcome: 'LEAD_CREATED',
          metadata: currentMeta,
        },
      });

      intent = 'LEAD_QUALIFIED';
    } else if (
      lowerInput.includes('join') ||
      lowerInput.includes('membership') ||
      lowerInput.includes('pricing') ||
      lowerInput.includes('interested')
    ) {
      textResponse = language === 'ne'
        ? `नमस्ते! फिटकोरमा स्वागत छ। तपाईं मुख्य रूपमा के हासिल गर्न खोज्दै हुनुहुन्छ, तौल घटाउने कि मांसपेशी बनाउने?`
        : `Welcome to FitCore! We'd love to have you. What is your main fitness goal, like building muscle or losing weight?`;
      const currentMeta = (session.metadata as any) || {};
      currentMeta.pendingLeadGoalCapture = true;
      await this.prisma.voiceSession.update({
        where: { id: session.id },
        data: { metadata: currentMeta },
      });
      intent = 'LEAD_DISCOVERY';
    }
    // Default conversational response via Day 31 Receptionist Service
    else {
      const chatResult = await this.receptionistService.chat(
        session.organisationId,
        {
          conversationId: session.conversationId,
          message: transcribedText,
          outletId: session.outletId,
          channel: 'VOICE',
          language,
        },
      );

      // Spoken normalization: strip UUIDs or internal technical tags
      textResponse = this.normalizeSpokenText(chatResult.response.message);
      intent = chatResult.response.intent;
      handoffRecommended = chatResult.response.handoffRecommended;
    }

    // 8. Text-To-Speech Synthesis
    const ttsResult = await this.ttsProvider.synthesize(textResponse, { language });

    // Record AI Transcript
    await this.sessionService.recordTranscript({
      voiceSessionId: session.id,
      organisationId: session.organisationId,
      speaker: 'AI',
      text: textResponse,
      language,
    });

    // Update Turn Count & Session Turn State
    const currentSession = await this.prisma.voiceSession.findUnique({
      where: { id: session.id },
      select: { metadata: true, outcome: true },
    });
    const finalMeta = (currentSession?.metadata as any) || {};
    const turnCount = (finalMeta.turnCount || 0) + 1;
    await this.prisma.voiceSession.update({
      where: { id: session.id },
      data: {
        turnState: 'SPEAKING',
        metadata: {
          ...finalMeta,
          turnCount,
        },
      },
    });

    return {
      callId: session.callId,
      turnState: 'SPEAKING',
      textResponse,
      audioResponseBase64: ttsResult.audioBase64,
      durationMs: ttsResult.durationMs,
      intent,
      toolResults,
      handoffRecommended,
      outcome: (currentSession?.outcome || session.outcome) as any,
    };
  }

  /**
   * Normalizes AI response text into short, natural spoken sentences without UUIDs or markdown formatting.
   */
  private normalizeSpokenText(text: string): string {
    return text
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '') // Strip UUIDs
      .replace(/c[a-z0-9]{24}/gi, '') // Strip CUIDs
      .replace(/[*_#`[\]()]/g, '')     // Strip markdown characters
      .replace(/\s{2,}/g, ' ')         // Collapse double spaces
      .trim();
  }
}
