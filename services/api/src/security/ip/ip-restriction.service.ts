import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IpTargetSurface } from '@fitcore/types';

export interface IpEvaluationContext {
  organisationId: string;
  clientIp: string;
  targetSurface: IpTargetSurface;
  scopeType?: 'ORGANISATION' | 'BRAND' | 'OUTLET';
  scopeId?: string | null;
}

export interface IpEvaluationResult {
  allowed: boolean;
  matchedPolicyId?: string;
  reason: string;
}

/**
 * IpRestrictionService
 *
 * Implements CIDR parsing, IP matching, hierarchical policy evaluation,
 * and fail-closed security for administrative surfaces.
 */
@Injectable()
export class IpRestrictionService {
  private readonly logger = new Logger(IpRestrictionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates if a string is a valid IPv4, IPv6, or CIDR notation.
   */
  isValidIpOrCidr(ipOrCidr: string): boolean {
    if (!ipOrCidr) return false;
    const clean = ipOrCidr.trim();

    // Check CIDR format (e.g. 192.168.1.0/24 or 10.0.0.1/32)
    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length !== 2) return false;
      const [ip, prefixStr] = parts;
      const prefix = parseInt(prefixStr, 10);
      if (isNaN(prefix)) return false;

      if (this.isIpv4(ip)) {
        return prefix >= 0 && prefix <= 32;
      }
      if (this.isIpv6(ip)) {
        return prefix >= 0 && prefix <= 128;
      }
      return false;
    }

    return this.isIpv4(clean) || this.isIpv6(clean);
  }

  /**
   * Checks if an IP matches a target rule (exact match or within CIDR).
   */
  matchesRule(clientIp: string, ruleCidrOrIp: string): boolean {
    const ip = clientIp.trim();
    const rule = ruleCidrOrIp.trim();

    if (ip === rule) return true;

    // Handle CIDR matching for IPv4
    if (rule.includes('/') && this.isIpv4(ip)) {
      try {
        const [network, prefixStr] = rule.split('/');
        if (!this.isIpv4(network)) return false;
        const prefix = parseInt(prefixStr, 10);
        if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

        const ipNum = this.ipv4ToNumber(ip);
        const netNum = this.ipv4ToNumber(network);
        const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;

        return (ipNum & mask) === (netNum & mask);
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Evaluates client IP against active policies following hierarchical precedence:
   * 1. Hard ceilings: Parent Organisation DENY rules cannot be overridden by Outlet.
   * 2. Scoped policies (Organisation -> Brand -> Outlet).
   * 3. Fail-safe: For administrative surfaces, if state is unknown/fails, FAIL CLOSED (DENY).
   */
  async evaluateAccess(context: IpEvaluationContext): Promise<IpEvaluationResult> {
    try {
      // 1. Fetch all active IP policies for this organisation that cover the target surface
      const policies = await this.prisma.securityIpPolicy.findMany({
        where: {
          organisationId: context.organisationId,
          status: 'ACTIVE',
        },
        include: {
          rules: true,
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      });

      // Filter policies targeting this surface
      const applicablePolicies = policies.filter(
        (p) => p.targetSurfaces.length === 0 || p.targetSurfaces.includes(context.targetSurface),
      );

      if (applicablePolicies.length === 0) {
        // No restrictions configured on this surface -> ALLOW
        return { allowed: true, reason: 'NO_RESTRICTIONS' };
      }

      // 2. Check Parent Hard Ceilings (ORGANISATION level DENYLIST)
      const orgDenyPolicies = applicablePolicies.filter(
        (p) => p.scopeType === 'ORGANISATION' && p.type === 'DENYLIST' && p.isHardCeiling,
      );

      for (const policy of orgDenyPolicies) {
        for (const rule of policy.rules) {
          if (this.matchesRule(context.clientIp, rule.ipOrCidr)) {
            return {
              allowed: false,
              matchedPolicyId: policy.id,
              reason: `BLOCKED_BY_ORGANISATION_HARD_CEILING_DENYLIST (${rule.ipOrCidr})`,
            };
          }
        }
      }

      // 3. Evaluate Hierarchy: Outlets cannot relax Parent ALLOWLIST
      // If parent specifies an ALLOWLIST, client must be in parent ALLOWLIST
      const orgAllowPolicies = applicablePolicies.filter(
        (p) => p.scopeType === 'ORGANISATION' && p.type === 'ALLOWLIST',
      );

      if (orgAllowPolicies.length > 0) {
        let matchedParentAllow = false;
        for (const policy of orgAllowPolicies) {
          for (const rule of policy.rules) {
            if (this.matchesRule(context.clientIp, rule.ipOrCidr)) {
              matchedParentAllow = true;
              break;
            }
          }
          if (matchedParentAllow) break;
        }

        if (!matchedParentAllow) {
          return {
            allowed: false,
            reason: 'NOT_IN_ORGANISATION_ALLOWLIST',
          };
        }
      }

      // 4. Evaluate Outlet/Scoped DENYLIST
      const scopedDenyPolicies = applicablePolicies.filter(
        (p) => p.type === 'DENYLIST' && (!context.scopeId || p.scopeId === context.scopeId),
      );

      for (const policy of scopedDenyPolicies) {
        for (const rule of policy.rules) {
          if (this.matchesRule(context.clientIp, rule.ipOrCidr)) {
            return {
              allowed: false,
              matchedPolicyId: policy.id,
              reason: `BLOCKED_BY_DENYLIST (${rule.ipOrCidr})`,
            };
          }
        }
      }

      return { allowed: true, reason: 'IP_VERIFIED' };
    } catch (err: any) {
      this.logger.error(`IP Policy Evaluation error: ${err.message}`);

      // FAIL-CLOSED invariant for sensitive administrative surfaces
      const adminSurfaces: IpTargetSurface[] = [
        'ADMIN_LOGIN',
        'ADMIN_PORTAL',
        'FINANCE',
        'ENTERPRISE_SETTINGS',
      ];

      if (adminSurfaces.includes(context.targetSurface)) {
        return {
          allowed: false,
          reason: 'FAIL_CLOSED_ADMIN_SURFACE_ERROR',
        };
      }

      return { allowed: true, reason: 'FAIL_SAFE_AVAILABILITY_POLICY' };
    }
  }

  // --- Helpers ---

  private isIpv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every((p) => {
      const n = parseInt(p, 10);
      return !isNaN(n) && n >= 0 && n <= 255 && p === n.toString();
    });
  }

  private isIpv6(ip: string): boolean {
    return ip.includes(':') && /^[0-9a-fA-F:]+$/.test(ip);
  }

  private ipv4ToNumber(ip: string): number {
    return ip
      .split('.')
      .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
  }
}
