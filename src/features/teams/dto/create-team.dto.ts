import { HabitType, PrivacyTeam, StreakDurations } from '@shared/types';
import { TeamCategory } from '@shared/types/team-category.enum';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const createTeamSchema = z.object({
  teamName: z
    .string()
    .min(3, 'Team must be at least 3 characters')
    .max(40, 'Team must be at most 40 characters'),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(5000, 'Description must be at most 5000 characters'),
  allowAnonymousFail: z.boolean(),
  rules: z
    .string()
    .min(3, 'Rules must be at least 3 characters')
    .max(5000, 'Rules must be at most 5000 characters')
    .optional(),
  maxMembers: z
    .number()
    .min(2, 'Team must be at least 2 member')
    .max(6, 'Team must be at most 6 members'),
  wantedTeamStreak: z.enum(StreakDurations),
  habitName: z
    .string()
    .min(3, 'Habit must be at least 3 characters')
    .max(40, 'Habit must be at most 100 characters'),
  habitType: z.enum(HabitType),
  privacyType: z.enum(PrivacyTeam),
  TeamCategoty: z.enum(TeamCategory),
});

export class CreateTeamDto extends createZodDto(createTeamSchema) {}
