import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AIToolRegistryService } from '../../../services/ai-tool-registry.service';
import { PrismaService } from '../../../../database/prisma.service';
import { EngagementSignalService } from '../../engagement-intelligence/signals/engagement-signal.service';
import { MemberEngagementBaselineService } from '../../engagement-intelligence/profile/member-engagement-baseline.service';
import { RetentionRiskService } from '../../engagement-intelligence/risk/retention-risk.service';
import { AIToolContext } from '@fitcore/types';
import { executeGetRetentionRiskTool } from './get-retention-risk.tool';
import { executeGetEngagementHistoryTool } from './get-engagement-history.tool';
import { executeGetMemberActivityTool } from './get-member-activity.tool';
import { executeGetMemberGoalsTool } from './get-member-goals.tool';

@Injectable()
export class RetentionIntelligenceToolsService implements OnModuleInit {
  private readonly logger = new Logger(RetentionIntelligenceToolsService.name);

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
    // 1. getRetentionRisk
    this.toolRegistry.registerTool({
      name: 'getRetentionRisk',
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

    // 2. getEngagementHistory
    this.toolRegistry.registerTool({
      name: 'getEngagementHistory',
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

    // 3. getMemberActivity
    this.toolRegistry.registerTool({
      name: 'getMemberActivity',
      description: 'Returns recent workout adherence, visits, and no-show history.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          memberId: { type: 'string', description: 'Target member ID' },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        return executeGetMemberActivityTool(
          input,
          context,
          this.prisma,
          this.signalService,
        );
      },
    });

    // 4. getMemberGoals
    this.toolRegistry.registerTool({
      name: 'getMemberGoals',
      description: 'Returns active training goals, progress percentages, target dates, and tenure context.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          memberId: { type: 'string', description: 'Target member ID' },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        return executeGetMemberGoalsTool(input, context, this.prisma);
      },
    });

    this.logger.log('Retention Intelligence AI read-only tools registered successfully.');
  }
}
