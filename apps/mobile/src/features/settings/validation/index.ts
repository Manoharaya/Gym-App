/**
 * Club & App Settings Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const settingsQuerySchema = z.object({
  featureId: z.literal('settings'),
});
