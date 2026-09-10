import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { CommonModule } from './common/common.module';
import { PermissionsModule } from './permissions/permissions.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { OrganisationsModule } from './organisations/organisations.module';
import { OutletsModule } from './outlets/outlets.module';
import { UsersModule } from './users/users.module';
import { MembersModule } from './members/members.module';
import { MembershipsModule } from './memberships/memberships.module';
import { PaymentsModule } from './payments/payments.module';
import { AccessModule } from './access/access.module';
import { BookingsModule } from './bookings/bookings.module';
import { AttendanceModule } from './attendance/attendance.module';
import { StaffModule } from './staff/staff.module';
import { PersonalTrainingModule } from './personal-training/personal-training.module';
import { ExercisesModule } from './exercises/exercises.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { TrainingPlansModule } from './training-plans/training-plans.module';
import { ProgressModule } from './progress/progress.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { CommunicationModule } from './communication/communication.module';
import { CommunicationsModule } from './communications/communications.module';
import { EngagementModule } from './engagement/engagement.module';
import { AIModule } from './ai/ai.module';
import { FitnessCoachModule } from './ai/features/fitness-coach/fitness-coach.module';
import { NutritionCoachModule } from './ai/features/nutrition-coach/nutrition-coach.module';
import { DailyCheckInModule } from './ai/features/daily-checkin/daily-checkin.module';
import { WearableIntelligenceModule } from './ai/features/wearable-intelligence/wearable-intelligence.module';
import { EngagementIntelligenceModule } from './ai/features/engagement-intelligence/engagement-intelligence.module';
import { RetentionIntelligenceModule } from './ai/features/retention-intelligence/retention-intelligence.module';
import { ReactivationModule } from './ai/features/reactivation/reactivation.module';
import { RetentionAgentModule } from './ai/features/retention-agent/retention-agent.module';
import { ReceptionistModule } from './ai/features/receptionist/receptionist.module';
import { ReceptionistWorkflowModule } from './ai/features/receptionist-workflows/receptionist-workflow.module';
import { SalesAgentModule } from './ai/features/sales-agent/sales-agent.module';
import { LeadsModule } from './leads/leads.module';
import { SalesPipelineModule } from './sales-pipeline/sales-pipeline.module';
import { LeadQualificationModule } from './ai/features/lead-qualification/lead-qualification.module';
import { FollowUpModule } from './ai/features/follow-up/follow-up.module';
import { SalesIntelligenceModule } from './sales-intelligence/sales-intelligence.module';
import { FinancialIntelligenceModule } from './financial-intelligence/financial-intelligence.module';
import { AutomationModule } from './automation/automation.module';
import { HealthModule } from './health/health.module';
import { WearablesModule } from './wearables/wearables.module';
import { VoiceModule } from './voice/voice.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { TenantGuard } from './tenancy/tenant.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    RedisModule,
    CommonModule,
    PermissionsModule,
    TenancyModule,
    AuditModule,
    AuthModule,
    OrganisationsModule,
    OutletsModule,
    UsersModule,
    MembersModule,
    MembershipsModule,
    PaymentsModule,
    AccessModule,
    BookingsModule,
    AttendanceModule,
    StaffModule,
    PersonalTrainingModule,
    ExercisesModule,
    WorkoutsModule,
    TrainingPlansModule,
    ProgressModule,
    NutritionModule,
    CommunicationModule,
    CommunicationsModule,
    EngagementModule,
    AIModule,
    FitnessCoachModule,
    NutritionCoachModule,
    DailyCheckInModule,
    WearableIntelligenceModule,
    EngagementIntelligenceModule,
    RetentionIntelligenceModule,
    ReactivationModule,
    RetentionAgentModule,
    ReceptionistModule,
    ReceptionistWorkflowModule,
    SalesAgentModule,
    LeadQualificationModule,
    LeadsModule,
    SalesPipelineModule,
    FollowUpModule,
    SalesIntelligenceModule,
    FinancialIntelligenceModule,
    AutomationModule,
    HealthModule,
    WearablesModule,
    VoiceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
