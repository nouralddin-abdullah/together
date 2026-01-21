import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import {
  HABITS_CRON_QUEUE,
  HabitsCronJobName,
  HABITS_CRON_EXPRESSIONS,
} from '../constants/habits-cron.constants';

/**
 * Service to manage habits CRON jobs
 * Sets up repeatable jobs on module initialization
 */
@Injectable()
export class HabitsCronService implements OnModuleInit {
  private readonly logger = new Logger(HabitsCronService.name);

  constructor(
    @InjectQueue(HABITS_CRON_QUEUE)
    private readonly habitsQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.setupRepeatableJobs();
  }

  /**
   * Setup repeatable jobs for habits processing
   */
  private async setupRepeatableJobs(): Promise<void> {
    this.logger.log('Setting up habits CRON jobs...');

    // Remove any existing repeatable jobs to avoid duplicates
    const existingJobs = await this.habitsQueue.getRepeatableJobs();
    for (const job of existingJobs) {
      await this.habitsQueue.removeRepeatableByKey(job.key);
      this.logger.debug(`Removed existing job: ${job.name}`);
    }

    // Add midnight BUILD check job
    // Runs at 00:05 UTC every day
    // checkDate is calculated dynamically in the processor
    await this.habitsQueue.add(
      HabitsCronJobName.MIDNIGHT_BUILD_CHECK,
      {}, // Empty payload - processor calculates yesterday's date
      {
        repeat: {
          pattern: HABITS_CRON_EXPRESSIONS.MIDNIGHT,
        },
        jobId: 'midnight-build-check-repeatable',
        removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
        removeOnFail: { count: 100 }, // Keep last 100 failed jobs
      },
    );

    this.logger.log(
      `Scheduled MIDNIGHT_BUILD_CHECK job with cron: ${HABITS_CRON_EXPRESSIONS.MIDNIGHT}`,
    );
  }

  /**
   * Get yesterday's date in YYYY-MM-DD format
   */
  private getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  /**
   * Manually trigger the midnight check for a specific date
   * Useful for testing or catching up on missed jobs
   */
  async triggerMidnightCheck(checkDate?: string): Promise<void> {
    const date = checkDate || this.getYesterdayDate();
    this.logger.log(`Manually triggering midnight check for date: ${date}`);

    await this.habitsQueue.add(
      HabitsCronJobName.MIDNIGHT_BUILD_CHECK,
      { checkDate: date },
      {
        jobId: `manual-midnight-check-${date}-${Date.now()}`,
        removeOnComplete: true,
        removeOnFail: { count: 10 },
      },
    );
  }

  /**
   * Get job statistics
   */
  async getJobStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.habitsQueue.getWaitingCount(),
      this.habitsQueue.getActiveCount(),
      this.habitsQueue.getCompletedCount(),
      this.habitsQueue.getFailedCount(),
      this.habitsQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}
