/**
 * Legal Consent & Terms Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const consentQuerySchema = z.object({
  featureId: z.literal('consent'),
});
