/**
 * Reception & Front Desk Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const receptionQuerySchema = z.object({
  featureId: z.literal('reception'),
});
