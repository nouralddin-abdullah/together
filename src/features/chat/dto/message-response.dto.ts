import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AttachmentType, MessageType, SystemMessageType } from '../entities';

/**
 * Response DTO for message attachment.
 */
export class AttachmentResponseDto {
  @Expose()
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'https://storage.example.com/attachments/image.jpg' })
  url: string;

  @Expose()
  @ApiProperty({ enum: AttachmentType, example: 'image' })
  type: AttachmentType;

  @Expose()
  @ApiPropertyOptional({ example: 'vacation-photo.jpg' })
  fileName: string | null;

  @Expose()
  @ApiPropertyOptional({ example: 1024000 })
  fileSize: number | null;

  @Expose()
  @ApiPropertyOptional({ example: 'image/jpeg' })
  mimeType: string | null;

  @Expose()
  @ApiProperty({ example: '2026-01-21T10:30:00.000Z' })
  createdAt: Date;
}

/**
 * Simplified sender info included with each message.
 */
export class MessageSenderDto {
  @Expose()
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'john_doe' })
  username: string;

  @Expose()
  @ApiProperty({ example: 'John' })
  nickName: string;

  @Expose()
  @ApiPropertyOptional({
    example: 'https://storage.example.com/avatars/john.jpg',
  })
  avatar: string | null;
}

/**
 * Main response DTO for a chat message.
 * Supports both user messages and system notifications.
 */
export class MessageResponseDto {
  @Expose()
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @Expose()
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  teamId: string;

  @Expose()
  @ApiProperty({
    enum: MessageType,
    example: 'user',
    description:
      'Message type: "user" for regular messages, "system" for notifications',
  })
  messageType: MessageType;

  @Expose()
  @ApiPropertyOptional({
    enum: SystemMessageType,
    example: 'streak_completed',
    description: 'For system messages: the notification type',
  })
  systemMessageType: SystemMessageType | null;

  @Expose()
  @ApiPropertyOptional({
    example: 'Hey team! Check out this photo from our meetup 📸',
  })
  content: string | null;

  @Expose()
  @ApiPropertyOptional({
    example: { streakDay: 14, previousStreak: 13 },
    description: 'Additional data for system messages',
  })
  metadata: Record<string, unknown> | null;

  @Expose()
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  replyToId: string | null;

  @Expose()
  @Type(() => MessageSenderDto)
  @ApiPropertyOptional({ type: MessageSenderDto })
  sender: MessageSenderDto | null;

  @Expose()
  @Type(() => AttachmentResponseDto)
  @ApiPropertyOptional({ type: AttachmentResponseDto })
  attachment: AttachmentResponseDto | null;

  @Expose()
  @ApiProperty({ example: '2026-01-21T10:30:00.000Z' })
  createdAt: Date;
}

/**
 * Response DTO for chat history with cursor-based pagination.
 * Different from regular pagination - uses message IDs as cursors.
 */
export class ChatHistoryResponseDto {
  @Expose()
  @Type(() => MessageResponseDto)
  @ApiProperty({ type: [MessageResponseDto] })
  messages: MessageResponseDto[];

  @Expose()
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      'ID of the oldest message in this batch. Use as "before" cursor to load older messages.',
  })
  oldestCursor: string | null;

  @Expose()
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      'ID of the newest message in this batch. Use as "after" cursor to load newer messages.',
  })
  newestCursor: string | null;

  @Expose()
  @ApiProperty({
    example: true,
    description: 'Whether there are more older messages to load',
  })
  hasMore: boolean;
}
