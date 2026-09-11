/**
 * FitCore — Day 50: Marketplace Discovery & Public Catalog Controller
 */

import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { MarketplaceDiscoveryService } from '../services/marketplace-discovery.service';
import { MarketplaceCategoryService } from '../services/marketplace-category.service';
import { MarketplacePermissionService } from '../services/marketplace-permission.service';
import { MarketplaceDiscoveryQueryDto } from '../dto/listing-query.dto';

@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly discoveryService: MarketplaceDiscoveryService,
    private readonly categoryService: MarketplaceCategoryService,
    private readonly permissionService: MarketplacePermissionService,
  ) {}

  @Public()
  @Get()
  async searchListings(
    @Query() query: MarketplaceDiscoveryQueryDto,
    @Req() req: any,
  ) {
    const requestingOrgId = req.user?.organisationId || req.headers?.['x-organisation-id'];
    return this.discoveryService.searchListings(query, requestingOrgId);
  }

  @Public()
  @Get('categories')
  async getCategories() {
    return this.categoryService.getCategories();
  }

  @Public()
  @Get('categories/:slug')
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.categoryService.getCategoryBySlug(slug);
  }

  @Public()
  @Get('featured')
  async getFeatured(@Query('limit') limit?: number) {
    return this.discoveryService.getFeaturedListings(limit ? Number(limit) : 6);
  }

  @Public()
  @Get('popular')
  async getPopular(@Query('limit') limit?: number) {
    return this.discoveryService.getPopularListings(limit ? Number(limit) : 10);
  }

  @Public()
  @Get('permissions')
  async getAvailablePermissions() {
    return {
      permissions: this.permissionService.getAvailablePermissions(),
    };
  }

  @Public()
  @Get('listings/:idOrSlug')
  async getListingDetails(
    @Param('idOrSlug') idOrSlug: string,
    @Req() req: any,
  ) {
    const requestingOrgId = req.user?.organisationId || req.headers?.['x-organisation-id'];
    return this.discoveryService.getListingDetails(idOrSlug, requestingOrgId);
  }
}
