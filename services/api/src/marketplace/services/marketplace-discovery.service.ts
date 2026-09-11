import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MarketplaceDiscoveryQueryDto } from '../dto/listing-query.dto';
import { ListingNotFoundError } from '../domain/marketplace-errors';
import { MarketplaceAnalyticsService } from './marketplace-analytics.service';

@Injectable()
export class MarketplaceDiscoveryService {
  private readonly logger = new Logger(MarketplaceDiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: MarketplaceAnalyticsService,
  ) {}

  /**
   * Discovers and searches published marketplace listings.
   */
  async searchListings(query: MarketplaceDiscoveryQueryDto, requestingOrgId?: string) {
    const {
      search,
      categoryId,
      categorySlug,
      listingType,
      pricingType,
      featured,
      verified,
      sort = 'popular',
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;

    // Visibility filter: PUBLISHED status is required.
    // Public listings are visible to all. Private listings are visible only to the publisherOrgId.
    const visibilityCondition: any = requestingOrgId
      ? {
          OR: [
            { visibility: 'PUBLIC' },
            { visibility: 'PRIVATE', publisherOrgId: requestingOrgId },
          ],
        }
      : { visibility: 'PUBLIC' };

    const where: any = {
      status: 'PUBLISHED',
      ...visibilityCondition,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (listingType) {
      where.listingType = listingType;
    }

    if (pricingType) {
      where.pricingType = pricingType;
    }

    if (featured !== undefined) {
      where.featured = featured;
    }

    if (verified !== undefined) {
      where.verified = verified;
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { tagline: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { capabilities: { has: term } },
      ];
    }

    // Determine sorting
    let orderBy: any = [{ installCount: 'desc' }, { ratingAverage: 'desc' }];
    if (sort === 'rating') {
      orderBy = [{ ratingAverage: 'desc' }, { reviewCount: 'desc' }];
    } else if (sort === 'newest') {
      orderBy = [{ createdAt: 'desc' }];
    } else if (sort === 'name') {
      orderBy = [{ title: 'asc' }];
    }

    const [items, total] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where,
        include: {
          category: {
            select: { id: true, slug: true, name: true, icon: true },
          },
          _count: {
            select: {
              reviews: { where: { status: 'PUBLISHED' } },
              installations: { where: { status: 'ACTIVE' } },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.marketplaceListing.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves featured listings.
   */
  async getFeaturedListings(limit: number = 6) {
    return this.prisma.marketplaceListing.findMany({
      where: {
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        featured: true,
      },
      include: {
        category: {
          select: { id: true, slug: true, name: true, icon: true },
        },
      },
      orderBy: [{ installCount: 'desc' }, { ratingAverage: 'desc' }],
      take: limit,
    });
  }

  /**
   * Retrieves popular listings.
   */
  async getPopularListings(limit: number = 10) {
    return this.prisma.marketplaceListing.findMany({
      where: {
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      },
      include: {
        category: {
          select: { id: true, slug: true, name: true, icon: true },
        },
      },
      orderBy: [{ installCount: 'desc' }, { ratingAverage: 'desc' }],
      take: limit,
    });
  }

  /**
   * Retrieves full details for a listing by id or slug, increments view count.
   */
  async getListingDetails(idOrSlug: string, requestingOrgId?: string) {
    const isCuid = idOrSlug.startsWith('c') && idOrSlug.length > 20;

    const listing = await this.prisma.marketplaceListing.findFirst({
      where: {
        OR: isCuid ? [{ id: idOrSlug }, { slug: idOrSlug }] : [{ slug: idOrSlug }, { id: idOrSlug }],
      },
      include: {
        category: true,
        versions: {
          where: { status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            version: true,
            changelog: true,
            requiredPermissions: true,
            supportedScopes: true,
            healthPiiRequested: true,
            releasedAt: true,
          },
        },
        reviews: {
          where: { status: 'PUBLISHED' },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            organisation: { select: { name: true } },
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!listing) {
      throw new ListingNotFoundError(idOrSlug);
    }

    // Check visibility permissions
    if (listing.visibility === 'PRIVATE' && listing.publisherOrgId !== requestingOrgId) {
      throw new ListingNotFoundError(idOrSlug);
    }

    // Record view asynchronously
    this.analytics.recordListingView(listing.id);

    return listing;
  }
}
