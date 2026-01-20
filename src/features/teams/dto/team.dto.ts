import { Expose } from 'class-transformer';
import { TeamStatus } from '@shared/types';

export class TeamDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  ownerId: string;
  @Expose()
  description: string;

  @Expose()
  inviteCode: string;

  @Expose()
  rules: string;

  @Expose()
  allowAnonymousFail: boolean;

  @Expose()
  privacy: boolean;

  @Expose()
  habitName: string;

  @Expose()
  habitType: string;

  @Expose()
  maxMembers: number;

  @Expose()
  teamMembersCount: number;

  @Expose()
  status: TeamStatus;

  @Expose()
  currentTeamStreak: number;

  @Expose()
  topTeamStreak: number;

  @Expose()
  createdAt: Date;
}
