import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';

import { AccessController } from './controllers/access.controller';
import { DeviceEventsController } from './controllers/device-events.controller';

import { AccessDecisionService } from './services/access-decision.service';
import { CheckInService } from './services/checkin.service';
import { CheckOutService } from './services/checkout.service';
import { AccessCredentialService } from './services/access-credential.service';
import { AccessDeviceService } from './services/access-device.service';
import { AccessPolicyService } from './services/access-policy.service';
import { AccessOverrideService } from './services/access-override.service';
import { AccessStatusService } from './services/access-status.service';
import { AccessEventService } from './services/access-event.service';

import { MockAccessDeviceProvider } from './providers/mock-access-device.provider';
import { ACCESS_DEVICE_PROVIDER } from './interfaces/access-device-provider.interface';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [AccessController, DeviceEventsController],
  providers: [
    AccessDecisionService,
    CheckInService,
    CheckOutService,
    AccessCredentialService,
    AccessDeviceService,
    AccessPolicyService,
    AccessOverrideService,
    AccessStatusService,
    AccessEventService,
    MockAccessDeviceProvider,
    {
      provide: ACCESS_DEVICE_PROVIDER,
      useExisting: MockAccessDeviceProvider,
    },
  ],
  exports: [
    AccessDecisionService,
    CheckInService,
    CheckOutService,
    AccessCredentialService,
    AccessDeviceService,
    AccessPolicyService,
    AccessOverrideService,
    AccessStatusService,
    AccessEventService,
    MockAccessDeviceProvider,
    ACCESS_DEVICE_PROVIDER,
  ],
})
export class AccessModule {}
