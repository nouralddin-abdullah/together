import { JoinRequestStatus } from '@shared/types';
import { Expose, Type } from 'class-transformer';

// Minimal user info to expose in join requests (no email, password, etc.)
export class JoinRequestUserDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  nickName: string;

  @Expose()
  avatar: string;
}

// Minimal team info to expose in join requests
class JoinRequestTeamDto {
  @Expose()
  id: string;

  @Expose()
  teamName: string;

  @Expose()
  description: string;

  @Expose()
  teamCategory: string;
}

export class JoinRequestDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  teamId: string;

  @Expose()
  note: string;

  @Expose()
  status: JoinRequestStatus;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => JoinRequestUserDto)
  user: JoinRequestUserDto;

  @Expose()
  @Type(() => JoinRequestTeamDto)
  team: JoinRequestTeamDto;
}
