import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateBusinessPreferenceDto } from '../dto/business-preference.dto';
import { BusinessDashboardPreferencesDto, BusinessMetricDomain } from '@fitcore/types';

@Injectable()
export class BusinessPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves dashboard preferences for a specific user and organisation.
   */
  async getPreferences(organisationId: string, userId: string): Promise<BusinessDashboardPreferencesDto> {
    const record = await this.prisma.businessDashboardPreference.findUnique({
      where: {
        organisationId_userId: {
          organisationId,
          userId,
        },
      },
    });

    if (!record) {
      return {
        defaultOutletId: null,
        defaultDateRange: 'LAST_30_DAYS',
        defaultCurrency: 'AUD',
        pinnedKpiKeys: ['membership.active_members', 'finance.net_revenue', 'sales.new_leads', 'attendance.total_visits'],
        enabledDomains: [
          'MEMBERSHIP',
          'FINANCE',
          'SALES',
          'ATTENDANCE',
          'BOOKING',
          'TRAINING',
          'ENGAGEMENT',
          'RETENTION',
          'COMMUNICATION',
          'AI',
        ] as BusinessMetricDomain[],
      };
    }

    return {
      defaultOutletId: record.defaultOutletId,
      defaultDateRange: record.defaultDateRange as any,
      defaultCurrency: record.defaultCurrency,
      pinnedKpiKeys: record.pinnedKpiKeys,
      enabledDomains: record.enabledDomains as BusinessMetricDomain[],
      layoutPreferences: (record.layoutPreferences as Record<string, any>) || undefined,
      chartPreferences: (record.chartPreferences as Record<string, any>) || undefined,
    };
  }

  /**
   * Updates or creates user dashboard preferences.
   */
  async updatePreferences(
    organisationId: string,
    userId: string,
    dto: UpdateBusinessPreferenceDto,
  ): Promise<BusinessDashboardPreferencesDto> {
    const record = await this.prisma.businessDashboardPreference.upsert({
      where: {
        organisationId_userId: {
          organisationId,
          userId,
        },
      },
      create: {
        organisationId,
        userId,
        defaultOutletId: dto.defaultOutletId || null,
        defaultDateRange: dto.defaultDateRange || 'LAST_30_DAYS',
        defaultCurrency: dto.defaultCurrency || 'AUD',
        pinnedKpiKeys: dto.pinnedKpiKeys || [],
        enabledDomains: dto.enabledDomains || [],
        layoutPreferences: dto.layoutPreferences || undefined,
        chartPreferences: dto.chartPreferences || undefined,
      },
      update: {
        ...(dto.defaultOutletId !== undefined ? { defaultOutletId: dto.defaultOutletId } : {}),
        ...(dto.defaultDateRange ? { defaultDateRange: dto.defaultDateRange } : {}),
        ...(dto.defaultCurrency ? { defaultCurrency: dto.defaultCurrency } : {}),
        ...(dto.pinnedKpiKeys ? { pinnedKpiKeys: dto.pinnedKpiKeys } : {}),
        ...(dto.enabledDomains ? { enabledDomains: dto.enabledDomains } : {}),
        ...(dto.layoutPreferences ? { layoutPreferences: dto.layoutPreferences } : {}),
        ...(dto.chartPreferences ? { chartPreferences: dto.chartPreferences } : {}),
      },
    });

    return {
      defaultOutletId: record.defaultOutletId,
      defaultDateRange: record.defaultDateRange as any,
      defaultCurrency: record.defaultCurrency,
      pinnedKpiKeys: record.pinnedKpiKeys,
      enabledDomains: record.enabledDomains as BusinessMetricDomain[],
      layoutPreferences: (record.layoutPreferences as Record<string, any>) || undefined,
      chartPreferences: (record.chartPreferences as Record<string, any>) || undefined,
    };
  }
}
