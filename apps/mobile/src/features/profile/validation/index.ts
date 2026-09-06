/**
 * Profile & Identity Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const profileQuerySchema = z.object({
  featureId: z.literal('profile'),
});
