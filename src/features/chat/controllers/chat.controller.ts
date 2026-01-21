import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';

import { CurrentUser } from '@core/decorators';
import { Serialize } from '@core/interceptors';
import { ApiResponseDTO } from '@shared/dto';
import { type AuthenticatedUser } from '@shared/types';

import { ChatService } from '../services/chat.service';
import { PresenceService } from '../services/presence.service';
import {
  ChatHistoryQueryDto,
  ChatHistoryResponseDto,
  MessageResponseDto,
} from '../dto';

/**
 * REST Controller for Chat
 *
 * This controller handles HTTP requests for chat operations.
 * Real-time messaging is handled by the ChatGateway (WebSocket).
 *
 * Use this for:
 * - Fetching chat history (initial load when opening chat)
 * - Fetching a specific message (e.g., for reply preview)
 */
@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService,
  ) {}

  /**
   * GET /chat/:teamId/history
   *
   * Fetch message history for a team chat.
   * Uses cursor-based pagination for efficient loading.
   *
   * Query params:
   * - limit: Number of messages to fetch (default 50, max 100)
   * - before: Fetch messages older than this message ID
   * - after: Fetch messages newer than this message ID
   */
  @Get(':teamId/history')
  @Serialize(ChatHistoryResponseDto)
  @ApiOperation({ summary: 'Get chat history for a team' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  async getChatHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Query() query: ChatHistoryQueryDto,
  ): Promise<ChatHistoryResponseDto> {
    return this.chatService.getChatHistory(teamId, user.userId, query);
  }

  /**
   * GET /chat/:teamId/messages/:messageId
   *
   * Fetch a single message by ID.
   * Useful for fetching reply-to message details.
   */
  @Get(':teamId/messages/:messageId')
  @Serialize(ApiResponseDTO(MessageResponseDto))
  @ApiOperation({ summary: 'Get a specific message' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  async getMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Param('messageId') messageId: string,
  ) {
    const message = await this.chatService.getMessageById(
      messageId,
      user.userId,
    );
    return {
      success: true,
      message: 'Message retrieved successfully',
      item: message,
    };
  }

  /**
   * GET /chat/:teamId/online
   *
   * Fetch list of users currently online in the team chat.
   */
  @Get(':teamId/online')
  @ApiOperation({ summary: 'Get online users in a team chat' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  async getOnlineUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
  ) {
    const users = await this.presenceService.getOnlineUsers(teamId);
    return {
      success: true,
      users,
    };
  }
}
