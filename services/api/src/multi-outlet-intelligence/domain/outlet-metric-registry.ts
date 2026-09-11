import { Injectable } from '@nestjs/common';
import {
  BusinessMetricDomain,
  BusinessMetricUnit,
  OutletNormalisationMode,
} from '@fitcore/types';

export interface OutletComparableMetricDefinition {
  metricKey: string;
  domain: BusinessMetricDomain;
  label: string;
  description: string;
  unit: BusinessMetricUnit | string;
  supportsAbsolute: boolean;
  supportsNormalisation: boolean;
  allowedNormalisationModes: OutletNormalisationMode[];
  defaultNormalisation: OutletNormalisationMode;
  denominatorDescription?: string;
  minimumSample: number;
  direction: 'UP_IS_GOOD' | 'UP_IS_BAD' | 'NEUTRAL';
  requiresCurrency: boolean;
}

export const OUTLET_COMPARABLE_METRICS: Record<string, OutletComparableMetricDefinition> = {
  'membership.active_members': {
    metricKey: 'membership.active_members',
    domain: 'MEMBERSHIP',
    label: 'Active Members',
    description: 'Count of active and trial member contracts assigned to this outlet as origin.',
    unit: 'COUNT',
    supportsAbsolute: true,
    supportsNormalisation: true,
    allowedNormalisationModes: ['ABSOLUTE', 'GROWTH_VS_BASELINE'],
    defaultNormalisation: 'ABSOLUTE',
    minimumSample: 1,
    direction: 'UP_IS_GOOD',
    requiresCurrency: false,
  },
  'membership.net_member_change': {
    metricKey: 'membership.net_member_change',
    domain: 'MEMBERSHIP',
    label: 'Net Member Change',
    description: 'New Members + Reactivated Members - Cancelled Members in period.',
    unit: 'COUNT',
    supportsAbsolute: true,
    supportsNormalisation: true,
    allowedNormalisationModes: ['ABSOLUTE', 'PER_ACTIVE_MEMBER', 'GROWTH_VS_BASELINE'],
    defaultNormalisation: 'GROWTH_VS_BASELINE',
    denominatorDescription: 'Prior period active members',
    minimumSample: 5,
    direction: 'UP_IS_GOOD',
    requiresCurrency: false,
  },
  'membership.growth_rate': {
    metricKey: 'membership.growth_rate',
    domain: 'MEMBERSHIP',
    label: 'Member Growth Rate',
    description: 'Percentage growth of active membership base relative to prior period.',
    unit: 'PERCENTAGE',
    supportsAbsolute: false,
    supportsNormalisation: true,
    allowedNormalisationModes: ['PERCENTAGE', 'GROWTH_VS_BASELINE'],
    defaultNormalisation: 'PERCENTAGE',
    denominatorDescription: 'Prior period active members',
    minimumSample: 5,
    direction: 'UP_IS_GOOD',
    requiresCurrency: false,
  },
  'finance.gross_revenue': {
    metricKey: 'finance.gross_revenue',
    domain: 'FINANCE',
    label: 'Gross Revenue',
    description: 'Total revenue collected with explicit outlet transaction attribution.',
    unit: 'CURRENCY',
    supportsAbsolute: true,
    supportsNormalisation: true,
    allowedNormalisationModes: ['ABSOLUTE', 'PER_ACTIVE_MEMBER', 'GROWTH_VS_BASELINE'],
    defaultNormalisation: 'PER_ACTIVE_MEMBER',
    denominatorDescription: 'Active members in outlet',
    minimumSample: 1,
    direction: 'UP_IS_GOOD',
    requiresCurrency: true,
  },
  'finance.net_revenue': {
    metricKey: 'finance.net_revenue',
    domain: 'FINANCE',
    label: 'Net Revenue',
    description: 'Gross revenue minus processed payment refunds.',
    unit: 'CURRENCY',
    supportsAbsolute: true,
    supportsNormalisation: true,
    allowedNormalisationModes: ['ABSOLUTE', 'PER_ACTIVE_MEMBER', 'GROWTH_VS_BASELINE'],
    defaultNormalisation: 'PER_ACTIVE_MEMBER',
    denominatorDescription: 'Active members in outlet',
    minimumSample: 1,
    direction: 'UP_IS_GOOD',
    requiresCurrency: true,
  },
  'sales.new_leads': {
    metricKey: 'sales.new_leads',
    domain: 'SALES',
    label: 'New Leads',
    description: 'Prospect leads acquired for this outlet in date window.',
    unit: 'COUNT',
    supportsAbsolute: true,
    supportsNormalisation: true,
    allowedNormalisationModes: ['ABSOLUTE', 'PER_ACTIVE_MEMBER', 'GROWTH_VS_BASELINE'],
    defaultNormalisation: 'ABSOLUTE',
    denominatorDescription: 'Per 100 active members',
    minimumSample: 1,
    direction: 'UP_IS_GOOD',
    requiresCurrency: false,
  },
  'sales.conversion_rate': {
    metricKey: 'sales.conversion_rate',
    domain: 'SALES',
    label: 'Sales Conversion Rate',
    description: 'Percentage of leads converted to memberships with explicit denominator.',
    unit: 'PERCENTAGE',
    supportsAbsolute: false,
    supportsNormalisation: true,
    allowedNormalisationModes: ['PERCENTAGE', 'PER_LEAD'],
    defaultNormalisation: 'PERCENTAGE',
    denominatorDescription: 'Total prospect leads received',
    minimumSample: 5,
    direction: 'UP_IS_GOOD',
    requiresCurrency: false,
  },
  'attendance.total_visits': {
    metricKey: 'attendance.total_visits',
    domain: 'ATTENDANCE',
    label: 'Total Facility Visits',
    description: 'Physical access check-in events recorded at this outlet.',
    unit: 'COUNT',
    supportsAbsolute: true,
    supportsNormalisation: true,
    allowedNormalisationModes: ['ABSOLUTE', 'PER_ACTIVE_MEMBER', 'GROWTH_VS_BASELINE'],
    defaultNormalisation: 'PER_ACTIVE_MEMBER',
    denominatorDescription: 'Active members in outlet',
    minimumSample: 10,
    direction: 'UP_IS_GOOD',
    requiresCurrency: false,
  },
  'bookings.fill_rate': {
    metricKey: 'bookings.fill_rate',
    domain: 'BOOKING',
    label: 'Class Capacity Fill Rate',
    description: 'Checked-in session attendance divided by total class capacity.',
    unit: 'PERCENTAGE',
    supportsAbsolute: false,
    supportsNormalisation: true,
    allowedNormalisationModes: ['PERCENTAGE', 'PER_SESSION'],
    defaultNormalisation: 'PERCENTAGE',
    denominatorDescription: 'Available session capacity',
    minimumSample: 5,
    direction: 'UP_IS_GOOD',
    requiresCurrency: false,
  },
  'engagement.avg_score': {
    metricKey: 'engagement.avg_score',
    domain: 'ENGAGEMENT',
    label: 'Average Engagement Score',
    description: 'Average rolling multi-factor engagement score across outlet members.',
    unit: 'SCORE',
    supportsAbsolute: true,
    supportsNormalisation: false,
    allowedNormalisationModes: ['ABSOLUTE'],
    defaultNormalisation: 'ABSOLUTE',
    minimumSample: 10,
    direction: 'UP_IS_GOOD',
    requiresCurrency: false,
  },
  'retention.high_risk_rate': {
    metricKey: 'retention.high_risk_rate',
    domain: 'RETENTION',
    label: 'High Churn Risk Rate',
    description: 'Proportion of active outlet members categorized in HIGH retention risk tier.',
    unit: 'PERCENTAGE',
    supportsAbsolute: true,
    supportsNormalisation: true,
    allowedNormalisationModes: ['PERCENTAGE', 'PER_ACTIVE_MEMBER'],
    defaultNormalisation: 'PERCENTAGE',
    denominatorDescription: 'Active members in outlet',
    minimumSample: 10,
    direction: 'UP_IS_BAD',
    requiresCurrency: false,
  },
};

@Injectable()
export class OutletMetricRegistryService {
  getAllMetrics(): OutletComparableMetricDefinition[] {
    return Object.values(OUTLET_COMPARABLE_METRICS);
  }

  getMetric(key: string): OutletComparableMetricDefinition | undefined {
    return OUTLET_COMPARABLE_METRICS[key];
  }
}
