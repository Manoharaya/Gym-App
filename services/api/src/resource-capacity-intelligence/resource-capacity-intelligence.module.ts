import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AIModule } from '../ai/ai.module';
import { AuditModule } from '../audit/audit.module';
import { ResourceCapacityIntelligenceController } from './controllers/resource-capacity-intelligence.controller';
import { ResourceCapacityIntelligenceService } from './services/resource-capacity-intelligence.service';
import { ResourceMetricService } from './services/resource-metric.service';
import { CapacityService } from './services/capacity.service';
import { UtilisationService } from './services/utilisation.service';
import { TrainerCapacityService } from './services/trainer-capacity.service';
import { RoomCapacityService } from './services/room-capacity.service';
import { EquipmentCapacityService } from './services/equipment-capacity.service';
import { ClassCapacityService } from './services/class-capacity.service';
import { PeakHourService } from './services/peak-hour.service';
import { BottleneckDetectionService } from './services/bottleneck.service';
import { ResourceHealthService } from './services/resource-health.service';
import { ResourceComparisonService } from './services/resource-comparison.service';
import { ResourceTrendService } from './services/resource-trend.service';
import { ResourceDataQualityService } from './services/resource-data-quality.service';
import { ResourceInsightService } from './services/resource-insight.service';
import { ResourcePermissionService } from './domain/resource-permission.service';
import { ResourceCacheService } from './services/resource-cache.service';
import { ResourceMetricRegistry } from './domain/resource-metric-registry';

@Module({
  imports: [DatabaseModule, AIModule, AuditModule],
  controllers: [ResourceCapacityIntelligenceController],
  providers: [
    ResourceCapacityIntelligenceService,
    ResourceMetricService,
    CapacityService,
    UtilisationService,
    TrainerCapacityService,
    RoomCapacityService,
    EquipmentCapacityService,
    ClassCapacityService,
    PeakHourService,
    BottleneckDetectionService,
    ResourceHealthService,
    ResourceComparisonService,
    ResourceTrendService,
    ResourceDataQualityService,
    ResourceInsightService,
    ResourcePermissionService,
    ResourceCacheService,
    ResourceMetricRegistry,
  ],
  exports: [
    ResourceCapacityIntelligenceService,
    ResourceMetricService,
    CapacityService,
    UtilisationService,
    TrainerCapacityService,
    RoomCapacityService,
    ClassCapacityService,
    PeakHourService,
    BottleneckDetectionService,
    ResourceHealthService,
    ResourceMetricRegistry,
    ResourcePermissionService,
  ],
})
export class ResourceCapacityIntelligenceModule {}
