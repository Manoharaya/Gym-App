import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EnterprisePolicyResolverService } from '../../enterprise/services/enterprise-policy-resolver.service';

export interface SecurityPoliciesState {
  mfaRequirement: 'OPTIONAL' | 'REQUIRED_FOR_ALL' | 'REQUIRED_FOR_ADMIN' | 'REQUIRED_FOR_FINANCE';
  sessionIdleTimeoutMinutes: number;
  sessionMaxDurationHours: number;
  maxFailedLogins: number;
  lockoutDurationMinutes: number;
  stepUpRequiredForSensitiveActions: boolean;
}

/**
 * SecurityPolicyService
 *
 * Manages enterprise security policies using Day 51 EnterprisePolicy architecture.
 * Evaluates organisation and outlet security policies with inheritance and hard ceilings.
 */
@Injectable()
export class SecurityPolicyService {
  private readonly logger = new Logger(SecurityPolicyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policyResolver: EnterprisePolicyResolverService,
  ) {}

  /**
   * Resolves the effective security policies for an organisation/outlet context.
   */
  async getEffectiveSecurityPolicies(
    organisationId: string,
    outletId?: string,
  ): Promise<SecurityPoliciesState> {
    const resolved = await this.policyResolver.resolveEffectivePolicy({
      organisationId,
      category: 'SECURITY',
      outletId,
    });

    const cfg = resolved.effectiveConfig || {};

    return {
      mfaRequirement: cfg.mfaRequirement || 'REQUIRED_FOR_ADMIN',
      sessionIdleTimeoutMinutes: Number(cfg.sessionIdleTimeoutMinutes) || 60,
      sessionMaxDurationHours: Number(cfg.sessionMaxDurationHours) || 12,
      maxFailedLogins: Number(cfg.maxFailedLogins) || 5,
      lockoutDurationMinutes: Number(cfg.lockoutDurationMinutes) || 15,
      stepUpRequiredForSensitiveActions: cfg.stepUpRequiredForSensitiveActions !== false,
    };
  }

  /**
   * Checks whether MFA is required for a specific user based on their roles and enterprise policy.
   */
  async isMfaRequiredForUser(
    userId: string,
    organisationId?: string,
  ): Promise<boolean> {
    if (!organisationId) {
      // Find user's organisation
      const userRole = await this.prisma.userRole.findFirst({
        where: { userId },
      });
      organisationId = userRole?.organisationId;
    }

    if (!organisationId) return false;

    const policies = await this.getEffectiveSecurityPolicies(organisationId);

    if (policies.mfaRequirement === 'REQUIRED_FOR_ALL') {
      return true;
    }

    // Check user roles
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, organisationId },
      include: { role: true },
    });

    const roleNames = userRoles.map((ur) => ur.role.name);

    if (policies.mfaRequirement === 'REQUIRED_FOR_ADMIN') {
      const adminRoles = [
        'SUPERADMIN',
        'ORGANISATION_OWNER',
        'ENTERPRISE_ADMIN',
        'OUTLET_MANAGER',
        'REGIONAL_MANAGER',
        'BRAND_MANAGER',
      ];
      return roleNames.some((r) => adminRoles.includes(r));
    }

    if (policies.mfaRequirement === 'REQUIRED_FOR_FINANCE') {
      return roleNames.includes('FINANCE');
    }

    return false;
  }

  /**
   * Updates or sets an organisation-wide security policy.
   */
  async updateSecurityPolicy(
    organisationId: string,
    policyKey: string,
    policyValue: any,
    updatedByUserId?: string,
  ): Promise<void> {
    const existing = await this.prisma.enterprisePolicy.findFirst({
      where: {
        organisationId,
        code: 'ORG_SECURITY_POLICY',
        scopeType: 'ORGANISATION',
      },
    });

    const currentConfig = existing ? ((existing.configJson as Record<string, any>) || {}) : {};
    const updatedConfig = {
      ...currentConfig,
      [policyKey]: policyValue,
    };

    if (existing) {
      await this.prisma.enterprisePolicy.update({
        where: { id: existing.id },
        data: {
          configJson: updatedConfig,
          currentVersion: existing.currentVersion + 1,
          updatedAt: new Date(),
        },
      });

      await this.prisma.enterprisePolicyVersion.create({
        data: {
          policyId: existing.id,
          versionNumber: existing.currentVersion + 1,
          configJson: updatedConfig,
          changeReason: `Updated ${policyKey}`,
          createdById: updatedByUserId,
        },
      });
    } else {
      const created = await this.prisma.enterprisePolicy.create({
        data: {
          organisationId,
          name: 'Organisation Security Policy',
          code: 'ORG_SECURITY_POLICY',
          category: 'SECURITY',
          scopeType: 'ORGANISATION',
          isHardCeiling: true,
          status: 'ACTIVE',
          configJson: updatedConfig,
          createdById: updatedByUserId,
        },
      });

      await this.prisma.enterprisePolicyVersion.create({
        data: {
          policyId: created.id,
          versionNumber: 1,
          configJson: updatedConfig,
          changeReason: 'Initial creation',
          createdById: updatedByUserId,
        },
      });
    }
  }
}
