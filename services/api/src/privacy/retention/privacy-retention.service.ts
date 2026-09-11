import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  PrivacyRetentionPolicyDto,
  PrivacyDataCategory,
  RetentionAction,
} from '@fitcore/types';
import {
  CreateRetentionPolicyDto,
  UpdateRetentionPolicyDto,
} from '../dto/privacy.dto';

export const DEFAULT_RETENTION_POLICIES: {
  dataCategory: PrivacyDataCategory;
  name: string;
  retentionPeriodDays: number;
  action: RetentionAction;
  description: string;
}[] = [
  {
    dataCategory: 'HEALTH',
    name: 'Statutory Health Records Policy',
    retentionPeriodDays: 2555, // 7 years
    action: 'DELETE',
    description: 'Mandatory clinical and health questionnaire retention for exercise safety compliance.',
  },
  {
    dataCategory: 'FINANCIAL',
    name: 'Tax & Accounting Retention Policy',
    retentionPeriodDays: 2555, // 7 years
    action: 'ARCHIVE',
    description: 'Statutory tax and commercial law retention for invoices and payments.',
  },
  {
    dataCategory: 'WEARABLE',
    name: 'Wearable Telemetry Retention Policy',
    retentionPeriodDays: 730, // 2 years
    action: 'DELETE',
    description: 'Retention limit for continuous biometric and wearable health records.',
  },
  {
    dataCategory: 'COMMUNICATION',
    name: 'Customer Messaging Retention Policy',
    retentionPeriodDays: 365, // 1 year
    action: 'DELETE',
    description: 'Delivery logs and message history across communication channels.',
  },
  {
    dataCategory: 'AI_INTERACTION',
    name: 'AI Coaching Context Retention Policy',
    retentionPeriodDays: 90, // 90 days
    action: 'DELETE',
    description: 'AI conversational context and automated coaching history.',
  },
  {
    dataCategory: 'SECURITY',
    name: 'Security Telemetry Retention Policy',
    retentionPeriodDays: 730, // 2 years
    action: 'ARCHIVE',
    description: 'Security events, authentication attempts, and threat audit trail.',
  },
];

@Injectable()
export class PrivacyRetentionService {
  private readonly logger = new Logger(PrivacyRetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seeds default retention policies for an organisation if none exist.
   */
  async ensurePoliciesInitialized(organisationId: string): Promise<void> {
    const count = await this.prisma.privacyRetentionPolicy.count({
      where: { organisationId },
    });

    if (count > 0) return;

    for (const def of DEFAULT_RETENTION_POLICIES) {
      await this.prisma.privacyRetentionPolicy.create({
        data: {
          organisationId,
          dataCategory: def.dataCategory,
          name: def.name,
          retentionPeriodDays: def.retentionPeriodDays,
          action: def.action,
          description: def.description,
          enabled: true,
        },
      });
    }

    this.logger.log(`Initialized ${DEFAULT_RETENTION_POLICIES.length} default retention policies for org ${organisationId}`);
  }

  /**
   * Retrieves all retention policies for an organisation.
   */
  async getPolicies(organisationId: string): Promise<PrivacyRetentionPolicyDto[]> {
    await this.ensurePoliciesInitialized(organisationId);

    const policies = await this.prisma.privacyRetentionPolicy.findMany({
      where: { organisationId },
      orderBy: { dataCategory: 'asc' },
    });

    return policies.map((p) => this.mapToDto(p));
  }

  /**
   * Creates a custom retention policy.
   */
  async createPolicy(
    organisationId: string,
    dto: CreateRetentionPolicyDto,
  ): Promise<PrivacyRetentionPolicyDto> {
    const policy = await this.prisma.privacyRetentionPolicy.create({
      data: {
        organisationId,
        dataCategory: dto.dataCategory,
        name: dto.name,
        retentionPeriodDays: dto.retentionPeriodDays,
        action: dto.action,
        legalHold: dto.legalHold ?? false,
        enabled: dto.enabled ?? true,
        description: dto.description || null,
      },
    });

    return this.mapToDto(policy);
  }

  /**
   * Updates an existing retention policy.
   */
  async updatePolicy(
    policyId: string,
    organisationId: string,
    dto: UpdateRetentionPolicyDto,
  ): Promise<PrivacyRetentionPolicyDto> {
    const policy = await this.prisma.privacyRetentionPolicy.findFirst({
      where: { id: policyId, organisationId },
    });

    if (!policy) {
      throw new NotFoundException('Retention policy not found');
    }

    const updated = await this.prisma.privacyRetentionPolicy.update({
      where: { id: policyId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.retentionPeriodDays !== undefined && {
          retentionPeriodDays: dto.retentionPeriodDays,
        }),
        ...(dto.action !== undefined && { action: dto.action }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    return this.mapToDto(updated);
  }

  private mapToDto(p: any): PrivacyRetentionPolicyDto {
    return {
      id: p.id,
      organisationId: p.organisationId,
      dataCategory: p.dataCategory as PrivacyDataCategory,
      name: p.name,
      retentionPeriodDays: p.retentionPeriodDays,
      action: p.action as RetentionAction,
      legalHold: p.legalHold,
      enabled: p.enabled,
      effectiveAt: p.effectiveAt.toISOString(),
      description: p.description,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
