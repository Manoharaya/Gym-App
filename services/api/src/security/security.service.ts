import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MfaService } from './mfa/mfa.service';
import { SessionSecurityService } from './sessions/session-security.service';
import { TokenRotationService } from './sessions/token-rotation.service';
import { DeviceService } from './devices/device.service';
import { AuthenticationRiskService } from './risk/authentication-risk.service';
import { IpRestrictionService } from './ip/ip-restriction.service';
import { StepUpService } from './step-up/step-up.service';
import { SecurityEventService } from './events/security-event.service';
import { SecurityAlertService } from './alerts/security-alert.service';
import { SecurityPolicyService } from './policies/security-policy.service';
import { AccountProtectionService } from './account-protection/account-protection.service';
import { SecurityNotificationService } from './notifications/security-notification.service';
import { SecurityOverviewMetrics } from '@fitcore/types';

/**
 * SecurityService
 *
 * Master orchestrator for Day 52 Advanced Security Foundation.
 */
@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    public readonly prisma: PrismaService,
    public readonly mfa: MfaService,
    public readonly sessions: SessionSecurityService,
    public readonly tokenRotation: TokenRotationService,
    public readonly devices: DeviceService,
    public readonly risk: AuthenticationRiskService,
    public readonly ip: IpRestrictionService,
    public readonly stepUp: StepUpService,
    public readonly events: SecurityEventService,
    public readonly alerts: SecurityAlertService,
    public readonly policies: SecurityPolicyService,
    public readonly accountProtection: AccountProtectionService,
    public readonly notifications: SecurityNotificationService,
  ) {}

  /**
   * Generates KPI cards and metrics for the organisation Security Overview dashboard.
   */
  async getOverviewMetrics(organisationId: string): Promise<SecurityOverviewMetrics> {
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      activeSessions,
      trustedDevices,
      failedLoginsToday,
      totalOrgUsers,
      usersWithMfa,
      openAlerts,
      highRiskEvents24h,
      revokedSessions24h,
    ] = await Promise.all([
      // Active sessions in organisation
      this.prisma.session.count({
        where: {
          organisationId,
          status: 'ACTIVE',
          isValid: true,
          expiresAt: { gt: new Date() },
        },
      }),
      // Trusted devices
      this.prisma.userDevice.count({
        where: {
          status: 'TRUSTED',
          user: {
            userRoles: {
              some: { organisationId },
            },
          },
        },
      }),
      // Failed logins in past 24h
      this.prisma.securityEvent.count({
        where: {
          organisationId,
          eventType: 'LOGIN_FAILURE',
          createdAt: { gt: past24h },
        },
      }),
      // Total users in organisation
      this.prisma.userRole.count({
        where: { organisationId },
      }),
      // Users with active MFA
      this.prisma.userMfaMethod.count({
        where: {
          status: 'ACTIVE',
          user: {
            userRoles: {
              some: { organisationId },
            },
          },
        },
      }),
      // Open security alerts
      this.prisma.securityAlert.count({
        where: {
          organisationId,
          status: { in: ['OPEN', 'INVESTIGATING'] },
        },
      }),
      // High or Critical security events
      this.prisma.securityEvent.count({
        where: {
          organisationId,
          severity: { in: ['HIGH', 'CRITICAL'] },
          createdAt: { gt: past24h },
        },
      }),
      // Revoked sessions in past 24h
      this.prisma.session.count({
        where: {
          organisationId,
          status: 'REVOKED',
          revokedAt: { gt: past24h },
        },
      }),
    ]);

    const mfaAdoptionRate =
      totalOrgUsers > 0 ? Math.round((usersWithMfa / totalOrgUsers) * 100) : 0;

    return {
      activeSessions,
      trustedDevices,
      failedLoginsToday,
      mfaAdoptionRate,
      openAlerts,
      highRiskEvents24h,
      revokedSessions24h,
      blockedIpAttempts24h: 0,
    };
  }

  /**
   * Creates an IP policy with CIDR rules.
   */
  async createIpPolicy(
    organisationId: string,
    data: {
      name: string;
      type: 'ALLOWLIST' | 'DENYLIST';
      scopeType?: string;
      scopeId?: string;
      targetSurfaces: string[];
      rules: Array<{ ipOrCidr: string; description?: string }>;
      isHardCeiling?: boolean;
    },
  ) {
    // Validate rules
    for (const rule of data.rules) {
      if (!this.ip.isValidIpOrCidr(rule.ipOrCidr)) {
        throw new BadRequestException(`Invalid IP or CIDR specification: ${rule.ipOrCidr}`);
      }
    }

    const policy = await this.prisma.securityIpPolicy.create({
      data: {
        organisationId,
        name: data.name,
        type: data.type,
        scopeType: data.scopeType || 'ORGANISATION',
        scopeId: data.scopeId,
        targetSurfaces: data.targetSurfaces,
        isHardCeiling: data.isHardCeiling !== false,
        status: 'ACTIVE',
        rules: {
          create: data.rules.map((r) => ({
            ipOrCidr: r.ipOrCidr.trim(),
            description: r.description,
          })),
        },
      },
      include: { rules: true },
    });

    await this.events.recordEvent({
      organisationId,
      eventType: 'IP_POLICY_CHANGED',
      severity: 'MEDIUM',
      source: 'ADMIN',
      metadata: { policyId: policy.id, name: policy.name, type: policy.type },
    });

    return policy;
  }

  /**
   * Retrieves IP policies for an organisation.
   */
  async getIpPolicies(organisationId: string) {
    return this.prisma.securityIpPolicy.findMany({
      where: { organisationId },
      include: { rules: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Deletes an IP policy.
   */
  async deleteIpPolicy(policyId: string, organisationId: string) {
    const existing = await this.prisma.securityIpPolicy.findUnique({
      where: { id: policyId },
    });

    if (!existing || existing.organisationId !== organisationId) {
      throw new NotFoundException('IP Policy not found');
    }

    await this.prisma.securityIpPolicy.delete({
      where: { id: policyId },
    });

    await this.events.recordEvent({
      organisationId,
      eventType: 'IP_POLICY_CHANGED',
      severity: 'MEDIUM',
      source: 'ADMIN',
      metadata: { policyId, action: 'DELETED' },
    });
  }
}
