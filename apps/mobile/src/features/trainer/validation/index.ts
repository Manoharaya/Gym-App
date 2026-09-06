/**
 * Trainer Portal Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const trainerQuerySchema = z.object({
  featureId: z.literal('trainer'),
});
