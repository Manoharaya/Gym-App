/**
 * Direct & Club Messaging Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const communicationQuerySchema = z.object({
  featureId: z.literal('communication'),
});
