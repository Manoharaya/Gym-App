/**
 * FitCore — Day 52: Advanced Security Types & Interfaces
 */

export type MfaType =
  | 'TOTP'
  | 'EMAIL_OTP'
  | 'WEBAUTHN'
  | 'PASSKEY'
  | 'SMS_OTP'
  | 'HARDWARE_SECURITY_KEY';

export type MfaStatus = 'PENDING' | 'ACTIVE' | 'DISABLED' | 'REVOKED';

export type RecoveryCodeStatus = 'UNUSED' | 'USED' | 'REVOKED';

export type SessionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'COMPROMISED';

export type UserDeviceStatus = 'NEW' | 'TRUSTED' | 'BLOCKED' | 'REVOKED';
export type SecurityDeviceStatus = UserDeviceStatus;

export type SecuritySeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SecurityAlertStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'INVESTIGATING'
  | 'RESOLVED'
  | 'DISMISSED';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type SecurityResponseAction =
  | 'ALLOW'
  | 'REQUIRE_MFA'
  | 'REQUIRE_STEP_UP'
  | 'CHALLENGE'
  | 'TEMPORARILY_BLOCK'
  | 'REVOKE_SESSION'
  | 'LOCK_ACCOUNT'
  | 'REQUIRE_PASSWORD_RESET'
  | 'ALERT_ADMIN';

export type AccountProtectionStatus =
  | 'ACTIVE'
  | 'TEMPORARILY_LOCKED'
  | 'SECURITY_LOCKED'
  | 'SUSPENDED';

export type IpPolicyType = 'ALLOWLIST' | 'DENYLIST';

export type IpTargetSurface =
  | 'ADMIN_LOGIN'
  | 'ADMIN_PORTAL'
  | 'API'
  | 'DEVELOPER_PORTAL'
  | 'FINANCE'
  | 'ENTERPRISE_SETTINGS';

export type StepUpAction =
  | 'CHANGE_PASSWORD'
  | 'DISABLE_MFA'
  | 'REGENERATE_RECOVERY_CODES'
  | 'CREATE_API_KEY'
  | 'ROTATE_API_CREDENTIALS'
  | 'MODIFY_SECURITY_POLICY'
  | 'CHANGE_FINANCIAL_CONFIG'
  | 'GRANT_SENSITIVE_PERMISSION'
  | 'EXPORT_SENSITIVE_DATA'
  | 'DELETE_ACCOUNT'
  | 'SUSPEND_ORGANISATION'
  | 'TOGGLE_CRITICAL_FEATURE_FLAG'
  | 'CHANGE_PLATFORM_CONFIG'
  | 'SUPPORT_ACCESS_APPROVAL'
  | 'BREAK_GLASS_ACCESS';

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'MFA_FAILURE'
  | 'RECOVERY_CODE_USED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'SESSION_CREATED'
  | 'SESSION_REVOKED'
  | 'SESSION_REUSE_DETECTED'
  | 'REFRESH_TOKEN_REUSE_DETECTED'
  | 'DEVICE_REGISTERED'
  | 'DEVICE_TRUSTED'
  | 'DEVICE_REVOKED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'PERMISSION_DENIED'
  | 'ROLE_CHANGED'
  | 'SENSITIVE_ACTION_STEP_UP'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED'
  | 'OAUTH_AUTHORIZATION'
  | 'OAUTH_TOKEN_REVOKED'
  | 'SUSPICIOUS_ACTIVITY'
  | 'RATE_LIMIT_TRIGGERED'
  | 'SECURITY_POLICY_CHANGED'
  | 'IP_POLICY_CHANGED'
  | 'SUPERADMIN_LOGIN'
  | 'SUPERADMIN_ACTION'
  | 'ORGANISATION_SUSPENDED'
  | 'ORGANISATION_REACTIVATED'
  | 'SUPPORT_ACCESS_GRANTED'
  | 'SUPPORT_ACCESS_REVOKED'
  | 'BREAK_GLASS_ACCESS'
  | 'FEATURE_FLAG_CHANGED'
  | 'PLATFORM_CONFIG_CHANGED';

export interface UserMfaMethodEntity {
  id: string;
  userId: string;
  type: MfaType;
  status: MfaStatus;
  label?: string | null;
  secretReference: string;
  verifiedAt?: Date | null;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMfaRecoveryCodeEntity {
  id: string;
  userId: string;
  codeHash: string;
  status: RecoveryCodeStatus;
  usedAt?: Date | null;
  createdAt: Date;
}

export interface UserSessionEntity {
  id: string;
  userId: string;
  organisationId?: string | null;
  sessionTokenReference?: string | null;
  status: SessionStatus;
  tokenFamily: string;
  isValid: boolean;
  userAgent?: string | null;
  ipAddress?: string | null;
  deviceId?: string | null;
  authMethod: string;
  mfaVerified: boolean;
  lastStepUpAt?: Date | null;
  expiresAt: Date;
  lastUsedAt?: Date | null;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDeviceEntity {
  id: string;
  userId: string;
  deviceIdentifierHash: string;
  deviceName: string;
  platform?: string | null;
  appVersion?: string | null;
  browser?: string | null;
  ipAddress?: string | null;
  status: UserDeviceStatus;
  trustedAt?: Date | null;
  lastSeenAt: Date;
  firstSeenAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityEventEntity {
  id: string;
  organisationId?: string | null;
  userId?: string | null;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  source: string;
  ipAddress?: string | null;
  deviceId?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

export interface SecurityAlertEntity {
  id: string;
  organisationId: string;
  severity: SecuritySeverity;
  type: string;
  description: string;
  relatedUserId?: string | null;
  relatedSessionId?: string | null;
  relatedDeviceId?: string | null;
  status: SecurityAlertStatus;
  assignedTo?: string | null;
  metadata?: Record<string, any> | null;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityIpPolicyEntity {
  id: string;
  organisationId: string;
  scopeType: string;
  scopeId?: string | null;
  name: string;
  type: IpPolicyType;
  targetSurfaces: IpTargetSurface[];
  status: string;
  isHardCeiling: boolean;
  priority: number;
  rules?: SecurityIpRuleEntity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityIpRuleEntity {
  id: string;
  policyId: string;
  ipOrCidr: string;
  description?: string | null;
  createdAt: Date;
}

export interface SecurityActionChallengeEntity {
  id: string;
  userId: string;
  sessionId?: string | null;
  action: string;
  tokenHash: string;
  status: string;
  expiresAt: Date;
  verifiedAt?: Date | null;
  consumedAt?: Date | null;
  createdAt: Date;
}

export interface SecurityOverviewMetrics {
  activeSessions: number;
  trustedDevices: number;
  failedLoginsToday: number;
  mfaAdoptionRate: number;
  openAlerts: number;
  highRiskEvents24h: number;
  revokedSessions24h: number;
  blockedIpAttempts24h: number;
}

export interface RiskEvaluationResult {
  riskLevel: RiskLevel;
  signals: string[];
  confidence: number;
  recommendedAction: SecurityResponseAction;
}
