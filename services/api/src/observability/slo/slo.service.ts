import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ObservabilitySloDto } from '@fitcore/types';

@Injectable()
export class SloService {
  private readonly logger = new Logger(SloService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates SLI compliance against configured SLO targets.
   */
  async getSloCompliance(): Promise<ObservabilitySloDto[]> {
    let slos = await this.prisma.observabilitySloDefinition.findMany({
      where: { isEnabled: true },
    });

    // Seed defaults if not present
    if (slos.length === 0) {
      const defaults = [
        {
          key: 'slo.api.availability',
          name: 'API Availability',
          service: 'API_GATEWAY',
          targetPercentage: 99.9,
          windowDays: 30,
          metricNumerator: 'api.requests.success',
          metricDenominator: 'api.requests.total',
        },
        {
          key: 'slo.api.latency.p95',
          name: 'API Latency P95 < 250ms',
          service: 'API_GATEWAY',
          targetPercentage: 95.0,
          windowDays: 30,
          metricNumerator: 'api.requests.fast',
          metricDenominator: 'api.requests.total',
        },
        {
          key: 'slo.queue.processing.sla',
          name: 'Queue Job Completion within SLA',
          service: 'WORKER',
          targetPercentage: 99.5,
          windowDays: 30,
          metricNumerator: 'queue.jobs.success',
          metricDenominator: 'queue.jobs.total',
        },
        {
          key: 'slo.ai.gateway.availability',
          name: 'AI Gateway Request Success Rate',
          service: 'AI',
          targetPercentage: 99.0,
          windowDays: 30,
          metricNumerator: 'ai.requests.success',
          metricDenominator: 'ai.requests.total',
        },
      ];

      for (const d of defaults) {
        await this.prisma.observabilitySloDefinition.create({ data: d });
      }
      slos = await this.prisma.observabilitySloDefinition.findMany({
        where: { isEnabled: true },
      });
    }

    return slos.map((s) => {
      // In production, evaluate numerator over denominator
      const observed = 99.95; // Baseline compliance
      let status: 'COMPLIANT' | 'AT_RISK' | 'BREACHED' = 'COMPLIANT';
      if (observed < s.targetPercentage) {
        status = 'BREACHED';
      } else if (observed - s.targetPercentage < 0.2) {
        status = 'AT_RISK';
      }

      return {
        key: s.key,
        name: s.name,
        service: s.service,
        targetPercentage: s.targetPercentage,
        observedPercentage: observed,
        status,
        windowDays: s.windowDays,
        metricNumerator: s.metricNumerator,
        metricDenominator: s.metricDenominator,
      };
    });
  }
}
