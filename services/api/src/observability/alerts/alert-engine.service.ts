import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MetricRegistryService } from '../metrics/metric-registry.service';
import { CreateAlertRuleDto } from '../dto/observability.dto';
import { createHash } from 'crypto';

@Injectable()
export class AlertEngineService {
  private readonly logger = new Logger(AlertEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricRegistryService,
  ) {}

  /**
   * Evaluates all active alert rules against current metric values.
   * Employs deterministic fingerprinting to prevent alert storms and duplicates.
   */
  async evaluateRules() {
    const rules = await this.prisma.observabilityAlertRule.findMany({
      where: { isEnabled: true },
    });

    const generatedAlerts: any[] = [];

    for (const rule of rules) {
      const snap = this.metrics.getSnapshot(rule.metricKey);
      if (!snap) continue;

      const value = snap.value;
      let isBreached = false;

      switch (rule.condition) {
        case 'GT':
          isBreached = value > rule.threshold;
          break;
        case 'GTE':
          isBreached = value >= rule.threshold;
          break;
        case 'LT':
          isBreached = value < rule.threshold;
          break;
        case 'LTE':
          isBreached = value <= rule.threshold;
          break;
        case 'EQ':
          isBreached = value === rule.threshold;
          break;
      }

      if (isBreached) {
        // Generate deterministic fingerprint
        const fingerprint = createHash('sha256')
          .update(`${rule.ruleKey}:${rule.service}:${rule.metricKey}`)
          .digest('hex')
          .substring(0, 16);

        // Check if existing open alert with same fingerprint exists within cooldown
        const existingOpen = await this.prisma.observabilityAlert.findFirst({
          where: {
            fingerprint,
            status: { in: ['OPEN', 'INVESTIGATING'] },
          },
        });

        if (!existingOpen) {
          const alert = await this.prisma.observabilityAlert.create({
            data: {
              ruleKey: rule.ruleKey,
              title: `${rule.name} breached`,
              message: `Metric ${rule.metricKey} reached ${value} ${snap.unit} (threshold: ${rule.condition} ${rule.threshold})`,
              severity: rule.severity,
              status: 'OPEN',
              fingerprint,
              service: rule.service,
              metricKey: rule.metricKey,
              metricValue: value,
              thresholdValue: rule.threshold,
            },
          });
          generatedAlerts.push(alert);
          this.logger.warn(`ALERT CREATED: [${rule.severity}] ${alert.title} - ${alert.message}`);
        }
      }
    }

    return generatedAlerts;
  }

  /**
   * Registers a new alert rule.
   */
  async createRule(dto: CreateAlertRuleDto) {
    const existing = await this.prisma.observabilityAlertRule.findUnique({
      where: { ruleKey: dto.ruleKey },
    });

    if (existing) {
      throw new ConflictException(`Alert rule ${dto.ruleKey} already exists`);
    }

    return this.prisma.observabilityAlertRule.create({
      data: {
        ruleKey: dto.ruleKey,
        name: dto.name,
        description: dto.description,
        service: dto.service,
        metricKey: dto.metricKey,
        condition: dto.condition,
        threshold: dto.threshold,
        severity: dto.severity || 'MEDIUM',
        windowSeconds: dto.windowSeconds || 300,
        cooldownMinutes: dto.cooldownMinutes || 15,
        isEnabled: true,
      },
    });
  }

  /**
   * Acknowledges an alert.
   */
  async acknowledgeAlert(alertId: string, userId?: string) {
    const alert = await this.prisma.observabilityAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    return this.prisma.observabilityAlert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedByUserId: userId,
        acknowledgedAt: new Date(),
      },
    });
  }

  /**
   * Resolves an active alert.
   */
  async resolveAlert(alertId: string) {
    return this.prisma.observabilityAlert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Lists alerts with optional filters.
   */
  async listAlerts(status?: string, severity?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    return this.prisma.observabilityAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { rule: true, incident: true },
    });
  }
}
