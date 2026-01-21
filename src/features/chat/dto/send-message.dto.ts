import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AttachmentType } from '../entities';

/**
 * Schema for sending a new message via WebSocket or REST API.
 *
 * Validation rules:
 * - content: Optional string (can be null if attachment is provided)
 * - replyToId: Optional UUID of the message being replied to
 * - attachment: Optional object with url, type, fileName, fileSize, mimeType
 *
 * Business rule: Either content OR attachment must be provided (validated at service level)
 */
const sendMessageSchema = z.object({
  // Message text content - optional because you can send just an attachment
  content: z
    .string()
    .max(4000, 'Message cannot exceed 4000 characters')
    .nullable()
    .optional(),

  // UUID of message being replied to (for threaded conversations)
  replyToId: z.string().uuid('Invalid reply message ID').nullable().optional(),

  // Optional attachment data
  // Note: The actual file upload happens separately via StorageModule
  // This just contains the metadata after upload
  attachment: z
    .object({
      url: z.string().url('Invalid attachment URL'),
      type: z.nativeEnum(AttachmentType, {
        error: 'Type must be "image" or "video"',
      }),
      fileName: z.string().max(255).nullable().optional(),
      fileSize: z.number().positive().nullable().optional(),
      mimeType: z.string().max(100).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export class SendMessageDto extends createZodDto(sendMessageSchema) {}

// Type helper for service layer
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
