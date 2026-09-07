import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { RedisModule } from '../redis/redis.module';

// Controllers
import { NotificationsController } from './controllers/notifications.controller';
import { CommunicationAdminController } from './controllers/communication-admin.controller';

// Services
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { PushDeviceService } from './services/push-device.service';
import { NotificationQueueService } from './queue/notification-queue.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { NotificationOrchestratorService } from './services/notification-orchestrator.service';
import { NotificationService } from './services/notification.service';
import { NotificationSchedulerService } from './services/notification-scheduler.service';

// Providers
import {
  ConsoleEmailProvider,
  ConsolePushProvider,
  ConsoleSmsProvider,
  LocalInAppProvider,
} from './providers/console-providers';

@Module({
  imports: [DatabaseModule, AuditModule, RedisModule],
  controllers: [NotificationsController, CommunicationAdminController],
  providers: [
    NotificationTemplateService,
    NotificationPreferenceService,
    PushDeviceService,
    NotificationQueueService,
    NotificationDeliveryService,
    NotificationOrchestratorService,
    NotificationService,
    NotificationSchedulerService,
    ConsoleEmailProvider,
    ConsoleSmsProvider,
    ConsolePushProvider,
    LocalInAppProvider,
  ],
  exports: [
    NotificationOrchestratorService,
    NotificationService,
    NotificationSchedulerService,
    NotificationPreferenceService,
    NotificationTemplateService,
    PushDeviceService,
    NotificationQueueService,
    NotificationDeliveryService,
  ],
})
export class CommunicationModule {}
