import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  HEALTH_PII_PERMISSIONS,
  MARKETPLACE_PERMISSIONS_CATALOG,
} from '../domain/marketplace-constants';
import { HealthPiiConsentRequiredError } from '../domain/marketplace-errors';
import { MarketplaceAuditService } from './marketplace-audit.service';
import { MARKETPLACE_ACTIONS } from '../domain/marketplace-events';

@Injectable()
export class MarketplacePermissionService {
  private readonly logger = new Logger(MarketplacePermissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: MarketplaceAuditService,
  ) {}

  getAvailablePermissions(): string[] {
    return [...MARKETPLACE_PERMISSIONS_CATALOG];
  }

  isHealthPiiPermission(permission: string): boolean {
    return HEALTH_PII_PERMISSIONS.has(permission);
  }

  validatePermissions(requestedPermissions: string[]): { valid: boolean; invalid: string[] } {
    const catalog = new Set(MARKETPLACE_PERMISSIONS_CATALOG);
    const invalid = requestedPermissions.filter((p) => !catalog.has(p));
    return { valid: invalid.length === 0, invalid };
  }

  /**
   * Evaluates Health PII requirements.
   * If health PII permissions are requested, consentHealthPii must be explicitly true.
   */
  checkHealthPiiConsent(
    permissions: string[],
    consentGiven: boolean = false,
  ): void {
    const sensitive = permissions.filter((p) => this.isHealthPiiPermission(p));
    if (sensitive.length > 0 && !consentGiven) {
      throw new HealthPiiConsentRequiredError(sensitive);
    }
  }

  /**
   * Creates permission grants for an installation.
   */
  async grantPermissions(
    installationId: string,
    organisationId: string,
    permissions: string[],
    grantedByUserId?: string,
  ): Promise<void> {
    for (const perm of permissions) {
      const isHealth = this.isHealthPiiPermission(perm);
      await this.prisma.marketplacePermissionGrant.upsert({
        where: {
          installationId_permission: {
            installationId,
            permission: perm,
          },
        },
        update: {
          status: 'GRANTED',
          isHealthPii: isHealth,
          grantedByUserId,
          revokedAt: null,
          revocationReason: null,
        },
        create: {
          installationId,
          organisationId,
          permission: perm,
          status: 'GRANTED',
          isHealthPii: isHealth,
          grantedByUserId,
        },
      });
    }

    await this.audit.log({
      organisationId,
      installationId,
      userId: grantedByUserId,
      action: MARKETPLACE_ACTIONS.PERMISSIONS_GRANTED,
      resource: 'MarketplacePermissionGrant',
      resourceId: installationId,
      details: { permissions },
    });
  }

  /**
   * Revokes specific permissions for an installation.
   */
  async revokePermissions(
    installationId: string,
    organisationId: string,
    permissions: string[],
    reason: string = 'User revoked',
    userId?: string,
  ): Promise<void> {
    for (const perm of permissions) {
      await this.prisma.marketplacePermissionGrant.updateMany({
        where: { installationId, permission: perm },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revocationReason: reason,
        },
      });
    }

    await this.audit.log({
      organisationId,
      installationId,
      userId,
      action: MARKETPLACE_ACTIONS.PERMISSIONS_REVOKED,
      resource: 'MarketplacePermissionGrant',
      resourceId: installationId,
      details: { permissions, reason },
    });
  }

  async getGrantsForInstallation(installationId: string) {
    return this.prisma.marketplacePermissionGrant.findMany({
      where: { installationId },
      orderBy: { permission: 'asc' },
    });
  }

  async hasPermission(installationId: string, permission: string): Promise<boolean> {
    const grant = await this.prisma.marketplacePermissionGrant.findUnique({
      where: {
        installationId_permission: {
          installationId,
          permission,
        },
      },
    });
    return grant?.status === 'GRANTED';
  }
}
