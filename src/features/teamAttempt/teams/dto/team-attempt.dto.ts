import { Expose } from 'class-transformer';
import { TeamCategory, TeamStatus } from '@shared/types';

export class TeamDto {
  @Expose()
  id: string;

  @Expose()
  teamName: string;

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
  teamCategory: TeamCategory;

  @Expose()
  teamMembersCount: number;

  @Expose()
  status: TeamStatus;

  @Expose()
  currentTeamStreak: number;

  @Expose()
  topTeamStreak: number;

  @Expose()
  wantedTeamStreak: number;

  @Expose()
  createdAt: Date;
}

// Extended DTO for discover endpoint with user-specific fields
export class DiscoverTeamDto extends TeamDto {
  @Expose()
  hasRequested: boolean;
}
