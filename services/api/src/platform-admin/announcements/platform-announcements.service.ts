import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CommunicationsService } from '../../communications/communications.service';
import { CreateAnnouncementDto } from '../dto/platform-admin.dto';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';

@Injectable()
export class PlatformAnnouncementsService {
  private readonly logger = new Logger(PlatformAnnouncementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly communicationsService: CommunicationsService,
  ) {}

  /**
   * Publishes an internal platform announcement.
   */
  async createAnnouncement(dto: CreateAnnouncementDto, actor: AuthenticatedUser) {
    const announcement = await this.prisma.platformAnnouncement.create({
      data: {
        title: dto.title,
        content: dto.content,
        category: dto.category,
        targetAudience: dto.targetAudience || 'ALL',
        targetOrgIds: dto.targetOrgIds || [],
        publishedAt: new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: true,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      action: 'PLATFORM_ANNOUNCEMENT_CREATED',
      resource: 'platform_announcement',
      resourceId: announcement.id,
      metadata: { title: dto.title, category: dto.category, targetAudience: dto.targetAudience },
    });

    return announcement;
  }

  /**
   * Lists active platform announcements.
   */
  async listAnnouncements(query?: { isActive?: boolean; category?: string }) {
    const where: any = {};
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.category) where.category = query.category;

    return this.prisma.platformAnnouncement.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
    });
  }

  /**
   * Deactivates an announcement.
   */
  async deactivateAnnouncement(announcementId: string, actor: AuthenticatedUser) {
    const announcement = await this.prisma.platformAnnouncement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      throw new NotFoundException(`Announcement ${announcementId} not found`);
    }

    const updated = await this.prisma.platformAnnouncement.update({
      where: { id: announcementId },
      data: { isActive: false },
    });

    await this.auditService.log({
      userId: actor.id,
      action: 'PLATFORM_ANNOUNCEMENT_DEACTIVATED',
      resource: 'platform_announcement',
      resourceId: announcementId,
    });

    return updated;
  }
}
