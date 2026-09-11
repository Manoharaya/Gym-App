import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EnterpriseHierarchyService } from './enterprise-hierarchy.service';
import { SetBrandingDto } from '../dto/enterprise-branding.dto';
import { DEFAULT_BRANDING } from '../domain/enterprise-constants';
import { EnterpriseEvent } from '../domain/enterprise-events';

@Injectable()
export class EnterpriseBrandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly hierarchyService: EnterpriseHierarchyService,
  ) {}

  async setBranding(
    organisationId: string,
    dto: SetBrandingDto,
    actorUserId?: string,
  ) {
    const scopeId = dto.scopeId || dto.brandId || dto.outletId || '';

    const branding = await this.prisma.enterpriseBranding.upsert({
      where: {
        organisationId_scopeType_scopeId: {
          organisationId,
          scopeType: dto.scopeType,
          scopeId,
        },
      },
      update: {
        brandName: dto.brandName,
        logoUrl: dto.logoUrl,
        logoDarkUrl: dto.logoDarkUrl,
        faviconUrl: dto.faviconUrl,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        accentColor: dto.accentColor,
        backgroundColor: dto.backgroundColor,
        surfaceColor: dto.surfaceColor,
        fontFamily: dto.fontFamily,
        emailHeaderUrl: dto.emailHeaderUrl,
        customCss: dto.customCss,
        themeJson: dto.themeJson,
      },
      create: {
        organisationId,
        scopeType: dto.scopeType,
        scopeId,
        brandId: dto.brandId,
        outletId: dto.outletId,
        brandName: dto.brandName,
        logoUrl: dto.logoUrl,
        logoDarkUrl: dto.logoDarkUrl,
        faviconUrl: dto.faviconUrl,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        accentColor: dto.accentColor,
        backgroundColor: dto.backgroundColor,
        surfaceColor: dto.surfaceColor,
        fontFamily: dto.fontFamily,
        emailHeaderUrl: dto.emailHeaderUrl,
        customCss: dto.customCss,
        themeJson: dto.themeJson,
      },
    });

    await this.auditService.log({
      action: EnterpriseEvent.BRANDING_CONFIGURED,
      resource: 'EnterpriseBranding',
      resourceId: branding.id,
      organisationId,
      userId: actorUserId,
      metadata: { scopeType: dto.scopeType, scopeId },
    });

    return branding;
  }

  async getEffectiveBranding(params: {
    organisationId: string;
    brandId?: string;
    outletId?: string;
  }) {
    let brandId = params.brandId;

    if (params.outletId && !brandId) {
      const outletContext = await this.hierarchyService.resolveOutletContext(params.outletId);
      if (outletContext?.brandId) {
        brandId = outletContext.brandId;
      }
    }

    // Fetch all brandings for this organisation
    const allBrandings = await this.prisma.enterpriseBranding.findMany({
      where: { organisationId: params.organisationId },
    });

    const orgBranding = allBrandings.find((b) => b.scopeType === 'ORGANISATION');
    const brandBranding = brandId
      ? allBrandings.find((b) => b.scopeType === 'BRAND' && (b.scopeId === brandId || b.brandId === brandId))
      : null;
    const outletBranding = params.outletId
      ? allBrandings.find((b) => b.scopeType === 'OUTLET' && (b.scopeId === params.outletId || b.outletId === params.outletId))
      : null;

    // Merge in hierarchical order: Default -> Org -> Brand -> Outlet
    return {
      primaryColor:
        outletBranding?.primaryColor ||
        brandBranding?.primaryColor ||
        orgBranding?.primaryColor ||
        DEFAULT_BRANDING.primaryColor,
      secondaryColor:
        outletBranding?.secondaryColor ||
        brandBranding?.secondaryColor ||
        orgBranding?.secondaryColor ||
        DEFAULT_BRANDING.secondaryColor,
      accentColor:
        outletBranding?.accentColor ||
        brandBranding?.accentColor ||
        orgBranding?.accentColor ||
        DEFAULT_BRANDING.accentColor,
      backgroundColor:
        outletBranding?.backgroundColor ||
        brandBranding?.backgroundColor ||
        orgBranding?.backgroundColor ||
        DEFAULT_BRANDING.backgroundColor,
      surfaceColor:
        outletBranding?.surfaceColor ||
        brandBranding?.surfaceColor ||
        orgBranding?.surfaceColor ||
        DEFAULT_BRANDING.surfaceColor,
      fontFamily:
        outletBranding?.fontFamily ||
        brandBranding?.fontFamily ||
        orgBranding?.fontFamily ||
        DEFAULT_BRANDING.fontFamily,
      logoUrl:
        outletBranding?.logoUrl ||
        brandBranding?.logoUrl ||
        orgBranding?.logoUrl ||
        null,
      logoDarkUrl:
        outletBranding?.logoDarkUrl ||
        brandBranding?.logoDarkUrl ||
        orgBranding?.logoDarkUrl ||
        null,
      faviconUrl:
        outletBranding?.faviconUrl ||
        brandBranding?.faviconUrl ||
        orgBranding?.faviconUrl ||
        null,
      emailHeaderUrl:
        outletBranding?.emailHeaderUrl ||
        brandBranding?.emailHeaderUrl ||
        orgBranding?.emailHeaderUrl ||
        null,
      customCss:
        [orgBranding?.customCss, brandBranding?.customCss, outletBranding?.customCss]
          .filter(Boolean)
          .join('\n') || null,
      themeJson: {
        ...(orgBranding?.themeJson as any),
        ...(brandBranding?.themeJson as any),
        ...(outletBranding?.themeJson as any),
      },
    };
  }
}
