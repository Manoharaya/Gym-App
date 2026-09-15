import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { ExerciseMediaService } from '../services/exercise-media.service';
import { UpdateExerciseMediaDto } from '../dto/exercise-media.dto';

@ApiTags('Exercise Media')
@ApiBearerAuth()
@Controller('exercise-media')
export class ExerciseMediaController {
  constructor(private readonly mediaService: ExerciseMediaService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get(':id')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get single exercise media asset by ID with pre-signed access URL' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.mediaService.getMediaById(organisationId, id, user);
  }

  @Patch(':id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Update exercise media metadata, primary status, or sortOrder' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseMediaDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.mediaService.updateMedia(organisationId, id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('exercises', 'manage')
  @ApiOperation({ summary: 'Delete exercise media and safely clean up underlying storage file' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.mediaService.deleteMedia(organisationId, id, user);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('exercises', 'manage')
  @ApiOperation({ summary: 'Publish exercise media asset to make visible to members' })
  async publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.mediaService.publishMedia(organisationId, id, user);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('exercises', 'manage')
  @ApiOperation({ summary: 'Archive exercise media asset' })
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.mediaService.archiveMedia(organisationId, id, user);
  }
}
