import { Module } from '@nestjs/common';
import { EnterpriseHierarchyService } from './services/enterprise-hierarchy.service';
import { EnterpriseBrandService } from './services/enterprise-brand.service';
import { EnterpriseOutletService } from './services/enterprise-outlet.service';
import { EnterpriseRoleService } from './services/enterprise-role.service';
import { EnterprisePolicyService } from './services/enterprise-policy.service';
import { EnterprisePolicyResolverService } from './services/enterprise-policy-resolver.service';
import { EnterprisePolicySimulatorService } from './services/enterprise-policy-simulator.service';
import { EnterpriseConfigurationService } from './services/enterprise-configuration.service';
import { EnterpriseBrandingService } from './services/enterprise-branding.service';
import { EnterpriseDomainService } from './services/enterprise-domain.service';
import { EnterpriseStaffService } from './services/enterprise-staff.service';
import { EnterpriseGovernanceService } from './services/enterprise-governance.service';
import { EnterpriseExportService } from './services/enterprise-export.service';

import { EnterpriseController } from './controllers/enterprise.controller';
import { EnterpriseBrandController } from './controllers/enterprise-brand.controller';
import { EnterpriseOutletController } from './controllers/enterprise-outlet.controller';
import { EnterpriseRoleController } from './controllers/enterprise-role.controller';
import { EnterprisePolicyController } from './controllers/enterprise-policy.controller';
import { EnterpriseBrandingController } from './controllers/enterprise-branding.controller';
import { EnterpriseDomainController } from './controllers/enterprise-domain.controller';
import { EnterpriseStaffController } from './controllers/enterprise-staff.controller';
import { EnterpriseAuditController } from './controllers/enterprise-audit.controller';

@Module({
  controllers: [
    EnterpriseController,
    EnterpriseBrandController,
    EnterpriseOutletController,
    EnterpriseRoleController,
    EnterprisePolicyController,
    EnterpriseBrandingController,
    EnterpriseDomainController,
    EnterpriseStaffController,
    EnterpriseAuditController,
  ],
  providers: [
    EnterpriseHierarchyService,
    EnterpriseBrandService,
    EnterpriseOutletService,
    EnterpriseRoleService,
    EnterprisePolicyService,
    EnterprisePolicyResolverService,
    EnterprisePolicySimulatorService,
    EnterpriseConfigurationService,
    EnterpriseBrandingService,
    EnterpriseDomainService,
    EnterpriseStaffService,
    EnterpriseGovernanceService,
    EnterpriseExportService,
  ],
  exports: [
    EnterpriseHierarchyService,
    EnterpriseBrandService,
    EnterpriseOutletService,
    EnterpriseRoleService,
    EnterprisePolicyService,
    EnterprisePolicyResolverService,
    EnterprisePolicySimulatorService,
    EnterpriseConfigurationService,
    EnterpriseBrandingService,
    EnterpriseDomainService,
    EnterpriseStaffService,
    EnterpriseGovernanceService,
    EnterpriseExportService,
  ],
})
export class EnterpriseModule {}
