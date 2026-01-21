import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Schema for fetching chat message history.
 * Extends the basic pagination concept but optimized for chat.
 *
 * Chat pagination works differently than normal pagination:
 * - We use cursor-based pagination (before/after a specific message)
 * - This is more efficient for real-time chat where new messages appear constantly
 * - Traditional page numbers don't work well when data changes frequently
 */
const chatHistoryQuerySchema = z.object({
  // Number of messages to fetch (default 50, max 100)
  limit: z
    .string()
    .optional()
    .default('50')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100)),

  // Cursor-based pagination: fetch messages BEFORE this message ID
  // Used when scrolling up to load older messages
  before: z.string().uuid('Invalid message ID').optional(),

  // Cursor-based pagination: fetch messages AFTER this message ID
  // Used when catching up on new messages
  after: z.string().uuid('Invalid message ID').optional(),
});

export class ChatHistoryQueryDto extends createZodDto(chatHistoryQuerySchema) {}

// Type helper
export type ChatHistoryQuery = z.infer<typeof chatHistoryQuerySchema>;
