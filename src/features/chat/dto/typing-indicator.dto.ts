import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Schema for typing indicator events via WebSocket.
 *
 * When a user starts/stops typing, they emit this event.
 * The server broadcasts it to other team members.
 */
const typingIndicatorSchema = z.object({
  // The team chat room where the user is typing
  teamId: z.string().uuid('Invalid team ID'),

  // Whether the user is currently typing or stopped
  isTyping: z.boolean(),
});

export class TypingIndicatorDto extends createZodDto(typingIndicatorSchema) {}

// Type helper
export type TypingIndicatorInput = z.infer<typeof typingIndicatorSchema>;
