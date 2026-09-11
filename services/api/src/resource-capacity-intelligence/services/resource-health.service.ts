import { Injectable } from '@nestjs/common';
import {
  ResourceHealthReportDto,
  ResourceHealthDimensionReport,
  ResourceHealthDimensionKey,
  ResourceHealthStatus,
  ResourceIntelligenceType,
} from '@fitcore/types';

@Injectable()
export class ResourceHealthService {
  /**
   * Evaluates 6-dimension health for a physical resource or studio.
   */
  evaluateResourceHealth(params: {
    resourceId: string;
    resourceName: string;
    resourceType: ResourceIntelligenceType;
    outletId: string;
    outletName?: string;
    utilisationRate: number | null;
    configuredCapacity: number;
    sessionsCount: number;
    waitlistCount: number;
    conflictsCount?: number;
    isMaintenance?: boolean;
  }): ResourceHealthReportDto {
    const {
      resourceId,
      resourceName,
      resourceType,
      outletId,
      outletName,
      utilisationRate,
      configuredCapacity,
      sessionsCount,
      waitlistCount,
      conflictsCount = 0,
      isMaintenance = false,
    } = params;

    const dimensions: Record<ResourceHealthDimensionKey, ResourceHealthDimensionReport> = {} as any;
    const attentionFlags: string[] = [];
    const opportunities: string[] = [];

    // 1. UTILISATION DIMENSION
    let utilStatus: ResourceHealthStatus = 'GOOD';
    let utilScore = 85;
    let utilReason = `Current utilization is ${utilisationRate ?? 'N/A'}% across ${sessionsCount} sessions.`;

    if (utilisationRate === null) {
      utilStatus = 'INSUFFICIENT_DATA';
      utilScore = 50;
      utilReason = 'No session utilization data recorded in the observation period.';
    } else if (utilisationRate >= 90) {
      utilStatus = 'WATCH';
      utilScore = 65;
      attentionFlags.push('HIGH_UTILISATION_CAPACITY_LIMIT');
      utilReason = `Utilization (${utilisationRate}%) indicates peak saturation and potential scheduling strain.`;
    } else if (utilisationRate < 25 && sessionsCount >= 5) {
      utilStatus = 'WATCH';
      utilScore = 60;
      attentionFlags.push('LOW_RESOURCE_UTILISATION');
      utilReason = `Utilization (${utilisationRate}%) indicates significant idle space during operating hours.`;
    }

    dimensions['UTILISATION'] = {
      dimension: 'UTILISATION',
      status: utilStatus,
      score: utilScore,
      reason: utilReason,
      attentionFlags: utilisationRate !== null && (utilisationRate >= 90 || utilisationRate < 25) ? ['UTILISATION_WATCH'] : [],
    };

    // 2. CAPACITY DIMENSION
    let capStatus: ResourceHealthStatus = 'GOOD';
    let capScore = 90;
    let capReason = `Configured capacity is ${configuredCapacity} occupants.`;

    if (configuredCapacity <= 0) {
      capStatus = 'ATTENTION_REQUIRED';
      capScore = 30;
      attentionFlags.push('CONFIGURED_CAPACITY_INVALID');
      capReason = 'Configured capacity is zero or undefined.';
    }

    dimensions['CAPACITY'] = {
      dimension: 'CAPACITY',
      status: capStatus,
      score: capScore,
      reason: capReason,
      attentionFlags: configuredCapacity <= 0 ? ['CONFIGURED_CAPACITY_INVALID'] : [],
    };

    // 3. DEMAND DIMENSION
    let demStatus: ResourceHealthStatus = 'GOOD';
    let demScore = 85;
    let demReason = `${sessionsCount} scheduled sessions with ${waitlistCount} waitlist occurrences.`;

    if (waitlistCount >= 10) {
      demStatus = 'WATCH';
      demScore = 70;
      attentionFlags.push('WAITLIST_PRESSURE_ELEVATED');
      opportunities.push('Unmet member demand signals opportunity for additional timetable slots.');
    } else if (sessionsCount === 0) {
      demStatus = 'WATCH';
      demScore = 55;
      attentionFlags.push('ZERO_SCHEDULED_SESSIONS');
    }

    dimensions['DEMAND'] = {
      dimension: 'DEMAND',
      status: demStatus,
      score: demScore,
      reason: demReason,
      attentionFlags: waitlistCount >= 10 ? ['WAITLIST_PRESSURE_ELEVATED'] : [],
    };

    // 4. AVAILABILITY DIMENSION
    let avStatus: ResourceHealthStatus = 'GOOD';
    let avScore = 95;
    let avReason = 'Resource is ACTIVE and available for operational scheduling.';

    if (isMaintenance) {
      avStatus = 'WATCH';
      avScore = 50;
      attentionFlags.push('RESOURCE_IN_MAINTENANCE');
      avReason = 'Resource is currently flagged under scheduled maintenance.';
    }

    dimensions['AVAILABILITY'] = {
      dimension: 'AVAILABILITY',
      status: avStatus,
      score: avScore,
      reason: avReason,
      attentionFlags: isMaintenance ? ['RESOURCE_IN_MAINTENANCE'] : [],
    };

    // 5. CONFLICTS DIMENSION
    let confStatus: ResourceHealthStatus = 'GOOD';
    let confScore = 100;
    let confReason = 'No scheduling overlaps or double-booking conflicts detected.';

    if (conflictsCount > 0) {
      confStatus = 'ATTENTION_REQUIRED';
      confScore = 40;
      attentionFlags.push('RESOURCE_CONFLICT_DETECTED');
      confReason = `${conflictsCount} concurrent booking or schedule overlaps detected.`;
    }

    dimensions['CONFLICTS'] = {
      dimension: 'CONFLICTS',
      status: confStatus,
      score: confScore,
      reason: confReason,
      attentionFlags: conflictsCount > 0 ? ['RESOURCE_CONFLICT_DETECTED'] : [],
    };

    // 6. DATA QUALITY DIMENSION
    let dqStatus: ResourceHealthStatus = 'GOOD';
    let dqScore = 90;
    let dqReason = 'Resource telemetry, capacity, and scheduling metadata are complete.';

    if (sessionsCount < 3) {
      dqStatus = 'INSUFFICIENT_DATA';
      dqScore = 60;
      dqReason = 'Fewer than 3 sessions recorded in the evaluation window.';
    }

    dimensions['DATA_QUALITY'] = {
      dimension: 'DATA_QUALITY',
      status: dqStatus,
      score: dqScore,
      reason: dqReason,
      attentionFlags: sessionsCount < 3 ? ['SAMPLE_SIZE_LIMITED'] : [],
    };

    // Calculate Overall Score
    const scores = Object.values(dimensions).map((d) => d.score);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    let overallStatus: ResourceHealthStatus = 'GOOD';
    if (attentionFlags.length >= 3 || overallScore < 60) {
      overallStatus = 'ATTENTION_REQUIRED';
    } else if (attentionFlags.length >= 1 || overallScore < 75) {
      overallStatus = 'WATCH';
    } else if (dqStatus === 'INSUFFICIENT_DATA') {
      overallStatus = 'INSUFFICIENT_DATA';
    }

    return {
      resourceId,
      resourceName,
      resourceType,
      outletId,
      outletName,
      overallStatus,
      overallScore,
      dimensions,
      opportunities,
      attentionFlags,
      generatedAt: new Date().toISOString(),
    };
  }
}
