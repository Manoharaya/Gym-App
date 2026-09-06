import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AccessPolicyService {
  private readonly logger = new Logger(AccessPolicyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves active access policy for an outlet or fallback organisation-wide policy.
   */
  async getEffectivePolicy(organisationId: string, outletId: string) {
    // 1. Check outlet-specific policy first
    const outletPolicy = await this.prisma.accessPolicy.findFirst({
      where: {
        organisationId,
        outletId,
        enabled: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (outletPolicy) {
      return outletPolicy;
    }

    // 2. Fall back to organisation-level policy (outletId is null)
    const orgPolicy = await this.prisma.accessPolicy.findFirst({
      where: {
        organisationId,
        outletId: null,
        enabled: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orgPolicy;
  }

  /**
   * Verifies if requested timestamp falls within configured operating hours.
   */
  isWithinAllowedHours(
    policy: {
      allowedStartTime: string;
      allowedEndTime: string;
      allowedDays: number[];
    } | null,
    requestedAt: Date = new Date(),
    outletTimezone: string = 'Australia/Perth'
  ): boolean {
    if (!policy) {
      // Default policy: 24/7 if no explicit restriction configured
      return true;
    }

    // Convert date to outlet timezone
    const formatter = new Intl.DateTimeFormat('en-AU', {
      timeZone: outletTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'narrow',
    });

    // Extract hour and minute in target timezone
    const timeFormatter = new Intl.DateTimeFormat('en-AU', {
      timeZone: outletTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // ISO day of week: 1=Mon, ..., 7=Sun
    const dayOfWeekFormatter = new Intl.DateTimeFormat('en-AU', {
      timeZone: outletTimezone,
      weekday: 'short',
    });

    const dayName = dayOfWeekFormatter.format(requestedAt);
    const dayMap: Record<string, number> = {
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
      Sun: 7,
    };

    const currentDay = dayMap[dayName] || 1;

    // 1. Check allowed day of week
    if (policy.allowedDays && policy.allowedDays.length > 0) {
      if (!policy.allowedDays.includes(currentDay)) {
        return false;
      }
    }

    // 2. Check time window
    const timeParts = timeFormatter.format(requestedAt); // e.g. "06:30" or "06.30"
    const normalizedTime = timeParts.replace('.', ':');

    const [reqHour, reqMin] = normalizedTime.split(':').map(Number);
    const [startHour, startMin] = policy.allowedStartTime.split(':').map(Number);
    const [endHour, endMin] = policy.allowedEndTime.split(':').map(Number);

    const reqMinutes = reqHour * 60 + reqMin;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes <= endMinutes) {
      // Standard same-day window e.g. 06:00 -> 22:00
      return reqMinutes >= startMinutes && reqMinutes <= endMinutes;
    } else {
      // Overnight window e.g. 20:00 -> 04:00
      return reqMinutes >= startMinutes || reqMinutes <= endMinutes;
    }
  }
}
