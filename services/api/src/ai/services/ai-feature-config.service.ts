import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AIFeature, AIFeatureConfigurationDto } from '@fitcore/types';
import { UpdateAIFeatureConfigDto } from '../dto/ai.dto';

export const ALL_AI_FEATURES: AIFeature[] = [
  'AI_PLATFORM_TEST',
  'FITNESS_COACH',
  'NUTRITION_COACH',
  'DAILY_CHECKIN',
  'WEARABLE_INTELLIGENCE',
  'ENGAGEMENT_INTELLIGENCE',
  'RETENTION_INTELLIGENCE',
  'AI_REACTIVATION',
  'RETENTION_AGENT',
  'PROGRESS_INSIGHTS',
  'ENGAGEMENT_ASSISTANT',
  'RECEPTIONIST',
  'RECEPTIONIST_BOOKING',
  'SALES_AGENT',
  'MARKETING_ASSISTANT',
  'CHURN_INTELLIGENCE',
  'AUTOMATION_ASSISTANT',
];

@Injectable()
export class AIFeatureConfigService {
  private readonly logger = new Logger(AIFeatureConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Platform default configuration fallback.
   */
  getPlatformDefaults(feature: AIFeature): AIFeatureConfigurationDto {
    const isSupportedFeature =
      feature === 'AI_PLATFORM_TEST' ||
      feature === 'FITNESS_COACH' ||
      feature === 'NUTRITION_COACH' ||
      feature === 'DAILY_CHECKIN' ||
      feature === 'WEARABLE_INTELLIGENCE' ||
      feature === 'ENGAGEMENT_INTELLIGENCE' ||
      feature === 'RETENTION_INTELLIGENCE' ||
      feature === 'AI_REACTIVATION' ||
      feature === 'RETENTION_AGENT' ||
      feature === 'AUTOMATION_ASSISTANT' ||
      feature === 'RECEPTIONIST' ||
      feature === 'RECEPTIONIST_BOOKING';

    const isStaffOnlyFeature =
      feature === 'RETENTION_INTELLIGENCE' ||
      feature === 'AI_REACTIVATION' ||
      feature === 'RETENTION_AGENT' ||
      feature === 'AUTOMATION_ASSISTANT';

    return {
      organisationId: 'PLATFORM_DEFAULT',
      feature,
      enabled: isSupportedFeature,
      dailyLimit: isSupportedFeature ? 500 : 100,
      monthlyLimit: isSupportedFeature ? 10000 : 3000,
      allowedRoles: isStaffOnlyFeature
        ? ['SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER', 'TRAINER', 'RECEPTION']
        : ['SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER', 'TRAINER', 'MEMBER'],
      configuration: {
        maxTokens: isStaffOnlyFeature ? 1200 : 1000,
        temperature: isStaffOnlyFeature ? 0.3 : 0.7,
      },
    };
  }

  /**
   * Resolves hierarchical configuration:
   * 1. Outlet configuration (if outletId provided)
   * 2. Organisation configuration
   * 3. Platform default fallback
   */
  async resolveConfiguration(
    organisationId: string,
    feature: AIFeature,
    outletId?: string | null,
  ): Promise<AIFeatureConfigurationDto> {
    const platformDefaults = this.getPlatformDefaults(feature);

    // 1. Check outlet-level configuration
    if (outletId) {
      const outletConfig = await this.prisma.aIFeatureConfiguration.findUnique({
        where: {
          organisationId_outletId_feature: {
            organisationId,
            outletId,
            feature,
          },
        },
      });

      if (outletConfig) {
        return {
          id: outletConfig.id,
          organisationId: outletConfig.organisationId,
          outletId: outletConfig.outletId,
          feature: outletConfig.feature as AIFeature,
          enabled: outletConfig.enabled,
          modelId: outletConfig.modelId,
          dailyLimit: outletConfig.dailyLimit ?? platformDefaults.dailyLimit,
          monthlyLimit: outletConfig.monthlyLimit ?? platformDefaults.monthlyLimit,
          allowedRoles: outletConfig.allowedRoles,
          configuration: (outletConfig.configuration as Record<string, any>) || platformDefaults.configuration,
        };
      }
    }

    // 2. Check organisation-level configuration
    const orgConfig = await this.prisma.aIFeatureConfiguration.findFirst({
      where: {
        organisationId,
        outletId: null,
        feature,
      },
    });

    if (orgConfig) {
      return {
        id: orgConfig.id,
        organisationId: orgConfig.organisationId,
        outletId: null,
        feature: orgConfig.feature as AIFeature,
        enabled: orgConfig.enabled,
        modelId: orgConfig.modelId,
        dailyLimit: orgConfig.dailyLimit ?? platformDefaults.dailyLimit,
        monthlyLimit: orgConfig.monthlyLimit ?? platformDefaults.monthlyLimit,
        allowedRoles: orgConfig.allowedRoles,
        configuration: (orgConfig.configuration as Record<string, any>) || platformDefaults.configuration,
      };
    }

    // 3. Fall back to platform defaults
    return {
      ...platformDefaults,
      organisationId,
    };
  }

  /**
   * Validates if a feature is enabled and if the calling user role is allowed to invoke it.
   */
  async validateFeatureAccess(
    organisationId: string,
    feature: AIFeature,
    userRole: string,
    outletId?: string | null,
  ): Promise<AIFeatureConfigurationDto> {
    const config = await this.resolveConfiguration(organisationId, feature, outletId);

    if (!config.enabled) {
      throw new ForbiddenException(`AI Feature '${feature}' is disabled for organisation '${organisationId}'`);
    }

    if (!config.allowedRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Role '${userRole}' is not authorized to use AI feature '${feature}'`,
      );
    }

    return config;
  }

  /**
   * List all feature configurations for an organisation.
   */
  async listOrganisationFeatures(organisationId: string) {
    const configs = await this.prisma.aIFeatureConfiguration.findMany({
      where: { organisationId, outletId: null },
    });

    const configMap = new Map<string, any>();
    for (const c of configs) {
      configMap.set(c.feature, c);
    }

    return ALL_AI_FEATURES.map((feature) => {
      const existing = configMap.get(feature);
      if (existing) return existing;
      return this.getPlatformDefaults(feature);
    });
  }

  /**
   * Upserts organisation feature configuration.
   */
  async updateOrganisationFeature(
    organisationId: string,
    feature: AIFeature,
    dto: UpdateAIFeatureConfigDto,
  ) {
    const defaults = this.getPlatformDefaults(feature);

    const existing = await this.prisma.aIFeatureConfiguration.findFirst({
      where: { organisationId, outletId: null, feature },
    });

    if (existing) {
      return this.prisma.aIFeatureConfiguration.update({
        where: { id: existing.id },
        data: {
          ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
          ...(dto.modelId !== undefined ? { modelId: dto.modelId } : {}),
          ...(dto.dailyLimit !== undefined ? { dailyLimit: dto.dailyLimit } : {}),
          ...(dto.monthlyLimit !== undefined ? { monthlyLimit: dto.monthlyLimit } : {}),
          ...(dto.allowedRoles !== undefined ? { allowedRoles: dto.allowedRoles } : {}),
          ...(dto.configuration !== undefined ? { configuration: dto.configuration } : {}),
        },
      });
    }

    return this.prisma.aIFeatureConfiguration.create({
      data: {
        organisationId,
        outletId: null,
        feature,
        enabled: dto.enabled ?? defaults.enabled,
        modelId: dto.modelId ?? null,
        dailyLimit: dto.dailyLimit ?? defaults.dailyLimit,
        monthlyLimit: dto.monthlyLimit ?? defaults.monthlyLimit,
        allowedRoles: dto.allowedRoles ?? defaults.allowedRoles,
        configuration: dto.configuration ?? defaults.configuration,
      },
    });
  }
}
