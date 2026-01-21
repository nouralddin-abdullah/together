import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';

// Feature imports
import { TeamsService } from '../../teams/services/teams.service';
import { TeamAttemptService } from '../../teamAttempt/teams/services/team-attempt.service';
import { UsersService } from '../../users/services/users.service';

// Shared imports
import { HabitType, TeamStatus, AttemptEndReason } from '@shared/types';

// DTOs
import {
  TeamStatsDto,
  AttemptDetailDto,
  MyStatsDto,
  AttemptHistoryDto,
  MemberStatsDto,
  TodayMemberDto,
} from '../dto/stats.dto';

@Injectable()
export class StatsService {
  constructor(
    @Inject(forwardRef(() => TeamsService))
    private teamsService: TeamsService,
    @Inject(forwardRef(() => TeamAttemptService))
    private teamAttemptService: TeamAttemptService,
    private usersService: UsersService,
  ) {}

  /**
   * Get comprehensive team statistics
   */
  async getTeamStats(userId: string): Promise<TeamStatsDto> {
    // Get user and validate they're in a team
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.teamId) {
      throw new BadRequestException('You are not in a team');
    }

    const team = await this.teamsService.findUserTeam(userId);
    const members = await this.usersService.findByTeamId(team.id);
    const attempts = await this.teamAttemptService.getTeamAttempts(team.id);

    // Calculate streak info
    const bestStreak = Math.max(
      team.topTeamStreak || 0,
      ...attempts.map((a) => a.daysReached || 0),
    );
    const remaining = Math.max(
      0,
      team.wantedTeamStreak - team.currentTeamStreak,
    );

    // Current attempt info
    const currentAttempt = attempts.find(
      (a) => a.endReason === AttemptEndReason.ONGOING,
    );
    const currentAttemptInfo = currentAttempt
      ? {
          number: currentAttempt.attemptNumber,
          startedAt: currentAttempt.startedAt.toISOString(),
          daysCompleted: team.currentTeamStreak,
          progressPercent: Math.round(
            (team.currentTeamStreak / team.wantedTeamStreak) * 100,
          ),
        }
      : null;

    // Today's status
    const today = new Date().toISOString().split('T')[0];
    const todayProgress = await this.teamAttemptService.getDailyProgress(
      team.id,
      today,
    );

    const todayMembers: TodayMemberDto[] = members.map((m) => {
      const progress = todayProgress.find((p) => p.userId === m.id);
      return {
        userId: m.id,
        nickName: m.nickName,
        avatar: m.avatar || null,
        completed: progress?.completed ?? false,
        completedAt: progress?.completedAt?.toISOString() ?? null,
        proofUrl: progress?.proofUrl ?? null,
        proofType: progress?.proofType ?? null,
      };
    });

    const completedCount = todayMembers.filter((m) => m.completed).length;

    // Attempt history
    const attemptHistory: AttemptHistoryDto[] = attempts.map((a) => {
      const failedByMember = a.failedByUserId
        ? members.find((m) => m.id === a.failedByUserId)
        : null;
      return {
        number: a.attemptNumber,
        days: a.daysReached,
        result: a.endReason as 'ongoing' | 'failed' | 'completed',
        startedAt: a.startedAt.toISOString(),
        endedAt: a.endedAt?.toISOString() ?? null,
        failedByNickName:
          a.wasAnonymous || !failedByMember ? null : failedByMember.nickName,
        wasAnonymous: a.wasAnonymous,
      };
    });

    // Calculate historical stats
    const completedAttempts = attempts.filter(
      (a) => a.endReason === AttemptEndReason.COMPLETED,
    );
    const failedAttempts = attempts.filter(
      (a) => a.endReason === AttemptEndReason.FAILED,
    );
    const finishedAttempts = [...completedAttempts, ...failedAttempts];
    const averageStreak =
      finishedAttempts.length > 0
        ? finishedAttempts.reduce((sum, a) => sum + a.daysReached, 0) /
          finishedAttempts.length
        : 0;
    const successRate =
      finishedAttempts.length > 0
        ? (completedAttempts.length / finishedAttempts.length) * 100
        : 0;

    // Member stats - need to calculate per-member metrics
    const memberStats = await this.calculateMemberStats(
      team.id,
      members,
      attempts,
    );

    return {
      team: {
        id: team.id,
        name: team.teamName,
        habitName: team.habitName,
        habitType: team.habitType,
        status: team.status.toLowerCase() as 'pending' | 'active' | 'completed',
        goal: team.wantedTeamStreak,
        requireProof: team.requireProof,
        allowAnonymousFail: team.allowAnonymousFail,
      },
      currentAttempt: currentAttemptInfo,
      streak: {
        current: team.currentTeamStreak,
        best: bestStreak,
        goal: team.wantedTeamStreak,
        remaining,
      },
      todayStatus: {
        date: today,
        deadline: '23:59', // Could be timezone-aware in future
        members: todayMembers,
        summary: {
          total: members.length,
          completed: completedCount,
          pending: members.length - completedCount,
        },
      },
      history: {
        totalAttempts: attempts.length,
        longestStreak: bestStreak,
        averageStreak: Math.round(averageStreak * 10) / 10,
        successRate: Math.round(successRate * 10) / 10,
        attempts: attemptHistory,
      },
      memberStats,
    };
  }

  /**
   * Get all attempts for a team
   */
  async getTeamAttempts(userId: string): Promise<AttemptHistoryDto[]> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.teamId) {
      throw new BadRequestException('You are not in a team');
    }

    const team = await this.teamsService.findUserTeam(userId);
    const members = await this.usersService.findByTeamId(team.id);
    const attempts = await this.teamAttemptService.getTeamAttempts(team.id);

    return attempts.map((a) => {
      const failedByMember = a.failedByUserId
        ? members.find((m) => m.id === a.failedByUserId)
        : null;
      return {
        number: a.attemptNumber,
        days: a.daysReached,
        result: a.endReason as 'ongoing' | 'failed' | 'completed',
        startedAt: a.startedAt.toISOString(),
        endedAt: a.endedAt?.toISOString() ?? null,
        failedByNickName:
          a.wasAnonymous || !failedByMember ? null : failedByMember.nickName,
        wasAnonymous: a.wasAnonymous,
      };
    });
  }

  /**
   * Get detailed info for a specific attempt
   */
  async getAttemptDetail(
    userId: string,
    attemptId: string,
  ): Promise<AttemptDetailDto> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.teamId) {
      throw new BadRequestException('You are not in a team');
    }

    const team = await this.teamsService.findUserTeam(userId);
    const members = await this.usersService.findByTeamId(team.id);
    const attempts = await this.teamAttemptService.getTeamAttempts(team.id);

    const attempt = attempts.find((a) => a.id === attemptId);
    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    const failedByMember = attempt.failedByUserId
      ? members.find((m) => m.id === attempt.failedByUserId)
      : null;

    // Get daily progress for this attempt (if BUILD habit)
    const dailyProgress: AttemptDetailDto['dailyProgress'] = [];

    if (team.habitType === HabitType.BUILD) {
      // Get all progress records for this attempt's date range
      // For now, we'll get progress records and group by date
      // In a real implementation, you'd have attemptId on DailyProgress

      const startDate = new Date(attempt.startedAt);
      const endDate = attempt.endedAt ? new Date(attempt.endedAt) : new Date();

      // Iterate through each day
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayProgress = await this.teamAttemptService.getDailyProgress(
          team.id,
          dateStr,
        );

        if (dayProgress.length > 0) {
          dailyProgress.push({
            date: dateStr,
            members: dayProgress.map((p) => {
              const member = members.find((m) => m.id === p.userId);
              return {
                userId: p.userId,
                nickName: member?.nickName || 'Unknown',
                completed: p.completed,
                completedAt: p.completedAt?.toISOString() ?? null,
                proofUrl: p.proofUrl ?? null,
              };
            }),
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt.toISOString(),
      endedAt: attempt.endedAt?.toISOString() ?? null,
      daysReached: attempt.daysReached,
      endReason: attempt.endReason as 'ongoing' | 'failed' | 'completed',
      failedByUserId: attempt.failedByUserId,
      failedByNickName:
        attempt.wasAnonymous || !failedByMember
          ? null
          : failedByMember.nickName,
      wasAnonymous: attempt.wasAnonymous,
      dailyProgress,
    };
  }

  /**
   * Get personal statistics
   */
  async getMyStats(userId: string): Promise<MyStatsDto> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Base response if not in a team
    if (!user.teamId) {
      return {
        user: {
          id: user.id,
          nickName: user.nickName,
        },
        teamInfo: null,
        myContribution: null,
      };
    }

    const team = await this.teamsService.findUserTeam(userId);
    const attempts = await this.teamAttemptService.getTeamAttempts(team.id);

    // Calculate my contribution
    const myContribution = await this.calculateMyContribution(
      team.id,
      userId,
      attempts,
    );

    const bestStreak = Math.max(
      team.topTeamStreak || 0,
      ...attempts.map((a) => a.daysReached || 0),
    );

    return {
      user: {
        id: user.id,
        nickName: user.nickName,
      },
      teamInfo: {
        teamId: team.id,
        teamName: team.teamName,
        habitName: team.habitName,
        habitType: team.habitType,
        role: team.ownerId === userId ? 'owner' : 'member',
        currentStreak: team.currentTeamStreak,
        bestStreak,
        goal: team.wantedTeamStreak,
      },
      myContribution,
    };
  }

  /**
   * Calculate per-member statistics
   */
  private async calculateMemberStats(
    teamId: string,
    members: { id: string; nickName: string; avatar: string | null }[],
    attempts: {
      id: string;
      daysReached: number;
      failedByUserId: string | null;
      endReason: string;
    }[],
  ): Promise<MemberStatsDto[]> {
    const memberStats: MemberStatsDto[] = [];

    // Calculate total days attempted (sum of all attempts' daysReached + current ongoing days)
    const totalDaysAttempted = attempts.reduce(
      (sum, a) => sum + a.daysReached,
      0,
    );

    for (const member of members) {
      // Count check-ins for this member
      let totalCheckIns = 0;
      let missedDays = 0;

      // Count how many times this member caused a reset
      const causedResets = attempts.filter(
        (a) =>
          a.failedByUserId === member.id &&
          a.endReason === AttemptEndReason.FAILED,
      ).length;

      // For BUILD habits, we need to count actual check-ins
      // This is a simplified calculation - in production you'd query DailyProgress directly
      // For now, estimate based on total days and resets caused
      totalCheckIns = Math.max(0, totalDaysAttempted - causedResets);
      missedDays = causedResets; // Simplified - actual would query DailyProgress

      const checkInRate =
        totalDaysAttempted > 0
          ? Math.round((totalCheckIns / totalDaysAttempted) * 100)
          : 100;

      memberStats.push({
        userId: member.id,
        nickName: member.nickName,
        avatar: member.avatar,
        checkInRate: Math.min(100, checkInRate),
        totalCheckIns,
        missedDays,
        causedResets,
      });
    }

    return memberStats;
  }

  /**
   * Calculate personal contribution stats
   */
  private async calculateMyContribution(
    teamId: string,
    userId: string,
    attempts: {
      id: string;
      daysReached: number;
      failedByUserId: string | null;
      endReason: string;
    }[],
  ): Promise<MyStatsDto['myContribution']> {
    // Calculate total days attempted
    const totalDaysAttempted = attempts.reduce(
      (sum, a) => sum + a.daysReached,
      0,
    );

    // Count how many times I caused a reset
    const causedTeamResets = attempts.filter(
      (a) =>
        a.failedByUserId === userId && a.endReason === AttemptEndReason.FAILED,
    ).length;

    // Simplified calculation - actual would query DailyProgress
    const totalCheckIns = Math.max(0, totalDaysAttempted - causedTeamResets);
    const missedDays = causedTeamResets;
    const checkInRate =
      totalDaysAttempted > 0
        ? Math.round((totalCheckIns / totalDaysAttempted) * 100)
        : 100;

    return {
      totalCheckIns,
      checkInRate: Math.min(100, checkInRate),
      missedDays,
      averageCheckInTime: null, // Would need to aggregate completedAt times
      causedTeamResets,
    };
  }
}
