import { Injectable } from '@nestjs/common';
import { OutletBiSummaryDto } from '@fitcore/types';

@Injectable()
export class AggregationService {
  /**
   * Rolls up outlet performance into organisation-level summary while preserving currency isolation.
   */
  aggregateOutletSummaries(outlets: OutletBiSummaryDto[]): {
    totalActiveMembers: number;
    totalNewMembers: number;
    totalVisits: number;
    totalLeads: number;
    totalConversions: number;
    averageConversionRate: number | null;
    averageClassFillRate: number | null;
    revenueByCurrency: Record<string, number>;
  } {
    let totalActiveMembers = 0;
    let totalNewMembers = 0;
    let totalVisits = 0;
    let totalLeads = 0;
    let totalConversions = 0;
    const revenueByCurrency: Record<string, number> = {};

    let totalFillWeighted = 0;
    let totalFillCount = 0;

    for (const out of outlets) {
      totalActiveMembers += out.activeMembers;
      totalNewMembers += out.newMembers;
      totalVisits += out.totalVisits;
      totalLeads += out.leadsCount;
      totalConversions += out.conversionsCount;

      const curr = out.currency || 'AUD';
      revenueByCurrency[curr] = (revenueByCurrency[curr] || 0) + out.netRevenue;

      if (out.averageClassFillRate !== null) {
        totalFillWeighted += out.averageClassFillRate;
        totalFillCount++;
      }
    }

    const averageConversionRate =
      totalLeads > 0 ? Math.round((totalConversions / totalLeads) * 1000) / 10 : null;

    const averageClassFillRate =
      totalFillCount > 0 ? Math.round((totalFillWeighted / totalFillCount) * 10) / 10 : null;

    return {
      totalActiveMembers,
      totalNewMembers,
      totalVisits,
      totalLeads,
      totalConversions,
      averageConversionRate,
      averageClassFillRate,
      revenueByCurrency,
    };
  }
}
