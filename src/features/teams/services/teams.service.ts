import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, randomUUID } from 'crypto';

// Feature imports
import { Team } from '../entities/team.entity';
import { CreateTeamDto } from '../dto/create-team.dto';
import { User } from '../../users/entities/user.entity';

// Shared imports
import {
  PaginationQuery,
  PaginatedResponse,
  createPaginatedResponse,
} from '@shared/dto';
import { PrivacyTeam, TeamStatus } from '@shared/types';
import { UsersService } from '@features/users';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team) private teamRepo: Repository<Team>,
    private userServices: UsersService,
  ) {}

  // create a new team
  async create(ownerId: string, createTeamDto: CreateTeamDto): Promise<Team> {
    // check if user exists
    const user = await this.userServices.findOne(ownerId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.teamId) {
      throw new BadRequestException('User is already in a team');
    }

    // Use transaction to ensure both operations succeed or both fail
    return this.teamRepo.manager.transaction(async (manager) => {
      const team = manager.create(Team, {
        id: randomUUID(),
        ownerId,
        teamName: createTeamDto.teamName,
        description: createTeamDto.description,
        rules: createTeamDto.rules,
        maxMembers: createTeamDto.maxMembers,
        wantedTeamStreak: createTeamDto.wantedTeamStreak,
        habitName: createTeamDto.habitName,
        habitType: createTeamDto.habitType,
        allowAnonymousFail: createTeamDto.allowAnonymousFail,
        teamCategory: createTeamDto.TeamCategoty,
        privacy: createTeamDto.privacyType,
        inviteCode:
          createTeamDto.privacyType === PrivacyTeam.PUBLIC
            ? randomBytes(6).toString('hex')
            : undefined,
      });

      const savedTeam = await manager.save(team);

      // Update user within same transaction
      await manager.update(User, ownerId, {
        teamId: savedTeam.id,
      });

      return savedTeam;
    });
  }

  async findUserTeam(userId: string) {
    const user = await this.userServices.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.teamId) {
      throw new NotFoundException('This user has no team');
    }
    const team = await this.teamRepo.findOneBy({ id: user.teamId });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  async updateTeam(userId: string, attrs: Partial<Team>) {
    const user = await this.userServices.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.teamId) {
      throw new NotFoundException('This user has no team');
    }
    const team = await this.teamRepo.findOneBy({ id: user.teamId });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    if (user.id !== team.ownerId) {
      throw new UnauthorizedException('You cannot edit this team!');
    }
    Object.assign(team, attrs);
    return await this.teamRepo.save(team);
  }
}
