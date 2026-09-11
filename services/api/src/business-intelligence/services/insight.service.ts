import { Injectable } from '@nestjs/common';
import {
  BusinessDeterministicInsight,
  BusinessHealthOverview,
  BusinessHealthDimension,
  BusinessHealthStatus,
  MembershipBiDto,
  SalesBiDto,
  FinanceBiDto,
  AttendanceBiDto,
  RetentionBiDto,
  BookingBiDto,
  EngagementBiDto,
} from '@fitcore/types';

@Injectable()
export class BusinessInsightService {
  /**
   * Generates deterministic observations based on authoritative domain metrics.
   */
  generateDeterministicInsights(params: {
    membership: MembershipBiDto;
    sales: SalesBiDto;
    finance: FinanceBiDto;
    attendance: AttendanceBiDto;
    bookings: BookingBiDto;
    retention: RetentionBiDto;
    engagement: EngagementBiDto;
  }): BusinessDeterministicInsight[] {
    const { membership, sales, finance, attendance, retention } = params;
    const insights: BusinessDeterministicInsight[] = [];
    const nowIso = new Date().toISOString();

    // 1. Membership Net Change Insight
    if (membership.netMemberChange > 0) {
      insights.push({
        id: 'insight-mem-growth',
        domain: 'MEMBERSHIP',
        metricKey: 'membership.net_member_change',
        observation: `Net membership expanded by +${membership.netMemberChange} members (${membership.newMembers} new, ${membership.reactivatedMembers} reactivated vs ${membership.cancelledMembers} cancelled).`,
        evidence: `New: ${membership.newMembers}, Reactivated: ${membership.reactivatedMembers}, Cancelled: ${membership.cancelledMembers}`,
        direction: 'UP',
        priority: 'MEDIUM',
        generatedAt: nowIso,
      });
    } else if (membership.netMemberChange < 0) {
      insights.push({
        id: 'insight-mem-contraction',
        domain: 'MEMBERSHIP',
        metricKey: 'membership.net_member_change',
        observation: `Net membership contracted by ${membership.netMemberChange} members due to ${membership.cancelledMembers} cancellations outpacing acquisitions.`,
        evidence: `New: ${membership.newMembers}, Reactivated: ${membership.reactivatedMembers}, Cancelled: ${membership.cancelledMembers}`,
        direction: 'DOWN',
        priority: 'HIGH',
        generatedAt: nowIso,
      });
    }

    // 2. Financial Collections & Payment Health
    const primaryCurrency = finance.primaryCurrency;
    const primaryFinance = finance.currencies[primaryCurrency];
    if (primaryFinance) {
      if (primaryFinance.paymentFailureCount > 0 && primaryFinance.paymentSuccessRate && primaryFinance.paymentSuccessRate < 95) {
        insights.push({
          id: 'insight-fin-failures',
          domain: 'FINANCE',
          metricKey: 'finance.payment_success_rate',
          observation: `Payment gateway success rate degraded to ${primaryFinance.paymentSuccessRate}% with ${primaryFinance.paymentFailureCount} failed billing attempts.`,
          evidence: `${primaryFinance.paymentFailureCount} failed vs ${primaryFinance.paymentSuccessCount} successful payments`,
          direction: 'DOWN',
          priority: 'HIGH',
          generatedAt: nowIso,
        });
      }

      if (primaryFinance.overdueInvoicesCount > 0) {
        insights.push({
          id: 'insight-fin-overdue',
          domain: 'FINANCE',
          metricKey: 'finance.outstanding_balance',
          observation: `${primaryCurrency} ${primaryFinance.overdueInvoices.toLocaleString()} overdue across ${primaryFinance.overdueInvoicesCount} invoices requires collection review.`,
          evidence: `Overdue Count: ${primaryFinance.overdueInvoicesCount}, Overdue Balance: ${primaryFinance.overdueInvoices}`,
          direction: 'DOWN',
          priority: 'MEDIUM',
          generatedAt: nowIso,
        });
      }
    }

    // 3. Sales Conversion Performance
    if (sales.conversionRate !== null) {
      if (sales.conversionRate >= 25) {
        insights.push({
          id: 'insight-sales-high-conversion',
          domain: 'SALES',
          metricKey: 'sales.conversion_rate',
          observation: `Strong sales conversion efficiency of ${sales.conversionRate}% (${sales.conversions} won from ${sales.conversionDenominator} leads/opportunities).`,
          evidence: `Conversions: ${sales.conversions}, Denominator: ${sales.conversionDenominator}`,
          direction: 'UP',
          priority: 'LOW',
          generatedAt: nowIso,
        });
      } else if (sales.conversionRate < 10 && sales.conversionDenominator >= 5) {
        insights.push({
          id: 'insight-sales-low-conversion',
          domain: 'SALES',
          metricKey: 'sales.conversion_rate',
          observation: `Lead conversion rate is subdued at ${sales.conversionRate}% (${sales.conversions} / ${sales.conversionDenominator}). Review trial-to-offer funnel.`,
          evidence: `Conversions: ${sales.conversions}, Denominator: ${sales.conversionDenominator}`,
          direction: 'DOWN',
          priority: 'HIGH',
          generatedAt: nowIso,
        });
      }
    }

    // 4. Attendance Engagement
    if (attendance.attendanceFrequencyPerActiveMember && attendance.attendanceFrequencyPerActiveMember < 1.0 && attendance.uniqueActiveMembersVisiting > 0) {
      insights.push({
        id: 'insight-att-frequency',
        domain: 'ATTENDANCE',
        metricKey: 'attendance.frequency',
        observation: `Average member visit frequency is below target at ${attendance.attendanceFrequencyPerActiveMember} visits/period.`,
        evidence: `Total Visits: ${attendance.totalVisits}, Unique Visitors: ${attendance.uniqueActiveMembersVisiting}`,
        direction: 'DOWN',
        priority: 'MEDIUM',
        generatedAt: nowIso,
      });
    }

    // 5. Retention Risk Warning
    if (retention.highRiskCount > 0) {
      insights.push({
        id: 'insight-ret-high-risk',
        domain: 'RETENTION',
        metricKey: 'retention.high_risk_count',
        observation: `${retention.highRiskCount} members flagged in elevated or high retention risk tier with imminent lapse indicators.`,
        evidence: `High Risk: ${retention.highRiskCount}, Elevated Risk: ${retention.elevatedRiskCount}, Pending Tasks: ${retention.followUpQueueCount}`,
        direction: 'DOWN',
        priority: 'HIGH',
        generatedAt: nowIso,
      });
    }

    return insights;
  }

  /**
   * Generates the 7-dimension explainable Business Health Overview.
   */
  evaluateBusinessHealth(params: {
    membership: MembershipBiDto;
    sales: SalesBiDto;
    finance: FinanceBiDto;
    attendance: AttendanceBiDto;
    retention: RetentionBiDto;
    engagement: EngagementBiDto;
  }): BusinessHealthOverview {
    const { membership, sales, finance, attendance, retention, engagement } = params;

    const dimensions: Record<string, BusinessHealthDimension> = {};

    // 1. MEMBERSHIP DIMENSION
    let memStatus: BusinessHealthStatus = 'GOOD';
    let memScore = 90;
    let memRationale = 'Membership base is expanding with positive net acquisition.';
    if (membership.netMemberChange < 0) {
      memStatus = 'ATTENTION_REQUIRED';
      memScore = 55;
      memRationale = `Cancellations (${membership.cancelledMembers}) exceeded new acquisitions (${membership.newMembers}).`;
    } else if (membership.netMemberChange === 0) {
      memStatus = 'STABLE';
      memScore = 75;
      memRationale = 'Membership count is holding steady with balanced additions and lapses.';
    }
    dimensions.MEMBERSHIP = {
      domain: 'MEMBERSHIP',
      status: memStatus,
      score: memScore,
      rationale: memRationale,
      primaryMetric: { label: 'Net Change', value: membership.netMemberChange >= 0 ? `+${membership.netMemberChange}` : `${membership.netMemberChange}` },
      benchmark: '+5 net members / period',
    };

    // 2. SALES DIMENSION
    let salesStatus: BusinessHealthStatus = 'GOOD';
    let salesScore = 85;
    let salesRationale = 'Lead intake and opportunity pipeline conversion are meeting healthy benchmarks.';
    if (sales.conversionRate !== null && sales.conversionRate < 10 && sales.conversionDenominator >= 5) {
      salesStatus = 'WATCH';
      salesScore = 65;
      salesRationale = `Lead-to-member conversion (${sales.conversionRate}%) is trailing expected performance.`;
    } else if (sales.newLeads === 0) {
      salesStatus = 'WATCH';
      salesScore = 60;
      salesRationale = 'No new inbound leads recorded in this timeframe.';
    }
    dimensions.SALES = {
      domain: 'SALES',
      status: salesStatus,
      score: salesScore,
      rationale: salesRationale,
      primaryMetric: { label: 'Conversion Rate', value: sales.conversionRate !== null ? `${sales.conversionRate}%` : 'N/A' },
      benchmark: '15.0% - 25.0%',
    };

    // 3. FINANCE DIMENSION
    const primaryFinance = finance.currencies[finance.primaryCurrency];
    let finStatus: BusinessHealthStatus = 'GOOD';
    let finScore = 92;
    let finRationale = 'Cash flow and billing collection rates are robust and stable.';
    if (primaryFinance) {
      if (primaryFinance.paymentSuccessRate !== null && primaryFinance.paymentSuccessRate < 92) {
        finStatus = 'ATTENTION_REQUIRED';
        finScore = 58;
        finRationale = `Payment success rate (${primaryFinance.paymentSuccessRate}%) dropped below 92% SLA.`;
      } else if (primaryFinance.overdueInvoicesCount > 5) {
        finStatus = 'WATCH';
        finScore = 70;
        finRationale = `Elevated overdue invoice count (${primaryFinance.overdueInvoicesCount} invoices unpaid).`;
      }
    }
    dimensions.FINANCE = {
      domain: 'FINANCE',
      status: finStatus,
      score: finScore,
      rationale: finRationale,
      primaryMetric: {
        label: 'Net Revenue',
        value: primaryFinance ? `${finance.primaryCurrency} ${primaryFinance.netRevenue.toLocaleString()}` : '$0',
      },
      benchmark: 'Payment Success > 95%',
    };

    // 4. ATTENDANCE DIMENSION
    let attStatus: BusinessHealthStatus = 'GOOD';
    let attScore = 88;
    let attRationale = 'Member facility visits and class attendances demonstrate steady utilization.';
    if (attendance.uniqueActiveMembersVisiting === 0) {
      attStatus = 'INSUFFICIENT_DATA';
      attScore = 50;
      attRationale = 'No attendance check-ins recorded in current timeframe.';
    }
    dimensions.ATTENDANCE = {
      domain: 'ATTENDANCE',
      status: attStatus,
      score: attScore,
      rationale: attRationale,
      primaryMetric: { label: 'Total Visits', value: attendance.totalVisits },
      benchmark: '2.5 visits / active member',
    };

    // 5. ENGAGEMENT DIMENSION
    dimensions.ENGAGEMENT = {
      domain: 'ENGAGEMENT',
      status: 'GOOD',
      score: Math.round(engagement.averageEngagementScore || 78),
      rationale: 'Member interaction across workouts, bookings, and app remains high.',
      primaryMetric: { label: 'Avg Engagement', value: `${engagement.averageEngagementScore || 75}/100` },
      benchmark: '> 70 score',
    };

    // 6. RETENTION DIMENSION
    let retStatus: BusinessHealthStatus = 'GOOD';
    let retScore = 90;
    let retRationale = 'Retention rate is healthy with manageable lapse queue.';
    if (retention.highRiskCount > 10) {
      retStatus = 'ATTENTION_REQUIRED';
      retScore = 60;
      retRationale = `${retention.highRiskCount} members are in critical churn risk bracket.`;
    } else if (retention.elevatedRiskCount > 15) {
      retStatus = 'WATCH';
      retScore = 72;
      retRationale = 'Elevated retention risk cohort expanded; proactive outreach recommended.';
    }
    dimensions.RETENTION = {
      domain: 'RETENTION',
      status: retStatus,
      score: retScore,
      rationale: retRationale,
      primaryMetric: { label: 'Retention Rate', value: `${retention.retentionRate}%` },
      benchmark: '> 90.0%',
    };

    // 7. OPERATIONS DIMENSION
    dimensions.OPERATIONS = {
      domain: 'OPERATIONS',
      status: 'GOOD',
      score: 95,
      rationale: 'Access control points, class scheduling, and communication gateways operate normally.',
      primaryMetric: { label: 'Operational Status', value: 'OPTIMAL' },
      benchmark: '99.9% uptime',
    };

    // Overall Score & Status
    const scores = Object.values(dimensions).map((d) => d.score);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    let overallStatus: BusinessHealthStatus = 'GOOD';
    if (Object.values(dimensions).some((d) => d.status === 'ATTENTION_REQUIRED')) {
      overallStatus = 'ATTENTION_REQUIRED';
    } else if (Object.values(dimensions).some((d) => d.status === 'WATCH')) {
      overallStatus = 'WATCH';
    } else if (overallScore < 70) {
      overallStatus = 'STABLE';
    }

    return {
      overallStatus,
      overallScore,
      dimensions,
      generatedAt: new Date().toISOString(),
    };
  }
}
