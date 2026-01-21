import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Schema for joining/leaving a team chat room via WebSocket.
 *
 * When a user opens a team chat, they "join" the room.
 * This allows them to receive real-time messages for that team.
 * When they navigate away, they "leave" the room.
 */
const joinRoomSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
});

export class JoinRoomDto extends createZodDto(joinRoomSchema) {}

// Type helper
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
