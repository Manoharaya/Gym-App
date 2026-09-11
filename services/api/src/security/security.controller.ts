import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';
import { SecurityService } from './security.service';
import {
  EnrollMfaDto,
  VerifyMfaDto,
  DisableMfaDto,
  RegenerateRecoveryCodesDto,
  UpdateDeviceDto,
  CreateIpPolicyDto,
  RequestStepUpChallengeDto,
  VerifyStepUpChallengeDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
  UpdateSecurityPolicyDto,
  SecurityQueryDto,
} from './dto/security.dto';

@Controller('security')
@UseGuards(JwtAuthGuard)
export class SecurityController {
  constructor(private readonly security: SecurityService) {}

  private extractOrgId(user: AuthenticatedUser, req: any): string {
    const orgId =
      req?.tenantContext?.organisationId ||
      req?.headers?.['x-organisation-id'] ||
      req?.headers?.['X-Organisation-Id'] ||
      user?.primaryOrganisationId ||
      user?.roles?.[0]?.organisationId;

    if (!orgId) {
      throw new BadRequestException('Organisation context is required');
    }
    return orgId;
  }

  private assertAdminPrivileges(user: AuthenticatedUser): void {
    const adminRoles = ['SUPERADMIN', 'ORGANISATION_OWNER', 'ENTERPRISE_ADMIN'];
    const hasAdmin = user.roles.some((r) => adminRoles.includes(r.role));
    if (!hasAdmin) {
      throw new ForbiddenException('Administrative security access required');
    }
  }

  // ==========================================
  // 1. OVERVIEW & METRICS
  // ==========================================

  @Get('overview')
  async getOverview(@CurrentUser() user: AuthenticatedUser, @Req() req: any) {
    this.assertAdminPrivileges(user);
    const orgId = this.extractOrgId(user, req);
    return this.security.getOverviewMetrics(orgId);
  }

  // ==========================================
  // 2. MULTI-FACTOR AUTHENTICATION (MFA)
  // ==========================================

  @Get('mfa')
  async getMfaStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.security.mfa.getUserMfaStatus(user.id);
  }

  @Post('mfa/enroll')
  async enrollMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: EnrollMfaDto) {
    const result = await this.security.mfa.enrollTotp(user.id, dto.label);

    await this.security.events.recordEvent({
      userId: user.id,
      eventType: 'MFA_ENABLED',
      severity: 'INFO',
      source: 'USER',
      metadata: { method: 'TOTP', status: 'PENDING_VERIFICATION' },
    });

    return {
      methodId: result.methodId,
      type: result.type,
      secret: result.secret,
      keyUri: result.keyUri,
      recoveryCodes: result.recoveryCodes,
    };
  }

  @Post('mfa/verify')
  async verifyMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyMfaDto) {
    if (dto.challengeToken) {
      // Verifying a step-up or login challenge
      const isOk = await this.security.stepUp.verifyChallenge(user.id, dto.challengeToken, {
        mfaCode: dto.code,
      });
      return { verified: isOk };
    }

    // Normal enrollment verification
    const verified = await this.security.mfa.verifyEnrollment(user.id, dto.code);

    await this.security.events.recordEvent({
      userId: user.id,
      eventType: 'MFA_ENABLED',
      severity: 'INFO',
      source: 'USER',
      metadata: { method: 'TOTP', status: 'ACTIVE' },
    });

    return { verified };
  }

  @Post('mfa/disable')
  async disableMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: DisableMfaDto) {
    // Require verified step-up token
    await this.security.stepUp.consumeChallenge(user.id, dto.stepUpToken, 'DISABLE_MFA');

    await this.security.mfa.disableMfa(user.id);

    await this.security.events.recordEvent({
      userId: user.id,
      eventType: 'MFA_DISABLED',
      severity: 'HIGH',
      source: 'USER',
      metadata: { action: 'MFA_DISABLED' },
    });

    return { success: true };
  }

  @Post('mfa/recovery-codes/regenerate')
  async regenerateRecoveryCodes(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegenerateRecoveryCodesDto,
  ) {
    // Require verified step-up token
    await this.security.stepUp.consumeChallenge(
      user.id,
      dto.stepUpToken,
      'REGENERATE_RECOVERY_CODES',
    );

    const codes = await this.security.mfa.regenerateRecoveryCodes(user.id);

    await this.security.events.recordEvent({
      userId: user.id,
      eventType: 'RECOVERY_CODE_USED',
      severity: 'MEDIUM',
      source: 'USER',
      metadata: { action: 'RECOVERY_CODES_REGENERATED' },
    });

    return { recoveryCodes: codes };
  }

  // ==========================================
  // 3. SESSIONS MANAGEMENT
  // ==========================================

  @Get('sessions')
  async getSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.security.sessions.getUserSessions(user.id);
  }

  @Post('sessions/:id/revoke')
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    const isSuperAdmin = user.roles.some((r) => r.role === 'SUPERADMIN');
    const allowedOrgIds = user.roles
      .map((r) => r.organisationId)
      .filter((id): id is string => Boolean(id));

    await this.security.sessions.revokeSession(sessionId, user.id, {
      isSuperAdmin,
      allowedOrgIds,
    });

    await this.security.events.recordEvent({
      userId: user.id,
      sessionId,
      eventType: 'SESSION_REVOKED',
      severity: 'LOW',
      source: 'USER',
      metadata: { sessionId },
    });

    return { success: true };
  }

  @Post('sessions/revoke-all')
  async revokeAllSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('exceptCurrent') exceptCurrent?: string,
  ) {
    const count = await this.security.sessions.revokeAllUserSessions(user.id, {
      exceptSessionId: exceptCurrent === 'true' ? user.sessionId : undefined,
    });

    await this.security.events.recordEvent({
      userId: user.id,
      eventType: 'SESSION_REVOKED',
      severity: 'MEDIUM',
      source: 'USER',
      metadata: { revokedCount: count },
    });

    return { revokedCount: count };
  }

  // ==========================================
  // 4. DEVICES MANAGEMENT
  // ==========================================

  @Get('devices')
  async getDevices(@CurrentUser() user: AuthenticatedUser) {
    return this.security.devices.getUserDevices(user.id);
  }

  @Patch('devices/:id')
  async updateDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') deviceId: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    await this.security.devices.renameDevice(deviceId, user.id, dto.deviceName);
    return { success: true };
  }

  @Post('devices/:id/revoke')
  async revokeDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') deviceId: string,
  ) {
    const isSuperAdmin = user.roles.some((r) => r.role === 'SUPERADMIN');
    const allowedOrgIds = user.roles.map((r) => r.organisationId).filter(Boolean);

    await this.security.devices.revokeDevice(deviceId, user.id, {
      isSuperAdmin,
      allowedOrgIds,
    });

    await this.security.events.recordEvent({
      userId: user.id,
      deviceId,
      eventType: 'DEVICE_REVOKED',
      severity: 'MEDIUM',
      source: 'USER',
      metadata: { deviceId },
    });

    return { success: true };
  }

  @Post('devices/:id/trust')
  async trustDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') deviceId: string,
  ) {
    await this.security.devices.trustDevice(deviceId, user.id);

    await this.security.events.recordEvent({
      userId: user.id,
      deviceId,
      eventType: 'DEVICE_TRUSTED',
      severity: 'LOW',
      source: 'USER',
      metadata: { deviceId },
    });

    return { success: true };
  }

  // ==========================================
  // 5. SECURITY EVENTS & ALERTS
  // ==========================================

  @Get('events')
  async getEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Query() query: SecurityQueryDto,
  ) {
    this.assertAdminPrivileges(user);
    const orgId = this.extractOrgId(user, req);

    const result = await this.security.events.queryEvents({
      organisationId: orgId,
      eventType: query.eventType as any,
      severity: query.severity as any,
      source: query.source,
      userId: query.userId,
      page: query.page,
      limit: query.limit,
    });

    return { data: result.items, meta: result.meta };
  }

  @Get('alerts')
  async getAlerts(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Query() query: SecurityQueryDto,
  ) {
    this.assertAdminPrivileges(user);
    const orgId = this.extractOrgId(user, req);

    const result = await this.security.alerts.getAlerts({
      organisationId: orgId,
      status: query.status as any,
      severity: query.severity as any,
      page: query.page,
      limit: query.limit,
    });

    return { data: result.items, meta: result.meta };
  }

  @Post('alerts/:id/acknowledge')
  async acknowledgeAlert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') alertId: string,
    @Body() dto: AcknowledgeAlertDto,
  ) {
    this.assertAdminPrivileges(user);
    await this.security.alerts.acknowledgeAlert(alertId, dto.assignedTo || user.id);
    return { success: true };
  }

  @Post('alerts/:id/resolve')
  async resolveAlert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') alertId: string,
    @Body() dto: ResolveAlertDto,
  ) {
    this.assertAdminPrivileges(user);
    await this.security.alerts.resolveAlert(alertId, user.id, dto.resolutionNotes);
    return { success: true };
  }

  // ==========================================
  // 6. IP RESTRICTIONS & POLICIES
  // ==========================================

  @Get('ip-policies')
  async getIpPolicies(@CurrentUser() user: AuthenticatedUser, @Req() req: any) {
    this.assertAdminPrivileges(user);
    const orgId = this.extractOrgId(user, req);
    return this.security.getIpPolicies(orgId);
  }

  @Post('ip-policies')
  async createIpPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Body() dto: CreateIpPolicyDto,
  ) {
    this.assertAdminPrivileges(user);
    const orgId = this.extractOrgId(user, req);

    return this.security.createIpPolicy(orgId, {
      name: dto.name,
      type: dto.type,
      scopeType: dto.scopeType,
      scopeId: dto.scopeId,
      targetSurfaces: dto.targetSurfaces,
      rules: dto.rules,
      isHardCeiling: dto.isHardCeiling,
    });
  }

  @Delete('ip-policies/:id')
  async deleteIpPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('id') policyId: string,
  ) {
    this.assertAdminPrivileges(user);
    const orgId = this.extractOrgId(user, req);
    await this.security.deleteIpPolicy(policyId, orgId);
    return { success: true };
  }

  // ==========================================
  // 7. ENTERPRISE SECURITY POLICIES
  // ==========================================

  @Get('policies')
  async getSecurityPolicies(@CurrentUser() user: AuthenticatedUser, @Req() req: any) {
    const orgId = this.extractOrgId(user, req);
    return this.security.policies.getEffectiveSecurityPolicies(orgId);
  }

  @Patch('policies/:key')
  async updateSecurityPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('key') policyKey: string,
    @Body() dto: UpdateSecurityPolicyDto,
  ) {
    this.assertAdminPrivileges(user);
    const orgId = this.extractOrgId(user, req);

    if (dto.stepUpToken) {
      await this.security.stepUp.consumeChallenge(
        user.id,
        dto.stepUpToken,
        'MODIFY_SECURITY_POLICY',
      );
    }

    await this.security.policies.updateSecurityPolicy(
      orgId,
      policyKey,
      dto.value,
      user.id,
    );

    await this.security.events.recordEvent({
      organisationId: orgId,
      userId: user.id,
      eventType: 'SECURITY_POLICY_CHANGED',
      severity: 'MEDIUM',
      source: 'ADMIN',
      metadata: { policyKey, value: dto.value },
    });

    return { success: true };
  }

  // ==========================================
  // 8. STEP-UP AUTHENTICATION CHALLENGES
  // ==========================================

  @Post('step-up/challenge')
  async requestStepUpChallenge(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestStepUpChallengeDto,
  ) {
    const challenge = await this.security.stepUp.createChallenge(
      user.id,
      dto.action,
      user.sessionId,
    );

    await this.security.events.recordEvent({
      userId: user.id,
      eventType: 'SENSITIVE_ACTION_STEP_UP',
      severity: 'INFO',
      source: 'USER',
      metadata: { action: dto.action },
    });

    return challenge;
  }

  @Post('step-up/verify')
  async verifyStepUpChallenge(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyStepUpChallengeDto,
  ) {
    const isVerified = await this.security.stepUp.verifyChallenge(
      user.id,
      dto.challengeToken,
      {
        password: dto.password,
        mfaCode: dto.mfaCode,
      },
    );

    return { verified: isVerified };
  }
}
