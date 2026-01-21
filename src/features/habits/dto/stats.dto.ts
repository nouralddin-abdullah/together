import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Individual team attempt history
 */
export class AttemptHistoryDto {
  @ApiProperty({ description: 'Attempt number (1, 2, 3...)' })
  number: number;

  @ApiProperty({ description: 'Days reached in this attempt' })
  days: number;

  @ApiProperty({
    description: 'Result of the attempt',
    enum: ['ongoing', 'failed', 'completed'],
  })
  result: 'ongoing' | 'failed' | 'completed';

  @ApiProperty({ description: 'When attempt started' })
  startedAt: string;

  @ApiPropertyOptional({ description: 'When attempt ended (if ended)' })
  endedAt: string | null;

  @ApiPropertyOptional({
    description: 'Who caused the failure (if not anonymous)',
  })
  failedByNickName?: string | null;

  @ApiPropertyOptional({ description: 'Was the failure anonymous' })
  wasAnonymous?: boolean;
}

/**
 * Member statistics within the team
 */
export class MemberStatsDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User nickname' })
  nickName: string;

  @ApiPropertyOptional({ description: 'User avatar URL' })
  avatar?: string | null;

  @ApiProperty({ description: 'Check-in rate as percentage (0-100)' })
  checkInRate: number;

  @ApiProperty({ description: 'Total number of check-ins' })
  totalCheckIns: number;

  @ApiProperty({ description: 'Number of missed days' })
  missedDays: number;

  @ApiProperty({ description: 'Number of times this user caused team reset' })
  causedResets: number;
}

/**
 * Today's member status (same as existing MemberTodayStatusDto but with more details)
 */
export class TodayMemberDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  nickName: string;

  @ApiPropertyOptional()
  avatar?: string | null;

  @ApiProperty()
  completed: boolean;

  @ApiPropertyOptional()
  completedAt: string | null;

  @ApiPropertyOptional()
  proofUrl: string | null;

  @ApiPropertyOptional()
  proofType: 'image' | 'video' | null;
}

/**
 * Full team statistics response
 */
export class TeamStatsDto {
  @ApiProperty({ description: 'Team basic info' })
  team: {
    id: string;
    name: string;
    habitName: string;
    habitType: string;
    status: 'pending' | 'active' | 'completed';
    goal: number;
    requireProof: boolean;
    allowAnonymousFail: boolean;
  };

  @ApiPropertyOptional({ description: 'Current attempt info (if active)' })
  currentAttempt: {
    number: number;
    startedAt: string;
    daysCompleted: number;
    progressPercent: number;
  } | null;

  @ApiProperty({ description: 'Streak information' })
  streak: {
    current: number;
    best: number;
    goal: number;
    remaining: number;
  };

  @ApiProperty({ description: "Today's status for all members" })
  todayStatus: {
    date: string;
    deadline: string;
    members: TodayMemberDto[];
    summary: {
      total: number;
      completed: number;
      pending: number;
    };
  };

  @ApiProperty({ description: 'Historical stats' })
  history: {
    totalAttempts: number;
    longestStreak: number;
    averageStreak: number;
    successRate: number;
    attempts: AttemptHistoryDto[];
  };

  @ApiProperty({ description: 'Per-member statistics' })
  memberStats: MemberStatsDto[];
}

/**
 * Single attempt detail response
 */
export class AttemptDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  attemptNumber: number;

  @ApiProperty()
  startedAt: string;

  @ApiPropertyOptional()
  endedAt: string | null;

  @ApiProperty()
  daysReached: number;

  @ApiProperty({ enum: ['ongoing', 'failed', 'completed'] })
  endReason: 'ongoing' | 'failed' | 'completed';

  @ApiPropertyOptional()
  failedByUserId: string | null;

  @ApiPropertyOptional()
  failedByNickName: string | null;

  @ApiProperty()
  wasAnonymous: boolean;

  @ApiPropertyOptional({
    description: 'Daily progress records for this attempt',
  })
  dailyProgress?: {
    date: string;
    members: {
      userId: string;
      nickName: string;
      completed: boolean;
      completedAt: string | null;
      proofUrl: string | null;
    }[];
  }[];
}

/**
 * Personal contribution stats
 */
export class MyStatsDto {
  @ApiProperty({ description: 'User info' })
  user: {
    id: string;
    nickName: string;
  };

  @ApiPropertyOptional({ description: 'Team info (if in a team)' })
  teamInfo: {
    teamId: string;
    teamName: string;
    habitName: string;
    habitType: string;
    role: 'owner' | 'member';
    currentStreak: number;
    bestStreak: number;
    goal: number;
  } | null;

  @ApiPropertyOptional({ description: 'My contribution (if in a team)' })
  myContribution: {
    totalCheckIns: number;
    checkInRate: number;
    missedDays: number;
    averageCheckInTime: string | null;
    causedTeamResets: number;
  } | null;
}
