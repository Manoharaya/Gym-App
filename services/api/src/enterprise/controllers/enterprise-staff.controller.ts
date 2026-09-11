import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { EnterpriseStaffService } from '../services/enterprise-staff.service';
import { AssignStaffOutletDto, TransferStaffDto } from '../dto/staff-assignment.dto';

@Controller('enterprise/staff')
@UseGuards(JwtAuthGuard)
export class EnterpriseStaffController {
  constructor(private readonly staffService: EnterpriseStaffService) {}

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
  async assignStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Body() dto: AssignStaffOutletDto,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.staffService.assignStaffOutlet(orgId, dto, user.id);
  }

  @Post('transfer')
  async transferStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Body() dto: TransferStaffDto,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.staffService.transferStaff(orgId, dto, user.id);
  }

  @Get(':staffProfileId/assignments')
  async getStaffAssignments(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('staffProfileId') staffProfileId: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.staffService.getStaffAssignments(orgId, staffProfileId);
  }
}
