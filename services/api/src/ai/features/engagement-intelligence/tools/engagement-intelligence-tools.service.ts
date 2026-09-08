import { Injectable, Logger, OnModuleInit, ForbiddenException } from '@nestjs/common';
import { AIToolRegistryService } from '../../../services/ai-tool-registry.service';
import { PrismaService } from '../../../../database/prisma.service';
import { EngagementSignalService } from '../signals/engagement-signal.service';
import { MemberEngagementProfileService } from '../profile/member-engagement-profile.service';
import { MemberEngagementBaselineService } from '../profile/member-engagement-baseline.service';
import { EngagementTrendService } from '../trends/engagement-trend.service';
import { RetentionRiskService } from '../risk/retention-risk.service';
import { AIToolContext } from '@fitcore/types';

@Injectable()
export class EngagementIntelligenceToolsService implements OnModuleInit {
  private readonly logger = new Logger(EngagementIntelligenceToolsService.name);

  constructor(
    private readonly toolRegistry: AIToolRegistryService,
    private readonly prisma: PrismaService,
    private readonly signalService: EngagementSignalService,
    private readonly profileService: MemberEngagementProfileService,
    private readonly baselineService: MemberEngagementBaselineService,
    private readonly trendService: EngagementTrendService,
    private readonly retentionRiskService: RetentionRiskService,
  ) {}

  onModuleInit() {
    this.registerEngagementTools();
  }

  private registerEngagementTools() {
    // 1. getEngagementSummary
    this.toolRegistry.registerTool({
      name: 'getEngagementSummary',
      description: 'Returns deterministic member engagement profile, frequencies, adherence, and overall level.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          memberId: { type: 'string', description: 'Target member ID (optional, defaults to context member)' },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = await this.resolveAndAuthorizeMemberId(input?.memberId, context);
        const signals = await this.signalService.collectAllSignals(memberId, context.organisationId);
        return this.profileService.buildProfile(signals);
      },
    });

    // 2. getEngagementTrends
    this.toolRegistry.registerTool({
      name: 'getEngagementTrends',
      description: 'Returns multi-pillar engagement trends comparing recent activity against personal historical baseline.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          memberId: { type: 'string', description: 'Target member ID' },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = await this.resolveAndAuthorizeMemberId(input?.memberId, context);
        const signals = await this.signalService.collectAllSignals(memberId, context.organisationId);
        const baseline = await this.baselineService.computeBaseline(memberId, context.organisationId);
        return this.trendService.detectTrends(signals, baseline);
      },
    });

    // 3. getAttendanceEngagement
    this.toolRegistry.registerTool({
      name: 'getAttendanceEngagement',
      description: 'Returns detailed attendance metrics, visits last 7d/28d, and no-show history.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object' },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = await this.resolveAndAuthorizeMemberId(input?.memberId, context);
        const signals = await this.signalService.collectAllSignals(memberId, context.organisationId);
        return signals.attendance;
      },
    });

    // 4. getWorkoutEngagement
    this.toolRegistry.registerTool({
      name: 'getWorkoutEngagement',
      description: 'Returns workout completion, adherence percentage, and training consistency metrics.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object' },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = await this.resolveAndAuthorizeMemberId(input?.memberId, context);
        const signals = await this.signalService.collectAllSignals(memberId, context.organisationId);
        return signals.workout;
      },
    });

    // 5. getBookingEngagement
    this.toolRegistry.registerTool({
      name: 'getBookingEngagement',
      description: 'Returns class and session booking frequencies, cancellations, and waitlist activity.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object' },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = await this.resolveAndAuthorizeMemberId(input?.memberId, context);
        const signals = await this.signalService.collectAllSignals(memberId, context.organisationId);
        return signals.booking;
      },
    });

    // 6. getRetentionRisk
    this.toolRegistry.registerTool({
      name: 'getRetentionRisk',
      description: 'Returns staff retention risk assessment with explainable contributing behavioral signals. Requires STAFF or TRAINER scope.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          memberId: { type: 'string', description: 'Target member ID' },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = await this.resolveAndAuthorizeMemberId(input?.memberId, context, true);
        const signals = await this.signalService.collectAllSignals(memberId, context.organisationId);
        const baseline = await this.baselineService.computeBaseline(memberId, context.organisationId);
        return this.retentionRiskService.evaluateRetentionRisk(signals, baseline);
      },
    });
  }

  /**
   * Helper enforcing strict multi-tenant and role authorization for tool access.
   */
  private async resolveAndAuthorizeMemberId(
    requestedMemberId: string | undefined,
    context: AIToolContext,
    requiresStaffRole: boolean = false,
  ): Promise<string> {
    const memberId = requestedMemberId || context.memberId;
    if (!memberId) {
      throw new ForbiddenException('Target member ID could not be resolved from context.');
    }

    // Verify member belongs to organisation
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      select: { id: true, organisationId: true, userId: true },
    });

    if (!member || member.organisationId !== context.organisationId) {
      throw new ForbiddenException('Member not found within current organisation scope.');
    }

    // If staff role required, check if user is not the member or has staff/trainer privileges
    if (requiresStaffRole && context.userId === member.userId) {
      // Members cannot directly request their own internal retention risk
      throw new ForbiddenException('Retention risk evaluation is restricted to authorized staff and trainers.');
    }

    return member.id;
  }
}
