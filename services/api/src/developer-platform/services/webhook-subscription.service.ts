/**
 * FitCore — Day 49: Webhook Subscription Lifecycle Service
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DeveloperSecurityService } from './developer-security.service';
import { ApiAuditService } from './api-audit.service';
import {
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
  WebhookSubscriptionDto,
  WebhookSubscriptionStatus,
} from '@fitcore/types';
import { DeveloperError } from '../domain/developer-errors';
import { APPROVED_DEVELOPER_EVENT_TYPES } from '../domain/developer-events';

export interface WebhookCreatedResponseDto {
  subscription: WebhookSubscriptionDto;
  webhookSecret: string; // ONLY returned once upon creation!
}

@Injectable()
export class WebhookSubscriptionService {
  private readonly logger = new Logger(WebhookSubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly security: DeveloperSecurityService,
    private readonly audit: ApiAuditService,
  ) {}

  /**
   * Creates a new webhook subscription
   */
  async createSubscription(
    applicationId: string,
    organisationId: string,
    dto: CreateWebhookSubscriptionDto,
    userId?: string,
  ): Promise<WebhookCreatedResponseDto> {
    const app = await this.prisma.developerApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app) {
      throw DeveloperError.notFound('DeveloperApplication', applicationId);
    }

    // SSRF validation
    const allowLocal = app.environment !== 'PRODUCTION';
    if (!this.security.validateUrlSafe(dto.endpointUrl, allowLocal)) {
      throw DeveloperError.ssrfBlocked(dto.endpointUrl);
    }

    // Validate event types
    for (const evt of dto.eventTypes) {
      if (!APPROVED_DEVELOPER_EVENT_TYPES.includes(evt as any)) {
        throw new DeveloperError(
          'INVALID_REQUEST',
          `Unsupported or unapproved event type: '${evt}'`,
        );
      }
    }

    const plainSecret = this.security.generateWebhookSecret();
    // For Day 49 we store encrypted / reference string
    const secretReference = plainSecret;

    const sub = await this.prisma.webhookSubscription.create({
      data: {
        applicationId: app.id,
        organisationId,
        endpointUrl: dto.endpointUrl,
        description: dto.description,
        eventTypes: dto.eventTypes,
        status: 'ACTIVE',
        secretReference,
      },
    });

    await this.audit.log({
      organisationId,
      applicationId: app.id,
      userId,
      action: 'WEBHOOK_SUBSCRIPTION_CREATED',
      resource: 'WebhookSubscription',
      resourceId: sub.id,
      metadata: { endpointUrl: dto.endpointUrl, eventTypes: dto.eventTypes },
    });

    return {
      subscription: this.mapToDto(sub),
      webhookSecret: plainSecret,
    };
  }

  /**
   * Updates an existing webhook subscription
   */
  async updateSubscription(
    subscriptionId: string,
    dto: UpdateWebhookSubscriptionDto,
    userId?: string,
  ): Promise<WebhookSubscriptionDto> {
    const existing = await this.prisma.webhookSubscription.findUnique({
      where: { id: subscriptionId },
      include: { application: true },
    });
    if (!existing) {
      throw DeveloperError.notFound('WebhookSubscription', subscriptionId);
    }

    if (dto.endpointUrl) {
      const allowLocal = existing.application.environment !== 'PRODUCTION';
      if (!this.security.validateUrlSafe(dto.endpointUrl, allowLocal)) {
        throw DeveloperError.ssrfBlocked(dto.endpointUrl);
      }
    }

    const updated = await this.prisma.webhookSubscription.update({
      where: { id: subscriptionId },
      data: {
        endpointUrl: dto.endpointUrl ?? existing.endpointUrl,
        description: dto.description ?? existing.description,
        eventTypes: dto.eventTypes ?? existing.eventTypes,
        status: dto.status ?? (existing.status as any),
      },
    });

    await this.audit.log({
      organisationId: existing.organisationId,
      applicationId: existing.applicationId,
      userId,
      action: 'WEBHOOK_SUBSCRIPTION_UPDATED',
      resource: 'WebhookSubscription',
      resourceId: subscriptionId,
      metadata: { changes: dto },
    });

    return this.mapToDto(updated);
  }

  /**
   * Rotates a webhook signing secret
   */
  async rotateSecret(
    subscriptionId: string,
    userId?: string,
  ): Promise<{ subscription: WebhookSubscriptionDto; webhookSecret: string }> {
    const existing = await this.prisma.webhookSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!existing) {
      throw DeveloperError.notFound('WebhookSubscription', subscriptionId);
    }

    const plainSecret = this.security.generateWebhookSecret();
    const updated = await this.prisma.webhookSubscription.update({
      where: { id: subscriptionId },
      data: { secretReference: plainSecret },
    });

    await this.audit.log({
      organisationId: existing.organisationId,
      applicationId: existing.applicationId,
      userId,
      action: 'WEBHOOK_SUBSCRIPTION_SECRET_ROTATED',
      resource: 'WebhookSubscription',
      resourceId: subscriptionId,
    });

    return {
      subscription: this.mapToDto(updated),
      webhookSecret: plainSecret,
    };
  }

  /**
   * Deletes / revokes a webhook subscription
   */
  async deleteSubscription(subscriptionId: string, userId?: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.webhookSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!existing) {
      throw DeveloperError.notFound('WebhookSubscription', subscriptionId);
    }

    await this.prisma.webhookSubscription.update({
      where: { id: subscriptionId },
      data: { status: 'REVOKED' },
    });

    await this.audit.log({
      organisationId: existing.organisationId,
      applicationId: existing.applicationId,
      userId,
      action: 'WEBHOOK_SUBSCRIPTION_REVOKED',
      resource: 'WebhookSubscription',
      resourceId: subscriptionId,
    });

    return { success: true };
  }

  /**
   * Lists webhook subscriptions for an application
   */
  async listSubscriptions(applicationId: string): Promise<WebhookSubscriptionDto[]> {
    const subs = await this.prisma.webhookSubscription.findMany({
      where: { applicationId, status: { not: 'REVOKED' } },
      orderBy: { createdAt: 'desc' },
    });

    return subs.map((s) => this.mapToDto(s));
  }

  async getSubscription(id: string): Promise<any> {
    const sub = await this.prisma.webhookSubscription.findUnique({
      where: { id },
    });
    if (!sub) {
      throw DeveloperError.notFound('WebhookSubscription', id);
    }
    return sub;
  }

  mapToDto(s: any): WebhookSubscriptionDto {
    return {
      id: s.id,
      applicationId: s.applicationId,
      organisationId: s.organisationId,
      endpointUrl: s.endpointUrl,
      description: s.description,
      eventTypes: s.eventTypes,
      status: s.status as WebhookSubscriptionStatus,
      hasSecret: Boolean(s.secretReference),
      failureCount: s.failureCount,
      consecutiveFailures: s.consecutiveFailures,
      lastDeliveryAt: s.lastDeliveryAt?.toISOString() || null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}
