import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { ChatService } from '../services/chat.service';
import { PresenceService } from '../services/presence.service';
import {
  SendMessageDto,
  TypingIndicatorDto,
  JoinRoomDto,
  MessageResponseDto,
} from '../dto';
import { JwtPayload, AuthenticatedUser } from '@shared/types';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(): void {
    this.logger.log('🚀 Chat WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = await this.verifyToken(token);

      if (!payload) {
        this.logger.warn(`Connection rejected: Invalid token`);
        client.disconnect();
        return;
      }

      client.data.user = {
        userId: payload.sub,
        email: payload.email,
        username: payload.username,
        role: payload.role,
      } as AuthenticatedUser;

      await this.presenceService.setUserSocket(payload.sub, client.id);

      this.logger.log(
        `✅ Client connected: ${client.id} (User: ${payload.username})`,
      );
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const user = client.data.user as AuthenticatedUser | undefined;

    if (user) {
      const rooms = Array.from(client.rooms).filter((room) =>
        room.startsWith('team:'),
      );

      for (const room of rooms) {
        const teamId = room.replace('team:', '');
        await this.presenceService.removeUserFromTeam(user.userId, teamId);

        client.to(room).emit('user:offline', {
          userId: user.userId,
          username: user.username,
        });
      }

      await this.presenceService.removeUserSocket(user.userId);
      this.logger.log(
        `👋 Client disconnected: ${client.id} (User: ${user.username})`,
      );
    } else {
      this.logger.log(`👋 Client disconnected: ${client.id} (unauthenticated)`);
    }
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomDto,
  ): Promise<{ success: boolean; onlineUserIds: string[] }> {
    const user = this.getAuthenticatedUser(client);
    const roomName = `team:${data.teamId}`;

    client.join(roomName);
    await this.presenceService.addUserToTeam(user.userId, data.teamId);

    const onlineUserIds = await this.presenceService.getOnlineUsers(
      data.teamId,
    );

    client.to(roomName).emit('user:online', { userId: user.userId });

    this.logger.log(`User ${user.username} joined room ${roomName}`);

    return { success: true, onlineUserIds };
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomDto,
  ): Promise<{ success: boolean }> {
    const user = this.getAuthenticatedUser(client);
    const roomName = `team:${data.teamId}`;

    client.leave(roomName);
    await this.presenceService.removeUserFromTeam(user.userId, data.teamId);

    client.to(roomName).emit('user:offline', {
      userId: user.userId,
      username: user.username,
    });

    this.logger.log(`User ${user.username} left room ${roomName}`);

    return { success: true };
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto & { teamId: string },
  ): Promise<{ success: boolean; message: MessageResponseDto }> {
    const user = this.getAuthenticatedUser(client);
    const roomName = `team:${data.teamId}`;

    // Debug: log what we receive
    this.logger.debug(`Received message:send data: ${JSON.stringify(data)}`);

    try {
      const message = await this.chatService.sendMessage(
        user.userId,
        data.teamId,
        {
          content: data.content,
          replyToId: data.replyToId,
          attachment: data.attachment,
        },
      );

      // Broadcast to ALL members in the room (including sender)
      this.server.to(roomName).emit('message:new', message);

      // Clear typing indicator
      await this.presenceService.setTyping(user.userId, data.teamId, false);
      client.to(roomName).emit('user:stopTyping', {
        userId: user.userId,
        username: user.username,
      });

      this.logger.debug(
        `Message sent by ${user.username} in team ${data.teamId}`,
      );

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingIndicatorDto,
  ): Promise<void> {
    const user = this.getAuthenticatedUser(client);
    const roomName = `team:${data.teamId}`;

    await this.presenceService.setTyping(user.userId, data.teamId, true);

    client.to(roomName).emit('user:typing', {
      userId: user.userId,
      username: user.username,
    });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingIndicatorDto,
  ): Promise<void> {
    const user = this.getAuthenticatedUser(client);
    const roomName = `team:${data.teamId}`;

    await this.presenceService.setTyping(user.userId, data.teamId, false);

    client.to(roomName).emit('user:stopTyping', {
      userId: user.userId,
      username: user.username,
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth;
    const token = auth?.token;

    if (!token) return null;

    if (typeof token === 'string' && token.startsWith('Bearer ')) {
      return token.slice(7);
    }

    return token;
  }

  private async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const secret = this.configService.getOrThrow<string>('JWT_SECRET');
      return await this.jwtService.verifyAsync<JwtPayload>(token, { secret });
    } catch {
      return null;
    }
  }

  private getAuthenticatedUser(client: Socket): AuthenticatedUser {
    const user = client.data.user as AuthenticatedUser | undefined;
    if (!user) throw new WsException('Not authenticated');
    return user;
  }
}
