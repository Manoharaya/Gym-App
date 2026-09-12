import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PlatformPermissionGuard } from '../platform-admin/permissions/platform-permission.guard';
import { PlatformPermissions } from '../platform-admin/permissions/platform-permission.decorator';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import {
  TriggerBackupDto,
  VerifyBackupDto,
  RunRestoreTestDto,
  DeclareDrIncidentDto,
  UpdateDrIncidentDto,
  ReconcilePaymentsDto,
  EvaluateDegradedModeDto,
} from './dto/disaster-recovery.dto';
import { BackupOrchestratorService } from './services/backup-orchestrator.service';
import { BackupVerificationService } from './services/backup-verification.service';
import { RestoreTestService } from './services/restore-test.service';
import { DataIntegrityValidatorService } from './services/data-integrity-validator.service';
import { BusinessContinuityService } from './services/business-continuity.service';
import { DisasterRecoveryReconciliationService } from './services/disaster-recovery-reconciliation.service';
import { DrIncidentService } from './services/dr-incident.service';

@ApiTags('Disaster Recovery')
@ApiBearerAuth()
@UseGuards(PlatformPermissionGuard)
@Controller('platform-admin/disaster-recovery')
export class DisasterRecoveryController {
  constructor(
    private readonly backupOrchestrator: BackupOrchestratorService,
    private readonly backupVerification: BackupVerificationService,
    private readonly restoreTestService: RestoreTestService,
    private readonly integrityValidator: DataIntegrityValidatorService,
    private readonly businessContinuity: BusinessContinuityService,
    private readonly reconciliationService: DisasterRecoveryReconciliationService,
    private readonly incidentService: DrIncidentService,
  ) {}

  @Post('backups/trigger')
  @PlatformPermissions('platform.operations.execute')
  @ApiOperation({ summary: 'Triggers an encrypted database backup with integrity checksumming' })
  async triggerBackup(@Body() dto: TriggerBackupDto, @Req() req: RequestWithUser) {
    return this.backupOrchestrator.triggerBackup(dto, req.user?.id);
  }

  @Get('backups')
  @PlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'Lists backup records and recent verifications' })
  async listBackups(@Query('status') status?: string, @Query('backupType') backupType?: string) {
    return this.backupOrchestrator.listBackups({ status, backupType });
  }

  @Get('backups/:id')
  @PlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'Retrieves backup details' })
  async getBackup(@Param('id') id: string) {
    return this.backupOrchestrator.getBackup(id);
  }

  @Post('backups/:id/verify')
  @PlatformPermissions('platform.operations.execute')
  @ApiOperation({ summary: 'Verifies checksum and decryptability of a backup record' })
  async verifyBackup(
    @Param('id') id: string,
    @Body() body: { simulateCorruption?: boolean },
  ) {
    return this.backupVerification.verifyBackup({
      backupRecordId: id,
      simulateCorruption: body?.simulateCorruption,
    });
  }

  @Post('restore-tests/run')
  @PlatformPermissions('platform.operations.execute')
  @ApiOperation({ summary: 'Runs an automated sandbox restore drill and measures actual RTO / RPO' })
  async runRestoreTest(@Body() dto: RunRestoreTestDto, @Req() req: RequestWithUser) {
    return this.restoreTestService.runRestoreTest(dto, req.user?.id);
  }

  @Get('restore-tests')
  @PlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'Lists restore drill records' })
  async listRestoreTests(@Query('backupRecordId') backupRecordId?: string) {
    return this.restoreTestService.listRestoreTests(backupRecordId);
  }

  @Get('metrics')
  @PlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'Retrieves disaster recovery metrics and SLA compliance' })
  async getRecoveryMetrics() {
    const [backupMetrics, recoveryMetrics] = await Promise.all([
      this.backupOrchestrator.getBackupMetrics(),
      this.restoreTestService.getRecoveryMetrics(),
    ]);

    return {
      backup: backupMetrics,
      recovery: recoveryMetrics,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('data-integrity/audit')
  @PlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'Runs non-destructive data integrity audit' })
  async auditDataIntegrity(@Query('organisationId') organisationId?: string) {
    return this.integrityValidator.validateIntegrity(organisationId);
  }

  @Post('business-continuity/validate')
  @PlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'Validates business continuity invariants' })
  async validateBusinessInvariants(@Query('organisationId') organisationId?: string) {
    return this.businessContinuity.validateBusinessInvariants(organisationId);
  }

  @Post('degraded-mode/evaluate')
  @PlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'Evaluates degraded mode fallback behavior for subsystem' })
  async evaluateDegradedMode(@Body() dto: EvaluateDegradedModeDto) {
    return this.businessContinuity.evaluateDegradedMode(dto.subsystem);
  }

  @Post('reconciliation/payments')
  @PlatformPermissions('platform.operations.execute')
  @ApiOperation({ summary: 'Reconciles unknown/processing payments without duplicate charges' })
  async reconcilePayments(@Body() dto: ReconcilePaymentsDto) {
    return this.reconciliationService.reconcileUnknownPayments(
      dto.organisationId,
      dto.lookbackHours,
    );
  }

  @Post('incidents')
  @PlatformPermissions('platform.operations.execute')
  @ApiOperation({ summary: 'Declares a formal Disaster Recovery incident' })
  async declareIncident(@Body() dto: DeclareDrIncidentDto, @Req() req: RequestWithUser) {
    return this.incidentService.declareIncident(dto, req.user);
  }

  @Patch('incidents/:id')
  @PlatformPermissions('platform.operations.execute')
  @ApiOperation({ summary: 'Updates DR incident status and logs progress event' })
  async updateIncident(
    @Param('id') id: string,
    @Body() dto: UpdateDrIncidentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.incidentService.updateIncident(id, dto, req.user);
  }

  @Get('incidents')
  @PlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'Lists DR incidents' })
  async listIncidents(@Query('status') status?: string) {
    return this.incidentService.listIncidents(status);
  }

  @Get('incidents/:id')
  @PlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'Retrieves DR incident details with timeline events' })
  async getIncident(@Param('id') id: string) {
    return this.incidentService.getIncident(id);
  }
}
