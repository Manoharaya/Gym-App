/**
 * DAY 56: OBSERVABILITY, MONITORING & PLATFORM HEALTH
 *
 * Types for centralized observability across logs, metrics, traces,
 * health probes, alert engines, incidents, and provider telemetry.
 */

export type ObservabilityHealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';

export type ObservabilitySeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ObservabilityAlertStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'INVESTIGATING'
  | 'RESOLVED'
  | 'DISMISSED';

export type ObservabilityIncidentStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'MITIGATED'
  | 'RESOLVED'
  | 'CLOSED';

export type MetricType = 'COUNTER' | 'GAUGE' | 'HISTOGRAM' | 'TIMER';

export interface MetricDefinition {
  key: string;
  name: string;
  description: string;
  type: MetricType;
  unit: string;
  service: string;
  dimensions: string[];
}

export interface MetricSnapshot {
  key: string;
  value: number;
  unit: string;
  timestamp: string;
  dimensions?: Record<string, string>;
}

export interface SubsystemHealthProbe {
  service: string;
  category: 'CORE' | 'STORAGE' | 'PROVIDER' | 'WORKER' | 'AI';
  status: ObservabilityHealthStatus;
  latencyMs: number;
  lastCheckedAt: string;
  message?: string;
  details?: Record<string, any>;
}

export interface PlatformHealthOverviewDto {
  overallStatus: ObservabilityHealthStatus;
  uptimeSeconds: number;
  timestamp: string;
  services: SubsystemHealthProbe[];
  activeAlertsCount: number;
  criticalAlertsCount: number;
  openIncidentsCount: number;
}

export interface ObservabilityAlertDto {
  id: string;
  ruleKey: string;
  title: string;
  message: string;
  severity: ObservabilitySeverity;
  status: ObservabilityAlertStatus;
  fingerprint: string;
  service: string;
  metricKey: string;
  metricValue: number;
  thresholdValue: number;
  organisationId?: string;
  acknowledgedByUserId?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ObservabilityIncidentDto {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  severity: ObservabilitySeverity;
  status: ObservabilityIncidentStatus;
  affectedServices: string[];
  linkedAlertIds: string[];
  mitigationNotes?: string;
  detectedAt: string;
  mitigatedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  events?: ObservabilityIncidentEventDto[];
}

export interface ObservabilityIncidentEventDto {
  id: string;
  incidentId: string;
  status: ObservabilityIncidentStatus;
  message: string;
  actorUserId?: string;
  createdAt: string;
}

export interface ObservabilitySloDto {
  key: string;
  name: string;
  service: string;
  targetPercentage: number;
  observedPercentage: number;
  status: 'COMPLIANT' | 'AT_RISK' | 'BREACHED';
  windowDays: number;
  metricNumerator: string;
  metricDenominator: string;
}

export interface QueueHealthDto {
  queueName: string;
  depth: number;
  processingRatePerMinute: number;
  failureRatePerMinute: number;
  oldestJobAgeSeconds: number;
  deadLettersCount: number;
  status: ObservabilityHealthStatus;
}

export interface AiTelemetrySummaryDto {
  totalRequests: number;
  successRatePercent: number;
  avgLatencyMs: number;
  totalTokens: number;
  estimatedCostCents: number;
  providerStatus: Record<string, ObservabilityHealthStatus>;
  safetyBlocksCount: number;
  toolFailuresCount: number;
}
