import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import { Message, MessageAttachment } from './entities';

// Controllers
import { ChatController } from './controllers/chat.controller';

// Gateways
import { ChatGateway } from './gateways/chat.gateway';

// Services
import { ChatService } from './services/chat.service';
import { PresenceService } from './services/presence.service';

// Other modules
import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';

/**
 * Chat Feature Module
 *
 * Provides real-time team chat functionality:
 * - WebSocket gateway for real-time messaging
 * - REST endpoints for fetching history
 * - Redis-based presence tracking (online/typing)
 *
 * Dependencies:
 * - TeamsModule: To verify team membership
 * - UsersModule: To get user details
 * - JwtModule: To authenticate WebSocket connections
 */
@Module({
  imports: [
    // Register entities with TypeORM
    TypeOrmModule.forFeature([Message, MessageAttachment]),

    // JWT for WebSocket authentication
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),

    // Feature dependencies
    TeamsModule,
    UsersModule,
  ],
  controllers: [ChatController],
  providers: [
    // Services
    ChatService,
    PresenceService,

    // WebSocket Gateway
    ChatGateway,
  ],
  exports: [ChatService],
})
export class ChatModule {}
