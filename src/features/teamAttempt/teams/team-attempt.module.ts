import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Controllers
import { TeamAttemptController } from './controllers';

// Services
import { TeamAttemptService } from './services/team-attempt.service';

// Entities
import { TeamAttempt } from './entities/team-attempt.entity';
import { DailyProgress } from './entities/daily-progress.entity';
import { SlipReport } from './entities/slip-report.entity';

// Other feature modules
import { TeamsModule } from '../../teams/teams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamAttempt, DailyProgress, SlipReport]),
    forwardRef(() => TeamsModule),
  ],
  controllers: [TeamAttemptController],
  providers: [TeamAttemptService],
  exports: [TeamAttemptService],
})
export class TeamAttemptModule {}
