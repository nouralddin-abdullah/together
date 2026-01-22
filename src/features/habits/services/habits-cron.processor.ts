import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';

import {
  HABITS_CRON_QUEUE,
  HabitsCronJobName,
} from '../constants/habits-cron.constants';

// Feature imports
import { TeamsService } from '../../teams/services/teams.service';
import { TeamAttemptService } from '../../teamAttempt/teams/services/team-attempt.service';
import { UsersService } from '../../users/services/users.service';
import { ChatService } from '../../chat/services/chat.service';
import { ChatGateway } from '../../chat/gateways/chat.gateway';
import {
  MessageType,
  SystemMessageType,
} from '../../chat/entities/message.entity';

// Shared imports
import { HabitType, AttemptEndReason, TeamStatus } from '@shared/types';

interface MidnightBuildCheckPayload {
  // Date to check (YYYY-MM-DD format) - usually yesterday
  // If not provided, will calculate yesterday's date
  checkDate?: string;
}

interface MidnightQuitCheckPayload {
  // Date to check (YYYY-MM-DD format) - usually yesterday
  // If not provided, will calculate yesterday's date
  checkDate?: string;
}

/**
 * Habits CRON Queue Processor
 * Handles scheduled jobs for habit tracking
 *
 * Jobs:
 * 1. MIDNIGHT_BUILD_CHECK
 *    - Runs at 00:05 UTC daily
 *    - Checks all ACTIVE BUILD teams
 *    - If all members completed: increment streak, check goal
 *    - If someone missed: end attempt, reset streak, start new attempt
 *
 * 2. MIDNIGHT_QUIT_CHECK
 *    - Runs at 00:05 UTC daily
 *    - Checks all ACTIVE QUIT teams
 *    - If no one slipped: increment streak, check goal
 *    - (Slips are handled in real-time by reportSlip)
 */
@Processor(HABITS_CRON_QUEUE)
export class HabitsCronProcessor extends WorkerHost {
  private readonly logger = new Logger(HabitsCronProcessor.name);

  constructor(
    @Inject(forwardRef(() => TeamsService))
    private teamsService: TeamsService,
    @Inject(forwardRef(() => TeamAttemptService))
    private teamAttemptService: TeamAttemptService,
    private usersService: UsersService,
    private chatService: ChatService,
    private chatGateway: ChatGateway,
  ) {
    super();
  }

  /**
   * Get yesterday's date in YYYY-MM-DD format
   */
  private getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  async process(
    job: Job<
      MidnightBuildCheckPayload | MidnightQuitCheckPayload,
      void,
      HabitsCronJobName
    >,
  ): Promise<void> {
    this.logger.log(`Processing job ${job.id}: ${job.name}`);

    switch (job.name) {
      case HabitsCronJobName.MIDNIGHT_BUILD_CHECK:
        await this.handleMidnightBuildCheck(
          job as Job<MidnightBuildCheckPayload>,
        );
        break;
      case HabitsCronJobName.MIDNIGHT_QUIT_CHECK:
        await this.handleMidnightQuitCheck(
          job as Job<MidnightQuitCheckPayload>,
        );
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Handle midnight BUILD habit check
   * For each ACTIVE BUILD team, check if all members completed their daily progress
   */
  private async handleMidnightBuildCheck(
    job: Job<MidnightBuildCheckPayload>,
  ): Promise<void> {
    // Calculate yesterday's date if not provided (for repeatable jobs)
    const checkDate = job.data.checkDate || this.getYesterdayDate();
    this.logger.log(`Running midnight BUILD check for date: ${checkDate}`);

    // Get all active BUILD teams
    const activeTeams = await this.teamsService.findActiveTeamsByHabitType(
      HabitType.BUILD,
    );

    this.logger.log(
      `Found ${activeTeams.length} active BUILD teams to process`,
    );

    // Process each team
    for (const team of activeTeams) {
      try {
        await this.processTeamBuildCheck(team.id, checkDate);
      } catch (error) {
        this.logger.error(
          `Error processing team ${team.id}: ${error.message}`,
          error.stack,
        );
        // Continue with other teams even if one fails
      }
    }

    this.logger.log(`Completed midnight BUILD check for date: ${checkDate}`);
  }

  /**
   * Process a single team's BUILD habit check
   */
  private async processTeamBuildCheck(
    teamId: string,
    checkDate: string,
  ): Promise<void> {
    // Get team details
    const team = await this.teamsService.findById(teamId);
    if (!team || team.status !== TeamStatus.ACTIVE) {
      this.logger.debug(`Team ${teamId} is no longer active, skipping`);
      return;
    }

    // Get all team members
    const members = await this.usersService.findByTeamId(teamId);
    if (members.length === 0) {
      this.logger.warn(`Team ${teamId} has no members, skipping`);
      return;
    }

    // Get current attempt
    const currentAttempt =
      await this.teamAttemptService.getCurrentAttempt(teamId);
    if (!currentAttempt) {
      this.logger.warn(`Team ${teamId} has no active attempt, skipping`);
      return;
    }

    // Check if the attempt started on or before the check date
    // If attempt started after checkDate, skip (challenge wasn't active that day)
    const attemptStartDate = currentAttempt.startedAt
      .toISOString()
      .split('T')[0];
    if (attemptStartDate > checkDate) {
      this.logger.debug(
        `BUILD Team ${teamId}: Attempt started on ${attemptStartDate}, after check date ${checkDate}. Skipping.`,
      );
      return;
    }

    // Calculate what the streak SHOULD be for this checkDate (idempotency)
    const expectedStreak = this.calculateDaysBetween(
      attemptStartDate,
      checkDate,
    );

    // If current streak is already >= expected, this date was already processed
    if (team.currentTeamStreak >= expectedStreak) {
      this.logger.debug(
        `BUILD Team ${teamId}: Streak already at ${team.currentTeamStreak}, expected ${expectedStreak} for ${checkDate}. Already processed.`,
      );
      return;
    }

    // Get daily progress for the check date
    const progress = await this.teamAttemptService.getDailyProgress(
      teamId,
      checkDate,
    );

    // Check if all members completed
    const completedCount = progress.filter((p) => p.completed).length;
    const allCompleted = completedCount === members.length;

    if (allCompleted) {
      await this.handleAllCompleted(team, currentAttempt, expectedStreak);
    } else {
      await this.handleSomeoneMissed(team, currentAttempt, progress, members);
    }

    // Create empty progress records for today (for BUILD habit tracking)
    const today = new Date().toISOString().split('T')[0];
    const memberIds = members.map((m) => m.id);

    // Only create if the attempt is still ongoing
    const updatedAttempt =
      await this.teamAttemptService.getCurrentAttempt(teamId);
    if (updatedAttempt) {
      await this.teamAttemptService.createDailyProgressForMembers(
        teamId,
        updatedAttempt.id,
        memberIds,
        today,
      );
    }
  }

  /**
   * Handle when all team members completed their daily habit
   * @param expectedStreak - The streak value based on days since attempt started
   */
  private async handleAllCompleted(
    team: { id: string; currentTeamStreak: number; wantedTeamStreak: number },
    currentAttempt: { id: string; attemptNumber: number },
    expectedStreak: number,
  ): Promise<void> {
    const newStreak = expectedStreak;
    this.logger.log(
      `Team ${team.id}: All completed! Streak ${team.currentTeamStreak} -> ${newStreak}`,
    );

    // Update streak to the expected value (not increment - for idempotency)
    await this.teamsService.updateTeamStreak(team.id, newStreak);

    // Check for milestones (every 5 days: 5, 10, 15, 20, 25, 30, etc.)
    if (newStreak > 0 && newStreak % 5 === 0) {
      const milestoneMessage = `🔥 ${newStreak} يوم! استمروا! 💪`;
      await this.chatService.createSystemMessage(
        team.id,
        SystemMessageType.STREAK_MILESTONE,
        milestoneMessage,
        undefined,
        { milestone: newStreak, goal: team.wantedTeamStreak },
      );

      // Emit WebSocket milestone event
      this.chatGateway.emitMilestone(team.id, {
        day: newStreak,
        goal: team.wantedTeamStreak,
        message: milestoneMessage,
      });
    }

    // Check if goal achieved
    if (newStreak >= team.wantedTeamStreak) {
      this.logger.log(
        `Team ${team.id}: Goal achieved! ${newStreak} >= ${team.wantedTeamStreak}`,
      );

      // End attempt as completed
      await this.teamAttemptService.endAttempt(
        currentAttempt.id,
        AttemptEndReason.COMPLETED,
        newStreak,
      );

      // Mark team as completed
      await this.teamsService.completeTeam(team.id);

      // Send congratulations message
      await this.chatService.createSystemMessage(
        team.id,
        SystemMessageType.CHALLENGE_COMPLETED,
        `🎉🎊 مبرررروك! أكملتم التحدي بنجاح! ${team.wantedTeamStreak} يوم!`,
        undefined,
        { goalReached: team.wantedTeamStreak },
      );

      // Emit WebSocket challenge completed event
      this.chatGateway.emitChallengeCompleted(team.id, {
        totalDays: team.wantedTeamStreak,
        totalAttempts: currentAttempt.attemptNumber,
      });
    }
  }

  /**
   * Handle when someone missed their daily habit
   */
  private async handleSomeoneMissed(
    team: { id: string; currentTeamStreak: number },
    currentAttempt: { id: string; attemptNumber: number },
    progress: { userId: string; completed: boolean }[],
    members: { id: string; nickName: string }[],
  ): Promise<void> {
    this.logger.log(
      `Team ${team.id}: Someone missed. Streak reset from ${team.currentTeamStreak}`,
    );

    const daysReached = team.currentTeamStreak;
    const attemptNumber = currentAttempt.attemptNumber;

    // Find who missed
    const completedUserIds = new Set(
      progress.filter((p) => p.completed).map((p) => p.userId),
    );
    const missedMembers = members.filter((m) => !completedUserIds.has(m.id));

    // End current attempt
    await this.teamAttemptService.endAttempt(
      currentAttempt.id,
      AttemptEndReason.FAILED,
      daysReached,
    );

    // Reset team streak
    await this.teamsService.updateTeamStreak(team.id, 0);

    // Create new attempt
    const newAttempt = await this.teamAttemptService.createAttempt(
      team.id,
      attemptNumber + 1,
    );

    // Build failure message
    const missedNames = missedMembers.map((m) => m.nickName).join('، ');
    const chatContent =
      missedMembers.length === 1
        ? `${missedNames} لم يكمل اليوم. السلسلة انتهت عند ${daysReached} يوم. نبدأ من جديد!`
        : `${missedNames} لم يكملوا اليوم. السلسلة انتهت عند ${daysReached} يوم. نبدأ من جديد!`;

    // Send failure message
    await this.chatService.createSystemMessage(
      team.id,
      SystemMessageType.STREAK_FAILED,
      chatContent,
      undefined,
      {
        missedUserIds: missedMembers.map((m) => m.id),
        attemptNumber,
        daysReached,
        newAttemptNumber: newAttempt.attemptNumber,
      },
    );

    // Emit WebSocket streak reset event
    this.chatGateway.emitStreakReset(team.id, {
      reason: 'missed',
      attemptNumber,
      daysReached,
      newAttemptNumber: newAttempt.attemptNumber,
      missedUserIds: missedMembers.map((m) => m.id),
    });
  }

  // ============================================================
  // QUIT HABIT PROCESSING
  // ============================================================

  /**
   * Handle midnight QUIT habit check
   * For each ACTIVE QUIT team, check if the day passed without any slips
   * If no slips: increment streak
   * If slips occurred: streak was already reset in real-time by reportSlip
   */
  private async handleMidnightQuitCheck(
    job: Job<MidnightQuitCheckPayload>,
  ): Promise<void> {
    const checkDate = job.data.checkDate || this.getYesterdayDate();
    this.logger.log(`Running midnight QUIT check for date: ${checkDate}`);

    // Get all active QUIT teams
    const activeTeams = await this.teamsService.findActiveTeamsByHabitType(
      HabitType.QUITE, // Note: enum value is 'quite' (lowercase)
    );

    this.logger.log(`Found ${activeTeams.length} active QUIT teams to process`);

    // Process each team
    for (const team of activeTeams) {
      try {
        await this.processTeamQuitCheck(team.id, checkDate);
      } catch (error) {
        this.logger.error(
          `Error processing QUIT team ${team.id}: ${error.message}`,
          error.stack,
        );
        // Continue with other teams even if one fails
      }
    }

    this.logger.log(`Completed midnight QUIT check for date: ${checkDate}`);
  }

  /**
   * Process a single team's QUIT habit check
   * If no one slipped yesterday, increment the streak
   */
  private async processTeamQuitCheck(
    teamId: string,
    checkDate: string,
  ): Promise<void> {
    // Get team details
    const team = await this.teamsService.findById(teamId);
    if (!team || team.status !== TeamStatus.ACTIVE) {
      this.logger.debug(`QUIT Team ${teamId} is no longer active, skipping`);
      return;
    }

    // Get current attempt
    const currentAttempt =
      await this.teamAttemptService.getCurrentAttempt(teamId);
    if (!currentAttempt) {
      this.logger.warn(`QUIT Team ${teamId} has no active attempt, skipping`);
      return;
    }

    // Check if the attempt started on or before the check date
    // If attempt started after checkDate, skip (new attempt after a slip)
    const attemptStartDate = currentAttempt.startedAt
      .toISOString()
      .split('T')[0];
    if (attemptStartDate > checkDate) {
      this.logger.debug(
        `QUIT Team ${teamId}: Attempt started on ${attemptStartDate}, after check date ${checkDate}. Skipping.`,
      );
      return;
    }

    // Calculate what the streak SHOULD be for this checkDate
    // This prevents double-counting if CRON runs multiple times
    const expectedStreak = this.calculateDaysBetween(
      attemptStartDate,
      checkDate,
    );

    // If current streak is already >= expected, this date was already processed
    if (team.currentTeamStreak >= expectedStreak) {
      this.logger.debug(
        `QUIT Team ${teamId}: Streak already at ${team.currentTeamStreak}, expected ${expectedStreak} for ${checkDate}. Already processed.`,
      );
      return;
    }

    // Check if anyone slipped on the check date
    const hadSlips = await this.teamAttemptService.hasSlipsOnDate(
      teamId,
      checkDate,
    );

    if (hadSlips) {
      // Slips already handled in real-time by reportSlip
      // Streak was already reset, new attempt was already created
      this.logger.debug(
        `QUIT Team ${teamId}: Slips occurred on ${checkDate}, already handled`,
      );
      return;
    }

    // No slips! Day was clean - set streak to expected value
    await this.handleQuitDayClean(team, currentAttempt, expectedStreak);
  }

  /**
   * Calculate the number of days between two dates (inclusive of end date)
   * e.g., 2026-01-21 to 2026-01-22 = 1 day (one full day passed)
   */
  private calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Handle when a QUIT team had a clean day (no slips)
   * @param expectedStreak - The streak value based on days since attempt started
   */
  private async handleQuitDayClean(
    team: { id: string; currentTeamStreak: number; wantedTeamStreak: number },
    currentAttempt: { id: string; attemptNumber: number },
    expectedStreak: number,
  ): Promise<void> {
    const newStreak = expectedStreak;
    this.logger.log(
      `QUIT Team ${team.id}: Clean day! Streak ${team.currentTeamStreak} -> ${newStreak}`,
    );

    // Update streak to the expected value (not increment)
    await this.teamsService.updateTeamStreak(team.id, newStreak);

    // Check for milestones (every 5 days)
    if (newStreak > 0 && newStreak % 5 === 0) {
      const milestoneMessage = `🔥 ${newStreak} يوم نظيف! استمروا! 💪`;
      await this.chatService.createSystemMessage(
        team.id,
        SystemMessageType.STREAK_MILESTONE,
        milestoneMessage,
        undefined,
        { milestone: newStreak, goal: team.wantedTeamStreak },
      );

      // Emit WebSocket milestone event
      this.chatGateway.emitMilestone(team.id, {
        day: newStreak,
        goal: team.wantedTeamStreak,
        message: milestoneMessage,
      });
    }

    // Check if goal achieved
    if (newStreak >= team.wantedTeamStreak) {
      this.logger.log(
        `QUIT Team ${team.id}: Goal achieved! ${newStreak} >= ${team.wantedTeamStreak}`,
      );

      // End attempt as completed
      await this.teamAttemptService.endAttempt(
        currentAttempt.id,
        AttemptEndReason.COMPLETED,
        newStreak,
      );

      // Mark team as completed
      await this.teamsService.completeTeam(team.id);

      // Send congratulations message
      await this.chatService.createSystemMessage(
        team.id,
        SystemMessageType.CHALLENGE_COMPLETED,
        `🎉🎊 مبرررروك! أكملتم التحدي بنجاح! ${team.wantedTeamStreak} يوم نظيف!`,
        undefined,
        { goalReached: team.wantedTeamStreak },
      );

      // Emit WebSocket challenge completed event
      this.chatGateway.emitChallengeCompleted(team.id, {
        totalDays: team.wantedTeamStreak,
        totalAttempts: currentAttempt.attemptNumber,
      });
    }
  }
}
