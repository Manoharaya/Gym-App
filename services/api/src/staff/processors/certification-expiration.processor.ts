import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';

export interface ExpirationScanResult {
  expiredCertificationsCount: number;
  expiringSoonCertificationsCount: number;
  expiredInvitationsCount: number;
  expiredCertIds: string[];
  expiringSoonCertIds: string[];
  expiredInvitationIds: string[];
}

@Injectable()
export class CertificationExpirationProcessor {
  private readonly logger = new Logger(CertificationExpirationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Scans and updates certifications nearing or past expiry date,
   * and marks expired staff invitations.
   * Fully idempotent: only updates and audits records whose status changes.
   */
  async processAllExpirations(organisationId?: string): Promise<ExpirationScanResult> {
    const now = new Date();
    const ninetyDaysAhead = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const expiredCertIds: string[] = [];
    const expiringSoonCertIds: string[] = [];
    const expiredInvitationIds: string[] = [];

    // 1. Process certifications that have expired (expiryDate < now and status != 'EXPIRED' and status != 'REVOKED')
    const certWhere: any = {
      expiryDate: { lte: now },
      status: { notIn: ['EXPIRED', 'REVOKED'] },
    };

    if (organisationId) {
      certWhere.trainerProfile = {
        staffProfile: {
          organisationId,
        },
      };
    }

    const expiredCerts = await this.prisma.trainerCertification.findMany({
      where: certWhere,
      include: {
        trainerProfile: {
          include: {
            staffProfile: true,
          },
        },
      },
    });

    for (const cert of expiredCerts) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.trainerCertification.update({
            where: { id: cert.id },
            data: { status: 'EXPIRED' },
          });

          await this.auditService.log({
            organisationId: cert.trainerProfile.staffProfile.organisationId,
            userId: undefined,
            action: 'TRAINER_CERTIFICATION_EXPIRED',
            resource: 'certifications',
            resourceId: cert.id,
            metadata: {
              trainerProfileId: cert.trainerProfileId,
              certificationName: cert.certificationName,
              expiryDate: cert.expiryDate?.toISOString(),
            },
          });
        });
        expiredCertIds.push(cert.id);
      } catch (err: any) {
        this.logger.error(`Error expiring certification ${cert.id}: ${err.message}`);
      }
    }

    // 2. Process certifications expiring soon (now < expiryDate <= 90 days and status == 'ACTIVE')
    const expiringSoonWhere: any = {
      expiryDate: {
        gt: now,
        lte: ninetyDaysAhead,
      },
      status: 'ACTIVE',
    };

    if (organisationId) {
      expiringSoonWhere.trainerProfile = {
        staffProfile: {
          organisationId,
        },
      };
    }

    const expiringSoonCerts = await this.prisma.trainerCertification.findMany({
      where: expiringSoonWhere,
      include: {
        trainerProfile: {
          include: {
            staffProfile: true,
          },
        },
      },
    });

    for (const cert of expiringSoonCerts) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.trainerCertification.update({
            where: { id: cert.id },
            data: { status: 'EXPIRING_SOON' },
          });

          await this.auditService.log({
            organisationId: cert.trainerProfile.staffProfile.organisationId,
            userId: undefined,
            action: 'TRAINER_CERTIFICATION_EXPIRING',
            resource: 'certifications',
            resourceId: cert.id,
            metadata: {
              trainerProfileId: cert.trainerProfileId,
              certificationName: cert.certificationName,
              expiryDate: cert.expiryDate?.toISOString(),
              daysUntilExpiry: Math.ceil(
                ((cert.expiryDate?.getTime() || 0) - now.getTime()) / (1000 * 60 * 60 * 24),
              ),
            },
          });
        });
        expiringSoonCertIds.push(cert.id);
      } catch (err: any) {
        this.logger.error(`Error marking certification ${cert.id} expiring soon: ${err.message}`);
      }
    }

    // 3. Process expired staff invitations (expiresAt <= now and status == 'PENDING')
    const invWhere: any = {
      expiresAt: { lte: now },
      status: 'PENDING',
    };

    if (organisationId) {
      invWhere.organisationId = organisationId;
    }

    const expiredInvitations = await this.prisma.invitation.findMany({
      where: invWhere,
    });

    for (const inv of expiredInvitations) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.invitation.update({
            where: { id: inv.id },
            data: { status: 'EXPIRED' },
          });

          await this.auditService.log({
            organisationId: inv.organisationId,
            userId: undefined,
            action: 'STAFF_INVITATION_EXPIRED',
            resource: 'staff',
            resourceId: inv.id,
            metadata: {
              email: inv.email,
              roleId: inv.roleId,
              expiresAt: inv.expiresAt.toISOString(),
            },
          });
        });
        expiredInvitationIds.push(inv.id);
      } catch (err: any) {
        this.logger.error(`Error expiring invitation ${inv.id}: ${err.message}`);
      }
    }

    this.logger.log(
      `Processed expirations: ${expiredCertIds.length} expired certs, ${expiringSoonCertIds.length} expiring soon certs, ${expiredInvitationIds.length} expired invitations.`,
    );

    return {
      expiredCertificationsCount: expiredCertIds.length,
      expiringSoonCertificationsCount: expiringSoonCertIds.length,
      expiredInvitationsCount: expiredInvitationIds.length,
      expiredCertIds,
      expiringSoonCertIds,
      expiredInvitationIds,
    };
  }
}
