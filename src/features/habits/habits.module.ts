import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

// Controllers
import { HabitsController } from './controllers/habits.controller';

// Services
import { HabitsService } from './services/habits.service';
import { HabitsCronService } from './services/habits-cron.service';
import { HabitsCronProcessor } from './services/habits-cron.processor';
import { StatsService } from './services/stats.service';

// Constants
import { HABITS_CRON_QUEUE } from './constants/habits-cron.constants';

// Core imports
import { BullConfigModule } from '@core/queue';

// Other feature modules
import { TeamsModule } from '../teams/teams.module';
import { TeamAttemptModule } from '../teamAttempt/teams/team-attempt.module';
import { UsersModule } from '../users/users.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    forwardRef(() => TeamsModule),
    forwardRef(() => TeamAttemptModule),
    UsersModule,
    ChatModule,
    // BullMQ setup
    BullConfigModule.forRoot(),
    BullModule.registerQueue({
      name: HABITS_CRON_QUEUE,
    }),
  ],
  controllers: [HabitsController],
  providers: [
    HabitsService,
    HabitsCronService,
    HabitsCronProcessor,
    StatsService,
  ],
  exports: [HabitsService, StatsService],
})
export class HabitsModule {}
