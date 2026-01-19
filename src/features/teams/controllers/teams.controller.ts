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
import {
  ApiResponseDTO,
  PaginatedResponseDTO,
  PaginationQueryDto,
} from '@shared/dto';
import { type AuthenticatedUser } from '@shared/types';

// Feature imports
import { TeamsService } from '../services/teams.service';
import { CreateTeamDto } from '../dto/create-team.dto';
import { TeamDto } from '../dto/team.dto';
import { UpdateTeamDto } from '../dto';

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
}
