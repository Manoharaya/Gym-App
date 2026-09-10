/**
 * FitCore — Day 43: Accounting Conflict Service
 *
 * Records and manages non-destructive reconciliation conflicts.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  AccountingConflictDto,
  AccountingConflictType,
  AccountingConflictStatus,
} from '@fitcore/types';
import { ACCOUNTING_AUDIT_ACTIONS } from '../domain/accounting.constants';

@Injectable()
export class AccountingConflictService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Records an identified conflict.
   */
  async recordConflict(
    organisationId: string,
    connectionId: string,
    entityType: string,
    fitcoreEntityId: string,
    externalEntityId: string | null | undefined,
    conflictType: AccountingConflictType,
    fitcoreValue?: string,
    externalValue?: string,
  ): Promise<AccountingConflictDto> {
    const conflict = await this.prisma.accountingConflict.create({
      data: {
        organisationId,
        connectionId,
        entityType,
        fitcoreEntityId,
        externalEntityId,
        conflictType,
        fitcoreValue,
        externalValue,
        status: 'UNRESOLVED',
      },
    });

    await this.auditService.log({
      organisationId,
      action: ACCOUNTING_AUDIT_ACTIONS.CONFLICT_DETECTED,
      resource: 'AccountingConflict',
      resourceId: conflict.id,
      metadata: { conflictType, entityType, fitcoreEntityId },
    });

    return this.mapToDto(conflict);
  }

  /**
   * Lists conflicts for an organisation.
   */
  async listConflicts(
    organisationId: string,
    status?: AccountingConflictStatus,
    limit = 50,
  ): Promise<AccountingConflictDto[]> {
    const where: any = { organisationId };
    if (status) where.status = status;

    const conflicts = await this.prisma.accountingConflict.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return conflicts.map((c) => this.mapToDto(c));
  }

  /**
   * Retrieves single conflict by ID.
   */
  async getConflictById(organisationId: string, id: string): Promise<AccountingConflictDto> {
    const conflict = await this.prisma.accountingConflict.findFirst({
      where: { id, organisationId },
    });
    if (!conflict) throw new NotFoundException(`Accounting conflict '${id}' not found`);
    return this.mapToDto(conflict);
  }

  /**
   * Resolves a conflict with audit notes.
   */
  async resolveConflict(
    organisationId: string,
    id: string,
    status: 'RESOLVED' | 'IGNORED',
    resolutionNotes: string,
    userId?: string,
  ): Promise<AccountingConflictDto> {
    const conflict = await this.prisma.accountingConflict.findFirst({
      where: { id, organisationId },
    });

    if (!conflict) throw new NotFoundException(`Accounting conflict '${id}' not found`);

    const updated = await this.prisma.accountingConflict.update({
      where: { id },
      data: {
        status,
        resolutionNotes,
        resolvedByUserId: userId,
        resolvedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId,
      organisationId,
      action: ACCOUNTING_AUDIT_ACTIONS.CONFLICT_RESOLVED,
      resource: 'AccountingConflict',
      resourceId: id,
      metadata: { status, resolutionNotes },
    });

    return this.mapToDto(updated);
  }

  private mapToDto(c: any): AccountingConflictDto {
    return {
      id: c.id,
      organisationId: c.organisationId,
      connectionId: c.connectionId,
      entityType: c.entityType,
      fitcoreEntityId: c.fitcoreEntityId,
      externalEntityId: c.externalEntityId,
      conflictType: c.conflictType as any,
      fitcoreValue: c.fitcoreValue,
      externalValue: c.externalValue,
      status: c.status as any,
      resolutionNotes: c.resolutionNotes,
      resolvedByUserId: c.resolvedByUserId,
      resolvedAt: c.resolvedAt?.toISOString() || null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
