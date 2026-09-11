/**
 * FitCore — Day 50: Marketplace Reviews Controller
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { MarketplaceReviewService } from '../services/marketplace-review.service';
import { CreateMarketplaceReviewDto, FlagMarketplaceReviewDto } from '../dto';

@Controller('marketplace')
export class MarketplaceReviewController {
  constructor(private readonly reviewService: MarketplaceReviewService) {}

  private extractOrgId(user: AuthenticatedUser, req: any): string {
    const orgId =
      req?.headers?.['x-organisation-id'] ||
      req?.headers?.['X-Organisation-Id'] ||
      user?.primaryOrganisationId ||
      user?.roles?.[0]?.organisationId;

    if (!orgId) {
      throw new BadRequestException('Organisation context is required to review an installed application');
    }
    return orgId;
  }

  @Post('listings/:id/reviews')
  @UseGuards(JwtAuthGuard)
  async createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') listingId: string,
    @Body() dto: CreateMarketplaceReviewDto,
    @Req() req: any,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.reviewService.createReview(listingId, orgId, user.id, dto);
  }

  @Public()
  @Get('listings/:id/reviews')
  async getReviews(
    @Param('id') listingId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.getReviewsForListing(
      listingId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Post('reviews/:id/flag')
  @UseGuards(JwtAuthGuard)
  async flagReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reviewId: string,
    @Body() dto: FlagMarketplaceReviewDto,
  ) {
    return this.reviewService.flagReview(reviewId, dto.reason, user.id);
  }
}
