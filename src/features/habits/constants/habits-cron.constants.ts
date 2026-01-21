/**
 * Habits CRON Queue Constants
 */

// Queue name for habits scheduled jobs
export const HABITS_CRON_QUEUE = 'habits-cron';

// Job names
export enum HabitsCronJobName {
  // Midnight job to process BUILD habits for the previous day
  MIDNIGHT_BUILD_CHECK = 'midnight-build-check',
}

// Cron expressions
export const HABITS_CRON_EXPRESSIONS = {
  // Run at 00:05 UTC every day (5 minutes after midnight to ensure day rollover)
  MIDNIGHT: '5 0 * * *',
} as const;
