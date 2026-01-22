import { Body, Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';

// Core imports
import { CurrentUser, Public } from '@core/decorators';

// Shared imports
import { type AuthenticatedUser } from '@shared/types';

// Feature imports
import { HabitsService } from '../services/habits.service';
import { StatsService } from '../services/stats.service';
import { HabitsCronService } from '../services/habits-cron.service';
import { CheckInDto, ReportSlipDto } from '../dto';

@ApiTags('Habits')
@Controller('habits')
export class HabitsController {
  constructor(
    private readonly habitsService: HabitsService,
    private readonly statsService: StatsService,
    private readonly habitsCronService: HabitsCronService,
  ) {}

  /**
   * Check-in for BUILD habits
   * User confirms they completed their daily habit
   */
  @Post('/check-in')
  @ApiOperation({ summary: "Complete today's habit (BUILD habits only)" })
  async checkIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckInDto,
  ) {
    const result = await this.habitsService.checkIn(user.userId, dto);
    return {
      success: true,
      message: result.message,
      data: result.data,
    };
  }

  /**
   * Report slip for QUIT habits
   * User admits they slipped/relapsed
   */
  @Post('/report-slip')
  @ApiOperation({ summary: 'Report a slip/relapse (QUIT habits only)' })
  async reportSlip(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReportSlipDto,
  ) {
    const result = await this.habitsService.reportSlip(user.userId, dto);
    return {
      success: true,
      message: result.message,
      data: result.data,
    };
  }

  /**
   * Get my status for today
   */
  @Get('/today')
  @ApiOperation({ summary: 'Get my habit status for today' })
  async getMyTodayStatus(@CurrentUser() user: AuthenticatedUser) {
    const status = await this.habitsService.getMyTodayStatus(user.userId);
    return {
      success: true,
      message: 'Status retrieved successfully',
      data: status,
    };
  }

  /**
   * Get all team members' status for today
   */
  @Get('/team-status')
  @ApiOperation({ summary: "Get all team members' habit status for today" })
  async getTeamTodayStatus(@CurrentUser() user: AuthenticatedUser) {
    const status = await this.habitsService.getTeamTodayStatus(user.userId);
    return {
      success: true,
      message: 'Team status retrieved successfully',
      data: status,
    };
  }

  // ─── Statistics Endpoints ──────────────────────────────────────────────────

  /**
   * Get comprehensive team statistics
   */
  @Get('/stats')
  @ApiOperation({ summary: 'Get full team statistics and history' })
  async getTeamStats(@CurrentUser() user: AuthenticatedUser) {
    const stats = await this.statsService.getTeamStats(user.userId);
    return {
      success: true,
      message: 'Team stats retrieved successfully',
      data: stats,
    };
  }

  /**
   * Get all attempts for the team
   */
  @Get('/attempts')
  @ApiOperation({ summary: 'Get all team attempts history' })
  async getTeamAttempts(@CurrentUser() user: AuthenticatedUser) {
    const attempts = await this.statsService.getTeamAttempts(user.userId);
    return {
      success: true,
      message: 'Team attempts retrieved successfully',
      data: attempts,
    };
  }

  /**
   * Get detailed info for a specific attempt
   */
  @Get('/attempts/:attemptId')
  @ApiOperation({ summary: 'Get detailed info for a specific attempt' })
  @ApiParam({ name: 'attemptId', description: 'Attempt UUID' })
  async getAttemptDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId') attemptId: string,
  ) {
    const attempt = await this.statsService.getAttemptDetail(
      user.userId,
      attemptId,
    );
    return {
      success: true,
      message: 'Attempt detail retrieved successfully',
      data: attempt,
    };
  }

  /**
   * Get personal habit statistics
   */
  @Get('/my-stats')
  @ApiOperation({ summary: 'Get personal habit statistics' })
  async getMyStats(@CurrentUser() user: AuthenticatedUser) {
    const stats = await this.statsService.getMyStats(user.userId);
    return {
      success: true,
      message: 'Personal stats retrieved successfully',
      data: stats,
    };
  }

  // ─── DEV/TEST ONLY - Comment out before deploying! ─────────────────────────
  // ┌──────────────────────────────────────────────────────────────────────────┐
  // │  COMMENT OUT THE SECTION BELOW BEFORE PRODUCTION DEPLOYMENT              │
  // └──────────────────────────────────────────────────────────────────────────┘

  /**
   * [DEV ONLY] Manually trigger midnight CRON job
   * Useful for testing or catching up missed days
   *
   * @example POST /habits/trigger-cron?date=2026-01-21
   */
  @Post('/trigger-cron')
  @Public() // No auth needed for dev endpoint
  @ApiOperation({ summary: '[DEV] Manually trigger midnight CRON jobs' })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Date to check (YYYY-MM-DD), defaults to yesterday',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['build', 'quit', 'all'],
    description: 'Which CRON to trigger',
  })
  async triggerCron(
    @Query('date') date?: string,
    @Query('type') type?: 'build' | 'quit' | 'all',
  ) {
    const cronType = type || 'all';

    if (cronType === 'build') {
      await this.habitsCronService.triggerMidnightBuildCheck(date);
    } else if (cronType === 'quit') {
      await this.habitsCronService.triggerMidnightQuitCheck(date);
    } else {
      await this.habitsCronService.triggerMidnightCheck(date);
    }

    return {
      success: true,
      message: `CRON job(s) triggered for ${date || 'yesterday'}`,
      data: {
        type: cronType,
        date: date || 'yesterday',
        note: 'Jobs are queued and will process shortly',
      },
    };
  }

  // └──────────────────────────────────────────────────────────────────────────┘
  // │  END OF DEV SECTION - Comment out above before production                │
  // ┌──────────────────────────────────────────────────────────────────────────┐
}
