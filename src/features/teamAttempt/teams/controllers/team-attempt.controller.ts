import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

// Core imports
import { CurrentUser } from '@core/decorators';

// Shared imports
import { type AuthenticatedUser } from '@shared/types';

// Feature imports
import { TeamAttemptService } from '../services/team-attempt.service';

@ApiTags('Team-Attempts')
@Controller('attempts')
export class TeamAttemptController {
  constructor(private readonly teamAttemptService: TeamAttemptService) {}

  @Get('team/:teamId')
  @ApiOperation({ summary: 'Get all attempts for a team' })
  async getTeamAttempts(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamAttemptService.getTeamAttempts(teamId);
  }

  @Get('team/:teamId/current')
  @ApiOperation({ summary: 'Get current ongoing attempt for a team' })
  async getCurrentAttempt(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamAttemptService.getCurrentAttempt(teamId);
  }
}
