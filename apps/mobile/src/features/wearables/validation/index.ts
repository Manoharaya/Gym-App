/**
 * Wearables & Telemetry Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const wearablesQuerySchema = z.object({
  featureId: z.literal('wearables'),
});
