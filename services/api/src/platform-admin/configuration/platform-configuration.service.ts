import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SecurityEventService } from '../../security/events/security-event.service';
import { StepUpService } from '../../security/step-up/step-up.service';
import { RedisService } from '../../redis/redis.service';
import {
  UpdatePlatformConfigDto,
  SetMaintenanceModeDto,
} from '../dto/platform-admin.dto';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';

@Injectable()
export class PlatformConfigurationService {
  private readonly logger = new Logger(PlatformConfigurationService.name);
  private readonly configCachePrefix = 'platform_config:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly securityEventService: SecurityEventService,
    private readonly stepUpService: StepUpService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Lists all platform configurations.
   */
  async listConfigurations() {
    return this.prisma.platformConfiguration.findMany({
      orderBy: { configKey: 'asc' },
    });
  }

  /**
   * Retrieves configuration by key with Redis caching.
   */
  async getConfig(configKey: string) {
    const cacheKey = `${this.configCachePrefix}${configKey}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Redis best-effort
    }

    const config = await this.prisma.platformConfiguration.findUnique({
      where: { configKey },
    });

    if (!config) {
      return null;
    }

    try {
      await this.redis.set(cacheKey, JSON.stringify(config), 300);
    } catch {
      // Redis best-effort
    }

    return config;
  }

  /**
   * Updates or creates a versioned platform configuration entry.
   */
  async setConfig(
    configKey: string,
    dto: UpdatePlatformConfigDto,
    actor: AuthenticatedUser,
  ) {
    if (dto.stepUpToken) {
      await this.stepUpService.consumeChallenge(
        actor.id,
        dto.stepUpToken,
        'CHANGE_PLATFORM_CONFIG',
      );
    }

    const existing = await this.prisma.platformConfiguration.findUnique({
      where: { configKey },
    });

    const version = existing ? existing.version + 1 : 1;

    const updated = await this.prisma.platformConfiguration.upsert({
      where: { configKey },
      create: {
        configKey,
        category: dto.category,
        value: dto.value,
        version: 1,
        description: dto.description,
        updatedByUserId: actor.id,
      },
      update: {
        category: dto.category,
        value: dto.value,
        version,
        description: dto.description,
        updatedByUserId: actor.id,
      },
    });

    // Invalidate cache
    try {
      await this.redis.del(`${this.configCachePrefix}${configKey}`);
    } catch {
      // Redis best-effort
    }

    await this.auditService.log({
      userId: actor.id,
      action: 'PLATFORM_CONFIGURATION_CHANGED',
      resource: 'platform_configuration',
      resourceId: configKey,
      metadata: { configKey, version, previousValue: existing?.value, newValue: dto.value },
    });

    await this.securityEventService.recordEvent({
      userId: actor.id,
      eventType: 'PLATFORM_CONFIG_CHANGED',
      severity: 'MEDIUM',
      source: 'platform-admin',
      metadata: { configKey, version },
    });

    return updated;
  }

  /**
   * Sets platform maintenance mode with explicit scopes (PLATFORM, ORGANISATION, OUTLET, FEATURE).
   * Does NOT disable security, authentication, emergency access, or auditing.
   */
  async setMaintenanceMode(
    dto: SetMaintenanceModeDto,
    actor: AuthenticatedUser,
  ) {
    if (dto.stepUpToken) {
      await this.stepUpService.consumeChallenge(
        actor.id,
        dto.stepUpToken,
        'CHANGE_PLATFORM_CONFIG',
      );
    }

    const configKey = `maintenance:${dto.scope}:${dto.targetReferenceId || 'global'}`;

    const config = await this.prisma.platformConfiguration.upsert({
      where: { configKey },
      create: {
        configKey,
        category: 'MAINTENANCE',
        value: {
          enabled: dto.enabled,
          scope: dto.scope,
          targetReferenceId: dto.targetReferenceId,
          description: dto.description,
          activatedAt: dto.enabled ? new Date() : null,
        },
        version: 1,
        isMaintenanceMode: dto.enabled,
        maintenanceScope: dto.scope,
        targetReferenceId: dto.targetReferenceId,
        description: dto.description,
        updatedByUserId: actor.id,
      },
      update: {
        value: {
          enabled: dto.enabled,
          scope: dto.scope,
          targetReferenceId: dto.targetReferenceId,
          description: dto.description,
          activatedAt: dto.enabled ? new Date() : null,
        },
        isMaintenanceMode: dto.enabled,
        maintenanceScope: dto.scope,
        targetReferenceId: dto.targetReferenceId,
        description: dto.description,
        updatedByUserId: actor.id,
      },
    });

    // Invalidate cache
    try {
      await this.redis.del(`${this.configCachePrefix}${configKey}`);
      await this.redis.del('platform_maintenance_active');
    } catch {
      // Redis best-effort
    }

    await this.auditService.log({
      userId: actor.id,
      action: dto.enabled ? 'MAINTENANCE_MODE_ENABLED' : 'MAINTENANCE_MODE_DISABLED',
      resource: 'platform_configuration',
      resourceId: configKey,
      metadata: { scope: dto.scope, enabled: dto.enabled },
    });

    return config;
  }
}
