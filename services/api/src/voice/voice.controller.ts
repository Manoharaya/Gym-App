/**
 * Day 34 — Voice Controller
 * Handles Telephony Webhooks (Inbound, Turn, Status) and Staff Admin APIs (Sessions, Transcripts, Numbers, Profiles, Metrics).
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  Req,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VoiceReceptionistService } from './voice-receptionist.service';
import { VoiceSessionService } from './voice-session.service';
import { VoiceIdentityService } from './voice-identity.service';
import { VoiceSecurityService } from './voice-security.service';
import { DevelopmentTelephonyProvider } from './providers/telephony.provider';
import {
  InboundCallWebhookDto,
  VoiceStreamTurnDto,
  VerifyCallerDto,
  CreateVoicePhoneNumberDto,
  UpdateVoicePhoneNumberDto,
  CreateVoiceProfileDto,
} from './dto/voice.dto';
import { VoiceMetricsDto } from '@fitcore/types';

@Controller('voice')
export class VoiceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly receptionistService: VoiceReceptionistService,
    private readonly sessionService: VoiceSessionService,
    private readonly identityService: VoiceIdentityService,
    private readonly securityService: VoiceSecurityService,
    private readonly telephonyProvider: DevelopmentTelephonyProvider,
  ) {}

  // ==========================================================================
  // TELEPHONY WEBHOOK ENDPOINTS (Provider-Secured)
  // ==========================================================================

  @Post('webhooks/inbound')
  async handleInboundWebhook(
    @Body() dto: InboundCallWebhookDto,
    @Headers('x-telephony-signature') signature?: string,
    @Req() req?: any,
  ) {
    const url = req?.originalUrl || '/api/v1/voice/webhooks/inbound';
    // Validate signature if provided
    if (signature || dto.signature) {
      this.securityService.validateWebhook({
        telephonyProvider: this.telephonyProvider,
        signature: signature || dto.signature,
        payload: dto,
        url,
        timestamp: dto.timestamp,
      });
    }

    return this.receptionistService.handleInboundCall(dto);
  }

  @Post('webhooks/turn')
  async handleTurnWebhook(@Body() dto: VoiceStreamTurnDto) {
    return this.receptionistService.processVoiceTurn(dto);
  }

  @Post('webhooks/status')
  async handleStatusWebhook(
    @Body() body: { callId: string; status: string; reason?: string },
    @Headers('x-telephony-signature') signature?: string,
  ) {
    if (signature) {
      this.securityService.validateWebhook({
        telephonyProvider: this.telephonyProvider,
        signature,
        payload: body,
        url: '/api/v1/voice/webhooks/status',
      });
    }

    const targetStatus = body.status.toUpperCase() as any;
    const session = await this.sessionService.transitionCallStatus(body.callId, targetStatus, body.reason);
    if (['COMPLETED', 'ABANDONED', 'FAILED', 'TRANSFERRED'].includes(targetStatus)) {
      await this.sessionService.generateCallSummary(session.id);
    }

    return { success: true, status: session.status };
  }

  // ==========================================================================
  // CALLER IDENTITY & VERIFICATION
  // ==========================================================================

  @Post('sessions/:id/verify')
  async verifyCaller(@Param('id') id: string, @Body() dto: VerifyCallerDto) {
    return this.identityService.verifyCaller(id, dto.verificationCode);
  }

  // ==========================================================================
  // STAFF & ADMIN SESSIONS & METRICS (Tenant-Isolated)
  // ==========================================================================

  @Get('sessions')
  async listSessions(
    @Headers('x-organisation-id') orgHeader?: string,
    @Query('organisationId') orgQuery?: string,
    @Query('status') status?: string,
    @Query('outcome') outcome?: string,
    @Query('limit') limit?: string,
  ) {
    const organisationId = orgHeader || orgQuery;
    if (!organisationId) {
      throw new ForbiddenException('Organisation context required');
    }

    const sessions = await this.prisma.voiceSession.findMany({
      where: {
        organisationId,
        ...(status ? { status } : {}),
        ...(outcome ? { outcome } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
      include: {
        outlet: { select: { id: true, name: true } },
        voicePhoneNumber: { select: { id: true, phoneNumber: true } },
      },
    });

    return { sessions, total: sessions.length };
  }

  @Get('sessions/:id')
  async getSession(
    @Param('id') id: string,
    @Headers('x-organisation-id') orgHeader?: string,
    @Query('organisationId') orgQuery?: string,
  ) {
    const organisationId = orgHeader || orgQuery;
    const session = await this.prisma.voiceSession.findUnique({
      where: { id },
      include: {
        outlet: true,
        voicePhoneNumber: true,
        transcripts: { orderBy: { createdAt: 'asc' } },
        verifiedMember: { include: { user: true } },
        verifiedLead: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`VoiceSession ${id} not found`);
    }

    if (organisationId && session.organisationId !== organisationId) {
      throw new ForbiddenException('Access to cross-tenant voice session denied');
    }

    return session;
  }

  @Get('sessions/:id/transcript')
  async getSessionTranscript(
    @Param('id') id: string,
    @Headers('x-organisation-id') orgHeader?: string,
    @Query('organisationId') orgQuery?: string,
  ) {
    const organisationId = orgHeader || orgQuery;
    const session = await this.prisma.voiceSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`VoiceSession ${id} not found`);
    }

    if (organisationId && session.organisationId !== organisationId) {
      throw new ForbiddenException('Access to cross-tenant voice session denied');
    }

    const transcripts = await this.prisma.voiceTranscript.findMany({
      where: { voiceSessionId: id },
      orderBy: { createdAt: 'asc' },
    });

    return { sessionId: id, transcripts };
  }

  @Get('sessions/:id/summary')
  async getSessionSummary(
    @Param('id') id: string,
    @Headers('x-organisation-id') orgHeader?: string,
    @Query('organisationId') orgQuery?: string,
  ) {
    const organisationId = orgHeader || orgQuery;
    const session = await this.prisma.voiceSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`VoiceSession ${id} not found`);
    }

    if (organisationId && session.organisationId !== organisationId) {
      throw new ForbiddenException('Access to cross-tenant voice session denied');
    }

    return {
      sessionId: id,
      summary: session.summary,
      outcome: session.outcome,
      durationSeconds: session.durationSeconds,
      callerIdentityState: session.callerIdentityState,
    };
  }

  @Get('metrics')
  async getVoiceMetrics(
    @Headers('x-organisation-id') orgHeader?: string,
    @Query('organisationId') orgQuery?: string,
  ): Promise<VoiceMetricsDto> {
    const organisationId = orgHeader || orgQuery;
    if (!organisationId) {
      throw new ForbiddenException('Organisation context required');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      callsToday,
      answered,
      abandoned,
      transferred,
      leadsCreated,
      bookingsCreated,
      completedSessions,
    ] = await Promise.all([
      this.prisma.voiceSession.count({ where: { organisationId, createdAt: { gte: today } } }),
      this.prisma.voiceSession.count({ where: { organisationId, status: { in: ['CONNECTED', 'ACTIVE', 'COMPLETED', 'TRANSFERRED'] }, createdAt: { gte: today } } }),
      this.prisma.voiceSession.count({ where: { organisationId, status: 'ABANDONED', createdAt: { gte: today } } }),
      this.prisma.voiceSession.count({ where: { organisationId, status: 'TRANSFERRED', createdAt: { gte: today } } }),
      this.prisma.voiceSession.count({ where: { organisationId, outcome: 'LEAD_CREATED', createdAt: { gte: today } } }),
      this.prisma.voiceSession.count({ where: { organisationId, outcome: 'BOOKING_CREATED', createdAt: { gte: today } } }),
      this.prisma.voiceSession.findMany({
        where: { organisationId, durationSeconds: { not: null } },
        select: { durationSeconds: true },
        take: 100,
      }),
    ]);

    const missed = abandoned;
    const totalDuration = completedSessions.reduce((acc: number, s: any) => acc + (s.durationSeconds || 0), 0);
    const averageCallDurationSeconds = completedSessions.length > 0 ? Math.round(totalDuration / completedSessions.length) : 0;

    return {
      callsToday,
      answered,
      missed,
      abandoned,
      transferred,
      leadsCreated,
      bookingsCreated,
      averageCallDurationSeconds,
      aiFailureRatePercent: 0,
    };
  }

  // ==========================================================================
  // PHONE NUMBER CONFIGURATION
  // ==========================================================================

  @Get('numbers')
  async listPhoneNumbers(
    @Headers('x-organisation-id') orgHeader?: string,
    @Query('organisationId') orgQuery?: string,
  ) {
    const organisationId = orgHeader || orgQuery;
    if (!organisationId) {
      throw new ForbiddenException('Organisation context required');
    }

    return this.prisma.voicePhoneNumber.findMany({
      where: { organisationId },
      include: { outlet: true, voiceProfile: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('numbers')
  async createPhoneNumber(
    @Body() dto: CreateVoicePhoneNumberDto,
    @Headers('x-organisation-id') orgHeader?: string,
    @Query('organisationId') orgQuery?: string,
  ) {
    const organisationId = orgHeader || orgQuery;
    if (!organisationId) {
      throw new ForbiddenException('Organisation context required');
    }

    return this.prisma.voicePhoneNumber.create({
      data: {
        organisationId,
        outletId: dto.outletId || null,
        phoneNumber: dto.phoneNumber.trim(),
        provider: dto.provider || 'DEVELOPMENT',
        providerReference: dto.providerReference || null,
        afterHoursMode: dto.afterHoursMode || 'PLAY_MESSAGE',
        greetingMessage: dto.greetingMessage || null,
        voiceProfileId: dto.voiceProfileId || null,
        recordingPolicy: dto.recordingPolicy || 'RECORDING_DISABLED',
        transcriptionPolicy: dto.transcriptionPolicy || 'ENABLED',
        humanHandoffNumber: dto.humanHandoffNumber || null,
        fallbackNumber: dto.fallbackNumber || null,
        businessHoursConfig: dto.businessHoursConfig || undefined,
      },
    });
  }

  @Patch('numbers/:id')
  async updatePhoneNumber(
    @Param('id') id: string,
    @Body() dto: UpdateVoicePhoneNumberDto,
    @Headers('x-organisation-id') orgHeader?: string,
    @Query('organisationId') orgQuery?: string,
  ) {
    const organisationId = orgHeader || orgQuery;
    const existing = await this.prisma.voicePhoneNumber.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`VoicePhoneNumber ${id} not found`);
    }

    if (organisationId && existing.organisationId !== organisationId) {
      throw new ForbiddenException('Access to cross-tenant phone number denied');
    }

    return this.prisma.voicePhoneNumber.update({
      where: { id },
      data: {
        outletId: dto.outletId !== undefined ? dto.outletId : existing.outletId,
        status: dto.status ?? existing.status,
        afterHoursMode: dto.afterHoursMode ?? existing.afterHoursMode,
        greetingMessage: dto.greetingMessage ?? existing.greetingMessage,
        voiceProfileId: dto.voiceProfileId !== undefined ? dto.voiceProfileId : existing.voiceProfileId,
        recordingPolicy: dto.recordingPolicy ?? existing.recordingPolicy,
        transcriptionPolicy: dto.transcriptionPolicy ?? existing.transcriptionPolicy,
        humanHandoffNumber: dto.humanHandoffNumber !== undefined ? dto.humanHandoffNumber : existing.humanHandoffNumber,
        fallbackNumber: dto.fallbackNumber !== undefined ? dto.fallbackNumber : existing.fallbackNumber,
        businessHoursConfig: dto.businessHoursConfig ?? (existing.businessHoursConfig as any),
      },
    });
  }

  // ==========================================================================
  // VOICE PROFILES
  // ==========================================================================

  @Get('profiles')
  async listVoiceProfiles(
    @Headers('x-organisation-id') orgHeader?: string,
    @Query('organisationId') orgQuery?: string,
  ) {
    const organisationId = orgHeader || orgQuery;
    return this.prisma.voiceProfile.findMany({
      where: {
        OR: [
          { organisationId: null }, // Global system voices
          ...(organisationId ? [{ organisationId }] : []),
        ],
        active: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  @Post('profiles')
  async createVoiceProfile(
    @Body() dto: CreateVoiceProfileDto,
    @Headers('x-organisation-id') orgHeader?: string,
    @Query('organisationId') orgQuery?: string,
  ) {
    const organisationId = orgHeader || orgQuery;
    return this.prisma.voiceProfile.create({
      data: {
        organisationId: organisationId || null,
        name: dto.name,
        provider: dto.provider,
        providerVoiceId: dto.providerVoiceId,
        language: dto.language || 'en',
        accent: dto.accent || null,
        gender: dto.gender || null,
        speakingRate: dto.speakingRate ?? 1.0,
        pitch: dto.pitch ?? 1.0,
      },
    });
  }
}
