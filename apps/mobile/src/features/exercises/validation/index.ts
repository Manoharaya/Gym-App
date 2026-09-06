/**
 * Exercise Library Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const exercisesQuerySchema = z.object({
  featureId: z.literal('exercises'),
});
