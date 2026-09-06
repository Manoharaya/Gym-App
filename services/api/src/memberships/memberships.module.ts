import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { MembershipPlansController } from './controllers/membership-plans.controller';
import { MembershipsController } from './controllers/memberships.controller';
import { MembershipPlanService } from './membership-plan.service';
import { MembershipsService } from './memberships.service';
import { MembershipLifecycleService } from './membership-lifecycle.service';
import { MembershipRenewalService } from './membership-renewal.service';
import { MembershipExpirationProcessor } from './membership-expiration.processor';
import { MembershipDateService } from './membership-date.service';
import { MembershipAccessPolicy } from './policies/membership-access.policy';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [MembershipPlansController, MembershipsController],
  providers: [
    MembershipPlanService,
    MembershipsService,
    MembershipLifecycleService,
    MembershipRenewalService,
    MembershipExpirationProcessor,
    MembershipDateService,
    MembershipAccessPolicy,
  ],
  exports: [
    MembershipPlanService,
    MembershipsService,
    MembershipAccessPolicy,
    MembershipLifecycleService,
    MembershipRenewalService,
  ],
})
export class MembershipsModule {}
