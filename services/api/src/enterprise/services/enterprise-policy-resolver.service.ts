import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EnterpriseHierarchyService } from './enterprise-hierarchy.service';
import { HardCeilingViolationException } from '../domain/enterprise-errors';
import { EnterpriseEvent } from '../domain/enterprise-events';
import { AuditService } from '../../audit/audit.service';

export interface PolicyResolutionContext {
  organisationId: string;
  category: string;
  brandId?: string | null;
  regionCode?: string | null;
  outletId?: string | null;
}

export interface EffectivePolicyResult {
  category: string;
  effectiveConfig: Record<string, any>;
  hardCeilingsApplied: Array<{ field: string; parentScope: string; forcedValue: any }>;
  resolutionChain: Array<{
    scopeType: string;
    scopeId: string | null;
    policyId: string;
    policyCode: string;
    isHardCeiling: boolean;
  }>;
}

@Injectable()
export class EnterprisePolicyResolverService {
  private readonly logger = new Logger(EnterprisePolicyResolverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: EnterpriseHierarchyService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Resolves the effective policy for a given category and target context.
   * Traverses ORGANISATION -> BRAND -> REGION -> OUTLET, applying merges
   * and enforcing immutable hard ceilings.
   */
  async resolveEffectivePolicy(context: PolicyResolutionContext): Promise<EffectivePolicyResult> {
    // 1. Resolve full context if outletId is provided but brand/region are not
    let brandId = context.brandId;
    let regionCode = context.regionCode;

    if (context.outletId && (!brandId || !regionCode)) {
      const resolvedContext = await this.hierarchyService.resolveOutletContext(context.outletId);
      if (resolvedContext) {
        brandId = brandId || resolvedContext.brandId;
        regionCode = regionCode || resolvedContext.regionCode;
      }
    }

    // 2. Fetch all active policies in this organisation for this category
    const allPolicies = await this.prisma.enterprisePolicy.findMany({
      where: {
        organisationId: context.organisationId,
        category: context.category,
        status: 'ACTIVE',
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    // 3. Separate candidate policies by hierarchy tier
    const orgPolicies = allPolicies.filter((p) => p.scopeType === 'ORGANISATION');
    const brandPolicies = brandId
      ? allPolicies.filter((p) => p.scopeType === 'BRAND' && (p.scopeId === brandId || p.brandId === brandId))
      : [];
    const regionPolicies = regionCode
      ? allPolicies.filter((p) => p.scopeType === 'REGION' && p.scopeId === regionCode)
      : [];
    const outletPolicies = context.outletId
      ? allPolicies.filter((p) => p.scopeType === 'OUTLET' && (p.scopeId === context.outletId || p.outletId === context.outletId))
      : [];

    const resolutionChain: EffectivePolicyResult['resolutionChain'] = [];
    let effectiveConfig: Record<string, any> = {};
    const hardCeilings: Map<string, { value: any; scopeType: string; policyCode: string }> = new Map();
    const hardCeilingsApplied: EffectivePolicyResult['hardCeilingsApplied'] = [];

    // Helper to apply tier policies
    const applyTier = (policies: typeof allPolicies) => {
      for (const policy of policies) {
        resolutionChain.push({
          scopeType: policy.scopeType,
          scopeId: policy.scopeId,
          policyId: policy.id,
          policyCode: policy.code,
          isHardCeiling: policy.isHardCeiling,
        });

        const config = (policy.configJson as Record<string, any>) || {};

        for (const [key, val] of Object.entries(config)) {
          // If this policy sets a hard ceiling, register it
          if (policy.isHardCeiling) {
            hardCeilings.set(key, {
              value: val,
              scopeType: policy.scopeType,
              policyCode: policy.code,
            });
          }

          // Check if a parent hard ceiling is already active
          if (hardCeilings.has(key)) {
            const ceiling = hardCeilings.get(key)!;
            // A hard ceiling enforces security invariants:
            // e.g. boolean restriction (true requires true, false prohibits true) or numerical maximums
            const isLoosening = this.isRestrictionLoosened(ceiling.value, val);
            if (isLoosening) {
              // Clamp back to ceiling value!
              effectiveConfig[key] = ceiling.value;
              hardCeilingsApplied.push({
                field: key,
                parentScope: ceiling.scopeType,
                forcedValue: ceiling.value,
              });
              continue;
            }
          }

          // Normal merge
          effectiveConfig[key] = val;
        }
      }
    };

    // Apply in order of inheritance: Org -> Brand -> Region -> Outlet
    applyTier(orgPolicies);
    applyTier(brandPolicies);
    applyTier(regionPolicies);
    applyTier(outletPolicies);

    return {
      category: context.category,
      effectiveConfig,
      hardCeilingsApplied,
      resolutionChain,
    };
  }

  /**
   * Validates if a proposed policy change would violate an existing upstream hard ceiling.
   * Throws HardCeilingViolationException if violation is detected.
   */
  async validateHardCeilings(
    organisationId: string,
    category: string,
    proposedScopeType: 'BRAND' | 'REGION' | 'OUTLET',
    proposedScopeId: string | null | undefined,
    proposedConfig: Record<string, any>,
  ): Promise<void> {
    const parentPolicies = await this.prisma.enterprisePolicy.findMany({
      where: {
        organisationId,
        category,
        isHardCeiling: true,
        status: 'ACTIVE',
        scopeType: { in: ['ORGANISATION', 'BRAND', 'REGION'] },
      },
    });

    for (const parent of parentPolicies) {
      const parentConfig = (parent.configJson as Record<string, any>) || {};
      for (const [key, parentVal] of Object.entries(parentConfig)) {
        if (proposedConfig[key] !== undefined) {
          const proposedVal = proposedConfig[key];
          if (this.isRestrictionLoosened(parentVal, proposedVal)) {
            throw new HardCeilingViolationException(
              parent.code,
              key,
              `Proposed value '${JSON.stringify(proposedVal)}' loosens parent restriction '${JSON.stringify(parentVal)}'`,
            );
          }
        }
      }
    }
  }

  /**
   * Helper to detect if a proposed value relaxes a security restriction.
   */
  private isRestrictionLoosened(parentVal: any, proposedVal: any): boolean {
    // If parent enforces true (e.g. mfaRequired: true, requireAdminApproval: true)
    if (typeof parentVal === 'boolean' && parentVal === true && proposedVal === false) {
      return true;
    }
    // If parent enforces false (e.g. allowExternalLlmProviders: false, allowCustomWebhooks: false)
    if (typeof parentVal === 'boolean' && parentVal === false && proposedVal === true) {
      return true;
    }
    // If parent enforces a numerical upper ceiling (e.g. maxDiscountPercent: 20)
    if (typeof parentVal === 'number' && typeof proposedVal === 'number' && proposedVal > parentVal) {
      return true;
    }
    return false;
  }
}
