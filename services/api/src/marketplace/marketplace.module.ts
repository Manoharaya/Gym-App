/**
 * FitCore — Day 50: Marketplace Module
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';

// Controllers
import { MarketplaceController } from './controllers/marketplace.controller';
import { MarketplaceInstallationController } from './controllers/marketplace-installation.controller';
import { MarketplacePublisherController } from './controllers/marketplace-publisher.controller';
import { MarketplaceAdminController } from './controllers/marketplace-admin.controller';
import { MarketplaceReviewController } from './controllers/marketplace-review.controller';

// Services
import { MarketplaceAuditService } from './services/marketplace-audit.service';
import { MarketplaceCategoryService } from './services/marketplace-category.service';
import { MarketplacePermissionService } from './services/marketplace-permission.service';
import { MarketplaceDependencyService } from './services/marketplace-dependency.service';
import { MarketplaceInstallationValidatorService } from './services/marketplace-installation-validator.service';
import { MarketplaceHealthService } from './services/marketplace-health.service';
import { MarketplaceAnalyticsService } from './services/marketplace-analytics.service';
import { MarketplaceReviewService } from './services/marketplace-review.service';
import { MarketplaceListingService } from './services/marketplace-listing.service';
import { MarketplaceInstallationService } from './services/marketplace-installation.service';
import { MarketplaceDiscoveryService } from './services/marketplace-discovery.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    MarketplaceController,
    MarketplaceInstallationController,
    MarketplacePublisherController,
    MarketplaceAdminController,
    MarketplaceReviewController,
  ],
  providers: [
    MarketplaceAuditService,
    MarketplaceCategoryService,
    MarketplacePermissionService,
    MarketplaceDependencyService,
    MarketplaceInstallationValidatorService,
    MarketplaceHealthService,
    MarketplaceAnalyticsService,
    MarketplaceReviewService,
    MarketplaceListingService,
    MarketplaceInstallationService,
    MarketplaceDiscoveryService,
  ],
  exports: [
    MarketplaceDiscoveryService,
    MarketplaceInstallationService,
    MarketplaceListingService,
    MarketplacePermissionService,
    MarketplaceHealthService,
    MarketplaceCategoryService,
  ],
})
export class MarketplaceModule {}
