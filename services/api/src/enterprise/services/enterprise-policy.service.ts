import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreatePolicyDto, UpdatePolicyDto } from '../dto/create-policy.dto';
import { EnterpriseResourceNotFoundException } from '../domain/enterprise-errors';
import { EnterpriseEvent } from '../domain/enterprise-events';

@Injectable()
export class EnterprisePolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createPolicy(organisationId: string, dto: CreatePolicyDto, actorUserId?: string) {
    const existing = await this.prisma.enterprisePolicy.findFirst({
      where: {
        organisationId,
        code: dto.code,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId || dto.brandId || dto.outletId || null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `A policy with code '${dto.code}' already exists for scope ${dto.scopeType} [${dto.scopeId || 'default'}]`,
      );
    }

    const policy = await this.prisma.enterprisePolicy.create({
      data: {
        organisationId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        category: dto.category,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId || dto.brandId || dto.outletId || null,
        brandId: dto.brandId,
        outletId: dto.outletId,
        isHardCeiling: dto.isHardCeiling ?? false,
        priority: dto.priority ?? 0,
        status: dto.status ?? 'ACTIVE',
        configJson: dto.configJson,
        enforcementMode: dto.enforcementMode ?? 'ENFORCED',
        currentVersion: 1,
        createdById: actorUserId,
      },
    });

    // Create initial version
    await this.prisma.enterprisePolicyVersion.create({
      data: {
        policyId: policy.id,
        versionNumber: 1,
        configJson: dto.configJson,
        changeReason: dto.changeReason || 'Initial policy version',
        createdById: actorUserId,
      },
    });

    await this.auditService.log({
      action: EnterpriseEvent.POLICY_CREATED,
      resource: 'EnterprisePolicy',
      resourceId: policy.id,
      organisationId,
      userId: actorUserId,
      metadata: {
        code: policy.code,
        category: policy.category,
        scopeType: policy.scopeType,
        isHardCeiling: policy.isHardCeiling,
      },
    });

    return policy;
  }

  async getPolicies(
    organisationId: string,
    filters?: {
      category?: string;
      scopeType?: string;
      scopeId?: string;
      status?: string;
    },
  ) {
    return this.prisma.enterprisePolicy.findMany({
      where: {
        organisationId,
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.scopeType ? { scopeType: filters.scopeType } : {}),
        ...(filters?.scopeId ? { scopeId: filters.scopeId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        brand: { select: { id: true, name: true, code: true } },
        outlet: { select: { id: true, name: true, code: true } },
        _count: { select: { versions: true } },
      },
      orderBy: [{ category: 'asc' }, { priority: 'desc' }],
    });
  }

  async getPolicyById(organisationId: string, policyId: string) {
    const policy = await this.prisma.enterprisePolicy.findFirst({
      where: { id: policyId, organisationId },
      include: {
        brand: true,
        outlet: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!policy) {
      throw new EnterpriseResourceNotFoundException('Policy', policyId);
    }

    return policy;
  }

  async updatePolicy(
    organisationId: string,
    policyId: string,
    dto: UpdatePolicyDto,
    actorUserId?: string,
  ) {
    const policy = await this.getPolicyById(organisationId, policyId);

    const newVersionNumber = policy.currentVersion + 1;
    const newConfig = dto.configJson !== undefined ? dto.configJson : policy.configJson;

    const updated = await this.prisma.enterprisePolicy.update({
      where: { id: policyId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isHardCeiling !== undefined ? { isHardCeiling: dto.isHardCeiling } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.enforcementMode !== undefined ? { enforcementMode: dto.enforcementMode } : {}),
        ...(dto.configJson !== undefined ? { configJson: dto.configJson } : {}),
        currentVersion: newVersionNumber,
      },
    });

    if (dto.configJson !== undefined) {
      await this.prisma.enterprisePolicyVersion.create({
        data: {
          policyId,
          versionNumber: newVersionNumber,
          configJson: dto.configJson,
          changeReason: dto.changeReason || `Updated to version ${newVersionNumber}`,
          createdById: actorUserId,
        },
      });
    }

    await this.auditService.log({
      action: EnterpriseEvent.POLICY_UPDATED,
      resource: 'EnterprisePolicy',
      resourceId: policyId,
      organisationId,
      userId: actorUserId,
      metadata: {
        version: newVersionNumber,
        changeReason: dto.changeReason,
      },
    });

    return updated;
  }
}
