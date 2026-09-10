import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { SalesPipelineService } from '../application/sales-pipeline.service';
import { SalesOpportunityService } from '../application/sales-opportunity.service';
import { SalesStageTransitionService } from '../application/sales-stage-transition.service';
import { SalesActivityService } from '../application/sales-activity.service';
import { SalesTaskService } from '../application/sales-task.service';
import { SalesConversionService } from '../application/sales-conversion.service';
import { SalesPipelineBoardService } from '../application/sales-pipeline-board.service';
import {
  CreatePipelineDto,
  CreateOpportunityDto,
  UpdateOpportunityDto,
  TransitionStageDto,
  LogActivityDto,
  CreateSalesTaskDto,
  UpdateSalesTaskDto,
  ReopenOpportunityDto,
  VerifyConversionDto,
  OpportunityFilterDto,
  PipelineMetricsQueryDto,
} from '../dto/sales-pipeline.dto';
import { SalesTaskStatus } from '@fitcore/types';

@Controller('sales')
export class SalesPipelineController {
  constructor(
    private readonly pipelineService: SalesPipelineService,
    private readonly opportunityService: SalesOpportunityService,
    private readonly transitionService: SalesStageTransitionService,
    private readonly activityService: SalesActivityService,
    private readonly taskService: SalesTaskService,
    private readonly conversionService: SalesConversionService,
    private readonly boardService: SalesPipelineBoardService,
  ) {}

  private resolveOrganisationId(orgHeader?: string): string {
    if (!orgHeader) {
      throw new BadRequestException('Missing required x-organisation-id header');
    }
    return orgHeader;
  }

  // ==================== PIPELINES ====================

  @Get('pipelines/default')
  async getDefaultPipeline(
    @Headers('x-organisation-id') orgHeader: string,
    @Query('outletId') outletId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.pipelineService.getOrCreateDefaultPipeline(organisationId, outletId);
  }

  @Post('pipelines')
  async createPipeline(
    @Headers('x-organisation-id') orgHeader: string,
    @Body() dto: CreatePipelineDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.pipelineService.createPipeline(organisationId, dto);
  }

  @Get('pipelines')
  async listPipelines(
    @Headers('x-organisation-id') orgHeader: string,
    @Query('outletId') outletId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.pipelineService.listPipelines(organisationId, outletId);
  }

  @Get('pipelines/:id')
  async getPipeline(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') pipelineId: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.pipelineService.getPipeline(organisationId, pipelineId);
  }

  // ==================== BOARD & METRICS ====================

  @Get('board')
  async getPipelineBoard(
    @Headers('x-organisation-id') orgHeader: string,
    @Query('pipelineId') pipelineId?: string,
    @Query('outletId') outletId?: string,
    @Query('staffId') staffId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.boardService.getPipelineBoard(
      organisationId,
      pipelineId,
      outletId,
      staffId,
    );
  }

  @Get('metrics')
  async getPipelineMetrics(
    @Headers('x-organisation-id') orgHeader: string,
    @Query() query: PipelineMetricsQueryDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.boardService.getPipelineMetrics(organisationId, query);
  }

  // ==================== OPPORTUNITIES ====================

  @Post('opportunities')
  async createOpportunity(
    @Headers('x-organisation-id') orgHeader: string,
    @Body() dto: CreateOpportunityDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.opportunityService.createOpportunity(organisationId, dto);
  }

  @Get('opportunities')
  async listOpportunities(
    @Headers('x-organisation-id') orgHeader: string,
    @Query() filter: OpportunityFilterDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.opportunityService.listOpportunities(organisationId, filter);
  }

  @Get('opportunities/:id')
  async getOpportunity(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.opportunityService.getOpportunity(organisationId, id);
  }

  @Patch('opportunities/:id')
  async updateOpportunity(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.opportunityService.updateOpportunity(organisationId, id, dto);
  }

  @Post('opportunities/:id/transition')
  async transitionStage(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
    @Body() dto: TransitionStageDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.transitionService.transitionStage(organisationId, id, dto);
  }

  @Post('opportunities/:id/convert')
  async convertOpportunity(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
    @Body() dto: VerifyConversionDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.conversionService.convertOpportunity(organisationId, id, dto);
  }

  @Post('opportunities/:id/reopen')
  async reopenOpportunity(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
    @Body() dto: ReopenOpportunityDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.opportunityService.reopenOpportunity(organisationId, id, dto);
  }

  // ==================== ACTIVITIES ====================

  @Post('opportunities/:id/activities')
  async logActivity(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
    @Body() dto: LogActivityDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.activityService.logActivity(organisationId, id, dto);
  }

  @Get('opportunities/:id/activities')
  async listActivities(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.activityService.listActivities(organisationId, id);
  }

  // ==================== TASKS ====================

  @Post('opportunities/:id/tasks')
  async createTask(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
    @Body() dto: CreateSalesTaskDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.taskService.createTask(organisationId, id, dto);
  }

  @Patch('tasks/:id')
  async updateTask(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
    @Body() dto: UpdateSalesTaskDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.taskService.updateTask(organisationId, id, dto);
  }

  @Get('tasks')
  async listTasks(
    @Headers('x-organisation-id') orgHeader: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('staffId') staffId?: string,
    @Query('status') status?: SalesTaskStatus,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.taskService.listTasks(organisationId, opportunityId, staffId, status);
  }
}
