import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

// Feature imports
import {
  Message,
  MessageAttachment,
  MessageType,
  SystemMessageType,
} from '../entities';
import {
  SendMessageInput,
  ChatHistoryQuery,
  ChatHistoryResponseDto,
  MessageResponseDto,
} from '../dto';

// Other features
import { TeamsService } from '../../teams/services/teams.service';
import { UsersService } from '../../users';

/**
 * ChatService - Business Logic Layer
 *
 * This service handles all chat-related operations:
 * - Sending messages (with optional attachments)
 * - Fetching chat history (with cursor-based pagination)
 * - Validating user permissions (can they send to this team?)
 *
 * IMPORTANT: This service is used by both:
 * 1. REST API (ChatController) - for fetching history
 * 2. WebSocket Gateway (ChatGateway) - for real-time messaging
 */
@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,

    @InjectRepository(MessageAttachment)
    private attachmentRepo: Repository<MessageAttachment>,

    private teamsService: TeamsService,
    private usersService: UsersService,
  ) {}

  /**
   * Send a new message to a team chat.
   *
   * Flow:
   * 1. Validate user exists and belongs to the team
   * 2. Validate message has content OR attachment (not empty)
   * 3. Create and save the message
   * 4. If attachment provided, create and link it
   * 5. Return the saved message with sender info
   *
   * @param senderId - The user sending the message
   * @param teamId - The team to send the message to
   * @param dto - Message content and optional attachment
   * @returns The created message with full sender details
   */
  async sendMessage(
    senderId: string,
    teamId: string,
    dto: SendMessageInput,
  ): Promise<MessageResponseDto> {
    // Step 1: Validate user belongs to the team
    const user = await this.usersService.findOne(senderId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.teamId !== teamId) {
      throw new ForbiddenException('You are not a member of this team');
    }

    // Step 2: Validate message is not empty
    // Must have either content OR attachment (or both)
    const hasContent = dto.content && dto.content.trim().length > 0;
    const hasAttachment = dto.attachment && dto.attachment.url;

    if (!hasContent && !hasAttachment) {
      throw new BadRequestException(
        'Message must have either content or an attachment',
      );
    }

    // Step 3: Validate replyToId if provided
    if (dto.replyToId) {
      const replyToMessage = await this.messageRepo.findOne({
        where: { id: dto.replyToId, teamId },
      });
      if (!replyToMessage) {
        throw new NotFoundException('Reply-to message not found in this team');
      }
    }

    // Step 4: Generate message ID upfront (so we can create attachment with it)
    const messageId = randomUUID();

    // Step 5: Create the message entity
    const message = this.messageRepo.create({
      id: messageId,
      teamId,
      senderId,
      messageType: MessageType.USER,
      content: hasContent ? dto.content!.trim() : null,
      replyToId: dto.replyToId || null,
    });

    // Step 6: If attachment provided, create it with the message ID
    if (hasAttachment) {
      const attachment = this.attachmentRepo.create({
        messageId: messageId,
        url: dto.attachment!.url,
        type: dto.attachment!.type,
        fileName: dto.attachment!.fileName || null,
        fileSize: dto.attachment!.fileSize || null,
        mimeType: dto.attachment!.mimeType || null,
      });

      // Link attachment to message (cascade will save both together)
      message.attachment = attachment;
    }

    // Step 7: Save message (and attachment if exists) in one operation
    const savedMessage = await this.messageRepo.save(message);

    // Step 7: Return formatted response with sender info
    return this.formatMessageResponse(savedMessage, user);
  }

  /**
   * Fetch chat history for a team with cursor-based pagination.
   *
   * Cursor-based pagination explained:
   * - Instead of "page 1, page 2", we use message IDs as reference points
   * - "before" cursor: Get messages older than this message ID
   * - "after" cursor: Get messages newer than this message ID
   *
   * Why cursor-based?
   * - New messages arrive constantly in chat
   * - Page numbers become stale instantly
   * - Cursors are stable references that don't shift
   *
   * @param teamId - The team to fetch messages for
   * @param userId - The requesting user (for permission check)
   * @param query - Pagination parameters (limit, before, after)
   */
  async getChatHistory(
    teamId: string,
    userId: string,
    query: ChatHistoryQuery,
  ): Promise<ChatHistoryResponseDto> {
    // Step 1: Validate user belongs to the team
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.teamId !== teamId) {
      throw new ForbiddenException('You are not a member of this team');
    }

    // Step 2: Build the query
    const limit = query.limit || 50;

    // QueryBuilder gives us more control than simple find()
    const queryBuilder = this.messageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.attachment', 'attachment')
      .where('message.teamId = :teamId', { teamId })
      .orderBy('message.createdAt', 'DESC') // Newest first
      .take(limit + 1); // Fetch one extra to check if there are more

    // Step 3: Apply cursor if provided
    if (query.before) {
      // Get the reference message to find its timestamp
      const beforeMessage = await this.messageRepo.findOne({
        where: { id: query.before },
      });

      if (beforeMessage) {
        // Get messages older than the cursor
        queryBuilder.andWhere('message.createdAt < :beforeDate', {
          beforeDate: beforeMessage.createdAt,
        });
      }
    }

    if (query.after) {
      const afterMessage = await this.messageRepo.findOne({
        where: { id: query.after },
      });

      if (afterMessage) {
        // Get messages newer than the cursor
        queryBuilder.andWhere('message.createdAt > :afterDate', {
          afterDate: afterMessage.createdAt,
        });
        // When fetching newer messages, we want oldest first, then reverse
        queryBuilder.orderBy('message.createdAt', 'ASC');
      }
    }

    // Step 4: Execute query
    const messages = await queryBuilder.getMany();

    // Step 5: Check if there are more messages
    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop(); // Remove the extra one we fetched
    }

    // Step 6: If we fetched with ASC order (after cursor), reverse to get newest first
    if (query.after) {
      messages.reverse();
    }

    // Step 7: Format response
    const formattedMessages = messages.map((msg) =>
      this.formatMessageResponse(msg, msg.sender),
    );

    return {
      messages: formattedMessages,
      oldestCursor:
        messages.length > 0 ? messages[messages.length - 1].id : null,
      newestCursor: messages.length > 0 ? messages[0].id : null,
      hasMore,
    };
  }

  /**
   * Get a single message by ID.
   * Used for fetching reply-to message details.
   */
  async getMessageById(
    messageId: string,
    userId: string,
  ): Promise<MessageResponseDto | null> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['sender', 'attachment'],
    });

    if (!message) {
      return null;
    }

    // Verify user has access to this team
    const user = await this.usersService.findOne(userId);
    if (!user || user.teamId !== message.teamId) {
      throw new ForbiddenException('You cannot access this message');
    }

    return this.formatMessageResponse(message, message.sender);
  }

  /**
   * Create a system notification message.
   * Called by other services when events happen (streak completed, user joined, etc.)
   */
  async createSystemMessage(
    teamId: string,
    systemMessageType: SystemMessageType,
    content: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<MessageResponseDto> {
    const messageId = randomUUID();

    // Get user info if provided (the user this notification is about)
    let user: {
      id: string;
      username: string;
      nickName: string;
      avatar: string | null;
    } | null = null;
    if (userId) {
      const foundUser = await this.usersService.findOne(userId);
      if (foundUser) {
        user = {
          id: foundUser.id,
          username: foundUser.username,
          nickName: foundUser.nickName,
          avatar: foundUser.avatar,
        };
      }
    }

    const message = this.messageRepo.create({
      id: messageId,
      teamId,
      messageType: MessageType.SYSTEM,
      systemMessageType,
      senderId: userId || null,
      content,
      metadata: metadata || null,
    });

    const savedMessage = await this.messageRepo.save(message);

    return this.formatMessageResponse(savedMessage, user);
  }

  /**
   * Format a Message entity into a MessageResponseDto.
   */
  private formatMessageResponse(
    message: Message,
    sender: {
      id: string;
      username: string;
      nickName: string;
      avatar: string | null;
    } | null,
  ): MessageResponseDto {
    return {
      id: message.id,
      teamId: message.teamId,
      messageType: message.messageType,
      systemMessageType: message.systemMessageType || null,
      content: message.content,
      metadata: message.metadata || null,
      replyToId: message.replyToId,
      sender: sender
        ? {
            id: sender.id,
            username: sender.username,
            nickName: sender.nickName,
            avatar: sender.avatar,
          }
        : null,
      attachment: message.attachment
        ? {
            id: message.attachment.id,
            url: message.attachment.url,
            type: message.attachment.type,
            fileName: message.attachment.fileName,
            fileSize: message.attachment.fileSize,
            mimeType: message.attachment.mimeType,
            createdAt: message.attachment.createdAt,
          }
        : null,
      createdAt: message.createdAt,
    };
  }
}
