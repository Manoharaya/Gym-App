export const ENTERPRISE_ROLES = [
  'ENTERPRISE_ADMIN',
  'REGIONAL_MANAGER',
  'BRAND_MANAGER',
  'OPERATIONS_MANAGER',
  'COMPLIANCE_MANAGER',
  'ANALYTICS_MANAGER',
] as const;

export type EnterpriseRole = (typeof ENTERPRISE_ROLES)[number];

export const ENTERPRISE_SCOPE_TYPES = [
  'PLATFORM',
  'ORGANISATION',
  'BRAND',
  'REGION',
  'OUTLET',
] as const;

export type EnterpriseScopeType = (typeof ENTERPRISE_SCOPE_TYPES)[number];

export const ENTERPRISE_POLICY_CATEGORIES = [
  'FEATURE',
  'SECURITY',
  'BRANDING',
  'COMMUNICATION',
  'INTEGRATION',
  'AI',
  'MARKETPLACE',
  'DEVELOPER_API',
  'DATA_ACCESS',
  'RETENTION',
  'ACCESS_CONTROL',
  'FINANCE',
  'BILLING',
  'COMPLIANCE',
  'OPERATIONS',
] as const;

export type EnterprisePolicyCategory = (typeof ENTERPRISE_POLICY_CATEGORIES)[number];

export const POLICY_ENFORCEMENT_MODES = [
  'ENFORCED',
  'ADVISORY',
  'AUDIT_ONLY',
] as const;

export const HARD_CEILING_POLICIES = [
  'SECURITY',
  'DATA_ACCESS',
  'AI',
  'DEVELOPER_API',
  'MARKETPLACE',
  'COMPLIANCE',
] as const;

export const DOMAIN_STATUSES = [
  'PENDING_VERIFICATION',
  'VERIFIED',
  'ACTIVE',
  'FAILED',
  'SUSPENDED',
  'DELETED',
] as const;

export const SSL_STATUSES = [
  'PENDING',
  'ISSUED',
  'EXPIRED',
  'FAILED',
] as const;

export const STAFF_ASSIGNMENT_TYPES = [
  'PRIMARY',
  'SECONDARY',
  'TEMPORARY',
  'REGIONAL',
] as const;

export const DEFAULT_BRANDING = {
  primaryColor: '#6366F1',
  secondaryColor: '#4F46E5',
  accentColor: '#10B981',
  backgroundColor: '#0F172A',
  surfaceColor: '#1E293B',
  fontFamily: 'Inter, sans-serif',
};
