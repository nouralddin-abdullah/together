import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';

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
import { HabitType, TeamStatus } from '@shared/types';

// DTOs
import {
  CheckInDto,
  CheckInResponse,
  ReportSlipDto,
  ReportSlipResponse,
  MyTodayStatusDto,
  TeamTodayStatusDto,
  MemberTodayStatusDto,
} from '../dto';
import { AttemptEndReason } from '@shared/types';

@Injectable()
export class HabitsService {
  constructor(
    @Inject(forwardRef(() => TeamsService))
    private teamsService: TeamsService,
    @Inject(forwardRef(() => TeamAttemptService))
    private teamAttemptService: TeamAttemptService,
    private usersService: UsersService,
    private chatService: ChatService,
    private chatGateway: ChatGateway,
  ) {}

  /**
   * Check-in for BUILD habits
   * User confirms they completed their daily habit
   */
  async checkIn(
    userId: string,
    dto: CheckInDto,
  ): Promise<{ message: string; data: CheckInResponse }> {
    // Get user and validate they're in a team
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.teamId) {
      throw new BadRequestException('You are not in a team');
    }

    // Get team and validate status
    const team = await this.teamsService.findUserTeam(userId);
    if (team.status !== TeamStatus.ACTIVE) {
      throw new BadRequestException('Challenge has not started yet');
    }
    if (team.habitType !== HabitType.BUILD) {
      throw new BadRequestException(
        'Check-in is only for BUILD habits. Use report-slip for QUIT habits.',
      );
    }

    // Validate proof if required
    if (team.requireProof && !dto.proofUrl) {
      throw new BadRequestException('يجب إرفاق صورة أو فيديو كإثبات');
    }

    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    // Check if already checked in today
    const existingProgress = await this.teamAttemptService.getDailyProgress(
      team.id,
      today,
    );
    const userProgress = existingProgress.find((p) => p.userId === userId);
    if (userProgress?.completed) {
      // Idempotent - return success without error
      const completed = existingProgress
        .filter((p) => p.completed)
        .map((p) => p.userId);
      const pending = existingProgress
        .filter((p) => !p.completed)
        .map((p) => p.userId);

      return {
        message: 'تم تسجيل إنجازك مسبقاً! 🎉',
        data: {
          date: today,
          completedAt:
            userProgress.completedAt?.toISOString() || new Date().toISOString(),
          teamProgress: { completed, pending },
          allComplete: pending.length === 0,
        },
      };
    }

    // Get current attempt
    const currentAttempt = await this.teamAttemptService.getCurrentAttempt(
      team.id,
    );
    if (!currentAttempt) {
      throw new BadRequestException('No active attempt found');
    }

    // Mark progress as complete
    await this.teamAttemptService.markDailyProgressComplete(
      team.id,
      userId,
      today,
      dto.proofUrl,
      dto.proofType,
    );

    // Update user's lastCheckInDate
    await this.usersService.update(userId, { lastCheckInDate: today });

    // Get updated progress to check if all complete
    const updatedProgress = await this.teamAttemptService.getDailyProgress(
      team.id,
      today,
    );
    const completed = updatedProgress
      .filter((p) => p.completed)
      .map((p) => p.userId);
    const pending = updatedProgress
      .filter((p) => !p.completed)
      .map((p) => p.userId);
    const allComplete = pending.length === 0;

    // Send system message to chat
    await this.chatService.createSystemMessage(
      team.id,
      SystemMessageType.STREAK_COMPLETED,
      `✓ ${user.nickName} أكمل اليوم`,
      userId,
      { day: team.currentTeamStreak + 1 },
    );

    // Emit WebSocket event for check-in
    this.chatGateway.emitHabitCheckIn(team.id, {
      userId,
      nickName: user.nickName,
      day: team.currentTeamStreak + 1,
    });

    // Emit all complete event if everyone finished
    if (allComplete) {
      this.chatGateway.emitAllComplete(team.id, {
        day: team.currentTeamStreak + 1,
        memberCount: completed.length,
      });
    }

    return {
      message: 'تم تسجيل إنجازك! 🎉',
      data: {
        date: today,
        completedAt: new Date().toISOString(),
        teamProgress: { completed, pending },
        allComplete,
      },
    };
  }

  /**
   * Report slip for QUIT habits
   * User admits they slipped/relapsed
   */
  async reportSlip(
    userId: string,
    dto: ReportSlipDto,
  ): Promise<{ message: string; data: ReportSlipResponse }> {
    // Get user and validate they're in a team
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.teamId) {
      throw new BadRequestException('You are not in a team');
    }

    // Get team and validate status
    const team = await this.teamsService.findUserTeam(userId);
    if (team.status !== TeamStatus.ACTIVE) {
      throw new BadRequestException('Challenge has not started yet');
    }
    if (team.habitType !== HabitType.QUITE) {
      throw new BadRequestException(
        'Report slip is only for QUIT habits. Use check-in for BUILD habits.',
      );
    }

    // Check if team allows anonymous (if user chose anonymous)
    if (dto.anonymous && !team.allowAnonymousFail) {
      throw new BadRequestException(
        'Anonymous reporting is not allowed in this team',
      );
    }

    // Get current attempt
    const currentAttempt = await this.teamAttemptService.getCurrentAttempt(
      team.id,
    );
    if (!currentAttempt) {
      throw new BadRequestException('No active attempt found');
    }

    // Check if someone already slipped today (attempt started today = already reset)
    const today = new Date().toISOString().split('T')[0];
    const attemptStartDate = currentAttempt.startedAt
      .toISOString()
      .split('T')[0];
    const alreadyResetToday =
      attemptStartDate === today && team.currentTeamStreak === 0;

    // Create slip report (always record the slip)
    await this.teamAttemptService.createSlipReport(
      team.id,
      userId,
      currentAttempt.id,
      dto.anonymous,
      dto.note,
    );

    // If already reset today, just record the slip and send a message
    if (alreadyResetToday) {
      const chatContent = dto.anonymous
        ? 'أحد الأعضاء أيضاً انتكس اليوم.'
        : `${user.nickName} أيضاً انتكس اليوم.`;

      await this.chatService.createSystemMessage(
        team.id,
        SystemMessageType.STREAK_FAILED,
        chatContent,
        dto.anonymous ? undefined : userId,
        {
          anonymous: dto.anonymous,
          attemptNumber: currentAttempt.attemptNumber,
          additionalSlip: true, // Mark as additional slip
        },
      );

      // Emit WebSocket event
      this.chatGateway.emitHabitSlip(team.id, {
        anonymous: dto.anonymous,
        nickName: dto.anonymous ? undefined : user.nickName,
        attemptNumber: currentAttempt.attemptNumber,
        daysReached: 0,
        newAttemptNumber: currentAttempt.attemptNumber, // Same attempt continues
      });

      return {
        message: 'شكراً على صدقك. التحدي بدأ من جديد اليوم بالفعل.',
        data: {
          attemptEnded: currentAttempt.attemptNumber,
          daysReached: 0,
          newAttemptNumber: currentAttempt.attemptNumber,
          wasAnonymous: dto.anonymous,
          alreadyResetToday: true,
        },
      };
    }

    // First slip of the day - full reset flow
    const daysReached = team.currentTeamStreak;
    const attemptEnded = currentAttempt.attemptNumber;

    // End current attempt
    await this.teamAttemptService.endAttempt(
      currentAttempt.id,
      AttemptEndReason.FAILED,
      daysReached,
      userId,
      dto.anonymous,
    );

    // Reset team streak (using raw update to avoid circular dependency)
    await this.teamsService.updateTeamStreak(team.id, 0);

    // Create new attempt
    const newAttempt = await this.teamAttemptService.createAttempt(
      team.id,
      attemptEnded + 1,
    );

    // Send system message to chat
    const chatContent = dto.anonymous
      ? 'أحد الأعضاء انتكس. السلسلة انتهت. نبدأ من جديد!'
      : `${user.nickName} انتكس. السلسلة انتهت. نبدأ من جديد!`;

    await this.chatService.createSystemMessage(
      team.id,
      SystemMessageType.STREAK_FAILED,
      chatContent,
      dto.anonymous ? undefined : userId,
      {
        anonymous: dto.anonymous,
        attemptNumber: attemptEnded,
        daysReached,
        newAttemptNumber: newAttempt.attemptNumber,
      },
    );

    // Emit WebSocket event for slip
    this.chatGateway.emitHabitSlip(team.id, {
      anonymous: dto.anonymous,
      nickName: dto.anonymous ? undefined : user.nickName,
      attemptNumber: attemptEnded,
      daysReached,
      newAttemptNumber: newAttempt.attemptNumber,
    });

    return {
      message: 'شكراً على صدقك. لا بأس، نبدأ من جديد!',
      data: {
        attemptEnded,
        daysReached,
        newAttemptNumber: newAttempt.attemptNumber,
        wasAnonymous: dto.anonymous,
      },
    };
  }

  /**
   * Get my status for today
   */
  async getMyTodayStatus(userId: string): Promise<MyTodayStatusDto> {
    // Get user and validate they're in a team
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.teamId) {
      throw new BadRequestException('You are not in a team');
    }

    const team = await this.teamsService.findUserTeam(userId);
    const today = new Date().toISOString().split('T')[0];

    // Default response for non-active or QUIT habits
    const baseResponse: MyTodayStatusDto = {
      date: today,
      habitType: team.habitType,
      habitName: team.habitName,
      completed: false,
      completedAt: null,
      proofUrl: null,
      requireProof: team.requireProof,
      currentStreak: team.currentTeamStreak,
      goalStreak: team.wantedTeamStreak,
      teamStatus: team.status as 'pending' | 'active' | 'completed',
    };

    // For QUIT habits or non-active teams, no daily check-in needed
    if (
      team.habitType === HabitType.QUITE ||
      team.status !== TeamStatus.ACTIVE
    ) {
      return baseResponse;
    }

    // For BUILD habits, check today's progress
    const progress = await this.teamAttemptService.getDailyProgress(
      team.id,
      today,
    );
    const myProgress = progress.find((p) => p.userId === userId);

    return {
      ...baseResponse,
      completed: myProgress?.completed ?? false,
      completedAt: myProgress?.completedAt?.toISOString() ?? null,
      proofUrl: myProgress?.proofUrl ?? null,
    };
  }

  /**
   * Get all team members' status for today
   */
  async getTeamTodayStatus(userId: string): Promise<TeamTodayStatusDto> {
    // Get user and validate they're in a team
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.teamId) {
      throw new BadRequestException('You are not in a team');
    }

    const team = await this.teamsService.findUserTeam(userId);
    const today = new Date().toISOString().split('T')[0];

    // Get all team members
    const members = await this.usersService.findByTeamId(team.id);

    // For QUIT habits, everyone is "clean" by default
    if (team.habitType === HabitType.QUITE) {
      const memberStatuses: MemberTodayStatusDto[] = members.map((m) => ({
        userId: m.id,
        nickName: m.nickName,
        avatar: m.avatar,
        completed: true, // In QUIT, no daily action = staying clean
        completedAt: null,
        proofUrl: null,
        proofType: null,
      }));

      return {
        date: today,
        habitType: team.habitType,
        habitName: team.habitName,
        requireProof: false, // No proof for QUIT
        currentStreak: team.currentTeamStreak,
        goalStreak: team.wantedTeamStreak,
        members: memberStatuses,
        summary: {
          total: members.length,
          completed: members.length,
          pending: 0,
        },
      };
    }

    // For BUILD habits, get today's progress
    const progress = await this.teamAttemptService.getDailyProgress(
      team.id,
      today,
    );

    const memberStatuses: MemberTodayStatusDto[] = members.map((m) => {
      const memberProgress = progress.find((p) => p.userId === m.id);
      return {
        userId: m.id,
        nickName: m.nickName,
        avatar: m.avatar,
        completed: memberProgress?.completed ?? false,
        completedAt: memberProgress?.completedAt?.toISOString() ?? null,
        proofUrl: memberProgress?.proofUrl ?? null,
        proofType: memberProgress?.proofType ?? null,
      };
    });

    const completedCount = memberStatuses.filter((m) => m.completed).length;

    return {
      date: today,
      habitType: team.habitType,
      habitName: team.habitName,
      requireProof: team.requireProof,
      currentStreak: team.currentTeamStreak,
      goalStreak: team.wantedTeamStreak,
      members: memberStatuses,
      summary: {
        total: members.length,
        completed: completedCount,
        pending: members.length - completedCount,
      },
    };
  }
}
