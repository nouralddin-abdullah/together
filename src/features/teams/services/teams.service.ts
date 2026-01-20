import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  NotAcceptableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { randomBytes, randomUUID } from 'crypto';

// Feature imports
import { Team } from '../entities/team.entity';
import { CreateTeamDto } from '../dto/create-team.dto';
import { DiscoverQuery } from '../dto/discover-query.dto';
import { User } from '../../users/entities/user.entity';

// Shared imports
import { PaginatedResponse, createPaginatedResponse } from '@shared/dto';
import { JoinRequestStatus, PrivacyTeam, TeamStatus } from '@shared/types';
import { UsersService } from '@features/users';
import { JoinRequest } from '../entities';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team) private teamRepo: Repository<Team>,
    private userServices: UsersService,
    @InjectRepository(JoinRequest)
    private joinRequestsRepo: Repository<JoinRequest>,
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
        privacy: createTeamDto.privacy,
        inviteCode: randomBytes(6).toString('hex'),
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

    if (team.status !== TeamStatus.PENDING) {
      throw new BadRequestException(
        'Team cannot be updated unless it is in the pending phase.',
      );
    }

    Object.assign(team, attrs);
    return await this.teamRepo.save(team);
  }

  async getDiscover(query: DiscoverQuery, userId: string) {
    const { page, limit, sortBy, order, categories, streakDuration } = query;

    const queryBuilder = this.teamRepo
      .createQueryBuilder('team')
      .addSelect(
        `EXISTS(SELECT 1 FROM join_request jr WHERE jr."teamId" = team.id AND jr."userId" = :userId)`,
        'hasRequested',
      )
      .setParameter('userId', userId);

    // Filter by categories if provided (OR logic - match any)
    if (categories?.length) {
      queryBuilder.andWhere('team.teamCategory IN (:...categories)', {
        categories,
      });
    }

    // Filter by streak duration if provided
    if (streakDuration) {
      queryBuilder.andWhere('team.wantedTeamStreak = :streakDuration', {
        streakDuration,
      });
    }

    // Only show public teams in discover
    queryBuilder.andWhere('team.privacy = :privacy', {
      privacy: PrivacyTeam.PUBLIC,
    });

    // Apply sorting and pagination
    queryBuilder
      .orderBy(`team.${sortBy}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Get raw results with hasRequested and entity data
    const { entities, raw } = await queryBuilder.getRawAndEntities();

    // Get total count separately for pagination
    const total = await queryBuilder.getCount();

    // Merge hasRequested into each team
    const data = entities.map((team, index) => ({
      ...team,
      hasRequested:
        raw[index].hasRequested === true || raw[index].hasRequested === 't',
    }));

    return createPaginatedResponse(data, total, page, limit);
  }

  async requestJoinTeam(userId: string, teamId: string, note?: string) {
    const user = await this.userServices.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.teamId) {
      throw new NotFoundException('This user has team');
    }
    const team = await this.teamRepo.findOneBy({ id: teamId });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    const previousRequest = await this.joinRequestsRepo.findOneBy({
      teamId: teamId,
      userId: userId,
    });
    if (previousRequest) {
      throw new BadRequestException(
        'You already sent request to this team before!',
      );
    }
    const joinRequest = this.joinRequestsRepo.create({
      userId,
      teamId,
      note: note,
    });
    return await this.joinRequestsRepo.save(joinRequest);
  }

  // Get join requests for the user's team (owner or members can view)
  async getTeamJoinRequests(userId: string) {
    const user = await this.userServices.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.teamId) {
      throw new BadRequestException('You are not in a team');
    }

    const joinRequests = await this.joinRequestsRepo.find({
      where: {
        teamId: user.teamId,
        status: JoinRequestStatus.PENDING,
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return joinRequests;
  }

  // Get the current user's own join requests (requests they've sent)
  async getMyJoinRequests(userId: string) {
    const user = await this.userServices.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const joinRequests = await this.joinRequestsRepo.find({
      where: { userId },
      relations: ['team'],
      order: { createdAt: 'DESC' },
    });

    return joinRequests;
  }

  async approveJoinRequest(ownerId: string, requestId: string) {
    const owner = await this.userServices.findOne(ownerId);
    if (!owner) {
      throw new NotFoundException('User not found');
    }

    const joinRequest = await this.joinRequestsRepo.findOneBy({
      id: requestId,
    });
    if (!joinRequest) {
      throw new NotFoundException('This join request was not found!');
    }

    if (joinRequest.status !== JoinRequestStatus.PENDING) {
      throw new BadRequestException('This request has already been processed');
    }

    const team = await this.teamRepo.findOneBy({ id: joinRequest.teamId });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId !== ownerId) {
      throw new UnauthorizedException('You are not the owner!');
    }

    if (team.teamMembersCount >= team.maxMembers) {
      throw new BadRequestException('Team is full already!');
    }

    const requestedUser = await this.userServices.findOne(joinRequest.userId);
    if (!requestedUser) {
      throw new NotFoundException('Requested user not found');
    }

    if (requestedUser.teamId) {
      throw new BadRequestException('This user already has a team!');
    }

    // Use transaction to ensure all updates succeed or all fail
    return this.teamRepo.manager.transaction(async (manager) => {
      await manager.update(JoinRequest, requestId, {
        status: JoinRequestStatus.APPROVED,
      });

      await manager.update(User, joinRequest.userId, {
        teamId: team.id,
      });

      await manager.increment(Team, { id: team.id }, 'teamMembersCount', 1);

      joinRequest.status = JoinRequestStatus.APPROVED;
      return joinRequest;
    });
  }

  async rejectJoinRequest(ownerId: string, requestId: string) {
    const owner = await this.userServices.findOne(ownerId);
    if (!owner) {
      throw new NotFoundException('User not found');
    }

    const joinRequest = await this.joinRequestsRepo.findOneBy({
      id: requestId,
    });
    if (!joinRequest) {
      throw new NotFoundException('This join request was not found!');
    }

    if (joinRequest.status !== JoinRequestStatus.PENDING) {
      throw new BadRequestException('This request has already been processed');
    }

    const team = await this.teamRepo.findOneBy({ id: joinRequest.teamId });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId !== ownerId) {
      throw new UnauthorizedException('You are not the owner!');
    }

    joinRequest.status = JoinRequestStatus.REJECTED;
    return await this.joinRequestsRepo.save(joinRequest);
  }

  async getMyTeamUsers(userId: string) {
    const user = await this.userServices.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.teamId) {
      throw new NotFoundException('This user has no team');
    }

    const team = await this.teamRepo.findOne({
      where: { id: user.teamId },
      relations: ['teamMembers'],
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team.teamMembers;
  }

  async leaveMyTeam(userId: string) {
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

    if (team.ownerId === userId) {
      throw new BadRequestException(
        'Owner cannot leave the team. Delete the team instead.',
      );
    }

    if (team.status !== TeamStatus.PENDING) {
      throw new NotAcceptableException(
        'Leaving a team after starting the journey is not allowed!',
      );
    }

    return this.teamRepo.manager.transaction(async (manager) => {
      await manager.update(User, userId, { teamId: null });

      await manager.decrement(Team, { id: team.id }, 'teamMembersCount', 1);

      user.teamId = null;
      return user;
    });
  }

  async disbandTeam(ownerId: string) {
    const owner = await this.userServices.findOne(ownerId);
    if (!owner) {
      throw new NotFoundException('User not found');
    }
    if (!owner.teamId) {
      throw new NotFoundException('You are not in a team');
    }

    const team = await this.teamRepo.findOneBy({ id: owner.teamId });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId !== ownerId) {
      throw new UnauthorizedException(
        'Only the team owner can disband the team',
      );
    }

    if (team.status !== TeamStatus.PENDING) {
      throw new NotAcceptableException(
        'Disbanding a team after starting the journey is not allowed!',
      );
    }

    return this.teamRepo.manager.transaction(async (manager) => {
      // Reset all team members' teamId to null
      await manager.update(User, { teamId: team.id }, { teamId: null });

      // Delete all join requests for this team (pending, approved, rejected)
      await manager.delete(JoinRequest, { teamId: team.id });

      // Delete the team
      await manager.delete(Team, { id: team.id });

      return { message: 'Team disbanded successfully' };
    });
  }
}
