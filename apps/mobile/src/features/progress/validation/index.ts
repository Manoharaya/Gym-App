/**
 * Progress & Body Metrics Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const progressQuerySchema = z.object({
  featureId: z.literal('progress'),
});
