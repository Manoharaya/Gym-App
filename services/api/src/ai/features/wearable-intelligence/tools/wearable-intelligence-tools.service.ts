import { Injectable, Logger, OnModuleInit, ForbiddenException } from '@nestjs/common';
import { AIToolRegistryService } from '../../../services/ai-tool-registry.service';
import { WearableMetricsService } from '../metrics/wearable-metrics.service';
import { WearableTrendService } from '../trends/wearable-trend.service';
import { TrainingCorrelationService } from '../correlation/training-correlation.service';
import { PrismaService } from '../../../../database/prisma.service';
import { AIToolContext } from '@fitcore/types';

@Injectable()
export class WearableIntelligenceToolsService implements OnModuleInit {
  private readonly logger = new Logger(WearableIntelligenceToolsService.name);

  constructor(
    private readonly toolRegistry: AIToolRegistryService,
    private readonly metricsService: WearableMetricsService,
    private readonly trendService: WearableTrendService,
    private readonly correlationService: TrainingCorrelationService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.registerWearableTools();
  }

  private registerWearableTools() {
    // 1. get_wearable_summary
    this.toolRegistry.registerTool({
      name: 'get_wearable_summary',
      description: 'Returns deterministic wearable metrics summary (sleep, activity, heart, recovery) for the authenticated member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          daysBack: { type: 'number', description: 'Observation window days (default 28)', default: 28 },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const days = Math.min(60, input.daysBack || 28);
        return this.metricsService.getMetricsForMember(memberId, context.organisationId, days);
      },
    });

    // 2. get_sleep_trend
    this.toolRegistry.registerTool({
      name: 'get_sleep_trend',
      description: 'Returns multi-day sleep duration trends and bedtime consistency metrics for the member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object' },
      execute: async (_input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const records = await this.fetchRecentRecords(memberId, context.organisationId, 30);
        const trends = this.trendService.detectTrends(records);
        const sleepTrend = trends.find((t) => t.metric === 'SLEEP');
        return sleepTrend || { message: 'No sleep trend identified.' };
      },
    });

    // 3. get_activity_trend
    this.toolRegistry.registerTool({
      name: 'get_activity_trend',
      description: 'Returns multi-day step and activity trends for the authenticated member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object' },
      execute: async (_input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const records = await this.fetchRecentRecords(memberId, context.organisationId, 30);
        const trends = this.trendService.detectTrends(records);
        const activityTrend = trends.find((t) => t.metric === 'STEPS');
        return activityTrend || { message: 'No activity trend identified.' };
      },
    });

    // 4. get_recovery_summary
    this.toolRegistry.registerTool({
      name: 'get_recovery_summary',
      description: 'Returns qualitative fitness recovery assessment (GOOD, MODERATE, LOW, INSUFFICIENT_DATA).',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object' },
      execute: async (_input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const metrics = await this.metricsService.getMetricsForMember(memberId, context.organisationId, 14);
        return metrics.recovery;
      },
    });

    // 5. get_training_correlation
    this.toolRegistry.registerTool({
      name: 'get_training_correlation',
      description: 'Identifies non-causal patterns between wearable telemetry and recent workout frequency.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object' },
      execute: async (_input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const metrics = await this.metricsService.getMetricsForMember(memberId, context.organisationId, 28);
        return this.correlationService.findCorrelations({
          memberId,
          organisationId: context.organisationId,
          sleep: metrics.sleep,
          activity: metrics.activity,
        });
      },
    });

    this.logger.log('AI Wearable Intelligence read-only tools successfully registered.');
  }

  private resolveValidatedMemberId(context: AIToolContext): string {
    if (!context.memberId) {
      throw new ForbiddenException('Member context is required for wearable intelligence AI tools.');
    }
    return context.memberId;
  }

  private async fetchRecentRecords(memberId: string, organisationId: string, daysBack: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    return this.prisma.healthDataRecord.findMany({
      where: {
        memberId,
        organisationId,
        startTime: { gte: startDate },
      },
      orderBy: { startTime: 'desc' },
    });
  }
}
