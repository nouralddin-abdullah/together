import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { TeamCategory, StreakDurations } from '@shared/types';

const discoverQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1)),

  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100)),

  sortBy: z.string().optional().default('createdAt'),

  order: z.enum(['asc', 'desc']).optional().default('desc'),

  categories: z
    .union([z.enum(TeamCategory), z.array(z.enum(TeamCategory))])
    .optional()
    .transform((val) => (val ? (Array.isArray(val) ? val : [val]) : undefined)),

  streakDuration: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.enum(StreakDurations).optional()),
});

export class DiscoverQueryDto extends createZodDto(discoverQuerySchema) {}

export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;
