import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ENTERPRISE_POLICY_CATEGORIES } from '../domain/enterprise-constants';

@Injectable()
export class EnterpriseGovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getGovernanceOverview(organisationId: string) {
    const [
      brandsCount,
      outletsCount,
      policies,
      domains,
      roleAssignmentsCount,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.organisationBrand.count({
        where: { organisationId, deletedAt: null },
      }),
      this.prisma.outlet.count({
        where: { organisationId, deletedAt: null },
      }),
      this.prisma.enterprisePolicy.findMany({
        where: { organisationId, status: 'ACTIVE' },
        select: {
          id: true,
          category: true,
          isHardCeiling: true,
          scopeType: true,
        },
      }),
      this.prisma.customDomain.findMany({
        where: { organisationId },
        select: {
          id: true,
          domain: true,
          status: true,
          sslStatus: true,
        },
      }),
      this.prisma.enterpriseRoleAssignment.count({
        where: { organisationId, status: 'ACTIVE' },
      }),
      this.prisma.auditLog.findMany({
        where: { organisationId, resource: { startsWith: 'Enterprise' } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Compute policy category coverage
    const coveredCategories = new Set(policies.map((p) => p.category));
    const totalCategories = ENTERPRISE_POLICY_CATEGORIES.length;
    const policyCoveragePercent = Math.round(
      (coveredCategories.size / totalCategories) * 100,
    );

    const hardCeilingsCount = policies.filter((p) => p.isHardCeiling).length;
    const activeDomainsCount = domains.filter((d) => d.status === 'ACTIVE').length;
    const verifiedSslCount = domains.filter((d) => d.sslStatus === 'ISSUED').length;

    // Overall compliance health score (0 - 100)
    const baseScore = 50;
    const policyScoreBonus = Math.min(30, coveredCategories.size * 2);
    const hardCeilingBonus = hardCeilingsCount > 0 ? 10 : 0;
    const sslBonus = domains.length === 0 || verifiedSslCount === domains.length ? 10 : 0;
    const complianceHealthScore = Math.min(100, baseScore + policyScoreBonus + hardCeilingBonus + sslBonus);

    return {
      organisationId,
      complianceHealthScore,
      policyCoveragePercent,
      totalPolicyCategories: totalCategories,
      coveredPolicyCategoriesCount: coveredCategories.size,
      totalActivePolicies: policies.length,
      hardCeilingsCount,
      brandsCount,
      outletsCount,
      totalRoleAssignments: roleAssignmentsCount,
      domains: {
        total: domains.length,
        active: activeDomainsCount,
        sslIssued: verifiedSslCount,
      },
      recentAuditLogs,
    };
  }
}
