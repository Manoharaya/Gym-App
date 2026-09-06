/**
 * Access Control & Entry Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const accessQuerySchema = z.object({
  featureId: z.literal('access'),
});
