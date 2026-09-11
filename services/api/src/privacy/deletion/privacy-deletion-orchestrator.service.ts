import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnonymizationService } from './anonymization.service';
import { PrivacyDeletionPlanDto } from '@fitcore/types';

@Injectable()
export class PrivacyDeletionOrchestratorService {
  private readonly logger = new Logger(PrivacyDeletionOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anonymizationService: AnonymizationService,
  ) {}

  /**
   * Executes an approved deletion plan across all domains in a coordinated sequence.
   */
  async executePlan(plan: any): Promise<PrivacyDeletionPlanDto> {
    const { id: planId, memberId, organisationId } = plan;

    this.logger.log(`Beginning deletion orchestration for plan ${planId} (Member: ${memberId})`);

    await this.prisma.privacyDeletionPlan.update({
      where: { id: planId },
      data: {
        status: 'EXECUTING',
        executedAt: new Date(),
      },
    });

    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member) {
      throw new Error(`MemberProfile ${memberId} not found`);
    }

    const items = await this.prisma.privacyDeletionItem.findMany({
      where: { deletionPlanId: planId },
    });

    for (const item of items) {
      try {
        let affected = 0;
        let itemStatus = 'COMPLETED';

        if (item.action === 'RETAIN') {
          // Explicit retention policy
          itemStatus = 'RETAINED';
          affected = 0;
        } else if (item.domain === 'PROFILE') {
          // Anonymize user & member profile
          const anonUser = this.anonymizationService.anonymizeUserData(member.userId);
          await this.prisma.user.update({
            where: { id: member.userId },
            data: {
              email: anonUser.email,
              firstName: anonUser.firstName,
              lastName: anonUser.lastName,
              phone: anonUser.phone,
              avatarUrl: anonUser.avatarUrl,
              status: 'ANONYMIZED',
              deletedAt: new Date(),
            },
          });

          const anonProfile = this.anonymizationService.anonymizeMemberProfile(memberId);
          await this.prisma.memberProfile.update({
            where: { id: memberId },
            data: {
              ...anonProfile,
              status: 'ARCHIVED',
              deletedAt: new Date(),
            },
          });

          itemStatus = 'ANONYMIZED';
          affected = 2;
        } else if (item.domain === 'HEALTH') {
          const screenings = await this.prisma.healthScreening.deleteMany({
            where: { memberProfileId: memberId },
          });
          const injuries = await this.prisma.injury.deleteMany({
            where: { memberProfileId: memberId },
          });
          const clearances = await this.prisma.medicalClearance.deleteMany({
            where: { memberProfileId: memberId },
          });
          affected = screenings.count + injuries.count + clearances.count;
          itemStatus = 'DELETED';
        } else if (item.domain === 'WEARABLES') {
          const records = await this.prisma.healthDataRecord.deleteMany({
            where: { memberId },
          });
          // Disconnect connections and revoke tokens
          await this.prisma.wearableConnection.updateMany({
            where: { memberId },
            data: {
              status: 'DISCONNECTED',
              encryptedAccessToken: null,
              encryptedRefreshToken: null,
              revokedAt: new Date(),
            },
          });
          affected = records.count;
          itemStatus = 'DELETED';
        } else if (item.domain === 'TRAINING') {
          const workouts = await this.prisma.workout.deleteMany({
            where: { memberProfileId: memberId },
          });
          const measurements = await this.prisma.bodyMeasurement.deleteMany({
            where: { memberProfileId: memberId },
          });
          const prs = await this.prisma.personalRecord.deleteMany({
            where: { memberProfileId: memberId },
          });
          affected = workouts.count + measurements.count + prs.count;
          itemStatus = 'DELETED';
        } else if (item.domain === 'NUTRITION') {
          const logs = await this.prisma.foodLog.deleteMany({
            where: { memberProfileId: memberId },
          });
          affected = logs.count;
          itemStatus = 'DELETED';
        } else if (item.domain === 'AI') {
          const requests = await this.prisma.aIRequest.deleteMany({
            where: { memberId },
          });
          affected = requests.count;
          itemStatus = 'DELETED';
        } else if (item.domain === 'COMMUNICATION') {
          const comms = await this.prisma.communication.deleteMany({
            where: { recipientMemberId: memberId },
          });
          affected = comms.count;
          itemStatus = 'DELETED';
        } else if (item.domain === 'DOCUMENTS') {
          const docs = await this.prisma.memberDocument.deleteMany({
            where: { memberProfileId: memberId },
          });
          affected = docs.count;
          itemStatus = 'DELETED';
        } else if (item.domain === 'ENGAGEMENT') {
          const engagement = await this.prisma.engagementEvent.deleteMany({
            where: { memberId },
          });
          affected = engagement.count;
          itemStatus = 'DELETED';
        }

        await this.prisma.privacyDeletionItem.update({
          where: { id: item.id },
          data: {
            status: itemStatus,
            recordsAffected: affected,
            executedAt: new Date(),
          },
        });
      } catch (err: any) {
        this.logger.error(
          `Deletion failed for domain ${item.domain} in plan ${planId}: ${err.message}`,
        );
        await this.prisma.privacyDeletionItem.update({
          where: { id: item.id },
          data: {
            status: 'FAILED',
            errorMessage: err.message,
          },
        });
      }
    }

    // Check if any items failed
    const finalItems = await this.prisma.privacyDeletionItem.findMany({
      where: { deletionPlanId: planId },
    });

    const hasFailure = finalItems.some((i) => i.status === 'FAILED');
    const finalStatus = hasFailure ? 'FAILED' : 'COMPLETED';

    const updatedPlan = await this.prisma.privacyDeletionPlan.update({
      where: { id: planId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
      },
      include: { items: true },
    });

    // If linked to a privacy request, complete it
    if (plan.privacyRequestId) {
      await this.prisma.privacyRequest.update({
        where: { id: plan.privacyRequestId },
        data: {
          status: hasFailure ? 'FAILED' : 'COMPLETED',
          completedAt: new Date(),
          resolution: hasFailure
            ? 'Partial deletion completed; review required for failed items'
            : 'Deletion plan executed successfully across all applicable domains.',
        },
      });
    }

    this.logger.log(`Completed deletion plan ${planId} with status ${finalStatus}`);

    return {
      id: updatedPlan.id,
      privacyRequestId: updatedPlan.privacyRequestId,
      organisationId: updatedPlan.organisationId,
      memberId: updatedPlan.memberId,
      status: updatedPlan.status,
      requiresReview: updatedPlan.requiresReview,
      reviewReason: updatedPlan.reviewReason,
      reviewedBy: updatedPlan.reviewedBy,
      reviewedAt: updatedPlan.reviewedAt?.toISOString() || null,
      executedAt: updatedPlan.executedAt?.toISOString() || null,
      completedAt: updatedPlan.completedAt?.toISOString() || null,
      items: updatedPlan.items.map((i: any) => ({
        id: i.id,
        domain: i.domain,
        entity: i.entity,
        action: i.action,
        status: i.status,
        retentionReason: i.retentionReason,
        recordsAffected: i.recordsAffected,
        executedAt: i.executedAt?.toISOString() || null,
        errorMessage: i.errorMessage,
      })),
      createdAt: updatedPlan.createdAt.toISOString(),
    };
  }
}
