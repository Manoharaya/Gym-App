/**
 * Role Dashboards Validation Schemas
 * Specific input validators will be defined in subsequent development phases.
 */

import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  featureId: z.literal('dashboard'),
});
