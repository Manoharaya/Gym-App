/**
 * FitCore — Day 49: Developer Platform Module
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { BookingsModule } from '../bookings/bookings.module';

// Controllers
import { PublicApiController } from './controllers/public-api.controller';
import { DeveloperPlatformController } from './controllers/developer-platform.controller';
import { OAuthController } from './controllers/oauth.controller';

// Services
import { DeveloperSecurityService } from './services/developer-security.service';
import { ApiScopeService } from './services/api-scope.service';
import { ApiVersionService } from './services/api-version.service';
import { ApiAuditService } from './services/api-audit.service';
import { ApiRateLimitService } from './services/api-rate-limit.service';
import { ApiKeyService } from './services/api-key.service';
import { DeveloperApplicationService } from './services/developer-application.service';
import { ApiAuthorizationService } from './services/api-authorization.service';
import { OAuthService } from './services/oauth.service';
import { OAuthConsentService } from './services/oauth-consent.service';
import { WebhookSigningService } from './services/webhook-signing.service';
import { WebhookSubscriptionService } from './services/webhook-subscription.service';
import { WebhookDeliveryService } from './services/webhook-delivery.service';
import { ApiUsageService } from './services/api-usage.service';
import { DeveloperSandboxService } from './services/developer-sandbox.service';

// Guards
import { DeveloperApiAuthGuard } from './guards/developer-api-auth.guard';
import { DeveloperScopeGuard } from './guards/developer-scope.guard';

@Module({
  imports: [DatabaseModule, RedisModule, BookingsModule],
  controllers: [
    PublicApiController,
    DeveloperPlatformController,
    OAuthController,
  ],
  providers: [
    DeveloperSecurityService,
    ApiScopeService,
    ApiVersionService,
    ApiAuditService,
    ApiRateLimitService,
    ApiKeyService,
    DeveloperApplicationService,
    ApiAuthorizationService,
    OAuthService,
    OAuthConsentService,
    WebhookSigningService,
    WebhookSubscriptionService,
    WebhookDeliveryService,
    ApiUsageService,
    DeveloperSandboxService,
    DeveloperApiAuthGuard,
    DeveloperScopeGuard,
  ],
  exports: [
    DeveloperSecurityService,
    ApiScopeService,
    ApiVersionService,
    ApiAuditService,
    ApiRateLimitService,
    ApiKeyService,
    DeveloperApplicationService,
    ApiAuthorizationService,
    OAuthService,
    OAuthConsentService,
    WebhookSigningService,
    WebhookSubscriptionService,
    WebhookDeliveryService,
    ApiUsageService,
    DeveloperSandboxService,
    DeveloperApiAuthGuard,
    DeveloperScopeGuard,
  ],
})
export class DeveloperPlatformModule {}
