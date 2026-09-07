import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ModelRegistryService } from '../models/model-registry.service';
import { AIUsageService } from '../usage/ai-usage.service';
import { AIObservabilityService } from '../services/ai-observability.service';
import { CreateAIModelDto, UpdateAIModelDto, AIUsageQueryDto } from '../dto/ai.dto';

@ApiTags('AI Superadmin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('superadmin/ai')
export class AISuperadminController {
  constructor(
    private readonly modelRegistry: ModelRegistryService,
    private readonly usageService: AIUsageService,
    private readonly observabilityService: AIObservabilityService,
  ) {}

  @Get('models')
  @RequirePermissions({ resource: 'ai', action: 'manage', scope: 'PLATFORM' })
  @ApiOperation({ summary: 'List all registered AI models across providers' })
  async listModels(@Query('provider') provider?: string, @Query('status') status?: string) {
    return this.modelRegistry.listModels(provider, status);
  }

  @Post('models')
  @RequirePermissions({ resource: 'ai', action: 'manage', scope: 'PLATFORM' })
  @ApiOperation({ summary: 'Register a new AI model' })
  async createModel(@Body() dto: CreateAIModelDto) {
    return this.modelRegistry.createModel(dto);
  }

  @Put('models/:id')
  @RequirePermissions({ resource: 'ai', action: 'manage', scope: 'PLATFORM' })
  @ApiOperation({ summary: 'Update an AI model status, capabilities, or pricing' })
  async updateModel(@Param('id') id: string, @Body() dto: UpdateAIModelDto) {
    return this.modelRegistry.updateModel(id, dto);
  }

  @Get('usage')
  @RequirePermissions({ resource: 'ai', action: 'manage', scope: 'PLATFORM' })
  @ApiOperation({ summary: 'Get platform-wide AI usage and cost analytics' })
  async getPlatformUsage(@Query() query: AIUsageQueryDto) {
    return this.usageService.getPlatformUsageSummary(query);
  }

  @Get('observability')
  @RequirePermissions({ resource: 'ai', action: 'manage', scope: 'PLATFORM' })
  @ApiOperation({ summary: 'Get platform-wide AI observability metrics' })
  async getPlatformMetrics() {
    return this.observabilityService.getMetrics();
  }
}
