import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;

export const dateRangeSchema = z.object({
  startDate: z.string().datetime({ message: 'Must be a valid ISO 8601 date string' }),
  endDate: z.string().datetime({ message: 'Must be a valid ISO 8601 date string' }),
});

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
