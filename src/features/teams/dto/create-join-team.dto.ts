import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const createJoinRequestSchema = z.object({
  note: z
    .string()
    .min(1, 'Note must be at least 1 characters')
    .max(500, 'Note must be at most 500 characters')
    .optional(),
});

export class CreateJoinRequestDto extends createZodDto(
  createJoinRequestSchema,
) {}
