import { Expose, Type } from 'class-transformer';

/**
 * Member status for today
 */
export class MemberTodayStatusDto {
  @Expose()
  userId: string;

  @Expose()
  nickName: string;

  @Expose()
  avatar: string | null;

  @Expose()
  completed: boolean;

  @Expose()
  completedAt: string | null;

  @Expose()
  proofUrl: string | null;

  @Expose()
  proofType: 'image' | 'video' | null;
}

/**
 * Team status response for today
 */
export class TeamTodayStatusDto {
  @Expose()
  date: string;

  @Expose()
  habitType: string;

  @Expose()
  habitName: string;

  @Expose()
  requireProof: boolean;

  @Expose()
  currentStreak: number;

  @Expose()
  goalStreak: number;

  @Expose()
  @Type(() => MemberTodayStatusDto)
  members: MemberTodayStatusDto[];

  @Expose()
  summary: {
    total: number;
    completed: number;
    pending: number;
  };
}

/**
 * My today status response
 */
export class MyTodayStatusDto {
  @Expose()
  date: string;

  @Expose()
  habitType: string;

  @Expose()
  habitName: string;

  @Expose()
  completed: boolean;

  @Expose()
  completedAt: string | null;

  @Expose()
  proofUrl: string | null;

  @Expose()
  requireProof: boolean;

  @Expose()
  currentStreak: number;

  @Expose()
  goalStreak: number;

  @Expose()
  teamStatus: 'pending' | 'active' | 'completed';
}
