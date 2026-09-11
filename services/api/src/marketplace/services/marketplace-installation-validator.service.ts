import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  AlreadyInstalledError,
  IncompatibleScopeError,
  ListingNotPublishedError,
} from '../domain/marketplace-errors';
import { MarketplaceDependencyService } from './marketplace-dependency.service';
import { MarketplacePermissionService } from './marketplace-permission.service';

export interface PreFlightInstallOptions {
  listingId: string;
  organisationId: string;
  outletId?: string | null;
  installationScope: 'ORGANISATION' | 'OUTLET';
  approvedPermissions?: string[];
  consentHealthPii?: boolean;
  version?: string;
}

@Injectable()
export class MarketplaceInstallationValidatorService {
  private readonly logger = new Logger(MarketplaceInstallationValidatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dependencyService: MarketplaceDependencyService,
    private readonly permissionService: MarketplacePermissionService,
  ) {}

  /**
   * Runs all pre-flight validations prior to installing.
   * Returns the listing and matching version record.
   */
  async validateInstallationPreFlight(options: PreFlightInstallOptions) {
    const {
      listingId,
      organisationId,
      outletId,
      installationScope,
      approvedPermissions,
      consentHealthPii,
      version: requestedVersion,
    } = options;

    // 1. Fetch listing
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!listing) {
      throw new ListingNotPublishedError(listingId);
    }

    if (listing.status !== 'PUBLISHED') {
      throw new ListingNotPublishedError(listing.slug);
    }

    // 2. Validate Scope compatibility
    const supportedScopes = (listing.supportedScopes as string[]) || ['ORGANISATION'];
    if (!supportedScopes.includes(installationScope)) {
      throw new IncompatibleScopeError(installationScope, supportedScopes);
    }

    if (installationScope === 'OUTLET' && !outletId) {
      throw new IncompatibleScopeError('OUTLET (outletId is required for OUTLET scope)', supportedScopes);
    }

    // 3. Resolve version
    const versionRecord = requestedVersion
      ? listing.versions.find((v) => v.version === requestedVersion)
      : listing.versions.find((v) => v.version === listing.currentVersion) || listing.versions[0];

    if (!versionRecord) {
      throw new ListingNotPublishedError(`version ${requestedVersion || listing.currentVersion}`);
    }

    // 4. Check for existing active installation
    const existing = await this.prisma.marketplaceInstallation.findFirst({
      where: {
        organisationId,
        listingId,
        outletId: installationScope === 'OUTLET' ? outletId : null,
        status: { in: ['ACTIVE', 'PENDING', 'PAUSED', 'UPGRADING'] },
      },
    });

    if (existing) {
      throw new AlreadyInstalledError(
        listing.title,
        installationScope === 'OUTLET' ? `outlet (${outletId})` : 'organisation',
      );
    }

    // 5. Health PII and permission check
    const permsToGrant = approvedPermissions || (listing.requiredPermissions as string[]) || [];
    this.permissionService.checkHealthPiiConsent(permsToGrant, consentHealthPii);

    // 6. Dependencies & Conflicts
    const deps = (listing.dependencies as any[]) || [];
    const conflicts = (listing.conflicts as string[]) || [];

    await this.dependencyService.validateInstallationDependencies(
      organisationId,
      outletId,
      deps,
      conflicts,
    );

    await this.dependencyService.checkReverseConflicts(
      organisationId,
      listing.slug,
      outletId,
    );

    return { listing, version: versionRecord, permissionsToGrant: permsToGrant };
  }
}
