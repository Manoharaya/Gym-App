/**
 * Day 35 — Receptionist Configuration Service
 * Multi-tenant configuration management with hierarchical inheritance:
 * Organisation Default -> Outlet Override -> Effective Configuration.
 */

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../audit/audit.service';
import { ReceptionistWorkflowConfigDto, StaffRoutingRule } from '@fitcore/types';
import { RECEPTIONIST_AUDIT_ACTIONS, RECEPTIONIST_WORKFLOW_DEFAULTS } from './receptionist-workflow.constants';

@Injectable()
export class ReceptionistConfigService {
  private readonly logger = new Logger(ReceptionistConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Retrieves the effective configuration by combining organisation defaults
   * with outlet-level overrides.
   */
  async getEffectiveConfig(params: {
    organisationId: string;
    outletId?: string | null;
  }): Promise<ReceptionistWorkflowConfigDto> {
    const { organisationId, outletId } = params;

    // Fetch organisation default config
    const orgConfig = await this.prisma.receptionistWorkflowConfig.findFirst({
      where: { organisationId, outletId: null },
    });

    // Fetch outlet override if outletId specified
    let outletConfig = null;
    if (outletId) {
      outletConfig = await this.prisma.receptionistWorkflowConfig.findFirst({
        where: { organisationId, outletId },
      });
    }

    // Default baseline values
    const defaultBaseline: ReceptionistWorkflowConfigDto = {
      organisationId,
      outletId: outletId || null,
      receptionistEnabled: true,
      greetingMessage: 'Welcome to FitCore. How can I assist you today?',
      businessHours: {
        monday: { open: '06:00', close: '22:00' },
        tuesday: { open: '06:00', close: '22:00' },
        wednesday: { open: '06:00', close: '22:00' },
        thursday: { open: '06:00', close: '22:00' },
        friday: { open: '06:00', close: '22:00' },
        saturday: { open: '07:00', close: '20:00' },
        sunday: { open: '08:00', close: '18:00' },
      },
      supportedChannels: ['WEB', 'WHATSAPP', 'SMS', 'EMAIL', 'VOICE'],
      handoffEnabled: true,
      handoffRouting: 'BY_ROLE',
      callbackEnabled: true,
      afterHoursMode: 'OFFER_CALLBACK',
      recordingPolicy: 'RECORDING_DISABLED',
      transcriptionPolicy: 'ENABLED',
      loopProtectionRules: RECEPTIONIST_WORKFLOW_DEFAULTS.LOOP_PROTECTION,
      businessRules: RECEPTIONIST_WORKFLOW_DEFAULTS.BUSINESS_RULES,
    };

    // Merge: Baseline -> Org Config -> Outlet Config
    return {
      ...defaultBaseline,
      ...(orgConfig
        ? {
            receptionistEnabled: orgConfig.receptionistEnabled,
            greetingMessage: orgConfig.greetingMessage || defaultBaseline.greetingMessage,
            businessHours: (orgConfig.businessHours as any) || defaultBaseline.businessHours,
            defaultOutletId: orgConfig.defaultOutletId,
            supportedChannels: (orgConfig.supportedChannels as any) || defaultBaseline.supportedChannels,
            handoffEnabled: orgConfig.handoffEnabled,
            handoffRouting: (orgConfig.handoffRouting as StaffRoutingRule) || defaultBaseline.handoffRouting,
            callbackEnabled: orgConfig.callbackEnabled,
            afterHoursMode: orgConfig.afterHoursMode as any,
            recordingPolicy: orgConfig.recordingPolicy,
            transcriptionPolicy: orgConfig.transcriptionPolicy,
            notificationPreferences: orgConfig.notificationPreferences as any,
            escalationRules: orgConfig.escalationRules as any,
            loopProtectionRules: (orgConfig.loopProtectionRules as any) || defaultBaseline.loopProtectionRules,
            businessRules: (orgConfig.businessRules as any) || defaultBaseline.businessRules,
          }
        : {}),
      ...(outletConfig
        ? {
            id: outletConfig.id,
            outletId: outletConfig.outletId,
            receptionistEnabled: outletConfig.receptionistEnabled,
            greetingMessage: outletConfig.greetingMessage ?? orgConfig?.greetingMessage ?? defaultBaseline.greetingMessage,
            businessHours: (outletConfig.businessHours as any) ?? orgConfig?.businessHours ?? defaultBaseline.businessHours,
            handoffEnabled: outletConfig.handoffEnabled,
            handoffRouting: (outletConfig.handoffRouting as StaffRoutingRule) ?? orgConfig?.handoffRouting ?? defaultBaseline.handoffRouting,
            callbackEnabled: outletConfig.callbackEnabled,
            afterHoursMode: outletConfig.afterHoursMode as any,
            recordingPolicy: outletConfig.recordingPolicy,
            transcriptionPolicy: outletConfig.transcriptionPolicy,
            loopProtectionRules: (outletConfig.loopProtectionRules as any) ?? orgConfig?.loopProtectionRules ?? defaultBaseline.loopProtectionRules,
            businessRules: (outletConfig.businessRules as any) ?? orgConfig?.businessRules ?? defaultBaseline.businessRules,
          }
        : {}),
    };
  }

  /**
   * Upserts organisation default or outlet override configuration.
   */
  async updateConfig(params: {
    organisationId: string;
    outletId?: string | null;
    dto: Partial<ReceptionistWorkflowConfigDto>;
    userId?: string;
  }) {
    const { organisationId, outletId = null, dto, userId } = params;

    const existing = await this.prisma.receptionistWorkflowConfig.findFirst({
      where: { organisationId, outletId },
    });

    let config;
    if (existing) {
      config = await this.prisma.receptionistWorkflowConfig.update({
        where: { id: existing.id },
        data: {
          receptionistEnabled: dto.receptionistEnabled ?? existing.receptionistEnabled,
          greetingMessage: dto.greetingMessage ?? existing.greetingMessage,
          businessHours: (dto.businessHours as any) ?? existing.businessHours,
          defaultOutletId: dto.defaultOutletId ?? existing.defaultOutletId,
          supportedChannels: (dto.supportedChannels as any) ?? existing.supportedChannels,
          handoffEnabled: dto.handoffEnabled ?? existing.handoffEnabled,
          handoffRouting: dto.handoffRouting ?? existing.handoffRouting,
          callbackEnabled: dto.callbackEnabled ?? existing.callbackEnabled,
          afterHoursMode: dto.afterHoursMode ?? existing.afterHoursMode,
          recordingPolicy: dto.recordingPolicy ?? existing.recordingPolicy,
          transcriptionPolicy: dto.transcriptionPolicy ?? existing.transcriptionPolicy,
          notificationPreferences: (dto.notificationPreferences as any) ?? existing.notificationPreferences,
          escalationRules: (dto.escalationRules as any) ?? existing.escalationRules,
          loopProtectionRules: (dto.loopProtectionRules as any) ?? existing.loopProtectionRules,
          businessRules: (dto.businessRules as any) ?? existing.businessRules,
        },
      });
    } else {
      config = await this.prisma.receptionistWorkflowConfig.create({
        data: {
          organisationId,
          outletId,
          receptionistEnabled: dto.receptionistEnabled ?? true,
          greetingMessage: dto.greetingMessage || null,
          businessHours: (dto.businessHours as any) || null,
          defaultOutletId: dto.defaultOutletId || null,
          supportedChannels: (dto.supportedChannels as any) || ['WEB', 'WHATSAPP', 'SMS', 'EMAIL', 'VOICE'],
          handoffEnabled: dto.handoffEnabled ?? true,
          handoffRouting: dto.handoffRouting || 'BY_ROLE',
          callbackEnabled: dto.callbackEnabled ?? true,
          afterHoursMode: dto.afterHoursMode || 'OFFER_CALLBACK',
          recordingPolicy: dto.recordingPolicy || 'RECORDING_DISABLED',
          transcriptionPolicy: dto.transcriptionPolicy || 'ENABLED',
          notificationPreferences: (dto.notificationPreferences as any) || null,
          escalationRules: (dto.escalationRules as any) || null,
          loopProtectionRules: (dto.loopProtectionRules as any) || RECEPTIONIST_WORKFLOW_DEFAULTS.LOOP_PROTECTION,
          businessRules: (dto.businessRules as any) || RECEPTIONIST_WORKFLOW_DEFAULTS.BUSINESS_RULES,
        },
      });
    }

    await this.audit.log({
      userId,
      organisationId,
      outletId: outletId || undefined,
      action: RECEPTIONIST_AUDIT_ACTIONS.CONFIGURATION_UPDATED,
      resource: 'ReceptionistWorkflowConfig',
      resourceId: config.id,
      metadata: { outletOverride: !!outletId },
    });

    return config;
  }
}
