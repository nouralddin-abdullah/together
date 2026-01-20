import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Controllers
import { TeamsController } from './controllers/teams.controller';

// Services
import { TeamsService } from './services/teams.service';

// Entities
import { Team } from './entities/team.entity';

// Other feature modules
import { UsersModule } from '../users/users.module';
import { JoinRequest } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([Team, JoinRequest]), UsersModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
