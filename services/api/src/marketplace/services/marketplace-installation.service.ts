import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  InstallationNotFoundError,
  ListingNotFoundError,
  VersionNotFoundError,
} from '../domain/marketplace-errors';
import {
  ConfigureMarketplaceInstallationDto,
  InstallMarketplaceListingDto,
} from '../dto';
import { MarketplaceInstallationValidatorService } from './marketplace-installation-validator.service';
import { MarketplacePermissionService } from './marketplace-permission.service';
import { MarketplaceAnalyticsService } from './marketplace-analytics.service';
import { MarketplaceAuditService } from './marketplace-audit.service';
import { MARKETPLACE_ACTIONS } from '../domain/marketplace-events';

@Injectable()
export class MarketplaceInstallationService {
  private readonly logger = new Logger(MarketplaceInstallationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: MarketplaceInstallationValidatorService,
    private readonly permissionService: MarketplacePermissionService,
    private readonly analytics: MarketplaceAnalyticsService,
    private readonly audit: MarketplaceAuditService,
  ) {}

  /**
   * Installs a marketplace listing for an organisation or outlet.
   */
  async installListing(
    organisationId: string,
    userId: string,
    dto: InstallMarketplaceListingDto,
  ) {
    const scope = dto.installationScope || 'ORGANISATION';

    // 1. Run full pre-flight validation
    const { listing, version, permissionsToGrant } =
      await this.validator.validateInstallationPreFlight({
        listingId: dto.listingId,
        organisationId,
        outletId: dto.outletId,
        installationScope: scope,
        approvedPermissions: dto.approvedPermissions,
        consentHealthPii: dto.consentHealthPii,
        version: dto.version,
      });

    // 2. Create installation record
    const installation = await this.prisma.marketplaceInstallation.create({
      data: {
        organisationId,
        outletId: scope === 'OUTLET' ? dto.outletId : null,
        listingId: listing.id,
        versionId: version.id,
        installedByUserId: userId,
        status: 'ACTIVE',
        installationScope: scope,
        config: dto.config || {},
        healthStatus: 'HEALTHY',
        installedAt: new Date(),
      },
    });

    // 3. Grant approved permissions
    await this.permissionService.grantPermissions(
      installation.id,
      organisationId,
      permissionsToGrant,
      userId,
    );

    // 4. Increment install count on listing
    await this.analytics.incrementInstallCount(listing.id);

    // 5. Audit
    await this.audit.log({
      organisationId,
      installationId: installation.id,
      listingId: listing.id,
      userId,
      action: MARKETPLACE_ACTIONS.APP_INSTALLED,
      resource: 'MarketplaceInstallation',
      resourceId: installation.id,
      details: {
        scope,
        outletId: dto.outletId,
        version: version.version,
        permissions: permissionsToGrant,
      },
    });

    return this.getInstallationById(installation.id, organisationId);
  }

  /**
   * Configures an active installation (settings JSON and permissions).
   */
  async configureInstallation(
    installationId: string,
    organisationId: string,
    userId: string,
    dto: ConfigureMarketplaceInstallationDto,
  ) {
    const installation = await this.getInstallationById(installationId, organisationId);

    // Update config if provided
    let updatedConfig = (installation.config as Record<string, any>) || {};
    if (dto.config) {
      updatedConfig = { ...updatedConfig, ...dto.config };
    }

    const updated = await this.prisma.marketplaceInstallation.update({
      where: { id: installationId },
      data: {
        config: updatedConfig,
      },
    });

    // Update permissions if provided
    if (dto.approvedPermissions && dto.approvedPermissions.length > 0) {
      this.permissionService.checkHealthPiiConsent(dto.approvedPermissions, dto.consentHealthPii);
      await this.permissionService.grantPermissions(
        installationId,
        organisationId,
        dto.approvedPermissions,
        userId,
      );
    }

    if (dto.revokedPermissions && dto.revokedPermissions.length > 0) {
      await this.permissionService.revokePermissions(
        installationId,
        organisationId,
        dto.revokedPermissions,
        'Config update',
        userId,
      );
    }

    await this.audit.log({
      organisationId,
      installationId,
      listingId: installation.listingId,
      userId,
      action: MARKETPLACE_ACTIONS.APP_CONFIGURED,
      resource: 'MarketplaceInstallation',
      resourceId: installationId,
      details: { updatedKeys: Object.keys(dto.config || {}) },
    });

    return this.getInstallationById(installationId, organisationId);
  }

  /**
   * Pauses an active installation.
   */
  async pauseInstallation(installationId: string, organisationId: string, userId: string) {
    await this.getInstallationById(installationId, organisationId);

    const updated = await this.prisma.marketplaceInstallation.update({
      where: { id: installationId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
      },
    });

    await this.audit.log({
      organisationId,
      installationId,
      listingId: updated.listingId,
      userId,
      action: MARKETPLACE_ACTIONS.APP_PAUSED,
      resource: 'MarketplaceInstallation',
      resourceId: installationId,
    });

    return updated;
  }

  /**
   * Resumes a paused installation.
   */
  async resumeInstallation(installationId: string, organisationId: string, userId: string) {
    await this.getInstallationById(installationId, organisationId);

    const updated = await this.prisma.marketplaceInstallation.update({
      where: { id: installationId },
      data: {
        status: 'ACTIVE',
        pausedAt: null,
      },
    });

    await this.audit.log({
      organisationId,
      installationId,
      listingId: updated.listingId,
      userId,
      action: MARKETPLACE_ACTIONS.APP_RESUMED,
      resource: 'MarketplaceInstallation',
      resourceId: installationId,
    });

    return updated;
  }

  /**
   * Upgrades installation to a target version.
   */
  async upgradeInstallation(
    installationId: string,
    targetVersion: string,
    organisationId: string,
    userId: string,
  ) {
    const installation = await this.getInstallationById(installationId, organisationId);

    // Fetch target version
    const version = await this.prisma.marketplaceListingVersion.findUnique({
      where: {
        listingId_version: {
          listingId: installation.listingId,
          version: targetVersion,
        },
      },
    });

    if (!version) {
      throw new VersionNotFoundError(targetVersion);
    }

    const updated = await this.prisma.marketplaceInstallation.update({
      where: { id: installationId },
      data: {
        versionId: version.id,
        status: 'ACTIVE',
      },
    });

    await this.audit.log({
      organisationId,
      installationId,
      listingId: installation.listingId,
      userId,
      action: MARKETPLACE_ACTIONS.APP_UPGRADED,
      resource: 'MarketplaceInstallation',
      resourceId: installationId,
      details: { fromVersion: installation.version.version, toVersion: targetVersion },
    });

    return this.getInstallationById(installationId, organisationId);
  }

  /**
   * Uninstalls an installation and revokes all active permission grants.
   */
  async uninstallInstallation(installationId: string, organisationId: string, userId: string) {
    const installation = await this.getInstallationById(installationId, organisationId);

    // Revoke all permissions
    await this.prisma.marketplacePermissionGrant.updateMany({
      where: { installationId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revocationReason: 'App uninstalled',
      },
    });

    const updated = await this.prisma.marketplaceInstallation.update({
      where: { id: installationId },
      data: {
        status: 'UNINSTALLED',
        uninstalledAt: new Date(),
      },
    });

    await this.audit.log({
      organisationId,
      installationId,
      listingId: installation.listingId,
      userId,
      action: MARKETPLACE_ACTIONS.APP_UNINSTALLED,
      resource: 'MarketplaceInstallation',
      resourceId: installationId,
    });

    return updated;
  }

  /**
   * Retrieves an installation by ID, with tenant boundary enforcement.
   */
  async getInstallationById(id: string, organisationId?: string) {
    const installation = await this.prisma.marketplaceInstallation.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            tagline: true,
            iconUrl: true,
            listingType: true,
            publisherName: true,
            currentVersion: true,
            capabilities: true,
            requiredPermissions: true,
          },
        },
        version: {
          select: {
            id: true,
            version: true,
            changelog: true,
            requiredPermissions: true,
            manifest: true,
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        permissionGrants: true,
        installedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!installation || (organisationId && installation.organisationId !== organisationId)) {
      throw new InstallationNotFoundError(id);
    }

    return installation;
  }

  /**
   * Lists all active or filtered installations for a tenant.
   */
  async getTenantInstallations(
    organisationId: string,
    filters?: {
      outletId?: string;
      status?: string;
      listingType?: string;
    },
  ) {
    const where: any = { organisationId };

    if (filters?.status) {
      where.status = filters.status;
    } else {
      where.status = { not: 'UNINSTALLED' };
    }

    if (filters?.outletId) {
      where.OR = [{ outletId: null }, { outletId: filters.outletId }];
    }

    if (filters?.listingType) {
      where.listing = { listingType: filters.listingType };
    }

    return this.prisma.marketplaceInstallation.findMany({
      where,
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            tagline: true,
            iconUrl: true,
            listingType: true,
            publisherName: true,
            pricingType: true,
            ratingAverage: true,
            reviewCount: true,
            currentVersion: true,
          },
        },
        version: {
          select: {
            id: true,
            version: true,
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        permissionGrants: {
          where: { status: 'GRANTED' },
          select: { permission: true, isHealthPii: true },
        },
      },
      orderBy: { installedAt: 'desc' },
    });
  }
}
