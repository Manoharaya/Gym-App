/**
 * Documents & Waivers Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const documentsQuerySchema = z.object({
  featureId: z.literal('documents'),
});
