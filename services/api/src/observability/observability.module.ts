import { Module, Global } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { CommonModule } from '../common/common.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ObservabilityController } from './observability.controller';
import { ObservabilityService } from './observability.service';
import { LogRedactionService } from './logging/log-redaction.service';
import { StructuredLoggerService } from './logging/structured-logger.service';
import { TraceContextService } from './tracing/trace-context.service';
import { MetricRegistryService } from './metrics/metric-registry.service';
import { ObservabilityHealthService } from './health/observability-health.service';
import { AlertEngineService } from './alerts/alert-engine.service';
import { IncidentService } from './incidents/incident.service';
import { QueueTelemetryService } from './queues/queue-telemetry.service';
import { AiTelemetryService } from './ai/ai-telemetry.service';
import { SloService } from './slo/slo.service';

@Global()
@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    CommonModule,
    TenancyModule,
    PermissionsModule,
  ],
  controllers: [ObservabilityController],
  providers: [
    ObservabilityService,
    LogRedactionService,
    StructuredLoggerService,
    TraceContextService,
    MetricRegistryService,
    ObservabilityHealthService,
    AlertEngineService,
    IncidentService,
    QueueTelemetryService,
    AiTelemetryService,
    SloService,
  ],
  exports: [
    ObservabilityService,
    LogRedactionService,
    StructuredLoggerService,
    TraceContextService,
    MetricRegistryService,
    ObservabilityHealthService,
    AlertEngineService,
    IncidentService,
    QueueTelemetryService,
    AiTelemetryService,
    SloService,
  ],
})
export class ObservabilityModule {}
