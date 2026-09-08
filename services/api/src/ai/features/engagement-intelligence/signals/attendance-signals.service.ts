import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AttendanceSignals } from '../engagement-intelligence.types';

@Injectable()
export class AttendanceSignalsService {
  private readonly logger = new Logger(AttendanceSignalsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async collect(memberId: string, organisationId: string, now: Date = new Date()): Promise<AttendanceSignals> {
    const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d28Ago = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    // 1. Gym Turnstile Check-Ins (Physical visits)
    const checkIns = await this.prisma.checkIn.findMany({
      where: {
        memberProfileId: memberId,
        organisationId,
        status: 'SUCCESS',
        checkedInAt: { gte: d28Ago, lte: now },
      },
      select: { checkedInAt: true },
      orderBy: { checkedInAt: 'desc' },
    });

    // 2. Class / Session Attendance Records
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        memberProfileId: memberId,
        organisationId,
        createdAt: { gte: d28Ago, lte: now },
      },
      select: {
        status: true,
        classSessionId: true,
        checkedInAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Determine visits: combine checkIns and attendance records (completed/checked_in)
    const recentCheckIns7d = checkIns.filter((c) => c.checkedInAt >= d7Ago).length;
    const recentCheckIns28d = checkIns.length;

    // Completed classes/PT sessions
    const validClassAttendance = attendanceRecords.filter(
      (a) => a.status === 'CHECKED_IN' || a.status === 'COMPLETED' || a.status === 'WALK_IN',
    );
    const classCount = validClassAttendance.filter((a) => a.classSessionId).length;
    const ptCount = validClassAttendance.filter((a) => !a.classSessionId).length;
    const noShows = attendanceRecords.filter((a) => a.status === 'NO_SHOW').length;

    // Overall visits calculation (taking max or sum of gym entries and class attendances)
    const visits7d = Math.max(recentCheckIns7d, validClassAttendance.filter((a) => (a.checkedInAt || a.createdAt) >= d7Ago).length);
    const visits28d = Math.max(recentCheckIns28d, validClassAttendance.length);

    // Find latest visit timestamp
    const latestCheckIn = checkIns[0]?.checkedInAt;
    const latestClass = validClassAttendance[0]?.checkedInAt || validClassAttendance[0]?.createdAt;
    let lastGymVisitAt: Date | null = null;
    if (latestCheckIn && latestClass) {
      lastGymVisitAt = latestCheckIn > latestClass ? latestCheckIn : latestClass;
    } else {
      lastGymVisitAt = latestCheckIn || latestClass || null;
    }

    // Weekly frequency over 28-day window
    const attendanceFrequencyPerWeek = Number((visits28d / 4).toFixed(2));

    // Calculate visits delta: comparing recent 7-day rate (scaled to 4 weeks) vs 28-day baseline rate
    const weeklyRateRecent = visits7d;
    const weeklyRateBaseline = attendanceFrequencyPerWeek;
    let visitsDeltaPct = 0;
    if (weeklyRateBaseline > 0) {
      visitsDeltaPct = Math.round(((weeklyRateRecent - weeklyRateBaseline) / weeklyRateBaseline) * 100);
    } else if (weeklyRateRecent > 0) {
      visitsDeltaPct = 100;
    }

    return {
      visitsLast7d: visits7d,
      visitsLast28d: visits28d,
      classAttendanceCount: classCount,
      ptAttendanceCount: ptCount,
      noShowCountLast28d: noShows,
      attendanceFrequencyPerWeek,
      lastGymVisitAt,
      visitsDeltaPct,
    };
  }
}
