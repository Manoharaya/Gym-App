/**
 * Member Support & Help Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const supportQuerySchema = z.object({
  featureId: z.literal('support'),
});
