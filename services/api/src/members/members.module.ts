import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { OnboardingService } from './onboarding.service';
import { ParqService } from './parq.service';
import { ConsentService } from './consent.service';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    StorageModule,
    PermissionsModule,
  ],
  controllers: [MembersController],
  providers: [
    MembersService,
    OnboardingService,
    ParqService,
    ConsentService,
  ],
  exports: [
    MembersService,
    OnboardingService,
    ParqService,
    ConsentService,
  ],
})
export class MembersModule {}
