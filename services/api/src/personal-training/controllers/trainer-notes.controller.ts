import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { TrainerNoteService } from '../services/trainer-note.service';
import { CreateTrainerNoteDto, UpdateTrainerNoteDto } from '../dto/personal-training.dto';

@ApiTags('Trainer Notes & Privacy')
@ApiBearerAuth()
@Controller()
export class TrainerNotesController {
  constructor(private readonly noteService: TrainerNoteService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Post('members/:memberId/trainer-notes')
  @RequirePermission('trainer_notes', 'manage')
  @ApiOperation({ summary: 'Create a coaching note for a member' })
  async createNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: CreateTrainerNoteDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.noteService.createNote(organisationId, memberId, dto, user);
  }

  @Get('members/:memberId/trainer-notes')
  @RequirePermission('trainer_notes', 'read')
  @ApiOperation({ summary: 'Get coaching notes for a member filtered by caller visibility' })
  async findMemberNotes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.noteService.findMemberNotes(organisationId, memberId, user);
  }

  @Patch('trainer-notes/:id')
  @RequirePermission('trainer_notes', 'manage')
  @ApiOperation({ summary: 'Update note content or visibility (Author only)' })
  async updateNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTrainerNoteDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.noteService.updateNote(organisationId, id, dto, user);
  }

  @Delete('trainer-notes/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trainer_notes', 'manage')
  @ApiOperation({ summary: 'Delete a coaching note (Author only)' })
  async deleteNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.noteService.deleteNote(organisationId, id, user);
  }
}
