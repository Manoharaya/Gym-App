import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataQualityStatus } from '@fitcore/types';

export interface DataQualityCheckResult {
  checkName: string;
  category: 'ORGANISATIONS' | 'USAGE' | 'AI' | 'INTEGRATIONS' | 'SUPPORT' | 'FEATURE_FLAGS';
  status: DataQualityStatus;
  anomaliesCount: number;
  details: string;
  recommendedAction?: string;
}

@Injectable()
export class PlatformDataQualityService {
  private readonly logger = new Logger(PlatformDataQualityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scans platform data sets for integrity violations, stale telemetry, or orphan records.
   */
  async runPlatformDataQualityScan(): Promise<{
    overallStatus: DataQualityStatus;
    totalChecks: number;
    anomaliesFound: number;
    scannedAt: string;
    results: DataQualityCheckResult[];
  }> {
    const results: DataQualityCheckResult[] = [];

    // 1. Organisations missing valid status
    const orgsMissingStatus = await this.prisma.organisation.count({
      where: {
        OR: [{ status: '' }, { status: { notIn: ['ACTIVE', 'TRIAL', 'SUSPENDED', 'PENDING', 'CANCELLED', 'ARCHIVED', 'PAST_DUE'] } }],
      },
    });

    results.push({
      checkName: 'ORGANISATION_STATUS_INTEGRITY',
      category: 'ORGANISATIONS',
      status: orgsMissingStatus > 0 ? 'ACTION_REQUIRED' : 'HEALTHY',
      anomaliesCount: orgsMissingStatus,
      details:
        orgsMissingStatus > 0
          ? `${orgsMissingStatus} organisation(s) have invalid or empty lifecycle statuses.`
          : 'All organisations have valid lifecycle statuses.',
      recommendedAction: orgsMissingStatus > 0 ? 'Normalize organisation status lifecycle values.' : undefined,
    });

    // 2. Outlets without valid organisation
    const orphanOutlets = await this.prisma.outlet.count({
      where: { organisationId: '' },
    });

    results.push({
      checkName: 'ORPHAN_OUTLETS_INTEGRITY',
      category: 'ORGANISATIONS',
      status: orphanOutlets > 0 ? 'CRITICAL' : 'HEALTHY',
      anomaliesCount: orphanOutlets,
      details:
        orphanOutlets > 0
          ? `${orphanOutlets} outlet(s) lack a valid parent organisation reference.`
          : 'All outlets are properly linked to valid organisations.',
      recommendedAction: orphanOutlets > 0 ? 'Reassign or archive orphaned outlet records.' : undefined,
    });

    // 3. Stale Integration health
    const staleIntegrations = await this.prisma.integrationConnection.count({
      where: {
        status: 'ERROR',
        consecutiveFailures: { gte: 5 },
      },
    });

    results.push({
      checkName: 'PERSISTENT_INTEGRATION_FAILURES',
      category: 'INTEGRATIONS',
      status: staleIntegrations > 0 ? 'WARNING' : 'HEALTHY',
      anomaliesCount: staleIntegrations,
      details:
        staleIntegrations > 0
          ? `${staleIntegrations} integration connection(s) have experienced >= 5 repeated errors.`
          : 'No persistent integration connection error spikes detected.',
      recommendedAction: staleIntegrations > 0 ? 'Review third-party provider credentials and error logs.' : undefined,
    });

    // 4. Broken or orphaned Feature Flag assignments
    const brokenAssignments = await this.prisma.featureFlagAssignment.count({
      where: { flagId: '' },
    });

    results.push({
      checkName: 'FEATURE_FLAG_ASSIGNMENT_INTEGRITY',
      category: 'FEATURE_FLAGS',
      status: brokenAssignments > 0 ? 'ACTION_REQUIRED' : 'HEALTHY',
      anomaliesCount: brokenAssignments,
      details:
        brokenAssignments > 0
          ? `${brokenAssignments} flag assignment(s) point to non-existent feature flags.`
          : 'All feature flag assignments map to valid feature flags.',
      recommendedAction: brokenAssignments > 0 ? 'Purge dangling feature flag assignments.' : undefined,
    });

    // 5. Overdue critical Support Tickets
    const overdueCriticalTickets = await this.prisma.supportTicket.count({
      where: {
        status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
        priority: 'CRITICAL',
        resolutionTarget: { lte: new Date() },
      },
    });

    results.push({
      checkName: 'OVERDUE_CRITICAL_SUPPORT_SLA',
      category: 'SUPPORT',
      status: overdueCriticalTickets > 0 ? 'WARNING' : 'HEALTHY',
      anomaliesCount: overdueCriticalTickets,
      details:
        overdueCriticalTickets > 0
          ? `${overdueCriticalTickets} critical support ticket(s) have breached SLA resolution targets.`
          : 'All open critical tickets are within resolution SLA targets.',
      recommendedAction: overdueCriticalTickets > 0 ? 'Assign platform engineering lead to overdue tickets.' : undefined,
    });

    // Calculate total anomalies and overall status
    const totalAnomalies = results.reduce((acc, r) => acc + r.anomaliesCount, 0);
    let overallStatus: DataQualityStatus = 'HEALTHY';
    if (results.some((r) => r.status === 'CRITICAL')) {
      overallStatus = 'CRITICAL';
    } else if (results.some((r) => r.status === 'ACTION_REQUIRED')) {
      overallStatus = 'ACTION_REQUIRED';
    } else if (results.some((r) => r.status === 'WARNING')) {
      overallStatus = 'WARNING';
    }

    return {
      overallStatus,
      totalChecks: results.length,
      anomaliesFound: totalAnomalies,
      scannedAt: new Date().toISOString(),
      results,
    };
  }
}
