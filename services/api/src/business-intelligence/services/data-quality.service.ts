import { Injectable } from '@nestjs/common';
import {
  BusinessMetricDomain,
  BusinessDataFreshness,
  BusinessDataQualityRating,
  BusinessDomainFreshness,
  BusinessDataQualityAssessment,
} from '@fitcore/types';

@Injectable()
export class DataQualityService {
  /**
   * Evaluates freshness across domains based on typical ingestion cadences.
   */
  getDomainFreshness(): Record<string, BusinessDomainFreshness> {
    const nowIso = new Date().toISOString();

    return {
      MEMBERSHIP: {
        domain: 'MEMBERSHIP',
        freshness: 'REAL_TIME',
        lastUpdated: nowIso,
        updateFrequency: 'Instantaneous on membership lifecycle event',
        latencyMs: 120,
      },
      FINANCE: {
        domain: 'FINANCE',
        freshness: 'REAL_TIME',
        lastUpdated: nowIso,
        updateFrequency: 'Instantaneous cash-basis ledger updates',
        latencyMs: 150,
      },
      SALES: {
        domain: 'SALES',
        freshness: 'REAL_TIME',
        lastUpdated: nowIso,
        updateFrequency: 'Real-time pipeline & lead activity sync',
        latencyMs: 180,
      },
      ATTENDANCE: {
        domain: 'ATTENDANCE',
        freshness: 'REAL_TIME',
        lastUpdated: nowIso,
        updateFrequency: 'Real-time turnstile and check-in event feed',
        latencyMs: 210,
      },
      BOOKING: {
        domain: 'BOOKING',
        freshness: 'REAL_TIME',
        lastUpdated: nowIso,
        updateFrequency: 'Real-time booking and waitlist ledger',
        latencyMs: 140,
      },
      TRAINING: {
        domain: 'TRAINING',
        freshness: 'RECENT',
        lastUpdated: nowIso,
        updateFrequency: 'Syncs on member workout and PT log completion',
        latencyMs: 400,
      },
      NUTRITION: {
        domain: 'NUTRITION',
        freshness: 'RECENT',
        lastUpdated: nowIso,
        updateFrequency: 'Syncs on food logging submission',
        latencyMs: 600,
      },
      DAILY_CHECKIN: {
        domain: 'DAILY_CHECKIN',
        freshness: 'RECENT',
        lastUpdated: nowIso,
        updateFrequency: 'Syncs on morning check-in submission',
        latencyMs: 350,
      },
      WEARABLES: {
        domain: 'WEARABLES',
        freshness: 'DELAYED',
        lastUpdated: nowIso,
        updateFrequency: 'Asynchronous periodic wearable batch synchronization',
        latencyMs: 3500,
      },
      ENGAGEMENT: {
        domain: 'ENGAGEMENT',
        freshness: 'RECENT',
        lastUpdated: nowIso,
        updateFrequency: 'Hourly engagement scoring snapshot batch',
        latencyMs: 800,
      },
      RETENTION: {
        domain: 'RETENTION',
        freshness: 'RECENT',
        lastUpdated: nowIso,
        updateFrequency: 'Periodic retention model batch runs',
        latencyMs: 950,
      },
      COMMUNICATION: {
        domain: 'COMMUNICATION',
        freshness: 'REAL_TIME',
        lastUpdated: nowIso,
        updateFrequency: 'Real-time gateway webhook receipts',
        latencyMs: 250,
      },
      AI: {
        domain: 'AI',
        freshness: 'REAL_TIME',
        lastUpdated: nowIso,
        updateFrequency: 'Instantaneous token and request accounting',
        latencyMs: 90,
      },
    };
  }

  /**
   * Assesses quality, sample sizes, and builds warnings.
   */
  assessDataQuality(params: {
    domain: BusinessMetricDomain;
    sampleSize?: number;
    minimumThreshold?: number;
    hasAccountingConflicts?: boolean;
    unattributedRevenueAmount?: number;
    missingPriorPeriod?: boolean;
  }): BusinessDataQualityAssessment {
    const {
      domain,
      sampleSize = 0,
      minimumThreshold = 5,
      hasAccountingConflicts = false,
      unattributedRevenueAmount = 0,
      missingPriorPeriod = false,
    } = params;

    const warnings: string[] = [];
    let rating: BusinessDataQualityRating = 'HIGH';
    let minimumSampleMet = true;

    if (sampleSize < minimumThreshold && sampleSize > 0) {
      warnings.push(`Small sample size (${sampleSize} < ${minimumThreshold}). Percentages and ratios should be interpreted with caution.`);
      rating = 'MEDIUM';
      minimumSampleMet = false;
    } else if (sampleSize === 0) {
      warnings.push('No recorded activity found for this period.');
      rating = 'INSUFFICIENT_DATA';
      minimumSampleMet = false;
    }

    if (hasAccountingConflicts) {
      warnings.push('Unresolved accounting synchronisation conflicts exist. Some financial records are pending external sync.');
      if (rating === 'HIGH') rating = 'MEDIUM';
    }

    if (unattributedRevenueAmount > 0) {
      warnings.push(`Some cash receipts are not linked to a specific outlet.`);
      if (rating === 'HIGH') rating = 'MEDIUM';
    }

    if (missingPriorPeriod) {
      warnings.push('Previous comparison period data is incomplete or unavailable.');
      if (rating === 'HIGH') rating = 'MEDIUM';
    }

    return {
      domain,
      rating,
      warnings,
      sampleSize,
      minimumSampleMet,
    };
  }
}
