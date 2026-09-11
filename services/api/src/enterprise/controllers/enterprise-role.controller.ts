import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { EnterpriseRoleService } from '../services/enterprise-role.service';
import { CreateRoleAssignmentDto } from '../dto/create-role-assignment.dto';

@Controller('enterprise/roles')
@UseGuards(JwtAuthGuard)
export class EnterpriseRoleController {
  constructor(private readonly roleService: EnterpriseRoleService) {}

  private extractOrgId(user: AuthenticatedUser, req: any): string {
    const orgId =
      req?.headers?.['x-organisation-id'] ||
      req?.headers?.['X-Organisation-Id'] ||
      user?.primaryOrganisationId ||
      user?.roles?.[0]?.organisationId;

    if (!orgId) {
      throw new BadRequestException('Organisation context is required');
    }
    return orgId;
  }

  @Post('assign')
  async assignRole(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Body() dto: CreateRoleAssignmentDto,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.roleService.assignRole(orgId, dto, user);
  }

  @Get('assignments')
  async getRoleAssignments(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('roleName') roleName?: string,
    @Query('scopeType') scopeType?: string,
    @Query('scopeId') scopeId?: string,
    @Query('status') status?: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.roleService.getRoleAssignments(orgId, {
      userId,
      roleName,
      scopeType,
      scopeId,
      status,
    });
  }

  @Post('revoke/:id')
  async revokeRole(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.roleService.revokeRoleAssignment(orgId, id, user, reason);
  }
}
