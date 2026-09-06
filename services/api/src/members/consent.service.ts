import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RecordConsentDto } from './dto/member-domain.dto';

@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  /**
   * Retrieves all consent types, active versions, and the member's current record.
   */
  async getConsentRequirements(userId: string) {
    const profile = await this.prisma.memberProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Member profile not found');
    }

    const consentTypes = await this.prisma.consentType.findMany({
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        records: {
          where: { memberProfileId: profile.id },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return consentTypes.map((ct) => {
      const activeVersion = ct.versions[0];
      const latestRecord = ct.records[0];

      return {
        consentTypeId: ct.id,
        key: ct.key,
        name: ct.name,
        description: ct.description,
        isMandatory: ct.isMandatory,
        activeVersion: activeVersion
          ? {
              id: activeVersion.id,
              version: activeVersion.version,
              content: activeVersion.content,
            }
          : null,
        currentStatus: latestRecord ? latestRecord.status : 'NOT_RECORDED',
        consentedAt: latestRecord?.consentedAt,
        withdrawnAt: latestRecord?.withdrawnAt,
      };
    });
  }

  /**
   * Records member consent or decline.
   */
  async recordConsent(
    userId: string,
    dto: RecordConsentDto,
    ipAddress?: string,
    userAgent?: string
  ) {
    const profile = await this.prisma.memberProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Member profile not found');
    }

    const consentType = await this.prisma.consentType.findUnique({
      where: { id: dto.consentTypeId },
    });
    if (!consentType) {
      throw new NotFoundException('Consent type not found');
    }

    // Mandatory consents cannot be declined
    if (consentType.isMandatory && dto.status === 'DECLINED') {
      throw new BadRequestException('Mandatory consent cannot be declined to proceed');
    }

    const record = await this.prisma.consentRecord.create({
      data: {
        memberProfileId: profile.id,
        consentTypeId: dto.consentTypeId,
        consentVersionId: dto.consentVersionId,
        status: dto.status,
        consentedAt: new Date(),
        ipAddress,
        userAgent,
      },
      include: { consentType: true, consentVersion: true },
    });

    await this.audit.log({
      userId,
      organisationId: profile.organisationId,
      action: dto.status === 'CONSENTED' ? 'CONSENT_GRANTED' : 'CONSENT_DECLINED',
      resource: 'consent_records',
      resourceId: record.id,
      metadata: {
        consentKey: consentType.key,
        version: record.consentVersion.version,
      },
      ipAddress,
      userAgent,
    });

    return record;
  }

  /**
   * Withdraws an existing consent without deleting historical audit records.
   */
  async withdrawConsent(
    userId: string,
    consentTypeId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const profile = await this.prisma.memberProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Member profile not found');
    }

    const consentType = await this.prisma.consentType.findUnique({
      where: { id: consentTypeId },
    });
    if (!consentType) {
      throw new NotFoundException('Consent type not found');
    }

    const latestActiveRecord = await this.prisma.consentRecord.findFirst({
      where: {
        memberProfileId: profile.id,
        consentTypeId,
        status: 'CONSENTED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestActiveRecord) {
      throw new NotFoundException('No active consent found to withdraw');
    }

    const updated = await this.prisma.consentRecord.update({
      where: { id: latestActiveRecord.id },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
      },
    });

    await this.audit.log({
      userId,
      organisationId: profile.organisationId,
      action: 'CONSENT_WITHDRAWN',
      resource: 'consent_records',
      resourceId: updated.id,
      metadata: { consentKey: consentType.key },
      ipAddress,
      userAgent,
    });

    return updated;
  }
}
