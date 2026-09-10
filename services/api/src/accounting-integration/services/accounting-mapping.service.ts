/**
 * FitCore — Day 43: Accounting Mapping Service
 *
 * Manages Chart of Accounts discovery, Revenue category mappings,
 * Payment/Refund account mappings, and Tax rate mappings.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AccountingConnectionService } from './accounting-connection.service';
import {
  AccountingAccountDto,
  AccountingTaxRateDto,
  AccountingMappingDto,
  AccountingTaxMappingDto,
} from '@fitcore/types';
import {
  CreateAccountingMappingDto,
  UpdateAccountingMappingDto,
  CreateAccountingTaxMappingDto,
} from '../dto/create-mapping.dto';
import { ACCOUNTING_AUDIT_ACTIONS } from '../domain/accounting.constants';

@Injectable()
export class AccountingMappingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly connectionService: AccountingConnectionService,
  ) {}

  /**
   * Retrieves Chart of Accounts from connected provider.
   */
  async getExternalAccounts(organisationId: string): Promise<AccountingAccountDto[]> {
    const { accessToken, connection, provider } =
      await this.connectionService.getValidAccessToken(organisationId);
    return provider.getAccounts(accessToken, connection.externalOrganisationId || '');
  }

  /**
   * Retrieves Tax Rates from connected provider.
   */
  async getExternalTaxRates(organisationId: string): Promise<AccountingTaxRateDto[]> {
    const { accessToken, connection, provider } =
      await this.connectionService.getValidAccessToken(organisationId);
    return provider.getTaxRates(accessToken, connection.externalOrganisationId || '');
  }

  /**
   * Lists configured accounting mappings for organisation.
   */
  async listMappings(organisationId: string, outletId?: string): Promise<AccountingMappingDto[]> {
    const where: any = { organisationId };
    if (outletId) {
      where.OR = [{ outletId }, { outletId: null }];
    }

    const mappings = await this.prisma.accountingMapping.findMany({
      where,
      orderBy: [{ mappingType: 'asc' }, { createdAt: 'desc' }],
    });

    return mappings.map((m) => this.mapToDto(m));
  }

  /**
   * Creates a new accounting mapping.
   */
  async createMapping(
    organisationId: string,
    dto: CreateAccountingMappingDto,
    userId?: string,
  ): Promise<AccountingMappingDto> {
    const connection = await this.prisma.accountingConnection.findFirst({
      where: {
        organisationId,
        status: { in: ['CONNECTED', 'SYNCING'] },
      },
    });

    if (!connection) {
      throw new BadRequestException('No active connected accounting provider found');
    }

    const existing = await this.prisma.accountingMapping.findFirst({
      where: {
        connectionId: connection.id,
        mappingType: dto.mappingType,
        fitcoreReference: dto.fitcoreReference,
        outletId: dto.outletId || null,
      },
    });

    let mapping;
    if (existing) {
      mapping = await this.prisma.accountingMapping.update({
        where: { id: existing.id },
        data: {
          externalReference: dto.externalReference,
          externalName: dto.externalName,
          status: 'ACTIVE',
        },
      });
    } else {
      mapping = await this.prisma.accountingMapping.create({
        data: {
          organisationId,
          connectionId: connection.id,
          mappingType: dto.mappingType,
          fitcoreReference: dto.fitcoreReference,
          externalReference: dto.externalReference,
          externalName: dto.externalName,
          outletId: dto.outletId || null,
          status: 'ACTIVE',
        },
      });
    }

    await this.auditService.log({
      userId,
      organisationId,
      action: ACCOUNTING_AUDIT_ACTIONS.MAPPING_CREATED,
      resource: 'AccountingMapping',
      resourceId: mapping.id,
      metadata: { mappingType: dto.mappingType, fitcoreReference: dto.fitcoreReference },
    });

    return this.mapToDto(mapping);
  }

  /**
   * Updates an existing mapping.
   */
  async updateMapping(
    organisationId: string,
    id: string,
    dto: UpdateAccountingMappingDto,
    userId?: string,
  ): Promise<AccountingMappingDto> {
    const mapping = await this.prisma.accountingMapping.findFirst({
      where: { id, organisationId },
    });

    if (!mapping) {
      throw new NotFoundException(`Accounting mapping '${id}' not found`);
    }

    const updated = await this.prisma.accountingMapping.update({
      where: { id: mapping.id },
      data: {
        externalReference: dto.externalReference ?? mapping.externalReference,
        externalName: dto.externalName ?? mapping.externalName,
        status: dto.status ?? mapping.status,
      },
    });

    await this.auditService.log({
      userId,
      organisationId,
      action: ACCOUNTING_AUDIT_ACTIONS.MAPPING_UPDATED,
      resource: 'AccountingMapping',
      resourceId: updated.id,
    });

    return this.mapToDto(updated);
  }

  /**
   * Deletes a mapping.
   */
  async deleteMapping(organisationId: string, id: string, userId?: string): Promise<{ success: boolean }> {
    const mapping = await this.prisma.accountingMapping.findFirst({
      where: { id, organisationId },
    });

    if (!mapping) {
      throw new NotFoundException(`Accounting mapping '${id}' not found`);
    }

    await this.prisma.accountingMapping.delete({ where: { id } });

    await this.auditService.log({
      userId,
      organisationId,
      action: ACCOUNTING_AUDIT_ACTIONS.MAPPING_DELETED,
      resource: 'AccountingMapping',
      resourceId: id,
    });

    return { success: true };
  }

  /**
   * Lists tax mappings for organisation.
   */
  async listTaxMappings(organisationId: string): Promise<AccountingTaxMappingDto[]> {
    const mappings = await this.prisma.accountingTaxMapping.findMany({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
    });

    return mappings.map((t) => ({
      id: t.id,
      organisationId: t.organisationId,
      connectionId: t.connectionId,
      fitcoreTaxIdentifier: t.fitcoreTaxIdentifier,
      externalTaxIdentifier: t.externalTaxIdentifier,
      externalTaxRate: t.externalTaxRate,
      provider: t.provider as any,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  /**
   * Creates or updates a tax mapping.
   */
  async createTaxMapping(
    organisationId: string,
    dto: CreateAccountingTaxMappingDto,
    userId?: string,
  ): Promise<AccountingTaxMappingDto> {
    const connection = await this.prisma.accountingConnection.findFirst({
      where: {
        organisationId,
        status: { in: ['CONNECTED', 'SYNCING'] },
      },
    });

    if (!connection) {
      throw new BadRequestException('No active connected accounting provider found');
    }

    const mapping = await this.prisma.accountingTaxMapping.upsert({
      where: {
        connectionId_fitcoreTaxIdentifier: {
          connectionId: connection.id,
          fitcoreTaxIdentifier: dto.fitcoreTaxIdentifier,
        },
      },
      create: {
        organisationId,
        connectionId: connection.id,
        fitcoreTaxIdentifier: dto.fitcoreTaxIdentifier,
        externalTaxIdentifier: dto.externalTaxIdentifier,
        externalTaxRate: dto.externalTaxRate,
        provider: connection.provider,
        status: 'ACTIVE',
      },
      update: {
        externalTaxIdentifier: dto.externalTaxIdentifier,
        externalTaxRate: dto.externalTaxRate,
        status: 'ACTIVE',
      },
    });

    return {
      id: mapping.id,
      organisationId: mapping.organisationId,
      connectionId: mapping.connectionId,
      fitcoreTaxIdentifier: mapping.fitcoreTaxIdentifier,
      externalTaxIdentifier: mapping.externalTaxIdentifier,
      externalTaxRate: mapping.externalTaxRate,
      provider: mapping.provider as any,
      status: mapping.status,
      createdAt: mapping.createdAt.toISOString(),
      updatedAt: mapping.updatedAt.toISOString(),
    };
  }

  private mapToDto(m: any): AccountingMappingDto {
    return {
      id: m.id,
      organisationId: m.organisationId,
      connectionId: m.connectionId,
      mappingType: m.mappingType,
      fitcoreReference: m.fitcoreReference,
      externalReference: m.externalReference,
      externalName: m.externalName,
      outletId: m.outletId,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }
}
