import { Injectable } from '@nestjs/common';
import { MembershipAccessPolicy, AccessDecisionResult } from './policies/membership-access.policy';

@Injectable()
export class MembershipAccessService {
  constructor(private readonly accessPolicy: MembershipAccessPolicy) {}

  /**
   * Evaluates whether a member can access a facility outlet.
   * Invariant: MemberOutlet does not authorize physical gym access.
   * Access is determined by active membership + entitlements + access scope.
   */
  async canAccessOutlet(
    memberProfileId: string,
    outletId: string,
    entitlementType: string = 'GYM_ACCESS'
  ): Promise<AccessDecisionResult> {
    return this.accessPolicy.canAccessOutlet(memberProfileId, outletId, entitlementType);
  }
}
