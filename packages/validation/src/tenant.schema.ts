import { z } from 'zod';
import { ALL_ROLES } from '@fitcore/constants';

export const tenantContextSchema = z.object({
  organisationId: z.string().min(1, 'Organisation ID is required'),
  organisationName: z.string().min(1, 'Organisation Name is required'),
  outletId: z.string().optional(),
  outletName: z.string().optional(),
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(ALL_ROLES as unknown as [string, ...string[]]),
  isDevSeed: z.boolean().optional(),
});

export const switchOutletSchema = z.object({
  outletId: z.string().min(1, 'Outlet ID is required'),
});

export type SwitchOutletInput = z.infer<typeof switchOutletSchema>;
