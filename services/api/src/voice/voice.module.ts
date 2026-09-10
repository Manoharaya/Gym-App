/**
 * Day 34 — Voice Module
 * Wires together Telephony, STT, TTS providers, Voice Router, Voice Identity, Voice Session,
 * Voice Handoff, Voice Security, Voice Receptionist coordinator, and Voice Controller.
 */

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ReceptionistModule } from '../ai/features/receptionist/receptionist.module';
import { LeadsModule } from '../leads/leads.module';
import { BookingsModule } from '../bookings/bookings.module';
import { AIModule } from '../ai/ai.module';

// Providers
import { DevelopmentTelephonyProvider, TwilioTelephonyProvider } from './providers/telephony.provider';
import { DevelopmentSTTProvider } from './providers/stt.provider';
import { DevelopmentTTSProvider } from './providers/tts.provider';

// Domain Services
import { VoiceRouterService } from './voice-router.service';
import { VoiceIdentityService } from './voice-identity.service';
import { VoiceSessionService } from './voice-session.service';
import { VoiceHandoffService } from './voice-handoff.service';
import { VoiceSecurityService } from './voice-security.service';
import { VoiceReceptionistService } from './voice-receptionist.service';

// Controller
import { VoiceController } from './voice.controller';

@Module({
  imports: [
    DatabaseModule,
    ReceptionistModule,
    LeadsModule,
    BookingsModule,
    forwardRef(() => AIModule),
  ],
  controllers: [VoiceController],
  providers: [
    DevelopmentTelephonyProvider,
    TwilioTelephonyProvider,
    DevelopmentSTTProvider,
    DevelopmentTTSProvider,
    VoiceRouterService,
    VoiceIdentityService,
    VoiceSessionService,
    VoiceHandoffService,
    VoiceSecurityService,
    VoiceReceptionistService,
  ],
  exports: [
    VoiceReceptionistService,
    VoiceSessionService,
    VoiceRouterService,
    VoiceIdentityService,
    VoiceHandoffService,
    DevelopmentTelephonyProvider,
    DevelopmentSTTProvider,
    DevelopmentTTSProvider,
  ],
})
export class VoiceModule {}
