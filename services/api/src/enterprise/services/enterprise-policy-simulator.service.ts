import { Injectable } from '@nestjs/common';
import { EnterprisePolicyResolverService } from './enterprise-policy-resolver.service';
import { SimulatePolicyDto } from '../dto/create-policy.dto';

export interface PolicySimulationDiffItem {
  field: string;
  baselineValue: any;
  simulatedValue: any;
  status: 'UNCHANGED' | 'ADDED' | 'MODIFIED' | 'CEILING_BLOCKED';
  reason?: string;
}

export interface PolicySimulationReport {
  category: string;
  scopeContext: {
    brandId?: string;
    regionCode?: string;
    outletId?: string;
  };
  baselineConfig: Record<string, any>;
  simulatedEffectiveConfig: Record<string, any>;
  diff: PolicySimulationDiffItem[];
  violations: Array<{ field: string; message: string }>;
  isSafeToApply: boolean;
}

@Injectable()
export class EnterprisePolicySimulatorService {
  constructor(private readonly resolverService: EnterprisePolicyResolverService) {}

  async simulate(
    organisationId: string,
    dto: SimulatePolicyDto,
  ): Promise<PolicySimulationReport> {
    // 1. Get current baseline effective policy
    const baseline = await this.resolverService.resolveEffectivePolicy({
      organisationId,
      category: dto.category,
      brandId: dto.brandId,
      regionCode: dto.regionCode,
      outletId: dto.outletId,
    });

    const baselineConfig = baseline.effectiveConfig;
    const proposed = dto.proposedConfig || {};
    const diff: PolicySimulationDiffItem[] = [];
    const violations: Array<{ field: string; message: string }> = [];
    const simulatedEffectiveConfig: Record<string, any> = { ...baselineConfig };

    // 2. Evaluate each proposed setting
    for (const [key, val] of Object.entries(proposed)) {
      const baseVal = baselineConfig[key];

      // Check if this field is protected by an active hard ceiling
      const ceilingRecord = baseline.hardCeilingsApplied.find((c) => c.field === key) ||
        baseline.resolutionChain.find((r) => r.isHardCeiling);

      let isViolation = false;
      let reason: string | undefined;

      // Check violation logic
      if (typeof baseVal === 'boolean' && baseVal === true && val === false) {
        // e.g., mfaRequired
        const wasHardCeiling = baseline.resolutionChain.some((r) => r.isHardCeiling);
        if (wasHardCeiling) {
          isViolation = true;
          reason = 'Cannot relax security requirement protected by upstream hard ceiling';
        }
      } else if (typeof baseVal === 'boolean' && baseVal === false && val === true) {
        // e.g. allowExternalLlmProviders
        const wasHardCeiling = baseline.resolutionChain.some((r) => r.isHardCeiling);
        if (wasHardCeiling) {
          isViolation = true;
          reason = 'Cannot enable external provider restricted by upstream hard ceiling';
        }
      }

      if (isViolation) {
        violations.push({ field: key, message: reason! });
        diff.push({
          field: key,
          baselineValue: baseVal,
          simulatedValue: val,
          status: 'CEILING_BLOCKED',
          reason,
        });
      } else if (baseVal === undefined) {
        simulatedEffectiveConfig[key] = val;
        diff.push({
          field: key,
          baselineValue: undefined,
          simulatedValue: val,
          status: 'ADDED',
        });
      } else if (JSON.stringify(baseVal) !== JSON.stringify(val)) {
        simulatedEffectiveConfig[key] = val;
        diff.push({
          field: key,
          baselineValue: baseVal,
          simulatedValue: val,
          status: 'MODIFIED',
        });
      } else {
        diff.push({
          field: key,
          baselineValue: baseVal,
          simulatedValue: val,
          status: 'UNCHANGED',
        });
      }
    }

    return {
      category: dto.category,
      scopeContext: {
        brandId: dto.brandId,
        regionCode: dto.regionCode,
        outletId: dto.outletId,
      },
      baselineConfig,
      simulatedEffectiveConfig,
      diff,
      violations,
      isSafeToApply: violations.length === 0,
    };
  }
}
