import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EnterpriseExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportOrganisationGovernanceArchive(organisationId: string) {
    const [
      organisation,
      brands,
      outlets,
      policies,
      configurations,
      customDomains,
      roleAssignments,
    ] = await Promise.all([
      this.prisma.organisation.findUnique({
        where: { id: organisationId },
        select: {
          id: true,
          name: true,
          slug: true,
          legalName: true,
          displayName: true,
          industry: true,
          country: true,
          timezone: true,
          currency: true,
          createdAt: true,
        },
      }),
      this.prisma.organisationBrand.findMany({
        where: { organisationId, deletedAt: null },
      }),
      this.prisma.outlet.findMany({
        where: { organisationId, deletedAt: null },
        include: {
          brand: { select: { id: true, name: true, code: true } },
          managerUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.enterprisePolicy.findMany({
        where: { organisationId },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
          },
        },
      }),
      this.prisma.enterpriseConfiguration.findMany({
        where: { organisationId },
      }),
      this.prisma.customDomain.findMany({
        where: { organisationId },
      }),
      this.prisma.enterpriseRoleAssignment.findMany({
        where: { organisationId },
        include: {
          role: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      formatVersion: '1.0',
      organisation,
      brands,
      outlets,
      policies,
      configurations,
      customDomains,
      roleAssignments,
    };
  }
}
