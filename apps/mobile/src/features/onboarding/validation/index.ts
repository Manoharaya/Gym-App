/**
 * Member Onboarding Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const onboardingQuerySchema = z.object({
  featureId: z.literal('onboarding'),
});
