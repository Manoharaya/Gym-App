import { Injectable } from '@nestjs/common';
import { RawOutletMetrics } from './outlet-metric.service';
import { OutletNormalisationService } from './outlet-normalisation.service';
import {
  OutletCategoryLeaders,
  OutletMetricComparison,
  OutletNormalisationMode,
} from '@fitcore/types';

@Injectable()
export class OutletRankingService {
  constructor(private readonly normalisationService: OutletNormalisationService) {}

  /**
   * Evaluates categorical leadership without creating a single misleading "best outlet" composite.
   */
  evaluateLeaders(
    outlets: RawOutletMetrics[],
    currency?: string,
  ): OutletCategoryLeaders {
    if (outlets.length === 0) return {};

    const filtered = currency
      ? outlets.filter((o) => (o.currency || 'AUD').toUpperCase() === currency.toUpperCase())
      : outlets;

    if (filtered.length === 0) return {};

    // 1. Revenue Leader (Highest Net Revenue within currency)
    const sortedRevenue = [...filtered].sort((a, b) => b.netRevenue - a.netRevenue);
    const topRevenue = sortedRevenue[0];
    const revenueLeader = topRevenue
      ? this.buildComparison({
          metricKey: 'finance.net_revenue',
          metricLabel: 'Net Revenue',
          domain: 'FINANCE',
          outlet: topRevenue,
          absoluteValue: topRevenue.netRevenue,
          normalisedValue: topRevenue.activeMembers > 0 ? Math.round((topRevenue.netRevenue / topRevenue.activeMembers) * 100) / 100 : null,
          normalisedUnit: 'per active member',
          unit: 'CURRENCY',
          currency: topRevenue.currency,
          rank: 1,
          totalOutlets: filtered.length,
        })
      : undefined;

    // 2. Growth Leader (Highest Member Growth Rate vs. Own Baseline)
    const outletsWithGrowth = filtered.map((o) => {
      const growthRate = o.priorActiveMembers > 0
        ? Math.round((o.netMemberChange / o.priorActiveMembers) * 1000) / 10
        : null;
      return { outlet: o, growthRate };
    }).filter((item): item is { outlet: RawOutletMetrics; growthRate: number } => item.growthRate !== null);

    const sortedGrowth = outletsWithGrowth.sort((a, b) => b.growthRate - a.growthRate);
    const topGrowth = sortedGrowth[0];
    const growthLeader = topGrowth
      ? this.buildComparison({
          metricKey: 'membership.growth_rate',
          metricLabel: 'Member Growth Rate',
          domain: 'MEMBERSHIP',
          outlet: topGrowth.outlet,
          absoluteValue: topGrowth.outlet.netMemberChange,
          normalisedValue: topGrowth.growthRate,
          normalisedUnit: '% growth',
          unit: 'PERCENTAGE',
          rank: 1,
          totalOutlets: outletsWithGrowth.length,
          sampleSizeCaveat: topGrowth.outlet.priorActiveMembers < 10 ? 'Small baseline population' : undefined,
        })
      : undefined;

    // 3. Sales Leader (Highest Conversion Rate with valid sample size >= 5)
    const salesCandidates = filtered.map((o) => {
      const rate = o.newLeads > 0 ? Math.round((o.conversions / o.newLeads) * 1000) / 10 : null;
      return { outlet: o, rate, leads: o.newLeads };
    }).filter((s) => s.rate !== null);

    // Prefer candidates with adequate sample size >= 5
    const validSales = salesCandidates.filter((s) => s.leads >= 5);
    const targetSalesPool = validSales.length > 0 ? validSales : salesCandidates;
    const sortedSales = targetSalesPool.sort((a, b) => (b.rate || 0) - (a.rate || 0));
    const topSales = sortedSales[0];

    const salesLeader = topSales
      ? this.buildComparison({
          metricKey: 'sales.conversion_rate',
          metricLabel: 'Sales Conversion Rate',
          domain: 'SALES',
          outlet: topSales.outlet,
          absoluteValue: topSales.outlet.conversions,
          normalisedValue: topSales.rate || 0,
          normalisedUnit: '% conversion',
          denominator: topSales.leads,
          denominatorLabel: 'Total Leads',
          unit: 'PERCENTAGE',
          rank: 1,
          totalOutlets: targetSalesPool.length,
          sampleSizeCaveat: topSales.leads < 5 ? `Small lead sample (< 5 leads)` : undefined,
        })
      : undefined;

    // 4. Attendance Leader (Highest Visits Per Active Member)
    const attendanceCandidates = filtered.map((o) => {
      const freq = o.activeMembers > 0 ? Math.round((o.totalVisits / o.activeMembers) * 100) / 100 : 0;
      return { outlet: o, freq };
    }).sort((a, b) => b.freq - a.freq);

    const topAttendance = attendanceCandidates[0];
    const attendanceLeader = topAttendance
      ? this.buildComparison({
          metricKey: 'attendance.frequency',
          metricLabel: 'Visits Per Member',
          domain: 'ATTENDANCE',
          outlet: topAttendance.outlet,
          absoluteValue: topAttendance.outlet.totalVisits,
          normalisedValue: topAttendance.freq,
          normalisedUnit: 'visits/member',
          denominator: topAttendance.outlet.activeMembers,
          denominatorLabel: 'Active Members',
          unit: 'RATIO',
          rank: 1,
          totalOutlets: filtered.length,
        })
      : undefined;

    // 5. Class Utilisation Leader (Highest Fill Rate)
    const utilisationCandidates = filtered.map((o) => {
      const fillRate = o.totalCapacity > 0 ? Math.round((o.attendedBookings / o.totalCapacity) * 1000) / 10 : null;
      return { outlet: o, fillRate };
    }).filter((u): u is { outlet: RawOutletMetrics; fillRate: number } => u.fillRate !== null)
      .sort((a, b) => b.fillRate - a.fillRate);

    const topUtilisation = utilisationCandidates[0];
    const classUtilisationLeader = topUtilisation
      ? this.buildComparison({
          metricKey: 'bookings.fill_rate',
          metricLabel: 'Class Utilisation',
          domain: 'BOOKINGS',
          outlet: topUtilisation.outlet,
          absoluteValue: topUtilisation.outlet.attendedBookings,
          normalisedValue: topUtilisation.fillRate,
          normalisedUnit: '% capacity',
          denominator: topUtilisation.outlet.totalCapacity,
          denominatorLabel: 'Session Capacity',
          unit: 'PERCENTAGE',
          rank: 1,
          totalOutlets: utilisationCandidates.length,
        })
      : undefined;

    // 6. Engagement Leader (Highest Average Engagement Score)
    const sortedEngagement = [...filtered].sort((a, b) => b.averageEngagementScore - a.averageEngagementScore);
    const topEngagement = sortedEngagement[0];
    const engagementLeader = topEngagement
      ? this.buildComparison({
          metricKey: 'engagement.avg_score',
          metricLabel: 'Average Engagement Score',
          domain: 'ENGAGEMENT',
          outlet: topEngagement,
          absoluteValue: topEngagement.averageEngagementScore,
          unit: 'SCORE',
          rank: 1,
          totalOutlets: filtered.length,
        })
      : undefined;

    // 7. Retention Watch (Highest High-Risk Percentage)
    const retentionCandidates = filtered.map((o) => {
      const riskPct = o.activeMembers > 0
        ? Math.round((o.highRiskRetentionCount / o.activeMembers) * 1000) / 10
        : null;
      return { outlet: o, riskPct };
    }).filter((r): r is { outlet: RawOutletMetrics; riskPct: number } => r.riskPct !== null)
      .sort((a, b) => b.riskPct - a.riskPct);

    const topRisk = retentionCandidates[0];
    const retentionWatch = topRisk
      ? this.buildComparison({
          metricKey: 'retention.high_risk_rate',
          metricLabel: 'High Risk Member Proportion',
          domain: 'RETENTION',
          outlet: topRisk.outlet,
          absoluteValue: topRisk.outlet.highRiskRetentionCount,
          normalisedValue: topRisk.riskPct,
          normalisedUnit: '% high risk',
          denominator: topRisk.outlet.activeMembers,
          denominatorLabel: 'Active Members',
          unit: 'PERCENTAGE',
          rank: 1,
          totalOutlets: retentionCandidates.length,
        })
      : undefined;

    return {
      revenueLeader,
      growthLeader,
      salesLeader,
      attendanceLeader,
      classUtilisationLeader,
      engagementLeader,
      retentionWatch,
    };
  }

  /**
   * Generates a ranked list for a specific metric across outlets.
   */
  rankOutletsByMetric(params: {
    metricKey: string;
    metricLabel: string;
    domain: any;
    unit: string;
    currency?: string;
    mode: OutletNormalisationMode;
    outlets: RawOutletMetrics[];
    valueExtractor: (o: RawOutletMetrics) => { absolute: number; denominator?: number; baseline?: number };
  }): OutletMetricComparison[] {
    const { metricKey, metricLabel, domain, unit, currency, mode, outlets, valueExtractor } = params;

    const evaluated = outlets.map((o) => {
      const { absolute, denominator = 0, baseline } = valueExtractor(o);
      const norm = this.normalisationService.normalise({
        metricKey,
        absoluteValue: absolute,
        mode,
        denominator,
        previousValue: baseline,
        customUnit: unit,
      });

      const percentageChange =
        baseline !== undefined && baseline !== null && baseline > 0
          ? Math.round(((absolute - baseline) / baseline) * 10000) / 100
          : null;

      return {
        outlet: o,
        absoluteValue: absolute,
        normalisedValue: norm.normalisedValue !== null ? norm.normalisedValue : undefined,
        normalisedUnit: norm.normalisedUnit,
        denominator: norm.denominator,
        denominatorLabel: norm.denominatorLabel,
        previousValue: baseline,
        percentageChange,
        direction: norm.direction,
        dataQuality: norm.dataQuality,
        sampleSizeCaveat: norm.sampleSizeCaveat,
        comparisonValue: norm.normalisedValue !== null ? norm.normalisedValue : absolute,
      };
    });

    // Sort descending by primary comparison value
    evaluated.sort((a, b) => (b.comparisonValue || 0) - (a.comparisonValue || 0));

    return evaluated.map((item, idx) => ({
      metricKey,
      metricLabel,
      domain,
      outletId: item.outlet.outletId,
      outletName: item.outlet.outletName,
      outletCode: item.outlet.code,
      absoluteValue: item.absoluteValue,
      normalisedValue: item.normalisedValue,
      normalisedUnit: item.normalisedUnit,
      denominator: item.denominator,
      denominatorLabel: item.denominatorLabel,
      previousValue: item.previousValue,
      percentageChange: item.percentageChange,
      unit,
      currency: item.outlet.currency || currency,
      rank: idx + 1,
      totalComparableOutlets: evaluated.length,
      percentile: Math.round(((evaluated.length - idx) / evaluated.length) * 100),
      direction: item.direction,
      dataQuality: item.dataQuality,
      sampleSizeCaveat: item.sampleSizeCaveat,
    }));
  }

  private buildComparison(params: {
    metricKey: string;
    metricLabel: string;
    domain: any;
    outlet: RawOutletMetrics;
    absoluteValue: number;
    normalisedValue?: number | null;
    normalisedUnit?: string;
    denominator?: number;
    denominatorLabel?: string;
    unit: string;
    currency?: string;
    rank: number;
    totalOutlets: number;
    sampleSizeCaveat?: string;
  }): OutletMetricComparison {
    return {
      metricKey: params.metricKey,
      metricLabel: params.metricLabel,
      domain: params.domain,
      outletId: params.outlet.outletId,
      outletName: params.outlet.outletName,
      outletCode: params.outlet.code,
      absoluteValue: params.absoluteValue,
      normalisedValue: params.normalisedValue !== null ? params.normalisedValue : undefined,
      normalisedUnit: params.normalisedUnit,
      denominator: params.denominator,
      denominatorLabel: params.denominatorLabel,
      unit: params.unit,
      currency: params.currency || params.outlet.currency,
      rank: params.rank,
      totalComparableOutlets: params.totalOutlets,
      percentile: 100,
      direction: 'UP',
      dataQuality: params.sampleSizeCaveat ? 'MEDIUM' : 'HIGH',
      sampleSizeCaveat: params.sampleSizeCaveat,
    };
  }
}
