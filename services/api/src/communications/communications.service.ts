import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CommunicationOrchestratorService } from './orchestrator/communication-orchestrator.service';
import { CommunicationPreferenceService } from './preferences/communication-preference.service';
import { TemplateService } from './templates/template.service';
import { TemplateVersionService } from './templates/template-version.service';
import { CommunicationHistoryService } from './history/communication-history.service';
import { CommunicationProviderFactory } from './providers/provider-factory.service';
import { DeliveryStatusService } from './delivery/delivery-status.service';
import { DeliveryService } from './delivery/delivery.service';
import { SendCommunicationDto } from './dto/send-communication.dto';
import { UpdatePreferenceDto } from './dto/preference.dto';
import { RegisterDeviceDto } from './dto/device-token.dto';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateTemplateVersionDto,
} from './dto/template.dto';
import { COMMUNICATION_AUDIT_ACTIONS } from './communications.constants';

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly orchestrator: CommunicationOrchestratorService,
    private readonly preferenceService: CommunicationPreferenceService,
    private readonly templateService: TemplateService,
    private readonly versionService: TemplateVersionService,
    private readonly historyService: CommunicationHistoryService,
    private readonly providerFactory: CommunicationProviderFactory,
    private readonly deliveryStatusService: DeliveryStatusService,
    private readonly deliveryService: DeliveryService,
  ) {}

  /**
   * Submits a communication request ensuring tenant isolation and validation.
   */
  async sendCommunication(
    dto: SendCommunicationDto,
    organisationId: string,
    actorUserId?: string,
  ) {
    return this.orchestrator.submitCommunication({
      organisationId,
      outletId: dto.outletId,
      recipientUserId: dto.recipientUserId,
      recipientMemberId: dto.recipientMemberId,
      recipientStaffId: dto.recipientStaffId,
      recipientEmail: dto.recipientEmail,
      recipientPhone: dto.recipientPhone,
      type: dto.type,
      channel: dto.channel,
      templateId: dto.templateId,
      subject: dto.subject,
      body: dto.body,
      variables: dto.variables,
      source: dto.source || 'STAFF',
      sourceReferenceId: dto.sourceReferenceId,
      requiresApproval: dto.requiresApproval,
      scheduledAt: dto.scheduledAt,
      idempotencyKey: dto.idempotencyKey,
      metadata: dto.metadata,
    });
  }

  /**
   * Retrieves paginated communications history for staff.
   */
  async getCommunications(organisationId: string, query: any) {
    return this.historyService.getStaffHistory({
      organisationId,
      outletId: query.outletId,
      recipientUserId: query.recipientUserId,
      recipientMemberId: query.recipientMemberId,
      channel: query.channel,
      type: query.type,
      status: query.status,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    });
  }

  /**
   * Retrieves a single communication by ID ensuring tenant isolation.
   */
  async getCommunicationById(id: string, organisationId: string) {
    const comm = await this.prisma.communication.findUnique({
      where: { id },
      include: {
        deliveryEvents: {
          orderBy: { timestamp: 'desc' },
        },
        template: true,
        templateVersion: true,
      },
    });

    if (!comm) {
      throw new NotFoundException(`Communication with ID '${id}' not found`);
    }

    if (comm.organisationId !== organisationId) {
      throw new ForbiddenException('Cross-tenant communication access denied');
    }

    return comm;
  }

  /**
   * Approves a PENDING_APPROVAL communication.
   */
  async approveCommunication(id: string, actorUserId: string, organisationId: string) {
    return this.orchestrator.approveCommunication(id, actorUserId, organisationId);
  }

  /**
   * Cancels a scheduled or pending communication.
   */
  async cancelCommunication(id: string, actorUserId: string, organisationId: string) {
    return this.orchestrator.cancelCommunication(id, actorUserId, organisationId);
  }

  /**
   * Manually retries a failed communication.
   */
  async retryCommunication(id: string, actorUserId: string, organisationId: string) {
    const comm = await this.getCommunicationById(id, organisationId);

    if (comm.status !== 'FAILED' && comm.status !== 'QUEUED') {
      throw new BadRequestException(
        `Communication cannot be retried: current status is '${comm.status}'`
      );
    }

    await this.prisma.communication.update({
      where: { id },
      data: {
        status: 'QUEUED',
        failedAt: null,
      },
    });

    return this.deliveryService.dispatch(id);
  }

  /**
   * Member preferences
   */
  async getPreferences(userId: string, organisationId: string) {
    return this.preferenceService.getPreferences(userId, organisationId);
  }

  async updatePreference(userId: string, organisationId: string, dto: UpdatePreferenceDto) {
    return this.preferenceService.updatePreference(
      userId,
      organisationId,
      dto.channel,
      dto.type,
      dto.enabled,
    );
  }

  /**
   * In-App notifications for mobile client (Section 16, 49)
   */
  async getInAppNotifications(userId: string, organisationId: string, query: any) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      recipientUserId: userId,
      organisationId,
    };

    if (query.unreadOnly) {
      where.readAt = null;
    }

    const [total, items, unreadCount] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: {
          recipientUserId: userId,
          organisationId,
          readAt: null,
        },
      }),
    ]);

    return {
      items,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async markNotificationRead(notificationId: string, userId: string, organisationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification '${notificationId}' not found`);
    }

    if (notification.recipientUserId !== userId || notification.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied to notification');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        readAt: new Date(),
        status: 'READ',
      },
    });

    // Also update matching communication record if linked
    const commId = (notification.data as any)?.communicationId;
    if (commId) {
      await this.prisma.communication.update({
        where: { id: commId },
        data: {
          readAt: new Date(),
          status: 'READ',
        },
      });
    }

    return updated;
  }

  /**
   * Push device token registration (Section 15)
   */
  async registerDevice(userId: string, organisationId: string, dto: RegisterDeviceDto) {
    const device = await this.prisma.pushDevice.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId: dto.deviceId,
        },
      },
      update: {
        platform: dto.platform,
        pushToken: dto.pushToken,
        appVersion: dto.appVersion,
        deviceName: dto.deviceName,
        status: 'ACTIVE',
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        organisationId,
        deviceId: dto.deviceId,
        platform: dto.platform,
        pushToken: dto.pushToken,
        appVersion: dto.appVersion,
        deviceName: dto.deviceName,
        status: 'ACTIVE',
      },
    });

    return {
      id: device.id,
      platform: device.platform,
      status: device.status,
      lastSeenAt: device.lastSeenAt,
    };
  }

  /**
   * Provider Webhook Processing (Section 36, 37)
   */
  async handleWebhook(providerName: string, payload: unknown, signature?: string) {
    const provider = this.providerFactory.getProviderByName(providerName);

    // Signature verification (Section 37)
    if (provider.validateWebhook) {
      const isValid = provider.validateWebhook(payload, signature || '');
      if (!isValid) {
        throw new UnauthorizedException(`Invalid webhook signature for provider '${providerName}'`);
      }
    }

    if (!provider.parseWebhook) {
      throw new BadRequestException(`Provider '${providerName}' does not support webhook parsing`);
    }

    const event = provider.parseWebhook(payload);
    const result = await this.deliveryStatusService.recordDeliveryEvent(event);

    return {
      received: true,
      provider: provider.name,
      result,
    };
  }

  /**
   * Template management delegates
   */
  async getTemplates(organisationId: string, filter?: any) {
    return this.templateService.getTemplates(organisationId, filter);
  }

  async createTemplate(dto: CreateTemplateDto, organisationId: string, actorUserId: string) {
    return this.templateService.createTemplate({
      organisationId,
      name: dto.name,
      type: dto.type,
      channel: dto.channel,
      description: dto.description,
      subjectTemplate: dto.subjectTemplate,
      bodyTemplate: dto.bodyTemplate,
      variablesSchema: dto.variablesSchema,
      actorUserId,
    });
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, organisationId: string, actorUserId: string) {
    return this.templateService.updateTemplate(id, organisationId, {
      name: dto.name,
      description: dto.description,
      status: dto.status,
      subjectTemplate: dto.subjectTemplate,
      bodyTemplate: dto.bodyTemplate,
      variablesSchema: dto.variablesSchema,
      actorUserId,
    });
  }

  async getTemplateVersions(templateId: string, organisationId: string) {
    await this.templateService.getTemplateById(templateId, organisationId);
    return this.versionService.listVersions(templateId);
  }

  async createTemplateVersion(templateId: string, dto: CreateTemplateVersionDto, organisationId: string, actorUserId: string) {
    await this.templateService.getTemplateById(templateId, organisationId);
    return this.versionService.createVersion(templateId, {
      subjectTemplate: dto.subjectTemplate,
      bodyTemplate: dto.bodyTemplate,
      variablesSchema: dto.variablesSchema,
      status: dto.status,
      createdBy: actorUserId,
    });
  }

  /**
   * Analytics
   */
  async getAnalytics(organisationId: string, startDate?: string, endDate?: string) {
    return this.historyService.getAnalytics(
      organisationId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
