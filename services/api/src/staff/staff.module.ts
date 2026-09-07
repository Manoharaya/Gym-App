import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { StaffService } from './staff.service';
import { TrainerService } from './trainer.service';
import { CertificationExpirationProcessor } from './processors/certification-expiration.processor';
import { StaffController } from './controllers/staff.controller';
import { TrainersController } from './controllers/trainers.controller';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [StaffController, TrainersController],
  providers: [
    StaffService,
    TrainerService,
    CertificationExpirationProcessor,
  ],
  exports: [
    StaffService,
    TrainerService,
    CertificationExpirationProcessor,
  ],
})
export class StaffModule {}
