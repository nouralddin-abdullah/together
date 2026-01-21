import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

// Core imports
import { CurrentUser } from '@core/decorators';
import { Serialize } from '@core/interceptors';

// Shared imports
import { ApiResponseDTO, PaginatedResponseDTO } from '@shared/dto';
import { type AuthenticatedUser } from '@shared/types';

// Feature imports
import { TeamsService } from '../services/teams.service';
import { CreateTeamDto } from '../dto/create-team.dto';
import { TeamDto, DiscoverTeamDto } from '../dto/team.dto';
import { UpdateTeamDto, DiscoverQueryDto } from '../dto';
import { JoinRequestDto, JoinRequestUserDto } from '../dto/join-request.dto';
import { CreateJoinRequestDto } from '../dto/create-join-team.dto';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Serialize(ApiResponseDTO(TeamDto))
  @ApiOperation({ summary: 'Create a new team' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createTeamDto: CreateTeamDto,
  ) {
    const createdTeam = await this.teamsService.create(
      user.userId,
      createTeamDto,
    );
    return {
      success: true,
      message: 'Team created successfully',
      createdItem: createdTeam,
    };
  }

  @Get('/myteam')
  @Serialize(ApiResponseDTO(TeamDto))
  @ApiOperation({ summary: 'Get the user team' })
  async getTeam(@CurrentUser() user: AuthenticatedUser) {
    const team = await this.teamsService.findUserTeam(user.userId);
    return {
      success: true,
      message: 'Team retreived successfully',
      item: team,
    };
  }

  @Patch('/updateteam')
  @Serialize(ApiResponseDTO(TeamDto))
  @ApiOperation({ summary: 'Update the team' })
  async updateTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Body() attrs: UpdateTeamDto,
  ) {
    const team = await this.teamsService.updateTeam(user.userId, attrs);
    return {
      success: true,
      message: 'Team updated successfully',
      item: team,
    };
  }

  @Get('/discover')
  @Serialize(PaginatedResponseDTO(DiscoverTeamDto))
  @ApiOperation({ summary: 'Discover public teams with filters' })
  async getDiscover(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DiscoverQueryDto,
  ) {
    return this.teamsService.getDiscover(query, user.userId);
  }

  // Requests
  @Post('/joinrequest/:id')
  @Serialize(ApiResponseDTO(JoinRequestDto))
  @ApiOperation({ summary: 'Create join request to a team' })
  async createJoinRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') teamId: string,
    @Body() body: CreateJoinRequestDto,
  ) {
    const joinRequest = await this.teamsService.requestJoinTeam(
      user.userId,
      teamId,
      body.note,
    );
    return {
      success: true,
      message: 'Join request created successfully',
      item: joinRequest,
    };
  }

  @Get('/joinrequests')
  @Serialize(ApiResponseDTO(JoinRequestDto))
  @ApiOperation({ summary: 'Get pending join requests for your team' })
  async getTeamJoinRequests(@CurrentUser() user: AuthenticatedUser) {
    const requests = await this.teamsService.getTeamJoinRequests(user.userId);
    return {
      success: true,
      message: 'Join requests retrieved successfully',
      items: requests,
    };
  }

  @Get('/myrequests')
  @Serialize(ApiResponseDTO(JoinRequestDto))
  @ApiOperation({ summary: 'Get your own join requests' })
  async getMyJoinRequests(@CurrentUser() user: AuthenticatedUser) {
    const requests = await this.teamsService.getMyJoinRequests(user.userId);
    return {
      success: true,
      message: 'Your join requests retrieved successfully',
      items: requests,
    };
  }

  @Patch('/joinrequest/:id/approve')
  @Serialize(ApiResponseDTO(JoinRequestDto))
  @ApiOperation({ summary: 'Approve a join request' })
  async approveJoinRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestId: string,
  ) {
    const joinRequest = await this.teamsService.approveJoinRequest(
      user.userId,
      requestId,
    );
    return {
      success: true,
      message: 'Join request approved successfully',
      item: joinRequest,
    };
  }

  @Patch('/joinrequest/:id/reject')
  @Serialize(ApiResponseDTO(JoinRequestDto))
  @ApiOperation({ summary: 'Reject a join request' })
  async rejectJoinRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestId: string,
  ) {
    const joinRequest = await this.teamsService.rejectJoinRequest(
      user.userId,
      requestId,
    );
    return {
      success: true,
      message: 'Join request rejected successfully',
      item: joinRequest,
    };
  }

  @Get('/my-team-members')
  @Serialize(ApiResponseDTO(JoinRequestUserDto))
  @ApiOperation({ summary: 'Get current user team members' })
  async getMyTeamMembers(@CurrentUser() user: AuthenticatedUser) {
    const teamMembers = await this.teamsService.getMyTeamUsers(user.userId);
    return {
      success: true,
      message: 'Team members retrieved successfully',
      items: teamMembers,
    };
  }

  @Delete('/leave')
  @Serialize(ApiResponseDTO(JoinRequestUserDto))
  @ApiOperation({ summary: 'Leave your current team' })
  async leaveTeam(@CurrentUser() user: AuthenticatedUser) {
    const updatedUser = await this.teamsService.leaveMyTeam(user.userId);
    return {
      success: true,
      message: 'You have left the team successfully',
      item: updatedUser,
    };
  }

  @Delete('/disband')
  @ApiOperation({ summary: 'Disband your team (owner only)' })
  async disbandTeam(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.teamsService.disbandTeam(user.userId);
    return {
      success: true,
      message: result.message,
    };
  }

  @Post('/start')
  @ApiOperation({
    summary: 'Start the challenge (owner only) - LOCKDOWN begins',
  })
  async startChallenge(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.teamsService.startChallenge(user.userId);
    return {
      success: true,
      message: result.message,
      item: {
        team: result.team,
        attempt: result.attempt,
      },
    };
  }
}
