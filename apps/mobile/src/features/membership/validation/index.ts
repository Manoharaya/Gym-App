/**
 * Membership & Subscriptions Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const membershipQuerySchema = z.object({
  featureId: z.literal('membership'),
});
