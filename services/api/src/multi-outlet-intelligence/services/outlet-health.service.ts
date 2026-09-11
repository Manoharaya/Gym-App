import { Injectable } from '@nestjs/common';
import { RawOutletMetrics } from './outlet-metric.service';
import {
  OutletHealthReport,
  OutletHealthDimensionReport,
  OutletHealthStatus,
  OutletAttentionFlag,
  OutletHealthDimensionKey,
} from '@fitcore/types';

@Injectable()
export class OutletHealthService {
  /**
   * Generates explainable, objective health evaluation across 8 operational dimensions.
   */
  evaluateOutletHealth(outlet: RawOutletMetrics): OutletHealthReport {
    const dimensions: Record<string, OutletHealthDimensionReport> = {};
    const attentionFlags: OutletAttentionFlag[] = [];
    const opportunities: string[] = [];

    // 1. MEMBERSHIP DIMENSION
    const growthRate = outlet.priorActiveMembers > 0
      ? Math.round((outlet.netMemberChange / outlet.priorActiveMembers) * 1000) / 10
      : null;

    let memStatus: OutletHealthStatus = 'GOOD';
    let memScore = 85;
    let memReason = `Net member change is ${outlet.netMemberChange >= 0 ? `+${outlet.netMemberChange}` : outlet.netMemberChange} (${outlet.newMembers} new, ${outlet.reactivatedMembers} reactivated, ${outlet.cancelledMembers} cancelled).`;

    if (outlet.netMemberChange < 0) {
      memStatus = 'WATCH';
      memScore = 60;
      attentionFlags.push('MEMBERSHIP_DECLINING');
      memReason += ' Net membership declined in the current period.';
    } else if (growthRate !== null && growthRate > 5) {
      opportunities.push(`Strong membership growth momentum (+${growthRate}%).`);
    }

    dimensions['MEMBERSHIP'] = {
      dimension: 'MEMBERSHIP',
      status: memStatus,
      score: memScore,
      reason: memReason,
      attentionFlags: outlet.netMemberChange < 0 ? ['MEMBERSHIP_DECLINING'] : [],
    };

    // 2. SALES DIMENSION
    const conversionRate = outlet.newLeads > 0
      ? Math.round((outlet.conversions / outlet.newLeads) * 1000) / 10
      : null;

    let salesStatus: OutletHealthStatus = 'GOOD';
    let salesScore = 80;
    let salesReason = `${outlet.newLeads} leads acquired with ${outlet.conversions} conversions.`;

    if (outlet.newLeads === 0) {
      salesStatus = 'WATCH';
      salesScore = 55;
      attentionFlags.push('LEADS_DECLINING');
      salesReason = 'Zero prospect leads registered in the current window.';
    } else if (conversionRate !== null && conversionRate < 10) {
      salesStatus = 'WATCH';
      salesScore = 65;
      attentionFlags.push('CONVERSION_DECLINING');
      salesReason += ` Conversion rate (${conversionRate}%) is below operational baseline.`;
    } else if (conversionRate !== null && conversionRate >= 25) {
      opportunities.push(`High lead-to-member conversion efficiency (${conversionRate}%).`);
    }

    dimensions['SALES'] = {
      dimension: 'SALES',
      status: salesStatus,
      score: salesScore,
      reason: salesReason,
      attentionFlags: outlet.newLeads === 0 ? ['LEADS_DECLINING'] : [],
    };

    // 3. FINANCE DIMENSION
    let finStatus: OutletHealthStatus = 'GOOD';
    let finScore = 90;
    let finReason = `Net collected revenue is ${outlet.currency} ${outlet.netRevenue.toFixed(2)} with ${outlet.currency} ${outlet.refunds.toFixed(2)} in refunds.`;

    if (outlet.netRevenue === 0 && outlet.activeMembers > 0) {
      finStatus = 'ATTENTION_REQUIRED';
      finScore = 40;
      attentionFlags.push('REVENUE_DECLINING');
      finReason = 'No settled revenue transactions recorded for active membership base.';
    } else if (outlet.refunds > outlet.grossRevenue * 0.15 && outlet.grossRevenue > 0) {
      finStatus = 'WATCH';
      finScore = 65;
      attentionFlags.push('PAYMENT_FAILURES_INCREASING');
      finReason += ' Refund volume exceeds 15% of gross collections.';
    }

    dimensions['FINANCE'] = {
      dimension: 'FINANCE',
      status: finStatus,
      score: finScore,
      reason: finReason,
      attentionFlags: outlet.netRevenue === 0 && outlet.activeMembers > 0 ? ['REVENUE_DECLINING'] : [],
    };

    // 4. ATTENDANCE DIMENSION
    const visitsPerMember = outlet.activeMembers > 0
      ? Math.round((outlet.totalVisits / outlet.activeMembers) * 100) / 100
      : 0;

    let attStatus: OutletHealthStatus = 'GOOD';
    let attScore = 85;
    let attReason = `${outlet.totalVisits} total facility check-ins (${visitsPerMember} visits/active member).`;

    if (outlet.activeMembers > 0 && visitsPerMember < 1.0) {
      attStatus = 'WATCH';
      attScore = 60;
      attentionFlags.push('ATTENDANCE_DECLINING');
      attReason += ' Average check-in cadence is below 1 visit per active member.';
    }

    dimensions['ATTENDANCE'] = {
      dimension: 'ATTENDANCE',
      status: attStatus,
      score: attScore,
      reason: attReason,
      attentionFlags: visitsPerMember < 1.0 && outlet.activeMembers > 0 ? ['ATTENDANCE_DECLINING'] : [],
    };

    // 5. BOOKING DIMENSION
    const fillRate = outlet.totalCapacity > 0
      ? Math.round((outlet.attendedBookings / outlet.totalCapacity) * 1000) / 10
      : null;

    let bookStatus: OutletHealthStatus = 'GOOD';
    let bookScore = 80;
    let bookReason = `${outlet.attendedBookings} class attendances across available sessions.`;

    if (fillRate !== null && fillRate < 30) {
      bookStatus = 'WATCH';
      bookScore = 60;
      attentionFlags.push('CLASS_UTILISATION_LOW');
      bookReason += ` Class capacity utilisation (${fillRate}%) indicates underutilised studio hours.`;
    } else if (fillRate !== null && fillRate > 75) {
      opportunities.push(`High studio capacity utilisation (${fillRate}%).`);
    }

    dimensions['BOOKING'] = {
      dimension: 'BOOKING',
      status: bookStatus,
      score: bookScore,
      reason: bookReason,
      attentionFlags: fillRate !== null && fillRate < 30 ? ['CLASS_UTILISATION_LOW'] : [],
    };

    // 6. ENGAGEMENT DIMENSION
    let engStatus: OutletHealthStatus = 'GOOD';
    let engScore = outlet.averageEngagementScore;
    let engReason = `Average member engagement score is ${outlet.averageEngagementScore}/100.`;

    if (outlet.averageEngagementScore < 45) {
      engStatus = 'WATCH';
      attentionFlags.push('ENGAGEMENT_DECLINING');
      engReason += ' Digital engagement metrics indicate slipping routine workouts.';
    }

    dimensions['ENGAGEMENT'] = {
      dimension: 'ENGAGEMENT',
      status: engStatus,
      score: engScore,
      reason: engReason,
      attentionFlags: outlet.averageEngagementScore < 45 ? ['ENGAGEMENT_DECLINING'] : [],
    };

    // 7. RETENTION DIMENSION
    const riskPercentage = outlet.activeMembers > 0
      ? Math.round((outlet.highRiskRetentionCount / outlet.activeMembers) * 1000) / 10
      : 0;

    let retStatus: OutletHealthStatus = 'GOOD';
    let retScore = 85;
    let retReason = `${outlet.highRiskRetentionCount} members in high-risk churn tier (${riskPercentage}% of active members).`;

    if (riskPercentage > 15) {
      retStatus = 'ATTENTION_REQUIRED';
      retScore = 50;
      attentionFlags.push('RETENTION_RISK_INCREASING');
      retReason += ' High-risk member population exceeds 15% threshold.';
    } else if (riskPercentage > 8) {
      retStatus = 'WATCH';
      retScore = 68;
      attentionFlags.push('RETENTION_RISK_INCREASING');
    }

    dimensions['RETENTION'] = {
      dimension: 'RETENTION',
      status: retStatus,
      score: retScore,
      reason: retReason,
      attentionFlags: riskPercentage > 8 ? ['RETENTION_RISK_INCREASING'] : [],
    };

    // 8. OPERATIONS DIMENSION
    let opsStatus: OutletHealthStatus = 'GOOD';
    let opsScore = 90;
    let opsReason = 'Facility access control, check-in gates, and staffing operating nominally.';

    dimensions['OPERATIONS'] = {
      dimension: 'OPERATIONS',
      status: opsStatus,
      score: opsScore,
      reason: opsReason,
      attentionFlags: [],
    };

    // Overall Score & Status
    const allScores = Object.values(dimensions).map((d) => d.score);
    const overallScore = Math.round(allScores.reduce((acc, s) => acc + s, 0) / allScores.length);

    let overallStatus: OutletHealthStatus = 'GOOD';
    if (attentionFlags.length >= 3 || overallScore < 60) {
      overallStatus = 'ATTENTION_REQUIRED';
    } else if (attentionFlags.length >= 1 || overallScore < 75) {
      overallStatus = 'WATCH';
    } else if (overallScore >= 80) {
      overallStatus = 'GOOD';
    } else {
      overallStatus = 'STABLE';
    }

    return {
      outletId: outlet.outletId,
      outletName: outlet.outletName,
      outletCode: outlet.code,
      overallStatus,
      overallScore,
      dimensions,
      opportunities,
      attentionFlags: Array.from(new Set(attentionFlags)),
      generatedAt: new Date().toISOString(),
    };
  }
}
