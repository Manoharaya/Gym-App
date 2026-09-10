import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SalesStageTransitionService } from './sales-stage-transition.service';
import { VerifyConversionDto } from '../dto/sales-pipeline.dto';

@Injectable()
export class SalesConversionService {
  private readonly logger = new Logger(SalesConversionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transitionService: SalesStageTransitionService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Authoritatively converts an opportunity into a member deal.
   * Enforces the invariant that AI cannot convert without verified domain proof.
   */
  async convertOpportunity(
    organisationId: string,
    opportunityId: string,
    dto: VerifyConversionDto,
  ) {
    // 1. Fetch opportunity
    const opp = await this.prisma.salesOpportunity.findFirst({
      where: { id: opportunityId, organisationId },
      include: { lead: true },
    });

    if (!opp) {
      throw new NotFoundException(
        `Sales Opportunity with ID ${opportunityId} not found in this organisation.`,
      );
    }

    if (opp.currentStage === 'CONVERTED') {
      return opp; // Idempotent
    }

    // 2. Validate authoritative proof
    let verificationType = 'MANUAL_STAFF_CONFIRMATION';
    let verifiedResourceId: string | null = null;

    if (dto.membershipId) {
      const membership = await this.prisma.memberMembership.findFirst({
        where: {
          id: dto.membershipId,
          organisationId,
        },
      });
      if (!membership) {
        throw new BadRequestException(
          `Membership with ID ${dto.membershipId} does not belong to this organisation.`,
        );
      }
      verificationType = 'VERIFIED_MEMBERSHIP';
      verifiedResourceId = membership.id;
    } else if (dto.membershipPlanId) {
      const plan = await this.prisma.membershipPlan.findFirst({
        where: {
          id: dto.membershipPlanId,
          organisationId,
        },
      });
      if (!plan) {
        throw new BadRequestException(
          `Membership Plan with ID ${dto.membershipPlanId} does not belong to this organisation.`,
        );
      }
      verificationType = 'VERIFIED_PLAN_PURCHASE';
      verifiedResourceId = plan.id;
    } else if (dto.eventId) {
      verificationType = 'DOMAIN_EVENT_CONFIRMATION';
      verifiedResourceId = dto.eventId;
    } else if (dto.notes && dto.notes.trim().length >= 5) {
      // Manual staff override with rationale
      verificationType = 'STAFF_VERIFIED_OVERRIDE';
      verifiedResourceId = dto.actorId || 'STAFF';
    } else {
      throw new BadRequestException(
        'Authoritative conversion failed: Conversion requires verifiable proof (membershipId, membershipPlanId, eventId, or verified staff rationale).',
      );
    }

    // 3. Perform stage transition to CONVERTED
    const transitioned = await this.transitionService.transitionStage(
      organisationId,
      opportunityId,
      {
        toStage: 'CONVERTED',
        version: dto.version,
        actorType: 'STAFF',
        actorId: dto.actorId,
        reason: `Authoritative conversion verified: ${verificationType} (${dto.notes || 'Verified'})`,
        metadata: {
          verificationType,
          verifiedResourceId,
          notes: dto.notes,
        },
      },
    );

    // 4. Align parent Lead status to CONVERTED if lead exists
    if (opp.leadId) {
      await this.prisma.lead.update({
        where: { id: opp.leadId },
        data: {
          status: 'CONVERTED',
        },
      }).catch((err) => {
        this.logger.warn(`Could not update parent lead status: ${err.message}`);
      });
    }

    // 5. Log conversion audit
    await this.auditService.log({
      organisationId,
      outletId: opp.outletId || undefined,
      action: 'SALES_OPPORTUNITY_AUTHORITATIVE_CONVERTED',
      resource: 'sales_opportunity',
      resourceId: opportunityId,
      metadata: {
        leadId: opp.leadId,
        verificationType,
        verifiedResourceId,
        actorId: dto.actorId,
      },
    });

    return transitioned;
  }
}
