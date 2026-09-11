import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  InvalidListingStatusTransitionError,
  ListingNotFoundError,
  VersionNotFoundError,
} from '../domain/marketplace-errors';
import {
  CreateMarketplaceListingDto,
  CreateMarketplaceListingVersionDto,
  UpdateMarketplaceListingDto,
} from '../dto';
import { MarketplaceAuditService } from './marketplace-audit.service';
import { MARKETPLACE_ACTIONS } from '../domain/marketplace-events';

@Injectable()
export class MarketplaceListingService {
  private readonly logger = new Logger(MarketplaceListingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: MarketplaceAuditService,
  ) {}

  /**
   * Creates a new listing in DRAFT status, along with its initial version.
   */
  async createListing(
    dto: CreateMarketplaceListingDto,
    publisherOrgId?: string,
    userId?: string,
  ) {
    const listing = await this.prisma.marketplaceListing.create({
      data: {
        title: dto.title,
        slug: dto.slug.toLowerCase().trim(),
        tagline: dto.tagline,
        description: dto.description,
        listingType: dto.listingType,
        publisherType: dto.publisherType || 'COMMUNITY',
        status: 'DRAFT',
        visibility: dto.visibility || 'PUBLIC',
        categoryId: dto.categoryId,
        publisherOrgId: publisherOrgId || null,
        publisherName: dto.publisherName,
        publisherEmail: dto.publisherEmail,
        publisherWebsite: dto.publisherWebsite || null,
        supportUrl: dto.supportUrl || null,
        privacyPolicyUrl: dto.privacyPolicyUrl || null,
        termsUrl: dto.termsUrl || null,
        documentationUrl: dto.documentationUrl || null,
        iconUrl: dto.iconUrl || null,
        bannerUrl: dto.bannerUrl || null,
        screenshots: dto.screenshots || [],
        badges: dto.badges || [],
        featured: dto.featured || false,
        verified: dto.verified || false,
        currentVersion: '1.0.0',
        pricingType: dto.pricingType || 'FREE',
        pricingModel: dto.pricingModel || {},
        requiredPermissions: dto.requiredPermissions || [],
        supportedScopes: dto.supportedScopes || ['ORGANISATION'],
        healthPiiRequested: dto.healthPiiRequested || false,
        capabilities: dto.capabilities || [],
        dependencies: dto.dependencies || [],
        conflicts: dto.conflicts || [],
        developerAppId: dto.developerAppId || null,
        trainerProfileId: dto.trainerProfileId || null,
        metadata: dto.metadata || {},
      },
    });

    // Create default initial version 1.0.0
    await this.prisma.marketplaceListingVersion.create({
      data: {
        listingId: listing.id,
        version: '1.0.0',
        changelog: 'Initial marketplace release',
        status: 'DRAFT',
        manifest: {
          slug: listing.slug,
          version: '1.0.0',
          entrypoint: listing.slug,
          permissions: dto.requiredPermissions || [],
        },
        requiredPermissions: dto.requiredPermissions || [],
        supportedScopes: dto.supportedScopes || ['ORGANISATION'],
        dependencies: dto.dependencies || [],
        healthPiiRequested: dto.healthPiiRequested || false,
      },
    });

    await this.audit.log({
      organisationId: publisherOrgId,
      listingId: listing.id,
      userId,
      action: MARKETPLACE_ACTIONS.LISTING_CREATED,
      resource: 'MarketplaceListing',
      resourceId: listing.id,
      details: { slug: listing.slug, type: listing.listingType },
    });

    return this.getListingById(listing.id);
  }

  /**
   * Updates an existing listing.
   */
  async updateListing(
    id: string,
    dto: UpdateMarketplaceListingDto,
    userId?: string,
  ) {
    const existing = await this.prisma.marketplaceListing.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ListingNotFoundError(id);
    }

    const updated = await this.prisma.marketplaceListing.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.tagline !== undefined ? { tagline: dto.tagline } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.listingType !== undefined ? { listingType: dto.listingType } : {}),
        ...(dto.publisherType !== undefined ? { publisherType: dto.publisherType } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.publisherName !== undefined ? { publisherName: dto.publisherName } : {}),
        ...(dto.publisherEmail !== undefined ? { publisherEmail: dto.publisherEmail } : {}),
        ...(dto.publisherWebsite !== undefined ? { publisherWebsite: dto.publisherWebsite } : {}),
        ...(dto.supportUrl !== undefined ? { supportUrl: dto.supportUrl } : {}),
        ...(dto.privacyPolicyUrl !== undefined ? { privacyPolicyUrl: dto.privacyPolicyUrl } : {}),
        ...(dto.termsUrl !== undefined ? { termsUrl: dto.termsUrl } : {}),
        ...(dto.documentationUrl !== undefined ? { documentationUrl: dto.documentationUrl } : {}),
        ...(dto.iconUrl !== undefined ? { iconUrl: dto.iconUrl } : {}),
        ...(dto.bannerUrl !== undefined ? { bannerUrl: dto.bannerUrl } : {}),
        ...(dto.screenshots !== undefined ? { screenshots: dto.screenshots } : {}),
        ...(dto.badges !== undefined ? { badges: dto.badges } : {}),
        ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.pricingType !== undefined ? { pricingType: dto.pricingType } : {}),
        ...(dto.pricingModel !== undefined ? { pricingModel: dto.pricingModel } : {}),
        ...(dto.requiredPermissions !== undefined ? { requiredPermissions: dto.requiredPermissions } : {}),
        ...(dto.supportedScopes !== undefined ? { supportedScopes: dto.supportedScopes } : {}),
        ...(dto.healthPiiRequested !== undefined ? { healthPiiRequested: dto.healthPiiRequested } : {}),
        ...(dto.capabilities !== undefined ? { capabilities: dto.capabilities } : {}),
        ...(dto.dependencies !== undefined ? { dependencies: dto.dependencies } : {}),
        ...(dto.conflicts !== undefined ? { conflicts: dto.conflicts } : {}),
        ...(dto.metadata !== undefined ? { metadata: dto.metadata } : {}),
      },
      include: {
        category: true,
        versions: true,
      },
    });

    await this.audit.log({
      organisationId: existing.publisherOrgId,
      listingId: id,
      userId,
      action: MARKETPLACE_ACTIONS.LISTING_UPDATED,
      resource: 'MarketplaceListing',
      resourceId: id,
      details: { changes: Object.keys(dto) },
    });

    return updated;
  }

  /**
   * Submits a listing for review.
   */
  async submitForReview(id: string, userId?: string) {
    const listing = await this.getListingById(id);
    if (listing.status !== 'DRAFT') {
      throw new InvalidListingStatusTransitionError(listing.status, 'UNDER_REVIEW');
    }

    const updated = await this.prisma.marketplaceListing.update({
      where: { id },
      data: { status: 'UNDER_REVIEW' },
    });

    await this.audit.log({
      organisationId: listing.publisherOrgId,
      listingId: id,
      userId,
      action: MARKETPLACE_ACTIONS.LISTING_SUBMITTED,
      resource: 'MarketplaceListing',
      resourceId: id,
    });

    return updated;
  }

  /**
   * Approves and publishes a listing.
   */
  async approveListing(id: string, adminUserId?: string) {
    const listing = await this.getListingById(id);

    const updated = await this.prisma.marketplaceListing.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        verified: true,
        publishedAt: new Date(),
        rejectionReason: null,
      },
    });

    // Also update version status
    await this.prisma.marketplaceListingVersion.updateMany({
      where: { listingId: id, version: listing.currentVersion },
      data: { status: 'PUBLISHED', releasedAt: new Date() },
    });

    await this.audit.log({
      organisationId: listing.publisherOrgId,
      listingId: id,
      userId: adminUserId,
      action: MARKETPLACE_ACTIONS.LISTING_APPROVED,
      resource: 'MarketplaceListing',
      resourceId: id,
    });

    return updated;
  }

  /**
   * Rejects a listing submission with feedback.
   */
  async rejectListing(id: string, reason: string, adminUserId?: string) {
    const listing = await this.getListingById(id);

    const updated = await this.prisma.marketplaceListing.update({
      where: { id },
      data: {
        status: 'DRAFT',
        rejectionReason: reason,
      },
    });

    await this.audit.log({
      organisationId: listing.publisherOrgId,
      listingId: id,
      userId: adminUserId,
      action: MARKETPLACE_ACTIONS.LISTING_REJECTED,
      resource: 'MarketplaceListing',
      resourceId: id,
      details: { reason },
    });

    return updated;
  }

  /**
   * Suspends an active listing.
   */
  async suspendListing(id: string, reason: string, adminUserId?: string) {
    const listing = await this.getListingById(id);

    const updated = await this.prisma.marketplaceListing.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        rejectionReason: reason,
      },
    });

    await this.audit.log({
      organisationId: listing.publisherOrgId,
      listingId: id,
      userId: adminUserId,
      action: MARKETPLACE_ACTIONS.LISTING_SUSPENDED,
      resource: 'MarketplaceListing',
      resourceId: id,
      details: { reason },
    });

    return updated;
  }

  /**
   * Creates a new version for an existing listing.
   */
  async createVersion(
    listingId: string,
    dto: CreateMarketplaceListingVersionDto,
    userId?: string,
  ) {
    const listing = await this.getListingById(listingId);

    const version = await this.prisma.marketplaceListingVersion.create({
      data: {
        listingId,
        version: dto.version,
        changelog: dto.changelog || null,
        status: 'PUBLISHED',
        manifest: dto.manifest,
        requiredPermissions: dto.requiredPermissions || (listing.requiredPermissions as string[]) || [],
        minCoreVersion: dto.minCoreVersion || null,
        supportedScopes: dto.supportedScopes || (listing.supportedScopes as string[]) || ['ORGANISATION'],
        dependencies: dto.dependencies || (listing.dependencies as any[]) || [],
        healthPiiRequested: dto.healthPiiRequested || listing.healthPiiRequested || false,
        releasedAt: new Date(),
        metadata: dto.metadata || {},
      },
    });

    // Update listing's currentVersion
    await this.prisma.marketplaceListing.update({
      where: { id: listingId },
      data: {
        currentVersion: dto.version,
      },
    });

    await this.audit.log({
      organisationId: listing.publisherOrgId,
      listingId,
      userId,
      action: MARKETPLACE_ACTIONS.VERSION_PUBLISHED,
      resource: 'MarketplaceListingVersion',
      resourceId: version.id,
      details: { version: dto.version },
    });

    return version;
  }

  async getListingById(id: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        category: true,
        versions: { orderBy: { createdAt: 'desc' } },
        developerApp: { select: { id: true, name: true, clientId: true, environment: true } },
        trainerProfile: { select: { id: true, professionalName: true, specialties: true } },
      },
    });

    if (!listing) {
      throw new ListingNotFoundError(id);
    }
    return listing;
  }

  async getListingBySlug(slug: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      include: {
        category: true,
        versions: { orderBy: { createdAt: 'desc' } },
        developerApp: { select: { id: true, name: true, clientId: true, environment: true } },
        trainerProfile: { select: { id: true, professionalName: true, specialties: true } },
      },
    });

    if (!listing) {
      throw new ListingNotFoundError(slug);
    }
    return listing;
  }

  async getPublisherListings(publisherOrgId?: string) {
    return this.prisma.marketplaceListing.findMany({
      where: publisherOrgId ? { publisherOrgId } : {},
      include: {
        category: true,
        _count: { select: { installations: true, reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminSubmissions() {
    return this.prisma.marketplaceListing.findMany({
      where: { status: { in: ['UNDER_REVIEW', 'DRAFT'] } },
      include: {
        category: true,
        publisherOrg: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
