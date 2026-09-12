import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface IntegrityValidationReport {
  isValid: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  errors: string[];
  warnings: string[];
  entityCounts: Record<string, number>;
  timestamp: string;
}

@Injectable()
export class DataIntegrityValidatorService {
  private readonly logger = new Logger(DataIntegrityValidatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Non-destructive integrity audit.
   * Validates foreign keys, detecting orphaned records, duplicate constraints, and invalid states.
   * Invariant: Never silently modify or delete data during recovery validation!
   */
  async validateIntegrity(organisationId?: string): Promise<IntegrityValidationReport> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    const orgArg = organisationId ? { where: { organisationId } } : undefined;

    // 1. Entity Record Counts
    const [
      orgsCount,
      outletsCount,
      membersCount,
      membershipsCount,
      sessionsCount,
      bookingsCount,
      paymentsCount,
      saasSubscriptionsCount,
    ] = await Promise.all([
      this.prisma.organisation.count(),
      this.prisma.outlet.count(orgArg),
      this.prisma.memberProfile.count(orgArg),
      this.prisma.memberMembership.count(orgArg),
      this.prisma.classSession.count(orgArg),
      this.prisma.booking.count(orgArg),
      this.prisma.paymentTransaction.count(orgArg),
      this.prisma.saasSubscription.count(orgArg),
    ]);

    // 2. Foreign-Key Constraint 1: MemberProfile -> User (Orphan check)
    totalChecks++;
    const orphanedMembers = await this.prisma.$queryRaw<any[]>`
      SELECT mp.id 
      FROM member_profiles mp 
      LEFT JOIN users u ON u.id = mp."userId" 
      WHERE u.id IS NULL
      LIMIT 10
    `;
    if (orphanedMembers.length > 0) {
      errors.push(
        `ORPHAN_RECORDS: Found ${orphanedMembers.length} MemberProfiles pointing to non-existent User IDs`,
      );
    } else {
      passedChecks++;
    }

    // 3. Foreign-Key Constraint 2: MemberMembership -> MemberProfile (Orphan check)
    totalChecks++;
    const orphanedMemberships = await this.prisma.$queryRaw<any[]>`
      SELECT mm.id 
      FROM member_memberships mm 
      LEFT JOIN member_profiles mp ON mp.id = mm."memberProfileId" 
      WHERE mp.id IS NULL
      LIMIT 10
    `;
    if (orphanedMemberships.length > 0) {
      errors.push(
        `ORPHAN_RECORDS: Found ${orphanedMemberships.length} MemberMemberships without valid MemberProfile`,
      );
    } else {
      passedChecks++;
    }

    // 4. Foreign-Key Constraint 3: Booking -> ClassSession (Orphan check)
    totalChecks++;
    const orphanedBookings = await this.prisma.$queryRaw<any[]>`
      SELECT b.id 
      FROM bookings b 
      LEFT JOIN class_sessions cs ON cs.id = b."classSessionId" 
      WHERE cs.id IS NULL
      LIMIT 10
    `;
    if (orphanedBookings.length > 0) {
      errors.push(
        `ORPHAN_RECORDS: Found ${orphanedBookings.length} Bookings without valid ClassSession`,
      );
    } else {
      passedChecks++;
    }

    // 5. Foreign-Key Constraint 4: Outlet -> Organisation (Orphan check)
    totalChecks++;
    const orphanedOutlets = await this.prisma.$queryRaw<any[]>`
      SELECT o.id 
      FROM outlets o 
      LEFT JOIN organisations org ON org.id = o."organisationId" 
      WHERE org.id IS NULL
      LIMIT 10
    `;
    if (orphanedOutlets.length > 0) {
      errors.push(
        `ORPHAN_RECORDS: Found ${orphanedOutlets.length} Outlets pointing to non-existent Organisation`,
      );
    } else {
      passedChecks++;
    }

    // 6. Check for duplicate active bookings per session per member
    totalChecks++;
    const duplicateBookings = await this.prisma.$queryRaw<any[]>`
      SELECT "classSessionId", "memberProfileId", COUNT(*) as cnt
      FROM bookings
      WHERE status IN ('CONFIRMED', 'WAITLISTED')
      GROUP BY "classSessionId", "memberProfileId"
      HAVING COUNT(*) > 1
      LIMIT 5
    `;
    if (duplicateBookings.length > 0) {
      errors.push(
        `DUPLICATE_VIOLATION: Found ${duplicateBookings.length} instances of duplicate active bookings for the same member in the same session`,
      );
    } else {
      passedChecks++;
    }

    const isValid = errors.length === 0;

    this.logger.log(
      `[DATA INTEGRITY VALIDATOR] Integrity audit completed: ${passedChecks}/${totalChecks} passed. Errors: ${errors.length}, Warnings: ${warnings.length}`,
    );

    return {
      isValid,
      totalChecks,
      passedChecks,
      failedChecks: errors.length,
      errors,
      warnings,
      entityCounts: {
        organisations: orgsCount,
        outlets: outletsCount,
        members: membersCount,
        memberships: membershipsCount,
        sessions: sessionsCount,
        bookings: bookingsCount,
        payments: paymentsCount,
        saasSubscriptions: saasSubscriptionsCount,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
