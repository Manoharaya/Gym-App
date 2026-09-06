/**
 * Notification Center Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const notificationsQuerySchema = z.object({
  featureId: z.literal('notifications'),
});
