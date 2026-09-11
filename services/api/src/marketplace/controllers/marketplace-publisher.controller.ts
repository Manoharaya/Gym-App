/**
 * FitCore — Day 50: Marketplace Publisher Management & Portal Controller
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { MarketplaceListingService } from '../services/marketplace-listing.service';
import { MarketplaceAnalyticsService } from '../services/marketplace-analytics.service';
import {
  CreateMarketplaceListingDto,
  CreateMarketplaceListingVersionDto,
  UpdateMarketplaceListingDto,
} from '../dto';

@Controller('marketplace/publisher')
@UseGuards(JwtAuthGuard)
export class MarketplacePublisherController {
  constructor(
    private readonly listingService: MarketplaceListingService,
    private readonly analyticsService: MarketplaceAnalyticsService,
  ) {}

  private extractPublisherOrgId(user: AuthenticatedUser, req: any): string | undefined {
    return (
      req?.headers?.['x-organisation-id'] ||
      req?.headers?.['X-Organisation-Id'] ||
      user?.primaryOrganisationId ||
      user?.roles?.[0]?.organisationId ||
      undefined
    );
  }

  @Post('listings')
  async createListing(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMarketplaceListingDto,
    @Req() req: any,
  ) {
    const publisherOrgId = this.extractPublisherOrgId(user, req);
    return this.listingService.createListing(dto, publisherOrgId, user.id);
  }

  @Get('listings')
  async listPublisherListings(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
  ) {
    const publisherOrgId = user.isSuperAdmin ? undefined : this.extractPublisherOrgId(user, req);
    return this.listingService.getPublisherListings(publisherOrgId);
  }

  @Get('listings/:id')
  async getPublisherListing(@Param('id') id: string) {
    return this.listingService.getListingById(id);
  }

  @Patch('listings/:id')
  async updateListing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMarketplaceListingDto,
  ) {
    return this.listingService.updateListing(id, dto, user.id);
  }

  @Post('listings/:id/submit')
  async submitForReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.listingService.submitForReview(id, user.id);
  }

  @Post('listings/:id/versions')
  async createVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateMarketplaceListingVersionDto,
  ) {
    return this.listingService.createVersion(id, dto, user.id);
  }

  @Get('analytics')
  async getPublisherAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
  ) {
    const publisherOrgId = user.isSuperAdmin ? undefined : this.extractPublisherOrgId(user, req);
    return this.analyticsService.getPublisherAnalytics(publisherOrgId);
  }
}
