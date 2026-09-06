import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ContextSwitchDto } from './dto/context-switch.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestWithUser, AuthenticatedUser } from '../common/interfaces/request-with-user.interface';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication & Identity')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new athletic member user account' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Cannot self-assign elevated administrative role' })
  @ApiResponse({ status: 409, description: 'Email address already registered' })
  async register(@Body() dto: RegisterDto, @Req() req: RequestWithUser) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const requestId = req.requestId;
    return this.authService.register(dto, { ipAddress, userAgent, requestId });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user credentials and obtain session tokens' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or disabled/suspended account' })
  @ApiResponse({ status: 429, description: 'Too many failed login attempts' })
  async login(@Body() dto: LoginDto, @Req() req: RequestWithUser) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const requestId = req.requestId;
    return this.authService.login(dto, { ipAddress, userAgent, requestId });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate single-use refresh token and acquire new access token' })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  @ApiResponse({ status: 401, description: 'Token expired, invalid, or reused (session compromise)' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Terminate active session and revoke current refresh token' })
  @ApiResponse({ status: 200, description: 'Session terminated' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: Partial<RefreshTokenDto>,
    @Req() req: RequestWithUser,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.logout(user.id, dto.refreshToken, {
      ipAddress,
      userAgent,
      requestId: req.requestId,
    });
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Revoke all active sessions across all devices for current user' })
  @ApiResponse({ status: 200, description: 'All sessions terminated' })
  async logoutAll(@CurrentUser() user: AuthenticatedUser, @Req() req: RequestWithUser) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.logoutAll(user.id, {
      ipAddress,
      userAgent,
      requestId: req.requestId,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Retrieve authenticated user identity, organisations, outlets, and permissions' })
  @ApiResponse({ status: 200, description: 'User context retrieved' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user);
  }

  @Post('context')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Switch active working organisation and outlet context' })
  @ApiResponse({ status: 200, description: 'Active context switched' })
  @ApiResponse({ status: 403, description: 'Unauthorized context selection' })
  async switchContext(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ContextSwitchDto,
  ) {
    return this.authService.switchContext(user, dto);
  }

  @Public()
  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a staff/member invitation token, set password, and log in' })
  @ApiResponse({ status: 200, description: 'Invitation accepted, account activated, and logged in' })
  @ApiResponse({ status: 400, description: 'Invitation expired or already used' })
  @ApiResponse({ status: 404, description: 'Invitation token not recognized' })
  async acceptInvitation(@Body() dto: AcceptInvitationDto, @Req() req: RequestWithUser) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.acceptInvitation(dto, {
      ipAddress,
      userAgent,
      requestId: req.requestId,
    });
  }
}
