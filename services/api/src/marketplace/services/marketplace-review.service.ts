import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  DuplicateReviewError,
  ListingNotFoundError,
  UnverifiedReviewerError,
} from '../domain/marketplace-errors';
import { CreateMarketplaceReviewDto, ModerateMarketplaceReviewDto } from '../dto';
import { MarketplaceAuditService } from './marketplace-audit.service';
import { MARKETPLACE_ACTIONS } from '../domain/marketplace-events';

@Injectable()
export class MarketplaceReviewService {
  private readonly logger = new Logger(MarketplaceReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: MarketplaceAuditService,
  ) {}

  /**
   * Creates a verified installation review.
   */
  async createReview(
    listingId: string,
    organisationId: string,
    userId: string,
    dto: CreateMarketplaceReviewDto,
  ) {
    // 1. Verify listing exists
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) {
      throw new ListingNotFoundError(listingId);
    }

    // 2. Verify installation exists for this organisation (Verified Customer)
    const installation = await this.prisma.marketplaceInstallation.findFirst({
      where: {
        listingId,
        organisationId,
      },
    });

    if (!installation) {
      throw new UnverifiedReviewerError(listing.title);
    }

    // 3. Check for existing review
    const existing = await this.prisma.marketplaceReview.findUnique({
      where: {
        listingId_organisationId: {
          listingId,
          organisationId,
        },
      },
    });

    if (existing) {
      throw new DuplicateReviewError(listingId);
    }

    // 4. Create review
    const review = await this.prisma.marketplaceReview.create({
      data: {
        listingId,
        organisationId,
        userId,
        rating: dto.rating,
        title: dto.title || null,
        comment: dto.comment,
        status: 'PUBLISHED',
        isVerifiedInstallation: true,
      },
    });

    // 5. Update aggregate rating and count on listing
    await this.recalculateListingRating(listingId);

    // 6. Audit
    await this.audit.log({
      organisationId,
      listingId,
      userId,
      action: MARKETPLACE_ACTIONS.REVIEW_CREATED,
      resource: 'MarketplaceReview',
      resourceId: review.id,
      details: { rating: dto.rating },
    });

    return review;
  }

  /**
   * Returns reviews for a listing.
   */
  async getReviewsForListing(listingId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      this.prisma.marketplaceReview.findMany({
        where: {
          listingId,
          status: 'PUBLISHED',
        },
        include: {
          organisation: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, firstName: true, lastName: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.marketplaceReview.count({
        where: {
          listingId,
          status: 'PUBLISHED',
        },
      }),
    ]);

    return {
      reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Flags a review for moderation.
   */
  async flagReview(reviewId: string, reason: string, userId?: string) {
    const review = await this.prisma.marketplaceReview.update({
      where: { id: reviewId },
      data: {
        status: 'FLAGGED',
        moderationNotes: reason,
      },
    });

    await this.audit.log({
      organisationId: review.organisationId,
      listingId: review.listingId,
      userId,
      action: MARKETPLACE_ACTIONS.REVIEW_FLAGGED,
      resource: 'MarketplaceReview',
      resourceId: review.id,
      details: { reason },
    });

    return review;
  }

  /**
   * Superadmin moderates a review (publish, hide, remove).
   */
  async moderateReview(reviewId: string, dto: ModerateMarketplaceReviewDto, adminUserId?: string) {
    const review = await this.prisma.marketplaceReview.update({
      where: { id: reviewId },
      data: {
        status: dto.status,
        moderationNotes: dto.moderationNotes || null,
      },
    });

    // Recalculate listing rating (in case review was hidden or removed)
    await this.recalculateListingRating(review.listingId);

    await this.audit.log({
      organisationId: review.organisationId,
      listingId: review.listingId,
      userId: adminUserId,
      action: MARKETPLACE_ACTIONS.REVIEW_MODERATED,
      resource: 'MarketplaceReview',
      resourceId: review.id,
      details: { status: dto.status, notes: dto.moderationNotes },
    });

    return review;
  }

  /**
   * Recalculates the ratingAverage and reviewCount on a listing.
   */
  private async recalculateListingRating(listingId: string): Promise<void> {
    const stats = await this.prisma.marketplaceReview.aggregate({
      where: {
        listingId,
        status: 'PUBLISHED',
      },
      _avg: { rating: true },
      _count: { id: true },
    });

    await this.prisma.marketplaceListing.update({
      where: { id: listingId },
      data: {
        ratingAverage: stats._avg.rating ? Number(stats._avg.rating.toFixed(2)) : 0.0,
        reviewCount: stats._count.id || 0,
      },
    });
  }
}
