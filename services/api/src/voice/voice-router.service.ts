/**
 * Day 34 — Voice Router Service
 * Resolves inbound phone numbers to organisations & outlets, evaluates operating hours & after-hours policies.
 */

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VoicePhoneNumber, Outlet, Organisation } from '@prisma/client';
import { AfterHoursMode } from '@fitcore/types';

export interface InboundRouteResult {
  phoneNumberRecord: VoicePhoneNumber;
  organisation: Organisation;
  outlet: Outlet | null;
  isAfterHours: boolean;
  afterHoursMode: AfterHoursMode;
  greeting: string;
}

@Injectable()
export class VoiceRouterService {
  private readonly logger = new Logger(VoiceRouterService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Authoritatively matches an incoming E.164 phone number to an Organisation and optional Outlet.
   * If the number is unregistered, FAILS SAFELY with UNKNOWN_TENANT. Never guesses.
   */
  async routeInboundCall(calledNumber: string): Promise<InboundRouteResult> {
    const normalizedNumber = calledNumber.trim();

    const phoneRecord = await this.prisma.voicePhoneNumber.findFirst({
      where: { phoneNumber: normalizedNumber },
      include: {
        organisation: true,
        outlet: true,
      },
    });

    if (!phoneRecord || !phoneRecord.organisation) {
      this.logger.warn(`[VoiceRouter] Inbound call to unknown number: ${normalizedNumber} — UNKNOWN_TENANT`);
      throw new NotFoundException(`UNKNOWN_TENANT: Phone number ${normalizedNumber} is not registered to any organisation.`);
    }

    if (phoneRecord.status !== 'ACTIVE') {
      this.logger.warn(`[VoiceRouter] Inbound call to inactive number: ${normalizedNumber} (status: ${phoneRecord.status})`);
      throw new ForbiddenException(`INACTIVE_NUMBER: Phone number ${normalizedNumber} is currently not in service.`);
    }

    // Check operating hours & timezone
    const isAfterHours = this.checkIfAfterHours(phoneRecord);

    const greeting =
      phoneRecord.greetingMessage ||
      `Thank you for calling ${phoneRecord.outlet?.name || phoneRecord.organisation.name}. How can I help you today?`;

    return {
      phoneNumberRecord: phoneRecord,
      organisation: phoneRecord.organisation,
      outlet: phoneRecord.outlet,
      isAfterHours,
      afterHoursMode: phoneRecord.afterHoursMode as AfterHoursMode,
      greeting,
    };
  }

  /**
   * Checks whether the current time is outside standard operating hours for the outlet.
   */
  private checkIfAfterHours(phoneRecord: VoicePhoneNumber & { outlet?: Outlet | null; organisation?: Organisation }): boolean {
    const outlet = phoneRecord.outlet;
    const hoursConfig = (phoneRecord.businessHoursConfig as any) || (outlet as any)?.operatingHours;

    if (!hoursConfig) {
      return false; // Default to open if no specific hours configured
    }

    // If explicit afterHours override flag set in config for testing
    if (hoursConfig.forceAfterHours === true) {
      return true;
    }

    try {
      const tz = outlet?.timezone || phoneRecord.organisation?.timezone || 'UTC';
      const now = new Date();
      // Format local day and hour in outlet's timezone
      const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz });
      const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: false, timeZone: tz });

      const dayOfWeek = dayFormatter.format(now).toUpperCase(); // e.g. MON, TUE
      const currentTimeStr = timeFormatter.format(now); // e.g. 19:30
      const [currentHour, currentMin] = currentTimeStr.split(':').map(Number);
      const currentTotalMin = currentHour * 60 + currentMin;

      const daySchedule = hoursConfig[dayOfWeek] || hoursConfig[dayOfWeek.toLowerCase()] || hoursConfig.default;
      if (!daySchedule || daySchedule.closed) {
        return true;
      }

      if (daySchedule.open && daySchedule.close) {
        const [openHour, openMin] = daySchedule.open.split(':').map(Number);
        const [closeHour, closeMin] = daySchedule.close.split(':').map(Number);
        const openTotalMin = openHour * 60 + openMin;
        const closeTotalMin = closeHour * 60 + closeMin;

        if (currentTotalMin < openTotalMin || currentTotalMin >= closeTotalMin) {
          return true;
        }
      }
    } catch (err: any) {
      this.logger.debug(`Could not compute timezone-aware after-hours: ${err.message}`);
    }

    return false;
  }
}
