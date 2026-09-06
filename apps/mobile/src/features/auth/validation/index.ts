/**
 * Authentication & Session Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const authQuerySchema = z.object({
  featureId: z.literal('auth'),
});
