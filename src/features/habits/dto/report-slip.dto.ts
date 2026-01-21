import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Report Slip DTO for QUIT habits
 * Used when a user reports they slipped/relapsed
 */
export const ReportSlipSchema = z.object({
  // User's choice - report anonymously in chat?
  // Note: Identity is still stored in database for stats
  anonymous: z.boolean().default(false),

  // Optional note/explanation
  note: z.string().max(500).optional(),
});

export class ReportSlipDto extends createZodDto(ReportSlipSchema) {}

// Response type for slip report
export interface ReportSlipResponse {
  attemptEnded: number;
  daysReached: number;
  newAttemptNumber: number;
  wasAnonymous: boolean;
}
