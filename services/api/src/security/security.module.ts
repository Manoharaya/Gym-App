import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { EnterpriseModule } from '../enterprise/enterprise.module';
import { AuditModule } from '../audit/audit.module';

// MFA
import { MfaSecretEncryptionService } from './mfa/mfa-secret-encryption.service';
import { TotpService } from './mfa/totp.service';
import { RecoveryCodeService } from './mfa/recovery-code.service';
import { EmailOtpService } from './mfa/email-otp.service';
import { MfaService } from './mfa/mfa.service';

// Sessions
import { SessionSecurityService } from './sessions/session-security.service';
import { TokenRotationService } from './sessions/token-rotation.service';

// Devices
import { DeviceService } from './devices/device.service';

// Risk & Account Protection
import { AuthenticationRiskService } from './risk/authentication-risk.service';
import { AccountProtectionService } from './account-protection/account-protection.service';

// IP & Step-up
import { IpRestrictionService } from './ip/ip-restriction.service';
import { StepUpService } from './step-up/step-up.service';

// Events, Alerts, Policies & Notifications
import { SecurityEventService } from './events/security-event.service';
import { SecurityAlertService } from './alerts/security-alert.service';
import { SecurityPolicyService } from './policies/security-policy.service';
import { SecurityNotificationService } from './notifications/security-notification.service';

// Master Controller & Service
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    AuditModule,
    forwardRef(() => EnterpriseModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'default-jwt-secret',
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [SecurityController],
  providers: [
    MfaSecretEncryptionService,
    TotpService,
    RecoveryCodeService,
    EmailOtpService,
    MfaService,
    SessionSecurityService,
    TokenRotationService,
    DeviceService,
    AuthenticationRiskService,
    AccountProtectionService,
    IpRestrictionService,
    StepUpService,
    SecurityEventService,
    SecurityAlertService,
    SecurityPolicyService,
    SecurityNotificationService,
    SecurityService,
  ],
  exports: [
    SecurityService,
    MfaService,
    SessionSecurityService,
    TokenRotationService,
    DeviceService,
    AuthenticationRiskService,
    AccountProtectionService,
    IpRestrictionService,
    StepUpService,
    SecurityEventService,
    SecurityAlertService,
    SecurityPolicyService,
  ],
})
export class SecurityModule {}
