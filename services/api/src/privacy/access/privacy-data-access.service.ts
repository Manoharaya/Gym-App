import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PrivacyDataAccessService {
  private readonly logger = new Logger(PrivacyDataAccessService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assembles a structured, human-readable data access view for the member.
   * Enforces tenant isolation and strict redaction of system credentials/secrets.
   */
  async getMemberDataAccessView(memberId: string, organisationId: string) {
    const member = await this.prisma.memberProfile.findFirst({
      where: {
        id: memberId,
        organisationId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
          },
        },
        memberships: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            autoRenew: true,
            membershipPlan: { select: { name: true, membershipType: true } },
          },
        },
        bookings: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            bookedAt: true,
            classSession: {
              select: {
                startsAt: true,
                classTemplate: { select: { name: true } },
              },
            },
          },
        },
        attendanceRecords: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            checkedInAt: true,
            checkedOutAt: true,
          },
        },
        workouts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            startedAt: true,
            completedAt: true,
          },
        },
        foodLogs: {
          take: 10,
          orderBy: { consumedAt: 'desc' },
          select: {
            id: true,
            mealType: true,
            consumedAt: true,
          },
        },
        healthScreenings: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
        wearableConnections: {
          select: {
            id: true,
            provider: true,
            status: true,
            connectedAt: true,
            lastSyncAt: true,
          },
        },
        consentRecords: {
          orderBy: { consentedAt: 'desc' },
          select: {
            id: true,
            status: true,
            consentedAt: true,
            withdrawnAt: true,
            consentType: { select: { key: true, name: true } },
            consentVersion: { select: { version: true } },
          },
        },
        paymentTransactions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amountMinor: true,
            currency: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member profile not found in current organisation');
    }

    return {
      overview: {
        memberId: member.id,
        fullName: `${member.user.firstName} ${member.user.lastName}`.trim(),
        email: member.user.email,
        phone: member.user.phone,
        preferredName: member.preferredName,
        dateOfBirth: member.dateOfBirth?.toISOString() || null,
        gender: member.gender,
        memberSince: member.createdAt.toISOString(),
      },
      identity: {
        id: member.user.id,
        email: member.user.email,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        phone: member.user.phone,
      },
      training: {
        workouts: (member.workouts || []).map((w: any) => ({
          id: w.id,
          title: w.title,
          status: w.status,
          startedAt: w.startedAt?.toISOString() || null,
          completedAt: w.completedAt?.toISOString() || null,
        })),
      },
      nutrition: {
        foodLogs: (member.foodLogs || []).map((f: any) => ({
          id: f.id,
          foodName: f.foodNameAtLog,
          mealType: f.mealType,
          calories: f.calories,
          consumedAt: f.consumedAt?.toISOString() || null,
        })),
      },
      billing: {
        transactions: (member.paymentTransactions || []).map((t: any) => ({
          id: t.id,
          amountMinor: t.amountMinor,
          currency: t.currency,
          status: t.status,
        })),
      },
      memberships: (member.memberships || []).map((m: any) => ({
        id: m.id,
        planName: m.membershipPlan?.name || 'Standard Plan',
        tier: m.membershipPlan?.membershipType || 'STANDARD',
        status: m.status,
        startDate: m.startDate.toISOString(),
        endDate: m.endDate ? m.endDate.toISOString() : 'Ongoing',
      })),
      bookingsSummary: {
        recentCount: member.bookings?.length || 0,
        recentBookings: (member.bookings || []).map((b: any) => ({
          id: b.id,
          classTitle: b.classSession?.classTemplate?.name || 'Session',
          status: b.status,
          scheduledTime: b.classSession?.startsAt?.toISOString() || null,
        })),
      },
      attendanceSummary: {
        recentCount: member.attendanceRecords?.length || 0,
        recentCheckIns: (member.attendanceRecords || []).map((a: any) => ({
          checkIn: a.checkedInAt?.toISOString() || null,
          checkOut: a.checkedOutAt?.toISOString() || null,
        })),
      },
      trainingSummary: {
        recentWorkoutsCount: member.workouts?.length || 0,
        recentWorkouts: (member.workouts || []).map((w: any) => ({
          id: w.id,
          title: w.title || 'Workout',
          date: w.completedAt?.toISOString() || w.startedAt?.toISOString() || null,
        })),
      },
      nutritionSummary: {
        recentLogsCount: member.foodLogs?.length || 0,
      },
      healthSafetySummary: {
        screeningsCount: member.healthScreenings?.length || 0,
        latestScreening: member.healthScreenings?.[0]
          ? {
              status: member.healthScreenings[0].status,
              date: member.healthScreenings[0].createdAt.toISOString(),
            }
          : null,
      },
      wearablesSummary: (member.wearableConnections || []).map((w: any) => ({
        provider: w.provider,
        status: w.status,
        connectedAt: w.connectedAt?.toISOString() || null,
        lastSyncAt: w.lastSyncAt?.toISOString() || null,
      })),
      consents: (member.consentRecords || []).map((c: any) => ({
        key: c.consentType?.key,
        name: c.consentType?.name,
        version: c.consentVersion?.version,
        status: c.status,
        consentedAt: c.consentedAt?.toISOString() || null,
        withdrawnAt: c.withdrawnAt?.toISOString() || null,
      })),
    };
  }
}
