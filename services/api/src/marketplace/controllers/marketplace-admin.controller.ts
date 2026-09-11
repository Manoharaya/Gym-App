/**
 * FitCore — Day 50: Marketplace Admin & Moderation Controller
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { MarketplaceListingService } from '../services/marketplace-listing.service';
import { MarketplaceReviewService } from '../services/marketplace-review.service';
import { ModerateMarketplaceReviewDto } from '../dto/review-moderation.dto';

@Controller('marketplace/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketplaceAdminController {
  constructor(
    private readonly listingService: MarketplaceListingService,
    private readonly reviewService: MarketplaceReviewService,
  ) {}

  private verifyAdmin(user: AuthenticatedUser) {
    const isOwner = user.roles?.some((r) => r.role === 'ORGANISATION_OWNER' || r.role === 'SUPERADMIN');
    if (!user.isSuperAdmin && !isOwner) {
      throw new ForbiddenException('Marketplace administrative actions require Superadmin or Owner privileges');
    }
  }

  @Get('submissions')
  async listSubmissions(@CurrentUser() user: AuthenticatedUser) {
    this.verifyAdmin(user);
    return this.listingService.getAdminSubmissions();
  }

  @Post('listings/:id/approve')
  async approveListing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    this.verifyAdmin(user);
    return this.listingService.approveListing(id, user.id);
  }

  @Post('listings/:id/reject')
  async rejectListing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    this.verifyAdmin(user);
    return this.listingService.rejectListing(id, reason || 'Did not meet marketplace quality guidelines', user.id);
  }

  @Post('listings/:id/suspend')
  async suspendListing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    this.verifyAdmin(user);
    return this.listingService.suspendListing(id, reason || 'Suspended by platform administration', user.id);
  }

  @Post('reviews/:id/moderate')
  async moderateReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ModerateMarketplaceReviewDto,
  ) {
    this.verifyAdmin(user);
    return this.reviewService.moderateReview(id, dto, user.id);
  }
}
