/**
 * Training Programs & Workouts Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const trainingQuerySchema = z.object({
  featureId: z.literal('training'),
});
