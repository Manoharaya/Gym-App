import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AIToolRegistryService } from '../../../services/ai-tool-registry.service';
import { PrismaService } from '../../../../database/prisma.service';
import { EngagementSignalService } from '../../engagement-intelligence/signals/engagement-signal.service';
import { MemberEngagementBaselineService } from '../../engagement-intelligence/profile/member-engagement-baseline.service';
import { RetentionRiskService } from '../../engagement-intelligence/risk/retention-risk.service';
import { AIToolContext } from '@fitcore/types';
import { executeGetMemberRecoveryStateTool } from './get-member-recovery-state.tool';
import { executeGetEngagementHistoryTool } from './get-engagement-history.tool';
import { executeGetRetentionRiskTool } from './get-retention-risk.tool';
import { executeGetTrainingHistoryTool } from './get-training-history.tool';
import { executeGetMembershipStateTool } from './get-membership-state.tool';
import { executeGetGoalHistoryTool } from './get-goal-history.tool';

@Injectable()
export class ReactivationToolsService implements OnModuleInit {
  private readonly logger = new Logger(ReactivationToolsService.name);

  constructor(
    private readonly toolRegistry: AIToolRegistryService,
    private readonly prisma: PrismaService,
    private readonly signalService: EngagementSignalService,
    private readonly baselineService: MemberEngagementBaselineService,
    private readonly retentionRiskService: RetentionRiskService,
  ) {}

  onModuleInit() {
    this.registerTools();
  }

  private registerTools() {
    // 1. getMemberRecoveryState
    this.toolRegistry.registerTool({
      name: 'getMemberRecoveryState',
      description: 'Returns internal recovery state, reengagement signals, and active recovery plan status for a member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          memberId: { type: 'string', description: 'Target member ID' },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        return executeGetMemberRecoveryStateTool(input, context, this.prisma);
      },
    });

    // 2. getReactivationEngagementHistory
    this.toolRegistry.registerTool({
      name: 'getReactivationEngagementHistory',
      description: 'Returns historical attendance, booking, and app engagement signals alongside personal baseline comparison.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          memberId: { type: 'string', description: 'Target member ID' },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        return executeGetEngagementHistoryTool(
          input,
          context,
          this.prisma,
          this.signalService,
          this.baselineService,
        );
      },
    });

    // 3. getReactivationRetentionRisk
    this.toolRegistry.registerTool({
      name: 'getReactivationRetentionRisk',
      description: 'Returns internal retention risk assessment and data quality level for a member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          memberId: { type: 'string', description: 'Target member ID' },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        return executeGetRetentionRiskTool(
          input,
          context,
          this.prisma,
          this.signalService,
          this.baselineService,
          this.retentionRiskService,
        );
      },
    });

    // 4. getReactivationTrainingHistory
    this.toolRegistry.registerTool({
      name: 'getReactivationTrainingHistory',
      description: 'Returns recent workout completions, class booking history, and attendance records.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          memberId: { type: 'string', description: 'Target member ID' },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        return executeGetTrainingHistoryTool(input, context, this.prisma);
      },
    });

    // 5. getReactivationMembershipState
    this.toolRegistry.registerTool({
      name: 'getReactivationMembershipState',
      description: 'Returns member plan type, current membership status, and expiration timeline.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          memberId: { type: 'string', description: 'Target member ID' },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        return executeGetMembershipStateTool(input, context, this.prisma);
      },
    });

    // 6. getReactivationGoalHistory
    this.toolRegistry.registerTool({
      name: 'getReactivationGoalHistory',
      description: 'Returns active and stalled training goals for the member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          memberId: { type: 'string', description: 'Target member ID' },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        return executeGetGoalHistoryTool(input, context, this.prisma);
      },
    });

    this.logger.log('Registered 6 Reactivation & Recovery AI tools successfully.');
  }

  async getMemberRecoveryState(organisationId: string, memberId: string) {
    const context: AIToolContext = { organisationId, userId: 'SYSTEM', userRole: 'SYSTEM' };
    return executeGetMemberRecoveryStateTool({ memberId }, context, this.prisma);
  }

  async getTrainingHistory(organisationId: string, memberId: string) {
    const context: AIToolContext = { organisationId, userId: 'SYSTEM', userRole: 'SYSTEM' };
    return executeGetTrainingHistoryTool({ memberId }, context, this.prisma);
  }

  async getMembershipState(organisationId: string, memberId: string) {
    const context: AIToolContext = { organisationId, userId: 'SYSTEM', userRole: 'SYSTEM' };
    return executeGetMembershipStateTool({ memberId }, context, this.prisma);
  }
}
