import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { CommonModule } from '../common/common.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PlatformAdminModule } from '../platform-admin/platform-admin.module';
import { DisasterRecoveryController } from './disaster-recovery.controller';
import { BackupOrchestratorService } from './services/backup-orchestrator.service';
import { BackupVerificationService } from './services/backup-verification.service';
import { RestoreTestService } from './services/restore-test.service';
import { DataIntegrityValidatorService } from './services/data-integrity-validator.service';
import { BusinessContinuityService } from './services/business-continuity.service';
import { DisasterRecoveryReconciliationService } from './services/disaster-recovery-reconciliation.service';
import { DrIncidentService } from './services/dr-incident.service';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    CommonModule,
    TenancyModule,
    PermissionsModule,
    PlatformAdminModule,
  ],
  controllers: [DisasterRecoveryController],
  providers: [
    BackupOrchestratorService,
    BackupVerificationService,
    RestoreTestService,
    DataIntegrityValidatorService,
    BusinessContinuityService,
    DisasterRecoveryReconciliationService,
    DrIncidentService,
  ],
  exports: [
    BackupOrchestratorService,
    BackupVerificationService,
    RestoreTestService,
    DataIntegrityValidatorService,
    BusinessContinuityService,
    DisasterRecoveryReconciliationService,
    DrIncidentService,
  ],
})
export class DisasterRecoveryModule {}
