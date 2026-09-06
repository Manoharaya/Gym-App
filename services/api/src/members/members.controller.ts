import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { OnboardingService } from './onboarding.service';
import { ParqService } from './parq.service';
import { ConsentService } from './consent.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';
import {
  CreateMemberDto,
  UpdateMemberProfileDto,
  StaffUpdateMemberDto,
  MemberFilterDto,
  UpdateOnboardingStepDto,
  SaveParqDraftDto,
  SubmitParqDto,
  RecordConsentDto,
  CreateInjuryDto,
  UpdateInjuryDto,
  CreateSignatureDto,
  RequestDocumentUploadDto,
  RegisterDocumentDto,
} from './dto/member-domain.dto';

@ApiTags('Members & Onboarding')
@ApiBearerAuth()
@Controller()
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly onboardingService: OnboardingService,
    private readonly parqService: ParqService,
    private readonly consentService: ConsentService
  ) {}

  // ==========================================
  // 1. Current Member Profile & Self Service
  // ==========================================

  @Get('members/me')
  @ApiOperation({ summary: 'Get current authenticated member profile' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.getMemberProfileByUserId(user.id);
  }

  @Patch('members/me')
  @ApiOperation({ summary: 'Update current member profile' })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMemberProfileDto
  ) {
    return this.membersService.updateSelfProfile(user.id, dto);
  }

  // ==========================================
  // 2. Onboarding Workflow
  // ==========================================

  @Get('members/me/onboarding')
  @ApiOperation({ summary: 'Get member onboarding progress and step status' })
  async getOnboardingProgress(@CurrentUser() user: AuthenticatedUser) {
    return this.onboardingService.getOnboardingProgress(user.id);
  }

  @Post('members/me/onboarding/start')
  @ApiOperation({ summary: 'Start or resume onboarding session' })
  async startOnboarding(@CurrentUser() user: AuthenticatedUser) {
    return this.onboardingService.startOnboarding(user.id);
  }

  @Patch('members/me/onboarding/step')
  @ApiOperation({ summary: 'Update active onboarding step' })
  async updateOnboardingStep(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOnboardingStepDto
  ) {
    return this.onboardingService.updateCurrentStep(user.id, dto.step);
  }

  @Post('members/me/onboarding/complete')
  @ApiOperation({ summary: 'Finalize and authoritatively complete member onboarding' })
  async completeOnboarding(@CurrentUser() user: AuthenticatedUser) {
    return this.onboardingService.validateAndCompleteOnboarding(user.id);
  }

  // ==========================================
  // 3. PAR-Q Domain
  // ==========================================

  @Get('members/me/parq')
  @ApiOperation({ summary: 'Get active PAR-Q questionnaire and current member response' })
  async getParq(@CurrentUser() user: AuthenticatedUser) {
    const [questionnaire, submission] = await Promise.all([
      this.parqService.getActiveQuestionnaire(),
      this.parqService.getMemberSubmission(user.id),
    ]);

    return { questionnaire, submission };
  }

  @Post('members/me/parq/draft')
  @ApiOperation({ summary: 'Save draft PAR-Q responses' })
  async saveParqDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveParqDraftDto
  ) {
    return this.parqService.saveDraft(user.id, dto);
  }

  @Post('members/me/parq/submit')
  @ApiOperation({ summary: 'Submit final PAR-Q responses immutably' })
  async submitParq(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitParqDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.parqService.submitParq(user.id, dto, ipAddress, userAgent);
  }

  // ==========================================
  // 4. Consent Domain
  // ==========================================

  @Get('members/me/consents')
  @ApiOperation({ summary: 'Get all compliance consent requirements and member records' })
  async getConsents(@CurrentUser() user: AuthenticatedUser) {
    return this.consentService.getConsentRequirements(user.id);
  }

  @Post('members/me/consents')
  @ApiOperation({ summary: 'Record consent or decline' })
  async recordConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordConsentDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.consentService.recordConsent(user.id, dto, ipAddress, userAgent);
  }

  @Post('members/me/consents/:id/withdraw')
  @ApiOperation({ summary: 'Withdraw consent' })
  async withdrawConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') consentTypeId: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.consentService.withdrawConsent(user.id, consentTypeId, ipAddress, userAgent);
  }

  // ==========================================
  // 5. Injuries Domain
  // ==========================================

  @Get('members/me/injuries')
  @ApiOperation({ summary: 'Get current member injury records' })
  async getInjuries(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.getInjuries(user.id);
  }

  @Post('members/me/injuries')
  @ApiOperation({ summary: 'Log a new injury' })
  async createInjury(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInjuryDto
  ) {
    return this.membersService.createInjury(user.id, dto);
  }

  @Patch('members/me/injuries/:id')
  @ApiOperation({ summary: 'Update injury status or details' })
  async updateInjury(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') injuryId: string,
    @Body() dto: UpdateInjuryDto
  ) {
    return this.membersService.updateInjury(user.id, injuryId, dto);
  }

  // ==========================================
  // 6. Signatures
  // ==========================================

  @Post('members/me/signature')
  @ApiOperation({ summary: 'Record digital signature / electronic acceptance' })
  async createSignature(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSignatureDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.membersService.createSignature(user.id, dto, ipAddress, userAgent);
  }

  // ==========================================
  // 7. Secure Document Storage
  // ==========================================

  @Post('members/me/documents/upload-url')
  @ApiOperation({ summary: 'Request temporary signed upload URL for member document' })
  async requestUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestDocumentUploadDto
  ) {
    return this.membersService.requestDocumentUploadUrl(user.id, dto);
  }

  @Post('members/me/documents')
  @ApiOperation({ summary: 'Register uploaded document metadata' })
  async registerDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDocumentDto
  ) {
    return this.membersService.registerDocument(user.id, dto);
  }

  @Get('members/me/documents/:id/download-url')
  @ApiOperation({ summary: 'Request temporary signed download URL for member document' })
  async getDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') documentId: string
  ) {
    return this.membersService.getDocumentDownloadUrl(user.id, documentId, {
      userId: user.id,
      roles: user.roles,
      isSuperAdmin: user.isSuperAdmin,
    });
  }

  // ==========================================
  // 8. Staff Member Management (Tenant Scoped)
  // ==========================================

  @Get('organisations/:orgId/members')
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER', 'RECEPTION')
  @ApiOperation({ summary: 'List members for an organisation' })
  async listOrgMembers(
    @Param('orgId') orgId: string,
    @Query() filter: MemberFilterDto
  ) {
    return this.membersService.findAllForOrg(orgId, filter);
  }

  @Post('organisations/:orgId/members')
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER')
  @ApiOperation({ summary: 'Create/invite a new member into an organisation' })
  async createMember(
    @Param('orgId') orgId: string,
    @Body() dto: CreateMemberDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.membersService.createMemberForOrg(orgId, dto, user.id);
  }

  @Get('members')
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER')
  @ApiOperation({ summary: 'List permitted members across caller active tenant' })
  async listMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: MemberFilterDto
  ) {
    const orgId = user.roles[0]?.organisationId || '';
    return this.membersService.findAllForOrg(orgId, filter);
  }

  @Get('members/:memberId')
  @ApiOperation({ summary: 'Get single member details with IDOR defense' })
  async getMemberById(
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.membersService.findByIdScoped(memberId, {
      userId: user.id,
      roles: user.roles,
      isSuperAdmin: user.isSuperAdmin,
    });
  }

  @Patch('members/:memberId')
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER')
  @ApiOperation({ summary: 'Update member status or details by authorized staff' })
  async updateMemberById(
    @Param('memberId') memberId: string,
    @Body() dto: StaffUpdateMemberDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.membersService.updateMemberStatus(memberId, dto, {
      userId: user.id,
      roles: user.roles,
      isSuperAdmin: user.isSuperAdmin,
    });
  }
}
