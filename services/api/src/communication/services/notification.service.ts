import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { QueryNotificationsDto } from '../dto/communication.dto';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Retrieves paginated notifications for the authenticated user.
   * Enforces strict user isolation: User A cannot see User B's notifications.
   */
  async getNotifications(
    userId: string,
    organisationId: string,
    query: QueryNotificationsDto,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      recipientUserId: userId,
      organisationId,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.unreadOnly) {
      where.readAt = null;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        include: {
          deliveries: {
            select: {
              id: true,
              channel: true,
              status: true,
              deliveredAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Returns the count of unread notifications for the user.
   */
  async getUnreadCount(userId: string, organisationId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: {
        recipientUserId: userId,
        organisationId,
        readAt: null,
      },
    });

    return { unreadCount };
  }

  /**
   * Retrieves a single notification by ID. Enforces ownership and tenant isolation.
   */
  async getNotificationById(
    userId: string,
    organisationId: string,
    notificationId: string,
  ) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { deliveries: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.recipientUserId !== userId) {
      throw new ForbiddenException('You do not have permission to view this notification');
    }

    if (notification.organisationId !== organisationId) {
      throw new ForbiddenException('Notification belongs to another organisation');
    }

    return notification;
  }

  /**
   * Marks a notification as read or unread with IDOR protection.
   */
  async markAsRead(
    userId: string,
    organisationId: string,
    notificationId: string,
    read: boolean = true,
  ) {
    // Assert ownership
    const notification = await this.getNotificationById(userId, organisationId, notificationId);

    const now = new Date();
    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        readAt: read ? now : null,
        status: read ? 'READ' : 'DELIVERED',
      },
    });

    if (read) {
      await this.audit.log({
        userId,
        action: 'NOTIFICATION_READ',
        resource: 'notifications',
        resourceId: notification.id,
        organisationId,
        metadata: { readAt: now.toISOString() },
      });
    }

    return updated;
  }

  /**
   * Marks all unread notifications as read for the user in the organisation.
   */
  async markAllAsRead(userId: string, organisationId: string) {
    const now = new Date();
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientUserId: userId,
        organisationId,
        readAt: null,
      },
      data: {
        readAt: now,
        status: 'READ',
      },
    });

    await this.audit.log({
      userId,
      action: 'NOTIFICATION_READ',
      resource: 'notifications',
      resourceId: 'all',
      organisationId,
      metadata: { count: result.count, timestamp: now.toISOString() },
    });

    return { updatedCount: result.count };
  }

  /**
   * Deletes a notification with IDOR check.
   */
  async deleteNotification(
    userId: string,
    organisationId: string,
    notificationId: string,
  ) {
    const notification = await this.getNotificationById(userId, organisationId, notificationId);

    await this.prisma.notification.delete({
      where: { id: notification.id },
    });

    return { success: true, message: 'Notification deleted' };
  }
}
