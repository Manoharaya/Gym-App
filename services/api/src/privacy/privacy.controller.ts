import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../database/prisma.service';
import { PrivacyService } from './privacy.service';
import { PrivacyCatalogService } from './catalog/privacy-catalog.service';
import { PrivacyConsentService } from './consent/privacy-consent.service';
import { PrivacyPreferencesService } from './preferences/privacy-preferences.service';
import { PrivacyRequestService } from './requests/privacy-request.service';
import { PrivacyDataAccessService } from './access/privacy-data-access.service';
import { PrivacyExportService } from './export/privacy-export.service';
import { PrivacyDeletionService } from './deletion/privacy-deletion.service';
import { PrivacyRetentionService } from './retention/privacy-retention.service';
import { PrivacyRetentionProcessorService } from './retention/privacy-retention-processor.service';
import { PrivacyRetentionHoldService } from './retention/privacy-retention-hold.service';
import { PrivacyProcessorService } from './processors/privacy-processor.service';
import { PrivacyDataQualityService } from './quality/privacy-data-quality.service';
import {
  CreatePrivacyRequestDto,
  UpdatePrivacyPreferencesDto,
  RequestDataExportDto,
  RequestDataDeletionDto,
  WithdrawConsentDto,
  CreateRetentionHoldDto,
  CreateRetentionPolicyDto,
  CreateProcessorDto,
  ReviewPrivacyRequestDto,
} from './dto/privacy.dto';
import { PrivacyRequestStatus, PrivacyRequestType } from '@fitcore/types';

@Controller('privacy')
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(
    private readonly privacyService: PrivacyService,
    private readonly catalogService: PrivacyCatalogService,
    private readonly consentService: PrivacyConsentService,
    private readonly preferencesService: PrivacyPreferencesService,
    private readonly requestService: PrivacyRequestService,
    private readonly dataAccessService: PrivacyDataAccessService,
    private readonly exportService: PrivacyExportService,
    private readonly deletionService: PrivacyDeletionService,
    private readonly retentionService: PrivacyRetentionService,
    private readonly retentionProcessor: PrivacyRetentionProcessorService,
    private readonly holdService: PrivacyRetentionHoldService,
    private readonly processorService: PrivacyProcessorService,
    private readonly qualityService: PrivacyDataQualityService,
    private readonly prisma: PrismaService,
  ) {}

  private getOrgId(req: any): string {
    return (
      (req.headers && req.headers['x-organisation-id']) ||
      req.user?.primaryOrganisationId ||
      req.user?.organisationId ||
      req.user?.roles?.[0]?.organisationId ||
      ''
    );
  }

  // ==========================================
  // MEMBER-FACING PRIVACY APIS
  // ==========================================

  @Get('overview')
  async getOverview(@Req() req: any) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    return this.privacyService.getMemberOverview(userId, organisationId);
  }

  @Get('data')
  async getMemberData(@Req() req: any) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    const memberId = await this.privacyService.resolveMemberId(userId, organisationId);
    return this.dataAccessService.getMemberDataAccessView(memberId, organisationId);
  }

  @Get('data-categories')
  async getDataCategories(@Req() req: any) {
    const organisationId = this.getOrgId(req);
    return this.catalogService.getCatalog(organisationId);
  }

  @Get('consents')
  async getConsents(@Req() req: any) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    const memberId = await this.privacyService.resolveMemberId(userId, organisationId);
    return this.consentService.getMemberConsents(memberId);
  }

  @Post('consents/withdraw')
  async withdrawConsent(@Req() req: any, @Body() dto: WithdrawConsentDto) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    const memberId = await this.privacyService.resolveMemberId(userId, organisationId);
    return this.consentService.withdrawConsent(memberId, dto.consentTypeKey, {
      reason: dto.reason,
      actorUserId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('consents/grant')
  async grantConsent(@Req() req: any, @Body() dto: { consentTypeKey: string }) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    const memberId = await this.privacyService.resolveMemberId(userId, organisationId);
    return this.consentService.grantConsent(memberId, dto.consentTypeKey, {
      actorUserId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('preferences')
  async getPreferences(@Req() req: any) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    const memberId = await this.privacyService.resolveMemberId(userId, organisationId);
    return this.preferencesService.getPreferences(memberId, organisationId);
  }

  @Patch('preferences')
  async updatePreferences(@Req() req: any, @Body() dto: UpdatePrivacyPreferencesDto) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    const memberId = await this.privacyService.resolveMemberId(userId, organisationId);
    return this.preferencesService.updatePreferences(memberId, organisationId, dto);
  }

  @Get('requests')
  async getRequests(@Req() req: any) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    return this.requestService.getMemberRequests(organisationId, userId);
  }

  @Post('requests')
  async createRequest(@Req() req: any, @Body() dto: CreatePrivacyRequestDto) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    let memberId: string | null = null;
    try {
      memberId = await this.privacyService.resolveMemberId(userId, organisationId);
    } catch {
      // Allow non-member users (e.g. leads, guest) to request access/deletion of user account
    }

    return this.requestService.createRequest(
      organisationId,
      userId,
      memberId,
      dto.type,
      dto.reason,
      dto.metadata,
      dto.stepUpToken,
    );
  }

  @Get('requests/:id')
  async getRequestById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    return this.requestService.getRequestById(id, organisationId, userId);
  }

  @Post('requests/:id/verify')
  async verifyRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body('stepUpToken') stepUpToken: string,
  ) {
    const userId = req.user.id;
    return this.requestService.verifyRequest(id, userId, stepUpToken);
  }

  @Post('requests/:id/cancel')
  async cancelRequest(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    return this.requestService.cancelRequest(id, userId, organisationId);
  }

  @Post('export')
  async requestExport(@Req() req: any, @Body() dto: RequestDataExportDto) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    const memberId = await this.privacyService.resolveMemberId(userId, organisationId);

    // Look for an existing APPROVED or pending export request for this member
    const existing = await this.prisma.privacyRequest.findFirst({
      where: {
        organisationId,
        memberId,
        type: 'EXPORT',
        status: { in: ['APPROVED', 'IDENTITY_VERIFICATION_REQUIRED', 'SUBMITTED'] },
      },
    });

    let requestId: string;
    if (existing) {
      requestId = existing.id;
    } else {
      const created = await this.requestService.createRequest(
        organisationId,
        userId,
        memberId,
        'EXPORT',
        dto.reason || 'Member requested export',
        { formats: dto.formats || ['JSON'] },
        dto.stepUpToken,
      );
      requestId = created.id;
    }

    return this.exportService.createExportJob(
      organisationId,
      memberId,
      dto.formats || ['JSON'],
      requestId,
    );
  }

  @Get('exports/:id')
  async getExportStatus(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    const memberId = await this.privacyService.resolveMemberId(userId, organisationId);
    return this.exportService.getExportStatus(id, memberId, organisationId);
  }

  @Get('exports/:id/download')
  async downloadExport(
    @Req() req: any,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    const memberId = await this.privacyService.resolveMemberId(userId, organisationId);

    const result = await this.exportService.downloadExport(id, memberId, organisationId);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return result.data;
  }

  @Post('deletion-request')
  async requestDeletion(@Req() req: any, @Body() dto: RequestDataDeletionDto) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    const memberId = await this.privacyService.resolveMemberId(userId, organisationId);

    // Create privacy request tracking entry
    const request = await this.requestService.createRequest(
      organisationId,
      userId,
      memberId,
      'DELETION',
      dto.reason || 'Member requested full deletion',
      { confirmed: dto.confirmed ?? true },
      dto.stepUpToken,
    );

    // Generate deletion plan
    const plan = await this.deletionService.createDeletionPlan(
      organisationId,
      memberId,
      request.id,
    );

    return {
      request,
      plan,
      message:
        plan.requiresReview
          ? 'Deletion request submitted and awaiting administrative review due to operational hold.'
          : 'Deletion request approved and scheduled for execution.',
    };
  }

  @Get('wearables')
  async getWearables(@Req() req: any) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    return this.privacyService.getWearablesPrivacy(userId, organisationId);
  }

  @Post('wearables/:provider/disconnect')
  async disconnectWearable(@Req() req: any, @Param('provider') provider: string) {
    const userId = req.user.id;
    const organisationId = this.getOrgId(req);
    return this.privacyService.disconnectWearable(userId, organisationId, provider);
  }

  // ==========================================
  // STAFF / COMPLIANCE ADMIN APIS
  // ==========================================

  @Get('admin/dashboard')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async getAdminDashboard(@Req() req: any) {
    const organisationId = this.getOrgId(req);
    return this.privacyService.getAdminComplianceDashboard(organisationId);
  }

  @Get('admin/requests')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async getAdminQueue(
    @Req() req: any,
    @Query('status') status?: PrivacyRequestStatus,
    @Query('type') type?: PrivacyRequestType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const organisationId = this.getOrgId(req);
    return this.requestService.getQueue(organisationId, {
      status,
      type,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('admin/requests/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async getAdminRequestById(@Req() req: any, @Param('id') id: string) {
    const organisationId = this.getOrgId(req);
    return this.requestService.getRequestById(id, organisationId);
  }

  @Post('admin/requests/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async approveRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewPrivacyRequestDto,
  ) {
    const organisationId = this.getOrgId(req);
    const staffUserId = req.user.id;
    return this.requestService.updateStatusByStaff(
      id,
      organisationId,
      staffUserId,
      'APPROVED',
      dto.resolution,
    );
  }

  @Post('admin/requests/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async rejectRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewPrivacyRequestDto,
  ) {
    const organisationId = this.getOrgId(req);
    const staffUserId = req.user.id;
    return this.requestService.updateStatusByStaff(
      id,
      organisationId,
      staffUserId,
      'REJECTED',
      dto.reason || 'Rejected per compliance policy',
    );
  }

  @Post('admin/requests/:id/complete')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async completeRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewPrivacyRequestDto,
  ) {
    const organisationId = this.getOrgId(req);
    const staffUserId = req.user.id;
    return this.requestService.updateStatusByStaff(
      id,
      organisationId,
      staffUserId,
      'COMPLETED',
      dto.resolution || 'Request marked complete by compliance staff',
    );
  }

  @Get('admin/deletions/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async getDeletionPlan(@Req() req: any, @Param('id') id: string) {
    const organisationId = this.getOrgId(req);
    return this.deletionService.getPlan(id, organisationId);
  }

  @Post('admin/deletions/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async approveDeletionPlan(@Req() req: any, @Param('id') id: string) {
    const organisationId = this.getOrgId(req);
    const staffUserId = req.user.id;
    return this.deletionService.approvePlan(id, organisationId, staffUserId);
  }

  @Post('admin/deletions/:id/execute')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async executeDeletionPlan(@Req() req: any, @Param('id') id: string) {
    const organisationId = this.getOrgId(req);
    return this.deletionService.executePlan(id, organisationId);
  }

  @Get('admin/retention')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async getRetentionPolicies(@Req() req: any) {
    const organisationId = this.getOrgId(req);
    return this.retentionService.getPolicies(organisationId);
  }

  @Post('admin/retention')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async createRetentionPolicy(@Req() req: any, @Body() dto: CreateRetentionPolicyDto) {
    const organisationId = this.getOrgId(req);
    return this.retentionService.createPolicy(organisationId, dto);
  }

  @Post('admin/retention/run')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async runRetentionCycle(@Req() req: any) {
    const organisationId = this.getOrgId(req);
    return this.retentionProcessor.runRetentionCycle(organisationId);
  }

  @Get('admin/holds')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async getRetentionHolds(@Req() req: any) {
    const organisationId = this.getOrgId(req);
    return this.holdService.getHolds(organisationId);
  }

  @Post('admin/holds')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async createRetentionHold(@Req() req: any, @Body() dto: CreateRetentionHoldDto) {
    const organisationId = this.getOrgId(req);
    const userId = req.user.id;
    return this.holdService.createHold(
      organisationId,
      userId,
      dto.dataCategory,
      dto.reason,
      dto.memberId,
    );
  }

  @Patch('admin/holds/:id/release')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async releaseRetentionHold(@Req() req: any, @Param('id') id: string) {
    const organisationId = this.getOrgId(req);
    const userId = req.user.id;
    return this.holdService.releaseHold(id, organisationId, userId);
  }

  @Get('admin/processors')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async getProcessors(@Req() req: any) {
    const organisationId = this.getOrgId(req);
    return this.processorService.getProcessors(organisationId);
  }

  @Post('admin/processors')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async registerProcessor(@Req() req: any, @Body() dto: CreateProcessorDto) {
    const organisationId = this.getOrgId(req);
    return this.processorService.registerProcessor(organisationId, dto);
  }

  @Get('admin/quality')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN', 'COMPLIANCE_MANAGER')
  async getQualityReport(@Req() req: any) {
    const organisationId = this.getOrgId(req);
    return this.qualityService.getQualityReport(organisationId);
  }
}
