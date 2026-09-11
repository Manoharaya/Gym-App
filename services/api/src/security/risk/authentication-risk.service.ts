import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RiskLevel, SecurityResponseAction } from '@fitcore/types';

export interface AuthenticationRiskContext {
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  isNewDevice?: boolean;
  failedAttemptsCount?: number;
  hasMfaActive?: boolean;
  isAdmin?: boolean;
  isTokenReuse?: boolean;
}

export interface AuthenticationRiskAssessment {
  riskLevel: RiskLevel;
  signals: string[];
  confidence: number;
  recommendedAction: SecurityResponseAction;
}

/**
 * AuthenticationRiskService
 *
 * Evaluates contextual risk signals deterministically without unpredictable heuristics.
 * Serves as a defensive signal to trigger MFA challenges, step-up requirements,
 * or temporary throttles.
 */
@Injectable()
export class AuthenticationRiskService {
  private readonly logger = new Logger(AuthenticationRiskService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates authentication attempt risk signals.
   */
  async evaluateRisk(context: AuthenticationRiskContext): Promise<AuthenticationRiskAssessment> {
    const signals: string[] = [];
    let riskScore = 0; // 0 to 100

    // 1. Critical Anomaly: Refresh token reuse
    if (context.isTokenReuse) {
      signals.push('REFRESH_TOKEN_REUSE');
      riskScore += 90;
    }

    // 2. High Failed Login Attempts
    const failedAttempts = context.failedAttemptsCount || 0;
    if (failedAttempts >= 5) {
      signals.push('EXCESSIVE_FAILED_ATTEMPTS');
      riskScore += 50;
    } else if (failedAttempts >= 3) {
      signals.push('MULTIPLE_FAILED_ATTEMPTS');
      riskScore += 25;
    }

    // 3. New or Untrusted Device
    if (context.isNewDevice) {
      signals.push('NEW_UNTRUSTED_DEVICE');
      riskScore += 20;
    }

    // 4. Elevated Administrative Privilege Sensitivity
    if (context.isAdmin) {
      signals.push('ADMIN_ACCOUNT_ACCESS');
      riskScore += 15;
    }

    // 5. Query Recent Security Events for This User/IP
    if (context.userId) {
      const recentSuspiciousEvents = await this.prisma.securityEvent.count({
        where: {
          userId: context.userId,
          severity: { in: ['HIGH', 'CRITICAL'] },
          createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (recentSuspiciousEvents > 0) {
        signals.push('RECENT_HIGH_SEVERITY_SECURITY_EVENTS');
        riskScore += 25;
      }
    }

    // Determine Risk Level & Action
    let riskLevel: RiskLevel = 'LOW';
    let recommendedAction: SecurityResponseAction = 'ALLOW';
    let confidence = 0.85;

    if (riskScore >= 80) {
      riskLevel = 'CRITICAL';
      recommendedAction = context.isTokenReuse ? 'REVOKE_SESSION' : 'LOCK_ACCOUNT';
      confidence = 0.95;
    } else if (riskScore >= 50) {
      riskLevel = 'HIGH';
      recommendedAction = context.hasMfaActive ? 'REQUIRE_MFA' : 'CHALLENGE';
      confidence = 0.90;
    } else if (riskScore >= 25) {
      riskLevel = 'MODERATE';
      recommendedAction = 'REQUIRE_MFA';
      confidence = 0.80;
    } else {
      riskLevel = 'LOW';
      recommendedAction = 'ALLOW';
      confidence = 0.85;
    }

    return {
      riskLevel,
      signals,
      confidence,
      recommendedAction,
    };
  }
}
