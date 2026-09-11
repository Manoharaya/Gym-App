import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  PrivacyProcessorDto,
  PrivacyProcessorCategory,
  PrivacyDataCategory,
} from '@fitcore/types';
import { CreateProcessorDto } from '../dto/privacy.dto';

export const DEFAULT_PROCESSORS: {
  name: string;
  category: PrivacyProcessorCategory;
  purpose: string;
  dataCategories: PrivacyDataCategory[];
  privacyPolicyReference: string;
  dataRegion: string;
}[] = [
  {
    name: 'Anthropic Claude / OpenAI',
    category: 'AI_PROVIDER',
    purpose: 'AI conversational coaching, training plan recommendations, and daily check-ins',
    dataCategories: ['AI_INTERACTION', 'PROFILE', 'TRAINING'],
    privacyPolicyReference: 'https://privacy.anthropic.com',
    dataRegion: 'US-EAST / EU-CENTRAL',
  },
  {
    name: 'Stripe Payments',
    category: 'PAYMENT_PROVIDER',
    purpose: 'PCI-DSS Level 1 compliant recurring subscription billing and credit card tokenization',
    dataCategories: ['PAYMENT', 'FINANCIAL', 'CONTACT'],
    privacyPolicyReference: 'https://stripe.com/privacy',
    dataRegion: 'GLOBAL / REGIONAL_VAULT',
  },
  {
    name: 'Twilio & SendGrid',
    category: 'COMMUNICATION_PROVIDER',
    purpose: 'Multi-channel transactional emails, SMS notifications, and security MFA alerts',
    dataCategories: ['COMMUNICATION', 'CONTACT'],
    privacyPolicyReference: 'https://twilio.com/legal/privacy',
    dataRegion: 'US-WEST / AUSTRALIA-SOUTHEAST',
  },
  {
    name: 'Apple HealthKit & Google Health Connect',
    category: 'WEARABLE_PROVIDER',
    purpose: 'Biometric telemetry synchronization and daily activity import',
    dataCategories: ['WEARABLE', 'HEALTH'],
    privacyPolicyReference: 'https://apple.com/privacy',
    dataRegion: 'ON_DEVICE / LOCAL_SYNC',
  },
  {
    name: 'Xero Accounting',
    category: 'ACCOUNTING_PROVIDER',
    purpose: 'Statutory accounting general ledger synchronization and invoice reconciliation',
    dataCategories: ['FINANCIAL', 'PAYMENT'],
    privacyPolicyReference: 'https://xero.com/legal/privacy',
    dataRegion: 'AUSTRALIA / UK',
  },
  {
    name: 'AWS S3 / Encrypted Object Storage',
    category: 'CLOUD_STORAGE',
    purpose: 'AES-256-GCM encrypted storage for member documents and privacy export archives',
    dataCategories: ['DOCUMENT', 'MEDICAL_DOCUMENT'],
    privacyPolicyReference: 'https://aws.amazon.com/privacy',
    dataRegion: 'AU-SOUTHEAST-2 (SYDNEY)',
  },
];

@Injectable()
export class PrivacyProcessorService {
  private readonly logger = new Logger(PrivacyProcessorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initializes default third-party processors if none exist.
   */
  async ensureProcessorsInitialized(organisationId?: string): Promise<void> {
    const existing = await this.prisma.privacyProcessor.count({
      where: organisationId ? { organisationId } : { organisationId: null },
    });

    if (existing > 0) return;

    for (const def of DEFAULT_PROCESSORS) {
      await this.prisma.privacyProcessor.create({
        data: {
          organisationId: organisationId || null,
          name: def.name,
          category: def.category,
          purpose: def.purpose,
          dataCategories: def.dataCategories,
          privacyPolicyReference: def.privacyPolicyReference,
          dataRegion: def.dataRegion,
          enabled: true,
          status: 'ACTIVE',
        },
      });
    }

    this.logger.log(`Initialized ${DEFAULT_PROCESSORS.length} third-party processors`);
  }

  /**
   * Returns all processors for an organisation.
   */
  async getProcessors(organisationId?: string): Promise<PrivacyProcessorDto[]> {
    await this.ensureProcessorsInitialized(organisationId);

    const processors = await this.prisma.privacyProcessor.findMany({
      where: organisationId
        ? { OR: [{ organisationId }, { organisationId: null }] }
        : { organisationId: null },
      orderBy: { category: 'asc' },
    });

    return processors.map((p) => ({
      id: p.id,
      organisationId: p.organisationId,
      name: p.name,
      category: p.category as PrivacyProcessorCategory,
      purpose: p.purpose,
      dataCategories: p.dataCategories as PrivacyDataCategory[],
      status: p.status,
      privacyPolicyReference: p.privacyPolicyReference,
      dataRegion: p.dataRegion,
      enabled: p.enabled,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Registers a new third-party processor.
   */
  async registerProcessor(
    organisationId: string,
    dto: CreateProcessorDto,
  ): Promise<PrivacyProcessorDto> {
    const p = await this.prisma.privacyProcessor.create({
      data: {
        organisationId,
        name: dto.name,
        category: dto.category,
        purpose: dto.purpose,
        dataCategories: dto.dataCategories,
        privacyPolicyReference: dto.privacyPolicyReference || null,
        dataRegion: dto.dataRegion || null,
        enabled: dto.enabled ?? true,
        status: 'ACTIVE',
      },
    });

    return {
      id: p.id,
      organisationId: p.organisationId,
      name: p.name,
      category: p.category as PrivacyProcessorCategory,
      purpose: p.purpose,
      dataCategories: p.dataCategories as PrivacyDataCategory[],
      status: p.status,
      privacyPolicyReference: p.privacyPolicyReference,
      dataRegion: p.dataRegion,
      enabled: p.enabled,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
