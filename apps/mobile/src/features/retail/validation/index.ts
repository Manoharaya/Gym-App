/**
 * Retail & POS Store Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const retailQuerySchema = z.object({
  featureId: z.literal('retail'),
});
