import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConflictDetectedError, MissingDependencyError } from '../domain/marketplace-errors';

export interface DependencySpec {
  slug: string;
  minVersion?: string;
  optional?: boolean;
}

@Injectable()
export class MarketplaceDependencyService {
  private readonly logger = new Logger(MarketplaceDependencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates dependencies and conflicts for a target tenant/outlet installation.
   */
  async validateInstallationDependencies(
    organisationId: string,
    outletId: string | null | undefined,
    dependencies: DependencySpec[] | null | undefined,
    conflicts: string[] | null | undefined,
  ): Promise<void> {
    // 1. Fetch all active installations for this organisation (and optionally outlet)
    const activeInstallations = await this.prisma.marketplaceInstallation.findMany({
      where: {
        organisationId,
        status: { in: ['ACTIVE', 'UPGRADING'] },
        ...(outletId ? { OR: [{ outletId: null }, { outletId }] } : {}),
      },
      include: {
        listing: {
          select: {
            slug: true,
            title: true,
            conflicts: true,
          },
        },
        version: {
          select: {
            version: true,
          },
        },
      },
    });

    const installedSlugs = new Map<string, string>();
    for (const inst of activeInstallations) {
      installedSlugs.set(inst.listing.slug, inst.version.version);
    }

    // 2. Validate Dependencies (non-optional)
    if (dependencies && Array.isArray(dependencies)) {
      const missing: string[] = [];
      for (const dep of dependencies) {
        if (dep.optional) continue;
        if (!installedSlugs.has(dep.slug)) {
          missing.push(dep.slug);
        }
      }
      if (missing.length > 0) {
        throw new MissingDependencyError(missing);
      }
    }

    // 3. Validate Conflicts (bidirectional)
    const detectedConflicts: string[] = [];

    // Check if new listing conflicts with any installed listing
    if (conflicts && Array.isArray(conflicts)) {
      for (const conflictSlug of conflicts) {
        if (installedSlugs.has(conflictSlug)) {
          detectedConflicts.push(conflictSlug);
        }
      }
    }

    // Check if any existing active installation declares a conflict with this listing
    for (const inst of activeInstallations) {
      if (inst.listing.conflicts && Array.isArray(inst.listing.conflicts)) {
        // If an existing app's conflicts list contains the new app's slug, it's a conflict
        // (Handled at validator invocation where new listing slug is known)
      }
    }

    if (detectedConflicts.length > 0) {
      throw new ConflictDetectedError(detectedConflicts);
    }
  }

  /**
   * Checks if an installed listing declares a conflict with a candidate slug.
   */
  async checkReverseConflicts(
    organisationId: string,
    candidateSlug: string,
    outletId?: string | null,
  ): Promise<void> {
    const activeInstallations = await this.prisma.marketplaceInstallation.findMany({
      where: {
        organisationId,
        status: { in: ['ACTIVE', 'UPGRADING'] },
        ...(outletId ? { OR: [{ outletId: null }, { outletId }] } : {}),
      },
      include: {
        listing: {
          select: {
            slug: true,
            title: true,
            conflicts: true,
          },
        },
      },
    });

    const conflictingApps: string[] = [];
    for (const inst of activeInstallations) {
      if (
        Array.isArray(inst.listing.conflicts) &&
        inst.listing.conflicts.includes(candidateSlug)
      ) {
        conflictingApps.push(`${inst.listing.title} (${inst.listing.slug})`);
      }
    }

    if (conflictingApps.length > 0) {
      throw new ConflictDetectedError(conflictingApps);
    }
  }
}
