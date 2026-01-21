import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Check-in DTO for BUILD habits
 * Used when a user completes their daily habit
 */
export const CheckInSchema = z.object({
  // Proof URL - required if team.requireProof is true
  proofUrl: z
    .string()
    .url({ message: 'Proof URL must be a valid URL' })
    .optional(),

  // Proof type - required if proofUrl is provided
  proofType: z.enum(['image', 'video']).optional(),
});

export class CheckInDto extends createZodDto(CheckInSchema) {}

// Response type for check-in
export interface CheckInResponse {
  date: string;
  completedAt: string;
  teamProgress: {
    completed: string[];
    pending: string[];
  };
  allComplete: boolean;
}
