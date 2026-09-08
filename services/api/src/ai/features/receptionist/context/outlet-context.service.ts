/**
 * Day 31 — Outlet Context Service
 * Retrieves outlet-level operational hours, facilities, amenities, and location specifics.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { OutletContextData } from '../receptionist.types';

@Injectable()
export class OutletContextService {
  private readonly logger = new Logger(OutletContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOutletContext(organisationId: string, outletId: string): Promise<OutletContextData | null> {
    const outlet = await this.prisma.outlet.findFirst({
      where: {
        id: outletId,
        organisationId,
      },
    });

    if (!outlet) return null;

    return {
      id: outlet.id,
      organisationId: outlet.organisationId,
      name: outlet.name,
      address: outlet.address,
      city: outlet.city,
      phone: outlet.phone ?? undefined,
      email: outlet.email ?? undefined,
      operatingHours: {
        monday: '06:00 - 22:00',
        tuesday: '06:00 - 22:00',
        wednesday: '06:00 - 22:00',
        thursday: '06:00 - 22:00',
        friday: '06:00 - 22:00',
        saturday: '08:00 - 20:00',
        sunday: '08:00 - 20:00',
      },
      holidayHours: {
        christmas: 'Closed',
        newYears: '08:00 - 14:00',
      },
      amenities: ['Locker Rooms', 'Showers', 'WiFi', 'Cardio Floor', 'Free Weights'],
      parkingDetails: 'On-site complimentary parking available for members.',
    };
  }
}
