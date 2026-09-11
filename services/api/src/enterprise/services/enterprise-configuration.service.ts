import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class EnterpriseConfigurationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async setConfig(
    organisationId: string,
    category: string,
    key: string,
    value: any,
    scopeType = 'ORGANISATION',
    scopeId?: string,
    actorUserId?: string,
  ) {
    const config = await this.prisma.enterpriseConfiguration.upsert({
      where: {
        organisationId_category_key_scopeType_scopeId: {
          organisationId,
          category,
          key,
          scopeType,
          scopeId: scopeId || '',
        },
      },
      update: {
        value,
      },
      create: {
        organisationId,
        category,
        key,
        value,
        scopeType,
        scopeId: scopeId || '',
      },
    });

    await this.auditService.log({
      action: 'enterprise.config.updated',
      resource: 'EnterpriseConfiguration',
      resourceId: config.id,
      organisationId,
      userId: actorUserId,
      metadata: { category, key, scopeType, scopeId },
    });

    return config;
  }

  async getConfigs(
    organisationId: string,
    category?: string,
    scopeType?: string,
    scopeId?: string,
  ) {
    return this.prisma.enterpriseConfiguration.findMany({
      where: {
        organisationId,
        ...(category ? { category } : {}),
        ...(scopeType ? { scopeType } : {}),
        ...(scopeId ? { scopeId } : {}),
      },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async getConfigValue(
    organisationId: string,
    category: string,
    key: string,
    defaultValue?: any,
  ) {
    const config = await this.prisma.enterpriseConfiguration.findFirst({
      where: {
        organisationId,
        category,
        key,
      },
    });

    return config ? config.value : defaultValue;
  }
}
