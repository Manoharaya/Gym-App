/**
 * Appointments & Booking Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const bookingQuerySchema = z.object({
  featureId: z.literal('booking'),
});
