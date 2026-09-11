import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MarketplaceAnalyticsService {
  private readonly logger = new Logger(MarketplaceAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordListingView(listingId: string): Promise<void> {
    try {
      await this.prisma.marketplaceListing.update({
        where: { id: listingId },
        data: {
          viewCount: { increment: 1 },
        },
      });
    } catch (err: any) {
      this.logger.debug(`Could not increment view count: ${err.message}`);
    }
  }

  async incrementInstallCount(listingId: string): Promise<void> {
    try {
      await this.prisma.marketplaceListing.update({
        where: { id: listingId },
        data: {
          installCount: { increment: 1 },
        },
      });
    } catch (err: any) {
      this.logger.debug(`Could not increment install count: ${err.message}`);
    }
  }

  async getPublisherAnalytics(publisherOrgId?: string) {
    const where = publisherOrgId ? { publisherOrgId } : {};

    const listings = await this.prisma.marketplaceListing.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        installCount: true,
        viewCount: true,
        ratingAverage: true,
        reviewCount: true,
        pricingType: true,
        createdAt: true,
      },
    });

    const totalViews = listings.reduce((acc, l) => acc + l.viewCount, 0);
    const totalInstalls = listings.reduce((acc, l) => acc + l.installCount, 0);
    const totalReviews = listings.reduce((acc, l) => acc + l.reviewCount, 0);
    const avgRating =
      listings.length > 0
        ? Number((listings.reduce((acc, l) => acc + l.ratingAverage, 0) / listings.length).toFixed(2))
        : 0;

    return {
      overview: {
        totalListings: listings.length,
        totalViews,
        totalInstalls,
        totalReviews,
        avgRating,
      },
      listings,
    };
  }
}
